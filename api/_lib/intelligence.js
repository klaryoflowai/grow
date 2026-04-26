const { normalizeActivity, normalizeString, toIsoDate, toNumber } = require("./normalize");
const { escapeHtml } = require("./telegram");

const GENERIC_COMPANY_TOKENS = new Set([
  "srl",
  "sa",
  "srL",
  "s.a",
  "grup",
  "group",
  "holding",
  "company",
  "companie",
  "enterprise",
  "invest",
  "industries",
  "industry",
  "moldova",
  "md",
]);

const LEGAL_ENTITY_TOKENS = new Set([
  "srl",
  "sa",
  "s.a",
  "ii",
  "i.i",
  "îi",
  "sc",
]);

const OFFICIAL_SITE_DOMAIN_BLOCKLIST = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "wikipedia.org",
  "yellow.place",
  "listafirme",
  "bizlaw.md",
  "zdg.md",
  "logos-pres.md",
  "news.google.com",
  "x.com",
  "twitter.com",
];

const HOMEPAGE_PARAGRAPH_BLOCKLIST = [
  "cookie",
  "copyright",
  "drepturi rezervate",
  "all rights reserved",
  "javascript",
  "email:",
  "telefon:",
  "tel:",
];

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function tokenizeText(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function buildCompanyProfile(companyName = "") {
  const company = normalizeString(companyName);
  const normalized = normalizeCompanyKey(company);
  const tokens = tokenizeText(company);
  const strongTokens = tokens.filter(
    (token) => token.length >= 4 && !GENERIC_COMPANY_TOKENS.has(token)
  );
  const fallbackTokens = tokens.filter((token) => token.length >= 3);

  return {
    company,
    normalized,
    tokens,
    strongTokens,
    fallbackTokens,
  };
}

function stripLegalEntityTokens(tokens = []) {
  return tokens.filter((token) => token && !LEGAL_ENTITY_TOKENS.has(token));
}

function countCompanyTokenHits(text = "", profile = buildCompanyProfile("")) {
  const haystack = tokenizeText(text);
  if (!haystack.length) return 0;
  const unique = new Set(haystack);
  const tokens = profile.strongTokens.length ? profile.strongTokens : profile.fallbackTokens;
  return tokens.filter((token) => unique.has(token)).length;
}

function hasDirectCompanyMatch(text = "", profile = buildCompanyProfile("")) {
  const normalizedText = normalizeCompanyKey(text);
  if (!normalizedText || !profile.normalized) return false;
  if (normalizedText.includes(profile.normalized)) return true;

  const tokenHits = countCompanyTokenHits(text, profile);
  if (profile.strongTokens.length >= 2) {
    return tokenHits >= 2;
  }

  if (profile.strongTokens.length === 1) {
    return tokenHits >= 1;
  }

  return tokenHits >= Math.min(profile.fallbackTokens.length, 2);
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number.parseInt(code, 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const number = Number.parseInt(code, 16);
      return Number.isFinite(number) ? String.fromCodePoint(number) : _;
    });
}

