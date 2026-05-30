#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { getAirtableConfig } = require("../api/_lib/config");
const { normalizeString, toNumber } = require("../api/_lib/normalize");

const FIELD_ALIASES = {
  company: ["Company", "Denumire", "Nume companie", "Companie", "Candidate Company"],
  idno: ["IDNO", "IDNO / Fiscal Code", "Fiscal Code", "Cod fiscal"],
  website: ["Website", "Web", "Site", "URL"],
  phones: ["Telefoane", "Telefon", "Telefon Original", "Mobil", "Tel", "Phone"],
  sector: ["Sector", "Industrie", "Industry", "Activitate", "Activitate CAEM"],
  employees: ["Nr. Angajati", "Nr. Angajați", "Nr Angajati", "Employees", "Nr. Employees"],
  size: ["Dim. Companie", "Dimensiune Companie", "Company Size", "Size"],
  region: ["Raion", "Raion / Regiune", "Regiune", "City", "Oras"],
  address: ["Adresa Fizica", "Adresă Fizică", "Adresa", "Address"],
  administrator: ["Administrator", "Factor decizie", "Decision Maker"],
  notes: ["Notes", "Note", "Observatii", "Observații"],
};

const P1_KEYWORDS = [
  "construct", "infrastruct", "product", "fabric", "industrial", "manufact",
  "automotive", "depozit", "logistic", "retail", "procesare", "vinific",
  "textil", "panific", "ambal", "mobila", "metal", "materiale",
];

const P2_KEYWORDS = [
  "agricol", "agro", "horeca", "hotel", "restaurant", "curaten",
  "facility", "servicii", "sezon",
];

function usage() {
  console.log(`
Dream 300 Airtable tool

Usage:
  node tools/dream300.js export-companies --out output/dream300/existing-companies.json [--limit 2000]
  node tools/dream300.js dedupe --candidates <file.csv|json|xlsx> [--existing <file.csv|json|xlsx>] [--out-dir output/dream300/review]
  node tools/dream300.js template --out output/dream300/candidate-template.csv

Notes:
  - Reads .env.local, then .env, then process env.
  - If --existing is omitted, dedupe reads live Airtable Companies.
  - This tool never imports records. It only prepares review files.
`.trim());
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) return;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  });
}

function loadLocalEnv() {
  const root = path.resolve(__dirname, "..");
  [".env.local", ".env"].forEach((name) => loadEnvFile(path.join(root, name)));
}

function parseArgs(argv = []) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function fold(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compact(value = "") {
  return fold(value).replace(/[^a-z0-9]+/g, "");
}

function companyKey(value = "") {
  return fold(value)
    .replace(/\b(s\.?r\.?l\.?|sa|s\.?a\.?|ii|i\.?i\.?|ics|i\.?c\.?s\.?|ao|a\.?o\.?)\b/g, " ")
    .replace(/\b(societatea|comerciala|comercială|cu|raspundere|răspundere|limitata|limitată)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function lookupField(row = {}, aliases = []) {
  const direct = aliases.find((name) => row[name] !== undefined && row[name] !== null && row[name] !== "");
  if (direct) return row[direct];

  const byFoldedKey = new Map(Object.keys(row).map((key) => [fold(key), key]));
  for (const alias of aliases) {
    const key = byFoldedKey.get(fold(alias));
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function idnoKey(value = "") {
  const digits = normalizeString(value).replace(/\D+/g, "");
  return digits.length >= 5 ? digits : "";
}

function domainKey(value = "") {
  const raw = normalizeString(value).trim();
  if (!raw) return "";
  const cleaned = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
  return cleaned.includes(".") ? cleaned : "";
}

function phoneKeys(value = "") {
  const raw = normalizeString(value);
  const matches = raw.match(/\+?\d[\d\s().-]{5,}\d/g) || [];
  return [...new Set(matches.map((match) => {
    let digits = match.replace(/\D+/g, "");
    if (digits.startsWith("373")) digits = digits.slice(3);
    if (digits.startsWith("0") && digits.length >= 8) digits = digits.slice(1);
    return digits.length >= 7 ? digits.slice(-8) : "";
  }).filter(Boolean))];
}

function tokens(value = "") {
  return companyKey(value).split(/\s+/).filter((token) => token.length >= 3);
}

function jaccard(leftTokens = [], rightTokens = []) {
  if (!leftTokens.length || !rightTokens.length) return 0;
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function parseCsvLine(line = "") {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function parseCsv(body = "") {
  const lines = body.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] === undefined ? "" : cells[index].trim();
    });
    return row;
  });
}

function stringifyCsv(rows = [], headers = []) {
  const escape = (value) => {
    const raw = normalizeString(value);
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, "\"\"")}"` : raw;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n") + "\n";
}

