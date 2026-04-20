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
    },
    views: {
      companies: readEnv("AIRTABLE_VIEW_COMPANIES"),
      activities: readEnv("AIRTABLE_VIEW_ACTIVITIES"),
      targets: readEnv("AIRTABLE_VIEW_TARGETS"),
      scorecard: readEnv("AIRTABLE_VIEW_SCORECARD"),
    },
    fields: {
      companies: {
        company: readEnv("AIRTABLE_FIELD_COMPANY_NAME", "Company"),
        status: readEnv("AIRTABLE_FIELD_COMPANY_STATUS", ""),
        pipelineStage: readEnv("AIRTABLE_FIELD_COMPANY_PIPELINE_STAGE", "Stadiu Pipeline"),
        accountHealth: readEnv("AIRTABLE_FIELD_COMPANY_ACCOUNT_HEALTH", "Sanatate Cont"),
        workers: readEnv("AIRTABLE_FIELD_COMPANY_WORKERS", "Potential Workers"),
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
        type: readEnv("AIRTABLE_FIELD_SCORECARD_TYPE", "Tip"),
        date: readEnv("AIRTABLE_FIELD_SCORECARD_DATE", "Data"),
        targetContacted: readEnv("AIRTABLE_FIELD_SCORECARD_TARGET_CONTACTED", "Target Contactate"),
        targetMeetings: readEnv("AIRTABLE_FIELD_SCORECARD_TARGET_MEETINGS", "Target Meetings"),
        targetOffers: readEnv("AIRTABLE_FIELD_SCORECARD_TARGET_OFFERS", "Target Oferte"),
        targetContracts: readEnv("AIRTABLE_FIELD_SCORECARD_TARGET_CONTRACTS", "Target Contracte"),
        contacted: readEnv("AIRTABLE_FIELD_SCORECARD_CONTACTED", "Contactate"),
        meetings: readEnv("AIRTABLE_FIELD_SCORECARD_MEETINGS", "Meetings"),
        offers: readEnv("AIRTABLE_FIELD_SCORECARD_OFFERS", "Oferte"),
        contracts: readEnv("AIRTABLE_FIELD_SCORECARD_CONTRACTS", "Contracte"),
        workers: readEnv("AIRTABLE_FIELD_SCORECARD_WORKERS", "Muncitori"),
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