function stripHtml(value = "") {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function truncate(value = "", length = 220) {
  const text = normalizeString(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}…`;
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

function safeDateToTime(value = "") {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
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

function isRecentEnough(pubDate = "", maxAgeDays = 730) {
  const timestamp = safeDateToTime(pubDate);
  if (!timestamp) return false;
  const ageMs = Date.now() - timestamp;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

async function fetchGoogleNews(query = "") {
  if (!query) return [];

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ro&gl=MD&ceid=MD:ro`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const xml = await response.text();

    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
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

async function fetchCompanyNews(companyName = "") {
  const profile = buildCompanyProfile(companyName);
  if (!profile.company) return [];

  const news = await fetchGoogleNews(`"${profile.company}"`);
  return news
    .filter((item) => isRecentEnough(item.pubDate, 730))
    .filter((item) => hasDirectCompanyMatch(`${item.title} ${item.source}`, profile))
    .slice(0, 3);
}

function buildSectorNewsQuery(sector = "") {
  const normalizedSector = normalizeString(sector).toLowerCase();
  if (!normalizedSector) return "";

  if (normalizedSector.includes("construct")) {
    return "constructii Moldova proiecte forta de munca";
  }
  if (normalizedSector.includes("agro")) {
    return "agro Moldova procesare productie forta de munca";
  }
  if (normalizedSector.includes("textil")) {
    return "textile Moldova productie export forta de munca";
  }
  if (normalizedSector.includes("industri")) {
    return "industrie Moldova productie fabrica forta de munca";
  }

  return `${sector} Moldova forta de munca productie`;
}

async function fetchSectorNews(sector = "") {
  const query = buildSectorNewsQuery(sector);
  if (!query) return [];

  const news = await fetchGoogleNews(query);
  return news
    .filter((item) => isRecentEnough(item.pubDate, 365))
    .slice(0, 2);
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
  const profile = buildCompanyProfile(companyName);
  if (!profile.company) return [];

  const query = `"${profile.company}" Moldova ${sector}`.trim();
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();

    const blocks = html.match(/<div class="result results_links[\s\S]*?<\/div>\s*<\/div>/gi) || [];
    return blocks.map((block) => {
      const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
      const title = stripHtml(titleMatch?.[2] || "");
      const snippet = stripHtml(snippetMatch?.[1] || snippetMatch?.[2] || "");
      const link = decodeDuckDuckGoRedirect(titleMatch?.[1] || "");
      const tokenHits = countCompanyTokenHits(`${title} ${snippet} ${link}`, profile);
      const exactMatch = hasDirectCompanyMatch(`${title} ${snippet} ${link}`, profile);
      return {
        title,
        link,
        snippet,
        tokenHits,
        exactMatch,
        score: (exactMatch ? 4 : 0) + tokenHits + (/\.md\b/i.test(link) ? 1 : 0),
      };
    })
      .filter((item) => item.title)
      .filter((item) => item.score >= 3)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function buildDomainCandidates(companyName = "") {
  const profile = buildCompanyProfile(companyName);
  const tokens = stripLegalEntityTokens(profile.tokens).slice(0, 4);
  if (!tokens.length) return [];

  const joined = tokens.join("");
  const hyphenated = tokens.join("-");
  const variations = new Set([hyphenated, joined].filter(Boolean));
  const tlds = [".md", ".ro", ".com"];
  const candidates = [];

  variations.forEach((variant) => {
    tlds.forEach((tld) => {
      candidates.push(`https://${variant}${tld}`);
      candidates.push(`https://www.${variant}${tld}`);
    });
  });

  return candidates;
}

function extractDomain(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedOfficialDomain(domain = "") {
  return OFFICIAL_SITE_DOMAIN_BLOCKLIST.some((item) => domain.endsWith(item));
}

function findLikelyOfficialSite(results = [], profile = buildCompanyProfile("")) {
  return results.find((item) => {
    const domain = extractDomain(item.link);
    if (!domain || isBlockedOfficialDomain(domain)) return false;
    const score = item.score || 0;
    return score >= 4 && (hasDirectCompanyMatch(item.title, profile) || hasDirectCompanyMatch(domain, profile));
  }) || null;
}

function extractMetaDescription(html = "") {
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return stripHtml(metaMatch?.[1] || "");
}

function extractTitle(html = "") {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  return stripHtml(titleMatch?.[1] || "");
}

function extractFirstHeading(html = "") {
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  return stripHtml(headingMatch?.[1] || "");
}

function extractMeaningfulParagraphs(html = "", limit = 2) {
  const paragraphs = [];
  const matches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);

  for (const match of matches) {
    const text = stripHtml(match[1] || "");
    const normalized = text.toLowerCase();
    if (
      text.length < 80
      || HOMEPAGE_PARAGRAPH_BLOCKLIST.some((item) => normalized.includes(item))
    ) {
      continue;
    }
    paragraphs.push(truncate(text, 240));
    if (paragraphs.length >= limit) break;
  }

  return paragraphs;
}

function pickProfileHint(siteProfile = null) {
  if (!siteProfile) return "";
  const description = normalizeString(siteProfile.description);
  if (description.length >= 40) return description;

  const firstParagraph = normalizeString(siteProfile.paragraphs?.[0] || "");
  if (firstParagraph.length >= 50) return firstParagraph;

  const title = normalizeString(siteProfile.title);
  if (title.length >= 20) return title;

  const heading = normalizeString(siteProfile.heading);
  if (heading.length >= 20 && heading.toLowerCase() !== "despre noi") return heading;

  return "";
}

async function fetchSiteProfileFromUrl(url = "") {
  if (!url) return null;

  try {
    const response = await fetchWithTimeout(url, {}, 7000);
    if (!response.ok) return null;
    const html = await response.text();
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const heading = extractFirstHeading(html);
    const paragraphs = extractMeaningfulParagraphs(html);

    return {
      title,
      description,
      heading,
      paragraphs,
      link: url,
      domain: extractDomain(url),
    };
  } catch {
    return null;
  }
}

async function fetchSiteProfile(result = null) {
  return fetchSiteProfileFromUrl(result?.link || "");
}

async function probeOfficialSite(companyName = "") {
  const companyProfile = buildCompanyProfile(companyName);
  const candidates = buildDomainCandidates(companyName);
  for (const candidate of candidates) {
    const siteProfile = await fetchSiteProfileFromUrl(candidate);
    if (!siteProfile) continue;

    const profileText = [
      siteProfile.title,
      siteProfile.description,
      siteProfile.heading,
      ...(siteProfile.paragraphs || []),
      siteProfile.domain,
    ].filter(Boolean).join(" ");

    if (!hasDirectCompanyMatch(profileText, companyProfile)) {
      continue;
    }

    if (siteProfile.title || siteProfile.description || siteProfile.heading || siteProfile.paragraphs?.length) {
      return siteProfile;
    }
  }
  return null;
}

function buildOperationalHypotheses(context, siteProfile) {
  const items = [];
  const sector = normalizeString(context.sector).toLowerCase();
  const siteText = `${siteProfile?.title || ""} ${siteProfile?.description || ""} ${(siteProfile?.paragraphs || []).join(" ")}`.toLowerCase();

  if (siteText.includes("produce") || siteText.includes("produc")) {
    items.push("Compania pare sa aiba productie proprie; merita testat unde apar blocajele de volum, schimburi si personal de executie.");
  }
  if (siteText.includes("transport")) {
    items.push("Exista semnal de logistica/transport in operare; intreaba daca lipsa de personal loveste doar productia sau si fluxul logistic.");
  }
  if (siteText.includes("zootehn") || siteText.includes("agric") || siteText.includes("ferma")) {
    items.push("Daca au operare agro/zootehnica, valideaza sezonalitatea si daca exista varfuri de personal in urmatoarele 60-90 zile.");
  }

  if (sector.includes("construct")) {
    items.push("Probabil lucreaza pe santiere sau loturi multiple; validarea cheie este daca au nevoie de echipe repetitive si cat de repede trebuie mobilizate.");
  } else if (sector.includes("industrie") || sector.includes("textil")) {
    items.push("Cel mai probabil conteaza ritmul de productie, schimburile si absenteismul; merita testata nevoia de loturi stabile, nu hire-uri izolate.");
  } else if (sector.includes("agro")) {
    items.push("Pentru agro/agroalimentar, discutia buna porneste din sezonalitate, continuitatea operatiei si rolurile de executie greu de acoperit local.");
  }

  if (context.potentialWorkers) {
    items.push(`In CRM ai deja un potential de ${context.potentialWorkers} workers; foloseste-l ca ipoteza, apoi valideaza daca volumul este pentru un singur lot sau pentru batch-uri succesive.`);
  }

  return Array.from(new Set(items)).slice(0, 3);
}

function buildDiscoveryQuestions(context, siteProfile) {
  const questions = [];
  const sector = normalizeString(context.sector).toLowerCase();
  const siteText = `${siteProfile?.title || ""} ${siteProfile?.description || ""} ${(siteProfile?.paragraphs || []).join(" ")}`.toLowerCase();

  questions.push("Ce roluri de executie va sunt cel mai greu de acoperit local in urmatoarele 60-90 zile?");
  questions.push("Daca ati gasi oamenii potriviti, de cati ati avea nevoie in primul lot si in cat timp?");

  if (sector.includes("construct")) {
    questions.push("Lucrati acum pe unul sau mai multe santiere unde lipsa echipelor va intinde termenele?");
    questions.push("Ati mai lucrat cu agentii sau cu forta de munca internationala pentru echipe repetitive?");
  } else if (sector.includes("industrie") || sector.includes("textil")) {
    questions.push("Unde simtiti presiunea mai mare: schimburi, absenteism sau cresterea volumului de productie?");
    questions.push("Aveti linii, schimburi sau pozitii care nu pot creste din lipsa de personal stabil?");
  } else if (sector.includes("agro")) {
    questions.push("Aveti varfuri sezoniere sau linii care cer oameni suplimentari in urmatoarele luni?");
    questions.push("Lipsa de personal va afecteaza mai mult productia, procesarea sau logistica?");
  } else {
    questions.push("Unde se vede mai repede lipsa de personal: volum pierdut, termene intinse sau cost operational mai mare?");
    questions.push("Ati prefera sa incepeti cu un lot pilot sau discutati direct despre un volum mai mare?");
  }

  if (siteText.includes("product") || siteText.includes("produce")) {
    questions.push("Ce produs sau flux de productie este cel mai expus acum la lipsa de personal?");
  }

  return Array.from(new Set(questions)).slice(0, 4);
}

function buildApproachSuggestions(context, webSignals, companyNews, sectorNews, siteProfile) {
  const suggestions = [];

  if (context.rank) {
    suggestions.push(`Este in A-list pe pozitia ${context.rank}; merita un prim touch bine personalizat, nu generic.`);
  }

  if (context.recruitmentSignal) {
    suggestions.push(`Exista semnal de recrutare activ: ${context.recruitmentSignal}. Intra cu un unghi de volum, viteza si predictibilitate.`);
  }

  const profileHintSource = pickProfileHint(siteProfile);
  if (profileHintSource) {
    const profileHint = truncate(profileHintSource, 120);
    suggestions.push(`Leaga deschiderea de profilul lor public: ${profileHint}`);
  }

  const sector = normalizeString(context.sector).toLowerCase();
  if (sector.includes("construct")) {
    suggestions.push("Leaga abordarea de santiere, termene, lipsa echipelor stabile si nevoie de loturi repetitive de muncitori.");
  } else if (sector.includes("industrie") || sector.includes("textil")) {
    suggestions.push("Accentul bun este pe schimburi, predictibilitate de productie si capacitatea de a scala rapid loturi de oameni.");
  } else if (sector.includes("agro")) {
    suggestions.push("Merita testat unghiul de sezonalitate, continuitate operationala si acoperirea rapida a rolurilor de executie.");
  }

  if (companyNews.length) {
    suggestions.push("Foloseste una dintre noutatile recente direct despre companie ca deschidere, apoi du discutia spre presiunea pe executie si forta de munca.");
  } else if (sectorNews.length) {
    suggestions.push("Daca nu exista noutati clare despre companie, foloseste contextul sectorului din Moldova si valideaza rapid ce proiecte sau extinderi au in lucru.");
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

function buildSnapshotSection(context = {}) {
  return [
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
  ].filter(Boolean);
}

function buildRecentActivitySection(context = {}) {
  return [
    "<b>Activitate recenta</b>",
    context.recentActivities.length
      ? context.recentActivities.map((activity) => summarizeActivity(activity)).join("\n")
      : "• Nu exista activitate salvata inca pentru aceasta companie.",
  ];
}

function buildProfileSection(siteProfile = null) {
  return [
    "<b>Profil public probabil</b>",
    siteProfile?.link
      ? `• Site probabil: <a href="${escapeHtml(siteProfile.link)}">${escapeHtml(siteProfile.domain || siteProfile.link)}</a>`
      : "• Nu am identificat clar un site oficial din cautarea initiala.",
    siteProfile?.title ? `• Titlu site: ${escapeHtml(siteProfile.title)}` : "",
    siteProfile?.heading ? `• Heading principal: ${escapeHtml(siteProfile.heading)}` : "",
    siteProfile?.description ? `• Descriere: ${escapeHtml(truncate(siteProfile.description, 220))}` : "",
    ...(siteProfile?.paragraphs || []).map((item) => `• Homepage: ${escapeHtml(item)}`),
  ].filter(Boolean);
}

function buildSection(title = "", body = []) {
  const lines = [title, ...(Array.isArray(body) ? body : [body])].filter(Boolean);
  return lines.length ? lines.join("\n") : "";
}

function buildFooter(context = {}, variant = "short") {
  const command = variant === "long" ? "/intel+" : "/intel";
  return `<i>Comanda: ${command} ${escapeHtml(context.company || "")}</i>`;
}

async function buildIntelligenceReport(data = {}, companyName = "", options = {}) {
  const variant = normalizeString(options.variant).toLowerCase() === "long" ? "long" : "short";
  const context = buildContext(data, companyName);
  if (!normalizeString(context.company)) {
    return {
      found: false,
      message: `Nu am gasit compania <b>${escapeHtml(companyName)}</b> in Airtable. Incearca numele exact din Companies sau Contact Priority.`,
    };
  }

  const [companyNews, sectorNews, webSignals] = await Promise.all([
    fetchCompanyNews(context.company),
    fetchSectorNews(context.sector),
    fetchWebSignals(context.company, context.sector),
  ]);
  const companyProfile = buildCompanyProfile(context.company);
  const officialSiteCandidate = findLikelyOfficialSite(webSignals, companyProfile);
  let siteProfile = await fetchSiteProfile(officialSiteCandidate);
  if (!siteProfile) {
    siteProfile = await probeOfficialSite(context.company);
  }

  const suggestions = buildApproachSuggestions(context, webSignals, companyNews, sectorNews, siteProfile);
  const operationalHypotheses = buildOperationalHypotheses(context, siteProfile);
  const discoveryQuestions = buildDiscoveryQuestions(context, siteProfile);

  const filteredWebSignals = webSignals
    .filter((item) => !siteProfile || item.link !== siteProfile.link)
    .slice(0, 2);

  const companySignalsSection = filteredWebSignals.length
    ? [
      "<b>Semnale publice despre companie</b>",
      filteredWebSignals.map((item) => renderLinkItem(item, truncate(item.snippet, 160))).join("\n"),
    ]
    : [];

  const companyNewsSection = companyNews.length
    ? [
      "<b>Noutati despre companie</b>",
      companyNews.map((item) => renderLinkItem(item, [item.source, item.pubDate].filter(Boolean).join(" · "))).join("\n"),
    ]
    : [];

  const sectorSection = sectorNews.length
    ? [
      "<b>Context sector Moldova</b>",
      sectorNews.map((item) => renderLinkItem(item, [item.source, item.pubDate].filter(Boolean).join(" · "))).join("\n"),
    ]
    : [];

  const reportSections = [
    `<b>${variant === "long" ? "Intel+ " : "Intel "}· ${escapeHtml(context.company)}</b>`,
    `<i>${variant === "long" ? "Sky view extins pentru abordare" : "Brief scurt pentru apel"}</i>`,
    buildSection("", buildSnapshotSection(context)),
    buildSection("", buildProfileSection(siteProfile)),
    buildSection("", buildRecentActivitySection(context)),
    buildSection(
      "<b>Unghi de abordare</b>",
      suggestions.map((item) => `• ${escapeHtml(item)}`)
    ),
  ];

  if (variant === "long") {
    reportSections.push(
      companySignalsSection.join("\n"),
      companyNewsSection.join("\n"),
      sectorSection.join("\n"),
      buildSection(
        "<b>Ipoteze de validat</b>",
        operationalHypotheses.length
          ? operationalHypotheses.map((item) => `• ${escapeHtml(item)}`)
          : ["• Incepe cu o ipoteza simpla: unde pierd ritm sau capacitate din lipsa de personal executiv."]
      ),
      buildSection(
        "<b>Intrebari de calibrare</b>",
        discoveryQuestions.map((item) => `• ${escapeHtml(item)}`)
      )
    );
  } else {
    reportSections.push(
      buildSection(
        "<b>Intrebari cheie</b>",
        discoveryQuestions.slice(0, 2).map((item) => `• ${escapeHtml(item)}`)
      )
    );
  }

  reportSections.push(buildFooter(context, variant));

  const report = reportSections.filter(Boolean).join("\n\n");

  return {
    found: true,
    message: report,
    context,
    variant,
  };
}

module.exports = {
  buildIntelligenceReport,
};