function readXlsxRows(filePath, sheetName = "") {
  const script = `
import json, sys
import openpyxl
path = sys.argv[1]
sheet = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
ws = wb[sheet] if sheet else wb.active
rows = list(ws.iter_rows(values_only=True))
if not rows:
    print("[]")
    raise SystemExit
headers = [str(value).strip() if value is not None else "" for value in rows[0]]
records = []
for raw in rows[1:]:
    if not any(value is not None and str(value).strip() for value in raw):
        continue
    item = {}
    for index, header in enumerate(headers):
        if not header:
            continue
        value = raw[index] if index < len(raw) else ""
        item[header] = "" if value is None else str(value).strip()
    records.append(item)
print(json.dumps(records, ensure_ascii=False))
`;

  const result = spawnSync("python3", ["-c", script, filePath, sheetName || ""], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Nu pot citi XLSX. Verifica python3/openpyxl.\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout || "[]");
}

function readRows(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".json") {
    const payload = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    return Array.isArray(payload) ? payload : payload.records || payload.rows || [];
  }
  if (ext === ".csv") {
    return parseCsv(fs.readFileSync(absolutePath, "utf8"));
  }
  if (ext === ".xlsx") {
    return readXlsxRows(absolutePath, options.sheet);
  }
  throw new Error(`Format nesuportat: ${ext}. Foloseste CSV, JSON sau XLSX.`);
}

function normalizeRow(row = {}, source = "candidate") {
  const fields = row.fields || row;
  const company = normalizeString(lookupField(fields, FIELD_ALIASES.company));
  const phoneRaw = [
    lookupField(fields, FIELD_ALIASES.phones),
    lookupField(fields, ["Tel contact rang 2", "Telefon secundar"]),
  ].filter(Boolean).join(" | ");

  return {
    source,
    record_id: row.id || row.RecordId || row.record_id || "",
    company,
    idno: idnoKey(lookupField(fields, FIELD_ALIASES.idno)),
    website: normalizeString(lookupField(fields, FIELD_ALIASES.website)),
    domain: domainKey(lookupField(fields, FIELD_ALIASES.website)),
    phones: phoneKeys(phoneRaw),
    sector: normalizeString(lookupField(fields, FIELD_ALIASES.sector)),
    employees: toNumber(lookupField(fields, FIELD_ALIASES.employees)),
    size: normalizeString(lookupField(fields, FIELD_ALIASES.size)),
    region: normalizeString(lookupField(fields, FIELD_ALIASES.region)),
    address: normalizeString(lookupField(fields, FIELD_ALIASES.address)),
    administrator: normalizeString(lookupField(fields, FIELD_ALIASES.administrator)),
    notes: normalizeString(lookupField(fields, FIELD_ALIASES.notes)),
    raw: fields,
    key: companyKey(company),
    compact_key: compact(companyKey(company)),
    tokens: tokens(company),
  };
}

function buildExistingIndex(existingRows = []) {
  const rows = existingRows.map((row) => normalizeRow(row, "existing")).filter((row) => row.company);
  const index = {
    rows,
    byIdno: new Map(),
    byDomain: new Map(),
    byPhone: new Map(),
    byCompactName: new Map(),
  };

  rows.forEach((row) => {
    if (row.idno) index.byIdno.set(row.idno, row);
    if (row.domain) index.byDomain.set(row.domain, row);
    if (row.compact_key) index.byCompactName.set(row.compact_key, row);
    row.phones.forEach((phone) => index.byPhone.set(phone, row));
  });

  return index;
}

function bestFuzzyMatch(candidate, rows = []) {
  let best = { row: null, score: 0 };
  rows.forEach((row) => {
    const score = jaccard(candidate.tokens, row.tokens);
    if (score > best.score) best = { row, score };
  });
  return best;
}

