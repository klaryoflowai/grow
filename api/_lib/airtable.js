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

function isInvalidSelectOptionError(error) {
  const message = normalizeString(error?.message).toLowerCase();
  return (
    message.includes("select option")
    || message.includes("multiple choice")
    || message.includes("choice")
  );
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
    lead_date: toIsoDate(
      config.fields.companies.leadDate ? fields[config.fields.companies.leadDate] : ""
    ),
    last_contact: toIsoDate(fields[config.fields.companies.lastContact]),
    next_step: normalizeString(fields[config.fields.companies.nextStep]),
    next_step_date: toIsoDate(fields[config.fields.companies.nextStepDate]),
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
    notes: normalizeString(fields[config.fields.companies.notes]),
  };
}

function resolveContactPriorityCompany(fields, config, companyNameById) {
  const direct = fields[config.fields.contactPriority.company];
  if (typeof direct === "string") return normalizeString(direct);

  const lookupField = config.fields.contactPriority.companyLookup;
  if (lookupField) {
    const lookupValue = fields[lookupField];
    const lookupString = normalizeString(Array.isArray(lookupValue) ? lookupValue[0] : lookupValue);
    if (lookupString) return lookupString;
  }

  if (Array.isArray(direct)) {
    const resolved = direct.map((id) => companyNameById.get(id)).find(Boolean);
    if (resolved) return resolved;
  }

  return normalizeString(direct);
}

