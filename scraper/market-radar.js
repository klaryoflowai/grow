import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { notify } from "./telegram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(__dirname, "output", "market-radar");

const JOB_SOURCES = [
  {
    key: "rabota",
    name: "Rabota.md",
    sourceTier: "primary",
    sector: "Constructii",
    url: "https://www.rabota.md/ro/jobs-moldova-Construcții;",
    selector: "a[href*='/ro/locuri-de-munca/']",
  },
  {
    key: "rabota",
    name: "Rabota.md",
    sourceTier: "primary",
    sector: "Productie",
    url: "https://www.rabota.md/ro/jobs-moldova-Producție;",
    selector: "a[href*='/ro/locuri-de-munca/']",
  },
  {
    key: "rabota",
    name: "Rabota.md",
    sourceTier: "primary",
    sector: "Depozitare / Logistica",
    url: "https://www.rabota.md/ro/jobs-moldova-Depozitare;",
    selector: "a[href*='/ro/locuri-de-munca/']",
  },
  {
    key: "lucru",
    name: "Lucru.md",
    sourceTier: "primary",
    sector: "Constructii",
    url: "https://www.lucru.md/ro/jobs-moldova-Construcții;",
    selector: "a[href*='/ro/lucru/']",
  },
  {
    key: "lucru",
    name: "Lucru.md",
    sourceTier: "primary",
    sector: "Productie",
    url: "https://www.lucru.md/ro/jobs-moldova-Producție;",
    selector: "a[href*='/ro/lucru/']",
  },
  {
    key: "lucru",
    name: "Lucru.md",
    sourceTier: "primary",
    sector: "Depozitare / Logistica",
    url: "https://www.lucru.md/ro/jobs-moldova-Depozitare;",
    selector: "a[href*='/ro/lucru/']",
  },
  {
    key: "delucru",
    name: "Delucru.md",
    sourceTier: "primary",
    sector: "Constructii",
    url: "https://www.delucru.md/jobs/construction-repairs-installations",
    selector: ".job-item",
  },
  {
    key: "delucru",
    name: "Delucru.md",
    sourceTier: "primary",
    sector: "Productie",
    url: "https://www.delucru.md/jobs/production",
    selector: ".job-item",
  },
  {
    key: "delucru",
    name: "Delucru.md",
    sourceTier: "primary",
    sector: "Depozitare / Logistica",
    url: "https://www.delucru.md/jobs/logistics-warehouse-work-administration",
    selector: ".job-item",
  },
  {
    key: "jobber",
    name: "Jobber.md",
    sourceTier: "secondary",
    sector: "General operational",
    url: "https://jobber.md/en/jobs/",
    selector: "a[href*='/job/']",
  },
  {
    key: "999",
    name: "999.md",
    sourceTier: "secondary",
    sector: "Productie",
    url: "https://999.md/ro/list/work/production-workers",
    selector: "a[href*='/ro/']",
  },
  {
    key: "999",
    name: "999.md",
    sourceTier: "secondary",
    sector: "Constructii",
    url: "https://999.md/ro/list/work/bricklayer-finisher",
    selector: "a[href*='/ro/']",
  },
  {
    key: "999",
    name: "999.md",
    sourceTier: "secondary",
    sector: "Depozitare / Logistica",
    url: "https://999.md/ro/list/work/loader",
    selector: "a[href*='/ro/']",
  },
];

const DISABLED_JOB_SOURCES = [
  {
    name: "Joblist.md",
    reason: "Platforma afiseaza ca nu este disponibila si trimite utilizatorii spre 999.md.",
  },
];

const DETAIL_FETCH_TIMEOUT_MS = 12000;
const JOB_DETAIL_LIMIT = 80;
const DETAIL_FETCH_CONCURRENCY = 8;
const TENDER_WATCHLIST_LIMIT = 20;
const TENDER_MIN_VALUE_MDL = Number(
  process.env.MARKET_RADAR_TENDER_MIN_VALUE_MDL
  || process.env.PREDATOR_TENDER_MIN_VALUE_MDL
  || 1_500_000
);

const TENDER_SOURCES = [
  {
    name: "Achizitii.md",
    sourceTier: "primary",
    tenderKind: "active",
    url: "https://achizitii.md/en/public/tender/list?status=active.clarification&status=active.tendering",
  },
  {
    name: "Achizitii.md",
    sourceTier: "primary",
    tenderKind: "active",
    url: "https://achizitii.md/en/public/tender/list",
  },
  {
    name: "Achizitii.md",
    sourceTier: "secondary",
    tenderKind: "awarded",
    url: "https://achizitii.md/en/public/tender/list?status=complete",
  },
  {
    name: "Achizitii.md",
    sourceTier: "secondary",
    tenderKind: "awarded",
    url: "https://achizitii.md/en/public/tender/list?status=active.awarded",
  },
];

const JOBSEEKER_EXCLUDE = [
  "caut de lucru",
  "caut lucru",
  "caut un loc",
  "caut serviciu",
  "imi caut",
  "îmi caut",
  "disponibil pentru",
  "ma ofer",
  "mă ofer",
  "ofer servicii",
  "looking for work",
];

const LOW_FIT_EXCLUDE = [
  "director",
  "intern",
  "junior",
  "stagiar",
  "manager",
  "manager vanzari",
  "manager vânzări",
  "manager vinzari",
  "agent vanzari",
  "agent vânzări",
  "consultant vanzari",
  "consultant vânzări",
  "casier",
  "contabil",
  "diriginte",
  "devizier",
  "inginer",
  "desenator",
  "autocad",
  "revit",
  "proiectant",
  "arhitect",
  "arhitectura",
  "arhitectură",
  "jurist",
  "programator",
  "developer",
  "designer",
  "marketing",
  "copywriter",
  "germania",
  "peste hotare",
  "abroad",
  "romania",
  "românia",
  "polonia",
  "cehia",
  "franta",
  "franța",
  "italia",
  "olanda",
  "europa",
  "israel",
  "taxi",
  "yandex",
];

