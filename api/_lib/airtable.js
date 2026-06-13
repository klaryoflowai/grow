const { defaultTargets, getAirtableConfig, isConfigured } = require("./config");
const {
  buildWeekLabel,
  getCurrentWeekStart,
  getCurrentPeriod,
  getWeekEnd,
  getWeekStart,
  normalizeActivity,
  normalizePeriod,
  normalizeStatus,
  normalizeString,
  parseDate,
  stageRank,
  toIsoDate,
  toNumber,
} = require("./normalize");

class AirtableError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AirtableError";
    this.status = status;
  }
}

function optionalTableWarning(tableLabel, error) {
  const details = error?.message ? ` Detalii: ${error.message}` : "";
  const status = error?.status ? ` (${error.status})` : "";
  return `Tabela ${tableLabel} nu a putut fi citita${status}. Dashboard-ul continua fara acest bloc optional.${details}`;
}

const schemaReferenceCache = new Map();
const airtableDataCache = new Map();
const DEFAULT_AIRTABLE_CACHE_TTL_MS = 15000;

function getAirtableCacheTtlMs() {
  const configured = toNumber(process.env.AIRTABLE_CACHE_TTL_MS);
  return configured > 0 ? configured : DEFAULT_AIRTABLE_CACHE_TTL_MS;
}

function buildAirtableDataCacheKey(config, scope = "dashboard") {
  return JSON.stringify({
    baseId: config.baseId,
    scope,
    tables: config.tables,
    views: config.views,
    tableIds: config.tableIds,
    viewIds: config.viewIds,
    activityCompanyLinked: config.modes?.activityCompanyLinked,
  });
}

function cloneAirtableCacheValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

async function readAirtableDataCache(config, scope, loader, options = {}) {
  const ttlMs = getAirtableCacheTtlMs();
  if (options.fresh || ttlMs <= 0) {
    return loader();
  }

  const cacheKey = buildAirtableDataCacheKey(config, scope);
  const now = Date.now();
  const cached = airtableDataCache.get(cacheKey);

  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cloneAirtableCacheValue(cached.value);
  }

  if (cached?.promise) {
    const value = await cached.promise;
    return cloneAirtableCacheValue(value);
  }

  const promise = loader()
    .then((value) => {
      airtableDataCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      airtableDataCache.delete(cacheKey);
      throw error;
    });

  airtableDataCache.set(cacheKey, {
    promise,
    expiresAt: now + ttlMs,
  });

  const value = await promise;
  return cloneAirtableCacheValue(value);
}

function invalidateAirtableDataCache() {
  airtableDataCache.clear();
}

async function airtableRequest(config, table, options = {}) {
  const {
    method = "GET",
    params = new URLSearchParams(),
    body,
  } = options;

  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}?${params.toString()}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Airtable a raspuns cu ${response.status}.`;

    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      // keep default message
    }

    throw new AirtableError(response.status, message);
  }

  return response.json();
}

async function airtableMetadataRequest(config) {
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(config.baseId)}/tables`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = `Airtable metadata a raspuns cu ${response.status}.`;

    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      // keep default message
    }

    throw new AirtableError(response.status, message);
  }

  return response.json();
}

function isAirtableId(value = "", prefix = "") {
  return normalizeString(value).startsWith(prefix);
}

function getConfiguredSchemaReferences(config) {
  const references = {
    tableIds: { ...(config.tableIds || {}) },
    viewIds: { ...(config.viewIds || {}) },
  };

  Object.entries(config.tables || {}).forEach(([key, table]) => {
    if (!references.tableIds[key] && isAirtableId(table, "tbl")) {
      references.tableIds[key] = table;
    }
  });

  Object.entries(config.views || {}).forEach(([key, view]) => {
    if (!references.viewIds[key] && isAirtableId(view, "viw")) {
      references.viewIds[key] = view;
    }
  });

  return references;
}

function findSchemaItem(items = [], configuredValue = "", idPrefix = "") {
  const wanted = normalizeString(configuredValue);
  if (!wanted) return null;
  if (isAirtableId(wanted, idPrefix)) {
    return items.find((item) => item.id === wanted) || null;
  }
  const wantedLower = wanted.toLowerCase();
  return items.find((item) => normalizeString(item.name).toLowerCase() === wantedLower) || null;
}

function needsSchemaLookup(config, references) {
  return Object.entries(config.tables || {}).some(([key, table]) => (
    !references.tableIds[key] && !isAirtableId(table, "tbl")
  )) || Object.entries(config.views || {}).some(([key, view]) => (
    view && !references.viewIds[key] && !isAirtableId(view, "viw")
  ));
}

async function resolveSchemaReferences(config, warnings = []) {
  const references = getConfiguredSchemaReferences(config);

  if (!needsSchemaLookup(config, references)) {
    return references;
  }

  const cacheKey = JSON.stringify({
    baseId: config.baseId,
    tables: config.tables,
    views: config.views,
    tableIds: config.tableIds,
    viewIds: config.viewIds,
  });

  if (schemaReferenceCache.has(cacheKey)) {
    return schemaReferenceCache.get(cacheKey);
  }

  try {
    const payload = await airtableMetadataRequest(config);
    const schemaTables = Array.isArray(payload.tables) ? payload.tables : [];

    Object.entries(config.tables || {}).forEach(([key, configuredTable]) => {
      const table = findSchemaItem(schemaTables, references.tableIds[key] || configuredTable, "tbl");
      if (!table) return;

      references.tableIds[key] = table.id;

      const configuredView = references.viewIds[key] || config.views?.[key] || "";
      const view = findSchemaItem(table.views || [], configuredView, "viw")
        || (!configuredView ? (table.views || [])[0] : null);
      if (view?.id) {
        references.viewIds[key] = view.id;
      }
    });
  } catch (error) {
    if (!references.tableIds.companies) {
      warnings.push(
        "Nu am putut determina ID-ul Airtable pentru tabela Companies. Pentru linkuri directe pe companii, seteaza AIRTABLE_TABLE_ID_COMPANIES sau acorda tokenului scope schema.bases:read."
      );
    }
  }

  schemaReferenceCache.set(cacheKey, references);
  return references;
}