function normalizeContactPriorityRecord(record, config, companyNameById, position = 0) {
  const fields = record.fields || {};
  return {
    id: record.id,
    position,
    rank: toNumber(fields[config.fields.contactPriority.rank]) || position + 1,
    company: resolveContactPriorityCompany(fields, config, companyNameById),
    sector: normalizeString(fields[config.fields.contactPriority.sector]),
    last_contact: toIsoDate(
      config.fields.contactPriority.lastContact ? fields[config.fields.contactPriority.lastContact] : ""
    ),
    decision_maker: normalizeString(
      config.fields.contactPriority.decisionMaker ? fields[config.fields.contactPriority.decisionMaker] : ""
    ),
    mobile: normalizeString(
      config.fields.contactPriority.mobile ? fields[config.fields.contactPriority.mobile] : ""
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
    created_at: normalizeString(record.createdTime),
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

async function findRecentDuplicateActivity(activity, config) {
  const duplicateWindowMs = 5 * 60 * 1000;
  const companyRecords = config.modes.activityCompanyLinked ? await listRecords("companies") : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const activityRecords = await listRecords("activities");
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
  return {
    id: record.id,
    period: normalizePeriod(fields[config.fields.targets.period], config.timezone),
    contacted: toNumber(fields[config.fields.targets.contacted]),
    meetings: toNumber(fields[config.fields.targets.meetings]),
    offers: toNumber(fields[config.fields.targets.offers]),
    contracts: toNumber(fields[config.fields.targets.contracts]),
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

  if (!shouldIncrementWhatsApp && !shouldIncrementDream100) {
    return { updated: false, reason: "not_scorecard_activity" };
  }

  let scorecardRecords = [];
  try {
    scorecardRecords = await listRecords("scorecard");
  } catch (error) {
    if (error.status === 404) {
      return { updated: false, reason: "missing_scorecard_table" };
    }
    throw error;
  }

  const weekStart = getWeekStart(activity.date);
  if (!weekStart) {
    return { updated: false, reason: "invalid_week" };
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekKey = weekStart;
  const weekLabel = buildWeekLabel(weekStart, weekEnd);
  const existingRecord = scorecardRecords.find((record) => {
    const normalized = normalizeScorecardRecord(record, config);
    return normalized.week_key === weekKey || normalized.week_start === weekStart;
  });
  const normalizedExistingRecord = existingRecord ? normalizeScorecardRecord(existingRecord, config) : null;
  const messageFieldName = getScorecardMessageFieldName(config, existingRecord?.fields || {});
  const currentMessages = normalizedExistingRecord?.linkedin_messages || 0;
  const currentDream100 = normalizedExistingRecord?.dream100_p1_prospects || 0;
  const nextMessages = currentMessages + (shouldIncrementWhatsApp ? 1 : 0);
  const nextDream100 = currentDream100 + (shouldIncrementDream100 ? 1 : 0);
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
    metrics_updated: [
      shouldIncrementDream100 ? "dream100_p1_prospects" : "",
      shouldIncrementWhatsApp ? "whatsapp_messages" : "",
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

function findContactPriorityByCompany(records, companyName, config, companyNameById = new Map()) {
  const wanted = normalizeString(companyName).toLowerCase();
  return records.find((record) => {
    const name = normalizeContactPriorityRecord(record, config, companyNameById).company.toLowerCase();
    return name === wanted;
  });
}

async function syncContactPriorityFromActivity(activity, config) {
  if (!isLiveActivityRecord(activity)) {
    return { updated: false, reason: "planned_activity" };
  }

  try {
    const companyRecords = await listRecords("companies");
    const companyNameById = buildCompanyNameMap(companyRecords, config);
    const priorityRecords = await listRecords("contactPriority");
    const matchingRecord = findContactPriorityByCompany(priorityRecords, activity.company, config, companyNameById);

    if (!matchingRecord || !config.fields.contactPriority.lastContact) {
      return { updated: false, reason: "not_found" };
    }

    const existing = normalizeContactPriorityRecord(matchingRecord, config, companyNameById);
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
      record: normalizeContactPriorityRecord(updated, config, companyNameById),
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
    normalized: normalizeCompanyRecord(record, config),
  };
}

async function createActivity(payload) {
  const config = getRequiredConfig();
  const payloadDate = toIsoDate(payload.date);
  const activity = {
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

  const companyRecords = config.modes.activityCompanyLinked ? await listRecords("companies") : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const activityRecords = await listRecords("activities");
  const existingActivities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);

  const duplicateActivity = existingActivities.find((record) => {
    if (!record.created_at) return false;
    if (!isSameActivityFingerprint(record, activity)) return false;
    const duplicateWindowMs = 5 * 60 * 1000;
    const now = new Date();
    return Math.abs(now.getTime() - record.created_at.getTime()) <= duplicateWindowMs;
  }) || null;

  if (duplicateActivity) {
    return {
      activity: duplicateActivity,
      company: { company: duplicateActivity.company },
      duplicate: true,
      scorecard_sync: { updated: false, reason: "duplicate_skipped" },
    };
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

  let createdRecord;

  try {
    createdRecord = await createRecord("activities", fields);
  } catch (error) {
    if (activity.outcome && isInvalidSelectOptionError(error)) {
      throw new AirtableError(
        400,
        `In Airtable, adauga optiunea "${activity.outcome}" in Activities -> Outcome si incearca din nou.`
      );
    }
    throw error;
  }

  const createdCompanyNameById = new Map([[touched.record.id, touched.normalized.company]]);
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

  return {
    activity: normalizeActivityRecord(createdRecord, config, createdCompanyNameById),
    company: touched.normalized,
    duplicate: false,
    contact_priority_sync: contactPrioritySync,
    scorecard_sync: scorecardSync,
    trend_sync: trendSync,
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
  const companyRecords = config.modes.activityCompanyLinked ? await listRecords("companies") : [];
  const companyNameById = buildCompanyNameMap(companyRecords, config);
  const activityRecords = await listRecords("activities");
  const activities = activityRecords
    .map((record) => normalizeActivityRecord(record, config, companyNameById))
    .filter((record) => record.company && record.date);
  const velocity = calculateSalesVelocityForWindow(activities, weekStart, weekEnd);
  const existingRecord = scorecardRecords.find((record) => {
    const normalized = normalizeScorecardRecord(record, config);
    return normalized.week_key === weekKey || normalized.week_start === weekStart;
  });
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
    fields[fallbackMessageField] = messageFieldValue;
    record = existingRecord
      ? await updateRecord("scorecard", existingRecord.id, fields)
      : await createRecord("scorecard", fields);
  }

  return withComputedSalesVelocity(normalizeScorecardRecord(record, config), activities);
}

async function upsertLeadMeasuresDaily(payload) {
  const config = getRequiredConfig();
  const date = toIsoDate(payload.date || new Date());

  if (!date) {
    throw new AirtableError(400, "Lead Measures Daily are nevoie de Data.");
  }

  const leadMeasureRecords = await listRecords("leadMeasuresDaily");
  const existingRecord = leadMeasureRecords.find((record) => {
    const normalized = normalizeLeadMeasureDailyRecord(record, config);
    return normalized.date === date;
  });

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

  return normalizeLeadMeasureDailyRecord(record, config);
}

async function upsertScorecardTrend(payload) {
  const config = getRequiredConfig();
  const date = toIsoDate(payload.date || new Date());

  if (!date) {
    throw new AirtableError(400, "Trendul zilnic are nevoie de Data.");
  }

  const trendRecords = await listRecords("scorecardTrend");
  const existingRecord = trendRecords.find((record) => {
    const normalized = normalizeScorecardTrendRecord(record, config);
    return normalized.date === date;
  });

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

  return normalizeScorecardTrendRecord(record, config);
}

async function syncScorecardTrendFromActivity(activity, config, existingActivities = []) {
  const date = toIsoDate(activity.date);
  if (!date || !isLiveActivityRecord(activity)) {
    return { updated: false, reason: "not_trend_activity" };
  }

  let trendRecords = [];
  try {
    trendRecords = await listRecords("scorecardTrend");
  } catch (error) {
    if (error.status === 404) {
      return { updated: false, reason: "missing_scorecard_trend_table" };
    }
    throw error;
  }

  const existingRecord = trendRecords.find((record) => {
    const normalized = normalizeScorecardTrendRecord(record, config);
    return normalized.date === date;
  });
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
}

async function getDashboardData() {
  const config = getAirtableConfig();
  const currentPeriod = getCurrentPeriod(config.timezone);
  const currentWeekStart = getCurrentWeekStart(config.timezone);

  if (!isConfigured(config)) {
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
      connection: {
        baseId: config.baseId || "",
        timezone: config.timezone,
        tables: config.tables,
        views: config.views,
        activityCompanyLinked: config.modes.activityCompanyLinked,
      },
      warnings: ["Lipsesc AIRTABLE_TOKEN sau AIRTABLE_BASE_ID in Vercel Environment Variables."],
    };
  }

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
    if (error.status !== 404) throw error;
    warnings.push("Tabela Contact Priority nu a fost gasita. Blocul A-List din Telegram ramane gol.");
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
      throw error;
    }
  }

  try {
    leadMeasureDailyRecords = await listRecords("leadMeasuresDaily");
  } catch (error) {
    if (error.status === 404) {
      warnings.push("Tabela Lead Measures Daily nu a fost gasita. Cardul Key Lead Measures asteapta tabela noua.");
    } else {
      throw error;
    }
  }

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
    connection: {
      baseId: config.baseId,
      timezone: config.timezone,
      tables: config.tables,
      views: config.views,
      activityCompanyLinked: config.modes.activityCompanyLinked,
      debug: {
        rawCounts: {
          companies: companyRecords.length,
          contactPriority: contactPriorityRecords.length,
          activities: activityRecords.length,
        },
        rawSamples: {
          contactPriorityFieldNames: contactPriorityRecords[0] ? Object.keys(contactPriorityRecords[0].fields || {}) : [],
        },
      },
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
  upsertScorecardTrend,
  upsertLeadMeasuresDaily,
  upsertTargets,
};
