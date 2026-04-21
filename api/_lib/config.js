const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
};

function readEnv(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function readBoolean(name, fallback = false) {
  const value = readEnv(name, "");
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getAirtableConfig() {
  return {
    token: readEnv("AIRTABLE_TOKEN"),
    baseId: readEnv("AIRTABLE_BASE_ID"),
    timezone: readEnv("AIRTABLE_TIMEZONE", "Europe/Chisinau"),
    tables: {
      companies: readEnv("AIRTABLE_TABLE_COMPANIES", "Companies"),
      activities: readEnv("AIRTABLE_TABLE_ACTIVITIES", "Activities"),
      targets: readEnv("AIRTABLE_TABLE_TARGETS", "Targets"),
      scorecard: readEnv("AIRTABLE_TABLE_SCORECARD", "Scorecard"),
      scorecardTrend: readEnv("AIRTABLE_TABLE_SCORECARD_TREND", "Scorecard Trend"),
    },
    views: {
      companies: readEnv("AIRTABLE_VIEW_COMPANIES"),
      activities: readEnv("AIRTABLE_VIEW_ACTIVITIES"),
      targets: readEnv("AIRTABLE_VIEW_TARGETS"),
      scorecard: readEnv("AIRTABLE_VIEW_SCORECARD"),
      scorecardTrend: readEnv("AIRTABLE_VIEW_SCORECARD_TREND"),
    },
    fields: {
      companies: {
        company: readEnv("AIRTABLE_FIELD_COMPANY_NAME", "Company"),
        status: readEnv("AIRTABLE_FIELD_COMPANY_STATUS", ""),
        pipelineStage: readEnv("AIRTABLE_FIELD_COMPANY_PIPELINE_STAGE", "Stadiu Pipeline"),
        accountHealth: readEnv("AIRTABLE_FIELD_COMPANY_ACCOUNT_HEALTH", "Sanatate Cont"),
        workers: readEnv("AIRTABLE_FIELD_COMPANY_WORKERS", "Potential Workers"),
        leadDate: readEnv("AIRTABLE_FIELD_COMPANY_LEAD_DATE", "Lead Date"),
        lastContact: readEnv("AIRTABLE_FIELD_COMPANY_LAST_CONTACT", "Last Contact"),
        nextStep: readEnv("AIRTABLE_FIELD_COMPANY_NEXT_STEP", "Next Step"),
        nextStepDate: readEnv("AIRTABLE_FIELD_COMPANY_NEXT_STEP_DATE", "Next Step Date"),
        stageChangedDate: readEnv("AIRTABLE_FIELD_COMPANY_STAGE_CHANGED_DATE", "Data Schimbare Stadiu"),
        sector: readEnv("AIRTABLE_FIELD_COMPANY_SECTOR", "Sector"),
        notes: readEnv("AIRTABLE_FIELD_COMPANY_NOTES", "Notes"),
      },
      activities: {
        date: readEnv("AIRTABLE_FIELD_ACTIVITY_DATE", "Date"),
        company: readEnv("AIRTABLE_FIELD_ACTIVITY_COMPANY", "Company"),
        companyLookup: readEnv("AIRTABLE_FIELD_ACTIVITY_COMPANY_LOOKUP", "Company Name"),
        type: readEnv("AIRTABLE_FIELD_ACTIVITY_TYPE", "Activity Type"),
        outcome: readEnv("AIRTABLE_FIELD_ACTIVITY_OUTCOME", "Outcome"),
        workers: readEnv("AIRTABLE_FIELD_ACTIVITY_WORKERS", "Workers Delta"),
        nextStep: readEnv("AIRTABLE_FIELD_ACTIVITY_NEXT_STEP", "Next Step"),
        nextStepDate: readEnv("AIRTABLE_FIELD_ACTIVITY_NEXT_STEP_DATE", "Next Step Date"),
        notes: readEnv("AIRTABLE_FIELD_ACTIVITY_NOTES", "Notes"),
      },
      targets: {
        period: readEnv("AIRTABLE_FIELD_TARGET_PERIOD", "Month"),
        contacted: readEnv("AIRTABLE_FIELD_TARGET_CONTACTED", "Contacted Target"),
        meetings: readEnv("AIRTABLE_FIELD_TARGET_MEETINGS", "Meetings Target"),
        offers: readEnv("AIRTABLE_FIELD_TARGET_OFFERS", "Offers Target"),
        contracts: readEnv("AIRTABLE_FIELD_TARGET_CONTRACTS", "Contracts Target"),
      },
      scorecard: {
        weekStart: readEnv("AIRTABLE_FIELD_SCORECARD_WEEK_START", "Week Start"),
        weekEnd: readEnv("AIRTABLE_FIELD_SCORECARD_WEEK_END", "Week End"),
        weekKey: readEnv("AIRTABLE_FIELD_SCORECARD_WEEK_KEY", "Week Key"),
        weekLabel: readEnv("AIRTABLE_FIELD_SCORECARD_WEEK_LABEL", "Week Label"),
        newContractWorkersMtd: readEnv("AIRTABLE_FIELD_SCORECARD_NEW_CONTRACT_WORKERS_MTD", "New Contract Workers MTD"),
        dream100P1Prospects: readEnv("AIRTABLE_FIELD_SCORECARD_DREAM100_P1_PROSPECTS", "Dream100 P1 Prospects"),
        salesVelocityDays: readEnv("AIRTABLE_FIELD_SCORECARD_SALES_VELOCITY_DAYS", "Sales Velocity Days"),
        coldCalls: readEnv("AIRTABLE_FIELD_SCORECARD_COLD_CALLS", "Cold Calls"),
        linkedInMessages: readEnv("AIRTABLE_FIELD_SCORECARD_LINKEDIN_MESSAGES", "LinkedIn Messages"),
        fieldVisits: readEnv("AIRTABLE_FIELD_SCORECARD_FIELD_VISITS", "Field Visits"),
        meetingsSet: readEnv("AIRTABLE_FIELD_SCORECARD_MEETINGS_SET", "Meetings Set"),
        offersSent: readEnv("AIRTABLE_FIELD_SCORECARD_OFFERS_SENT", "Offers Sent"),
        contractsSigned: readEnv("AIRTABLE_FIELD_SCORECARD_CONTRACTS_SIGNED", "Contracts Signed"),
        workersSigned: readEnv("AIRTABLE_FIELD_SCORECARD_WORKERS_SIGNED", "Workers Signed"),
        workersDelivered: readEnv("AIRTABLE_FIELD_SCORECARD_WORKERS_DELIVERED", "Workers Delivered"),
        notes: readEnv("AIRTABLE_FIELD_SCORECARD_NOTES", "Notes"),
      },
      scorecardTrend: {
        date: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_DATE", "Date"),
        contacted: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_CONTACTED", "Contacted"),
        meetings: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_MEETINGS", "Meetings"),
        offers: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_OFFERS", "Offers"),
        contracts: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_CONTRACTS", "Contracts"),
        notes: readEnv("AIRTABLE_FIELD_SCORECARD_TREND_NOTES", "Notes"),
      },
    },
    modes: {
      activityCompanyLinked: readBoolean("AIRTABLE_ACTIVITY_COMPANY_LINKED", false),
    },
  };
}

function isConfigured(config = getAirtableConfig()) {
  return Boolean(config.token && config.baseId);
}

module.exports = {
  defaultTargets,
  getAirtableConfig,
  isConfigured,
};