const INTERMEDIARY_EXCLUDE = [
  "easy hire",
  "hr consulting",
  "hr-consulting",
  "hr consultinglab",
  "consultinglab",
  "recrutare",
  "recruitment",
  "agentie de recrutare",
  "agenție de recrutare",
  "staffing agency",
  "employment agency",
  "кадровое агентство",
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
  "peste file",
  "pește file",
  "biscuiti",
  "biscuiți",
  "paste fainoase",
  "paste făinoase",
  "medicament",
  "materiale de sutura",
  "materiale de sutură",
  "articole parafarmaceutice",
  "seringi",
  "uniforme",
  "accesorii de ceremonie",
  "echipamente it",
  "software",
  "mobilier",
  "furnizare bunuri",
  "rechizite",
  "consumabile",
  "echipament medical",
  "echipamentul medical",
  "piese pentru echipament",
  "piese pentru echipamentul",
  "materiale de constructie",
  "materiale de construcție",
  "alimentator",
  "hranire",
  "hrănire",
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
];

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

const INVALID_COMPANY_NAMES = [
  "img",
  "logo",
  "image",
  "rabota",
  "lucru",
  "delucru",
  "jobber",
  "companie necunoscuta",
  "unknown",
];

const SOURCE_SCORE_ADJUSTMENT = {
  primary: 0,
  secondary: -6,
};

const SECTOR_KEYWORDS = [
  {
    sector: "Constructii",
    priority: "P1",
    words: [
      "construct",
      "lucrari",
      "lucrări",
      "santier",
      "șantier",
      "zidar",
      "beton",
      "finisor",
      "dulgher",
      "tencuit",
      "vopsitor",
      "montator",
      "electrician",
      "instalator",
      "reparatie",
      "reparație",
      "drum",
      "trotuar",
      "pavaj",
      "pavar",
      "infrastruct",
    ],
  },
  {
    sector: "Productie",
    priority: "P1",
    words: [
      "productie",
      "producție",
      "fabrica",
      "fabrică",
      "operator",
      "ambalator",
      "sortator",
      "sudor",
      "lacatus",
      "lăcătuș",
      "cusator",
      "alimentar",
      "industrie",
      "utilaj",
      "linie",
    ],
  },
  {
    sector: "Depozitare / Logistica",
    priority: "P1",
    words: [
      "depozit",
      "logistic",
      "hamal",
      "magazioner",
      "stivuitor",
      "incarcator",
      "încărcător",
      "livrare",
      "curier",
      "transport",
      "sofer",
      "șofer",
    ],
  },
  {
    sector: "Agricultura",
    priority: "P2",
    words: ["agricol", "agricultura", "agricultură", "fermier", "agronom", "sezon", "culegator", "culegător"],
  },
  {
    sector: "HoReCa / Retail operational",
    priority: "P2",
    words: ["horeca", "restaurant", "bucatar", "bucătar", "ospatar", "ospătar", "retail", "casier", "vanzator", "vânzător"],
  },
];

const URGENCY_KEYWORDS = [
  "urgent",
  "imediat",
  "azi",
  "acum",
  "permanent",
  "schimb",
  "tura",
  "tură",
  "noapte",
  "weekend",
  "full-time",
];

const VOLUME_KEYWORDS = [
  "muncitori",
  "lucratori",
  "lucrători",
  "echipa",
  "echipă",
  "personal",
  "mai multi",
  "mai mulți",
  "posturi",
  "angajam",
  "angajăm",
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const body = readFileSync(filePath, "utf8");
  body.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function loadLocalEnv() {
  [path.join(ROOT_DIR, ".env.local"), path.join(ROOT_DIR, ".env")].forEach(loadEnvFile);
}

function parseArgs(argv = []) {
  const args = {
    jobs: true,
    tenders: true,
    telegram: true,
    airtable: true,
    limit: 120,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--jobs-only") {
      args.jobs = true;
      args.tenders = false;
    } else if (token === "--tenders-only") {
      args.jobs = false;
      args.tenders = true;
    } else if (token === "--no-telegram") {
      args.telegram = false;
    } else if (token === "--no-airtable") {
      args.airtable = false;
    } else if (token === "--dry-run") {
      args.telegram = false;
      args.airtable = false;
    } else if (token === "--limit") {
      args.limit = Number(argv[index + 1]) || args.limit;
      index += 1;
    } else if (token.startsWith("--limit=")) {
      args.limit = Number(token.slice("--limit=".length)) || args.limit;
    }
  }

  return args;
}

