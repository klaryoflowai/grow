const { defaultTargets, getAirtableConfig, isConfigured } = require("./config");
const {
  getCurrentPeriod,
  normalizeActivity,
  normalizePeriod,
  normalizeStatus,
  normalizeString,
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

async function listRecords(tableKey) {
  const config = getRequiredConfig();
  const table = config.tables[tableKey];
  const view = config.views[tableKey];
  const records = [];
  let offset = "";

  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    if (view) params.set("view", view);

    const payload = await airtableRequest(config, table, { params });
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset);

  return records;
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
  "Necontactat": 0,
  "Incercam sa ajungem la decident": 1,
  "Discutie initiata": 2,
  "Meeting programat": 3,
  "Meeting tinut": 4,
  "Oferta trimisa": 5,
  Negociere: 6,
  "Asteapta decizie": 7,
  "Contract semnat": 8,
  Parcat: -1,
  Pierdut: -2,
};

const lockedPipelineStages = new Set(["Contract semnat", "Parcat", "Pierdut"]);

function statusToPipelineStage(status = "") {
  const normalized = normalizeStatus(status);
  const mapping = {
    new: "Necontactat",
    contacted: "Discutie initiata",
    meeting: "Meeting tinut",
    offer: "Oferta trimisa",
    contract_signed: "Contract semnat",
    lost: "Pierdut",
  };
  return mapping[normalized] || "";
}

