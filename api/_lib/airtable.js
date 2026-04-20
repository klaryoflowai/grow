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

function normalizeCompanyRecord(record, config) {
  const fields = record.fields || {};
  const pipelineStageField = config.fields.companies.pipelineStage;
  const rawStage = normalizeString(pipelineStageField ? fields[pipelineStageField] : "");

  return {
    id: record.id,
    company: normalizeString(fields[config.fields.companies.company]),
    pipeline_stage: normalizePipelineStage(rawStage),
    account_health: decodeAccountHealth(
      config.fields.companies.accountHealth ? fields[config.fields.companies.accountHealth] : ""
    ),
    workers: toNumber(fields[config.fields.companies.workers]),
    last_contact: toIsoDate(fields[config.fields.companies.lastContact]),
    next_step: normalizeString(fields[config.fields.companies.nextStep]),
    next_step_date: toIsoDate(fields[config.fields.companies.nextStepDate]),
    stage_changed_date: toIsoDate(
      config.fields.companies.stageChangedDate ? fields[config.fields.companies.stageChangedDate] : ""
    ),
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
    meetings_set: 0,
    offers_sent: 0,
    contracts_signed: 0,
    workers_signed: 0,
    workers_delivered: 0,
    notes: "",
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
    linkedin_messages: toNumber(fields[config.fields.scorecard.linkedInMessages]),
    field_visits: toNumber(fields[config.fields.scorecard.fieldVisits]),
    meetings_set: toNumber(fields[config.fields.scorecard.meetingsSet]),
    offers_sent: toNumber(fields[config.fields.scorecard.offersSent]),
    contracts_signed: toNumber(fields[config.fields.scorecard.contractsSigned]),
    workers_signed: toNumber(fields[config.fields.scorecard.workersSigned]),
    workers_delivered: toNumber(fields[config.fields.scorecard.workersDelivered]),
    notes: normalizeString(fields[config.fields.scorecard.notes]),
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
    const normalizedPipelineStage = normalizePipelineStage(normalizeString(payload.pipeline_stage));
    fields[config.fields.companies.pipelineStage] = normalizedPipelineStage || null;
    const prevStage = existingCompany?.pipeline_stage || "";
    if (normalizedPipelineStage && normalizedPipelineStage !== prevStage && config.fields.companies.stageChangedDate) {
      fields[config.fields.companies.stageChangedDate] = toIsoDate(new Date());
    }
  } else if (!existingRecord && config.fields.companies.pipelineStage) {
    fields[config.fields.companies.pipelineStage] = "";
  }

  if ("account_health" in payload && config.fields.companies.accountHealth) {
    const encodedHealth = encodeAccountHealth(payload.account_health);
    fields[config.fields.companies.accountHealth] = encodedHealth || null;
  } else if (!existingRecord && config.fields.companies.accountHealth) {
    fields[config.fields.companies.accountHealth] = "";
  }

  const rawWorkers = normalizeString(payload.workers);
  if ("workers" in payload && rawWorkers !== "") {
    fields[config.fields.companies.workers] = toNumber(rawWorkers);
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

  let record;

  try {
    record = existingRecord
      ? await updateRecord("companies", existingRecord.id, fields)
      : await createRecord("companies", fields);
  } catch (error) {
    const workersField = config.fields.companies.workers;
    const workersValueProvided = Object.prototype.hasOwnProperty.call(fields, workersField);
    const workersRejected = workersField && error.message?.includes(`Field "${workersField}" cannot accept the provided value`);

    if (!workersValueProvided || !workersRejected) {
      throw error;
    }

    try {
      fields[workersField] = rawWorkers;
      record = existingRecord
        ? await updateRecord("companies", existingRecord.id, fields)
        : await createRecord("companies", fields);
    } catch (fallbackError) {
      const stringWorkersRejected = fallbackError.message?.includes(`Field "${workersField}" cannot accept the provided value`);
      if (!stringWorkersRejected) {
        throw fallbackError;
      }

      delete fields[workersField];
      record = existingRecord
        ? await updateRecord("companies", existingRecord.id, fields)
        : await createRecord("companies", fields);
    }
  }

  return normalizeCompanyRecord(record, config);
}

async function touchCompanyFromActivity(activity) {
  const config = getRequiredConfig();
  const companyName = normalizeString(activity.company);
  const plannedActivity = normalizeActivity(activity.activity_type) === "planned";

  if (!companyName) {
    throw new AirtableError(400, "Activitatea trebuie sa aiba companie.");
  }

  const companyRecords = await listRecords("companies");
  const existingRecord = findCompanyByName(companyRecords, companyName, config);
  const existingCompany = existingRecord
    ? normalizeCompanyRecord(existingRecord, config)
    : null;
  const existingStage = existingCompany?.pipeline_stage || "";
  const nextPipelineStage = plannedActivity
    ? existingStage
    : mergePipelineStage(existingStage, activity.activity_type);

  const fields = {
    [config.fields.companies.company]: companyName,
  };

  if (!plannedActivity && config.fields.companies.lastContact) {
    const dateCandidates = [existingCompany?.last_contact, activity.date].filter(Boolean).sort();
    const lastContact = dateCandidates[dateCandidates.length - 1] || "";
    fields[config.fields.companies.lastContact] = lastContact || null;
  }

  if (!plannedActivity && config.fields.companies.pipelineStage) {
    fields[config.fields.companies.pipelineStage] = nextPipelineStage || null;
    if (nextPipelineStage && nextPipelineStage !== existingStage && config.fields.companies.stageChangedDate) {
      fields[config.fields.companies.stageChangedDate] = toIsoDate(new Date());
    }
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const payloadDate = toIsoDate(payload.date);
  const activity = {
    date: payloadDate === todayIso ? new Date().toISOString() : payloadDate,
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

async function upsertScorecard(payload) {
  const config = getRequiredConfig();
  const weekStart = getWeekStart(payload.week_start || payload.week_key || getCurrentWeekStart(config.timezone));

  if (!weekStart) {
    throw new AirtableError(400, "Scorecard-ul are nevoie de Week Start.");
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekKey = weekStart;
  const weekLabel = buildWeekLabel(weekStart, weekEnd);
  const scorecardRecords = await listRecords("scorecard");
  const existingRecord = scorecardRecords.find((record) => {
    const normalized = normalizeScorecardRecord(record, config);
    return normalized.week_key === weekKey || normalized.week_start === weekStart;
  });

  const fields = {
    [config.fields.scorecard.weekStart]: weekStart,
    [config.fields.scorecard.weekEnd]: weekEnd,
    [config.fields.scorecard.weekKey]: weekKey,
    [config.fields.scorecard.weekLabel]: weekLabel,
    [config.fields.scorecard.newContractWorkersMtd]: toNumber(payload.new_contract_workers_mtd),
    [config.fields.scorecard.dream100P1Prospects]: toNumber(payload.dream100_p1_prospects),
    [config.fields.scorecard.salesVelocityDays]: toNumber(payload.sales_velocity_days),
    [config.fields.scorecard.coldCalls]: toNumber(payload.cold_calls),
    [config.fields.scorecard.linkedInMessages]: toNumber(payload.linkedin_messages),
    [config.fields.scorecard.fieldVisits]: toNumber(payload.field_visits),
    [config.fields.scorecard.meetingsSet]: toNumber(payload.meetings_set),
    [config.fields.scorecard.offersSent]: toNumber(payload.offers_sent),
    [config.fields.scorecard.contractsSigned]: toNumber(payload.contracts_signed),
    [config.fields.scorecard.workersSigned]: toNumber(payload.workers_signed),
    [config.fields.scorecard.workersDelivered]: toNumber(payload.workers_delivered),
    [config.fields.scorecard.notes]: normalizeString(payload.notes),
  };

  const record = existingRecord
    ? await updateRecord("scorecard", existingRecord.id, fields)
    : await createRecord("scorecard", fields);

  return normalizeScorecardRecord(record, config);
}
async function getDashboardData() {
  const config = getAirtableConfig();
  const currentPeriod = getCurrentPeriod(config.timezone);
  const currentWeekStart = getCurrentWeekStart(config.timezone);

  if (!isConfigured(config)) {
    return {
      configured: false,
      companies: [],
      activities: [],
      targets: { period: currentPeriod, ...defaultTargets },
      scorecards: [],
      scorecard: createEmptyScorecard(config.timezone),
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
  let scorecardRecords = [];

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

  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const companies = companyRecords
    .map((record) => normalizeCompanyRecord(record, config))
    .filter((record) => record.company);
  const activities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  const targets = selectTargets(targetRecords, config);
  const scorecards = scorecardRecords
    .map((record) => normalizeScorecardRecord(record, config))
    .filter((record) => record.week_start)
    .sort((left, right) => right.week_start.localeCompare(left.week_start));
  const scorecard = scorecards.find((record) => record.week_start === currentWeekStart)
    || scorecards[0]
    || createEmptyScorecard(config.timezone);

  return {
    configured: true,
    companies,
    activities,
    targets,
    scorecards,
    scorecard,
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
  upsertScorecard,
  upsertTargets,
};