function classifyCandidate(candidate, index) {
  const exactMatches = [];
  if (candidate.idno && index.byIdno.has(candidate.idno)) {
    exactMatches.push({ row: index.byIdno.get(candidate.idno), by: "IDNO exact" });
  }
  if (candidate.domain && index.byDomain.has(candidate.domain)) {
    exactMatches.push({ row: index.byDomain.get(candidate.domain), by: "Website exact" });
  }
  if (candidate.compact_key && index.byCompactName.has(candidate.compact_key)) {
    exactMatches.push({ row: index.byCompactName.get(candidate.compact_key), by: "Nume exact normalizat" });
  }

  for (const phone of candidate.phones) {
    if (index.byPhone.has(phone)) {
      const row = index.byPhone.get(phone);
      const nameScore = jaccard(candidate.tokens, row.tokens);
      exactMatches.push({ row, by: nameScore >= 0.4 ? "Telefon + nume similar" : "Telefon exact" });
      break;
    }
  }

  if (exactMatches.length) {
    return {
      action: "DUPLICATE",
      duplicateRisk: "Ridicat",
      matched: exactMatches[0].row,
      matchedBy: exactMatches.map((match) => match.by).join("; "),
      similarity: 1,
    };
  }

  const fuzzy = bestFuzzyMatch(candidate, index.rows);
  if (fuzzy.row && fuzzy.score >= 0.72) {
    return {
      action: "REVIEW",
      duplicateRisk: fuzzy.score >= 0.85 ? "Mediu-ridicat" : "Mediu",
      matched: fuzzy.row,
      matchedBy: "Nume similar",
      similarity: fuzzy.score,
    };
  }

  return {
    action: "ADD",
    duplicateRisk: "Scazut",
    matched: null,
    matchedBy: "",
    similarity: 0,
  };
}