function uniqFieldNames(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function airtableFormulaString(value = "") {
  return `'${normalizeString(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function airtableFieldRef(fieldName = "") {
  return `{${normalizeString(fieldName)}}`;
}

function buildLowerEqualsFormula(fieldName = "", value = "", options = {}) {
  const { arrayJoin = false } = options;
  const fieldExpr = arrayJoin
    ? `ARRAYJOIN(${airtableFieldRef(fieldName)})`
    : airtableFieldRef(fieldName);
  return `LOWER(${fieldExpr})=LOWER(${airtableFormulaString(value)})`;
}

function buildEqualsFormula(fieldName = "", value = "") {
  return `${airtableFieldRef(fieldName)}=${airtableFormulaString(value)}`;
}

function buildOrFormula(parts = []) {
  const filtered = parts.filter(Boolean);
  if (filtered.length <= 1) return filtered[0] || "";
  return `OR(${filtered.join(",")})`;
}

function buildAndFormula(parts = []) {
  const filtered = parts.filter(Boolean);
  if (filtered.length <= 1) return filtered[0] || "";
  return `AND(${filtered.join(",")})`;
}

function buildDateRangeFormula(fieldName = "", start = "", end = "") {
  return buildAndFormula([
    `${airtableFieldRef(fieldName)}>=${airtableFormulaString(start)}`,
    `${airtableFieldRef(fieldName)}<=${airtableFormulaString(end)}`,
  ]);
}

function buildRecordIdEqualsFormula(recordId = "") {
  return `RECORD_ID()=${airtableFormulaString(recordId)}`;
}

async function listRecords(tableKey, options = {}) {
  const config = getRequiredConfig();
  const table = config.tables[tableKey];
  const view = options.view !== undefined ? options.view : config.views[tableKey];
  const pageSize = Math.min(Math.max(toNumber(options.pageSize) || 100, 1), 100);
  const maxRecords = Math.max(toNumber(options.maxRecords) || 0, 0);
  const requestedFields = uniqFieldNames(options.fields || []);
  const records = [];
  let offset = "";

  do {
    const params = new URLSearchParams();
    const remaining = maxRecords ? Math.max(maxRecords - records.length, 1) : pageSize;
    params.set("pageSize", String(Math.min(pageSize, remaining)));
    if (offset) params.set("offset", offset);
    if (view) params.set("view", view);
    if (options.filterFormula) params.set("filterByFormula", options.filterFormula);
    if (options.sortField) {
      params.set("sort[0][field]", options.sortField);
      params.set("sort[0][direction]", options.sortDirection || "asc");
    }
    requestedFields.forEach((fieldName) => {
      params.append("fields[]", fieldName);
    });

    let payload;
    try {
      payload = await airtableRequest(config, table, { params });
    } catch (error) {
      if (requestedFields.length && getUnknownFieldName(error) && !options._fieldsFallbackApplied) {
        return listRecords(tableKey, {
          ...options,
          fields: [],
          _fieldsFallbackApplied: true,
        });
      }
      throw error;
    }
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset && (!maxRecords || records.length < maxRecords));

  return maxRecords ? records.slice(0, maxRecords) : records;
}

async function createRecord(tableKey, fields) {
  const config = getRequiredConfig();
  const payload = await airtableRequest(config, config.tables[tableKey], {
    method: "POST",
    body: { records: [{ fields }] },
  });

  return payload.records?.[0];
}

async function updateRecord(tableKey, recordId, fields) {
  const config = getRequiredConfig();
  const payload = await airtableRequest(config, config.tables[tableKey], {
    method: "PATCH",
    body: { records: [{ id: recordId, fields }] },
  });

  return payload.records?.[0];
}

function getRequiredConfig() {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    throw new AirtableError(503, "Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID in mediul Vercel.");
  }
  return config;
}

const pipelineRankMap = {
  Necontactat: 0,
  Contactat: 1,
  Meeting: 2,
  Oferta: 3,
  Negociere: 4,
  "Contract semnat": 5,
  Parcat: -1,
  Pierdut: -2,
  // legacy names — kept for backward compat during Airtable migration
  "Incercam sa ajungem la decident": 1,
  "Discutie initiata": 1,
  "Meeting programat": 2,
  "Meeting tinut": 2,
  "Oferta trimisa": 3,
  "Asteapta decizie": 4,
};

const legacyStageMap = {
  "Incercam sa ajungem la decident": "Contactat",
  "Discutie initiata": "Contactat",
  "Meeting programat": "Meeting",
  "Meeting tinut": "Meeting",
  "Oferta trimisa": "Oferta",
  "Asteapta decizie": "Negociere",
};

const lockedPipelineStages = new Set(["Contract semnat", "Parcat", "Pierdut"]);
const accountHealthToAirtableMap = {
  Verde: "🟢",
  Galben: "🟡",
  Rosu: "🔴",
  Gri: "⚪️",
  "🟢": "🟢",
  "🟡": "🟡",
  "🔴": "🔴",
  "⚪": "⚪️",
  "⚪️": "⚪️",
};

const accountHealthFromAirtableMap = {
  "🟢": "Verde",
  "🟡": "Galben",
  "🔴": "Rosu",
  "⚪": "Gri",
  "⚪️": "Gri",
};

function normalizePipelineStage(stage = "") {
  const raw = normalizeString(stage);
  return legacyStageMap[raw] || raw;
}

function statusToPipelineStage(status = "") {
  const normalized = normalizeStatus(status);
  const mapping = {
    new: "Necontactat",
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
    lost: "Pierdut",
  };
  return mapping[normalized] || "";
}

function activityToPipelineStage(activityType = "") {
  if (normalizeActivity(activityType) === "planned") {
    return "";
  }
  return statusToPipelineStage(activityType);
}

function pipelineRank(stage = "") {
  return pipelineRankMap[normalizeString(stage)] ?? -3;
}

function mergePipelineStage(existingStage = "", activityType = "") {
  const currentStage = normalizeString(existingStage);
  if (lockedPipelineStages.has(currentStage)) {
    return currentStage;
  }

  const nextStageCandidate = activityToPipelineStage(activityType);
  return pipelineRank(nextStageCandidate) > pipelineRank(currentStage)
    ? nextStageCandidate
    : currentStage;
}

function encodeAccountHealth(value = "") {
  const raw = normalizeString(value);
  if (!raw) return "";
  return accountHealthToAirtableMap[raw] || raw;
}

function decodeAccountHealth(value = "") {
  const raw = normalizeString(value);
  if (!raw) return "";
  return accountHealthFromAirtableMap[raw] || raw;
}

function isMissingFieldError(error, fieldName = "") {
  const message = normalizeString(error?.message).toLowerCase();
  const normalizedField = normalizeString(fieldName).toLowerCase();
  return Boolean(
    normalizedField
    && message.includes(normalizedField)
    && (
      message.includes("unknown field")
      || message.includes("does not exist")
      || message.includes("cannot find field")
    )
  );
}

function getUnknownFieldName(error) {
  const message = normalizeString(error?.message);
  if (!message) return "";
  const match = message.match(/unknown field name:\s*"([^"]+)"/i)
    || message.match(/cannot find field\s*"([^"]+)"/i)
    || message.match(/field\s*"([^"]+)"\s*does not exist/i);
  return match?.[1] || "";
}

function isInvalidSelectOptionError(error) {
  const message = normalizeString(error?.message).toLowerCase();
  return (
    message.includes("select option")
    || message.includes("multiple choice")
    || message.includes("choice")
  );
}

function normalizeBooleanField(value) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeString(value).toLowerCase();
  return ["1", "true", "yes", "da", "on", "checked"].includes(normalized);
}

function normalizeCompanyRecord(record, config) {
  const fields = record.fields || {};
  const pipelineStageField = config.fields.companies.pipelineStage;
  const rawStage = normalizeString(pipelineStageField ? fields[pipelineStageField] : "");
  const readField = (...fieldNames) => fieldNames
    .map((fieldName) => (fieldName ? fields[fieldName] : ""))
    .find((value) => normalizeString(value)) || "";

  return {
    id: record.id,
    company: normalizeString(fields[config.fields.companies.company]),
    pipeline_stage: normalizePipelineStage(rawStage),
    account_health: decodeAccountHealth(
      config.fields.companies.accountHealth ? fields[config.fields.companies.accountHealth] : ""
    ),
    workers: toNumber(fields[config.fields.companies.workers]),
    lead_date: toIsoDate(
      config.fields.companies.leadDate ? fields[config.fields.companies.leadDate] : ""
    ),
    last_contact: toIsoDate(fields[config.fields.companies.lastContact]),
    next_step: normalizeString(fields[config.fields.companies.nextStep]),
    next_step_date: toIsoDate(fields[config.fields.companies.nextStepDate]),
    decision_maker: normalizeString(readField(
      config.fields.companies.decisionMaker,
      "Factor decizie",
      "Factor Decizie",
      "Factor de decizie",
      "Factor De Decizie",
      "Factor de Decizie (Nume/Funcție)",
      "Factor de Decizie (Nume/Functie)"
    )),
    mobile: normalizeString(readField(config.fields.companies.mobile, "Mobil", "Mobile", "Telefon", "Tel")),
    contact_person: normalizeString(readField(config.fields.companies.contactPerson, "PErsoana contact", "Persoana Contact", "Persoana contact", "Persoana de contact")),
    secondary_phone: normalizeString(readField(config.fields.companies.secondaryPhone, "Tel contact rang 2", "Telefon contact rang 2", "Tel Contact rang 2")),
    standby_reason: normalizeString(
      config.fields.companies.standbyReason ? fields[config.fields.companies.standbyReason] : ""
    ),
    reactivation_date: toIsoDate(
      config.fields.companies.reactivationDate ? fields[config.fields.companies.reactivationDate] : ""
    ),
    stage_changed_date: toIsoDate(
      config.fields.companies.stageChangedDate ? fields[config.fields.companies.stageChangedDate] : ""
    ),
    sector: normalizeString(fields[config.fields.companies.sector]),
    decision_maker: normalizeString(
      config.fields.companies.decisionMaker ? fields[config.fields.companies.decisionMaker] : ""
    ),
    contact_person: normalizeString(
      readField(config.fields.companies.contactPerson, "PErsoana contact", "Persoana Contact", "Persoana contact", "Persoana de contact")
    ),
    mobile: normalizeString(
      config.fields.companies.mobile ? fields[config.fields.companies.mobile] : ""
    ),
    tel: normalizeString(
      config.fields.companies.tel ? fields[config.fields.companies.tel] : ""
    ),
    tel_contact_rang_2: normalizeString(
      config.fields.companies.telContactRang2 ? fields[config.fields.companies.telContactRang2] : ""
    ),
    notes: normalizeString(fields[config.fields.companies.notes]),
    priority_tier: normalizeString(
      config.fields.companies.priorityTier ? fields[config.fields.companies.priorityTier] : ""
    ),
    icp_score: toNumber(
      config.fields.companies.icpScore ? fields[config.fields.companies.icpScore] : ""
    ),
    pain_type: normalizeString(
      config.fields.companies.painType ? fields[config.fields.companies.painType] : ""
    ),
    buying_trigger: normalizeString(
      config.fields.companies.buyingTrigger ? fields[config.fields.companies.buyingTrigger] : ""
    ),
    decision_maker_access: normalizeString(
      config.fields.companies.decisionMakerAccess ? fields[config.fields.companies.decisionMakerAccess] : ""
    ),
    objection_category: normalizeString(
      config.fields.companies.objectionCategory ? fields[config.fields.companies.objectionCategory] : ""
    ),
    proof_asset_needed: normalizeString(
      config.fields.companies.proofAssetNeeded ? fields[config.fields.companies.proofAssetNeeded] : ""
    ),
    next_step_quality: normalizeString(
      config.fields.companies.nextStepQuality ? fields[config.fields.companies.nextStepQuality] : ""
    ),
    risk_of_cooling: normalizeString(
      config.fields.companies.riskOfCooling ? fields[config.fields.companies.riskOfCooling] : ""
    ),
    stall_reason: normalizeString(
      config.fields.companies.stallReason ? fields[config.fields.companies.stallReason] : ""
    ),
    client_action_required: normalizeString(
      config.fields.companies.clientActionRequired ? fields[config.fields.companies.clientActionRequired] : ""
    ),
    nurture_type: normalizeString(
      config.fields.companies.nurtureType ? fields[config.fields.companies.nurtureType] : ""
    ),
    dashboard_focus: normalizeBooleanField(
      config.fields.companies.dashboardFocus ? fields[config.fields.companies.dashboardFocus] : ""
    ),
    stall_since: toIsoDate(
      config.fields.companies.stallSince ? fields[config.fields.companies.stallSince] : ""
    ),
    escalation_needed: normalizeBooleanField(
      config.fields.companies.escalationNeeded ? fields[config.fields.companies.escalationNeeded] : ""
    ),
    follow_up_status: normalizeString(
      config.fields.companies.followUpStatus ? fields[config.fields.companies.followUpStatus] : ""
    ),
    days_since_last_contact: toNumber(
      config.fields.companies.daysSinceLastContact ? fields[config.fields.companies.daysSinceLastContact] : ""
    ),
  };
}

function resolveContactPriorityCompany(fields, config, companyNameById) {
  const direct = fields[config.fields.contactPriority.company];
  if (typeof direct === "string") return normalizeString(direct);

  const lookupValue = (config.fields.contactPriority.companyLookup && fields[config.fields.contactPriority.companyLookup])
    || fields["Company (from Company)"];
  if (lookupValue) {
    const lookupString = normalizeString(Array.isArray(lookupValue) ? lookupValue[0] : lookupValue);
    if (lookupString) return lookupString;
  }

  const linkedIds = Array.isArray(direct) ? direct : fields["Company"];
  if (Array.isArray(linkedIds)) {
    const resolved = linkedIds.map((id) => companyNameById.get(id)).find(Boolean);
    if (resolved) return resolved;
  }

  return normalizeString(direct);
}

function normalizeContactPriorityRecord(record, config, companyNameById, position = 0) {
  const fields = record.fields || {};
  const readField = (...fieldNames) => fieldNames
    .map((fieldName) => (fieldName ? fields[fieldName] : ""))
    .find((value) => normalizeString(value)) || "";

  return {
    id: record.id,
    position,
    rank: toNumber(fields[config.fields.contactPriority.rank]) || position + 1,
    company: resolveContactPriorityCompany(fields, config, companyNameById),
    pipeline_stage: normalizePipelineStage(
      config.fields.contactPriority.pipelineStage ? fields[config.fields.contactPriority.pipelineStage] : ""
    ),
    sector: normalizeString(fields[config.fields.contactPriority.sector]),
    last_contact: toIsoDate(
      config.fields.contactPriority.lastContact ? fields[config.fields.contactPriority.lastContact] : ""
    ),
    decision_maker: normalizeString(
      readField(
        config.fields.contactPriority.decisionMaker,
        "Factor decizie",
        "Factor Decizie",
        "Factor de decizie",
        "Factor De Decizie",
        "Factor de Decizie (Nume/Funcție)",
        "Factor de Decizie (Nume/Functie)",
        "Factor de Decizie (Nume/Funcție) (from Company)",
        "Factor de Decizie (Nume/Functie) (from Company)"
      )
    ),
    mobile: normalizeString(
      readField(config.fields.contactPriority.mobile, "Mobil", "Mobile", "Telefon", "Tel", "Mobil (from Company)")
    ),
    contact_person: normalizeString(
      readField(config.fields.contactPriority.contactPerson, "Persoana Contact", "Persoana contact", "Persoana de contact")
    ),
    secondary_phone: normalizeString(
      readField(config.fields.contactPriority.secondaryPhone, "Tel contact rang 2", "Telefon contact rang 2", "Tel Contact rang 2")
    ),
    tel: normalizeString(
      config.fields.contactPriority.tel ? fields[config.fields.contactPriority.tel] : ""
    ),
    tel_contact_rang_2: normalizeString(
      config.fields.contactPriority.telContactRang2 ? fields[config.fields.contactPriority.telContactRang2] : ""
    ),
    recruitment_signal: normalizeString(
      config.fields.contactPriority.recruitmentSignal ? fields[config.fields.contactPriority.recruitmentSignal] : ""
    ),
    notes: normalizeString(
      config.fields.contactPriority.notes ? fields[config.fields.contactPriority.notes] : ""
    ),
  };
}

function buildCompanyNameMap(companyRecords, config) {
  const map = new Map();
  companyRecords.forEach((record) => {
    const normalized = normalizeCompanyRecord(record, config);
    map.set(record.id, normalized.company);
  });
  return map;
}

function resolveActivityCompany(fields, config, companyNameById) {
  const direct = fields[config.fields.activities.company];
  if (typeof direct === "string") return normalizeString(direct);

  const lookupField = config.fields.activities.companyLookup;
  if (lookupField) {
    const lookupValue = fields[lookupField];
    const lookupString = normalizeString(Array.isArray(lookupValue) ? lookupValue[0] : lookupValue);
    if (lookupString) return lookupString;
  }

  if (Array.isArray(direct)) {
    const resolved = direct.map((id) => companyNameById.get(id)).find(Boolean);
    if (resolved) return resolved;
  }

  return "";
}

function normalizeActivityRecord(record, config, companyNameById) {
  const fields = record.fields || {};

  return {
    id: record.id,
    created_at: parseDate(record.createdTime),
    date: toIsoDate(fields[config.fields.activities.date]),
    company: resolveActivityCompany(fields, config, companyNameById),
    activity_type: normalizeActivity(fields[config.fields.activities.type]),
    outcome: normalizeString(fields[config.fields.activities.outcome]),
    workers_delta: toNumber(fields[config.fields.activities.workers]),
    next_step: normalizeString(fields[config.fields.activities.nextStep]),
    next_step_date: toIsoDate(fields[config.fields.activities.nextStepDate]),
    notes: normalizeString(fields[config.fields.activities.notes]),
  };
}

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function isSameActivityFingerprint(existing = {}, incoming = {}) {
  return (
    normalizeCompanyKey(existing.company) === normalizeCompanyKey(incoming.company)
    && normalizeActivity(existing.activity_type) === normalizeActivity(incoming.activity_type)
    && normalizeString(existing.outcome) === normalizeString(incoming.outcome)
    && toIsoDate(existing.date) === toIsoDate(incoming.date)
    && normalizeString(existing.next_step) === normalizeString(incoming.next_step)
    && toIsoDate(existing.next_step_date) === toIsoDate(incoming.next_step_date)
    && normalizeString(existing.notes) === normalizeString(incoming.notes)
    && toNumber(existing.workers_delta) === toNumber(incoming.workers_delta)
  );
}

function buildCompactActivityLogEntry(activity = {}) {
  const parts = [
    `[${toIsoDate(activity.date) || "fara data"}] ${normalizeActivity(activity.activity_type) || "activitate"}`,
  ];
  const outcome = normalizeString(activity.outcome);
  const workers = toNumber(activity.workers_delta);
  const nextStep = normalizeString(activity.next_step);
  const nextStepDate = toIsoDate(activity.next_step_date);
  const notes = normalizeString(activity.notes);

  if (outcome) parts.push(`outcome: ${outcome}`);
  if (workers) parts.push(`${workers} muncitori`);
  if (nextStep) parts.push(`next: ${nextStep}${nextStepDate ? ` (${nextStepDate})` : ""}`);
  if (notes) parts.push(`note: ${notes}`);

  return parts.join(" | ");
}

function appendCompactActivityNotes(existingNotes = "", activity = {}) {
  const currentNotes = normalizeString(existingNotes);
  const entry = buildCompactActivityLogEntry(activity);

  if (!currentNotes) return entry;
  if (currentNotes.includes(entry)) return currentNotes;
  return `${currentNotes}\n${entry}`;
}

async function findRecentDuplicateActivity(activity, config) {
  const duplicateWindowMs = 5 * 60 * 1000;
  const companyRecords = config.modes.activityCompanyLinked
    ? await listRecords("companies")
    : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const activityRecords = await findPotentialDuplicateActivities(activity, config);
  const normalizedActivities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  const now = new Date();

  return normalizedActivities.find((record) => {
    if (!record.created_at) return false;
    if (!isSameActivityFingerprint(record, activity)) return false;
    return Math.abs(now.getTime() - record.created_at.getTime()) <= duplicateWindowMs;
  }) || null;
}

function isLiveActivityRecord(activity = {}) {
  return normalizeActivity(activity.activity_type) !== "planned";
}

function countActivitiesForTrend(activities = []) {
  return activities.reduce((counts, activity) => {
    const key = normalizeActivity(activity.activity_type);
    if (key === "contacted") counts.contacted += 1;
    if (key === "meeting") counts.meetings += 1;
    if (key === "offer") counts.offers += 1;
    if (key === "contract_signed") counts.contracts += 1;
    return counts;
  }, {
    contacted: 0,
    meetings: 0,
    offers: 0,
    contracts: 0,
  });
}

function dayDiff(left, right) {
  const ms = 1000 * 60 * 60 * 24;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  leftDate.setHours(0, 0, 0, 0);
  rightDate.setHours(0, 0, 0, 0);
  return Math.floor((rightDate.getTime() - leftDate.getTime()) / ms);
}

function isDateWithinInclusiveRange(date, start, end) {
  if (!date || !start || !end) return false;
  const current = new Date(date);
  const left = new Date(start);
  const right = new Date(end);
  current.setHours(0, 0, 0, 0);
  left.setHours(0, 0, 0, 0);
  right.setHours(0, 0, 0, 0);
  return current >= left && current <= right;
}

function buildSalesCycles(activities = []) {
  const sorted = [...activities]
    .filter((activity) => activity.company && activity.date)
    .sort((left, right) => {
      const leftTime = parseDate(left.date)?.getTime() || 0;
      const rightTime = parseDate(right.date)?.getTime() || 0;
      return leftTime - rightTime;
    });

  const cycleState = new Map();
  const cycles = [];

  sorted.forEach((activity) => {
    if (!isLiveActivityRecord(activity)) return;

    const companyKey = normalizeCompanyKey(activity.company);
    const activityDate = parseDate(activity.date);
    if (!companyKey || !activityDate) return;

    const activeCycle = cycleState.get(companyKey) || {
      leadDate: null,
      company: activity.company,
    };

    if (!activeCycle.leadDate) {
      activeCycle.leadDate = activityDate;
    }

    activeCycle.company = activity.company;

    if (normalizeActivity(activity.activity_type) === "contract_signed") {
      const leadDate = activeCycle.leadDate || activityDate;
      cycles.push({
        company: activity.company,
        leadDate,
        contractDate: activityDate,
        days: Math.max(dayDiff(leadDate, activityDate), 0),
      });
      activeCycle.leadDate = null;
    }

    cycleState.set(companyKey, activeCycle);
  });

  return cycles;
}

function buildLeadDateIndex(activities = []) {
  const sorted = [...activities]
    .filter((activity) => activity.company && activity.date)
    .sort((left, right) => {
      const leftTime = parseDate(left.date)?.getTime() || 0;
      const rightTime = parseDate(right.date)?.getTime() || 0;
      return leftTime - rightTime;
    });

  const leadState = new Map();

  sorted.forEach((activity) => {
    if (!isLiveActivityRecord(activity)) return;

    const companyKey = normalizeCompanyKey(activity.company);
    const activityDate = parseDate(activity.date);
    if (!companyKey || !activityDate) return;

    const entry = leadState.get(companyKey) || {
      currentLeadDate: null,
      lastLeadDate: null,
    };

    if (!entry.currentLeadDate) {
      entry.currentLeadDate = activityDate;
    }

    if (normalizeActivity(activity.activity_type) === "contract_signed") {
      entry.lastLeadDate = entry.currentLeadDate || activityDate;
      entry.currentLeadDate = null;
    }

    leadState.set(companyKey, entry);
  });

  return new Map(
    [...leadState.entries()]
      .map(([companyKey, entry]) => [companyKey, toIsoDate(entry.currentLeadDate || entry.lastLeadDate)])
      .filter(([, leadDate]) => leadDate)
  );
}

function calculateSalesVelocityForWindow(activities = [], weekStart, weekEnd) {
  const startDate = parseDate(weekStart);
  const endDate = parseDate(weekEnd || getWeekEnd(weekStart));
  if (!startDate || !endDate) {
    return { averageDays: 0, sampleSize: 0 };
  }

  const cycles = buildSalesCycles(activities).filter((cycle) =>
    isDateWithinInclusiveRange(cycle.contractDate, startDate, endDate)
  );

  if (!cycles.length) {
    return { averageDays: 0, sampleSize: 0 };
  }

  const totalDays = cycles.reduce((sum, cycle) => sum + cycle.days, 0);
  return {
    averageDays: Math.round(totalDays / cycles.length),
    sampleSize: cycles.length,
  };
}

function withComputedSalesVelocity(scorecard, activities = []) {
  const velocity = calculateSalesVelocityForWindow(
    activities,
    scorecard.week_start,
    scorecard.week_end || getWeekEnd(scorecard.week_start)
  );

  return {
    ...scorecard,
    sales_velocity_days: velocity.averageDays,
  };
}

function normalizeTargetsRecord(record, config) {
  const fields = record.fields || {};
  const movedCompaniesWeeklyValue = fields[config.fields.targets.movedCompaniesWeekly];
  return {
    id: record.id,
    period: normalizePeriod(fields[config.fields.targets.period], config.timezone),
    contacted: toNumber(fields[config.fields.targets.contacted]),
    meetings: toNumber(fields[config.fields.targets.meetings]),
    offers: toNumber(fields[config.fields.targets.offers]),
    contracts: toNumber(fields[config.fields.targets.contracts]),
    movedCompaniesWeekly: normalizeString(movedCompaniesWeeklyValue) === ""
      ? defaultTargets.movedCompaniesWeekly
      : toNumber(movedCompaniesWeeklyValue),
    coldCallsDaily: toNumber(fields[config.fields.targets.coldCallsDaily]),
    coldCallsWeekly: toNumber(fields[config.fields.targets.coldCallsWeekly]),
    coldCallsMonthly: toNumber(fields[config.fields.targets.coldCallsMonthly]),
    whatsappMessagesDaily: toNumber(fields[config.fields.targets.whatsappMessagesDaily]),
    whatsappMessagesWeekly: toNumber(fields[config.fields.targets.whatsappMessagesWeekly]),
    whatsappMessagesMonthly: toNumber(fields[config.fields.targets.whatsappMessagesMonthly]),
    fieldVisitsDaily: toNumber(fields[config.fields.targets.fieldVisitsDaily]),
    fieldVisitsWeekly: toNumber(fields[config.fields.targets.fieldVisitsWeekly]),
    fieldVisitsMonthly: toNumber(fields[config.fields.targets.fieldVisitsMonthly]),
    warmOutreachDaily: toNumber(fields[config.fields.targets.warmOutreachDaily]),
    warmOutreachWeekly: toNumber(fields[config.fields.targets.warmOutreachWeekly]),
    warmOutreachMonthly: toNumber(fields[config.fields.targets.warmOutreachMonthly]),
  };
}

function createEmptyScorecard(timezone = "Europe/Chisinau") {
  const weekStart = getCurrentWeekStart(timezone);
  const weekEnd = getWeekEnd(weekStart);
  return {
    id: "",
    week_start: weekStart,
    week_end: weekEnd,
    week_key: weekStart,
    week_label: buildWeekLabel(weekStart, weekEnd),
    new_contract_workers_mtd: 0,
    dream100_p1_prospects: 0,
    sales_velocity_days: 0,
    cold_calls: 0,
    linkedin_messages: 0,
    field_visits: 0,
    warm_outreach: 0,
    meetings_set: 0,
    offers_sent: 0,
    contracts_signed: 0,
    workers_signed: 0,
    workers_delivered: 0,
    notes: "",
  };
}

function createEmptyLeadMeasureDaily(timezone = "Europe/Chisinau") {
  return {
    id: "",
    date: toIsoDate(new Date()) || getCurrentWeekStart(timezone),
    cold_calls: 0,
    whatsapp_messages: 0,
    field_visits: 0,
    warm_outreach: 0,
    notes: "",
  };
}

function normalizeOutcomeKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isWhatsAppMessageOutcome(value = "") {
  return normalizeOutcomeKey(value) === normalizeOutcomeKey("Mesaj WhatsApp trimis");
}

function isFirstLiveCompanyTouch(activity, existingActivities = []) {
  if (!activity?.company || !activity?.date) return false;
  if (!isLiveActivityRecord(activity)) return false;

  const companyKey = normalizeCompanyKey(activity.company);
  const activityDate = toIsoDate(activity.date);

  if (!companyKey || !activityDate) return false;

  return !existingActivities.some((record) => (
    record.company
    && normalizeCompanyKey(record.company) === companyKey
    && isLiveActivityRecord(record)
    && toIsoDate(record.date)
    && toIsoDate(record.date) <= activityDate
  ));
}

function getScorecardMessageFieldName(config, fields = {}) {
  const configured = config.fields.scorecard.linkedInMessages;

  if (configured && Object.prototype.hasOwnProperty.call(fields, configured)) {
    return configured;
  }

  if (Object.prototype.hasOwnProperty.call(fields, "WhatsApp Messages")) {
    return "WhatsApp Messages";
  }

  if (Object.prototype.hasOwnProperty.call(fields, "LinkedIn Messages")) {
    return "LinkedIn Messages";
  }

  return configured || "LinkedIn Messages";
}

async function syncScorecardFromActivity(activity, config, existingActivities = []) {
  const shouldIncrementWhatsApp = isWhatsAppMessageOutcome(activity.outcome);
  const shouldIncrementDream100 = isFirstLiveCompanyTouch(activity, existingActivities);
  const normalizedActivityType = normalizeActivity(activity.activity_type);
  const shouldIncrementMeetings = normalizedActivityType === "meeting";
  const shouldIncrementOffers = normalizedActivityType === "offer";
  const shouldIncrementContracts = normalizedActivityType === "contract_signed";

  if (
    !shouldIncrementWhatsApp
    && !shouldIncrementDream100
    && !shouldIncrementMeetings
    && !shouldIncrementOffers
    && !shouldIncrementContracts
  ) {
    return { updated: false, reason: "not_scorecard_activity" };
  }

  const weekStart = getWeekStart(activity.date);
  if (!weekStart) {
    return { updated: false, reason: "invalid_week" };
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekKey = weekStart;
  const weekLabel = buildWeekLabel(weekStart, weekEnd);
  let existingRecord = null;
  try {
    existingRecord = await findScorecardRecordByWeek(weekStart, config);
  } catch (error) {
    if (error.status === 404) {
      return { updated: false, reason: "missing_scorecard_table" };
    }
    throw error;
  }
  const normalizedExistingRecord = existingRecord ? normalizeScorecardRecord(existingRecord, config) : null;
  const messageFieldName = getScorecardMessageFieldName(config, existingRecord?.fields || {});
  const currentMessages = normalizedExistingRecord?.linkedin_messages || 0;
  const currentDream100 = normalizedExistingRecord?.dream100_p1_prospects || 0;
  const currentMeetings = normalizedExistingRecord?.meetings_set || 0;
  const currentOffers = normalizedExistingRecord?.offers_sent || 0;
  const currentContracts = normalizedExistingRecord?.contracts_signed || 0;
  const currentNewContractWorkersMtd = normalizedExistingRecord?.new_contract_workers_mtd || 0;
  const currentWorkersSigned = normalizedExistingRecord?.workers_signed || 0;
  const nextMessages = currentMessages + (shouldIncrementWhatsApp ? 1 : 0);
  const nextDream100 = currentDream100 + (shouldIncrementDream100 ? 1 : 0);
  const nextMeetings = currentMeetings + (shouldIncrementMeetings ? 1 : 0);
  const nextOffers = currentOffers + (shouldIncrementOffers ? 1 : 0);
  const nextContracts = currentContracts + (shouldIncrementContracts ? 1 : 0);
  const workerDelta = shouldIncrementContracts ? toNumber(activity.workers_delta) : 0;
  const nextNewContractWorkersMtd = currentNewContractWorkersMtd + workerDelta;
  const nextWorkersSigned = currentWorkersSigned + workerDelta;
  const fields = existingRecord
    ? {}
    : {
        [config.fields.scorecard.weekStart]: weekStart,
        [config.fields.scorecard.weekEnd]: weekEnd,
        [config.fields.scorecard.weekKey]: weekKey,
        [config.fields.scorecard.weekLabel]: weekLabel,
      };

  if (shouldIncrementWhatsApp) {
    fields[messageFieldName] = nextMessages;
  }

  if (shouldIncrementDream100) {
    fields[config.fields.scorecard.dream100P1Prospects] = nextDream100;
  }

  if (shouldIncrementMeetings) {
    fields[config.fields.scorecard.meetingsSet] = nextMeetings;
  }

  if (shouldIncrementOffers) {
    fields[config.fields.scorecard.offersSent] = nextOffers;
  }

  if (shouldIncrementContracts) {
    fields[config.fields.scorecard.contractsSigned] = nextContracts;
    if (workerDelta) {
      fields[config.fields.scorecard.newContractWorkersMtd] = nextNewContractWorkersMtd;
      fields[config.fields.scorecard.workersSigned] = nextWorkersSigned;
    }
  }

  let record;

  try {
    record = existingRecord
      ? await updateRecord("scorecard", existingRecord.id, fields)
      : await createRecord("scorecard", fields);
  } catch (error) {
    const fallbackMessageField = messageFieldName === "WhatsApp Messages"
      ? "LinkedIn Messages"
      : "WhatsApp Messages";

    if (!isMissingFieldError(error, messageFieldName)) {
      throw error;
    }

    delete fields[messageFieldName];
    fields[fallbackMessageField] = nextMessages;
    record = existingRecord
      ? await updateRecord("scorecard", existingRecord.id, fields)
      : await createRecord("scorecard", fields);
  }

  return {
    updated: true,
    week_start: weekStart,
    linkedin_messages: shouldIncrementWhatsApp ? nextMessages : currentMessages,
    dream100_p1_prospects: shouldIncrementDream100 ? nextDream100 : currentDream100,
    meetings_set: shouldIncrementMeetings ? nextMeetings : currentMeetings,
    offers_sent: shouldIncrementOffers ? nextOffers : currentOffers,
    contracts_signed: shouldIncrementContracts ? nextContracts : currentContracts,
    new_contract_workers_mtd: workerDelta ? nextNewContractWorkersMtd : currentNewContractWorkersMtd,
    workers_signed: workerDelta ? nextWorkersSigned : currentWorkersSigned,
    metrics_updated: [
      shouldIncrementDream100 ? "dream100_p1_prospects" : "",
      shouldIncrementWhatsApp ? "whatsapp_messages" : "",
      shouldIncrementMeetings ? "meetings_set" : "",
      shouldIncrementOffers ? "offers_sent" : "",
      shouldIncrementContracts ? "contracts_signed" : "",
      workerDelta ? "workers_signed" : "",
    ].filter(Boolean),
    scorecard: normalizeScorecardRecord(record, config),
  };
}

function normalizeScorecardRecord(record, config) {
  const fields = record.fields || {};
  const weekStart = getWeekStart(
    fields[config.fields.scorecard.weekStart]
    || fields[config.fields.scorecard.weekKey]
  );
  const weekEnd = toIsoDate(fields[config.fields.scorecard.weekEnd]) || getWeekEnd(weekStart);
  const weekKey = normalizeString(fields[config.fields.scorecard.weekKey]) || weekStart;
  const weekLabel = normalizeString(fields[config.fields.scorecard.weekLabel]) || buildWeekLabel(weekStart, weekEnd);

  return {
    id: record.id,
    week_start: weekStart,
    week_end: weekEnd,
    week_key: weekKey,
    week_label: weekLabel,
    new_contract_workers_mtd: toNumber(fields[config.fields.scorecard.newContractWorkersMtd]),
    dream100_p1_prospects: toNumber(fields[config.fields.scorecard.dream100P1Prospects]),
    sales_velocity_days: toNumber(fields[config.fields.scorecard.salesVelocityDays]),
    cold_calls: toNumber(fields[config.fields.scorecard.coldCalls]),
    linkedin_messages: toNumber(fields[getScorecardMessageFieldName(config, fields)]),
    field_visits: toNumber(fields[config.fields.scorecard.fieldVisits]),
    warm_outreach: toNumber(fields[config.fields.scorecard.warmOutreach]),
    meetings_set: toNumber(fields[config.fields.scorecard.meetingsSet]),
    offers_sent: toNumber(fields[config.fields.scorecard.offersSent]),
    contracts_signed: toNumber(fields[config.fields.scorecard.contractsSigned]),
    workers_signed: toNumber(fields[config.fields.scorecard.workersSigned]),
    workers_delivered: toNumber(fields[config.fields.scorecard.workersDelivered]),
    notes: normalizeString(fields[config.fields.scorecard.notes]),
  };
}

function normalizeScorecardTrendRecord(record, config) {
  const fields = record.fields || {};
  return {
    id: record.id,
    date: toIsoDate(fields[config.fields.scorecardTrend.date]),
    contacted: toNumber(fields[config.fields.scorecardTrend.contacted]),
    meetings: toNumber(fields[config.fields.scorecardTrend.meetings]),
    offers: toNumber(fields[config.fields.scorecardTrend.offers]),
    contracts: toNumber(fields[config.fields.scorecardTrend.contracts]),
    notes: normalizeString(fields[config.fields.scorecardTrend.notes]),
  };
}

function normalizeLeadMeasureDailyRecord(record, config) {
  const fields = record.fields || {};
  return {
    id: record.id,
    date: toIsoDate(fields[config.fields.leadMeasuresDaily.date]),
    cold_calls: toNumber(fields[config.fields.leadMeasuresDaily.coldCalls]),
    whatsapp_messages: toNumber(fields[config.fields.leadMeasuresDaily.whatsappMessages]),
    field_visits: toNumber(fields[config.fields.leadMeasuresDaily.fieldVisits]),
    warm_outreach: toNumber(fields[config.fields.leadMeasuresDaily.warmOutreach]),
    notes: normalizeString(fields[config.fields.leadMeasuresDaily.notes]),
  };
}

function selectCurrentScorecard(records, config) {
  const currentWeekStart = getCurrentWeekStart(config.timezone);
  const normalized = records
    .map((record) => normalizeScorecardRecord(record, config))
    .filter((record) => record.week_start);

  const sorted = normalized.sort((left, right) => right.week_start.localeCompare(left.week_start));

  return sorted.find((record) => record.week_start === currentWeekStart || record.week_key === currentWeekStart)
    || sorted[0]
    || createEmptyScorecard(config.timezone);
}

function selectTargets(records, config) {
  const currentPeriod = getCurrentPeriod(config.timezone);
  const targetValueFields = [
    config.fields.targets.contacted,
    config.fields.targets.meetings,
    config.fields.targets.offers,
    config.fields.targets.contracts,
    config.fields.targets.movedCompaniesWeekly,
    config.fields.targets.coldCallsDaily,
    config.fields.targets.coldCallsWeekly,
    config.fields.targets.coldCallsMonthly,
    config.fields.targets.whatsappMessagesDaily,
    config.fields.targets.whatsappMessagesWeekly,
    config.fields.targets.whatsappMessagesMonthly,
    config.fields.targets.fieldVisitsDaily,
    config.fields.targets.fieldVisitsWeekly,
    config.fields.targets.fieldVisitsMonthly,
    config.fields.targets.warmOutreachDaily,
    config.fields.targets.warmOutreachWeekly,
    config.fields.targets.warmOutreachMonthly,
  ];
  const normalized = records.map((record) => ({
    data: normalizeTargetsRecord(record, config),
    hasValues: targetValueFields.some((fieldName) => normalizeString(record.fields?.[fieldName]) !== ""),
  }));
  const currentMatches = normalized.filter((record) => record.data.period === currentPeriod);
  const selected = currentMatches.find((record) => record.hasValues)
    || currentMatches[0]
    || normalized.find((record) => record.hasValues)
    || normalized[0];
  return selected?.data || { period: currentPeriod, ...defaultTargets };
}

function findCompanyByName(records, companyName, config) {
  const wanted = normalizeCompanyKey(companyName);

  return records.find((record) => {
    const name = normalizeCompanyKey(record.fields?.[config.fields.companies.company]);
    return name === wanted;
  });
}

function getCompanyLookupFields(config) {
  return uniqFieldNames([
    config.fields.companies.company,
    config.fields.companies.pipelineStage,
    config.fields.companies.accountHealth,
    config.fields.companies.workers,
    config.fields.companies.leadDate,
    config.fields.companies.lastContact,
    config.fields.companies.nextStep,
    config.fields.companies.nextStepDate,
    config.fields.companies.standbyReason,
    config.fields.companies.reactivationDate,
    config.fields.companies.stageChangedDate,
    config.fields.companies.sector,
    config.fields.companies.decisionMaker,
    config.fields.companies.contactPerson,
    config.fields.companies.mobile,
    config.fields.companies.tel,
    config.fields.companies.telContactRang2,
    config.fields.companies.notes,
    config.fields.companies.priorityTier,
    config.fields.companies.icpScore,
    config.fields.companies.painType,
    config.fields.companies.buyingTrigger,
    config.fields.companies.decisionMakerAccess,
    config.fields.companies.objectionCategory,
    config.fields.companies.proofAssetNeeded,
    config.fields.companies.nextStepQuality,
    config.fields.companies.riskOfCooling,
    config.fields.companies.stallReason,
    config.fields.companies.clientActionRequired,
    config.fields.companies.nurtureType,
    config.fields.companies.dashboardFocus,
    config.fields.companies.stallSince,
    config.fields.companies.escalationNeeded,
    config.fields.companies.followUpStatus,
    config.fields.companies.daysSinceLastContact,
  ]);
}

async function findCompanyRecordByName(companyName, config) {
  const companyField = config.fields.companies.company;
  const records = await listRecords("companies", {
    maxRecords: 5,
    view: "",
    filterFormula: buildLowerEqualsFormula(companyField, companyName),
  });
  return findCompanyByName(records, companyName, config) || null;
}

async function findCompanyRecordById(recordId, config) {
  const normalizedId = normalizeString(recordId);
  if (!isAirtableId(normalizedId, "rec")) return null;

  const records = await listRecords("companies", {
    maxRecords: 1,
    view: "",
    filterFormula: buildRecordIdEqualsFormula(normalizedId),
  });

  return records[0] || null;
}

async function findCompanyRecordForPayload(payload, config) {
  const byId = await findCompanyRecordById(payload.id || payload.company_id, config);
  if (byId) return byId;
  return findCompanyRecordByName(payload.company, config);
}

function findContactPriorityByCompany(records, companyName, config, companyNameById = new Map()) {
  const wanted = normalizeString(companyName).toLowerCase();
  return records.find((record) => {
    const name = normalizeContactPriorityRecord(record, config, companyNameById).company.toLowerCase();
    return name === wanted;
  });
}

function getContactPriorityLookupFields(config) {
  return uniqFieldNames([
    config.fields.contactPriority.company,
    config.fields.contactPriority.companyLookup,
    config.fields.contactPriority.pipelineStage,
    config.fields.contactPriority.sector,
    config.fields.contactPriority.lastContact,
    config.fields.contactPriority.decisionMaker,
    config.fields.contactPriority.mobile,
    config.fields.contactPriority.tel,
    config.fields.contactPriority.telContactRang2,
    config.fields.contactPriority.recruitmentSignal,
    config.fields.contactPriority.notes,
  ]);
}

async function findContactPriorityRecordByCompany(companyName, config) {
  const formulas = [];
  if (config.modes.activityCompanyLinked) {
    formulas.push(buildLowerEqualsFormula(config.fields.contactPriority.company, companyName, { arrayJoin: true }));
  } else if (config.fields.contactPriority.company) {
    formulas.push(buildLowerEqualsFormula(config.fields.contactPriority.company, companyName));
  }

  if (!formulas.length) return null;

  const records = await listRecords("contactPriority", {
    maxRecords: 5,
    filterFormula: buildOrFormula(formulas),
  });
  const companyRecords = config.modes.activityCompanyLinked ? await listRecords("companies") : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);

  return findContactPriorityByCompany(records, companyName, config, companyNameById) || null;
}

function getActivityLookupFields(config) {
  return uniqFieldNames([
    config.fields.activities.date,
    config.fields.activities.company,
    config.fields.activities.companyLookup,
    config.fields.activities.type,
    config.fields.activities.outcome,
    config.fields.activities.workers,
    config.fields.activities.nextStep,
    config.fields.activities.nextStepDate,
    config.fields.activities.notes,
  ]);
}

async function findPotentialDuplicateActivities(activity, config) {
  const formulas = [buildEqualsFormula(config.fields.activities.date, toIsoDate(activity.date))];
  if (config.modes.activityCompanyLinked) {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, activity.company, { arrayJoin: true }));
  } else {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, activity.company));
  }

  const records = await listRecords("activities", {
    maxRecords: 20,
    filterFormula: buildAndFormula(formulas),
  });

  return records;
}

async function findActivitiesForCompanyUpToDate(companyName, date, config) {
  const targetDate = toIsoDate(date);
  if (!companyName || !targetDate) return [];

  const formulas = [
    `${airtableFieldRef(config.fields.activities.date)}<=${airtableFormulaString(targetDate)}`,
  ];

  if (config.modes.activityCompanyLinked) {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, companyName, { arrayJoin: true }));
  } else {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, companyName));
  }

  return listRecords("activities", {
    filterFormula: buildAndFormula(formulas),
  });
}

async function findLatestActivityForCompany(companyName, config) {
  if (!companyName) return null;

  const formulas = [];
  if (config.modes.activityCompanyLinked) {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, companyName, { arrayJoin: true }));
  } else {
    formulas.push(buildLowerEqualsFormula(config.fields.activities.company, companyName));
  }

  const records = await listRecords("activities", {
    maxRecords: 1,
    filterFormula: buildAndFormula(formulas),
    sortField: config.fields.activities.date,
    sortDirection: "desc",
  });

  return records[0] || null;
}

async function findActivitiesByDate(date, config) {
  const targetDate = toIsoDate(date);
  if (!targetDate) return [];

  return listRecords("activities", {
    filterFormula: buildEqualsFormula(config.fields.activities.date, targetDate),
  });
}

function dedupeActivityRecords(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    if (!record?.id || seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

async function findTargetsRecordByPeriod(period, config) {
  const records = await listRecords("targets", {
    maxRecords: 5,
    filterFormula: buildEqualsFormula(config.fields.targets.period, period),
  });
  return records.find((record) => normalizeTargetsRecord(record, config).period === period) || null;
}

async function findScorecardRecordByWeek(weekStart, config) {
  const formulas = uniqFieldNames([
    config.fields.scorecard.weekStart ? buildEqualsFormula(config.fields.scorecard.weekStart, weekStart) : "",
    config.fields.scorecard.weekKey ? buildEqualsFormula(config.fields.scorecard.weekKey, weekStart) : "",
  ]);
  const records = await listRecords("scorecard", {
    maxRecords: 5,
    filterFormula: buildOrFormula(formulas),
  });
  return records.find((record) => {
    const normalized = normalizeScorecardRecord(record, config);
    return normalized.week_key === weekStart || normalized.week_start === weekStart;
  }) || null;
}

async function findLeadMeasuresDailyRecordByDate(date, config) {
  const records = await listRecords("leadMeasuresDaily", {
    maxRecords: 5,
    filterFormula: buildEqualsFormula(config.fields.leadMeasuresDaily.date, date),
  });
  return records.find((record) => normalizeLeadMeasureDailyRecord(record, config).date === date) || null;
}

async function findScorecardTrendRecordByDate(date, config) {
  const records = await listRecords("scorecardTrend", {
    maxRecords: 5,
    filterFormula: buildEqualsFormula(config.fields.scorecardTrend.date, date),
  });
  return records.find((record) => normalizeScorecardTrendRecord(record, config).date === date) || null;
}

async function syncContactPriorityFromActivity(activity, config) {
  if (!isLiveActivityRecord(activity)) {
    return { updated: false, reason: "planned_activity" };
  }

  try {
    const matchingRecord = await findContactPriorityRecordByCompany(activity.company, config);

    if (!matchingRecord || !config.fields.contactPriority.lastContact) {
      return { updated: false, reason: "not_found" };
    }

    const existing = normalizeContactPriorityRecord(matchingRecord, config, new Map());
    const nextDate = activity.date ? toIsoDate(activity.date) : "";

    if (!nextDate) {
      return { updated: false, reason: "missing_date" };
    }

    if (existing.last_contact && existing.last_contact >= nextDate) {
      return { updated: false, reason: "already_current" };
    }

    const updated = await updateRecord("contactPriority", matchingRecord.id, {
      [config.fields.contactPriority.lastContact]: nextDate,
    });

    return {
      updated: true,
      record: normalizeContactPriorityRecord(updated, config, new Map()),
    };
  } catch (error) {
    if (error.status === 404) {
      return { updated: false, reason: "table_missing" };
    }
    throw error;
  }
}

async function upsertCompany(payload) {
  const config = getRequiredConfig();
  const companyName = normalizeString(payload.company);

  if (!companyName) {
    throw new AirtableError(400, "Campul company este obligatoriu.");
  }

  const existingRecord = await findCompanyRecordForPayload(
    {
      id: payload.id,
      company_id: payload.company_id,
      company: companyName,
    },
    config
  );
  const existingCompany = existingRecord
    ? normalizeCompanyRecord(existingRecord, config)
    : null;
  const fields = {
    [config.fields.companies.company]: companyName,
  };

  if ("pipeline_stage" in payload && config.fields.companies.pipelineStage) {
    const normalizedPipelineStage = normalizePipelineStage(normalizeString(payload.pipeline_stage));
    fields[config.fields.companies.pipelineStage] = normalizedPipelineStage || null;
    const prevStage = existingCompany?.pipeline_stage || "";
    if (normalizedPipelineStage && normalizedPipelineStage !== prevStage && config.fields.companies.stageChangedDate) {
      fields[config.fields.companies.stageChangedDate] = toIsoDate(new Date());
    }
  }

  if ("account_health" in payload && config.fields.companies.accountHealth) {
    const encodedHealth = encodeAccountHealth(payload.account_health);
    fields[config.fields.companies.accountHealth] = encodedHealth || null;
  }

  const rawWorkers = normalizeString(payload.workers);
  if ("workers" in payload && rawWorkers !== "") {
    fields[config.fields.companies.workers] = toNumber(rawWorkers);
  } else if (!existingRecord) {
    fields[config.fields.companies.workers] = 0;
  }

  if ("lead_date" in payload && config.fields.companies.leadDate) {
    fields[config.fields.companies.leadDate] = payload.lead_date ? toIsoDate(payload.lead_date) : null;
  } else if (!existingRecord && config.fields.companies.leadDate) {
    fields[config.fields.companies.leadDate] = null;
  }

  if ("last_contact" in payload) {
    fields[config.fields.companies.lastContact] = payload.last_contact ? toIsoDate(payload.last_contact) : null;
  } else if (!existingRecord) {
    fields[config.fields.companies.lastContact] = null;
  }

  if ("next_step" in payload) {
    fields[config.fields.companies.nextStep] = normalizeString(payload.next_step);
  } else if (!existingRecord) {
    fields[config.fields.companies.nextStep] = "";
  }

  if ("next_step_date" in payload) {
    fields[config.fields.companies.nextStepDate] = payload.next_step_date ? toIsoDate(payload.next_step_date) : null;
  } else if (!existingRecord) {
    fields[config.fields.companies.nextStepDate] = null;
  }

  if ("standby_reason" in payload && config.fields.companies.standbyReason) {
    const standbyReason = normalizeString(payload.standby_reason);
    fields[config.fields.companies.standbyReason] = standbyReason || null;
  }

  if ("reactivation_date" in payload && config.fields.companies.reactivationDate) {
    fields[config.fields.companies.reactivationDate] = payload.reactivation_date ? toIsoDate(payload.reactivation_date) : null;
  }

  if ("sector" in payload) {
    fields[config.fields.companies.sector] = normalizeString(payload.sector);
  } else if (!existingRecord) {
    fields[config.fields.companies.sector] = "";
  }

  if ("notes" in payload) {
    fields[config.fields.companies.notes] = normalizeString(payload.notes);
  } else if (!existingRecord) {
    fields[config.fields.companies.notes] = "";
  }

  if ("priority_tier" in payload && config.fields.companies.priorityTier) {
    fields[config.fields.companies.priorityTier] = normalizeString(payload.priority_tier) || null;
  }

  if ("risk_of_cooling" in payload && config.fields.companies.riskOfCooling) {
    fields[config.fields.companies.riskOfCooling] = normalizeString(payload.risk_of_cooling) || null;
  }

  if ("dashboard_focus" in payload && config.fields.companies.dashboardFocus) {
    fields[config.fields.companies.dashboardFocus] = normalizeBooleanField(payload.dashboard_focus);
  }

  if ("escalation_needed" in payload && config.fields.companies.escalationNeeded) {
    fields[config.fields.companies.escalationNeeded] = normalizeBooleanField(payload.escalation_needed);
  }

  if ("client_action_required" in payload && config.fields.companies.clientActionRequired) {
    fields[config.fields.companies.clientActionRequired] = normalizeString(payload.client_action_required);
  }

  let record;

  try {
    record = existingRecord
      ? await updateRecord("companies", existingRecord.id, fields)
      : await createRecord("companies", fields);
  } catch (error) {
    const workersField = config.fields.companies.workers;
    const leadDateField = config.fields.companies.leadDate;
    const workersValueProvided = Object.prototype.hasOwnProperty.call(fields, workersField);
    const workersRejected = workersField && error.message?.includes(`Field "${workersField}" cannot accept the provided value`);
    const leadDateMissing = leadDateField && isMissingFieldError(error, leadDateField);

    if (leadDateMissing) {
      delete fields[leadDateField];
      record = existingRecord
        ? await updateRecord("companies", existingRecord.id, fields)
        : await createRecord("companies", fields);
      invalidateAirtableDataCache();
      return normalizeCompanyRecord(record, config);
    }

    if (!workersValueProvided || !workersRejected) {
      throw error;
    }

    try {
      fields[workersField] = rawWorkers;
      record = existingRecord
        ? await updateRecord("companies", existingRecord.id, fields)
        : await createRecord("companies", fields);
    } catch (fallbackError) {
      const leadDateMissingOnFallback = leadDateField && isMissingFieldError(fallbackError, leadDateField);
      const stringWorkersRejected = fallbackError.message?.includes(`Field "${workersField}" cannot accept the provided value`);
      if (leadDateMissingOnFallback) {
        delete fields[leadDateField];
        record = existingRecord
          ? await updateRecord("companies", existingRecord.id, fields)
          : await createRecord("companies", fields);
        invalidateAirtableDataCache();
        return normalizeCompanyRecord(record, config);
      }
      if (!stringWorkersRejected) {
        throw fallbackError;
      }

      delete fields[workersField];
      record = existingRecord
        ? await updateRecord("companies", existingRecord.id, fields)
        : await createRecord("companies", fields);
    }
  }

  invalidateAirtableDataCache();
  return normalizeCompanyRecord(record, config);
}

async function touchCompanyFromActivity(activity) {
  const config = getRequiredConfig();
  const companyName = normalizeString(activity.company);
  const plannedActivity = normalizeActivity(activity.activity_type) === "planned";

  if (!companyName) {
    throw new AirtableError(400, "Activitatea trebuie sa aiba companie.");
  }

  const existingRecord = await findCompanyRecordForPayload(
    {
      id: activity.company_id,
      company_id: activity.company_id,
      company: companyName,
    },
    config
  );
  const existingCompany = existingRecord
    ? normalizeCompanyRecord(existingRecord, config)
    : null;

  const fields = {
    [config.fields.companies.company]: companyName,
  };

  if (!plannedActivity && config.fields.companies.leadDate) {
    const activityLeadDate = activity.date ? toIsoDate(activity.date) : "";
    const existingLeadDate = existingCompany?.lead_date || "";
    if (activityLeadDate && (!existingLeadDate || activityLeadDate < existingLeadDate)) {
      fields[config.fields.companies.leadDate] = activityLeadDate;
    }
  }

  if (!plannedActivity && config.fields.companies.lastContact) {
    const dateCandidates = [existingCompany?.last_contact, activity.date]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());
    const lastContact = dateCandidates[dateCandidates.length - 1] || null;
    fields[config.fields.companies.lastContact] = lastContact ? toIsoDate(lastContact) : null;
  }

  if (activity.next_step) {
    fields[config.fields.companies.nextStep] = normalizeString(activity.next_step);
  }

  if (activity.next_step_date) {
    fields[config.fields.companies.nextStepDate] = activity.next_step_date ? toIsoDate(activity.next_step_date) : null;
  }

  let record;

  try {
    record = existingRecord
      ? await updateRecord("companies", existingRecord.id, fields)
      : await createRecord("companies", fields);
  } catch (error) {
    const leadDateField = config.fields.companies.leadDate;
    if (!leadDateField || !isMissingFieldError(error, leadDateField)) {
      throw error;
    }

    delete fields[leadDateField];
    record = existingRecord
      ? await updateRecord("companies", existingRecord.id, fields)
      : await createRecord("companies", fields);
  }

  return {
    record,
    existing: existingCompany,
    normalized: normalizeCompanyRecord(record, config),
  };
}

async function createActivity(payload) {
  const config = getRequiredConfig();
  const payloadDate = toIsoDate(payload.date);
  const activity = {
    company_id: normalizeString(payload.company_id),
    date: payloadDate,
    company: normalizeString(payload.company),
    activity_type: normalizeActivity(payload.activity_type),
    outcome: normalizeString(payload.outcome),
    workers_delta: toNumber(payload.workers_delta),
    next_step: normalizeString(payload.next_step),
    next_step_date: toIsoDate(payload.next_step_date),
    notes: normalizeString(payload.notes),
  };

  if (!activity.date || !activity.company) {
    throw new AirtableError(400, "Activitatea are nevoie de data si companie.");
  }

  const needsCompanyNameMap = config.modes.activityCompanyLinked;
  const companyRecords = needsCompanyNameMap ? await listRecords("companies") : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const duplicateActivity = await findRecentDuplicateActivity(activity, config);

  if (duplicateActivity) {
    return {
      activity: duplicateActivity,
      company: { company: duplicateActivity.company },
      duplicate: true,
      scorecard_sync: { updated: false, reason: "duplicate_skipped" },
    };
  }

  const touched = await touchCompanyFromActivity(activity);
  const compactActivityRecord = config.modes.compactCompanyActivities
    ? await findLatestActivityForCompany(activity.company, config)
    : null;
  const isLiveActivity = isLiveActivityRecord(activity);
  const knownExistingLeadDate = toIsoDate(touched.existing?.lead_date);
  const shouldLoadCompanyHistory = isLiveActivity && (!knownExistingLeadDate || knownExistingLeadDate >= activity.date);
  const shouldLoadSameDayActivities = isLiveActivity;
  const [companyHistoryRecords, sameDayActivityRecords] = await Promise.all([
    shouldLoadCompanyHistory
      ? findActivitiesForCompanyUpToDate(activity.company, activity.date, config)
      : Promise.resolve([]),
    shouldLoadSameDayActivities
      ? findActivitiesByDate(activity.date, config)
      : Promise.resolve([]),
  ]);
  const existingActivities = dedupeActivityRecords([
    ...companyHistoryRecords,
    ...sameDayActivityRecords,
  ])
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  if (isLiveActivity && knownExistingLeadDate && knownExistingLeadDate < activity.date) {
    existingActivities.push({
      id: `synthetic-prior-touch:${activity.company}:${knownExistingLeadDate}`,
      created_at: null,
      date: knownExistingLeadDate,
      company: activity.company,
      activity_type: "contacted",
      outcome: "",
      workers_delta: 0,
      next_step: "",
      next_step_date: "",
      notes: "",
    });
  }

  const fields = {
    [config.fields.activities.date]: activity.date,
    [config.fields.activities.type]: activity.activity_type,
    [config.fields.activities.workers]: activity.workers_delta,
    [config.fields.activities.notes]: activity.notes,
  };

  if (activity.outcome) {
    fields[config.fields.activities.outcome] = activity.outcome;
  }

  if (activity.next_step) {
    fields[config.fields.activities.nextStep] = activity.next_step;
  }

  if (activity.next_step_date) {
    fields[config.fields.activities.nextStepDate] = activity.next_step_date;
  }

  if (config.modes.activityCompanyLinked) {
    fields[config.fields.activities.company] = [touched.record.id];
  } else {
    fields[config.fields.activities.company] = activity.company;
  }

  const savedCompanyNameById = new Map(companyNameById);
  savedCompanyNameById.set(touched.record.id, touched.normalized.company);
  if (compactActivityRecord) {
    const compactActivity = normalizeActivityRecord(compactActivityRecord, config, savedCompanyNameById);
    fields[config.fields.activities.notes] = appendCompactActivityNotes(compactActivity.notes, activity);
  }

  let savedRecord;

  try {
    savedRecord = compactActivityRecord
      ? await updateRecord("activities", compactActivityRecord.id, fields)
      : await createRecord("activities", fields);
  } catch (error) {
    if (activity.outcome && isInvalidSelectOptionError(error)) {
      throw new AirtableError(
        400,
        `In Airtable, adauga optiunea "${activity.outcome}" in Activities -> Outcome si incearca din nou.`
      );
    }
    throw error;
  }

  let scorecardSync = { updated: false, reason: "not_attempted" };
  let trendSync = { updated: false, reason: "not_attempted" };
  let contactPrioritySync = { updated: false, reason: "not_attempted" };

  try {
    contactPrioritySync = await syncContactPriorityFromActivity(activity, config);
  } catch (error) {
    contactPrioritySync = {
      updated: false,
      reason: "contact_priority_sync_failed",
      message: error.message,
    };
  }

  try {
    scorecardSync = await syncScorecardFromActivity(activity, config, existingActivities);
  } catch (error) {
    scorecardSync = {
      updated: false,
      reason: "scorecard_sync_failed",
      message: error.message,
    };
  }

  try {
    trendSync = await syncScorecardTrendFromActivity(activity, config, existingActivities);
  } catch (error) {
    trendSync = {
      updated: false,
      reason: "trend_sync_failed",
      message: error.message,
    };
  }

  invalidateAirtableDataCache();
  return {
    activity: normalizeActivityRecord(savedRecord, config, savedCompanyNameById),
    company: touched.normalized,
    duplicate: false,
    compacted: Boolean(compactActivityRecord),
    contact_priority_sync: contactPrioritySync,
    scorecard_sync: scorecardSync,
    trend_sync: trendSync,
  };
}

async function upsertTargets(payload) {
  const config = getRequiredConfig();
  const currentPeriod = getCurrentPeriod(config.timezone);
  const existingRecord = await findTargetsRecordByPeriod(currentPeriod, config);

  const fields = {
    [config.fields.targets.period]: payload.period || currentPeriod,
    [config.fields.targets.contacted]: toNumber(payload.contacted),
    [config.fields.targets.meetings]: toNumber(payload.meetings),
    [config.fields.targets.offers]: toNumber(payload.offers),
    [config.fields.targets.contracts]: toNumber(payload.contracts),
    [config.fields.targets.movedCompaniesWeekly]: toNumber(payload.movedCompaniesWeekly),
    [config.fields.targets.coldCallsDaily]: toNumber(payload.coldCallsDaily),
    [config.fields.targets.coldCallsWeekly]: toNumber(payload.coldCallsWeekly),
    [config.fields.targets.coldCallsMonthly]: toNumber(payload.coldCallsMonthly),
    [config.fields.targets.whatsappMessagesDaily]: toNumber(payload.whatsappMessagesDaily),
    [config.fields.targets.whatsappMessagesWeekly]: toNumber(payload.whatsappMessagesWeekly),
    [config.fields.targets.whatsappMessagesMonthly]: toNumber(payload.whatsappMessagesMonthly),
    [config.fields.targets.fieldVisitsDaily]: toNumber(payload.fieldVisitsDaily),
    [config.fields.targets.fieldVisitsWeekly]: toNumber(payload.fieldVisitsWeekly),
    [config.fields.targets.fieldVisitsMonthly]: toNumber(payload.fieldVisitsMonthly),
    [config.fields.targets.warmOutreachDaily]: toNumber(payload.warmOutreachDaily),
    [config.fields.targets.warmOutreachWeekly]: toNumber(payload.warmOutreachWeekly),
    [config.fields.targets.warmOutreachMonthly]: toNumber(payload.warmOutreachMonthly),
  };

  const record = existingRecord
    ? await updateRecord("targets", existingRecord.id, fields)
    : await createRecord("targets", fields);

  invalidateAirtableDataCache();
  return normalizeTargetsRecord(record, config);
}

async function upsertScorecard(payload) {
  const config = getRequiredConfig();
  const weekStart = getWeekStart(payload.week_start || payload.week_key || getCurrentWeekStart(config.timezone));

  if (!weekStart) {
    throw new AirtableError(400, "Scorecard-ul are nevoie de Week Start.");
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekKey = weekStart;
  const weekLabel = buildWeekLabel(weekStart, weekEnd);
  const existingRecord = await findScorecardRecordByWeek(weekStart, config);
  const companyRecords = config.modes.activityCompanyLinked
    ? await listRecords("companies")
    : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const activityRecords = await listRecords("activities", {
    filterFormula: buildDateRangeFormula(config.fields.activities.date, weekStart, weekEnd),
  });
  const activities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  const velocity = calculateSalesVelocityForWindow(activities, weekStart, weekEnd);
  const messageFieldName = getScorecardMessageFieldName(config, existingRecord?.fields || {});
  const messageFieldValue = toNumber(payload.linkedin_messages);

  const fields = {
    [config.fields.scorecard.weekStart]: weekStart,
    [config.fields.scorecard.weekEnd]: weekEnd,
    [config.fields.scorecard.weekKey]: weekKey,
    [config.fields.scorecard.weekLabel]: weekLabel,
    [config.fields.scorecard.newContractWorkersMtd]: toNumber(payload.new_contract_workers_mtd),
    [config.fields.scorecard.dream100P1Prospects]: toNumber(payload.dream100_p1_prospects),
    [config.fields.scorecard.salesVelocityDays]: velocity.averageDays,
    [config.fields.scorecard.coldCalls]: toNumber(payload.cold_calls),
    [messageFieldName]: messageFieldValue,
    [config.fields.scorecard.fieldVisits]: toNumber(payload.field_visits),
    [config.fields.scorecard.warmOutreach]: toNumber(payload.warm_outreach),
    [config.fields.scorecard.meetingsSet]: toNumber(payload.meetings_set),
    [config.fields.scorecard.offersSent]: toNumber(payload.offers_sent),
    [config.fields.scorecard.contractsSigned]: toNumber(payload.contracts_signed),
    [config.fields.scorecard.workersSigned]: toNumber(payload.workers_signed),
    [config.fields.scorecard.workersDelivered]: toNumber(payload.workers_delivered),
    [config.fields.scorecard.notes]: normalizeString(payload.notes),
  };

  const optionalFieldNames = new Set([
    config.fields.scorecard.weekEnd,
    config.fields.scorecard.weekLabel,
    config.fields.scorecard.newContractWorkersMtd,
    config.fields.scorecard.dream100P1Prospects,
    config.fields.scorecard.salesVelocityDays,
    config.fields.scorecard.coldCalls,
    config.fields.scorecard.fieldVisits,
    config.fields.scorecard.warmOutreach,
    config.fields.scorecard.meetingsSet,
    config.fields.scorecard.offersSent,
    config.fields.scorecard.contractsSigned,
    config.fields.scorecard.workersSigned,
    config.fields.scorecard.workersDelivered,
    config.fields.scorecard.notes,
    "WhatsApp Messages",
    "LinkedIn Messages",
  ].filter(Boolean));

  const ignoredFields = [];
  const fallbackMessageField = messageFieldName === "WhatsApp Messages"
    ? "LinkedIn Messages"
    : "WhatsApp Messages";
  let record;
  let activeFields = { ...fields };
  let activeMessageField = messageFieldName;

  for (;;) {
    try {
      record = existingRecord
        ? await updateRecord("scorecard", existingRecord.id, activeFields)
        : await createRecord("scorecard", activeFields);
      break;
    } catch (error) {
      if (
        activeMessageField
        && isMissingFieldError(error, activeMessageField)
        && Object.prototype.hasOwnProperty.call(activeFields, activeMessageField)
        && fallbackMessageField
        && fallbackMessageField !== activeMessageField
      ) {
        delete activeFields[activeMessageField];
        activeFields[fallbackMessageField] = messageFieldValue;
        activeMessageField = fallbackMessageField;
        continue;
      }

      const unknownFieldName = getUnknownFieldName(error);
      if (
        unknownFieldName
        && optionalFieldNames.has(unknownFieldName)
        && Object.prototype.hasOwnProperty.call(activeFields, unknownFieldName)
      ) {
        delete activeFields[unknownFieldName];
        ignoredFields.push(unknownFieldName);
        continue;
      }

      throw error;
    }
  }

  invalidateAirtableDataCache();
  return {
    ...withComputedSalesVelocity(normalizeScorecardRecord(record, config), activities),
    ignored_fields: ignoredFields,
  };
}

async function upsertLeadMeasuresDaily(payload) {
  const config = getRequiredConfig();
  const date = toIsoDate(payload.date || new Date());

  if (!date) {
    throw new AirtableError(400, "Lead Measures Daily are nevoie de Data.");
  }

  const existingRecord = await findLeadMeasuresDailyRecordByDate(date, config);

  const fields = {
    [config.fields.leadMeasuresDaily.date]: date,
    [config.fields.leadMeasuresDaily.coldCalls]: toNumber(payload.cold_calls),
    [config.fields.leadMeasuresDaily.whatsappMessages]: toNumber(payload.whatsapp_messages),
    [config.fields.leadMeasuresDaily.fieldVisits]: toNumber(payload.field_visits),
    [config.fields.leadMeasuresDaily.warmOutreach]: toNumber(payload.warm_outreach),
    [config.fields.leadMeasuresDaily.notes]: normalizeString(payload.notes),
  };

  const record = existingRecord
    ? await updateRecord("leadMeasuresDaily", existingRecord.id, fields)
    : await createRecord("leadMeasuresDaily", fields);

  invalidateAirtableDataCache();
  return normalizeLeadMeasureDailyRecord(record, config);
}

async function upsertScorecardTrend(payload) {
  const config = getRequiredConfig();
  const date = toIsoDate(payload.date || new Date());

  if (!date) {
    throw new AirtableError(400, "Trendul zilnic are nevoie de Data.");
  }

  const existingRecord = await findScorecardTrendRecordByDate(date, config);

  const fields = {
    [config.fields.scorecardTrend.date]: date,
    [config.fields.scorecardTrend.contacted]: toNumber(payload.contacted),
    [config.fields.scorecardTrend.meetings]: toNumber(payload.meetings),
    [config.fields.scorecardTrend.offers]: toNumber(payload.offers),
    [config.fields.scorecardTrend.contracts]: toNumber(payload.contracts),
    [config.fields.scorecardTrend.notes]: normalizeString(payload.notes),
  };

  const record = existingRecord
    ? await updateRecord("scorecardTrend", existingRecord.id, fields)
    : await createRecord("scorecardTrend", fields);

  invalidateAirtableDataCache();
  return normalizeScorecardTrendRecord(record, config);
}

async function syncScorecardTrendFromActivity(activity, config, existingActivities = []) {
  const date = toIsoDate(activity.date);
  if (!date || !isLiveActivityRecord(activity)) {
    return { updated: false, reason: "not_trend_activity" };
  }

  try {
    const existingRecord = await findScorecardTrendRecordByDate(date, config);
    const normalizedRecord = existingRecord
      ? normalizeScorecardTrendRecord(existingRecord, config)
      : { notes: "" };
    const nextCounts = countActivitiesForTrend(
      [...existingActivities, activity].filter((record) => toIsoDate(record.date) === date)
    );

    const fields = {
      [config.fields.scorecardTrend.date]: date,
      [config.fields.scorecardTrend.contacted]: nextCounts.contacted,
      [config.fields.scorecardTrend.meetings]: nextCounts.meetings,
      [config.fields.scorecardTrend.offers]: nextCounts.offers,
      [config.fields.scorecardTrend.contracts]: nextCounts.contracts,
      [config.fields.scorecardTrend.notes]: normalizeString(normalizedRecord.notes),
    };

    const record = existingRecord
      ? await updateRecord("scorecardTrend", existingRecord.id, fields)
      : await createRecord("scorecardTrend", fields);

    return {
      updated: true,
      date,
      counts: nextCounts,
      trend: normalizeScorecardTrendRecord(record, config),
    };
  } catch (error) {
    if (error.status === 404) {
      return { updated: false, reason: "missing_scorecard_trend_table" };
    }
    throw error;
  }
}

function buildConnectionPayload(config, schemaReferences, debug = {}) {
  return {
    baseId: config.baseId || "",
    timezone: config.timezone,
    tables: config.tables,
    views: config.views,
    tableIds: schemaReferences.tableIds,
    viewIds: schemaReferences.viewIds,
    activityCompanyLinked: config.modes.activityCompanyLinked,
    debug,
  };
}

function buildUnconfiguredDashboardData(config = getAirtableConfig()) {
  const currentPeriod = getCurrentPeriod(config.timezone);
  const schemaReferences = getConfiguredSchemaReferences(config);
  return {
    configured: false,
    companies: [],
    contactPriority: [],
    activities: [],
    targets: { period: currentPeriod, ...defaultTargets },
    dailyScores: [],
    leadMeasuresDaily: [],
    scorecards: [],
    scorecard: createEmptyScorecard(config.timezone),
    connection: buildConnectionPayload(config, schemaReferences),
    warnings: ["Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID in Vercel Environment Variables."],
  };
}

async function getActivitiesData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return [];
  }

  return readAirtableDataCache(config, "activities", async () => {
    const activityRecords = await listRecords("activities");
    let companyNameById = new Map();

    const needsLinkedCompanyResolution = activityRecords.some((record) => (
      Array.isArray(record?.fields?.[config.fields.activities.company])
    ));

    if (needsLinkedCompanyResolution) {
      const companyRecords = await listRecords("companies");
      companyNameById = buildCompanyNameMap(companyRecords, config);
    }

    return activityRecords
      .map((record) => normalizeActivityRecord(record, config, companyNameById))
      .filter((record) => record.company && record.date);
  }, options);
}

async function getCompaniesData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return [];
  }

  return readAirtableDataCache(config, "companies", async () => {
    const [companyRecords, activities] = await Promise.all([
      listRecords("companies"),
      getActivitiesData(options),
    ]);
    const companies = companyRecords
      .map((record) => normalizeCompanyRecord(record, config))
      .filter((record) => record.company);
    const derivedLeadDates = buildLeadDateIndex(activities);
    return companies.map((company) => ({
      ...company,
      lead_date: company.lead_date || derivedLeadDates.get(normalizeCompanyKey(company.company)) || "",
    }));
  }, options);
}

async function getContactPriorityData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return [];
  }

  return readAirtableDataCache(config, "contactPriority", async () => {
    try {
      const [companies, contactPriorityRecords] = await Promise.all([
        getCompaniesData(options),
        listRecords("contactPriority"),
      ]);
      const companyNameById = new Map(
        (Array.isArray(companies) ? companies : []).map((company) => [company.id, company.company])
      );
      return contactPriorityRecords
        .map((record, index) => normalizeContactPriorityRecord(record, config, companyNameById, index))
        .filter((record) => record.company);
    } catch (error) {
      return [];
    }
  }, options);
}

async function getTargetsData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return { period: getCurrentPeriod(config.timezone), ...defaultTargets };
  }

  return readAirtableDataCache(config, "targets", async () => {
    try {
      const targetRecords = await listRecords("targets");
      return selectTargets(targetRecords, config);
    } catch (error) {
      if (error.status === 404) {
        return { period: getCurrentPeriod(config.timezone), ...defaultTargets };
      }
      throw error;
    }
  }, options);
}

async function getScorecardData(options = {}) {
  const config = getAirtableConfig();
  const currentWeekStart = getCurrentWeekStart(config.timezone);
  const includeComputedVelocity = options.includeComputedVelocity !== false;
  if (!isConfigured(config)) {
    return {
      scorecards: [],
      scorecard: createEmptyScorecard(config.timezone),
    };
  }

  return readAirtableDataCache(config, "scorecard", async () => {
    let scorecardRecords = [];
    try {
      scorecardRecords = await listRecords("scorecard");
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const activities = includeComputedVelocity ? await getActivitiesData(options) : [];
    const scorecards = scorecardRecords
      .map((record) => normalizeScorecardRecord(record, config))
      .map((record) => includeComputedVelocity ? withComputedSalesVelocity(record, activities) : record)
      .filter((record) => record.week_start)
      .sort((left, right) => right.week_start.localeCompare(left.week_start));
    const scorecard = scorecards.find((record) => record.week_start === currentWeekStart)
      || scorecards[0]
      || (includeComputedVelocity
        ? withComputedSalesVelocity(createEmptyScorecard(config.timezone), activities)
        : createEmptyScorecard(config.timezone));

    return { scorecards, scorecard };
  }, options);
}

async function getScorecardTrendData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return [];
  }

  return readAirtableDataCache(config, "scorecardTrend", async () => {
    try {
      const scorecardTrendRecords = await listRecords("scorecardTrend");
      return scorecardTrendRecords
        .map((record) => normalizeScorecardTrendRecord(record, config))
        .filter((record) => record.date)
        .sort((left, right) => right.date.localeCompare(left.date));
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }, options);
}

async function getLeadMeasuresDailyData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return [];
  }

  return readAirtableDataCache(config, "leadMeasuresDaily", async () => {
    try {
      const leadMeasureDailyRecords = await listRecords("leadMeasuresDaily");
      return leadMeasureDailyRecords
        .map((record) => normalizeLeadMeasureDailyRecord(record, config))
        .filter((record) => record.date)
        .sort((left, right) => right.date.localeCompare(left.date));
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }, options);
}

async function getDashboardData(options = {}) {
  const config = getAirtableConfig();
  const currentWeekStart = getCurrentWeekStart(config.timezone);

  if (!isConfigured(config)) {
    return buildUnconfiguredDashboardData(config);
  }

  return readAirtableDataCache(config, "dashboard", async () => {
    const warnings = [];
    const companyRecords = await listRecords("companies");
    const activityRecords = await listRecords("activities");
    let contactPriorityRecords = [];
    let targetRecords = [];
    let scorecardRecords = [];
    let scorecardTrendRecords = [];
    let leadMeasureDailyRecords = [];

    try {
      contactPriorityRecords = await listRecords("contactPriority");
    } catch (error) {
      warnings.push(optionalTableWarning("Contact Priority", error));
    }

    try {
      targetRecords = await listRecords("targets");
    } catch (error) {
      if (error.status !== 404) throw error;
      warnings.push("Tabela Targets nu a fost gasita. Dashboard-ul ruleaza cu target-urile implicite.");
    }

    try {
      scorecardRecords = await listRecords("scorecard");
    } catch (error) {
      if (error.status === 404) {
        warnings.push("Tabela Scorecard nu a fost gasita. Creeaza tabela Scorecard pentru noua pagina 4DX.");
      } else {
        throw error;
      }
    }

    try {
      scorecardTrendRecords = await listRecords("scorecardTrend");
    } catch (error) {
      if (error.status === 404) {
        warnings.push("Tabela Scorecard Trend nu a fost gasita. Trendul zilnic foloseste fallback din Activities.");
      } else {
        warnings.push(optionalTableWarning("Scorecard Trend", error));
      }
    }

    try {
      leadMeasureDailyRecords = await listRecords("leadMeasuresDaily");
    } catch (error) {
      if (error.status === 404) {
        warnings.push("Tabela Lead Measures Daily nu a fost gasita. Cardul Key Lead Measures asteapta tabela noua.");
      } else {
        warnings.push(optionalTableWarning("Lead Measures Daily", error));
      }
    }

    const schemaReferences = await resolveSchemaReferences(config, warnings);
    const companyNameById = buildCompanyNameMap(companyRecords, config);
    const companies = companyRecords
      .map((record) => normalizeCompanyRecord(record, config))
      .filter((record) => record.company);
    const contactPriority = contactPriorityRecords
      .map((record, index) => normalizeContactPriorityRecord(record, config, companyNameById, index))
      .filter((record) => record.company);
    const activities = activityRecords
      .map((record) => normalizeActivityRecord(record, config, companyNameById))
      .filter((record) => record.company && record.date);
    const derivedLeadDates = buildLeadDateIndex(activities);
    const hydratedCompanies = companies.map((company) => ({
      ...company,
      lead_date: company.lead_date || derivedLeadDates.get(normalizeCompanyKey(company.company)) || "",
    }));
    const targets = selectTargets(targetRecords, config);
    const scorecards = scorecardRecords
      .map((record) => normalizeScorecardRecord(record, config))
      .map((record) => withComputedSalesVelocity(record, activities))
      .filter((record) => record.week_start)
      .sort((left, right) => right.week_start.localeCompare(left.week_start));
    const dailyScores = scorecardTrendRecords
      .map((record) => normalizeScorecardTrendRecord(record, config))
      .filter((record) => record.date)
      .sort((left, right) => right.date.localeCompare(left.date));
    const leadMeasuresDaily = leadMeasureDailyRecords
      .map((record) => normalizeLeadMeasureDailyRecord(record, config))
      .filter((record) => record.date)
      .sort((left, right) => right.date.localeCompare(left.date));
    const scorecard = scorecards.find((record) => record.week_start === currentWeekStart)
      || scorecards[0]
      || withComputedSalesVelocity(createEmptyScorecard(config.timezone), activities);

    return {
      configured: true,
      companies: hydratedCompanies,
      contactPriority,
      activities,
      targets,
      dailyScores,
      leadMeasuresDaily,
      scorecards,
      scorecard,
      connection: buildConnectionPayload(config, schemaReferences, {
        rawCounts: {
          companies: companyRecords.length,
          contactPriority: contactPriorityRecords.length,
          activities: activityRecords.length,
        },
        rawSamples: {
          contactPriorityFieldNames: contactPriorityRecords[0] ? Object.keys(contactPriorityRecords[0].fields || {}) : [],
        },
      }),
      warnings,
    };
  }, options);
}

async function getConnectionData(options = {}) {
  const config = getAirtableConfig();
  if (!isConfigured(config)) {
    return buildUnconfiguredDashboardData(config).connection;
  }

  return readAirtableDataCache(config, "connection", async () => {
    const references = await resolveSchemaReferences(config, []);
    return buildConnectionPayload(config, references);
  }, options);
}

async function getTelegramProfileData(selection = {}, options = {}) {
  const config = getAirtableConfig();
  const currentWeekStart = getCurrentWeekStart(config.timezone);

  if (!isConfigured(config)) {
    const base = buildUnconfiguredDashboardData(config);
    return {
      connection: base.connection,
      companies: [],
      activities: [],
      contactPriority: [],
      targets: selection.targets ? base.targets : {},
      leadMeasuresDaily: [],
      scorecard: selection.scorecard ? base.scorecard : {},
      scorecards: [],
      warnings: base.warnings || [],
    };
  }

  const scope = `telegram:${JSON.stringify(selection)}`;
  return readAirtableDataCache(config, scope, async () => {
    const warnings = [];
    const needActivities = Boolean(selection.activities || selection.scorecard);
    const resolveActivityCompany = selection.resolveActivityCompany !== false;
    const needCompanies = Boolean(
      selection.companies
      || selection.contactPriority
      || (needActivities && resolveActivityCompany)
    );
    const activityRange = selection.activityRange || {};
    const leadMeasuresRange = selection.leadMeasuresRange || {};
    const jobs = [];

    jobs.push(["schemaReferences", resolveSchemaReferences(config, warnings)]);

    if (needCompanies) {
      jobs.push(["companyRecords", listRecords("companies")]);
    }

    if (needActivities) {
      const activityOptions = {};

      if (activityRange.start && activityRange.end) {
        activityOptions.filterFormula = buildDateRangeFormula(
          config.fields.activities.date,
          activityRange.start,
          activityRange.end
        );
      }

      jobs.push(["activityRecords", listRecords("activities", activityOptions)]);
    }

    if (selection.contactPriority) {
      jobs.push(["contactPriorityRecords", listRecords("contactPriority").catch((error) => {
        warnings.push(optionalTableWarning("Contact Priority", error));
        return [];
      })]);
    }

    if (selection.targets) {
      jobs.push(["targetRecords", listRecords("targets").catch((error) => {
        if (error.status !== 404) throw error;
        warnings.push("Tabela Targets nu a fost gasita. Dashboard-ul ruleaza cu target-urile implicite.");
        return [];
      })]);
    }

    if (selection.leadMeasuresDaily) {
      const leadMeasureOptions = {};
      if (leadMeasuresRange.start && leadMeasuresRange.end) {
        leadMeasureOptions.filterFormula = buildDateRangeFormula(
          config.fields.leadMeasuresDaily.date,
          leadMeasuresRange.start,
          leadMeasuresRange.end
        );
      }

      jobs.push(["leadMeasureDailyRecords", listRecords("leadMeasuresDaily", leadMeasureOptions).catch((error) => {
        if (error.status !== 404) throw error;
        warnings.push("Tabela Lead Measures Daily nu a fost gasita. Cardul Key Lead Measures asteapta tabela noua.");
        return [];
      })]);
    }

    if (selection.scorecard) {
      jobs.push(["scorecardRecords", listRecords("scorecard").catch((error) => {
        if (error.status !== 404) throw error;
        warnings.push("Tabela Scorecard nu a fost gasita. Creeaza tabela Scorecard pentru noua pagina 4DX.");
        return [];
      })]);
    }

    const loaded = Object.fromEntries(await Promise.all(
      jobs.map(async ([key, promise]) => [key, await promise])
    ));

    const companyRecords = loaded.companyRecords || [];
    const activityRecords = loaded.activityRecords || [];
    const companyNameById = needCompanies ? buildCompanyNameMap(companyRecords, config) : new Map();
    const activities = needActivities
      ? activityRecords
        .map((record) => normalizeActivityRecord(record, config, companyNameById))
        .filter((record) => record.date && (resolveActivityCompany ? record.company : true))
      : [];

    const derivedLeadDates = needCompanies && needActivities && resolveActivityCompany
      ? buildLeadDateIndex(activities)
      : new Map();
    const companies = selection.companies
      ? companyRecords
        .map((record) => normalizeCompanyRecord(record, config))
        .filter((record) => record.company)
        .map((company) => ({
          ...company,
          lead_date: company.lead_date || derivedLeadDates.get(normalizeCompanyKey(company.company)) || "",
        }))
      : [];

    const contactPriority = selection.contactPriority
      ? (loaded.contactPriorityRecords || [])
        .map((record, index) => normalizeContactPriorityRecord(record, config, companyNameById, index))
        .filter((record) => record.company)
      : [];

    const targets = selection.targets
      ? selectTargets(loaded.targetRecords || [], config)
      : {};

    const leadMeasuresDaily = selection.leadMeasuresDaily
      ? (loaded.leadMeasureDailyRecords || [])
        .map((record) => normalizeLeadMeasureDailyRecord(record, config))
        .filter((record) => record.date)
        .sort((left, right) => right.date.localeCompare(left.date))
      : [];

    let scorecard = {};
    let scorecards = [];
    if (selection.scorecard) {
      scorecards = (loaded.scorecardRecords || [])
        .map((record) => normalizeScorecardRecord(record, config))
        .map((record) => withComputedSalesVelocity(record, activities))
        .filter((record) => record.week_start)
        .sort((left, right) => right.week_start.localeCompare(left.week_start));
      scorecard = scorecards.find((record) => record.week_start === currentWeekStart)
        || scorecards[0]
        || withComputedSalesVelocity(createEmptyScorecard(config.timezone), activities);
    }

    return {
      connection: buildConnectionPayload(config, loaded.schemaReferences || getConfiguredSchemaReferences(config)),
      companies,
      activities: selection.activities ? activities : [],
      contactPriority,
      targets,
      leadMeasuresDaily,
      scorecard,
      scorecards,
      warnings,
    };
  }, options);
}

module.exports = {
  AirtableError,
  createActivity,
  getActivitiesData,
  getCompaniesData,
  getConnectionData,
  getContactPriorityData,
  getDashboardData,
  getLeadMeasuresDailyData,
  getScorecardData,
  getScorecardTrendData,
  getTelegramProfileData,
  getTargetsData,
  invalidateAirtableDataCache,
  upsertCompany,
  upsertScorecard,
  upsertScorecardTrend,
  upsertLeadMeasuresDaily,
  upsertTargets,
};
