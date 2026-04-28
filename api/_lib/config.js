const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
  movedCompaniesWeekly: 35,
  coldCallsDaily: 10,
  coldCallsWeekly: 50,
  coldCallsMonthly: 200,
  whatsappMessagesDaily: 20,
  whatsappMessagesWeekly: 100,
  whatsappMessagesMonthly: 400,
  fieldVisitsDaily: 5,
  fieldVisitsWeekly: 10,
  fieldVisitsMonthly: 40,
  warmOutreachDaily: 2,
  warmOutreachWeekly: 10,
  warmOutreachMonthly: 40,
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
      contactPriority: readEnv("AIRTABLE_TABLE_CONTACT_PRIORITY", "Contact Priority"),
      activities: readEnv("AIRTABLE_TABLE_ACTIVITIES", "Activities"),
      targets: readEnv("AIRTABLE_TABLE_TARGETS", "Targets"),
      scorecard: readEnv("AIRTABLE_TABLE_SCORECARD", "Scorecard"),
      scorecardTrend: readEnv("AIRTABLE_TABLE_SCORECARD_TREND", "Scorecard Trend"),
      leadMeasuresDaily: readEnv("AIRTABLE_TABLE_LEAD_MEASURES_DAILY", "Lead Measures Daily"),
    },
    views: {
      companies: readEnv("AIRTABLE_VIEW_COMPANIES"),
      contactPriority: readEnv("AIRTABLE_VIEW_CONTACT_PRIORITY"),
      activities: readEnv("AIRTABLE_VIEW_ACTIVITIES"),
      targets: readEnv("AIRTABLE_VIEW_TARGETS"),
      scorecard: readEnv("AIRTABLE_VIEW_SCORECARD"),
      scorecardTrend: readEnv("AIRTABLE_VIEW_SCORECARD_TREND"),
      leadMeasuresDaily: readEnv("AIRTABLE_VIEW_LEAD_MEASURES_DAILY"),
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
        standbyReason: readEnv("AIRTABLE_FIELD_COMPANY_STANDBY_REASON", "Motiv standby"),
        reactivationDate: readEnv("AIRTABLE_FIELD_COMPANY_REACTIVATION_DATE", "Data reactivare"),
        stageChangedDate: readEnv("AIRTABLE_FIELD_COMPANY_STAGE_CHANGED_DATE", "Data Schimbare Stadiu"),
        sector: readEnv("AIRTABLE_FIELD_COMPANY_SECTOR", "Sector"),
        notes: readEnv("AIRTABLE_FIELD_COMPANY_NOTES", "Notes"),
      },
      contactPriority: {
        rank: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_RANK", "Number"),
        company: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_COMPANY", "Copmany"),
        companyLookup: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_COMPANY_LOOKUP", "Company Name"),
        sector: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_SECTOR", "Sector"),
        lastContact: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_LAST_CONTACT", "Last contact"),
        decisionMaker: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_DECISION_MAKER", "Factor decizie"),
        mobile: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_MOBILE", "Mobil"),
        recruitmentSignal: readEnv(
          "AIRTABLE_FIELD_CONTACT_PRIORITY_RECRUITMENT_SIGNAL",
          "Recrutare (Anunțuri Active) (from Copmany)"
        ),
        notes: readEnv("AIRTABLE_FIELD_CONTACT_PRIORITY_NOTES", "Notes"),
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
        movedCompaniesWeekly: readEnv("AIRTABLE_FIELD_TARGET_MOVED_COMPANIES_WEEKLY", "Moved Companies Weekly"),
        coldCallsDaily: readEnv("AIRTABLE_FIELD_TARGET_COLD_CALLS_DAILY", "Cold Calls Daily"),
        coldCallsWeekly: readEnv("AIRTABLE_FIELD_TARGET_COLD_CALLS_WEEKLY", "Cold Calls Weekly"),
        coldCallsMonthly: readEnv("AIRTABLE_FIELD_TARGET_COLD_CALLS_MONTHLY", "Cold Calls Monthly"),
        whatsappMessagesDaily: readEnv("AIRTABLE_FIELD_TARGET_WHATSAPP_MESSAGES_DAILY", "WhatsApp Messages Daily"),
        whatsappMessagesWeekly: readEnv("AIRTABLE_FIELD_TARGET_WHATSAPP_MESSAGES_WEEKLY", "WhatsApp Messages Weekly"),
        whatsappMessagesMonthly: readEnv("AIRTABLE_FIELD_TARGET_WHATSAPP_MESSAGES_MONTHLY", "WhatsApp Messages Monthly"),
        fieldVisitsDaily: readEnv("AIRTABLE_FIELD_TARGET_FIELD_VISITS_DAILY", "Field Visits Daily"),
        fieldVisitsWeekly: readEnv("AIRTABLE_FIELD_TARGET_FIELD_VISITS_WEEKLY", "Field Visits Weekly"),
        fieldVisitsMonthly: readEnv("AIRTABLE_FIELD_TARGET_FIELD_VISITS_MONTHLY", "Field Visits Monthly"),
        warmOutreachDaily: readEnv("AIRTABLE_FIELD_TARGET_WARM_OUTREACH_DAILY", "Warm Outreach Daily"),
        warmOutreachWeekly: readEnv("AIRTABLE_FIELD_TARGET_WARM_OUTREACH_WEEKLY", "Warm Outreach Weekly"),
        warmOutreachMonthly: readEnv("AIRTABLE_FIELD_TARGET_WARM_OUTREACH_MONTHLY", "Warm Outreach Monthly"),
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
        linkedInMessages: readEnv(
          "AIRTABLE_FIELD_SCORECARD_WHATSAPP_MESSAGES",
          readEnv("AIRTABLE_FIELD_SCORECARD_LINKEDIN_MESSAGES", "LinkedIn Messages")
        ),
        fieldVisits: readEnv("AIRTABLE_FIELD_SCORECARD_FIELD_VISITS", "Field Visits"),
        warmOutreach: readEnv("AIRTABLE_FIELD_SCORECARD_WARM_OUTREACH", "Warm Outreach"),
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
      leadMeasuresDaily: {
        date: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_DATE", "Date"),
        coldCalls: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_COLD_CALLS", "Cold Calls"),
        whatsappMessages: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_WHATSAPP_MESSAGES", "WhatsApp Messages"),
        fieldVisits: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_FIELD_VISITS", "Field Visits"),
        warmOutreach: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_WARM_OUTREACH", "Warm Outreach"),
        notes: readEnv("AIRTABLE_FIELD_LEAD_MEASURES_DAILY_NOTES", "Notes"),
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
