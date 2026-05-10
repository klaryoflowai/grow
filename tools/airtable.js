#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getAirtableConfig } = require("../api/_lib/config");
const { normalizeString, toIsoDate, toNumber } = require("../api/_lib/normalize");

const TABLE_ALIASES = {
  companies: "companies",
  company: "companies",
  contactPriority: "contactPriority",
  "contact-priority": "contactPriority",
  priority: "contactPriority",
  activities: "activities",
  activity: "activities",
  targets: "targets",
  scorecard: "scorecard",
  "scorecard-trend": "scorecardTrend",
  scorecardTrend: "scorecardTrend",
  "lead-measures-daily": "leadMeasuresDaily",
  leadMeasuresDaily: "leadMeasuresDaily",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const body = fs.readFileSync(filePath, "utf8");
  body.split(/\r?\n/).forEach((line) => {
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

function requireConfig() {
  const config = getAirtableConfig();
  if (!config.token || !config.baseId) {
    throw new Error("Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID. Pune-le in .env.local sau in environment.");
  }
  return config;
}

function resolveTableKey(value = "") {
  const key = TABLE_ALIASES[value] || TABLE_ALIASES[normalizeString(value)];
  if (!key) {
    throw new Error(`Tabela necunoscuta: ${value}. Ruleaza: node tools/airtable.js tables`);
  }
  return key;
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

async function listRecords(tableKey, options = {}) {
  const config = requireConfig();
  const table = config.tables[tableKey];
  const view = options.view || config.views[tableKey] || "";
  const pageSize = Math.min(Math.max(toNumber(options.pageSize) || 100, 1), 100);
  const limit = toNumber(options.limit) || 100;
  const records = [];
  let offset = "";

  do {
    const params = new URLSearchParams();
    params.set("pageSize", String(Math.min(pageSize, Math.max(limit - records.length, 1))));
    if (offset) params.set("offset", offset);
    if (view) params.set("view", view);
    if (options.filter) params.set("filterByFormula", options.filter);
    if (options.sortField) {
      params.set("sort[0][field]", options.sortField);
      params.set("sort[0][direction]", options.sortDirection || "asc");
    }

    const payload = await airtableRequest(config, table, params);
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset && records.length < limit);

  return records.slice(0, limit);
}

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeStage(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fieldValue(fields = {}, fieldName = "") {
  return fieldName ? fields[fieldName] : "";
}

function firstFieldValue(fields = {}, ...fieldNames) {
  return fieldNames
    .map((fieldName) => fieldValue(fields, fieldName))
    .find((value) => normalizeString(value)) || "";
}

function firstArrayValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCompanyRecord(record, config) {
  const fields = record.fields || {};
  return {
    id: record.id,
    company: normalizeString(fieldValue(fields, config.fields.companies.company)),
    pipeline_stage: normalizeString(fieldValue(fields, config.fields.companies.pipelineStage)),
    workers: toNumber(fieldValue(fields, config.fields.companies.workers)),
    last_contact: toIsoDate(fieldValue(fields, config.fields.companies.lastContact)),
    next_step: normalizeString(fieldValue(fields, config.fields.companies.nextStep)),
    next_step_date: toIsoDate(fieldValue(fields, config.fields.companies.nextStepDate)),
  };
}

function normalizeContactPriorityRecord(record, config, companyById = new Map(), companyByName = new Map()) {
  const fields = record.fields || {};
  const companyField = fieldValue(fields, config.fields.contactPriority.company);
  const lookup = firstArrayValue(fieldValue(fields, config.fields.contactPriority.companyLookup));
  const linkedCompany = Array.isArray(companyField)
    ? companyField.map((id) => companyById.get(id)).find(Boolean)
    : "";
  const company = normalizeString(typeof companyField === "string" ? companyField : lookup || linkedCompany);
  const matchedCompany = companyByName.get(normalizeCompanyKey(company));
  const pipelineStage = normalizeString(fieldValue(fields, config.fields.contactPriority.pipelineStage))
    || normalizeString(matchedCompany?.pipeline_stage);

  return {
    id: record.id,
    rank: toNumber(fieldValue(fields, config.fields.contactPriority.rank)),
    company,
    pipeline_stage: pipelineStage,
    sector: normalizeString(fieldValue(fields, config.fields.contactPriority.sector)),
    last_contact: toIsoDate(fieldValue(fields, config.fields.contactPriority.lastContact)),
    decision_maker: normalizeString(firstFieldValue(fields, config.fields.contactPriority.decisionMaker, "Factor decizie", "Factor Decizie")),
    mobile: normalizeString(firstFieldValue(fields, config.fields.contactPriority.mobile, "Mobil", "Mobile", "Telefon", "Tel")),
    contact_person: normalizeString(firstFieldValue(fields, config.fields.contactPriority.contactPerson, "Persoana Contact", "Persoana contact", "Persoana de contact")),
    secondary_phone: normalizeString(firstFieldValue(fields, config.fields.contactPriority.secondaryPhone, "Tel contact rang 2", "Telefon contact rang 2", "Tel Contact rang 2")),
    notes: normalizeString(fieldValue(fields, config.fields.contactPriority.notes)),
  };
}

function printTable(rows = [], columns = []) {
  if (!rows.length) {
    console.log("No records.");
    return;
  }

  const widths = columns.map((column) => Math.max(
    column.label.length,
    ...rows.map((row) => normalizeString(row[column.key]).length)
  ));
  const line = columns.map((column, index) => column.label.padEnd(widths[index])).join("  ");
  console.log(line);
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  rows.forEach((row) => {
    console.log(columns.map((column, index) => normalizeString(row[column.key]).padEnd(widths[index])).join("  "));
  });
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function commandTables() {
  const config = requireConfig();
  const rows = Object.entries(config.tables).map(([key, name]) => ({
    key,
    table: name,
    view: config.views[key] || "",
  }));
  printTable(rows, [
    { key: "key", label: "Key" },
    { key: "table", label: "Airtable table" },
    { key: "view", label: "View" },
  ]);
}

async function commandRecords(args) {
  const tableKey = resolveTableKey(args._[1]);
  const records = await listRecords(tableKey, args);
  const rows = records.map((record) => ({ id: record.id, ...record.fields }));
  if (args.json) {
    printJson(rows);
    return;
  }
  printTable(rows, Object.keys(rows[0] || { id: "" }).slice(0, 8).map((key) => ({ key, label: key })));
}

async function commandContactPriority(args) {
  const config = requireConfig();
  const [companyRecords, priorityRecords] = await Promise.all([
    listRecords("companies", { limit: 1000 }),
    listRecords("contactPriority", { limit: args.limit || 1000 }),
  ]);
  const companies = companyRecords.map((record) => normalizeCompanyRecord(record, config));
  const companyNameById = new Map(companies.map((company) => [company.id, company.company]));
  const companyByName = new Map(companies.map((company) => [normalizeCompanyKey(company.company), company]));
  const wantedStage = normalizeStage(args.stage || "Necontactat");
  const limit = toNumber(args.limit) || 10;
  const rows = priorityRecords
    .map((record) => normalizeContactPriorityRecord(record, config, companyNameById, companyByName))
    .filter((row) => row.company)
    .filter((row) => !wantedStage || normalizeStage(row.pipeline_stage) === wantedStage)
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.company.localeCompare(right.company, "ro");
    })
    .slice(0, limit);

  if (args.json) {
    printJson(rows);
    return;
  }

  printTable(rows, [
    { key: "rank", label: "#" },
    { key: "company", label: "Company" },
    { key: "pipeline_stage", label: "Stage" },
    { key: "decision_maker", label: "Factor decizie" },
    { key: "mobile", label: "Mobil" },
    { key: "contact_person", label: "Persoana Contact" },
    { key: "secondary_phone", label: "Tel contact rang 2" },
    { key: "sector", label: "Sector" },
  ]);
}

async function commandLookup(args) {
  const query = normalizeString(args._.slice(1).join(" ") || args.company || args.q || "");
  if (!query) {
    throw new Error("Indica numele companiei. Exemplu: node tools/airtable.js lookup Darmadan SDM srl");
  }

  const config = requireConfig();
  const [companyRecords, priorityRecords] = await Promise.all([
    listRecords("companies", { limit: 1000 }),
    listRecords("contactPriority", { limit: 1000 }),
  ]);
  const companies = companyRecords.map((record) => normalizeCompanyRecord(record, config));
  const companyNameById = new Map(companies.map((company) => [company.id, company.company]));
  const companyByName = new Map(companies.map((company) => [normalizeCompanyKey(company.company), company]));
  const wanted = normalizeCompanyKey(query);
  const companyMatches = companies
    .filter((company) => {
      const key = normalizeCompanyKey(company.company);
      return key && (key.includes(wanted) || wanted.includes(key));
    })
    .slice(0, 10);
  const priorityMatches = priorityRecords
    .map((record) => normalizeContactPriorityRecord(record, config, companyNameById, companyByName))
    .filter((row) => {
      const key = normalizeCompanyKey(row.company);
      return key && (key.includes(wanted) || wanted.includes(key));
    })
    .slice(0, 10);

  console.log("Companies matches:");
  printTable(companyMatches, [
    { key: "company", label: "Company" },
    { key: "pipeline_stage", label: "Stage" },
    { key: "next_step", label: "Next Step" },
    { key: "next_step_date", label: "Next Step Date" },
  ]);
  console.log("");
  console.log("Contact Priority matches:");
  printTable(priorityMatches, [
    { key: "company", label: "Company" },
    { key: "pipeline_stage", label: "Stage" },
    { key: "decision_maker", label: "Factor decizie" },
    { key: "mobile", label: "Mobil" },
    { key: "contact_person", label: "Persoana Contact" },
    { key: "secondary_phone", label: "Tel contact rang 2" },
  ]);
}

function printHelp() {
  console.log(`
Grow Airtable CLI

Usage:
  node tools/airtable.js tables
  node tools/airtable.js records <table-key> [--limit 20] [--json]
  node tools/airtable.js contact-priority [--stage Necontactat] [--limit 10] [--json]
  node tools/airtable.js lookup <company-name>

Examples:
  node tools/airtable.js tables
  node tools/airtable.js records companies --limit 5
  node tools/airtable.js contact-priority --stage Necontactat --limit 10
  node tools/airtable.js lookup Darmadan SDM srl

Env:
  Reads .env.local, then .env, then process env.
  Required: AIRTABLE_TOKEN, AIRTABLE_BASE_ID.
`.trim());
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "help";

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "tables") {
    await commandTables(args);
    return;
  }

  if (command === "records") {
    await commandRecords(args);
    return;
  }

  if (["contact-priority", "priority"].includes(command)) {
    await commandContactPriority(args);
    return;
  }

  if (["lookup", "find"].includes(command)) {
    await commandLookup(args);
    return;
  }

  throw new Error(`Comanda necunoscuta: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
