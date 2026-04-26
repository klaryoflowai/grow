const { normalizeActivity, normalizeString, toIsoDate, toNumber } = require("./normalize");
const { escapeHtml } = require("./telegram");

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'");
}

function stripHtml(value = "") {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "GrowBot/1.0 (+https://grow-seven-alpha.vercel.app)",
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function findBestMatch(items = [], companyName = "") {
  const wanted = normalizeCompanyKey(companyName);
  if (!wanted) return null;

  const exact = items.find((item) => normalizeCompanyKey(item.company) === wanted);
  if (exact) return exact;

  const includes = items.find((item) => normalizeCompanyKey(item.company).includes(wanted));
  if (includes) return includes;

  return items.find((item) => wanted.includes(normalizeCompanyKey(item.company))) || null;
}

function formatDate(value = "") {
  const iso = toIsoDate(value);
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function buildContext(data = {}, companyName = "") {
  const companies = Array.isArray(data.companies) ? data.companies : [];
  const contactPriority = Array.isArray(data.contactPriority) ? data.contactPriority : [];
  const activities = Array.isArray(data.activities) ? data.activities : [];

  const companyRecord = findBestMatch(companies, companyName);
  const priorityRecord = findBestMatch(contactPriority, companyName);
  const canonicalName = companyRecord?.company || priorityRecord?.company || companyName;
  const key = normalizeCompanyKey(canonicalName);

  const recentActivities = activities
    .filter((activity) => normalizeCompanyKey(activity.company) === key)
    .filter((activity) => activity.company && activity.date)
    .sort((left, right) => {
      const leftValue = `${toIsoDate(left.date)}|${normalizeString(left.created_at)}`;
      const rightValue = `${toIsoDate(right.date)}|${normalizeString(right.created_at)}`;
      return rightValue.localeCompare(leftValue);
    })
    .slice(0, 4);

  return {
    company: canonicalName,
    sector: priorityRecord?.sector || companyRecord?.sector || "",
    decisionMaker: priorityRecord?.decision_maker || "",
    mobile: priorityRecord?.mobile || "",
    rank: priorityRecord?.rank || 0,
    recruitmentSignal: priorityRecord?.recruitment_signal || "",
    priorityLastContact: priorityRecord?.last_contact || "",
    pipelineStage: companyRecord?.pipeline_stage || "",
    accountHealth: companyRecord?.account_health || "",
    potentialWorkers: toNumber(companyRecord?.workers),
    leadDate: companyRecord?.lead_date || "",
    lastContact: companyRecord?.last_contact || priorityRecord?.last_contact || "",
    nextStep: companyRecord?.next_step || "",
    nextStepDate: companyRecord?.next_step_date || "",
    notes: companyRecord?.notes || priorityRecord?.notes || "",
    recentActivities,
  };
}

function extractXmlTag(block = "", tag = "") {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

async function fetchNews(companyName = "") {
  if (!companyName) return [];

  const query = `"${companyName}" Moldova`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ro&gl=MD&ceid=MD:ro`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const xml = await response.text();

    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .slice(0, 3)
      .map((match) => match[1])
      .map((item) => ({
        title: extractXmlTag(item, "title"),
        link: extractXmlTag(item, "link"),
        source: extractXmlTag(item, "source"),
        pubDate: extractXmlTag(item, "pubDate"),
      }))
      .filter((item) => item.title);
  } catch {
    return [];
  }
}

function decodeDuckDuckGoRedirect(url = "") {
  try {
    const absolute = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(absolute);
    const target = parsed.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : absolute;
  } catch {
    return url;
  }
}

async function fetchWebSignals(companyName = "", sector = "") {
  if (!companyName) return [];

  const query = `${companyName} Moldova ${sector}`.trim();
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();

    const blocks = html.match(/<div class="result results_links[\s\S]*?<\/div>\s*<\/div>/gi) || [];
    return blocks.slice(0, 3).map((block) => {
      const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
      return {
        title: stripHtml(titleMatch?.[2] || ""),
        link: decodeDuckDuckGoRedirect(titleMatch?.[1] || ""),
        snippet: stripHtml(snippetMatch?.[1] || snippetMatch?.[2] || ""),
      };
    }).filter((item) => item.title);
  } catch {
    return [];
  }
}

function buildApproachSuggestions(context, webSignals, news) {
  const suggestions = [];

  if (context.rank) {
    suggestions.push(`Este in A-list pe pozitia ${context.rank}; merita un prim touch bine personalizat, nu generic.`);
  }

  if (context.recruitmentSignal) {
    suggestions.push(`Exista semnal de recrutare activ: ${context.recruitmentSignal}. Intra cu un unghi de volum, viteza si predictibilitate.`);
  }

  const sector = normalizeString(context.sector).toLowerCase();
  if (sector.includes("construct")) {
    suggestions.push("Leaga abordarea de santiere, termene, lipsa echipelor stabile si nevoie de loturi repetitive de muncitori.");
  } else if (sector.includes("industrie") || sector.includes("textil")) {
    suggestions.push("Accentul bun este pe schimburi, predictibilitate de productie si capacitatea de a scala rapid loturi de oameni.");
  } else if (sector.includes("agro")) {
    suggestions.push("Merita testat unghiul de sezonalitate, continuitate operationala si acoperirea rapida a rolurilor de executie.");
  }

  if (news.length) {
    suggestions.push("Foloseste una dintre noutatile recente ca deschidere de context, apoi du discutia spre presiunea pe executie si forta de munca.");
  } else if (webSignals.length) {
    suggestions.push("Porneste de la semnalele publice gasite online, apoi valideaza rapid daca au proiecte sau extinderi in lucru.");
  } else {
    suggestions.push("Daca nu exista semnale publice clare, deschide cu ipoteza operationala: volum, viteza si lipsa de personal executiv.");
  }

  return suggestions.slice(0, 3);
}

function summarizeActivity(activity = {}) {
  const typeLabels = {
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
    planned: "Planificat",
  };
  const type = normalizeActivity(activity.activity_type);
  const bits = [`• ${typeLabels[type] || "Activitate"} · ${formatDate(activity.date)}`];
  if (activity.outcome) bits.push(`· ${escapeHtml(activity.outcome)}`);
  if (activity.next_step) bits.push(`· next: ${escapeHtml(activity.next_step)}`);
  return bits.join(" ");
}

function renderLinkItem(item = {}, suffix = "") {
  if (!item.title) return "";
  const safeTitle = escapeHtml(item.title);
  const safeLink = escapeHtml(item.link || "");
  const safeSuffix = suffix ? ` · ${escapeHtml(suffix)}` : "";
  if (safeLink) {
    return `• <a href="${safeLink}">${safeTitle}</a>${safeSuffix}`;
  }
  return `• ${safeTitle}${safeSuffix}`;
}

async function buildIntelligenceReport(data = {}, companyName = "") {
  const context = buildContext(data, companyName);
  if (!normalizeString(context.company)) {
    return {
      found: false,
      message: `Nu am gasit compania <b>${escapeHtml(companyName)}</b> in Airtable. Incearca numele exact din Companies sau Contact Priority.`,
    };
  }

  const [news, webSignals] = await Promise.all([
    fetchNews(context.company),
    fetchWebSignals(context.company, context.sector),
  ]);

  const suggestions = buildApproachSuggestions(context, webSignals, news);

  const report = [
    `<b>Intel · ${escapeHtml(context.company)}</b>`,
    "<i>Sky view scurt pentru abordare</i>",
    "",
    "<b>Snapshot intern</b>",
    `• Sector: ${escapeHtml(context.sector || "-")}`,
    context.rank ? `• A-list: #${context.rank}` : "",
    context.decisionMaker ? `• Factor decizie: ${escapeHtml(context.decisionMaker)}` : "",
    context.mobile ? `• Mobil: ${escapeHtml(context.mobile)}` : "",
    context.pipelineStage ? `• Pipeline: ${escapeHtml(context.pipelineStage)}` : "• Pipeline: Necontactat / fara tracking",
    context.accountHealth ? `• Sanatate cont: ${escapeHtml(context.accountHealth)}` : "",
    context.potentialWorkers ? `• Potential workers: ${context.potentialWorkers}` : "",
    context.lastContact ? `• Ultimul contact: ${escapeHtml(formatDate(context.lastContact))}` : "• Ultimul contact: -",
    context.nextStep ? `• Next step: ${escapeHtml(context.nextStep)}${context.nextStepDate ? ` · ${escapeHtml(formatDate(context.nextStepDate))}` : ""}` : "",
    context.recruitmentSignal ? `• Semnal recrutare: ${escapeHtml(context.recruitmentSignal)}` : "",
    context.notes ? `• Note interne: ${escapeHtml(context.notes)}` : "",
    "",
    "<b>Activitate recenta</b>",
    context.recentActivities.length
      ? context.recentActivities.map((activity) => summarizeActivity(activity)).join("\n")
      : "• Nu exista activitate salvata inca pentru aceasta companie.",
    "",
    "<b>Semnale publice</b>",
    webSignals.length
      ? webSignals.map((item) => renderLinkItem(item, item.snippet)).join("\n")
      : "• Nu am gasit rapid semnale publice relevante in cautarea initiala.",
    "",
    "<b>Noutati recente</b>",
    news.length
      ? news.map((item) => renderLinkItem(item, [item.source, item.pubDate].filter(Boolean).join(" · "))).join("\n")
      : "• Nu am gasit stiri recente clare pe cautarea initiala.",
    "",
    "<b>Unghi de abordare</b>",
    suggestions.map((item) => `• ${escapeHtml(item)}`).join("\n"),
    "",
    `<i>Comanda: /intel ${escapeHtml(context.company)}</i>`,
  ].filter(Boolean).join("\n");

  return {
    found: true,
    message: report,
    context,
  };
}

module.exports = {
  buildIntelligenceReport,
};
