const fs = require("fs");
const path = require("path");
const { sendError, setNoStore } = require("./_lib/http");

const LOCAL_RADAR_DIR = path.join(__dirname, "..", "scraper", "output", "market-radar");
const LOCAL_PRESS_RADAR_DIR = path.join(__dirname, "..", "scraper", "output", "predator-press-radar");
const SEEDED_SIGNAL_FILES = [
  path.join(__dirname, "_data", "predator-mtender-may-2026.json"),
  path.join(__dirname, "_data", "predator-market-radar-latest.json"),
];
const DEFAULT_TABLE = "Market Signals";
const MTENDER_BASE_URL = "https://public.mtender.gov.md";
const MTENDER_SEARCH_URL = "https://mtender.gov.md/search/tenders";
const MTENDER_SOURCE = "MTender API";
const MTENDER_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TENDER_MIN_VALUE_MDL = 1_500_000;

let mtenderCache = null;

function normalizeString(value = "") {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function readBooleanEnv(name, fallback = false) {
  const value = normalizeString(process.env[name]).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

function toNumber(value = 0) {
  const num = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function splitList(value = "") {
  if (Array.isArray(value)) return value.map(normalizeString).filter(Boolean);
  return normalizeString(value)
    .split(/\n|;|\|/)
    .map(normalizeString)
    .filter(Boolean);
}

function firstField(fields = {}, names = []) {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null && fields[name] !== "") {
      return fields[name];
    }
  }
  return "";
}

function normalizeSignal(input = {}) {
  const fields = input.fields || input;
  const signal = {
    id: input.id || normalizeString(firstField(fields, ["id", "ID"])),
    signal_key: normalizeString(firstField(fields, ["Signal Key", "signal_key", "signalKey"])),
    duplicate_group_key: normalizeString(firstField(fields, ["Duplicate Group Key", "duplicate_group_key", "duplicateGroupKey"])),
    type: normalizeString(firstField(fields, ["Type", "type"])),
    signal_kind: normalizeString(firstField(fields, ["Signal Kind", "signal_kind", "signalKind"])),
    signal_channel: normalizeString(firstField(fields, ["Signal Channel", "signal_channel", "signalChannel", "Channel", "channel"])),
    signal_label: normalizeString(firstField(fields, ["Signal Label", "signal_label", "signalLabel", "Label", "label"])),
    predator_bucket: normalizeString(firstField(fields, ["Predator Bucket", "predator_bucket", "predatorBucket", "Bucket", "bucket"])),
    source: normalizeString(firstField(fields, ["Source", "source"])),
    source_tier: normalizeString(firstField(fields, ["Source Tier", "source_tier", "sourceTier"])),
    company: normalizeString(firstField(fields, ["Company", "company", "Contact Target", "contact_target", "Project Owner", "project_owner", "Developer", "developer", "Contractor", "contractor", "Investor", "investor"])),
    target_company: normalizeString(firstField(fields, ["Target Company", "target_company", "targetCompany", "Contact Target", "contact_target", "Project Owner", "project_owner", "Developer", "developer", "Contractor", "contractor", "Investor", "investor"])),
    job_count: toNumber(firstField(fields, ["Job Count", "job_count", "jobCount"])),
    job_titles: splitList(firstField(fields, ["Job Titles", "job_titles", "jobTitles"])),
    evidence_urls: splitList(firstField(fields, ["Evidence URLs", "evidence_urls", "evidenceUrls", "URL", "url"])),
    buyer: normalizeString(firstField(fields, ["Buyer", "buyer"])),
    winner: normalizeString(firstField(fields, ["Winner", "winner"])),
    title: normalizeString(firstField(fields, ["Title", "title", "Project Summary", "project_summary", "Summary", "summary"])),
    sector: normalizeString(firstField(fields, ["Sector", "sector"])),
    location: normalizeString(firstField(fields, ["Location", "location"])),
    score: toNumber(firstField(fields, ["Score", "score"])),
    priority: normalizeString(firstField(fields, ["Priority", "priority"])),
    url: normalizeString(firstField(fields, ["URL", "url"])),
    posted_at: normalizeString(firstField(fields, ["Posted At", "posted_at", "postedAt"])),
    deadline: normalizeString(firstField(fields, ["Deadline", "deadline"])),
    estimated_value_mdl: toNumber(firstField(fields, ["Estimated Value MDL", "estimated_value_mdl", "estimatedValueMdl", "Estimated Value", "estimated_value", "estimatedValue"])),
    awarded_value_mdl: toNumber(firstField(fields, ["Awarded Value MDL", "awarded_value_mdl", "awardedValueMdl"])),
    award_status: normalizeString(firstField(fields, ["Award Status", "award_status", "awardStatus"])),
    cpv: normalizeString(firstField(fields, ["CPV", "cpv"])),
    procedure_type: normalizeString(firstField(fields, ["Procedure Type", "procedure_type", "procedureType"])),
    award_criteria: normalizeString(firstField(fields, ["Award Criteria", "award_criteria", "awardCriteria"])),
    participants: toNumber(firstField(fields, ["Participants", "participants"])),
    lots_detail: normalizeString(firstField(fields, ["Lots Detail", "lots_detail", "lotsDetail"])),
    reasons: splitList(firstField(fields, ["Reasons", "reasons"])),
    outreach_angle: normalizeString(firstField(fields, ["Outreach Angle", "outreach_angle", "outreachAngle", "Recommended Outreach Angle", "recommended_outreach_angle", "recommendedOutreachAngle"])),
    scraped_at: normalizeString(firstField(fields, ["Scraped At", "scraped_at", "scrapedAt"])),
  };

  signal.target_company = signal.target_company || signal.winner || signal.company || signal.buyer;
  signal.company = signal.company || signal.target_company;
  signal.signal_kind = signal.signal_kind || signal.type;
  signal.priority = signal.priority || priorityFromScore(signal.score);
  signal.url = signal.url || signal.evidence_urls[0] || "";
  signal.evidence_urls = signal.evidence_urls.length ? signal.evidence_urls : [signal.url].filter(Boolean);

  return enrichPredatorSignal(signal);
}

function priorityFromScore(score = 0) {
  if (score >= 75) return "P1";
  if (score >= 55) return "P2";
  if (score >= 35) return "P3";
  return "Watch";
}

function fold(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getNested(obj, pathList = [], fallback = "") {
  let current = obj;
  for (const key of pathList) {
    if (!current || typeof current !== "object") return fallback;
    current = current[key];
  }
  return current === undefined || current === null || current === "" ? fallback : current;
}

function toMdl(amount = 0, currency = "MDL") {
  const value = toNumber(amount);
  const code = normalizeString(currency).toUpperCase();
  if (code === "EUR") return value * 20;
  if (code === "USD") return value * 18;
  return value;
}

function daysAgo(value = "") {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 999;
  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function formatIsoDate(value = "") {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString();
}

const TENDER_INCLUDE = [
  "lucrari",
  "lucrări",
  "construct",
  "reparatie",
  "reparație",
  "reparatii",
  "reparații",
  "drum",
  "trotuar",
  "pavaj",
  "pavare",
  "amenajare",
  "infrastruct",
  "strada",
  "străzi",
  "asfalt",
  "reabilitare",
  "modernizare",
  "consolidare",
  "extindere",
  "renovare",
  "acoperis",
  "acoperiș",
  "inginerie",
  "ingineresc",
  "ingineresti",
  "inginerești",
  "retele ingineresti",
  "rețele inginerești",
  "retea",
  "rețea",
  "retele",
  "rețele",
  "instalatii",
  "instalații",
  "canalizare",
  "apeduct",
  "apa",
  "apă",
  "gaz",
  "electric",
  "termic",
  "termice",
  "pod",
  "poduri",
  "incalzire",
  "încălzire",
  "finisare",
];

const TENDER_EXCLUDE = [
  "produse alimentare",
  "alimente",
  "alimentar",
  "carne",
  "lactate",
  "panificatie",
  "panificație",
  "legume",
  "fructe",
  "medicament",
  "uniforme",
  "echipamente it",
  "software",
  "mobilier",
  "furnizare bunuri",
  "rechizite",
  "consumabile",
  "echipament medical",
  "materiale de constructie",
  "materiale de construcție",
  "servicii de proiectare",
  "proiectare",
  "supraveghere tehnica",
  "supraveghere tehnică",
  "diriginte de santier",
  "diriginte de șantier",
  "expertiza tehnica",
  "expertiză tehnică",
  "documentatie tehnica",
  "documentație tehnică",
  "studiu de fezabilitate",
  "piese de schimb",
  "furnizare a gazelor naturale",
  "servicii de furnizare a gazelor naturale",
  "gaze naturale pentru anul",
];

function isContactable(signal = {}) {
  if (isTenderWatch(signal)) return false;
  if (signal.type === "tender") return Boolean(signal.winner || signal.target_company);
  return Boolean(signal.target_company || signal.company);
}

function isTenderWatch(signal = {}) {
  return signal.type === "tender" && !signal.winner;
}

function isAwardedTenderSignal(signal = {}) {
  const sourceText = fold(`${signal.source || ""} ${signal.signal_kind || ""} ${signal.type || ""}`);
  return (
    signal.predator_bucket === "mtender_won"
    || signal.signal_kind === "awarded_tender"
    || (signal.type === "tender" && Boolean(signal.winner) && sourceText.includes("mtender"))
  );
}

const PRESS_SOURCE_HINTS = [
  "press",
  "news",
  "gov.md",
  "midr",
  "invest.gov",
  "invest moldova",
  "mold-street",
  "logos press",
  "ipn",
  "agora",
  "realitatea",
  "noi.md",
  "diez",
  "unimedia",
  "moldpres",
  "construct intelligence",
  "predator press radar",
  "local-press-radar",
];

const PRESS_KIND_HINTS = [
  "press",
  "news",
  "project",
  "private_project",
  "investment",
  "construction_project",
  "infrastructure_project",
  "factory_expansion",
  "logistics_project",
  "real_estate_project",
];

function classifyPredatorBucket(signal = {}) {
  const explicit = fold(`${signal.predator_bucket || ""} ${signal.signal_channel || ""} ${signal.signal_label || ""}`);
  if (explicit.includes("mtender")) return "mtender_won";
  if (explicit.includes("press")) return "press_signal";
  if (isAwardedTenderSignal(signal)) return "mtender_won";

  const kindText = fold(`${signal.type || ""} ${signal.signal_kind || ""}`);
  const sourceText = fold(`${signal.source || ""} ${(signal.evidence_urls || []).join(" ")}`);
  if (
    PRESS_KIND_HINTS.some((hint) => kindText.includes(fold(hint)))
    || PRESS_SOURCE_HINTS.some((hint) => sourceText.includes(fold(hint)))
  ) {
    return "press_signal";
  }

  return "market_signal";
}

function labelForPredatorBucket(bucket = "") {
  if (bucket === "mtender_won") return "MTender Won";
  if (bucket === "press_signal") return "Press Signal";
  return "Market Signal";
}

function enrichPredatorSignal(signal = {}) {
  const bucket = classifyPredatorBucket(signal);
  const label = normalizeString(signal.signal_label) || labelForPredatorBucket(bucket);
  return {
    ...signal,
    predator_bucket: bucket,
    signal_channel: normalizeString(signal.signal_channel) || bucket,
    signal_label: label,
  };
}

function rankPriority(value = "") {
  return { P1: 0, P2: 1, P3: 2, Watch: 3 }[normalizeString(value)] ?? 4;
}

function summarize(signals = []) {
  const contactable = signals.filter(isContactable);
  const tenderWinners = signals.filter((signal) => signal.predator_bucket === "mtender_won" || isAwardedTenderSignal(signal));
  const pressSignals = signals.filter((signal) => signal.predator_bucket === "press_signal");
  const marketSignals = signals.filter((signal) => signal.predator_bucket === "market_signal");
  const watchlist = signals.filter(isTenderWatch);
  const p1 = signals.filter((signal) => signal.priority === "P1");
  const p2 = signals.filter((signal) => signal.priority === "P2");
  const companies = new Set(contactable.map((signal) => companyDedupeKey(signal.target_company || signal.company)).filter(Boolean));

  return {
    total: signals.length,
    contactable: contactable.length,
    companies: companies.size,
    p1: p1.length,
    p2: p2.length,
    tender_winners: tenderWinners.length,
    press_signals: pressSignals.length,
    market_signals: marketSignals.length,
    watchlist: watchlist.length,
    top_score: Math.max(0, ...signals.map((signal) => signal.score || 0)),
  };
}

async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 18000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "GROW-Predator-MTender/1.0",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`${url} a raspuns cu ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mtenderStartOffset(daysBack = 2) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysBack);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().replace(".000Z", "Z");
}

function getCompiledRelease(ocds = {}) {
  const candidates = getReleaseCandidates(ocds);
  if (!candidates.length) return ocds;
  return candidates.sort((left, right) => (
    scoreCompiledRelease(right) - scoreCompiledRelease(left)
    || (Date.parse(right.date || "") || 0) - (Date.parse(left.date || "") || 0)
  ))[0];
}

function getReleaseCandidates(ocds = {}) {
  const candidates = [];
  if (Array.isArray(ocds.records)) {
    for (const record of ocds.records) {
      if (record?.compiledRelease) candidates.push(record.compiledRelease);
    }
  }
  if (Array.isArray(ocds.actualReleases)) candidates.push(...ocds.actualReleases);
  if (Array.isArray(ocds.releases)) candidates.push(...ocds.releases);
  if (ocds.ocid || ocds.tender || ocds.awards) candidates.push(ocds);

  return candidates;
}

function scoreCompiledRelease(release = {}) {
  if (!release || typeof release !== "object") return -1;
  let score = 0;
  if (Array.isArray(release.contracts) && release.contracts.length) score += 80;
  if (Array.isArray(release.awards) && release.awards.length) score += 60;
  if (Array.isArray(release.bids?.details) && release.bids.details.length) score += 10;
  if (release.tender) score += 5;
  return score;
}

function getMtenderBuyer(release = {}) {
  const buyerRef = release.buyer || release.tender?.procuringEntity || {};
  const buyerId = buyerRef.id || "";
  const party = (release.parties || []).find((item) => (
    (buyerId && item.id === buyerId) || (item.roles || []).includes("buyer")
  ));
  return {
    name: buyerRef.name || party?.name || "",
    id: getNested(party, ["identifier", "id"], "") || buyerId,
  };
}

function getMtenderAward(release = {}) {
  const awards = Array.isArray(release.awards) ? release.awards : [];
  const usable = awards.filter((award) => {
    const status = fold(award.status || "");
    return !status || ["active", "pending", "complete", "successful"].some((item) => status.includes(item));
  });
  return usable[0] || awards[0] || null;
}

function getMtenderSupplier(award = null) {
  const supplier = Array.isArray(award?.suppliers) ? award.suppliers[0] : null;
  return {
    name: supplier?.name || "",
    id: getNested(supplier, ["identifier", "id"], "") || supplier?.id || "",
  };
}

function getMtenderTitle({ tender = {}, award = {}, release = {}, ocidInfo = {}, ocid = "" } = {}) {
  const candidates = [
    tender.title,
    tender.description,
    award?.title,
    award?.description,
    release.title,
    ocidInfo.title,
    ocidInfo.description,
  ];
  return candidates.find((item) => {
    const value = normalizeString(item);
    return value && fold(value) !== fold(ocid) && !/^ocds-/i.test(value);
  }) || ocid;
}

function getMtenderTitleFromOcds(ocds = {}, ocid = "") {
  for (const release of getReleaseCandidates(ocds)) {
    const title = getMtenderTitle({ tender: release?.tender || {}, release, ocid });
    if (title && title !== ocid) return title;
  }
  return "";
}

function isRelevantMtenderTender(release = {}, signalText = "") {
  const tender = release.tender || {};
  const category = fold(tender.mainProcurementCategory || "");
  const cpv = normalizeString(tender.classification?.id || "");
  const text = fold([
    signalText,
    tender.title,
    tender.description,
    tender.classification?.description,
    (tender.items || []).map((item) => `${item.description || ""} ${item.classification?.description || ""}`).join(" "),
  ].join(" "));

  if (TENDER_EXCLUDE.some((keyword) => text.includes(fold(keyword)))) return false;
  if (category === "works") return true;
  if (/^45\d{6}-\d/.test(cpv)) return true;
  return TENDER_INCLUDE.some((keyword) => text.includes(fold(keyword)));
}

function scoreMtenderSignal({ amountMdl = 0, date = "", hasWinner = false, keywordMatch = true, lots = 0 }) {
  let score = 25;
  if (amountMdl >= 50_000_000) score += 28;
  else if (amountMdl >= 20_000_000) score += 24;
  else if (amountMdl >= 10_000_000) score += 24;
  else if (amountMdl >= 5_000_000) score += 18;
  else if (amountMdl >= 1_000_000) score += 12;
  else if (amountMdl >= 300_000) score += 6;

  if (hasWinner) score += 18;
  if (keywordMatch) score += 8;
  if (lots > 1) score += Math.min(8, lots * 2);

  const age = daysAgo(date);
  if (age <= 1) score += 10;
  else if (age <= 3) score += 6;
  else if (age <= 7) score += 3;

  if (!hasWinner) score = Math.min(score, 34);
  return Math.max(0, Math.min(100, score));
}

function mtenderToSignal(ocidInfo = {}, ocds = {}) {
  const release = getCompiledRelease(ocds);
  const tender = release.tender || {};
  const award = getMtenderAward(release);
  const supplier = getMtenderSupplier(award);
  const buyer = getMtenderBuyer(release);
  const tenderValue = tender.value || release.planning?.budget?.amount || {};
  const awardValue = award?.value || {};
  const amountMdl = toMdl(
    awardValue.amount || tenderValue.amount || ocidInfo.amount || 0,
    awardValue.currency || tenderValue.currency || ocidInfo.currency || "MDL"
  );
  const sourceOcid = ocidInfo.ocid || ocidInfo.id || ocidInfo.entityId || "";
  const ocid = release.ocid || sourceOcid || "";
  const title = getMtenderTitle({
    tender,
    award,
    release,
    ocidInfo: { ...ocidInfo, title: ocidInfo.title || getMtenderTitleFromOcds(ocds, ocid) },
    ocid,
  });
  const signalDate = award?.date || release.date || ocidInfo.modifiedDate || ocidInfo.date || ocds.publishedDate || "";
  const lots = Array.isArray(tender.lots) ? tender.lots.length : 0;
  const hasWinner = Boolean(supplier.name);
  if (!hasWinner) return null;

  const relevant = isRelevantMtenderTender(release, `${title} ${award?.description || ""}`);
  if (!relevant) return null;
  const minValueMdl = Math.max(0, toNumber(process.env.PREDATOR_MTENDER_MIN_VALUE_MDL || DEFAULT_TENDER_MIN_VALUE_MDL));
  if (amountMdl < minValueMdl) return null;

  const score = scoreMtenderSignal({
    amountMdl,
    date: signalDate,
    hasWinner,
    keywordMatch: relevant,
    lots,
  });

  const sourceUrl = `https://mtender.gov.md/ro/tenders/${encodeURIComponent(ocid)}`;
  const apiUrl = `${MTENDER_BASE_URL}/tenders/${encodeURIComponent(ocid)}`;
  const target = supplier.name || "";

  return normalizeSignal({
    id: `mtender:${ocid}:${supplier.id || "watch"}`,
    signal_key: hasWinner
      ? `mtender-awarded:${ocid}:${supplier.id || fold(supplier.name)}`
      : `mtender-watch:${ocid}`,
    duplicate_group_key: `mtender:${ocid}`,
    type: "tender",
    signal_kind: "awarded_tender",
    source: MTENDER_SOURCE,
    signal_channel: "mtender_won",
    signal_label: "MTender Won",
    predator_bucket: "mtender_won",
    source_tier: "primary",
    company: target || buyer.name,
    target_company: target,
    buyer: buyer.name,
    winner: target,
    title: `Castigator desemnat MTender: ${title}`,
    sector: "Constructii / lucrari publice",
    score,
    priority: priorityFromScore(score),
    url: sourceUrl,
    evidence_urls: [sourceUrl, apiUrl],
    posted_at: formatIsoDate(signalDate),
    deadline: tender.tenderPeriod?.endDate || tender.enquiryPeriod?.endDate || "",
    estimated_value_mdl: 0,
    awarded_value_mdl: amountMdl,
    award_status: award?.status || tender.status || "",
    cpv: [tender.classification?.id, tender.classification?.description].filter(Boolean).join(" - "),
    procedure_type: tender.procurementMethodDetails || tender.procurementMethod || "",
    award_criteria: tender.awardCriteria || tender.awardCriteriaDetails || "",
    participants: Array.isArray(release.bids?.details) ? release.bids.details.length : 0,
    lots_detail: (tender.lots || []).slice(0, 6).map((lot) => lot.title || lot.description).filter(Boolean).join("; "),
    reasons: [
      "Sursa oficiala MTender",
      `castigator desemnat: ${target}`,
      amountMdl ? `valoare: ${Math.round(amountMdl).toLocaleString("ro-MD")} MDL` : "",
      tender.classification?.id ? `CPV: ${tender.classification.id}` : "",
      award?.status ? `award status: ${award.status}` : "",
    ].filter(Boolean),
    outreach_angle: hasWinner
      ? `Abordare: ${target} este castigator desemnat pe MTender${amountMdl ? ` pentru un contract de ${Math.round(amountMdl).toLocaleString("ro-MD")} MDL` : ""}. Valideaza rapid daca proiectul cere echipe suplimentare in urmatoarele 30-60 zile si cine decide resursa umana.`
      : "Monitorizeaza licitatia pana apare castigatorul; dupa atribuire, tinta comerciala este contractorul, nu autoritatea publica.",
    scraped_at: new Date().toISOString(),
  });
}

async function mapWithConcurrency(items = [], concurrency = 6, mapper = async () => {}) {
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += concurrency) {
      await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function fetchMtenderSignals() {
  if (readBooleanEnv("PREDATOR_MTENDER_DISABLED", false)) return [];
  const now = Date.now();
  if (mtenderCache?.expiresAt > now) return mtenderCache.signals;

  const daysBack = Math.max(1, toNumber(process.env.PREDATOR_MTENDER_DAYS_BACK || 2));
  const maxPages = Math.max(1, toNumber(process.env.PREDATOR_MTENDER_MAX_PAGES || 2));
  const maxDetails = Math.max(1, toNumber(process.env.PREDATOR_MTENDER_MAX_DETAILS || 80));
  let ocids = await fetchMtenderSearchCandidates({ daysBack, maxPages, maxDetails });
  if (!ocids.length) {
    ocids = await fetchMtenderOffsetCandidates({ daysBack, maxPages, maxDetails });
  }

  const signals = [];
  await mapWithConcurrency(ocids, 8, async (item) => {
    try {
      const ocid = item.ocid || item.id || item.entityId || item;
      if (!ocid) return;
      const payload = await fetchJson(`${MTENDER_BASE_URL}/tenders/${encodeURIComponent(ocid)}`, { timeoutMs: 18000 });
      const signal = mtenderToSignal(item, payload);
      if (signal) signals.push(signal);
    } catch {
      // A single tender should not break the Predator feed.
    }
  });

  mtenderCache = {
    expiresAt: now + MTENDER_CACHE_TTL_MS,
    signals,
  };
  return signals;
}

async function fetchMtenderSearchCandidates({ daysBack = 2, maxPages = 2, maxDetails = 80 } = {}) {
  const candidates = [];
  const statuses = splitList(process.env.PREDATOR_MTENDER_STATUSES || "awarding;awarded;contracting;complete");
  const minValueMdl = Math.max(0, toNumber(process.env.PREDATOR_MTENDER_MIN_VALUE_MDL || DEFAULT_TENDER_MIN_VALUE_MDL));
  const [periodStart, periodEnd] = mtenderSearchPeriod(daysBack);

  for (let page = 1; page <= maxPages && candidates.length < maxDetails; page += 1) {
    const params = new URLSearchParams({
      periodPublished: JSON.stringify([periodStart, periodEnd]),
      proceduresStatuses: JSON.stringify(statuses),
      amountFrom: String(minValueMdl),
      page: String(page),
      pageSize: String(Math.min(100, maxDetails)),
    });
    const payload = await fetchJson(`${MTENDER_SEARCH_URL}?${params.toString()}`, { timeoutMs: 18000 });
    const pageItems = Array.isArray(payload.data) ? payload.data : [];
    candidates.push(...pageItems.slice(0, maxDetails - candidates.length).map((item) => ({
      ...item,
      ocid: item.ocid || item.entityId || item.id,
    })));
    const pageCount = toNumber(payload._meta?.pageCount || 0);
    if (!pageItems.length || (pageCount && page >= pageCount)) break;
  }

  return candidates;
}

async function fetchMtenderOffsetCandidates({ daysBack = 2, maxPages = 2, maxDetails = 80 } = {}) {
  const ocids = [];
  let offset = mtenderStartOffset(daysBack);

  for (let page = 0; page < maxPages && offset && ocids.length < maxDetails; page += 1) {
    const url = `${MTENDER_BASE_URL}/tenders/?${new URLSearchParams({ offset }).toString()}`;
    const payload = await fetchJson(url, { timeoutMs: 18000 });
    const pageItems = Array.isArray(payload.data) ? payload.data : [];
    ocids.push(...pageItems.slice(0, maxDetails - ocids.length));
    if (!payload.offset || payload.offset === offset || !pageItems.length) break;
    offset = payload.offset;
  }

  return ocids;
}

function mtenderSearchPeriod(daysBack = 2) {
  const end = new Date();
  end.setUTCMilliseconds(0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBack);
  start.setUTCHours(0, 0, 0, 0);
  return [
    start.toISOString().replace(".000Z", "Z"),
    end.toISOString().replace(".000Z", "Z"),
  ];
}

async function airtableRequest({ token, baseId, table, offset = "" }) {
  const params = new URLSearchParams({ pageSize: "100" });
  if (offset) params.set("offset", offset);
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = `Airtable Market Signals a raspuns cu ${response.status}.`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      // Keep the default message.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function readAirtableSignals(limit = 200) {
  const token = process.env.AIRTABLE_MARKET_TOKEN || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_MARKET_BASE_ID || process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_MARKET_SIGNALS || DEFAULT_TABLE;

  if (!token || !baseId || !table) {
    return null;
  }

  const records = [];
  let offset = "";
  do {
    const payload = await airtableRequest({ token, baseId, table, offset });
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset && records.length < limit);

  return {
    source: "airtable",
    configured: true,
    table,
    signals: records.slice(0, limit).map(normalizeSignal),
    warnings: [],
  };
}

function readLatestLocalRadar() {
  if (!fs.existsSync(LOCAL_RADAR_DIR)) return null;
  const files = fs.readdirSync(LOCAL_RADAR_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(LOCAL_RADAR_DIR, file);
      return { file, fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (!files.length) return null;
  const latest = files[0];
  const payload = JSON.parse(fs.readFileSync(latest.fullPath, "utf8"));
  const signals = Array.isArray(payload.signals) ? payload.signals : [];

  return {
    source: "local-market-radar",
    configured: false,
    table: "",
    file: latest.file,
    meta: payload.meta || {},
    signals: signals.map(normalizeSignal),
    warnings: ["Airtable Market Signals nu este disponibil; afisez ultimul raport local al scraperului."],
  };
}

function readLatestLocalPressRadar() {
  if (!fs.existsSync(LOCAL_PRESS_RADAR_DIR)) return null;
  const files = fs.readdirSync(LOCAL_PRESS_RADAR_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(LOCAL_PRESS_RADAR_DIR, file);
      return { file, fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (!files.length) return null;
  const latest = files[0];
  const payload = JSON.parse(fs.readFileSync(latest.fullPath, "utf8"));
  const rawSignals = Array.isArray(payload.signals)
    ? payload.signals
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    source: "local-press-radar",
    configured: false,
    table: "",
    file: latest.file,
    meta: payload.meta || {},
    signals: rawSignals.map((item) => normalizeSignal({
      ...item,
      type: item.type || "press",
      signal_kind: item.signal_kind || item.signalKind || "press_project",
      signal_channel: item.signal_channel || item.signalChannel || "press_signal",
      signal_label: item.signal_label || item.signalLabel || "Press Signal",
      predator_bucket: item.predator_bucket || item.predatorBucket || "press_signal",
      source: item.source || "Predator Press Radar",
    })),
    warnings: [],
  };
}

function readSeededSignals() {
  const signals = [];
  const files = [];
  const sources = new Set();

  for (const seedFile of SEEDED_SIGNAL_FILES) {
    if (!fs.existsSync(seedFile)) continue;
    const payload = JSON.parse(fs.readFileSync(seedFile, "utf8"));
    const rawSignals = Array.isArray(payload.signals)
      ? payload.signals
      : Array.isArray(payload)
        ? payload
        : [];
    signals.push(...rawSignals.map((item) => normalizeSignal(item)));
    files.push({
      file: path.basename(seedFile),
      meta: payload.meta || {},
    });
    const sourceText = fold(`${path.basename(seedFile)} ${payload.meta?.source || ""}`);
    if (sourceText.includes("market-radar")) sources.add("market-radar-seed");
    else if (sourceText.includes("mtender")) sources.add("mtender-seed");
    else sources.add("predator-seed");
  }

  if (!signals.length) return null;
  return {
    source: Array.from(sources).join("+") || "predator-seed",
    configured: false,
    table: "",
    file: files.map((item) => item.file).join(", "),
    meta: { seed_files: files },
    signals,
    warnings: [],
  };
}

function buildPayload(data) {
  const signals = dedupeSignals([...(data?.signals || [])].map(enrichPredatorSignal))
    .filter(shouldExposeInDashboard)
    .sort((left, right) => (
      rankPriority(left.priority) - rankPriority(right.priority)
      || (right.score || 0) - (left.score || 0)
      || normalizeString(left.target_company).localeCompare(normalizeString(right.target_company), "ro")
    ));

  return {
    configured: Boolean(data?.configured || signals.length),
    source: data?.source || "none",
    table: data?.table || "",
    file: data?.file || "",
    meta: data?.meta || {},
    summary: summarize(signals),
    signals,
    warnings: data?.warnings || [],
  };
}

function shouldExposeInDashboard(signal = {}) {
  if (isTenderWatch(signal)) return false;
  const minValueMdl = Math.max(0, toNumber(process.env.PREDATOR_TENDER_MIN_VALUE_MDL || DEFAULT_TENDER_MIN_VALUE_MDL));
  const value = toNumber(signal.awarded_value_mdl || signal.estimated_value_mdl || 0);
  if (signal.type === "tender" || signal.predator_bucket === "mtender_won") {
    return Boolean(signal.winner || signal.target_company) && value >= minValueMdl;
  }
  if (signal.predator_bucket === "press_signal" && value && value < minValueMdl) return false;
  return true;
}

function dedupeSignals(signals = []) {
  const seen = new Set();
  return signals.filter((signal) => {
    const keys = [
      mtenderDedupeKey(signal),
      normalizeString(signal.signal_key),
      normalizeString(signal.duplicate_group_key),
      `${normalizeString(signal.source)}:${normalizeString(signal.target_company)}:${normalizeString(signal.title)}`,
    ].filter(Boolean);
    if (!keys.length || keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

function mtenderDedupeKey(signal = {}) {
  const sourceText = fold(`${signal.source || ""} ${signal.signal_kind || ""} ${signal.type || ""} ${signal.predator_bucket || ""}`);
  if (!sourceText.includes("mtender")) return "";
  const raw = [
    signal.signal_key,
    signal.duplicate_group_key,
    signal.id,
    signal.url,
    ...(signal.evidence_urls || []),
  ].join(" ");
  const match = raw.match(/ocds-[a-z0-9]{6}-[A-Z]{2}-\d{13}/i);
  if (!match) return "";
  const company = companyDedupeKey(signal.target_company || signal.winner || signal.company);
  return company ? `mtender:${match[0].toLowerCase()}:${company}` : "";
}

function companyDedupeKey(value = "") {
  return fold(value)
    .replace(/\b(s\.?r\.?l\.?|sa|s\.?a\.?|i\.?m\.?|s\.?c\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

module.exports = async function handler(request, response) {
  setNoStore(response);
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    let data = null;
    let mtenderSignals = [];
    let pressData = null;
    let seededData = null;
    let mtenderChecked = false;
    const warnings = [];

    try {
      mtenderSignals = await fetchMtenderSignals();
      mtenderChecked = true;
    } catch (error) {
      warnings.push(`MTender API nu a raspuns pentru feed live: ${error.message}`);
    }

    try {
      data = await readAirtableSignals();
    } catch (error) {
      data = readLatestLocalRadar();
      if (data) {
        data.warnings = [`Nu am putut citi Airtable Market Signals: ${error.message}`, ...data.warnings];
      } else {
        warnings.push(`Nu am putut citi Airtable Market Signals: ${error.message}`);
      }
    }

    if (!data) {
      data = readLatestLocalRadar();
    }

    try {
      pressData = readLatestLocalPressRadar();
    } catch (error) {
      warnings.push(`Predator Press Radar local nu a putut fi citit: ${error.message}`);
    }

    try {
      seededData = readSeededSignals();
    } catch (error) {
      warnings.push(`Snapshotul Predator local nu a putut fi citit: ${error.message}`);
    }

    const hasFallbackSignals = mtenderSignals.length
      || (seededData?.signals || []).length
      || (pressData?.signals || []).length;
    const base = data || {
      source: "none",
      configured: false,
      signals: [],
      warnings: hasFallbackSignals
        ? []
        : ["Nu exista inca semnale Predator. Ruleaza Grow Market Radar sau configureaza AIRTABLE_TABLE_MARKET_SIGNALS."],
    };

    response.status(200).json(buildPayload({
      ...base,
      source: [base.source, seededData?.source, pressData?.source, mtenderSignals.length ? "mtender-live" : ""]
        .filter((item) => item && item !== "none")
        .join("+") || "none",
      signals: [...mtenderSignals, ...(seededData?.signals || []), ...(pressData?.signals || []), ...(base.signals || [])],
      warnings: [...warnings, ...(pressData?.warnings || []), ...(base.warnings || [])],
    }));
  } catch (error) {
    sendError(response, error);
  }
};