function activityToPipelineStage(activityType = "") {
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

function normalizeCompanyRecord(record, config) {
  const fields = record.fields || {};
  const pipelineStageField = config.fields.companies.pipelineStage;
  const statusField = config.fields.companies.status;
  const pipelineStage = normalizeString(pipelineStageField ? fields[pipelineStageField] : "")
    || statusToPipelineStage(statusField ? fields[statusField] : "");

  return {
    id: record.id,
    company: normalizeString(fields[config.fields.companies.company]),
    pipeline_stage: pipelineStage,
    account_health: normalizeString(
      config.fields.companies.accountHealth ? fields[config.fields.companies.accountHealth] : ""
    ),
    workers: toNumber(fields[config.fields.companies.workers]),
    last_contact: toIsoDate(fields[config.fields.companies.lastContact]),
    next_step: normalizeString(fields[config.fields.companies.nextStep]),
    next_step_date: toIsoDate(fields[config.fields.companies.nextStepDate]),
    sector: normalizeString(fields[config.fields.companies.sector]),
    notes: normalizeString(fields[config.fields.companies.notes]),
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

function normalizeTargetsRecord(record, config) {
  const fields = record.fields || {};
  return {
    id: record.id,
    period: normalizePeriod(fields[config.fields.targets.period], config.timezone),
    contacted: toNumber(fields[config.fields.targets.contacted]),
    meetings: toNumber(fields[config.fields.targets.meetings]),
    offers: toNumber(fields[config.fields.targets.offers]),
    contracts: toNumber(fields[config.fields.targets.contracts]),
  };
}

function selectTargets(records, config) {
  const currentPeriod = getCurrentPeriod(config.timezone);
  const normalized = records.map((record) => normalizeTargetsRecord(record, config));
  return normalized.find((record) => record.period === currentPeriod)
    || normalized[0]
    || { period: currentPeriod, ...defaultTargets };
}

function findCompanyByName(records, companyName, config) {
  const wanted = normalizeString(companyName).toLowerCase();

  return records.find((record) => {
    const name = normalizeString(record.fields?.[config.fields.companies.company]).toLowerCase();
    return name === wanted;
  });
}

async function upsertCompany(payload) {
  const config = getRequiredConfig();
  const companyName = normalizeString(payload.company);

  if (!companyName) {
    throw new AirtableError(400, "Campul company este obligatoriu.");
  }

  const companyRecords = await listRecords("companies");
  const existingRecord = findCompanyByName(companyRecords, companyName, config);
  const existingCompany = existingRecord
    ? normalizeCompanyRecord(existingRecord, config)
    : null;
  const fields = {
    [config.fields.companies.company]: companyName,
  };

  if ("pipeline_stage" in payload && config.fields.companies.pipelineStage) {
    fields[config.fields.companies.pipelineStage] = normalizeString(payload.pipeline_stage);
  } else if (!existingRecord && config.fields.companies.pipelineStage) {
    fields[config.fields.companies.pipelineStage] = "";
  }

  if ("account_health" in payload && config.fields.companies.accountHealth) {
    fields[config.fields.companies.accountHealth] = normalizeString(payload.account_health);
  } else if (!existingRecord && config.fields.companies.accountHealth) {
    fields[config.fields.companies.accountHealth] = "";
  }

  if ("status" in payload && config.fields.companies.status) {
    fields[config.fields.companies.status] = normalizeStatus(payload.status || "contacted");
  }

  if ("workers" in payload && payload.workers !== "") {
    fields[config.fields.companies.workers] = toNumber(payload.workers);
  } else if (!existingRecord) {
    fields[config.fields.companies.workers] = 0;
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

  const record = existingRecord
    ? await updateRecord("companies", existingRecord.id, fields)
    : await createRecord("companies", fields);

  return normalizeCompanyRecord(record, config);
}

async function touchCompanyFromActivity(activity) {
  const config = getRequiredConfig();
  const companyName = normalizeString(activity.company);

  if (!companyName) {
    throw new AirtableError(400, "Activitatea trebuie sa aiba companie.");
  }

  const companyRecords = await listRecords("companies");
  const existingRecord = findCompanyByName(companyRecords, companyName, config);
  const existingCompany = existingRecord
    ? normalizeCompanyRecord(existingRecord, config)
    : null;
  const existingStage = existingCompany?.pipeline_stage || "";
  const nextPipelineStage = mergePipelineStage(existingStage, activity.activity_type);

  const dateCandidates = [existingCompany?.last_contact, activity.date].filter(Boolean).sort();
  const lastContact = dateCandidates[dateCandidates.length - 1] || "";

  const fields = {
    [config.fields.companies.company]: companyName,
    [config.fields.companies.lastContact]: lastContact || null,
  };

  if (config.fields.companies.pipelineStage) {
    fields[config.fields.companies.pipelineStage] = nextPipelineStage;
  }

  if (config.fields.companies.status) {
    fields[config.fields.companies.status] = normalizeStatus(activity.activity_type);
  }

  if (activity.next_step) {
    fields[config.fields.companies.nextStep] = normalizeString(activity.next_step);
  }

  if (activity.next_step_date) {
    fields[config.fields.companies.nextStepDate] = activity.next_step_date ? toIsoDate(activity.next_step_date) : null;
  }

  const record = existingRecord
    ? await updateRecord("companies", existingRecord.id, fields)
    : await createRecord("companies", fields);

  return {
    record,
    normalized: normalizeCompanyRecord(record, config),
  };
}

async function createActivity(payload) {
  const config = getRequiredConfig();
  const activity = {
    date: toIsoDate(payload.date),
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

  const touched = await touchCompanyFromActivity(activity);

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

  const createdRecord = await createRecord("activities", fields);
  const companyNameById = new Map([[touched.record.id, touched.normalized.company]]);

  return {
    activity: normalizeActivityRecord(createdRecord, config, companyNameById),
    company: touched.normalized,
  };
}

async function upsertTargets(payload) {
  const config = getRequiredConfig();
  const currentPeriod = getCurrentPeriod(config.timezone);
  const targetRecords = await listRecords("targets");
  const existingRecord = targetRecords.find((record) => {
    const period = normalizeTargetsRecord(record, config).period;
    return period === currentPeriod;
  });

  const fields = {
    [config.fields.targets.period]: payload.period || currentPeriod,
    [config.fields.targets.contacted]: toNumber(payload.contacted),
    [config.fields.targets.meetings]: toNumber(payload.meetings),
    [config.fields.targets.offers]: toNumber(payload.offers),
    [config.fields.targets.contracts]: toNumber(payload.contracts),
  };

  const record = existingRecord
    ? await updateRecord("targets", existingRecord.id, fields)
    : await createRecord("targets", fields);

  return normalizeTargetsRecord(record, config);
}

async function getDashboardData() {
  const config = getAirtableConfig();
  const currentPeriod = getCurrentPeriod(config.timezone);

  if (!isConfigured(config)) {
    return {
      configured: false,
      companies: [],
      activities: [],
      targets: { period: currentPeriod, ...defaultTargets },
      connection: {
        baseId: config.baseId || "",
        timezone: config.timezone,
        tables: config.tables,
        activityCompanyLinked: config.modes.activityCompanyLinked,
      },
      warnings: ["Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID in Vercel Environment Variables."],
    };
  }

  const warnings = [];
  const companyRecords = await listRecords("companies");
  const activityRecords = await listRecords("activities");
  let targetRecords = [];

  try {
    targetRecords = await listRecords("targets");
  } catch (error) {
    if (error.status === 404) {
      warnings.push("Tabela Targets nu a fost gasita. Dashboard-ul ruleaza cu target-urile implicite.");
    } else {
      throw error;
    }
  }

  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const companies = companyRecords
    .map((record) => normalizeCompanyRecord(record, config))
    .filter((record) => record.company);
  const activities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  const targets = selectTargets(targetRecords, config);

  return {
    configured: true,
    companies,
    activities,
    targets,
    connection: {
      baseId: config.baseId,
      timezone: config.timezone,
      tables: config.tables,
      activityCompanyLinked: config.modes.activityCompanyLinked,
    },
    warnings,
  };
}

module.exports = {
  AirtableError,
  createActivity,
  getDashboardData,
  upsertCompany,
  upsertTargets,
};