function includesAny(text = "", keywords = []) {
  const normalized = fold(text);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function scoreCandidate(candidate) {
  const sectorText = `${candidate.sector} ${candidate.notes}`.trim();
  const p1 = includesAny(sectorText, P1_KEYWORDS);
  const p2 = includesAny(sectorText, P2_KEYWORDS);
  let score = 0;

  if (p1) score += 4;
  else if (p2) score += 2;

  if (candidate.employees >= 250) score += 4;
  else if (candidate.employees >= 100) score += 3;
  else if (candidate.employees >= 50) score += 2;
  else if (candidate.employees >= 20) score += 1;

  const size = fold(candidate.size);
  if (size.includes("mare")) score += 3;
  else if (size.includes("mijloc")) score += 2;
  else if (size.includes("mica") || size.includes("mică")) score += 1;

  if (candidate.phones.length) score += 1;
  if (candidate.website) score += 1;
  if (candidate.administrator) score += 1;

  score = Math.min(score, 14);
  const priority = score >= 9 ? "P1" : score >= 6 ? "P2" : "P3";
  const dataConfidence = Math.min(10, [
    candidate.company,
    candidate.idno,
    candidate.website,
    candidate.phones.length ? "phone" : "",
    candidate.sector,
    candidate.employees ? "employees" : "",
    candidate.address,
    candidate.administrator,
  ].filter(Boolean).length + 2);

  return {
    fitScore: score,
    priority,
    rexConfidence: dataConfidence,
    nateNote: p1
      ? "Cont cu fit operational bun pentru volum sau presiune recurenta."
      : p2
        ? "Fit posibil; valideaza sezonalitatea, volumul si capacitatea de integrare."
        : "Fit neclar; merita contact doar daca datele arata volum sau urgenta.",
    rexNote: dataConfidence >= 7
      ? "Date suficiente pentru contact sau review rapid."
      : "Date incomplete; verifica IDNO, telefon, website si sector inainte de import.",
  };
}

function buildReviewRow(candidate, classification, score) {
  return {
    Action: classification.action,
    "Duplicate Risk": classification.duplicateRisk,
    "Candidate Company": candidate.company,
    "Matched Company": classification.matched?.company || "",
    "Matched By": classification.matchedBy,
    Similarity: classification.similarity ? classification.similarity.toFixed(2) : "",
    "Prioritate Grow": score.priority,
    "Fit Score": score.fitScore,
    "Rex Confidence": score.rexConfidence,
    IDNO: candidate.idno,
    Website: candidate.website,
    Phones: candidate.phones.join(" | "),
    Sector: candidate.sector,
    Employees: candidate.employees || "",
    Size: candidate.size,
    Region: candidate.region,
    Address: candidate.address,
    Administrator: candidate.administrator,
    "Nate Note": score.nateNote,
    "Rex Note": score.rexNote,
    Notes: candidate.notes,
  };
}

async function airtableRequest(config, table, params = new URLSearchParams()) {
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable ${response.status}: ${details}`);
  }

  return response.json();
}

async function fetchCompanies(limit = 2000) {
  const config = getAirtableConfig();
  if (!config.token || !config.baseId) {
    throw new Error("Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID. Creeaza .env.local in /Users/yuritimofte/Desktop/Grow sau exporta variabilele in shell.");
  }

  const records = [];
  let offset = "";
  do {
    const params = new URLSearchParams();
    params.set("pageSize", String(Math.min(100, Math.max(limit - records.length, 1))));
    if (config.views.companies) params.set("view", config.views.companies);
    if (offset) params.set("offset", offset);
    const payload = await airtableRequest(config, config.tables.companies, params);
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset && records.length < limit);

  return records.slice(0, limit).map((record) => ({ id: record.id, ...(record.fields || {}) }));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeCsv(filePath, rows, headers) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, stringifyCsv(rows, headers), "utf8");
}

async function commandExportCompanies(args) {
  const out = path.resolve(args.out || "output/dream300/existing-companies.json");
  const rows = await fetchCompanies(toNumber(args.limit) || 2000);
  writeJson(out, rows);
  console.log(JSON.stringify({ out, companies: rows.length }, null, 2));
}

async function commandTemplate(args) {
  const out = path.resolve(args.out || "output/dream300/candidate-template.csv");
  const headers = [
    "Company", "IDNO", "Website", "Telefoane", "Sector", "Nr. Angajati",
    "Dim. Companie", "Raion", "Adresa Fizica", "Administrator", "Notes",
  ];
  writeCsv(out, [], headers);
  console.log(JSON.stringify({ out, headers }, null, 2));
}

async function commandDedupe(args) {
  if (!args.candidates) throw new Error("Lipseste --candidates <file.csv|json|xlsx>.");
  const outDir = path.resolve(args.outDir || "output/dream300/review");
  const candidateRows = readRows(args.candidates, args);
  const existingRows = args.existing
    ? readRows(args.existing, args)
    : await fetchCompanies(toNumber(args.limit) || 2000);
  const index = buildExistingIndex(existingRows);
  const reviewRows = candidateRows
    .map((row) => normalizeRow(row, "candidate"))
    .filter((candidate) => candidate.company)
    .map((candidate) => {
      const classification = classifyCandidate(candidate, index);
      const score = scoreCandidate(candidate);
      return buildReviewRow(candidate, classification, score);
    });

  const headers = Object.keys(reviewRows[0] || {
    Action: "", "Duplicate Risk": "", "Candidate Company": "", "Matched Company": "",
  });
  const addRows = reviewRows.filter((row) => row.Action === "ADD");
  const reviewOnlyRows = reviewRows.filter((row) => row.Action === "REVIEW");
  const duplicateRows = reviewRows.filter((row) => row.Action === "DUPLICATE");
  const summary = {
    candidates: reviewRows.length,
    existingCompanies: index.rows.length,
    add: addRows.length,
    review: reviewOnlyRows.length,
    duplicates: duplicateRows.length,
    outDir,
  };

  writeCsv(path.join(outDir, "all-reviewed.csv"), reviewRows, headers);
  writeCsv(path.join(outDir, "add.csv"), addRows, headers);
  writeCsv(path.join(outDir, "review.csv"), reviewOnlyRows, headers);
  writeCsv(path.join(outDir, "duplicates.csv"), duplicateRows, headers);
  writeJson(path.join(outDir, "summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "help";

  if (["help", "--help", "-h"].includes(command)) {
    usage();
    return;
  }
  if (command === "export-companies") return commandExportCompanies(args);
  if (command === "template") return commandTemplate(args);
  if (["dedupe", "analyze"].includes(command)) return commandDedupe(args);
  throw new Error(`Comanda necunoscuta: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