function fold(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeCompanyKey(value = "") {
  return fold(value)
    .replace(/\b(s\.?r\.?l\.?|srl|sa|s\.?a\.?|ii|i\.?i\.?|ics|i\.?c\.?s\.?)\b/g, " ")
    .replace(/\b(compania|company|firma|fabrica|fabrică)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitleKey(value = "") {
  return fold(value)
    .replace(/\b(salariu|salariul|lei|mdl|euro|eur|net|brut|de la|pana la|până la)\b/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTokenKeyword(text = "", keywords = []) {
  const foldedText = fold(text);
  return keywords.some((keyword) => {
    const foldedKeyword = fold(keyword);
    if (!foldedKeyword) return false;
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(foldedKeyword)}([^a-z0-9]|$)`, "i").test(foldedText);
  });
}

function absoluteUrl(url = "", baseUrl = "") {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

async function mapWithConcurrency(items = [], concurrency = 6, mapper = async () => {}) {
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += concurrency) {
      await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function fetchText(url, headers = {}, timeoutMs = DETAIL_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) return "";
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function numberFromText(value = "") {
  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .match(/\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : 0;
}

function moneyFromText(value = "") {
  const text = String(value).replace(/\s+/g, " ");
  const match = text.match(/(\d[\d\s.,]*)\s*(?:MDL|lei|L)/i);
  if (!match) return 0;
  return Number(match[1].replace(/\s+/g, "").replace(",", ".")) || 0;
}

function extractYear(value = "") {
  const match = String(value).match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

function isStaleSignal(signal) {
  const year = extractYear(`${signal.postedAt} ${signal.deadline}`);
  if (!year) return false;
  return year < new Date().getFullYear() - 1;
}

function buildSignalKey(signal) {
  if (signal.type === "job") {
    const company = normalizeCompanyKey(signal.company || "");
    if (signal.signalKind === "company_job_demand" && company) return `job-company:${company}`;
    const title = normalizeTitleKey(signal.title || "");
    if (company && title) return `job:${company}:${title}`;
  }

  const tenderId = String(signal.url || "").match(/\/public\/tender\/(\d+)\//)?.[1];
  if (tenderId) {
    return signal.signalKind === "awarded_tender"
      ? `awarded-tender:${tenderId}:${normalizeCompanyKey(signal.winner || signal.company || "")}`
      : `tender:${tenderId}`;
  }

  return signal.url || `${signal.source}:${fold(signal.company || signal.buyer)}:${fold(signal.title)}`;
}

function isRelevantJob(signal) {
  const text = fold(`${signal.title} ${signal.company} ${signal.snippet}`);
  if (!signal.title || signal.title.length < 4) return false;
  if (JOBSEEKER_EXCLUDE.some((keyword) => text.includes(fold(keyword)))) return false;
  if (LOW_FIT_EXCLUDE.some((keyword) => text.includes(fold(keyword)))) return false;
  if (INTERMEDIARY_EXCLUDE.some((keyword) => text.includes(fold(keyword)))) return false;
  return SECTOR_KEYWORDS.some((group) => group.words.some((word) => text.includes(fold(word))));
}

function isUsefulCompanyName(value = "") {
  const normalized = normalizeCompanyKey(value);
  if (!normalized || normalized.length < 2) return false;
  return !INVALID_COMPANY_NAMES.includes(normalized);
}

function isRelevantTender(signal) {
  if (!signal.title || signal.title.length < 4) return false;
  if (!signal.winner) return false;
  const value = signal.awardedValueMdl || signal.estimatedValueMdl || 0;
  if (value < TENDER_MIN_VALUE_MDL) return false;
  const text = fold(`${signal.title} ${signal.company} ${signal.buyer} ${signal.cpv} ${signal.lotsDetail} ${signal.snippet}`);
  if (TENDER_EXCLUDE.some((keyword) => text.includes(fold(keyword)))) return false;
  if (/\b45\d{6}-\d\b/.test(text)) return true;
  return TENDER_INCLUDE.some((keyword) => text.includes(fold(keyword)));
}

function isTenderWatch(signal) {
  return signal.type === "tender" && !signal.winner;
}

function isContactableSignal(signal) {
  if (signal.type === "job") return isUsefulCompanyName(signal.company);
  if (signal.type === "tender") return Boolean(signal.winner);
  return false;
}

function inferSector(signal) {
  const sourceSector = fold(signal.sector);
  if (sourceSector.includes("constructii")) return SECTOR_KEYWORDS[0];
  if (sourceSector.includes("productie")) return SECTOR_KEYWORDS[1];
  if (sourceSector.includes("depozitare") || sourceSector.includes("logistica")) return SECTOR_KEYWORDS[2];
  if (sourceSector.includes("agricultura")) return SECTOR_KEYWORDS[3];
  const text = fold(`${signal.sector} ${signal.title} ${signal.company} ${signal.snippet}`);
  const match = SECTOR_KEYWORDS.find((group) => group.words.some((word) => text.includes(fold(word))));
  return match || { sector: signal.sector || "Operational", priority: "P3", words: [] };
}

function buildReasons(signal, companySignalCount = 1) {
  const text = fold(`${signal.title} ${signal.company} ${signal.snippet}`);
  const reasons = [];
  const sectorMatch = inferSector(signal);
  const jobDemandCount = signal.jobCount || companySignalCount;
  reasons.push(`Sector ${sectorMatch.sector}`);

  if (signal.type === "job" && jobDemandCount > 1) reasons.push(`${jobDemandCount} joburi active vazute pentru companie`);
  else if (companySignalCount >= 3) reasons.push(`${companySignalCount} semnale active pentru aceeasi companie`);
  if (signal.sourceTier === "secondary") reasons.push("sursa secundara - necesita verificare");
  if (hasTokenKeyword(text, URGENCY_KEYWORDS)) reasons.push("limbaj de urgenta / lucru in ture");
  if (hasTokenKeyword(text, VOLUME_KEYWORDS)) reasons.push("semnal de volum operational");
  if (signal.winner) reasons.push(`castigator: ${signal.winner}`);
  if (isTenderWatch(signal)) reasons.push("watchlist: contacteaza doar dupa atribuirea castigatorului");
  if (signal.type === "tender" && signal.estimatedValueMdl >= 1_000_000) {
    reasons.push(`tender mare: ${formatMdl(signal.estimatedValueMdl)}`);
  }
  if (signal.cpv) reasons.push(`CPV: ${signal.cpv.split(" - ")[0]}`);
  if (signal.lots && signal.lots > 1) reasons.push(`${signal.lots} loturi`);
  if (signal.deadline) reasons.push(`termen: ${signal.deadline}`);
  if (signal.contact) reasons.push("date publice de contact disponibile");

  return reasons.slice(0, 5);
}

function scoreSignal(signal, companySignalCount = 1) {
  const text = fold(`${signal.title} ${signal.company} ${signal.snippet}`);
  const sectorMatch = inferSector(signal);
  const jobDemandCount = signal.jobCount || companySignalCount;
  let score = 0;

  score += sectorMatch.priority === "P1" ? 25 : 15;

  if (signal.type === "job") {
    score += Math.min(25, 10 + jobDemandCount * 5);
    if (hasTokenKeyword(text, VOLUME_KEYWORDS)) score += 8;
    if (!signal.company && signal.source === "999.md") score -= 12;
  } else if (signal.type === "tender") {
    if (signal.estimatedValueMdl >= 5_000_000) score += 25;
    else if (signal.estimatedValueMdl >= 1_000_000) score += 20;
    else if (signal.estimatedValueMdl >= 300_000) score += 12;
    else score += 5;
    if (signal.lots > 1) score += Math.min(8, signal.lots * 2);
    if (signal.winner) score += isStaleSignal(signal) ? 4 : 16;
  }

  score += SOURCE_SCORE_ADJUSTMENT[signal.sourceTier] || 0;
  if (hasTokenKeyword(text, URGENCY_KEYWORDS)) score += 12;
  if (signal.postedAt && fold(signal.postedAt).includes("azi")) score += 8;
  if (signal.company) score += 8;
  if (signal.url) score += 4;
  if (signal.contact) score += 5;
  if (isStaleSignal(signal)) score -= 28;
  if (isTenderWatch(signal)) score = Math.min(score, 34);

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    priority: score >= 75 ? "P1" : score >= 55 ? "P2" : score >= 35 ? "P3" : "Watch",
    reasons: buildReasons(signal, companySignalCount),
  };
}

function buildOutreachAngle(signal) {
  if (signal.type === "tender") {
    if (signal.winner) {
      const value = signal.awardedValueMdl || signal.estimatedValueMdl;
      return `Abordare: ${signal.winner} a castigat un tender${value ? ` de ${formatMdl(value)}` : ""}; verifica volumul de executie si propune echipe operationale pentru livrare predictibila.`;
    }
    return "Monitorizeaza licitatia si identifica operatorul economic castigator; dupa atribuire, abordeaza-l pe tema capacitatii de executie si a echipelor operationale.";
  }

  const sector = inferSector(signal).sector;
  if (signal.jobCount && signal.jobCount > 1) {
    return `Abordare: am vazut ${signal.jobCount} joburi active la ${signal.company} in zona ${sector.toLowerCase()}; intrebarea buna este daca lipsa de personal poate bloca productia/proiectele in urmatoarele 60 de zile.`;
  }
  return `Abordare: vad ca recrutati pentru ${sector.toLowerCase()}; intrebarea buna este daca lipsa de personal va poate bloca productia/proiectele in urmatoarele 60 de zile.`;
}

function dedupeSignals(signals = []) {
  const seen = new Set();
  return signals.filter((signal) => {
    const key = buildSignalKey(signal);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseJsonLdBlocks(html = "") {
  const blocks = [...String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap((match) => {
    try {
      const parsed = JSON.parse(match[1].trim());
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function findJobPosting(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload["@type"] === "JobPosting") return payload;
  if (Array.isArray(payload["@graph"])) {
    return payload["@graph"].find((item) => item?.["@type"] === "JobPosting") || null;
  }
  return null;
}

function enrichFromJobPostingHtml(signal, html = "") {
  const organizationName = html.match(/"hiringOrganization"\s*:\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/i)?.[1]
    || html.match(/"identifier"\s*:\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/i)?.[1]
    || "";
  const datePosted = html.match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1] || "";
  const validThrough = html.match(/"validThrough"\s*:\s*"([^"]+)"/i)?.[1] || "";
  const description = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1] || "";

  signal.company = signal.company || cleanText(organizationName.replace(/&quot;/g, "\""));
  signal.postedAt = signal.postedAt || cleanText(datePosted);
  signal.deadline = signal.deadline || cleanText(validThrough);
  if (description) signal.snippet = cleanText(`${signal.snippet} ${stripHtml(description)}`).slice(0, 900);
}

async function enrichJobDetails(signals = []) {
  const detailCandidates = signals.filter((signal) => (
    signal.type === "job"
    && signal.url
    && signal.source !== "999.md"
    && (!signal.company || !signal.snippet || signal.snippet.length < 180)
  )).slice(0, JOB_DETAIL_LIMIT);

  await mapWithConcurrency(detailCandidates, DETAIL_FETCH_CONCURRENCY, async (signal) => {
    try {
      const html = await fetchText(
        signal.url,
        {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
          "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
        },
      );
      if (!html) return;
      const posting = parseJsonLdBlocks(html).map(findJobPosting).find(Boolean);
      if (!posting) {
        enrichFromJobPostingHtml(signal, html);
        return;
      }

      signal.company = signal.company || cleanText(posting.hiringOrganization?.name || "");
      signal.postedAt = signal.postedAt || cleanText(posting.datePosted || "");
      signal.deadline = signal.deadline || cleanText(posting.validThrough || "");
      signal.location = signal.location || cleanText(posting.jobLocation?.address?.addressLocality || posting.jobLocation?.address?.streetAddress || "");
      signal.snippet = cleanText(`${signal.snippet} ${stripHtml(posting.description || "")}`).slice(0, 900);
    } catch (error) {
      console.warn(`detail:${signal.source}:${signal.url} failed: ${error.message}`);
    }
  });

  return signals;
}

function uniqueCleanValues(values = []) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function formatJobDemandTitle(jobCount, jobTitles = []) {
  const noun = jobCount === 1 ? "job activ" : "joburi active";
  return `${jobCount} ${noun}: ${jobTitles.slice(0, 4).join("; ")}`;
}

function aggregateJobSignalsByCompany(signals = []) {
  const groups = new Map();
  const passthrough = [];

  for (const signal of signals) {
    if (signal.type !== "job") {
      passthrough.push(signal);
      continue;
    }

    if (!isUsefulCompanyName(signal.company)) continue;

    const key = normalizeCompanyKey(signal.company);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(signal);
  }

  const aggregatedJobs = [...groups.values()].map((items) => {
    const primary = [...items].sort((left, right) => {
      const leftScore = (hasTokenKeyword(`${left.title} ${left.snippet}`, VOLUME_KEYWORDS) ? 2 : 0)
        + (hasTokenKeyword(`${left.title} ${left.snippet}`, URGENCY_KEYWORDS) ? 1 : 0);
      const rightScore = (hasTokenKeyword(`${right.title} ${right.snippet}`, VOLUME_KEYWORDS) ? 2 : 0)
        + (hasTokenKeyword(`${right.title} ${right.snippet}`, URGENCY_KEYWORDS) ? 1 : 0);
      return rightScore - leftScore;
    })[0];
    const jobTitles = uniqueCleanValues(items.map((item) => item.title)).slice(0, 12);
    const evidenceUrls = uniqueCleanValues(items.map((item) => item.url)).slice(0, 12);
    const sources = uniqueCleanValues(items.map((item) => item.source));
    const sectors = uniqueCleanValues(items.map((item) => inferSector(item).sector));

    return {
      ...primary,
      signalKind: "company_job_demand",
      source: sources.join(", "),
      sourceTier: items.some((item) => item.sourceTier === "primary") ? "primary" : "secondary",
      sector: sectors[0] || primary.sector,
      title: formatJobDemandTitle(items.length, jobTitles),
      jobCount: items.length,
      jobTitles,
      evidenceUrls,
      snippet: `Joburi vazute: ${jobTitles.join("; ")}. Surse: ${sources.join(", ")}.`,
      url: evidenceUrls[0] || primary.url,
    };
  });

  return [...aggregatedJobs, ...passthrough];
}

function countByCompany(signals = []) {
  const counts = new Map();
  signals.forEach((signal) => {
    const company = cleanText(signal.targetCompany || signal.company || signal.buyer || "");
    if (!company) return;
    const key = normalizeCompanyKey(company);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function enrichSignals(signals = []) {
  const companyCounts = countByCompany(signals);
  return signals.map((signal) => {
    const company = cleanText(signal.targetCompany || signal.company || signal.buyer || "");
    const count = company ? (companyCounts.get(normalizeCompanyKey(company)) || 1) : 1;
    const scoring = scoreSignal(signal, count);
    return {
      ...signal,
      companySignalCount: count,
      score: scoring.score,
      priority: scoring.priority,
      reasons: scoring.reasons,
      outreachAngle: buildOutreachAngle(signal),
      scrapedAt: new Date().toISOString(),
    };
  }).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "ro"));
}

function selectFinalSignals(signals = [], limit = 120) {
  const watchLimit = Math.min(TENDER_WATCHLIST_LIMIT, Math.max(0, Math.floor(limit / 4)));
  const tenderWatch = signals.filter(isTenderWatch).slice(0, watchLimit);
  const watchKeys = new Set(tenderWatch.map(buildSignalKey));
  const contactable = signals.filter((signal) => (
    isContactableSignal(signal) && !watchKeys.has(buildSignalKey(signal))
  ));

  return [
    ...contactable.slice(0, Math.max(0, limit - tenderWatch.length)),
    ...tenderWatch,
  ].sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "ro"));
}

async function scrapeDelucru(page, source) {
  await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);

  return page.$$eval(source.selector, (items, sourcePayload) => items.map((item) => {
    const link = item.querySelector("a.link-job, a[href*='/job/']");
    const img = item.querySelector("img[alt]");
    const date = item.querySelector(".job-date")?.textContent || "";
    const options = item.querySelector(".job-options")?.textContent || "";
    return {
      type: "job",
      source: sourcePayload.name,
      sourceTier: sourcePayload.sourceTier,
      sector: sourcePayload.sector,
      title: link?.textContent?.trim() || "",
      company: img?.getAttribute("alt")?.trim() || "",
      url: link?.href || "",
      postedAt: date.trim(),
      location: options.trim(),
      snippet: item.textContent.trim().slice(0, 500),
    };
  }), source).then((items) => items.filter(isRelevantJob));
}

async function scrapeGenericJobs(page, source) {
  await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(source.key === "999" ? 2500 : 1500);

  return page.$$eval(source.selector, (anchors, sourcePayload) => {
    const seen = new Set();
    return anchors.map((anchor) => {
      const href = anchor.href || "";
      const title = anchor.textContent?.trim() || anchor.getAttribute("title") || "";
      const card = anchor.closest("article, li, .job-item, [class*='item'], [class*='card'], [class*='listing']") || anchor.parentElement;
      const img = card?.querySelector("img[alt]");
      const text = card?.textContent?.trim() || title;
      const companyLink = card?.querySelector("a[href*='/companies/'], a[href*='/companii/'], a[href*='/company/']");
      const company = img?.getAttribute("alt")?.trim() || companyLink?.textContent?.trim() || "";

      return {
        type: "job",
        source: sourcePayload.name,
        sourceTier: sourcePayload.sourceTier,
        sector: sourcePayload.sector,
        title,
        company,
        url: href,
        postedAt: text.match(/(Publicat azi|azi|ieri|\d{1,2}\.\d{1,2}\.\d{4})/i)?.[0] || "",
        location: text.match(/(Chișinău|Chisinau|Bălți|Balti|Cahul|Ungheni|Orhei|Anenii Noi)/i)?.[0] || "",
        snippet: text.slice(0, 500),
      };
    }).filter((item) => {
      if (!item.url || !item.title || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, source).then((items) => items.filter((item) => {
    if (source.key === "rabota" && item.url.replace(/;$/, "") === source.url.replace(/;$/, "")) return false;
    if (source.key === "lucru" && item.url.replace(/;$/, "") === source.url.replace(/;$/, "")) return false;
    if (source.key === "999" && !item.url.includes("/ro/")) return false;
    return isRelevantJob(item);
  }));
}

async function scrapeJobs(page, limit) {
  const signals = [];
  for (const source of JOB_SOURCES) {
    try {
      const items = source.key === "delucru"
        ? await scrapeDelucru(page, source)
        : await scrapeGenericJobs(page, source);
      signals.push(...items.slice(0, Math.ceil(limit / 2)));
      console.log(`jobs:${source.name}:${source.sector} -> ${items.length}`);
    } catch (error) {
      console.warn(`jobs:${source.name}:${source.sector} failed: ${error.message}`);
    }
  }
  return signals;
}

function htmlToText(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMatch(matchValue = "") {
  return cleanText(String(matchValue).replace(/\s+/g, " "));
}

function compactLastMatch(text = "", regex, maxLength = 120) {
  const matches = [...String(text).matchAll(regex)]
    .map((match) => cleanMatch(match[1]))
    .filter(Boolean)
    .filter((value) => value.length <= maxLength);
  return matches.at(-1) || "";
}

function extractTenderDetailsFromText(text = "") {
  const cpv = text.match(/\bCPV\s+(\d{8}-\d\s*-\s*.+?)(?:\s+Type of procedure|\s+Award criteria|\s+Funding sources|\s+List of lots|\s+List of positions|\s+Documents|\s+Subscribe|$)/i)?.[1] || "";
  const procedureType = compactLastMatch(
    text,
    /Type of procedure\s+(.+?)(?:\s+Award criteria|\s+Estimated value|\s+The minimum|\s+Date of last|\s+Funding sources|\s+List of lots|\s+List of positions|$)/gi,
  );
  const awardCriteria = text.match(/Award criteria\s+(.+?)(?:\s+Funding sources|\s+List of lots|\s+Documents|\s+Description|$)/i)?.[1] || "";
  const status = text.match(/\bStatus\s+(.+?)(?:\s+Estimated value|\s+Period of clarifications|\s+Description|$)/i)?.[1] || "";
  const winner = text.match(/\bWinner:\s*(.+?)\s+Cost:/i)?.[1] || "";
  const awardedValue = text.match(/\bCost:\s*([\d\s.,]+)\s*MDL/i)?.[1] || "";
  const participants = text.match(/\bOf participants:\s*(\d+)/i)?.[1] || "";

  const lotMatches = [...text.matchAll(/(?:Lot nr\.\s*\d+\s*-\s*|Of the lot\s+)(.+?)\s+Budget:\s*([\d\s.,]+)\s*MDL\s+(.+?)(?=\s+Go to lot|\s+Lot nr\.|\s+Of the lot|\s+Documents|\s+Question|$)/gi)]
    .slice(0, 8)
    .map((match) => `${cleanMatch(match[1]).slice(0, 90)} (${formatMdl(moneyFromText(`${match[2]} MDL`))}; ${cleanMatch(match[3]).slice(0, 40)})`);

  return {
    cpv: cleanMatch(cpv),
    procedureType: cleanMatch(procedureType),
    awardCriteria: cleanMatch(awardCriteria),
    awardStatus: cleanMatch(status),
    winner: cleanMatch(winner),
    awardedValueMdl: moneyFromText(`${awardedValue} MDL`),
    participants: Number(participants) || 0,
    lotsDetail: lotMatches.join("; "),
  };
}

async function enrichTenderDetails(signals = []) {
  const candidates = signals.filter((item) => item.type === "tender" && item.url);
  await mapWithConcurrency(candidates, DETAIL_FETCH_CONCURRENCY, async (signal) => {
    try {
      const html = await fetchText(
        signal.url,
        {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9,ro;q=0.8",
        },
      );
      if (!html) return;

      const text = htmlToText(html);
      const details = extractTenderDetailsFromText(text);
      const winner = details.winner || signal.winner || "";
      const awardedValueMdl = details.awardedValueMdl || signal.awardedValueMdl || 0;

      signal.cpv = details.cpv || signal.cpv || "";
      signal.procedureType = details.procedureType || signal.procedureType || "";
      signal.awardCriteria = details.awardCriteria || signal.awardCriteria || "";
      signal.awardStatus = details.awardStatus || signal.awardStatus || signal.status || "";
      signal.awardedValueMdl = awardedValueMdl;
      signal.participants = details.participants || signal.participants || 0;
      signal.lotsDetail = details.lotsDetail || signal.lotsDetail || "";

      if (winner) {
        signal.originalBuyer = signal.buyer || signal.originalBuyer || "";
        signal.originalTitle = signal.originalTitle || signal.title;
        signal.winner = winner;
        signal.targetCompany = winner;
        signal.company = winner;
        signal.signalKind = "awarded_tender";
        signal.title = `A castigat tender: ${signal.originalTitle}`;
      }
    } catch (error) {
      console.warn(`tender-detail:${signal.url} failed: ${error.message}`);
    }
  });

  return signals;
}

async function scrapeTenders(page, limit) {
  const signals = [];
  for (const source of TENDER_SOURCES) {
    try {
      await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(1000);
      const items = await page.$$eval(".tender__list__item", (cards, sourcePayload) => cards.map((card) => {
        const titleLink = card.querySelector(".tender__list__item__title a[href*='/public/tender/']");
        const buyer = card.querySelector(".tender__list__item__client__name")?.textContent?.trim() || "";
        const priceText = card.querySelector(".tender__list__item__price")?.textContent?.trim() || "";
        const status = card.querySelector(".tender__list__item__info__status")?.textContent?.trim() || "";
        const dates = [...card.querySelectorAll(".tender__list__item__info__date span")].map((el) => el.textContent.trim());
        const lotsText = card.textContent.match(/Lots:\s*\((\d+)\)/i)?.[1] || "";
        const phone = card.textContent.match(/Contact phone:\s*([\d+\s().-]+)/i)?.[1]?.trim() || "";
        const email = card.querySelector("a[href^='mailto:']")?.textContent?.trim() || "";
        const winner = card.textContent.match(/Winner:\s*(.+?)\s+Cost:/i)?.[1]?.trim() || "";
        const awardedValueText = card.textContent.match(/Cost:\s*([\d\s.,]+)\s*MDL/i)?.[1] || "";

        return {
          type: "tender",
          source: sourcePayload.name,
          sourceTier: sourcePayload.sourceTier,
          tenderKind: sourcePayload.tenderKind,
          signalKind: winner ? "awarded_tender" : "tender_watch",
          sector: "Tender operational",
          title: titleLink?.textContent?.trim() || "",
          company: winner || buyer,
          buyer,
          winner,
          targetCompany: winner || "",
          url: titleLink?.href || new URL(titleLink?.getAttribute("href") || "", sourcePayload.url).toString(),
          status,
          deadline: dates[0] || "",
          postedAt: dates[dates.length - 1] || "",
          lots: Number(lotsText) || 0,
          priceText,
          awardedValueText,
          contact: [phone, email].filter(Boolean).join(" | "),
          snippet: card.textContent.trim().slice(0, 700),
        };
      }), source);

      signals.push(...items.map((item) => ({
        ...item,
        estimatedValueMdl: moneyFromText(item.priceText),
        awardedValueMdl: moneyFromText(`${item.awardedValueText} MDL`),
      })));
      console.log(`tenders:${source.name}:${source.tenderKind} -> ${items.length}`);
    } catch (error) {
      console.warn(`tenders:${source.name}:${source.tenderKind} failed: ${error.message}`);
    }
  }
  return enrichTenderDetails(dedupeSignals(signals).slice(0, Math.max(limit, 80)));
}

function formatMdl(value = 0) {
  if (!value) return "";
  return `${Math.round(value).toLocaleString("ro-MD")} MDL`;
}

function formatSignalLine(signal, index) {
  const value = (signal.awardedValueMdl || signal.estimatedValueMdl)
    ? ` | ${formatMdl(signal.awardedValueMdl || signal.estimatedValueMdl)}`
    : "";
  const company = signal.targetCompany || signal.company || signal.buyer || "Companie necunoscuta";
  return `${index + 1}. [${signal.priority}/${signal.score}] ${company} - ${signal.title}${value}`;
}

function renderMarkdown(signals = [], meta = {}) {
  const top = signals.filter(isContactableSignal).slice(0, 20);
  const tenderWatchlist = signals.filter(isTenderWatch).slice(0, 20);
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Grow Market Radar - ${date}`,
    "",
    `Run: ${meta.runId}`,
    `Total signals: ${signals.length}`,
    meta.disabledSources?.length ? `Disabled sources: ${meta.disabledSources.map((source) => `${source.name} (${source.reason})`).join("; ")}` : "",
    "",
    "## Top Opportunities",
    "",
    ...top.flatMap((signal, index) => [
      `### ${formatSignalLine(signal, index)}`,
      "",
      `- Type: ${signal.type}`,
      `- Signal kind: ${signal.signalKind || signal.type}`,
      `- Source: ${signal.source}`,
      `- Source tier: ${signal.sourceTier || "primary"}`,
      `- Sector: ${inferSector(signal).sector}`,
      signal.jobCount ? `- Joburi vazute: ${signal.jobCount}` : "",
      signal.jobTitles?.length ? `- Roluri: ${signal.jobTitles.join("; ")}` : "",
      signal.evidenceUrls?.length ? `- Evidence URLs: ${signal.evidenceUrls.join(" | ")}` : "",
      signal.buyer ? `- Buyer: ${signal.buyer}` : "",
      signal.winner ? `- Winner: ${signal.winner}` : "",
      signal.cpv ? `- CPV: ${signal.cpv}` : "",
      signal.lotsDetail ? `- Lots: ${signal.lotsDetail}` : "",
      `- Reasons: ${signal.reasons.join("; ")}`,
      `- Outreach angle: ${signal.outreachAngle}`,
      `- URL: ${signal.url}`,
      "",
    ].filter(Boolean)),
    "## Tender Watchlist",
    "",
    "Acestea nu sunt lead-uri de contactat inca. Se urmaresc pana apare castigatorul.",
    "",
    ...tenderWatchlist.flatMap((signal, index) => [
      `### ${formatSignalLine(signal, index)}`,
      "",
      `- Buyer: ${signal.buyer || signal.company || "Nespecificat"}`,
      signal.cpv ? `- CPV: ${signal.cpv}` : "",
      signal.lotsDetail ? `- Lots: ${signal.lotsDetail}` : "",
      `- Reasons: ${signal.reasons.join("; ")}`,
      `- URL: ${signal.url}`,
      "",
    ].filter(Boolean)),
    "## All Signals",
    "",
    ...signals.map((signal, index) => `- ${formatSignalLine(signal, index)} - ${signal.url}`),
    "",
  ];
  return lines.join("\n");
}

function renderTelegram(signals = []) {
  const top = signals.filter((signal) => isContactableSignal(signal) && signal.score >= 55).slice(0, 10);
  if (!top.length) {
    return "Grow Market Radar: nu am gasit semnale P1/P2 noi in rularea curenta.";
  }

  return [
    "<b>Grow Market Radar - top oportunitati</b>",
    "",
    ...top.flatMap((signal, index) => [
      `${index + 1}. <b>${escapeHtml(signal.targetCompany || signal.company || signal.buyer || "Companie necunoscuta")}</b> (${signal.priority}/${signal.score})`,
      escapeHtml(signal.title),
      signal.jobCount ? `Joburi vazute: ${signal.jobCount}` : "",
      signal.buyer && signal.winner ? `Buyer: ${escapeHtml(signal.buyer)}` : "",
      (signal.awardedValueMdl || signal.estimatedValueMdl) ? `Valoare: ${escapeHtml(formatMdl(signal.awardedValueMdl || signal.estimatedValueMdl))}` : "",
      `Motiv: ${escapeHtml(signal.reasons.slice(0, 3).join("; "))}`,
      signal.url,
      "",
    ]),
  ].filter(Boolean).join("\n");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function airtableRequest(table, method, body, params = new URLSearchParams()) {
  const token = process.env.AIRTABLE_MARKET_TOKEN || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_MARKET_BASE_ID || process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) throw new Error("Airtable env lipseste");
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params.toString()}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable ${response.status}: ${details}`);
  }

  return response.json();
}

async function createAirtableRecords(table, records) {
  let current = { records: records.map((fields) => ({ fields })) };
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await airtableRequest(table, "POST", current);
    } catch (error) {
      const unknownField = extractAirtableUnknownField(error);
      if (!unknownField) throw error;
      current = JSON.parse(JSON.stringify(current));
      current.records.forEach((record) => {
        delete record.fields[unknownField];
      });
      console.warn(`airtable:${table}: camp necunoscut ignorat: ${unknownField}`);
    }
  }
  throw new Error("Prea multe campuri necunoscute in Airtable");
}

function extractAirtableUnknownField(error) {
  const message = String(error?.message || "");
  const jsonBody = message.match(/Airtable \d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (jsonBody) {
    try {
      const parsed = JSON.parse(jsonBody);
      return parsed?.error?.message?.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] || "";
    } catch {
      // Fall through to text parsing.
    }
  }
  return message.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] || "";
}

async function listExistingSignalKeys(table) {
  const keys = new Set();
  let offset = "";

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    params.append("fields[]", "Signal Key");
    if (offset) params.set("offset", offset);
    const payload = await airtableRequest(table, "GET", null, params);
    for (const record of payload.records || []) {
      const key = cleanText(record.fields?.["Signal Key"] || "");
      if (key) keys.add(key);
    }
    offset = payload.offset || "";
  } while (offset);

  return keys;
}

function signalToAirtableFields(signal) {
  return {
    "Signal Key": buildSignalKey(signal),
    "Duplicate Group Key": buildSignalKey(signal),
    "Type": signal.type,
    "Signal Kind": signal.signalKind || signal.type,
    "Source": signal.source,
    "Source Tier": signal.sourceTier || "primary",
    "Company": signal.targetCompany || signal.company || signal.buyer,
    "Target Company": signal.targetCompany || signal.company || signal.buyer,
    "Job Count": signal.jobCount || 0,
    "Job Titles": signal.jobTitles?.join("; ") || "",
    "Evidence URLs": signal.evidenceUrls?.join("\n") || signal.url,
    "Buyer": signal.buyer,
    "Winner": signal.winner,
    "Title": signal.title,
    "Sector": inferSector(signal).sector,
    "Score": signal.score,
    "Priority": signal.priority,
    "URL": signal.url,
    "Posted At": signal.postedAt,
    "Deadline": signal.deadline,
    "Estimated Value MDL": signal.estimatedValueMdl || 0,
    "Awarded Value MDL": signal.awardedValueMdl || 0,
    "Award Status": signal.awardStatus || signal.status,
    "CPV": signal.cpv,
    "Procedure Type": signal.procedureType,
    "Award Criteria": signal.awardCriteria,
    "Participants": signal.participants || 0,
    "Lots Detail": signal.lotsDetail,
    "Reasons": signal.reasons.join("; "),
    "Outreach Angle": signal.outreachAngle,
    "Scraped At": signal.scrapedAt,
  };
}

async function sendToAirtable(signals = []) {
  const table = process.env.AIRTABLE_TABLE_MARKET_SIGNALS || "";
  if (!table) {
    console.log("airtable: AIRTABLE_TABLE_MARKET_SIGNALS nu este setat; sar importul.");
    return;
  }

  const existingKeys = await listExistingSignalKeys(table);
  const candidates = signals
    .filter(isContactableSignal)
    .filter((signal) => signal.score >= 35)
    .filter((signal) => !existingKeys.has(cleanText(buildSignalKey(signal))))
    .slice(0, 50);
  if (!candidates.length) return;

  for (let index = 0; index < candidates.length; index += 10) {
    const chunk = candidates.slice(index, index + 10).map(signalToAirtableFields);
    try {
      await createAirtableRecords(table, chunk);
      console.log(`airtable:${table}: ${chunk.length} semnale trimise`);
    } catch (error) {
      console.warn(`airtable:${table}: import sarit (${error.message})`);
      return;
    }
  }
}

function writeOutputs(signals = [], meta = {}) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(OUTPUT_DIR, `${day}-${meta.runId}.json`);
  const mdPath = path.join(OUTPUT_DIR, `${day}-${meta.runId}.md`);

  writeFileSync(jsonPath, JSON.stringify({ meta, signals }, null, 2));
  writeFileSync(mdPath, renderMarkdown(signals, meta));

  return { jsonPath, mdPath };
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "ro-RO",
    extraHTTPHeaders: { "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8" },
  });

  try {
    const rawSignals = [];
    if (args.jobs) rawSignals.push(...await scrapeJobs(page, args.limit));
    if (args.tenders) rawSignals.push(...await scrapeTenders(page, args.limit));

    await enrichJobDetails(rawSignals);
    const postDetailFiltered = rawSignals.filter((signal) => {
      if (signal.type === "job") return isRelevantJob(signal);
      if (signal.type === "tender") return isRelevantTender(signal);
      return true;
    });
    const companyLevelSignals = aggregateJobSignalsByCompany(postDetailFiltered);
    const signals = selectFinalSignals(enrichSignals(dedupeSignals(companyLevelSignals)), args.limit);
    const meta = {
      runId: new Date().toISOString().replace(/[:.]/g, "-"),
      jobs: args.jobs,
      tenders: args.tenders,
      sources: [...new Set(signals.map((signal) => signal.source))],
      disabledSources: DISABLED_JOB_SOURCES,
    };
    const output = writeOutputs(signals, meta);

    if (args.airtable) await sendToAirtable(signals);
    if (args.telegram) await notify(renderTelegram(signals));

    console.log(`\nMarket radar complete: ${signals.length} semnale.`);
    console.log(`JSON: ${output.jsonPath}`);
    console.log(`MD:   ${output.mdPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("market-radar fatal:", error);
  process.exit(1);
});
