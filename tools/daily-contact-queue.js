#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getAirtableConfig } = require("../api/_lib/config");
const { normalizeString } = require("../api/_lib/normalize");

function usage() {
  console.log(`
Daily Contact Queue

Usage:
  node tools/daily-contact-queue.js

Reads Contact Priority from Airtable, matches it against the latest
scraper/output/market-radar/*.json signals, and writes a ranked markdown
report to output/daily-contact-queue/YYYY-MM-DD.md.

Notes:
  - Reads .env.local, then .env, then process env, for AIRTABLE_TOKEN / AIRTABLE_BASE_ID.
  - Read-only against Airtable. No records are created or modified.
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
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

function resolveContactPriorityCompanyName(fields = {}, config) {
  const lookupField = config.fields.contactPriority.companyLookup || "Company (from Company)";
  const lookupValue = normalizeString(fields[lookupField]);
  if (lookupValue) return lookupValue;

  const directField = config.fields.contactPriority.company;
  return normalizeString(fields[directField]);
}

async function fetchContactPriorityCompanies(config) {
  const records = [];
  let offset = "";
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (config.views.contactPriority) params.set("view", config.views.contactPriority);
    if (offset) params.set("offset", offset);
    const payload = await airtableRequest(config, config.tables.contactPriority, params);
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset);

  return records
    .map((record) => ({ id: record.id, company: resolveContactPriorityCompanyName(record.fields || {}, config) }))
    .filter((row) => row.company);
}

function findLatestSignalsFile(dir) {
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  if (!files.length) return "";
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

function loadSignals(filePath) {
  if (!filePath) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(payload.signals) ? payload.signals : [];
}

async function main() {
  loadLocalEnv();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const config = getAirtableConfig();
  if (!config.token || !config.baseId) {
    throw new Error(
      "Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID. Creeaza .env.local in /Users/yuritimofte/Desktop/Grow sau exporta variabilele in shell."
    );
  }

  console.log("Config OK. Restul fluxului va fi adaugat in task-urile urmatoare.");
}

module.exports = {
  loadEnvFile,
  normalizeCompanyKey,
  findBestMatch,
  resolveContactPriorityCompanyName,
  findLatestSignalsFile,
  loadSignals,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
