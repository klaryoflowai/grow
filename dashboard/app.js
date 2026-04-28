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

const scorecardTargets = {
  powerThree: {
    newContractWorkersMtd: 100,
    dream100P1Prospects: 50,
    salesVelocityDays: 21,
  },
  leadMeasures: {
    outreach: 50,
    fieldVisits: 5,
    meetingsSet: 3,
  },
  funnel: {
    contactToMeeting: 30,
    meetingToOffer: 70,
    offerToSigned: 20,
  },
};

const wigPlan = {
  annual: {
    year: 2026,
    contractsTarget: 35,
    quarterlyDistribution: [
      { label: "Q2", target: 5 },
      { label: "Q3", target: 13 },
      { label: "Q4", target: 17 },
    ],
  },
  q2: {
    label: "Rock Q2",
    start: "2026-04-20",
    end: "2026-06-30",
    contractsTarget: 5,
    minWorkersPerContract: 15,
    prospectsPerWeek: 50,
    meetingsPerWeek: 5,
    followUpTarget: 100,
  },
};

const appBuild = "20260425a";
const whatsappMessageOutcome = "Mesaj WhatsApp trimis";

const activityTheme = {
  new: { label: "Nou", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  planned: { label: "Planificat", color: "#7c93b7", bg: "rgba(124,147,183,0.16)" },
  contacted: { label: "Contactat", color: "#38bdf8", bg: "rgba(56,189,248,0.16)" },
  meeting: { label: "Meeting", color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  offer: { label: "Oferta", color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  contract_signed: { label: "Contract", color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  lost: { label: "Pierdut", color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
};

const pipelineStageOptions = [
  "Necontactat",
  "Contactat",
  "Meeting",
  "Oferta",
  "Negociere",
  "Contract semnat",
  "Parcat",
  "Pierdut",
];

const pipelineStageRank = {
  Necontactat: 0,
  Contactat: 1,
  Meeting: 2,
  Oferta: 3,
  Negociere: 4,
  "Contract semnat": 5,
  Parcat: -1,
  Pierdut: -2,
};

const legacyStageMap = {
  "Incercam sa ajungem la decident": "Contactat",
  "Discutie initiata": "Contactat",
  "Meeting programat": "Meeting",
  "Meeting tinut": "Meeting",
  "Oferta trimisa": "Oferta",
  "Asteapta decizie": "Negociere",
};

const pipelineStageTheme = {
  Necontactat: { color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  Contactat: { color: "#38bdf8", bg: "rgba(56,189,248,0.16)" },
  Meeting: { color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  Oferta: { color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  Negociere: { color: "#a855f7", bg: "rgba(168,85,247,0.16)" },
  "Contract semnat": { color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  Parcat: { color: "#64748b", bg: "rgba(100,116,139,0.16)" },
  Pierdut: { color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
};

const accountHealthOptions = ["Verde", "Galben", "Rosu", "Gri"];

const accountHealthTheme = {
  Verde: { color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  Galben: { color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  Rosu: { color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
  Gri: { color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
};

const lockedPipelineStages = new Set(["Contract semnat", "Parcat", "Pierdut"]);

const activityAliases = {
  planned: "planned",
  scheduled: "planned",
  planificat: "planned",
  lead_new: "contacted",
  new_lead: "contacted",
  first_contact: "contacted",
  contacted: "contacted",
  live_contact: "contacted",
  call: "contacted",
  call_live: "contacted",
  email: "contacted",
  whatsapp: "contacted",
  meeting_booked: "meeting",
  meeting_held: "meeting",
  meeting: "meeting",
  proposal_sent: "offer",
  offer_sent: "offer",
  offer: "offer",
  contract_review: "offer",
  contract_signed: "contract_signed",
  signed: "contract_signed",
};

const stageOrder = {
  new: 0,
  contacted: 1,
  meeting: 2,
  offer: 3,
  contract_signed: 4,
  lost: -1,
};

const storageKeys = {
  targets: "grow_dashboard_targets",
  manual: "grow_dashboard_manual_data",
  scorecards: "grow_dashboard_scorecards",
};

const dashboardPages = new Set(["overview", "scorecard", "checklist", "pipeline", "execution", "settings"]);
let mobileLogHideTimer = null;

const state = {
  sourceData: {
    accounts: [],
    activities: [],
    scorecards: [],
    dailyScores: [],
    leadMeasuresDaily: [],
  },
  manualData: loadManualData(),
  manualScorecards: loadScorecards(),
  accounts: [],
  activities: [],
  dailyScores: [],
  leadMeasuresDaily: [],
  scorecards: [],
  scorecard: createEmptyScorecard(),
  search: "",
  standbyFilter: "all",
  page: getPageFromHash(),
  apiEnabled: false,
  sourceMode: "fallback",
  bootstrapReady: false,
  connection: null,
  warnings: [],
  targets: loadTargets(),
};

const elements = {
  pacingCard: document.getElementById("pacing-card"),
  weeklyTouchChip: document.getElementById("weekly-touch-chip"),
  dueTodayChip: document.getElementById("due-today-chip"),
  overdueChip: document.getElementById("overdue-chip"),
  dataModePill: document.getElementById("data-mode-pill"),
  statusMessage: document.getElementById("status-message"),
  retryConnection: document.getElementById("retry-connection"),
  scorecardWeekChip: document.getElementById("scorecard-week-chip"),
  scorecardSourceChip: document.getElementById("scorecard-source-chip"),
  checklistSnapshot: document.getElementById("checklist-snapshot"),
  checklistDayGrid: document.getElementById("checklist-day-grid"),
  checklistWeekGrid: document.getElementById("checklist-week-grid"),
  wigGrid: document.getElementById("wig-grid"),
  keyLeadMeasuresCard: document.getElementById("key-lead-measures-card"),
  powerThreeGrid: document.getElementById("power-three-grid"),
  velocityFocusCard: document.getElementById("velocity-focus-card"),
  funnelGrid: document.getElementById("funnel-grid"),
  leadMeasuresGrid: document.getElementById("lead-measures-grid"),
  activityRatioCard: document.getElementById("activity-ratio-card"),
  lagFunnel: document.getElementById("lag-funnel"),
  dailyTrend: document.getElementById("daily-trend"),
  scorecardTrendList: document.getElementById("scorecard-trend-list"),
  pipelineSummary: document.getElementById("pipeline-summary"),
  accountsTableBody: document.getElementById("accounts-table-body"),
  standbyTableBody: document.getElementById("standby-table-body"),
  standbyChip: document.getElementById("standby-chip"),
  executionSummary: document.getElementById("execution-summary"),
  alertsList: document.getElementById("alerts-list"),
  activitiesFeed: document.getElementById("activities-feed"),
  companySearch: document.getElementById("company-search"),
  refreshData: document.getElementById("refresh-data"),
  exportMemory: document.getElementById("export-memory"),
  clearMemory: document.getElementById("clear-memory"),
  resetAccount: document.getElementById("reset-account"),
  connectionCopy: document.getElementById("connection-copy"),
  connectionBadges: document.getElementById("connection-badges"),
  companyFormStatus: document.getElementById("company-form-status"),
  scorecardFormStatus: document.getElementById("scorecard-form-status"),
  dailyTrendFormStatus: document.getElementById("daily-trend-form-status"),
  leadMeasuresFormStatus: document.getElementById("lead-measures-form-status"),
  companyOptions: document.getElementById("company-options"),
  standbyFilterButtons: [...document.querySelectorAll("[data-standby-filter]")],
  pageButtons: [...document.querySelectorAll("[data-page-target]")],
  pageSections: [...document.querySelectorAll("[data-page]")],
  saveTargets: document.getElementById("save-targets"),
  hydrateDailyTrend: document.getElementById("hydrate-daily-trend"),
  targets: {
    contacted: document.getElementById("target-contacted"),
    meetings: document.getElementById("target-meetings"),
    offers: document.getElementById("target-offers"),
    contracts: document.getElementById("target-contracts"),
    movedCompaniesWeekly: document.getElementById("target-moved-companies-weekly"),
    coldCallsDaily: document.getElementById("target-cold-calls-daily"),
    coldCallsWeekly: document.getElementById("target-cold-calls-weekly"),
    coldCallsMonthly: document.getElementById("target-cold-calls-monthly"),
    whatsappMessagesDaily: document.getElementById("target-whatsapp-messages-daily"),
    whatsappMessagesWeekly: document.getElementById("target-whatsapp-messages-weekly"),
    whatsappMessagesMonthly: document.getElementById("target-whatsapp-messages-monthly"),
    fieldVisitsDaily: document.getElementById("target-field-visits-daily"),
    fieldVisitsWeekly: document.getElementById("target-field-visits-weekly"),
    fieldVisitsMonthly: document.getElementById("target-field-visits-monthly"),
    warmOutreachDaily: document.getElementById("target-warm-outreach-daily"),
    warmOutreachWeekly: document.getElementById("target-warm-outreach-weekly"),
    warmOutreachMonthly: document.getElementById("target-warm-outreach-monthly"),
  },
  forms: {
    activity: document.getElementById("activity-form"),
    account: document.getElementById("account-form"),
    scorecard: document.getElementById("scorecard-form"),
    dailyTrend: document.getElementById("daily-trend-form"),
    leadMeasuresDaily: document.getElementById("lead-measures-daily-form"),
  },
  companyInputs: [...document.querySelectorAll('input[name="company"]')],
};

init();

async function init() {
  hydrateInputs();
  initDatePickers();
  setDefaultFormDates();
  bindEvents();
  initCompanyPickers();
  await refreshData({ silent: true });
  state.bootstrapReady = true;
  render();
}

async function submitActivityFromRaw(raw, form) {
  if (form?.dataset.submitting === "1") {
    return false;
  }
  const submitButton = form?.querySelector('button[type="submit"]');
  if (form) form.dataset.submitting = "1";
  if (submitButton) submitButton.disabled = true;

  try {
  if (!state.bootstrapReady) {
    updateStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
    return false;
  }
  const resolution = resolveCompanyInput(raw.company);
  if (!resolution.ok) {
    updateStatus(resolution.message);
    return false;
  }
  raw.company = resolution.company;
  const record = normalizeRow("activities", raw);
  record.created_at = record.created_at || new Date();
  if (!record.company || !record.date) return false;
  const companyPatchPayload = buildCompanyPatchFromActivityRaw(raw, record);
  let scorecardSync = { updated: false, reason: "not_attempted" };
  let trendSync = { updated: false, reason: "not_attempted" };

  if (state.apiEnabled) {
    try {
      const result = await apiJson("/api/activities", {
        method: "POST",
        body: serializeActivityPayload(record),
      });
      const isDuplicate = Boolean(result?.duplicate);
      scorecardSync = result?.scorecard_sync || scorecardSync;
      trendSync = result?.trend_sync || trendSync;
      if (isDuplicate) {
        await refreshData({ silent: true });
        updateStatus(`Dublura evitata: activitatea pentru ${record.company} era deja salvata recent.`);
        if (form) {
          form.reset();
          setDefaultFormDates();
        }
        render();
        return true;
      }
      const savedActivity = result?.activity ? normalizeRow("activities", result.activity) : normalizeRow("activities", record);
      const savedCompany = result?.company ? normalizeRow("accounts", result.company) : null;
      const savedScorecard = result?.scorecard_sync?.scorecard
        ? normalizeRow("scorecard", result.scorecard_sync.scorecard)
        : null;
      const savedTrend = result?.trend_sync?.updated
        ? normalizeRow("dailyScores", {
            date: result.trend_sync.date,
            contacted: result.trend_sync.counts?.contacted || 0,
            meetings: result.trend_sync.counts?.meetings || 0,
            offers: result.trend_sync.counts?.offers || 0,
            contracts: result.trend_sync.counts?.contracts || 0,
          })
        : null;
      let syncedCompany = savedCompany;
      let secondaryWarning = "";
      if (companyPatchPayload) {
        try {
          const companyResult = await apiJson("/api/companies", {
            method: "PATCH",
            body: companyPatchPayload,
          });
          syncedCompany = companyResult?.company
            ? normalizeRow("accounts", companyResult.company)
            : normalizeRow("accounts", companyPatchPayload);
        } catch (error) {
          secondaryWarning = ` Activitatea a fost salvata, dar sincronizarea suplimentara a companiei a esuat: ${error.message}`;
        }
      }

      applySavedActivityToApiState({
        activity: savedActivity,
        company: syncedCompany,
        scorecard: savedScorecard,
        dailyScore: savedTrend,
      });

      try {
        await refreshData({ silent: true });
        applySavedActivityToApiState({
          activity: savedActivity,
          company: syncedCompany,
          scorecard: savedScorecard,
          dailyScore: savedTrend,
        });
      } catch (error) {
        secondaryWarning += ` Dashboard-ul nu a putut face refresh imediat: ${error.message}`;
      }

      updateStatus(
        `Salvat in Airtable: ${record.company} → ${activityLabel(record.activity_type)}${
          companyPatchPayload ? " + pipeline sincronizat" : ""
        }${formatScorecardSyncBadge(scorecardSync)}${formatTrendSyncBadge(trendSync)}.${secondaryWarning}`
      );
    } catch (error) {
      updateStatus(`Airtable nu a putut salva activitatea. ${error.message}`);
      return false;
    }
  } else {
    scorecardSync = syncManualScorecardFromActivity(record, state.manualData.activities);
    trendSync = syncManualDailyTrendFromActivity(record, state.manualData.activities);
    state.manualData.activities.unshift(record);
    syncManualAccountFromActivity(record);
    if (companyPatchPayload) {
      upsertManualAccount(normalizeRow("accounts", companyPatchPayload));
    }
    persistManualData();
    persistScorecards();
    refreshCombinedData();
    updateStatus(
      `Salvat local: ${record.company} → ${activityLabel(record.activity_type)}${
        companyPatchPayload ? " + pipeline sincronizat" : ""
      }${formatScorecardSyncBadge(scorecardSync)}${formatTrendSyncBadge(trendSync)}.`
    );
  }

  if (form) {
    form.reset();
    setDefaultFormDates();
  }
  render();
  return true;
  } finally {
    if (form) delete form.dataset.submitting;
    if (submitButton) submitButton.disabled = false;
  }
}

function bindEvents() {
  elements.pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPage(button.dataset.pageTarget);
    });
  });

  document.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-page-jump]");
    if (!shortcut) return;

    event.preventDefault();

    if (shortcut.dataset.openMobileLog === "true" && shouldUseMobileLog()) {
      openMobileLogSheet();
      return;
    }

    const page = shortcut.dataset.pageJump;
    if (page) {
      setPage(page);
    }

    const focusTarget = shortcut.dataset.focusTarget;
    if (focusTarget) {
      window.setTimeout(() => {
        focusTargetById(focusTarget);
      }, 90);
    }
  });

  window.addEventListener("hashchange", () => {
    setPage(getPageFromHash(), { syncHash: false });
  });

  elements.saveTargets.addEventListener("click", async () => {
    const payload = {
      contacted: toNumber(elements.targets.contacted.value),
      meetings: toNumber(elements.targets.meetings.value),
      offers: toNumber(elements.targets.offers.value),
      contracts: toNumber(elements.targets.contracts.value),
      movedCompaniesWeekly: toNumber(elements.targets.movedCompaniesWeekly.value),
      coldCallsDaily: toNumber(elements.targets.coldCallsDaily.value),
      coldCallsWeekly: toNumber(elements.targets.coldCallsWeekly.value),
      coldCallsMonthly: toNumber(elements.targets.coldCallsMonthly.value),
      whatsappMessagesDaily: toNumber(elements.targets.whatsappMessagesDaily.value),
      whatsappMessagesWeekly: toNumber(elements.targets.whatsappMessagesWeekly.value),
      whatsappMessagesMonthly: toNumber(elements.targets.whatsappMessagesMonthly.value),
      fieldVisitsDaily: toNumber(elements.targets.fieldVisitsDaily.value),
      fieldVisitsWeekly: toNumber(elements.targets.fieldVisitsWeekly.value),
      fieldVisitsMonthly: toNumber(elements.targets.fieldVisitsMonthly.value),
      warmOutreachDaily: toNumber(elements.targets.warmOutreachDaily.value),
      warmOutreachWeekly: toNumber(elements.targets.warmOutreachWeekly.value),
      warmOutreachMonthly: toNumber(elements.targets.warmOutreachMonthly.value),
    };

    if (state.apiEnabled) {
      try {
        const result = await apiJson("/api/targets", {
          method: "PUT",
          body: payload,
        });
        state.targets = normalizeTargets(result.targets || payload);
        refreshCombinedData();
        updateStatus("Target-urile lunare si Key Lead Measures au fost salvate in Airtable.");
        render();
        return;
      } catch (error) {
        updateStatus(`Nu am putut salva target-urile in Airtable. ${error.message}`);
        return;
      }
    }

    state.targets = payload;
    localStorage.setItem(storageKeys.targets, JSON.stringify(state.targets));
    refreshCombinedData();
    updateStatus("Target-urile lunare si Key Lead Measures au fost salvate local pana conectam Vercel-ul la Airtable.");
    render();
  });

  elements.refreshData.addEventListener("click", async () => {
    await refreshData();
  });

  elements.retryConnection?.addEventListener("click", async () => {
    elements.retryConnection.disabled = true;
    elements.retryConnection.textContent = "Se reconecteaza...";
    await refreshData();
    elements.retryConnection.disabled = false;
    elements.retryConnection.textContent = "Reincearca conexiunea";
  });

  elements.companySearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderPipeline();
  });

  elements.standbyFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.standbyFilter = button.dataset.standbyFilter || "all";
      renderPipeline();
    });
  });

  elements.companyInputs.forEach((input) => {
    input.addEventListener("blur", () => {
      const resolution = resolveCompanyInput(input.value);
      input.value = resolution.company;
      if (!resolution.ok && resolution.message) {
        updateStatus(resolution.message);
      }
    });
  });

  elements.forms.activity.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const raw = Object.fromEntries(formData.entries());
    if (!raw.date) raw.date = getTodayIsoDate();
    await submitActivityFromRaw(raw, form);
  });

  const mobileForm = document.getElementById("mobile-activity-form");
  const mobileSheet = document.getElementById("mobile-log-sheet");
  const fab = document.getElementById("fab-log");

  if (fab && mobileSheet && mobileForm) {
    fab.addEventListener("click", () => {
      openMobileLogSheet();
    });

    document.getElementById("mobile-log-close")?.addEventListener("click", () => {
      closeMobileLogSheet();
    });

    mobileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(mobileForm);
      const raw = Object.fromEntries(formData.entries());
      raw.date = getTodayIsoDate();
      const saved = await submitActivityFromRaw(raw, mobileForm);
      if (saved) {
        closeMobileLogSheet();
      }
    });
  }

  elements.forms.account.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.bootstrapReady) {
      updateStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const raw = Object.fromEntries(formData.entries());
    const resolution = resolveCompanyInput(raw.company);
    if (!resolution.ok) {
      updateStatus(resolution.message);
      return;
    }
    raw.company = resolution.company;
    const record = normalizeRow("accounts", raw);
    if (!record.company) return;
    const companyPatch = buildCompanyUpdatePatch(record, raw);
    if (Object.keys(companyPatch).length === 1) {
      updateStatus("Alege macar un camp pe care vrei sa-l schimbi pentru compania selectata.");
      return;
    }

    if (state.apiEnabled) {
      try {
        const companyResult = await apiJson("/api/companies", {
          method: "PATCH",
          body: serializeCompanyPayload(companyPatch),
        });
        const pipelineActivity = buildActivityFromCompanyUpdate(record, raw);
        let activityMessage = "";
        let savedActivityState = {
          company: companyResult?.company ? normalizeRow("accounts", companyResult.company) : normalizeRow("accounts", companyPatch),
        };

        if (pipelineActivity) {
          try {
            const activityResult = await apiJson("/api/activities", {
              method: "POST",
              body: serializeActivityPayload(pipelineActivity),
            });
            savedActivityState = {
              activity: activityResult?.activity ? normalizeRow("activities", activityResult.activity) : pipelineActivity,
              company: activityResult?.company
                ? normalizeRow("accounts", activityResult.company)
                : savedActivityState.company,
              scorecard: activityResult?.scorecard_sync?.scorecard
                ? normalizeRow("scorecard", activityResult.scorecard_sync.scorecard)
                : null,
              dailyScore: activityResult?.trend_sync?.updated
                ? normalizeRow("dailyScores", {
                    date: activityResult.trend_sync.date,
                    contacted: activityResult.trend_sync.counts?.contacted || 0,
                    meetings: activityResult.trend_sync.counts?.meetings || 0,
                    offers: activityResult.trend_sync.counts?.offers || 0,
                    contracts: activityResult.trend_sync.counts?.contracts || 0,
                  })
                : null,
            };
            activityMessage = ` Activitate ${activityLabel(pipelineActivity.activity_type)} logata automat.`;
          } catch (error) {
            activityMessage = ` Compania a fost salvata, dar logarea automata in Activities a esuat: ${error.message}`;
          }
        }

        applySavedActivityToApiState(savedActivityState);
        await refreshData({ silent: true });
        applySavedActivityToApiState(savedActivityState);
        updateStatus(`Compania ${record.company} a fost actualizata in Airtable.${activityMessage}`);
      } catch (error) {
        updateStatus(`Airtable nu a putut salva compania. ${error.message}`);
        return;
      }
    } else {
      const pipelineActivity = buildActivityFromCompanyUpdate(record, raw);
      upsertManualAccount(companyPatch);
      if (pipelineActivity) {
        const scorecardSync = syncManualScorecardFromActivity(pipelineActivity, state.manualData.activities);
        const trendSync = syncManualDailyTrendFromActivity(pipelineActivity, state.manualData.activities);
        state.manualData.activities.unshift(pipelineActivity);
        syncManualAccountFromActivity(pipelineActivity);
        persistScorecards();
        updateStatus(
          `Compania ${record.company} a fost actualizata local. Activitate ${activityLabel(pipelineActivity.activity_type)} logata automat${formatScorecardSyncBadge(scorecardSync)}${formatTrendSyncBadge(trendSync)}.`
        );
      } else {
        updateStatus(`Compania ${record.company} a fost actualizata local.`);
      }
      persistManualData();
      refreshCombinedData();
    }

    form.reset();
    setDefaultFormDates();
    render();
  });

  elements.forms.scorecard?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.bootstrapReady) {
      updateScorecardStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
      return;
    }

    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const record = applyComputedScorecardFields(normalizeRow("scorecard", raw));

    if (!record.week_start) {
      updateScorecardStatus("Alege mai intai saptamana pentru care actualizezi scorecard-ul.");
      return;
    }

    if (state.apiEnabled) {
      try {
        const result = await apiJson("/api/scorecard", {
          method: "PUT",
          body: serializeScorecardPayload(record),
        });
        await refreshData({ silent: true });
        const ignoredFields = Array.isArray(result?.scorecard?.ignored_fields)
          ? result.scorecard.ignored_fields.filter(Boolean)
          : [];
        const ignoredFieldsSuffix = ignoredFields.length
          ? ` Unele campuri au fost omise pentru ca nu exista in schema Airtable: ${ignoredFields.join(", ")}.`
          : "";
        updateScorecardStatus(`Scorecard-ul pentru ${record.week_label} a fost salvat in Airtable.${ignoredFieldsSuffix}`);
      } catch (error) {
        updateScorecardStatus(`Airtable nu a putut salva scorecard-ul. ${error.message}`);
        return;
      }
    } else {
      upsertManualScorecard(record);
      persistScorecards();
      refreshCombinedData();
      updateScorecardStatus(`Scorecard-ul pentru ${record.week_label} a fost salvat local.`);
    }

    hydrateScorecardForm();
    render();
  });

  elements.forms.leadMeasuresDaily?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.bootstrapReady) {
      updateLeadMeasuresStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
      return;
    }

    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const record = normalizeRow("leadMeasuresDaily", raw);

    if (!record.date) {
      updateLeadMeasuresStatus("Alege mai intai data pentru care vrei sa salvezi lead measures.");
      return;
    }

    if (state.apiEnabled) {
      try {
        const result = await apiJson("/api/lead-measures-daily", {
          method: "PUT",
          body: serializeLeadMeasuresPayload(record),
        });
        if (result?.leadMeasure) {
          upsertSourceLeadMeasureDaily(result.leadMeasure);
        }
        await refreshData({ silent: true });
        updateLeadMeasuresStatus(`Lead measures pentru ${record.date} au fost salvate in Airtable.`);
      } catch (error) {
        updateLeadMeasuresStatus(`Airtable nu a putut salva lead measures. ${error.message}`);
        return;
      }
    } else {
      upsertManualLeadMeasureDaily(record);
      persistManualData();
      refreshCombinedData();
      updateLeadMeasuresStatus(`Lead measures pentru ${record.date} au fost salvate local.`);
    }

    hydrateLeadMeasuresDailyForm(record.date);
    hydrateScorecardForm();
    render();
  });

  elements.forms.dailyTrend?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.bootstrapReady) {
      updateDailyTrendStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
      return;
    }

    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const record = normalizeRow("dailyScores", raw);

    if (!record.date) {
      updateDailyTrendStatus("Alege mai intai data pentru ziua pe care vrei sa o inchizi.");
      return;
    }

    if (state.apiEnabled) {
      try {
        await apiJson("/api/scorecard-trend", {
          method: "PUT",
          body: serializeDailyScorePayload(record),
        });
        await refreshData({ silent: true });
        updateDailyTrendStatus(`Ziua ${record.date} a fost salvata in Airtable, in Scorecard Trend.`);
      } catch (error) {
        updateDailyTrendStatus(`Airtable nu a putut salva trendul zilnic. ${error.message}`);
        return;
      }
    } else {
      upsertManualDailyScore(record);
      persistManualData();
      refreshCombinedData();
      updateDailyTrendStatus(`Ziua ${record.date} a fost salvata local.`);
    }

    hydrateDailyTrendForm(record.date);
    render();
  });

  elements.hydrateDailyTrend?.addEventListener("click", () => {
    const form = elements.forms.dailyTrend;
    const selectedDate = form?.elements?.namedItem("date")?.value;
    hydrateDailyTrendForm(selectedDate || getTodayIsoDate(), { preferActivityCounts: true });
    updateDailyTrendStatus("Formularul a fost precompletat din activitatile salvate pentru data aleasa.");
  });

  elements.forms.dailyTrend?.elements?.namedItem("date")?.addEventListener("change", (event) => {
    hydrateDailyTrendForm(event.currentTarget.value);
  });

  elements.forms.leadMeasuresDaily?.elements?.namedItem("date")?.addEventListener("change", (event) => {
    hydrateLeadMeasuresDailyForm(event.currentTarget.value);
  });

  elements.resetAccount.addEventListener("click", async () => {
    const companyInput = elements.forms.account?.querySelector('input[name="company"]');
    const rawCompany = companyInput?.value || "";
    const resolution = resolveCompanyInput(rawCompany);

    if (!resolution.ok || !resolution.company) {
      updateStatus("Scrie mai intai compania pe care vrei sa o resetezi.");
      return;
    }

    const company = resolution.company;
    const confirmed = window.confirm(
      `Resetez tracking-ul pentru ${company}? Vor fi golite stadiul, sanatatea contului, lead date, ultimul contact, urmatorul pas si setarile de standby.`
    );

    if (!confirmed) return;

    const payload = {
      company,
      pipeline_stage: "",
      account_health: "",
      lead_date: "",
      last_contact: "",
      next_step: "",
      next_step_date: "",
      standby_reason: "",
      reactivation_date: "",
    };

    if (state.apiEnabled) {
      try {
        await apiJson("/api/companies", {
          method: "PATCH",
          body: payload,
        });
        await refreshData({ silent: true });
        updateStatus(`Tracking-ul pentru ${company} a fost resetat in Airtable.`);
      } catch (error) {
        updateStatus(`Nu am putut reseta compania in Airtable. ${error.message}`);
        return;
      }
    } else {
      clearManualAccountTracking(company);
      persistManualData();
      refreshCombinedData();
      updateStatus(`Tracking-ul pentru ${company} a fost resetat local.`);
    }

    elements.forms.account.reset();
    setDefaultFormDates();
    render();
  });

  elements.exportMemory.addEventListener("click", () => {
    const payload = JSON.stringify({
      targets: state.targets,
      manualData: state.manualData,
      manualScorecards: state.manualScorecards,
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grow-scorecard-memory-${getTodayIsoDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("Fallback-ul local a fost exportat, inclusiv scorecard-ul saptamanal.");
  });

  elements.clearMemory.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.manual);
    localStorage.removeItem(storageKeys.scorecards);
    localStorage.removeItem(storageKeys.targets);
    state.manualData = { accounts: [], activities: [], dailyScores: [], leadMeasuresDaily: [] };
    state.manualScorecards = [];
    state.dailyScores = [];
    state.leadMeasuresDaily = [];
    state.targets = { ...defaultTargets };
    hydrateInputs();
    refreshCombinedData();
    hydrateDailyTrendForm();
    hydrateLeadMeasuresDailyForm();
    updateStatus("Memoria locala a fost stearsa, inclusiv trendul zilnic, lead measures si scorecard-ul saptamanal.");
    render();
  });
}

function shouldUseMobileLog() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function openMobileLogSheet() {
  const mobileSheet = document.getElementById("mobile-log-sheet");
  const mobileForm = document.getElementById("mobile-activity-form");
  if (!mobileSheet || !mobileForm) return;

  if (mobileLogHideTimer) {
    window.clearTimeout(mobileLogHideTimer);
    mobileLogHideTimer = null;
  }
  mobileSheet.classList.add("is-open");
  mobileSheet.classList.remove("is-hidden");
  window.setTimeout(() => {
    focusTargetById("mobile-activity-form");
  }, 60);
}

function closeMobileLogSheet() {
  const mobileSheet = document.getElementById("mobile-log-sheet");
  if (!mobileSheet) return;
  mobileSheet.classList.remove("is-open");
  if (mobileLogHideTimer) {
    window.clearTimeout(mobileLogHideTimer);
  }
  mobileLogHideTimer = window.setTimeout(() => {
    mobileSheet.classList.add("is-hidden");
  }, 240);
}

function focusTargetById(id) {
  const target = document.getElementById(id);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  const focusable = target.matches("input, select, textarea, button, [tabindex]")
    ? target
    : target.querySelector("input, select, textarea, button, [tabindex]");

  focusable?.focus({ preventScroll: true });
}

async function refreshData(options = {}) {
  const { silent = false } = options;

  try {
    const payload = await apiJson("/api/bootstrap");
    state.connection = payload.connection || null;
    state.warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
    state.apiEnabled = Boolean(payload.configured);
    state.sourceMode = state.apiEnabled ? "airtable" : "fallback";
    state.sourceData.accounts = Array.isArray(payload.companies)
      ? payload.companies.map((row) => normalizeRow("accounts", row))
      : [];
    state.sourceData.activities = Array.isArray(payload.activities)
      ? payload.activities.map((row) => normalizeRow("activities", row))
      : [];
    state.sourceData.scorecards = Array.isArray(payload.scorecards)
      ? payload.scorecards.map((row) => normalizeRow("scorecard", row))
      : [];
    state.sourceData.dailyScores = Array.isArray(payload.dailyScores)
      ? payload.dailyScores.map((row) => normalizeRow("dailyScores", row))
      : [];
    state.sourceData.leadMeasuresDaily = Array.isArray(payload.leadMeasuresDaily)
      ? payload.leadMeasuresDaily.map((row) => normalizeRow("leadMeasuresDaily", row))
      : [];

    if (payload.targets) {
      state.targets = normalizeTargets(payload.targets);
      hydrateInputs();
    } else if (!state.apiEnabled) {
      state.targets = loadTargets();
    }

    refreshCombinedData();
    hydrateScorecardForm();
    hydrateDailyTrendForm();
    hydrateLeadMeasuresDailyForm();

    if (elements.retryConnection) elements.retryConnection.hidden = true;
    if (!silent) {
      updateStatus(
        state.apiEnabled
          ? "Dashboard-ul este conectat live la Airtable prin Vercel."
          : state.warnings[0] || "Airtable nu este configurat inca. Dashboard-ul ruleaza pe memoria locala."
      );
    }
  } catch (error) {
    state.apiEnabled = false;
    state.sourceMode = "fallback";
    state.connection = null;
    state.warnings = [];
    state.sourceData = { accounts: [], activities: [], scorecards: [], dailyScores: [], leadMeasuresDaily: [] };
    state.targets = loadTargets();
    refreshCombinedData();
    hydrateScorecardForm();
    hydrateDailyTrendForm();
    hydrateLeadMeasuresDailyForm();

    if (elements.retryConnection) elements.retryConnection.hidden = false;
    if (!silent) {
      updateStatus(`API-ul Vercel nu raspunde. Dashboard-ul ruleaza pe memoria locala.`);
    }
  }
}

function hydrateInputs() {
  elements.targets.contacted.value = state.targets.contacted;
  elements.targets.meetings.value = state.targets.meetings;
  elements.targets.offers.value = state.targets.offers;
  elements.targets.contracts.value = state.targets.contracts;
  elements.targets.movedCompaniesWeekly.value = state.targets.movedCompaniesWeekly;
  elements.targets.coldCallsDaily.value = state.targets.coldCallsDaily;
  elements.targets.coldCallsWeekly.value = state.targets.coldCallsWeekly;
  elements.targets.coldCallsMonthly.value = state.targets.coldCallsMonthly;
  elements.targets.whatsappMessagesDaily.value = state.targets.whatsappMessagesDaily;
  elements.targets.whatsappMessagesWeekly.value = state.targets.whatsappMessagesWeekly;
  elements.targets.whatsappMessagesMonthly.value = state.targets.whatsappMessagesMonthly;
  elements.targets.fieldVisitsDaily.value = state.targets.fieldVisitsDaily;
  elements.targets.fieldVisitsWeekly.value = state.targets.fieldVisitsWeekly;
  elements.targets.fieldVisitsMonthly.value = state.targets.fieldVisitsMonthly;
  elements.targets.warmOutreachDaily.value = state.targets.warmOutreachDaily;
  elements.targets.warmOutreachWeekly.value = state.targets.warmOutreachWeekly;
  elements.targets.warmOutreachMonthly.value = state.targets.warmOutreachMonthly;
}

function hydrateScorecardForm() {
  const form = elements.forms.scorecard;
  const scorecard = state.scorecard || createEmptyScorecard();
  if (!form || !scorecard) return;

  const assign = (name, value) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field instanceof RadioNodeList) return;
    if (field.dataset?.datePicker !== undefined) {
      setDateFieldValue(field, value || "");
      return;
    }
    if (name === "sales_velocity_days") {
      field.value = value ? value : "";
      return;
    }
    field.value = value ?? "";
  };

  const weeklyLeadMeasures = getLeadMeasuresRangeTotals(scorecard.week_start, scorecard.week_end || getWeekEnd(scorecard.week_start));
  const shouldHydrateFromDaily = !scorecard.id
    && (
      weeklyLeadMeasures.cold_calls
      || weeklyLeadMeasures.whatsapp_messages
      || weeklyLeadMeasures.field_visits
      || weeklyLeadMeasures.warm_outreach
    );

  assign("week_start", scorecard.week_start);
  assign("new_contract_workers_mtd", scorecard.new_contract_workers_mtd);
  assign("dream100_p1_prospects", scorecard.dream100_p1_prospects);
  assign("sales_velocity_days", scorecard.sales_velocity_days);
  assign("cold_calls", shouldHydrateFromDaily ? weeklyLeadMeasures.cold_calls : scorecard.cold_calls);
  assign("linkedin_messages", shouldHydrateFromDaily ? weeklyLeadMeasures.whatsapp_messages : scorecard.linkedin_messages);
  assign("field_visits", shouldHydrateFromDaily ? weeklyLeadMeasures.field_visits : scorecard.field_visits);
  assign("warm_outreach", shouldHydrateFromDaily ? weeklyLeadMeasures.warm_outreach : scorecard.warm_outreach);
  assign("meetings_set", scorecard.meetings_set);
  assign("offers_sent", scorecard.offers_sent);
  assign("contracts_signed", scorecard.contracts_signed);
  assign("workers_signed", scorecard.workers_signed);
  assign("workers_delivered", scorecard.workers_delivered);
  assign("notes", scorecard.notes);
}

function hydrateLeadMeasuresDailyForm(date = "") {
  const form = elements.forms.leadMeasuresDaily;
  if (!form) return;

  const requestedDate = normalizeString(date)
    || normalizeString(form.elements.namedItem("date")?.value)
    || getTodayIsoDate();
  const draft = buildLeadMeasuresDailyDraft(requestedDate);

  const assign = (name, value) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field instanceof RadioNodeList) return;
    if (field.dataset?.datePicker !== undefined) {
      setDateFieldValue(field, value || "");
      return;
    }
    field.value = value ?? "";
  };

  assign("date", draft.date);
  assign("cold_calls", draft.cold_calls);
  assign("whatsapp_messages", draft.whatsapp_messages);
  assign("field_visits", draft.field_visits);
  assign("warm_outreach", draft.warm_outreach);
  assign("notes", draft.notes);
}

function hydrateDailyTrendForm(date = "", options = {}) {
  const form = elements.forms.dailyTrend;
  if (!form) return;

  const requestedDate = normalizeString(date)
    || normalizeString(form.elements.namedItem("date")?.value)
    || getTodayIsoDate();
  const draft = buildDailyTrendDraft(requestedDate, options);

  const assign = (name, value) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field instanceof RadioNodeList) return;
    if (field.dataset?.datePicker !== undefined) {
      setDateFieldValue(field, value || "");
      return;
    }
    field.value = value ?? "";
  };

  assign("date", draft.date);
  assign("contacted", draft.contacted);
  assign("meetings", draft.meetings);
  assign("offers", draft.offers);
  assign("contracts", draft.contracts);
  assign("notes", draft.notes);
}

function buildDailyTrendDraft(date = "", options = {}) {
  const { preferActivityCounts = false } = options;
  const isoDate = normalizeString(date) || getTodayIsoDate();
  const existing = state.dailyScores.find((row) => row.date === isoDate);
  const counts = countActivities(getActivitiesForDate(isoDate));
  const draftFromActivities = {
    id: existing?.id || "",
    date: isoDate,
    contacted: counts.contacted,
    meetings: counts.meeting,
    offers: counts.offer,
    contracts: counts.contract_signed,
    notes: existing?.notes || "",
  };

  if (existing && !preferActivityCounts) {
    return {
      ...draftFromActivities,
      ...existing,
    };
  }

  return draftFromActivities;
}

function buildLeadMeasuresDailyDraft(date = "") {
  const isoDate = normalizeString(date) || getTodayIsoDate();
  const existing = state.leadMeasuresDaily.find((row) => row.date === isoDate);

  return existing || createEmptyLeadMeasureDaily(isoDate);
}

function getLeadMeasuresRangeTotals(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) {
    return createEmptyLeadMeasureDaily(start);
  }

  return state.leadMeasuresDaily.reduce((totals, row) => {
    const rowDate = parseDate(row.date);
    if (!isDateWithinInclusiveRange(rowDate, startDate, endDate)) {
      return totals;
    }

    totals.cold_calls += toNumber(row.cold_calls);
    totals.whatsapp_messages += toNumber(row.whatsapp_messages);
    totals.field_visits += toNumber(row.field_visits);
    totals.warm_outreach += toNumber(row.warm_outreach);
    return totals;
  }, createEmptyLeadMeasureDaily(start));
}

function isFieldVisitTargetDay(date = getTodayIsoDate()) {
  const parsed = parseDate(date);
  if (!parsed) return false;
  const day = parsed.getDay();
  return day === 3 || day === 4;
}

function getFieldVisitDailyTarget(date = getTodayIsoDate()) {
  return isFieldVisitTargetDay(date) ? state.targets.fieldVisitsDaily : 0;
}

function getMonthEnd(date = getTodayIsoDate()) {
  const parsed = parseDate(date);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  return toIsoDateValue(new Date(year, month + 1, 0));
}

function formatShortDate(date) {
  const parsed = parseDate(date);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function setDefaultFormDates() {
  const today = getTodayIsoDate();
  const activityDate = elements.forms.activity?.querySelector('input[name="date"]');
  const activityNextStepDate = elements.forms.activity?.querySelector('input[name="next_step_date"]');
  const accountNextStepDate = elements.forms.account?.querySelector('input[name="next_step_date"]');
  const scorecardWeekStart = elements.forms.scorecard?.querySelector('input[name="week_start"]');
  const dailyTrendDate = elements.forms.dailyTrend?.querySelector('input[name="date"]');
  const leadMeasuresDate = elements.forms.leadMeasuresDaily?.querySelector('input[name="date"]');

  if (activityDate && !activityDate.value) setDateFieldValue(activityDate, today);
  if (activityNextStepDate && !activityNextStepDate.value) setDateFieldValue(activityNextStepDate, "");
  if (accountNextStepDate && !accountNextStepDate.value) setDateFieldValue(accountNextStepDate, "");
  if (scorecardWeekStart && !scorecardWeekStart.value) setDateFieldValue(scorecardWeekStart, getWeekStart(today));
  if (dailyTrendDate && !dailyTrendDate.value) setDateFieldValue(dailyTrendDate, today);
  if (leadMeasuresDate && !leadMeasuresDate.value) setDateFieldValue(leadMeasuresDate, today);
}

function initDatePickers() {
  if (typeof window.flatpickr !== "function") return;

  const locale = window.flatpickr.l10ns?.ro || "default";
  document.querySelectorAll("[data-date-picker]").forEach((input) => {
    if (input._flatpickr) return;

    window.flatpickr(input, {
      locale,
      altInput: true,
      altFormat: "j F Y",
      dateFormat: "Y-m-d",
      disableMobile: true,
      monthSelectorType: "static",
      allowInput: false,
      altInputClass: "date-picker-input",
    });
  });
}

function setDateFieldValue(input, value) {
  if (!input) return;

  if (input._flatpickr) {
    if (value) {
      input._flatpickr.setDate(value, false, "Y-m-d");
    } else {
      input._flatpickr.clear();
    }
    return;
  }

  input.value = value || "";
}

function loadTargets() {
  const raw = localStorage.getItem(storageKeys.targets);
  if (!raw) return { ...defaultTargets };

  try {
    return normalizeTargets(JSON.parse(raw));
  } catch {
    return { ...defaultTargets };
  }
}

function normalizeTargets(value = {}) {
  const movedCompaniesWeeklyValue = value.movedCompaniesWeekly ?? value.moved_companies_weekly;
  return {
    contacted: toNumber(value.contacted ?? value.leads ?? defaultTargets.contacted),
    meetings: toNumber(value.meetings ?? defaultTargets.meetings),
    offers: toNumber(value.offers ?? defaultTargets.offers),
    contracts: toNumber(value.contracts ?? defaultTargets.contracts),
    movedCompaniesWeekly: normalizeString(movedCompaniesWeeklyValue) === ""
      ? defaultTargets.movedCompaniesWeekly
      : toNumber(movedCompaniesWeeklyValue),
    coldCallsDaily: toNumber(value.coldCallsDaily ?? value.cold_calls_daily ?? defaultTargets.coldCallsDaily),
    coldCallsWeekly: toNumber(value.coldCallsWeekly ?? value.cold_calls_weekly ?? defaultTargets.coldCallsWeekly),
    coldCallsMonthly: toNumber(value.coldCallsMonthly ?? value.cold_calls_monthly ?? defaultTargets.coldCallsMonthly),
    whatsappMessagesDaily: toNumber(value.whatsappMessagesDaily ?? value.whatsapp_messages_daily ?? defaultTargets.whatsappMessagesDaily),
    whatsappMessagesWeekly: toNumber(value.whatsappMessagesWeekly ?? value.whatsapp_messages_weekly ?? defaultTargets.whatsappMessagesWeekly),
    whatsappMessagesMonthly: toNumber(value.whatsappMessagesMonthly ?? value.whatsapp_messages_monthly ?? defaultTargets.whatsappMessagesMonthly),
    fieldVisitsDaily: toNumber(value.fieldVisitsDaily ?? value.field_visits_daily ?? defaultTargets.fieldVisitsDaily),
    fieldVisitsWeekly: toNumber(value.fieldVisitsWeekly ?? value.field_visits_weekly ?? defaultTargets.fieldVisitsWeekly),
    fieldVisitsMonthly: toNumber(value.fieldVisitsMonthly ?? value.field_visits_monthly ?? defaultTargets.fieldVisitsMonthly),
    warmOutreachDaily: toNumber(value.warmOutreachDaily ?? value.warm_outreach_daily ?? defaultTargets.warmOutreachDaily),
    warmOutreachWeekly: toNumber(value.warmOutreachWeekly ?? value.warm_outreach_weekly ?? defaultTargets.warmOutreachWeekly),
    warmOutreachMonthly: toNumber(value.warmOutreachMonthly ?? value.warm_outreach_monthly ?? defaultTargets.warmOutreachMonthly),
  };
}

function createEmptyScorecard(weekStart = getWeekStart(getTodayIsoDate())) {
  const normalizedWeekStart = getWeekStart(weekStart);
  const weekEnd = getWeekEnd(normalizedWeekStart);
  return {
    id: "",
    week_start: normalizedWeekStart,
    week_end: weekEnd,
    week_key: normalizedWeekStart,
    week_label: buildWeekLabel(normalizedWeekStart, weekEnd),
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

function createEmptyLeadMeasureDaily(date = getTodayIsoDate()) {
  return {
    id: "",
    date: normalizeString(date) || getTodayIsoDate(),
    cold_calls: 0,
    whatsapp_messages: 0,
    field_visits: 0,
    warm_outreach: 0,
    notes: "",
  };
}

function loadScorecards() {
  const raw = localStorage.getItem(storageKeys.scorecards);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((row) => normalizeRow("scorecard", row)) : [];
  } catch {
    return [];
  }
}

function loadManualData() {
  const raw = localStorage.getItem(storageKeys.manual);
  if (!raw) return { accounts: [], activities: [], dailyScores: [], leadMeasuresDaily: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((row) => normalizeRow("accounts", row)) : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities.map((row) => normalizeRow("activities", row)) : [],
      dailyScores: Array.isArray(parsed.dailyScores) ? parsed.dailyScores.map((row) => normalizeRow("dailyScores", row)) : [],
      leadMeasuresDaily: Array.isArray(parsed.leadMeasuresDaily) ? parsed.leadMeasuresDaily.map((row) => normalizeRow("leadMeasuresDaily", row)) : [],
    };
  } catch {
    return { accounts: [], activities: [], dailyScores: [], leadMeasuresDaily: [] };
  }
}

function persistManualData() {
  localStorage.setItem(storageKeys.manual, JSON.stringify(state.manualData));
}

function persistScorecards() {
  localStorage.setItem(storageKeys.scorecards, JSON.stringify(state.manualScorecards));
}

function hasManualData() {
  return Boolean(
    state.manualData.accounts.length
    || state.manualData.activities.length
    || state.manualData.dailyScores.length
    || state.manualData.leadMeasuresDaily.length
    || state.manualScorecards.length
  );
}

function selectCurrentScorecard(scorecards) {
  const currentWeekStart = getWeekStart(getTodayIsoDate());
  return scorecards.find((record) => record.week_start === currentWeekStart || record.week_key === currentWeekStart)
    || scorecards[0]
    || applyComputedScorecardFields(createEmptyScorecard(currentWeekStart));
}

function refreshCombinedData() {
  if (state.apiEnabled) {
    state.activities = [...state.sourceData.activities]
      .filter((item) => item.company || item.date)
      .sort(compareActivitiesReverseChronologically);

    state.accounts = mergeAccounts(state.sourceData.accounts, [], state.activities);
    state.scorecards = [...state.sourceData.scorecards]
      .filter((item) => item.week_start)
      .map((item) => applyComputedScorecardFields(item, state.activities))
      .sort((left, right) => right.week_start.localeCompare(left.week_start));
    state.scorecard = selectCurrentScorecard(state.scorecards);
    state.dailyScores = [...state.sourceData.dailyScores]
      .filter((item) => item.date)
      .sort((left, right) => right.date.localeCompare(left.date));
    state.leadMeasuresDaily = [...state.sourceData.leadMeasuresDaily]
      .filter((item) => item.date)
      .sort((left, right) => right.date.localeCompare(left.date));
    updateCompanyOptions();
    return;
  }

  state.activities = [...state.manualData.activities]
    .filter((item) => item.company || item.date)
    .sort(compareActivitiesReverseChronologically);

  state.accounts = mergeAccounts([], state.manualData.accounts, state.activities);
  state.scorecards = [...state.manualScorecards]
    .filter((item) => item.week_start)
    .map((item) => applyComputedScorecardFields(item, state.activities))
    .sort((left, right) => right.week_start.localeCompare(left.week_start));
  state.scorecard = selectCurrentScorecard(state.scorecards);
  state.dailyScores = [...state.manualData.dailyScores]
    .filter((item) => item.date)
    .sort((left, right) => right.date.localeCompare(left.date));
  state.leadMeasuresDaily = [...state.manualData.leadMeasuresDaily]
    .filter((item) => item.date)
    .sort((left, right) => right.date.localeCompare(left.date));
  updateCompanyOptions();
}

function upsertSourceActivity(record) {
  const nextRecord = normalizeRow("activities", record);
  if (!nextRecord.company && !nextRecord.date) return;

  state.sourceData.activities = Array.isArray(state.sourceData.activities) ? state.sourceData.activities : [];

  const existingIndex = state.sourceData.activities.findIndex((item) => {
    if (nextRecord.id && item.id && item.id === nextRecord.id) return true;

    return normalizeString(item.company).toLowerCase() === normalizeString(nextRecord.company).toLowerCase()
      && normalizeActivity(item.activity_type) === normalizeActivity(nextRecord.activity_type)
      && toIsoDateValue(item.date) === toIsoDateValue(nextRecord.date)
      && normalizeString(item.outcome) === normalizeString(nextRecord.outcome)
      && normalizeString(item.next_step) === normalizeString(nextRecord.next_step)
      && toIsoDateValue(item.next_step_date) === toIsoDateValue(nextRecord.next_step_date);
  });

  if (existingIndex >= 0) {
    state.sourceData.activities[existingIndex] = {
      ...state.sourceData.activities[existingIndex],
      ...nextRecord,
    };
  } else {
    state.sourceData.activities.unshift(nextRecord);
  }
}

function upsertSourceAccount(record) {
  const nextRecord = normalizeRow("accounts", record);
  if (!nextRecord.company) return;

  state.sourceData.accounts = Array.isArray(state.sourceData.accounts) ? state.sourceData.accounts : [];

  const companyKey = normalizeString(nextRecord.company).toLowerCase();
  const existingIndex = state.sourceData.accounts.findIndex(
    (item) => normalizeString(item.company).toLowerCase() === companyKey
  );

  if (existingIndex >= 0) {
    state.sourceData.accounts[existingIndex] = {
      ...state.sourceData.accounts[existingIndex],
      ...nextRecord,
    };
  } else {
    state.sourceData.accounts.unshift(nextRecord);
  }
}

function upsertSourceScorecard(record) {
  const nextRecord = normalizeRow("scorecard", record);
  const key = nextRecord.week_key || nextRecord.week_start;
  if (!key) return;

  state.sourceData.scorecards = Array.isArray(state.sourceData.scorecards) ? state.sourceData.scorecards : [];

  const existingIndex = state.sourceData.scorecards.findIndex((item) => {
    const itemKey = item.week_key || item.week_start;
    return itemKey === key;
  });

  if (existingIndex >= 0) {
    state.sourceData.scorecards[existingIndex] = {
      ...state.sourceData.scorecards[existingIndex],
      ...nextRecord,
    };
  } else {
    state.sourceData.scorecards.unshift(nextRecord);
  }
}

function upsertSourceDailyScore(record) {
  const nextRecord = normalizeRow("dailyScores", record);
  const key = normalizeString(nextRecord.date);
  if (!key) return;

  state.sourceData.dailyScores = Array.isArray(state.sourceData.dailyScores) ? state.sourceData.dailyScores : [];

  const existingIndex = state.sourceData.dailyScores.findIndex((item) => normalizeString(item.date) === key);

  if (existingIndex >= 0) {
    state.sourceData.dailyScores[existingIndex] = {
      ...state.sourceData.dailyScores[existingIndex],
      ...nextRecord,
    };
  } else {
    state.sourceData.dailyScores.unshift(nextRecord);
  }
}

function upsertSourceLeadMeasureDaily(record) {
  const nextRecord = normalizeRow("leadMeasuresDaily", record);
  const key = normalizeString(nextRecord.date);
  if (!key) return;

  state.sourceData.leadMeasuresDaily = Array.isArray(state.sourceData.leadMeasuresDaily)
    ? state.sourceData.leadMeasuresDaily
    : [];

  const existingIndex = state.sourceData.leadMeasuresDaily.findIndex((item) => normalizeString(item.date) === key);

  if (existingIndex >= 0) {
    state.sourceData.leadMeasuresDaily[existingIndex] = {
      ...state.sourceData.leadMeasuresDaily[existingIndex],
      ...nextRecord,
    };
  } else {
    state.sourceData.leadMeasuresDaily.unshift(nextRecord);
  }
}

function applySavedActivityToApiState({ activity, company, scorecard, dailyScore }) {
  let changed = false;

  if (activity) {
    upsertSourceActivity(activity);
    changed = true;
  }

  if (company?.company) {
    upsertSourceAccount(company);
    changed = true;
  }

  if (scorecard?.week_start) {
    upsertSourceScorecard(scorecard);
    changed = true;
  }

  if (dailyScore?.date) {
    upsertSourceDailyScore(dailyScore);
    changed = true;
  }

  if (changed) {
    refreshCombinedData();
  }
}

function mergeAccounts(sourceAccounts, manualAccounts, activities) {
  const merged = new Map();
  const orderedActivities = [...activities].sort(compareActivitiesChronologically);

  [...sourceAccounts, ...manualAccounts].forEach((account) => {
    if (!account.company) return;
    merged.set(account.company.toLowerCase(), { ...account });
  });

  orderedActivities.forEach((activity) => {
    if (!activity.company) return;
    const key = activity.company.toLowerCase();
    const existing = merged.get(key) || {
      company: activity.company,
      pipeline_stage: "",
      account_health: "",
      last_outcome: "",
      workers: 0,
      lead_date: null,
      last_contact: null,
      next_step: "",
      next_step_date: null,
      standby_reason: "",
      reactivation_date: null,
      sector: "",
      notes: "",
    };

    const plannedActivity = isPlannedActivity(activity);

    if (!plannedActivity && activity.date) {
      existing.last_contact = activity.date;
    }

    if (!plannedActivity && activity.outcome) {
      existing.last_outcome = activity.outcome;
    }

    if (activity.activity_type === "contract_signed" && activity.workers_delta > existing.workers) {
      existing.workers = activity.workers_delta;
    }

    if (activity.next_step) {
      existing.next_step = activity.next_step;
    }

    if (activity.next_step_date) {
      existing.next_step_date = activity.next_step_date;
    }

    merged.set(key, existing);
  });

  const derivedLeadDates = buildLeadDateIndexFromActivities(activities);
  const activityKeys = new Set(activities.filter((a) => a.company).map((a) => a.company.toLowerCase()));
  return [...merged.values()].map((account) => ({
    ...account,
    lead_date: account.lead_date || derivedLeadDates.get(normalizeCompanyKey(account.company)) || null,
  })).filter((account) => {
    const key = account.company.toLowerCase();
    return isTrackedAccount(account) || activityKeys.has(key);
  });
}

function syncManualAccountFromActivity(activity) {
  const key = activity.company.toLowerCase();
  const existingIndex = state.manualData.accounts.findIndex((item) => item.company.toLowerCase() === key);
  const current = existingIndex >= 0
    ? { ...state.manualData.accounts[existingIndex] }
    : {
        company: activity.company,
        pipeline_stage: "",
        account_health: "",
        last_outcome: "",
        workers: 0,
        lead_date: null,
        last_contact: null,
        next_step: "",
        next_step_date: null,
        standby_reason: "",
        reactivation_date: null,
        sector: "",
        notes: "",
      };

  const plannedActivity = isPlannedActivity(activity);

  if (!plannedActivity && activity.date && (!current.lead_date || activity.date < current.lead_date)) {
    current.lead_date = activity.date;
  }

  if (!plannedActivity && activity.date && (!current.last_contact || activity.date > current.last_contact)) {
    current.last_contact = activity.date;
  }

  if (
    !plannedActivity
    && (
    activity.outcome
    && (
      !current.last_outcome
      || !current.last_contact
      || (activity.date && activity.date >= current.last_contact)
    )
    )
  ) {
    current.last_outcome = activity.outcome;
  }

  if (activity.activity_type === "contract_signed" && activity.workers_delta > current.workers) {
    current.workers = activity.workers_delta;
  }

  if (activity.next_step) {
    current.next_step = activity.next_step;
  }

  if (activity.next_step_date) {
    current.next_step_date = activity.next_step_date;
  }

  if (existingIndex >= 0) {
    state.manualData.accounts[existingIndex] = current;
  } else {
    state.manualData.accounts.unshift(current);
  }
}

function upsertManualAccount(record) {
  const key = record.company.toLowerCase();
  const existingIndex = state.manualData.accounts.findIndex((item) => item.company.toLowerCase() === key);

  if (existingIndex >= 0) {
    state.manualData.accounts[existingIndex] = {
      ...state.manualData.accounts[existingIndex],
      ...record,
    };
  } else {
    state.manualData.accounts.unshift(record);
  }
}

function clearManualAccountTracking(companyName) {
  const key = companyName.toLowerCase();
  const existingIndex = state.manualData.accounts.findIndex((item) => item.company.toLowerCase() === key);
  if (existingIndex < 0) return;

  state.manualData.accounts[existingIndex] = {
    ...state.manualData.accounts[existingIndex],
    pipeline_stage: "",
    account_health: "",
    last_outcome: "",
    lead_date: null,
    last_contact: null,
    next_step: "",
    next_step_date: null,
    standby_reason: "",
    reactivation_date: null,
  };
}

function upsertManualScorecard(record) {
  const key = record.week_key || record.week_start;
  const existingIndex = state.manualScorecards.findIndex((item) => (item.week_key || item.week_start) === key);

  if (existingIndex >= 0) {
    state.manualScorecards[existingIndex] = {
      ...state.manualScorecards[existingIndex],
      ...record,
    };
  } else {
    state.manualScorecards.unshift(record);
  }
}

function syncManualScorecardFromActivity(activity, existingActivities = []) {
  const weekStart = getWeekStart(activity.date);
  if (!weekStart) {
    return { updated: false, reason: "invalid_week" };
  }

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

  const weekEnd = getWeekEnd(weekStart);
  const existing = state.manualScorecards.find(
    (item) => (item.week_key || item.week_start) === weekStart || item.week_start === weekStart
  );
  const baseRecord = existing
    ? { ...existing }
    : normalizeRow("scorecard", {
        week_start: weekStart,
        week_end: weekEnd,
        week_key: weekStart,
        week_label: buildWeekLabel(weekStart, weekEnd),
      });
  const nextRecord = applyComputedScorecardFields({
    ...baseRecord,
    linkedin_messages: toNumber(baseRecord.linkedin_messages) + (shouldIncrementWhatsApp ? 1 : 0),
    dream100_p1_prospects: toNumber(baseRecord.dream100_p1_prospects) + (shouldIncrementDream100 ? 1 : 0),
    meetings_set: toNumber(baseRecord.meetings_set) + (shouldIncrementMeetings ? 1 : 0),
    offers_sent: toNumber(baseRecord.offers_sent) + (shouldIncrementOffers ? 1 : 0),
    contracts_signed: toNumber(baseRecord.contracts_signed) + (shouldIncrementContracts ? 1 : 0),
  });

  upsertManualScorecard(nextRecord);
  return {
    updated: true,
    week_start: weekStart,
    linkedin_messages: nextRecord.linkedin_messages,
    dream100_p1_prospects: nextRecord.dream100_p1_prospects,
    meetings_set: nextRecord.meetings_set,
    offers_sent: nextRecord.offers_sent,
    contracts_signed: nextRecord.contracts_signed,
    metrics_updated: [
      shouldIncrementDream100 ? "dream100_p1_prospects" : "",
      shouldIncrementWhatsApp ? "whatsapp_messages" : "",
      shouldIncrementMeetings ? "meetings_set" : "",
      shouldIncrementOffers ? "offers_sent" : "",
      shouldIncrementContracts ? "contracts_signed" : "",
    ].filter(Boolean),
  };
}

function upsertManualDailyScore(record) {
  const key = normalizeString(record.date);
  const existingIndex = state.manualData.dailyScores.findIndex((item) => normalizeString(item.date) === key);

  if (existingIndex >= 0) {
    state.manualData.dailyScores[existingIndex] = {
      ...state.manualData.dailyScores[existingIndex],
      ...record,
    };
  } else {
    state.manualData.dailyScores.unshift(record);
  }
}

function upsertManualLeadMeasureDaily(record) {
  const key = normalizeString(record.date);
  const existingIndex = state.manualData.leadMeasuresDaily.findIndex((item) => normalizeString(item.date) === key);

  if (existingIndex >= 0) {
    state.manualData.leadMeasuresDaily[existingIndex] = {
      ...state.manualData.leadMeasuresDaily[existingIndex],
      ...record,
    };
  } else {
    state.manualData.leadMeasuresDaily.unshift(record);
  }
}

function syncManualDailyTrendFromActivity(activity, existingActivities = []) {
  if (!activity?.date || !isLiveActivityEntry(activity)) {
    return { updated: false, reason: "not_trend_activity" };
  }

  const date = toIsoDateValue(activity.date);
  if (!date) {
    return { updated: false, reason: "invalid_date" };
  }

  const counts = countActivities(
    [...existingActivities, activity].filter((record) => toIsoDateValue(record.date) === date)
  );
  const existing = state.manualData.dailyScores.find((row) => row.date === date);

  upsertManualDailyScore({
    id: existing?.id || "",
    date,
    contacted: counts.contacted,
    meetings: counts.meeting,
    offers: counts.offer,
    contracts: counts.contract_signed,
    notes: existing?.notes || "",
  });

  return {
    updated: true,
    date,
    counts,
  };
}

function normalizeRow(kind, row) {
  if (kind === "leadMeasuresDaily") {
    return {
      id: row.id || "",
      date: row.date || "",
      cold_calls: toNumber(row.cold_calls || row.coldCalls || 0),
      whatsapp_messages: toNumber(row.whatsapp_messages || row.whatsappMessages || 0),
      field_visits: toNumber(row.field_visits || row.fieldVisits || 0),
      warm_outreach: toNumber(row.warm_outreach || row.warmOutreach || 0),
      notes: row.notes || "",
    };
  }

  if (kind === "dailyScores") {
    return {
      id: row.id || "",
      date: row.date || "",
      contacted: toNumber(row.contacted || row.contacts || 0),
      meetings: toNumber(row.meetings || row.meeting || 0),
      offers: toNumber(row.offers || row.offer || 0),
      contracts: toNumber(row.contracts || row.contract_signed || row.contractSigned || 0),
      notes: row.notes || "",
    };
  }

  if (kind === "accounts") {
    return {
      company: row.company || row.name || "",
      pipeline_stage: normalizePipelineStage(row.pipeline_stage || row.pipelineStage || row.stage),
      account_health: normalizeAccountHealth(row.account_health || row.accountHealth || row.health),
      last_outcome: row.last_outcome || row.lastOutcome || "",
      workers: toNumber(row.workers || row.potential_volume || row.workers_requested || 0),
      lead_date: parseDate(row.lead_date || row.leadDate),
      last_contact: parseDate(row.last_contact || row.date),
      next_step: row.next_step || "",
      next_step_date: parseDate(row.next_step_date),
      standby_reason: row.standby_reason || row.standbyReason || "",
      reactivation_date: parseDate(row.reactivation_date || row.reactivationDate),
      sector: row.sector || row.industry || "",
      notes: row.notes || "",
    };
  }

  if (kind === "scorecard") {
    const weekStart = getWeekStart(row.week_start || row.weekStart || row.week_key || row.weekKey);
    const weekEnd = getWeekEnd(weekStart || row.week_end || row.weekEnd);
    return {
      id: row.id || "",
      week_start: weekStart,
      week_end: row.week_end || row.weekEnd || weekEnd,
      week_key: row.week_key || row.weekKey || weekStart,
      week_label: row.week_label || row.weekLabel || buildWeekLabel(weekStart, weekEnd),
      new_contract_workers_mtd: toNumber(row.new_contract_workers_mtd || row.newContractWorkersMtd || 0),
      dream100_p1_prospects: toNumber(row.dream100_p1_prospects || row.dream100P1Prospects || 0),
      sales_velocity_days: toNumber(row.sales_velocity_days || row.salesVelocityDays || 0),
      cold_calls: toNumber(row.cold_calls || row.coldCalls || 0),
      linkedin_messages: toNumber(row.linkedin_messages || row.linkedInMessages || row.whatsapp_messages || row.whatsappMessages || 0),
      field_visits: toNumber(row.field_visits || row.fieldVisits || 0),
      warm_outreach: toNumber(row.warm_outreach || row.warmOutreach || 0),
      meetings_set: toNumber(row.meetings_set || row.meetingsSet || 0),
      offers_sent: toNumber(row.offers_sent || row.offersSent || 0),
      contracts_signed: toNumber(row.contracts_signed || row.contractsSigned || 0),
      workers_signed: toNumber(row.workers_signed || row.workersSigned || 0),
      workers_delivered: toNumber(row.workers_delivered || row.workersDelivered || 0),
      notes: row.notes || "",
    };
  }

  return {
    date: parseDate(row.date),
    created_at: parseDate(row.created_at || row.createdAt || row.created_time || row.createdTime),
    company: row.company || row.account || "",
    activity_type: normalizeActivity(row.activity_type || row.type || row.status),
    outcome: row.outcome || row.result || "",
    workers_delta: toNumber(row.workers_delta || row.workers || 0),
    next_step: row.next_step || "",
    next_step_date: parseDate(row.next_step_date),
    notes: row.notes || row.summary || "",
  };
}

function normalizeStatus(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "signed") return "contract_signed";
  if (key === "proposal" || key === "proposal_sent" || key === "offer_sent" || key === "contract_review") {
    return "offer";
  }
  if (stageOrder[key] !== undefined) return key;
  return key ? "contacted" : "new";
}

function normalizePipelineStage(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (legacyStageMap[raw]) return legacyStageMap[raw];

  const match = pipelineStageOptions.find(
    (option) => option.toLowerCase() === raw.toLowerCase()
  );
  if (match) return match;

  const fallback = {
    new: "Necontactat",
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
    lost: "Pierdut",
  };

  return fallback[normalizeStatus(raw)] || raw;
}

function normalizeAccountHealth(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const emojiMap = {
    "🟢": "Verde",
    "🟡": "Galben",
    "🔴": "Rosu",
    "⚪": "Gri",
    "⚪️": "Gri",
  };
  if (emojiMap[raw]) return emojiMap[raw];
  const match = accountHealthOptions.find(
    (option) => option.toLowerCase() === raw.toLowerCase()
  );
  return match || raw;
}

function mapActivityToPipelineStage(activityType = "") {
  if (normalizeActivity(activityType) === "planned") {
    return "";
  }
  const mapping = {
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
  };
  return mapping[normalizeActivity(activityType)] || "Necontactat";
}

function mapPipelineStageToActivityType(stage = "") {
  const normalized = normalizePipelineStage(stage);
  const mapping = {
    Contactat: "contacted",
    Meeting: "meeting",
    Oferta: "offer",
    Negociere: "offer",
    "Contract semnat": "contract_signed",
  };
  return mapping[normalized] || "";
}

function normalizeActivity(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  return activityAliases[key] || "contacted";
}

function isPlannedActivity(activity = {}) {
  return normalizeActivity(activity.activity_type) === "planned";
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getActivityDateValue(activity = {}) {
  return activity.date ? activity.date.getTime() : 0;
}

function getActivityCreatedValue(activity = {}) {
  return activity.created_at ? activity.created_at.getTime() : 0;
}

function compareActivitiesChronologically(left = {}, right = {}) {
  const dateDiff = getActivityDateValue(left) - getActivityDateValue(right);
  if (dateDiff !== 0) return dateDiff;

  const createdDiff = getActivityCreatedValue(left) - getActivityCreatedValue(right);
  if (createdDiff !== 0) return createdDiff;

  return 0;
}

function compareActivitiesReverseChronologically(left = {}, right = {}) {
  return compareActivitiesChronologically(right, left);
}

function getWeekStart(value) {
  const date = parseDate(value);
  if (!date) return "";
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayOffset = (normalized.getUTCDay() + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - mondayOffset);
  return normalized.toISOString().slice(0, 10);
}

function getTodayIsoDate() {
  return toIsoDateValue(new Date());
}

function getWeekEnd(value) {
  const weekStart = getWeekStart(value);
  const date = parseDate(weekStart);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function buildWeekLabel(weekStart, weekEnd) {
  const startDate = parseDate(weekStart);
  const endDate = parseDate(weekEnd || getWeekEnd(weekStart));
  if (!startDate || !endDate) return "";

  const start = new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
  }).format(startDate);

  const end = new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(endDate);

  return `${start} - ${end}`;
}

function toNumber(value) {
  const num = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeOutcomeKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isWhatsAppMessageOutcome(value = "") {
  return normalizeOutcomeKey(value) === normalizeOutcomeKey(whatsappMessageOutcome);
}

function toIsoDateValue(value) {
  if (typeof value === "string") {
    const directMatch = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) return directMatch[1];
  }

  const date = parseDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isFirstLiveCompanyTouch(activity, existingActivities = []) {
  if (!activity?.company || !activity?.date) return false;
  if (!isLiveActivityEntry(activity)) return false;

  const companyKey = normalizeCompanyKey(activity.company);
  const activityDate = toIsoDateValue(activity.date);

  if (!companyKey || !activityDate) return false;

  return !existingActivities.some((record) => (
    record.company
    && normalizeCompanyKey(record.company) === companyKey
    && isLiveActivityEntry(record)
    && toIsoDateValue(record.date)
    && toIsoDateValue(record.date) <= activityDate
  ));
}

function formatScorecardSyncBadge(scorecardSync = {}) {
  if (!scorecardSync?.updated) return "";

  const labels = [];
  if (Array.isArray(scorecardSync.metrics_updated)) {
    if (scorecardSync.metrics_updated.includes("dream100_p1_prospects")) {
      labels.push("Dream100 P1");
    }
    if (scorecardSync.metrics_updated.includes("whatsapp_messages")) {
      labels.push("WhatsApp");
    }
    if (scorecardSync.metrics_updated.includes("meetings_set")) {
      labels.push("Meetings");
    }
    if (scorecardSync.metrics_updated.includes("offers_sent")) {
      labels.push("Oferte");
    }
    if (scorecardSync.metrics_updated.includes("contracts_signed")) {
      labels.push("Contracte");
    }
  }

  return labels.length
    ? ` + scorecard sincronizat (${labels.join(", ")})`
    : " + scorecard sincronizat";
}

function formatTrendSyncBadge(trendSync = {}) {
  return trendSync?.updated ? " + trend zilnic sincronizat" : "";
}

function isPendingContactOutcome(value = "") {
  const normalized = normalizeOutcomeKey(value);
  return normalized === "nu raspunde" || isWhatsAppMessageOutcome(value);
}

function stageRank(status = "") {
  return stageOrder[status] ?? 0;
}

function pipelineStageValueRank(stage = "") {
  return pipelineStageRank[normalizePipelineStage(stage)] ?? -3;
}

function mergePipelineStage(existingStage = "", activityType = "") {
  const currentStage = normalizePipelineStage(existingStage);
  if (lockedPipelineStages.has(currentStage)) {
    return currentStage;
  }

  const candidate = mapActivityToPipelineStage(activityType);
  return pipelineStageValueRank(candidate) > pipelineStageValueRank(currentStage)
    ? candidate
    : currentStage;
}

function isOfferStage(stage = "") {
  return ["Oferta", "Negociere"].includes(normalizePipelineStage(stage));
}

function isStandbyAccount(account = {}) {
  return normalizePipelineStage(account.pipeline_stage) === "Parcat";
}

function isPipelineOpen(stage = "") {
  const normalized = normalizePipelineStage(stage);
  if (!normalized) return false;
  return !["Necontactat", "Contract semnat", "Parcat", "Pierdut"].includes(normalized);
}

function isTrackedAccount(account = {}) {
  return Boolean(
    normalizeString(account.pipeline_stage)
    || normalizeString(account.account_health)
    || normalizeString(account.last_outcome)
    || account.last_contact
    || normalizeString(account.next_step)
    || account.next_step_date
    || normalizeString(account.standby_reason)
    || account.reactivation_date
  );
}

function isMovingAccount(account = {}) {
  return isTrackedAccount(account) && isPipelineOpen(account.pipeline_stage);
}

function normalizeCompanyKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function canonicalCompanyName(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const exactMatch = getCompanyCatalog().find(
    (company) => normalizeCompanyKey(company) === normalizeCompanyKey(trimmed)
  );
  if (exactMatch) return exactMatch;

  if (trimmed.length < 3) return trimmed;

  const prefixMatches = getCompanyCatalog().filter(
    (company) => company.toLowerCase().startsWith(trimmed.toLowerCase())
  );

  return prefixMatches.length === 1 ? prefixMatches[0] : trimmed;
}

function resolveCompanyInput(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return {
      ok: false,
      company: "",
      message: "Alege sau scrie numele companiei.",
    };
  }

  const canonical = canonicalCompanyName(trimmed);
  if (canonical !== trimmed) {
    return {
      ok: true,
      company: canonical,
    };
  }

  if (trimmed.length < 3) {
    return {
      ok: true,
      company: trimmed,
    };
  }

  const similar = getCompanyCatalog().filter((companyName) => {
    const company = companyName.toLowerCase();
    const query = trimmed.toLowerCase();
    return company.startsWith(query) || company.includes(query);
  });

  if (similar.length > 1) {
    const options = similar.slice(0, 5).join(", ");
    return {
      ok: false,
      company: trimmed,
      message: `Exista mai multe companii similare: ${options}. Alege una din sugestiile din camp.`,
    };
  }

  return {
    ok: true,
    company: trimmed,
  };
}

function getCompanyCatalog() {
  return [...new Set([
    ...state.sourceData.accounts.map((account) => normalizeString(account.company)),
    ...state.manualData.accounts.map((account) => normalizeString(account.company)),
    ...state.accounts.map((account) => normalizeString(account.company)),
    ...state.sourceData.activities.map((activity) => normalizeString(activity.company)),
    ...state.manualData.activities.map((activity) => normalizeString(activity.company)),
    ...state.activities.map((activity) => normalizeString(activity.company)),
  ].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ro"));
}

function getFilteredCompanyCatalog(query = "") {
  const names = getCompanyCatalog();
  const trimmedQuery = String(query || "").trim().toLowerCase();
  if (!trimmedQuery) return names;

  const prefixMatches = [];
  const containsMatches = [];

  names.forEach((name) => {
    const normalized = name.toLowerCase();
    if (normalized.startsWith(trimmedQuery)) {
      prefixMatches.push(name);
    } else if (normalized.includes(trimmedQuery)) {
      containsMatches.push(name);
    }
  });

  return [...prefixMatches, ...containsMatches];
}

function initCompanyPickers() {
  elements.companyInputs.forEach((input) => {
    const field = input.closest(".field");
    if (!field) return;

    field.classList.add("field--company");
    input.removeAttribute("list");

    let dropdown = field.querySelector(".company-suggestions");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "company-suggestions is-hidden";
      dropdown.setAttribute("role", "listbox");
      dropdown.setAttribute("aria-label", "Sugestii companii");
      field.appendChild(dropdown);
    }

    const renderSuggestions = () => {
      const matches = getFilteredCompanyCatalog(input.value);

      if (!matches.length) {
        dropdown.innerHTML = `
          <div class="company-suggestion company-suggestion--empty">
            Nu exista companii potrivite in lista curenta.
          </div>
        `;
        return;
      }

      dropdown.innerHTML = matches
        .map((name) => `
          <button class="company-suggestion" type="button" data-company="${escapeHtml(name)}">
            <span>${escapeHtml(name)}</span>
          </button>
        `)
        .join("");
    };

    const showSuggestions = () => {
      renderSuggestions();
      dropdown.classList.remove("is-hidden");
      field.classList.add("has-company-suggestions");
    };

    const hideSuggestions = () => {
      dropdown.classList.add("is-hidden");
      field.classList.remove("has-company-suggestions");
    };

    input.addEventListener("focus", showSuggestions);
    input.addEventListener("input", showSuggestions);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideSuggestions();
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!field.contains(document.activeElement)) {
          hideSuggestions();
        }
      }, 120);
    });

    dropdown.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-company]");
      if (!option) return;

      event.preventDefault();
      input.value = option.dataset.company || "";
      hideSuggestions();
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
    });
  });

  document.addEventListener("click", (event) => {
    elements.companyInputs.forEach((input) => {
      const field = input.closest(".field--company");
      const dropdown = field?.querySelector(".company-suggestions");
      if (!field || !dropdown) return;
      if (field.contains(event.target)) return;
      dropdown.classList.add("is-hidden");
      field.classList.remove("has-company-suggestions");
    });
  });
}

function updateCompanyOptions() {
  const names = getCompanyCatalog();

  elements.companyOptions.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");

  elements.companyInputs.forEach((input) => {
    const field = input.closest(".field--company");
    const dropdown = field?.querySelector(".company-suggestions");
    if (!field || !dropdown || dropdown.classList.contains("is-hidden")) return;

    const matches = getFilteredCompanyCatalog(input.value);
    dropdown.innerHTML = matches.length
      ? matches.map((name) => `
          <button class="company-suggestion" type="button" data-company="${escapeHtml(name)}">
            <span>${escapeHtml(name)}</span>
          </button>
        `).join("")
      : `<div class="company-suggestion company-suggestion--empty">Nu exista companii potrivite in lista curenta.</div>`;
  });
}

function updateStatus(message) {
  elements.statusMessage.textContent = message;
  if (elements.companyFormStatus) {
    elements.companyFormStatus.textContent = message;
  }
}

function updateScorecardStatus(message) {
  if (elements.scorecardFormStatus) {
    elements.scorecardFormStatus.textContent = message;
  }
}

function updateDailyTrendStatus(message) {
  if (elements.dailyTrendFormStatus) {
    elements.dailyTrendFormStatus.textContent = message;
  }
}

function updateLeadMeasuresStatus(message) {
  if (elements.leadMeasuresFormStatus) {
    elements.leadMeasuresFormStatus.textContent = message;
  }
}

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, "").trim();
  return dashboardPages.has(hash) ? hash : "scorecard";
}

function setPage(page, options = {}) {
  const { syncHash = true } = options;
  state.page = dashboardPages.has(page) ? page : "scorecard";

  if (syncHash) {
    const nextHash = `#${state.page}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  renderPage();
}

function renderPage() {
  elements.pageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === state.page);
  });

  elements.pageSections.forEach((section) => {
    section.classList.toggle("is-hidden", section.dataset.page !== state.page);
  });
}

function render() {
  const weeklyMovement = getHeroMovementMetrics();
  const openPipelineActions = getOpenPipelineActionCounts();
  elements.dataModePill.textContent = !state.bootstrapReady
    ? "Se conecteaza..."
    : state.apiEnabled
    ? "Airtable live"
    : hasManualData()
      ? "Fallback local"
      : "Asteapta conexiunea";
  elements.weeklyTouchChip.textContent = `${weeklyMovement.weekly.totalTouches} touch-uri`;
  elements.dueTodayChip.textContent = `${openPipelineActions.dueToday} conturi`;
  elements.overdueChip.textContent = `${openPipelineActions.overdue} conturi`;

  renderPacingCard();
  renderChecklist();
  renderScorecardDashboard();
  renderTrend();
  renderPipeline();
  renderExecutionSummary();
  renderAlerts();
  renderActivities();
  renderConnection();
  renderPage();
}

function getWorkingDaysInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  let total = 0;
  let elapsed = 0;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d += 1) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) {
      total += 1;
      if (d <= today) elapsed += 1;
    }
  }

  return { total: Math.max(total, 1), elapsed: Math.max(elapsed, 1) };
}

function getCurrentWeekWorkingDaysInfo(now = new Date()) {
  const day = now.getDay();
  const elapsed = day === 0 ? 5 : Math.min(day, 5);
  return {
    total: 5,
    elapsed: Math.max(elapsed, 1),
  };
}

function buildFirstLiveTouchIndexFromActivities(activities = []) {
  const sorted = [...activities]
    .filter((activity) => activity.company && activity.date && isLiveActivityEntry(activity))
    .sort((left, right) => {
      const leftTime = left.date?.getTime?.() || 0;
      const rightTime = right.date?.getTime?.() || 0;
      return leftTime - rightTime;
    });

  const firstTouchByCompany = new Map();

  sorted.forEach((activity) => {
    const companyKey = normalizeCompanyKey(activity.company);
    if (!companyKey || firstTouchByCompany.has(companyKey)) return;
    firstTouchByCompany.set(companyKey, activity.date);
  });

  return firstTouchByCompany;
}

function getCurrentWeekLiveActivities() {
  const weekStart = getWeekStart(getTodayIsoDate());
  return getWeeklyActivitiesForScorecard({
    week_start: weekStart,
    week_end: getWeekEnd(weekStart),
  });
}

function buildCompanyMovementMetrics(activities = [], rangeStart = null, rangeEnd = null) {
  const touchedCompanies = new Map();
  const firstTouchIndex = buildFirstLiveTouchIndexFromActivities(state.activities);

  activities.forEach((activity) => {
    if (!isLiveActivityEntry(activity)) return;

    const companyKey = normalizeCompanyKey(activity.company);
    if (!companyKey) return;

    const firstTouchDate = firstTouchIndex.get(companyKey);
    const existingEntry = touchedCompanies.get(companyKey) || {
      company: activity.company,
      touches: 0,
      isNew: false,
    };

    existingEntry.touches += 1;
    existingEntry.isNew = Boolean(
      rangeStart
      && rangeEnd
      && firstTouchDate
      && isDateWithinInclusiveRange(firstTouchDate, rangeStart, rangeEnd)
    );

    touchedCompanies.set(companyKey, existingEntry);
  });

  const companies = [...touchedCompanies.values()];
  const newCompanies = companies.filter((entry) => entry.isNew).length;

  return {
    moved: companies.length,
    newCompanies,
    followUp: Math.max(companies.length - newCompanies, 0),
    totalTouches: activities.length,
  };
}

function getHeroMovementMetrics(now = new Date()) {
  const weekStart = parseDate(getWeekStart(getTodayIsoDate()));
  const weekEnd = parseDate(getWeekEnd(getTodayIsoDate()));
  const monthStart = parseDate(`${getTodayIsoDate().slice(0, 7)}-01`);
  const monthEnd = parseDate(getMonthEnd(getTodayIsoDate()));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return {
    weekly: buildCompanyMovementMetrics(getCurrentWeekLiveActivities(), weekStart, weekEnd),
    monthly: buildCompanyMovementMetrics(getMonthlyActivities(), monthStart, monthEnd),
    today: buildCompanyMovementMetrics(getTodayActivities(), today, today),
  };
}

function getOpenPipelineActionCounts(now = new Date()) {
  const openAccounts = state.accounts.filter((account) => isMovingAccount(account));

  return openAccounts.reduce((counts, account) => {
    if (!account.next_step_date) return counts;

    const delta = dayDiff(account.next_step_date, now);
    if (delta === 0) counts.dueToday += 1;
    if (delta > 0) counts.overdue += 1;
    return counts;
  }, {
    dueToday: 0,
    overdue: 0,
  });
}

function renderPacingCard() {
  if (!elements.pacingCard) return;

  const movement = getHeroMovementMetrics();
  const { total, elapsed } = getCurrentWeekWorkingDaysInfo();
  const target = state.targets.movedCompaniesWeekly ?? defaultTargets.movedCompaniesWeekly ?? 1;
  const expectedByNow = Math.round((target / total) * elapsed);
  const ratio = expectedByNow > 0 ? movement.weekly.moved / expectedByNow : 1;

  let statusLabel, statusColor, pacingBg;
  if (ratio >= 0.8) {
    statusLabel = "Ritm OK";
    statusColor = "#10b981";
    pacingBg = "rgba(16,185,129,0.18)";
  } else if (ratio >= 0.5) {
    statusLabel = "In urma";
    statusColor = "#f59e0b";
    pacingBg = "rgba(245,158,11,0.18)";
  } else {
    statusLabel = "Sub ritm";
    statusColor = "#ef4444";
    pacingBg = "rgba(239,68,68,0.18)";
  }

  elements.pacingCard.style.setProperty("--pacing-bg", pacingBg);
  elements.pacingCard.style.setProperty("--pacing-color", statusColor);
  elements.pacingCard.innerHTML = `
    <div class="hero-pacing-label">Companii miscate / saptamana</div>
    <div class="hero-pacing-number" style="color:${statusColor};">${movement.weekly.moved}<span class="hero-pacing-target"> / ${target}</span></div>
    <div class="hero-pacing-status">
      Saptamana asta: <strong>${movement.weekly.newCompanies}</strong> noi · <strong>${movement.weekly.followUp}</strong> follow-up
      <span class="hero-pacing-badge" style="color:${statusColor}; border-color:${statusColor}33; background:${pacingBg};">${statusLabel}</span>
    </div>
    <div class="hero-pacing-meta">Azi: ${movement.today.moved} companii unice miscate · ${movement.today.totalTouches} touch-uri azi · ${movement.today.followUp} follow-up · Luna asta: ${movement.monthly.moved} companii miscate · ${movement.weekly.totalTouches} touch-uri totale saptamana asta · Asteptat pana azi: ${expectedByNow} · zi lucratoare ${elapsed} din ${total}</div>
  `;
}

function renderConnection() {
  const tables = state.connection?.tables || {};
  const chips = [];

  chips.push(
    `<div class="mini-chip">${state.apiEnabled ? "Scrie direct in Airtable" : "Fallback local activ"}</div>`
  );

  if (state.connection?.baseId) {
    chips.push(`<div class="mini-chip">Base: ${escapeHtml(state.connection.baseId)}</div>`);
  }

  if (tables.companies) {
    chips.push(`<div class="mini-chip">Companies: ${escapeHtml(tables.companies)}</div>`);
  }

  if (tables.activities) {
    chips.push(`<div class="mini-chip">Activities: ${escapeHtml(tables.activities)}</div>`);
  }

  if (tables.targets) {
    chips.push(`<div class="mini-chip">Targets: ${escapeHtml(tables.targets)}</div>`);
  }

  if (tables.scorecard) {
    chips.push(`<div class="mini-chip">Scorecard: ${escapeHtml(tables.scorecard)}</div>`);
  }

  if (tables.scorecardTrend) {
    chips.push(`<div class="mini-chip">Scorecard Trend: ${escapeHtml(tables.scorecardTrend)}</div>`);
  }

  if (tables.leadMeasuresDaily) {
    chips.push(`<div class="mini-chip">Lead Measures Daily: ${escapeHtml(tables.leadMeasuresDaily)}</div>`);
  }

  chips.push(`<div class="mini-chip">Build: ${appBuild}</div>`);
  chips.push(`<div class="mini-chip">Host: ${escapeHtml(window.location.host)}</div>`);

  if (state.connection?.activityCompanyLinked !== undefined) {
    chips.push(
      `<div class="mini-chip">${
        state.connection.activityCompanyLinked ? "Activities -> linked company" : "Activities -> text company"
      }</div>`
    );
  }

  const warnings = state.warnings
    .map((warning) => `<article class="note-card">${escapeHtml(warning)}</article>`)
    .join("");

  elements.connectionCopy.textContent = state.apiEnabled
    ? "Baza Grow este conectata. Formularele scriu direct in Airtable, iar trendul zilnic si Key Lead Measures vin din tabele dedicate."
    : "Pana setezi variabilele de mediu in Vercel, dashboard-ul retine local activitatile, target-urile, trendul zilnic, lead measures si scorecard-ul saptamanal.";

  elements.connectionBadges.innerHTML = `
    <div class="chip-wrap">${chips.join("")}</div>
    ${warnings}
  `;
}

function renderChecklist() {
  if (!elements.checklistSnapshot || !elements.checklistDayGrid || !elements.checklistWeekGrid) return;

  const queues = getExecutionQueues();
  const todayActivities = getTodayActivities();
  const todayCounts = countActivities(todayActivities);
  const monthlyCounts = countActivities(getMonthlyActivities());
  const trackedOpenAccounts = state.accounts.filter(
    (account) => isMovingAccount(account)
  ).length;
  const { total, elapsed } = getWorkingDaysInfo();
  const workingDaysLeft = Math.max(total - elapsed + 1, 1);
  const contactsRemaining = Math.max((state.targets.contacted || 0) - monthlyCounts.contacted, 0);
  const meetingsRemaining = Math.max((state.targets.meetings || 0) - monthlyCounts.meeting, 0);
  const dailyContactsNeeded = Math.ceil(contactsRemaining / workingDaysLeft);
  const dailyMeetingsNeeded = Math.ceil(meetingsRemaining / workingDaysLeft);
  const trendTable = state.connection?.tables?.scorecardTrend || "Scorecard Trend";
  const scorecardTable = state.connection?.tables?.scorecard || "Scorecard";

  elements.checklistSnapshot.innerHTML = [
    buildChecklistSnapshotCard({
      eyebrow: "Astazi",
      label: "Conturi de miscat",
      value: queues.overdue.length + queues.today.length,
      meta: `${queues.overdue.length} intarziate · ${queues.today.length} programate azi`,
      tone: "#c98622",
      soft: "#f7ecd5",
    }),
    buildChecklistSnapshotCard({
      eyebrow: "Executie",
      label: "Touch-uri salvate azi",
      value: todayActivities.length,
      meta: `${todayCounts.contacted} contacte · ${todayCounts.meeting} meetings`,
      tone: "#2f6ea2",
      soft: "#e4eef7",
    }),
    buildChecklistSnapshotCard({
      eyebrow: "Pipeline",
      label: "Companii active",
      value: trackedOpenAccounts,
      meta: `${queues.stale.length} reci fara miscare peste 7 zile`,
      tone: "#2d8f57",
      soft: "#e5f3eb",
    }),
    buildChecklistSnapshotCard({
      eyebrow: "Ritm",
      label: "Necesar pe zi",
      value: `${dailyContactsNeeded}/${dailyMeetingsNeeded}`,
      meta: `${contactsRemaining} contacte si ${meetingsRemaining} meetings ramase luna asta`,
      tone: "#7b5cc9",
      soft: "#eee8fb",
    }),
  ].join("");

  elements.checklistDayGrid.innerHTML = [
    buildChecklistCard({
      tone: "#2f6ea2",
      soft: "#eef5fb",
      eyebrow: "Morning",
      title: "Start de zi",
      badge: `${queues.overdue.length + queues.today.length} miscari prioritare`,
      copy: "Pornesti din cadenta si alegi clar ce trebuie impins pana la pranz.",
      steps: [
        `Deschide Cadenta si curata mai intai cele ${queues.overdue.length} follow-up-uri intarziate.`,
        `Alege primele 3 conturi din "Ce trebuie miscat azi" si muta-le pana la ora 11.`,
        `Verifica Pipeline pentru conturile in Oferta sau Negociere si noteaza urmatorul pas realist.`,
        `Pleaca la drum cu tinta de azi: ${dailyContactsNeeded} contacte noi si ${dailyMeetingsNeeded} meetings spre targetul lunar.`,
      ],
      sources: [
        "Cadenta -> next step azi / intarziate",
        "Pipeline -> stadiu + next step",
      ],
      actions: [
        { label: "Deschide Cadenta", page: "execution", style: "secondary-button" },
        { label: "Vezi Pipeline", page: "pipeline", style: "ghost-button", focus: "company-search" },
      ],
    }),
    buildChecklistCard({
      tone: "#2d8f57",
      soft: "#eef8f2",
      eyebrow: "Rhythm",
      title: "In timpul zilei",
      badge: `${todayActivities.length} touch-uri deja salvate`,
      copy: "Regula simpla: un touch real trebuie sa lase in urma o urmare clara, nu doar memorie.",
      steps: [
        "Dupa fiecare apel, mesaj WhatsApp sau meeting real, salveaza touch-ul in aceeasi zi.",
        `Daca ai trimis doar un mesaj si astepti reactie, foloseste outcome-ul ${whatsappMessageOutcome}.`,
        "Daca nu ai ajuns la decident, marcheaza outcome-ul real: Nu am ajuns la decident, Nu raspunde, Revino mai tarziu.",
        "Daca discutia ramane deschisa, lasa obligatoriu si next step cu data.",
        "Cand alegi compania, foloseste sugestiile existente ca sa eviti duplicatele.",
      ],
      sources: [
        "Panou -> Adauga o activitate in 10 secunde",
        "Activities -> Company, Activity Type, Outcome",
      ],
      actions: [
        { label: "Log touch", page: "overview", style: "secondary-button", focus: "activity-form", openMobileLog: true },
        { label: "Deschide Setari", page: "settings", style: "ghost-button", focus: "refresh-data" },
      ],
    }),
    buildChecklistCard({
      tone: "#c98622",
      soft: "#fcf4e6",
      eyebrow: "After touch",
      title: "Dupa un touch real",
      badge: "salveaza contextul complet",
      copy: "Logul rapid poate retine touch-ul, urmatorul pas si, daca e cazul, noul stadiu din pipeline.",
      steps: [
        "Completeaza Companie, Actiune si Rezultat / status.",
        `Pentru outreach fara raspuns clar, foloseste ${whatsappMessageOutcome}.`,
        "Daca exista urmatorul pas, completeaza Next step si Data next step.",
        "Daca etapa s-a schimbat in realitate, actualizeaza Stadiu pipeline dupa touch.",
        "Pentru schimbari mai ample de cont, intra apoi si in Update rapid companie.",
      ],
      sources: [
        "Activities -> Company, Activity Type, Outcome, Next Step, Next Step Date, Notes",
        "Companies -> Stadiu Pipeline",
      ],
      actions: [
        { label: "Deschide log rapid", page: "overview", style: "secondary-button", focus: "activity-form", openMobileLog: true },
        { label: "Update companie", page: "pipeline", style: "ghost-button", focus: "account-form" },
      ],
    }),
    buildChecklistCard({
      tone: "#7b5cc9",
      soft: "#f3effc",
      eyebrow: "End of day",
      title: "Final de zi",
      badge: trendTable,
      copy: "Inchizi ziua cu date curate si cu maine deja programat, nu doar cu activitate bifata.",
      steps: [
        `Completeaza formularul din browser pentru ${trendTable}: Contactate, Meetings, Oferte, Contracte si Notes pentru ziua curenta.`,
        "Verifica daca toate touch-urile reale au next step atunci cand conversatia ramane deschisa.",
        "Uita-te in Cadenta si nu lasa conturi importante fara data pentru urmatoarea miscare.",
        "Pregateste primele 3 actiuni pentru dimineata urmatoare.",
      ],
      sources: [
        `${trendTable} -> Contactate, Meetings, Oferte, Contracte, Notes`,
        "Cadenta -> next step azi / intarziate",
      ],
      actions: [
        { label: "Inchide ziua", page: "checklist", style: "secondary-button", focus: "daily-trend-form" },
        { label: "Vezi Panou", page: "overview", style: "ghost-button", focus: "activity-form" },
      ],
    }),
    buildChecklistCard({
      tone: "#cb5846",
      soft: "#fceeea",
      eyebrow: "Rules",
      title: "Reminder cu regulile zilnice",
      badge: state.apiEnabled ? "Airtable live" : "Fallback local",
      copy: "Micile reguli care tin sistemul curat si fac datele utile, nu doar frumoase.",
      rules: [
        "Niciun touch real fara log in aceeasi zi.",
        "Niciun next step fara data atunci cand deal-ul ramane deschis.",
        "Quick Log este doar pentru touch-uri reale, nu pentru intentii.",
        "Stadiul din pipeline se schimba doar cand realitatea s-a schimbat.",
        "Alege compania din sugestii ca sa nu creezi duplicate.",
      ],
      sources: [
        "Activities + Companies sunt sursa operationala",
        `${scorecardTable} si ${trendTable} sunt sursa de review`,
      ],
      actions: [
        { label: "Deschide Setari", page: "settings", style: "secondary-button", focus: "refresh-data" },
        { label: "Scorecard saptamanal", page: "scorecard", style: "ghost-button", focus: "scorecard-form" },
      ],
    }),
  ].join("");

  elements.checklistWeekGrid.innerHTML = [
    buildChecklistCard({
      tone: "#2f6ea2",
      soft: "#eef5fb",
      eyebrow: "Monday",
      title: "Luni 10 min",
      badge: "reset de saptamana",
      copy: "Pui ritmul saptamanii fara sa reinventezi procesul.",
      steps: [
        "Verifica targetul lunar ramas si transforma-l in ritm zilnic realist pentru contacte si meetings.",
        "Alege 10 companii Dream 100 P1 pe care vrei sa le misti saptamana aceasta.",
        "Curata conturile reci sau parcarele care merita reactivate.",
        "Noteaza primele sedinte, vizite si blocaje care pot aparea in saptamana curenta.",
      ],
      sources: [
        "Cadenta + Pipeline",
        `Targets -> targete lunare curente`,
      ],
      actions: [
        { label: "Vezi Cadenta", page: "execution", style: "secondary-button" },
        { label: "Vezi Pipeline", page: "pipeline", style: "ghost-button", focus: "company-search" },
      ],
    }),
    buildChecklistCard({
      tone: "#c98622",
      soft: "#fcf4e6",
      eyebrow: "Midweek",
      title: "Mijlocul saptamanii",
      badge: "ajustare de ritm",
      copy: "Aici vezi daca activitatea produce viteza sau doar volum.",
      steps: [
        "Compara activitatea reala cu ritmul necesar pe zi si vezi unde esti sub target.",
        "Impinge conturile care stau prea mult in Contactat sau Meeting fara urmator pas clar.",
        "Verifica toate ofertele active si actualizeaza data reala pentru follow-up.",
        "Daca apar blocaje recurente, noteaza-le pentru Friday review.",
      ],
      sources: [
        "Pipeline -> Contactat, Meeting, Oferta, Negociere",
        "Cadenta -> intarziate si fara touch",
      ],
      actions: [
        { label: "Monitorizeaza Pipeline", page: "pipeline", style: "secondary-button", focus: "account-form" },
        { label: "Vezi Cadenta", page: "execution", style: "ghost-button" },
      ],
    }),
    buildChecklistCard({
      tone: "#2d8f57",
      soft: "#eef8f2",
      eyebrow: "Friday review",
      title: "Vineri",
      badge: scorecardTable,
      copy: "Aici inchizi saptamana si lasi datele gata pentru decizii, nu doar pentru raport.",
      steps: [
        `Completeaza pagina Scorecard, care scrie in tabela ${scorecardTable}, cu cifrele saptamanii.`,
        `Verifica in ${trendTable} daca fiecare zi lucrata are randul completat corect.`,
        "Analizeaza bottleneck-ul principal din palnie: Contact -> Meeting, Meeting -> Oferta sau Oferta -> Semnat.",
        "Lasa pregatite actiunile de luni si curata conturile care nu mai au sanse reale.",
      ],
      sources: [
        `${scorecardTable} -> review saptamanal`,
        `${trendTable} -> ritm zilnic`,
      ],
      actions: [
        { label: "Completeaza Scorecard", page: "scorecard", style: "secondary-button", focus: "scorecard-form" },
        { label: "Revino la Pipeline", page: "pipeline", style: "ghost-button", focus: "company-search" },
      ],
    }),
  ].join("");
}

function buildChecklistSnapshotCard(card) {
  return `
    <article class="checklist-snapshot-card" style="--checklist-accent:${card.tone}; --checklist-soft:${card.soft};">
      <div class="checklist-snapshot-eyebrow">${escapeHtml(card.eyebrow)}</div>
      <div class="checklist-snapshot-label">${escapeHtml(card.label)}</div>
      <div class="checklist-snapshot-value">${escapeHtml(card.value)}</div>
      <div class="checklist-snapshot-meta">${escapeHtml(card.meta)}</div>
    </article>
  `;
}

function buildChecklistCard(card) {
  const steps = Array.isArray(card.steps) && card.steps.length
    ? `<ol class="checklist-list">${card.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
    : "";

  const rules = Array.isArray(card.rules) && card.rules.length
    ? `<div class="checklist-rule-row">${card.rules.map((rule) => `<span class="checklist-rule-pill">${escapeHtml(rule)}</span>`).join("")}</div>`
    : "";

  const sources = Array.isArray(card.sources) && card.sources.length
    ? `
      <div class="checklist-source-block">
        <div class="checklist-source-title">Se leaga de</div>
        <div class="checklist-source-row">
          ${card.sources.map((source) => `<span class="mini-chip">${escapeHtml(source)}</span>`).join("")}
        </div>
      </div>
    `
    : "";

  const actions = Array.isArray(card.actions) && card.actions.length
    ? `
      <div class="checklist-actions">
        ${card.actions.map((action) => `
          <button
            class="${action.style || "secondary-button"}"
            type="button"
            data-page-jump="${escapeHtml(action.page || "")}"
            ${action.focus ? `data-focus-target="${escapeHtml(action.focus)}"` : ""}
            ${action.openMobileLog ? 'data-open-mobile-log="true"' : ""}
          >
            ${escapeHtml(action.label)}
          </button>
        `).join("")}
      </div>
    `
    : "";

  return `
    <article class="checklist-card" style="--checklist-accent:${card.tone}; --checklist-soft:${card.soft};">
      <div class="checklist-card-head">
        <div>
          <div class="checklist-card-eyebrow">${escapeHtml(card.eyebrow)}</div>
          <h3>${escapeHtml(card.title)}</h3>
        </div>
        <span class="checklist-badge">${escapeHtml(card.badge)}</span>
      </div>
      <p class="checklist-copy">${escapeHtml(card.copy)}</p>
      ${steps}
      ${rules}
      ${sources}
      ${actions}
    </article>
  `;
}

function renderScorecardDashboard() {
  if (!elements.powerThreeGrid) return;

  const scorecard = state.scorecard || createEmptyScorecard();
  const metrics = getScorecardMetrics(scorecard);
  const historyCount = state.scorecards.length;
  renderWigDashboard();
  renderKeyLeadMeasuresCard();

  if (elements.scorecardWeekChip) {
    elements.scorecardWeekChip.textContent = scorecard.week_label || "Saptamana curenta";
  }

  if (elements.scorecardSourceChip) {
    elements.scorecardSourceChip.textContent = state.apiEnabled
      ? `Airtable live · ${historyCount || 1} saptamani`
      : historyCount
        ? `Fallback local · ${historyCount} saptamani`
        : "Pregatit pentru tabela Scorecard";
  }

  elements.powerThreeGrid.innerHTML = [
    buildPowerThreeCard({
      eyebrow: "Critical Number",
      label: "Contracte Noi (Volume)",
      value: scorecard.new_contract_workers_mtd,
      suffix: "muncitori",
      target: scorecardTargets.powerThree.newContractWorkersMtd,
      tone: "#2d8f57",
      soft: "#e5f3eb",
      icon: "volume",
      note: "numarul total de muncitori semnati in contracte noi, luna curenta",
    }),
    buildPowerThreeCard({
      eyebrow: "Lead Measure",
      label: "Prospectare Dream 100",
      value: scorecard.dream100_p1_prospects,
      suffix: "companii P1",
      target: scorecardTargets.powerThree.dream100P1Prospects,
      tone: "#2f6ea2",
      soft: "#e4eef7",
      icon: "target",
      note: "companii P1 noi abordate saptamana aceasta",
    }),
    buildPowerThreeCard({
      eyebrow: "Sales Velocity",
      label: "Lead la Contract Semnat",
      value: metrics.velocityDays,
      suffix: "zile",
      target: scorecardTargets.powerThree.salesVelocityDays,
      tone: metrics.velocityTone,
      soft: metrics.velocitySoft,
      icon: "speed",
      inverse: true,
      note: "media de zile de la prima activitate live la contract semnat",
    }),
  ].join("");

  elements.velocityFocusCard.innerHTML = buildVelocityFocus(scorecard, metrics);
  elements.funnelGrid.innerHTML = [
    buildConversionCard4dx("Contact -> Meeting", metrics.contactToMeeting, scorecardTargets.funnel.contactToMeeting, {
      numerator: "meetings",
      denominator: metrics.funnelSource === "activities" ? "contacte live" : "companii P1",
    }),
    buildConversionCard4dx("Meeting -> Oferta", metrics.meetingToOffer, scorecardTargets.funnel.meetingToOffer, {
      numerator: "oferte",
      denominator: "meetings",
    }),
    buildConversionCard4dx("Oferta -> Semnat", metrics.offerToSigned, scorecardTargets.funnel.offerToSigned, {
      numerator: "contracte",
      denominator: "oferte",
    }),
  ].join("");

  elements.leadMeasuresGrid.innerHTML = [
    buildLeadMeasureCard({
      icon: "phone",
      label: "Outreach total saptamanal",
      value: metrics.outreachTotal,
      target: metrics.outreachTarget,
      tone: "#2f6ea2",
      detail: `${scorecard.cold_calls} cold calls · ${scorecard.linkedin_messages} WhatsApp · ${scorecard.warm_outreach} warm outreach`,
    }),
    buildLeadMeasureCard({
      icon: "field",
      label: "Vizite in teren / networking",
      value: scorecard.field_visits,
      target: state.targets.fieldVisitsWeekly,
      tone: "#5c7796",
      detail: "prezenta fizica in sedii, santiere sau evenimente",
    }),
    buildLeadMeasureCard({
      icon: "meeting",
      label: "Meetings stabilite",
      value: scorecard.meetings_set,
      target: scorecardTargets.leadMeasures.meetingsSet,
      tone: "#6f8aa6",
      detail: "intalniri de calificare confirmate",
    }),
  ].join("");

  elements.activityRatioCard.innerHTML = buildActivityRatioCard(scorecard, metrics);
  elements.lagFunnel.innerHTML = buildLagFunnel(scorecard, metrics);
  elements.scorecardTrendList.innerHTML = buildScorecardTrendList(state.scorecards);
}

function renderWigDashboard() {
  if (!elements.wigGrid) return;
  const currentWeekScorecard = getCurrentWeekScorecardRecord();
  const wigMetrics = getWigMetrics(currentWeekScorecard);
  elements.wigGrid.innerHTML = [
    buildAnnualWigCard(wigMetrics),
    buildQ2RockCard(wigMetrics),
    buildQ2DisciplineCard(currentWeekScorecard, wigMetrics),
  ].join("");
}

function renderKeyLeadMeasuresCard() {
  if (!elements.keyLeadMeasuresCard) return;

  const today = getTodayIsoDate();
  const weekStart = getWeekStart(today);
  const weekEnd = getWeekEnd(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = getMonthEnd(today);
  const todayTotals = getLeadMeasuresRangeTotals(today, today);
  const weekTotals = getLeadMeasuresRangeTotals(weekStart, weekEnd);
  const monthTotals = getLeadMeasuresRangeTotals(monthStart, monthEnd);

  const metrics = {
    coldCalls: {
      icon: "phone",
      label: "Apel rece",
      tone: "#2f6ea2",
      today: todayTotals.cold_calls,
      todayTarget: state.targets.coldCallsDaily,
      week: weekTotals.cold_calls,
      weekTarget: state.targets.coldCallsWeekly,
      month: monthTotals.cold_calls,
      monthTarget: state.targets.coldCallsMonthly,
    },
    whatsappMessages: {
      icon: "message",
      label: "WhatsApp personalizat",
      tone: "#5c7796",
      today: todayTotals.whatsapp_messages,
      todayTarget: state.targets.whatsappMessagesDaily,
      week: weekTotals.whatsapp_messages,
      weekTarget: state.targets.whatsappMessagesWeekly,
      month: monthTotals.whatsapp_messages,
      monthTarget: state.targets.whatsappMessagesMonthly,
    },
    fieldVisits: {
      icon: "field",
      label: "Vizita fizica",
      tone: "#c38b2a",
      today: todayTotals.field_visits,
      todayTarget: getFieldVisitDailyTarget(today),
      week: weekTotals.field_visits,
      weekTarget: state.targets.fieldVisitsWeekly,
      month: monthTotals.field_visits,
      monthTarget: state.targets.fieldVisitsMonthly,
      offDay: !isFieldVisitTargetDay(today),
    },
    warmOutreach: {
      icon: "meeting",
      label: "Warm Outreach",
      tone: "#2d8f57",
      today: todayTotals.warm_outreach,
      todayTarget: state.targets.warmOutreachDaily,
      week: weekTotals.warm_outreach,
      weekTarget: state.targets.warmOutreachWeekly,
      month: monthTotals.warm_outreach,
      monthTarget: state.targets.warmOutreachMonthly,
    },
  };

  elements.keyLeadMeasuresCard.innerHTML = `
    <div class="lead-focus-shell">
      <div class="lead-focus-block">
        <div class="lead-focus-block-head">
          <div>
            <div class="metric-kicker">Cold Outreach zilnic</div>
            <div class="metric-note">Miscarea rece care construieste pipeline nou: apeluri, WhatsApp si prezenta fizica.</div>
          </div>
          <div class="mini-chip">Saptamana curenta · ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}</div>
        </div>
        <div class="lead-focus-metric-grid">
          ${buildKeyLeadMeasureMetric(metrics.coldCalls)}
          ${buildKeyLeadMeasureMetric(metrics.whatsappMessages)}
          ${buildKeyLeadMeasureMetric(metrics.fieldVisits)}
        </div>
      </div>
      <div class="lead-focus-block lead-focus-block--warm">
        <div class="lead-focus-block-head">
          <div>
            <div class="metric-kicker">Warm Outreach</div>
            <div class="metric-note">Reteaua existenta, recomandarile si relatiile calde care comprima ciclul de vanzare.</div>
          </div>
          <div class="mini-chip">Target recomandat: ${state.targets.warmOutreachWeekly} / saptamana</div>
        </div>
        <div class="lead-focus-metric-grid lead-focus-metric-grid--single">
          ${buildKeyLeadMeasureMetric(metrics.warmOutreach)}
        </div>
      </div>
    </div>
  `;
}

function getCurrentWeekScorecardRecord() {
  const currentWeekStart = getWeekStart(getTodayIsoDate());
  return state.scorecards.find(
    (record) => record.week_start === currentWeekStart || record.week_key === currentWeekStart
  ) || createEmptyScorecard(currentWeekStart);
}

function getWigMetrics(scorecard) {
  const signedActivities = state.activities.filter(
    (activity) => activity.activity_type === "contract_signed" && activity.date
  );
  const annualActivities = signedActivities.filter(
    (activity) => activity.date.getFullYear() === wigPlan.annual.year
  );
  const q2Start = parseDate(wigPlan.q2.start);
  const q2End = parseDate(wigPlan.q2.end);
  const q2Activities = signedActivities.filter((activity) =>
    isDateWithinInclusiveRange(activity.date, q2Start, q2End)
  );
  const q2QualifiedActivities = q2Activities.filter(
    (activity) => activity.workers_delta >= wigPlan.q2.minWorkersPerContract
  );
  const currentWeekStart = parseDate(scorecard.week_start || getWeekStart(getTodayIsoDate()));
  const currentWeekEnd = parseDate(scorecard.week_end || getWeekEnd(scorecard.week_start));
  const weeklyMeetings = state.activities.filter(
    (activity) =>
      activity.activity_type === "meeting"
      && isDateWithinInclusiveRange(activity.date, currentWeekStart, currentWeekEnd)
  );
  const meetingsWithFollowUp = weeklyMeetings.filter(hasFollowUpWithin24h).length;
  const followUpMetric = buildRateMetric(meetingsWithFollowUp, weeklyMeetings.length);
  const daysRemainingInQ2 = q2End ? Math.max(dayDiff(new Date(), q2End), 0) : 0;

  return {
    annualContracts: annualActivities.length,
    annualWorkers: annualActivities.reduce((sum, activity) => sum + activity.workers_delta, 0),
    annualProgress: progressAgainstTarget(annualActivities.length, wigPlan.annual.contractsTarget),
    q2Contracts: q2Activities.length,
    q2QualifiedContracts: q2QualifiedActivities.length,
    q2Workers: q2Activities.reduce((sum, activity) => sum + activity.workers_delta, 0),
    q2Progress: progressAgainstTarget(q2QualifiedActivities.length, wigPlan.q2.contractsTarget),
    q2AverageWorkers: q2Activities.length
      ? q2Activities.reduce((sum, activity) => sum + activity.workers_delta, 0) / q2Activities.length
      : 0,
    weeklyMeetingsLogged: weeklyMeetings.length,
    followUpMetric,
    daysRemainingInQ2,
    q2DateLabel: `${formatDateWithYear(q2Start)} - ${formatDateWithYear(q2End)}`,
  };
}

function getScorecardMetrics(scorecard) {
  const velocity = getVelocityMetricForScorecard(scorecard);
  const weeklyActivities = getWeeklyActivitiesForScorecard(scorecard);
  const weeklyCounts = countActivities(weeklyActivities);
  const hasLiveFunnelData = Object.values(weeklyCounts).some((value) => value > 0);
  const funnelCounts = hasLiveFunnelData
    ? {
        contacted: weeklyCounts.contacted,
        meeting: weeklyCounts.meeting,
        offer: weeklyCounts.offer,
        contract_signed: weeklyCounts.contract_signed,
      }
    : {
        contacted: scorecard.dream100_p1_prospects,
        meeting: scorecard.meetings_set,
        offer: scorecard.offers_sent,
        contract_signed: scorecard.contracts_signed,
      };
  const outreachTotal = scorecard.cold_calls + scorecard.linkedin_messages + scorecard.warm_outreach;
  const outreachTarget = state.targets.coldCallsWeekly
    + state.targets.whatsappMessagesWeekly
    + state.targets.warmOutreachWeekly;
  const contactToMeeting = buildRateMetric(funnelCounts.meeting, funnelCounts.contacted);
  const meetingToOffer = buildRateMetric(funnelCounts.offer, funnelCounts.meeting);
  const offerToSigned = buildRateMetric(funnelCounts.contract_signed, funnelCounts.offer);
  const activityRatio = funnelCounts.meeting ? funnelCounts.contacted / funnelCounts.meeting : 0;
  const bottleneck = [contactToMeeting, meetingToOffer, offerToSigned]
    .filter((item) => item.hasBase)
    .sort((left, right) => left.value - right.value)[0];
  const velocityGood = velocity.averageDays > 0 && velocity.averageDays <= scorecardTargets.powerThree.salesVelocityDays;

  return {
    outreachTotal,
    outreachTarget,
    funnelCounts,
    funnelSource: hasLiveFunnelData ? "activities" : "scorecard",
    contactToMeeting,
    meetingToOffer,
    offerToSigned,
    activityRatio,
    bottleneck,
    velocityDays: velocity.averageDays,
    velocitySampleSize: velocity.sampleSize,
    velocityTone: velocityGood ? "#2d8f57" : velocity.averageDays ? "#c98622" : "#93a08f",
    velocitySoft: velocityGood ? "#e5f3eb" : velocity.averageDays ? "#f7ecd5" : "#eef1eb",
  };
}

function isLiveActivityEntry(activity = {}) {
  return normalizeActivity(activity.activity_type) !== "planned";
}

function buildSalesCyclesFromActivities(activities = []) {
  const sorted = [...activities]
    .filter((activity) => activity.company && activity.date)
    .sort((left, right) => {
      const leftTime = left.date?.getTime?.() || 0;
      const rightTime = right.date?.getTime?.() || 0;
      return leftTime - rightTime;
    });

  const cycleState = new Map();
  const cycles = [];

  sorted.forEach((activity) => {
    if (!isLiveActivityEntry(activity)) return;

    const companyKey = normalizeCompanyKey(activity.company);
    const activityDate = activity.date;
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

function buildLeadDateIndexFromActivities(activities = []) {
  const sorted = [...activities]
    .filter((activity) => activity.company && activity.date)
    .sort((left, right) => {
      const leftTime = left.date?.getTime?.() || 0;
      const rightTime = right.date?.getTime?.() || 0;
      return leftTime - rightTime;
    });

  const leadState = new Map();

  sorted.forEach((activity) => {
    if (!isLiveActivityEntry(activity)) return;

    const companyKey = normalizeCompanyKey(activity.company);
    const activityDate = activity.date;
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
      .map(([companyKey, entry]) => [companyKey, entry.currentLeadDate || entry.lastLeadDate || null])
      .filter(([, leadDate]) => Boolean(leadDate))
  );
}

function calculateSalesVelocityForWindow(activities = [], weekStart, weekEnd) {
  const startDate = parseDate(weekStart);
  const endDate = parseDate(weekEnd || getWeekEnd(weekStart));
  if (!startDate || !endDate) {
    return { averageDays: 0, sampleSize: 0 };
  }

  const cycles = buildSalesCyclesFromActivities(activities).filter((cycle) =>
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

function getVelocityMetricForScorecard(scorecard) {
  return calculateSalesVelocityForWindow(
    state.activities,
    scorecard.week_start,
    scorecard.week_end || getWeekEnd(scorecard.week_start)
  );
}

function getWeeklyActivitiesForScorecard(scorecard) {
  const fallbackWeekStart = getWeekStart(getTodayIsoDate());
  const weekStartValue = scorecard?.week_start || fallbackWeekStart;
  const weekEndValue = scorecard?.week_end || getWeekEnd(weekStartValue);
  const weekStart = parseDate(weekStartValue);
  const weekEnd = parseDate(weekEndValue);

  if (!weekStart || !weekEnd) {
    return [];
  }

  return state.activities.filter(
    (activity) => isLiveActivityEntry(activity) && isDateWithinInclusiveRange(activity.date, weekStart, weekEnd)
  );
}

function applyComputedScorecardFields(scorecard, activities = state.activities) {
  if (!scorecard?.week_start) return scorecard;
  const velocity = calculateSalesVelocityForWindow(
    activities,
    scorecard.week_start,
    scorecard.week_end || getWeekEnd(scorecard.week_start)
  );

  return {
    ...scorecard,
    week_end: scorecard.week_end || getWeekEnd(scorecard.week_start),
    sales_velocity_days: velocity.averageDays,
  };
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

function hasFollowUpWithin24h(meetingActivity) {
  if (!meetingActivity?.date) return false;

  if (normalizeString(meetingActivity.next_step)) {
    if (!meetingActivity.next_step_date) return true;
    const delta = dayDiff(meetingActivity.next_step_date, meetingActivity.date);
    if (delta >= 0 && delta <= 1) return true;
  }

  const meetingTime = meetingActivity.date.getTime();
  return state.activities.some((activity) => {
    if (!activity?.date || activity === meetingActivity) return false;
    if (normalizeCompanyKey(activity.company) !== normalizeCompanyKey(meetingActivity.company)) return false;
    if (normalizeActivity(activity.activity_type) === "meeting") return false;
    const deltaMs = activity.date.getTime() - meetingTime;
    return deltaMs >= 0 && deltaMs <= 24 * 60 * 60 * 1000;
  });
}

function buildRateMetric(numerator, denominator) {
  const hasBase = denominator > 0;
  const value = hasBase ? Math.round((numerator / denominator) * 100) : 0;
  return {
    hasBase,
    numerator,
    denominator,
    value,
  };
}

function buildPowerThreeCard(options) {
  const progress = options.inverse
    ? progressAgainstMax(options.value, options.target)
    : progressAgainstTarget(options.value, options.target);
  const progressText = options.inverse
    ? options.value
      ? `${options.value} zile vs target < ${options.target}`
      : `target < ${options.target} zile`
    : `${options.value} din ${options.target}`;

  return `
    <article class="power-card" style="--metric-accent:${options.tone}; --metric-soft:${options.soft};">
      <div class="power-card-head">
        <div class="metric-icon">${scorecardIcon(options.icon)}</div>
        <div class="metric-kicker">${options.eyebrow}</div>
      </div>
      <div class="metric-title">${options.label}</div>
      <div class="metric-value-row">
        <div class="metric-value">${options.value}</div>
        <div class="metric-suffix">${options.suffix}</div>
      </div>
      <div class="metric-note">${options.note}</div>
      <div class="metric-progress">
        <div class="metric-progress-track">
          <div class="metric-progress-fill" style="width:${progress}%;"></div>
        </div>
        <div class="metric-progress-meta">
          <span>${progressText}</span>
          <strong>${progress}%</strong>
        </div>
      </div>
    </article>
  `;
}

function buildAnnualWigCard(metrics) {
  const quarterChips = wigPlan.annual.quarterlyDistribution
    .map((quarter) => `<span class="metric-chip">${quarter.label}: ${quarter.target}</span>`)
    .join("");

  return `
    <article class="power-card wig-card wig-card--annual" style="--metric-accent:#1d7a50; --metric-soft:#e5f3eb;">
      <div class="power-card-head">
        <div class="metric-icon">${scorecardIcon("target")}</div>
        <div class="metric-kicker">WIG ${wigPlan.annual.year}</div>
      </div>
      <div class="metric-title">${wigPlan.annual.contractsTarget} contracte noi pana la final de an</div>
      <div class="wig-number-row">
        <div class="metric-value">${metrics.annualContracts}</div>
        <div class="wig-number-divider">/</div>
        <div class="wig-target-number">${wigPlan.annual.contractsTarget}</div>
      </div>
      <div class="metric-note">Progres live din activitatile de tip contract semnat. Ritmul anual se deschide din Q2 si accelereaza in Q3-Q4.</div>
      <div class="metric-progress">
        <div class="metric-progress-track">
          <div class="metric-progress-fill" style="width:${metrics.annualProgress}%;"></div>
        </div>
        <div class="metric-progress-meta">
          <span>${metrics.annualWorkers} muncitori semnati pana acum</span>
          <strong>${metrics.annualProgress}%</strong>
        </div>
      </div>
      <div class="wig-chip-row">
        ${quarterChips}
      </div>
    </article>
  `;
}

function buildQ2RockCard(metrics) {
  const avgWorkers = metrics.q2AverageWorkers ? metrics.q2AverageWorkers.toFixed(1) : "-";

  return `
    <article class="power-card wig-card" style="--metric-accent:#c38b2a; --metric-soft:#f7ecd5;">
      <div class="power-card-head">
        <div class="metric-icon">${scorecardIcon("volume")}</div>
        <div class="metric-kicker">${wigPlan.q2.label}</div>
      </div>
      <div class="metric-title">5 contracte cu minim ${wigPlan.q2.minWorkersPerContract} workers pana la 30 iunie</div>
      <div class="wig-number-row">
        <div class="metric-value">${metrics.q2QualifiedContracts}</div>
        <div class="wig-number-divider">/</div>
        <div class="wig-target-number">${wigPlan.q2.contractsTarget}</div>
      </div>
      <div class="metric-note">${metrics.q2DateLabel} · foloseste activitatile contract_signed pentru a valida contractele care respecta pragul de calitate.</div>
      <div class="metric-progress">
        <div class="metric-progress-track">
          <div class="metric-progress-fill" style="width:${metrics.q2Progress}%; background:#c38b2a;"></div>
        </div>
        <div class="metric-progress-meta">
          <span>${metrics.daysRemainingInQ2} zile ramase in Q2</span>
          <strong>${metrics.q2Progress}%</strong>
        </div>
      </div>
      <div class="wig-stat-grid">
        <div class="wig-stat">
          <strong>${metrics.q2Contracts}</strong>
          <span>contracte semnate in Q2</span>
        </div>
        <div class="wig-stat">
          <strong>${metrics.q2Workers}</strong>
          <span>workers semnati in Q2</span>
        </div>
        <div class="wig-stat">
          <strong>${avgWorkers}</strong>
          <span>media workers / contract</span>
        </div>
      </div>
    </article>
  `;
}

function buildQ2DisciplineCard(scorecard, metrics) {
  const p1Progress = progressAgainstTarget(scorecard.dream100_p1_prospects, wigPlan.q2.prospectsPerWeek);
  const meetingProgress = progressAgainstTarget(metrics.weeklyMeetingsLogged, wigPlan.q2.meetingsPerWeek);
  const followUpText = metrics.followUpMetric.hasBase
    ? `${metrics.followUpMetric.numerator} / ${metrics.followUpMetric.denominator} meetings`
    : "Fara meetings logate saptamana asta";

  return `
    <article class="power-card wig-card" style="--metric-accent:#2f6ea2; --metric-soft:#e4eef7;">
      <div class="power-card-head">
        <div class="metric-icon">${scorecardIcon("meeting")}</div>
        <div class="metric-kicker">Cadenta Q2</div>
      </div>
      <div class="metric-title">Lead measures care imping Rock-ul</div>
      <div class="wig-rule-list">
        <div class="wig-rule-row">
          <div class="wig-rule-head">
            <span>Dream 100 P1 / saptamana</span>
            <strong>${scorecard.dream100_p1_prospects} / ${wigPlan.q2.prospectsPerWeek}</strong>
          </div>
          <div class="metric-progress-track">
            <div class="metric-progress-fill" style="width:${p1Progress}%; background:#2f6ea2;"></div>
          </div>
        </div>
        <div class="wig-rule-row">
          <div class="wig-rule-head">
            <span>Meetings logate / saptamana</span>
            <strong>${metrics.weeklyMeetingsLogged} / ${wigPlan.q2.meetingsPerWeek}</strong>
          </div>
          <div class="metric-progress-track">
            <div class="metric-progress-fill" style="width:${meetingProgress}%; background:#5c7796;"></div>
          </div>
        </div>
        <div class="wig-rule-row">
          <div class="wig-rule-head">
            <span>Follow-up in 24h dupa meeting</span>
            <strong>${metrics.followUpMetric.hasBase ? `${metrics.followUpMetric.value}%` : "-"}</strong>
          </div>
          <div class="metric-chip">${followUpText}</div>
        </div>
      </div>
      <div class="metric-note">Dream 100 P1 creste automat la primul touch real salvat pe o companie noua. Follow-up-ul de 24h este calculat live din activitatile de meeting care au next step imediat sau actiune ulterioara in 24h.</div>
    </article>
  `;
}

function buildVelocityFocus(scorecard, metrics) {
  const conversionCount = [
    `${metrics.contactToMeeting.value}% contact -> meeting`,
    `${metrics.meetingToOffer.value}% meeting -> oferta`,
    `${metrics.offerToSigned.value}% oferta -> semnat`,
  ];
  const velocityContext = metrics.velocitySampleSize
    ? `Calculat automat din ${metrics.velocitySampleSize} contract${metrics.velocitySampleSize === 1 ? "" : "e"} semnate in ${scorecard.week_label || "saptamana selectata"}.`
    : "Nu exista contracte semnate in saptamana selectata, deci media nu poate fi calculata inca.";
  const funnelContext = metrics.funnelSource === "activities"
    ? "Funnel-ul saptamanii se calculeaza live din activitatile logate."
    : "Funnel-ul cade pe valorile salvate in Scorecard pentru saptamana curenta.";

  return `
    <article class="velocity-card" style="--metric-accent:${metrics.velocityTone}; --metric-soft:${metrics.velocitySoft};">
      <div class="metric-kicker">Sales Velocity</div>
      <div class="velocity-value">${metrics.velocityDays || "-"}</div>
      <div class="velocity-subcopy">zile medie de la prima activitate live la contract semnat</div>
      <div class="velocity-status">
        <span class="metric-chip">${metrics.velocityDays && metrics.velocityDays <= scorecardTargets.powerThree.salesVelocityDays ? "In target" : "Sub observatie"}</span>
        <span>Target: &lt; ${scorecardTargets.powerThree.salesVelocityDays} zile</span>
      </div>
      <div class="velocity-foot">${velocityContext}</div>
      <div class="velocity-foot">${funnelContext}</div>
      <div class="velocity-foot">${conversionCount.join(" · ")}</div>
    </article>
  `;
}

function buildConversionCard4dx(label, metric, target, units = {}) {
  const color = !metric.hasBase
    ? "#93a08f"
    : metric.value >= target
      ? "#2d8f57"
      : metric.value >= Math.max(10, target - 15)
        ? "#c98622"
        : "#cb5846";
  const soft = !metric.hasBase
    ? "#eef1eb"
    : metric.value >= target
      ? "#e5f3eb"
      : metric.value >= Math.max(10, target - 15)
        ? "#f7ecd5"
        : "#fbe8e4";

  return `
    <article class="conversion-card conversion-card--4dx">
      <div class="conversion-title">
        <span>${label}</span>
        <strong style="color:${color};">${metric.hasBase ? `${metric.value}%` : "-"}</strong>
      </div>
      <div class="conversion-track">
        <div class="conversion-fill" style="width:${metric.hasBase ? Math.min(metric.value, 100) : 0}%; background:${color};"></div>
      </div>
      <div class="conversion-meta">
        <span>${metric.hasBase ? `${metric.numerator} ${units.numerator || "rezultate"} din ${metric.denominator} ${units.denominator || "baza"}` : "Fara baza suficienta in saptamana curenta."}</span>
        <span class="conversion-badge" style="color:${color}; background:${soft};">Target ${target}%</span>
      </div>
    </article>
  `;
}

function buildLeadMeasureCard(options) {
  const progress = progressAgainstTarget(options.value, options.target);
  return `
    <article class="measure-card measure-card--lead" style="--metric-accent:${options.tone};">
      <div class="measure-head">
        <div class="metric-icon metric-icon--lead">${scorecardIcon(options.icon)}</div>
        <div class="metric-title">${options.label}</div>
      </div>
      <div class="measure-value-row">
        <div class="measure-value">${options.value}</div>
        <div class="measure-target">target ${options.target}</div>
      </div>
      <div class="metric-note">${options.detail}</div>
      <div class="metric-progress">
        <div class="metric-progress-track">
          <div class="metric-progress-fill" style="width:${progress}%; background:${options.tone};"></div>
        </div>
        <div class="metric-progress-meta">
          <span>progres saptamanal</span>
          <strong>${progress}%</strong>
        </div>
      </div>
    </article>
  `;
}

function buildKeyLeadMeasureMetric(metric) {
  return `
    <article class="lead-focus-metric" style="--metric-accent:${metric.tone};">
      <div class="measure-head">
        <div class="metric-icon metric-icon--lead">${scorecardIcon(metric.icon)}</div>
        <div>
          <div class="metric-title">${metric.label}</div>
          <div class="metric-note">${buildLeadMeasureTodayCopy(metric)}</div>
        </div>
      </div>
      <div class="lead-focus-progress-list">
        ${buildKeyLeadMeasureProgressRow("Azi", metric.today, metric.todayTarget, metric.tone, { offDay: metric.offDay })}
        ${buildKeyLeadMeasureProgressRow("Saptamana", metric.week, metric.weekTarget, metric.tone)}
        ${buildKeyLeadMeasureProgressRow("Luna", metric.month, metric.monthTarget, metric.tone)}
      </div>
    </article>
  `;
}

function buildLeadMeasureTodayCopy(metric) {
  if (!metric.todayTarget && metric.offDay) {
    return `${metric.today} facute azi · fara target azi`;
  }

  return `${metric.today} din ${metric.todayTarget || 0} astazi`;
}

function buildKeyLeadMeasureProgressRow(label, actual, target, tone, options = {}) {
  const { offDay = false } = options;
  const progress = target > 0 ? progressAgainstTarget(actual, target) : actual > 0 ? 100 : 0;
  const valueText = target > 0
    ? `${actual} din ${target}`
    : offDay
      ? `${actual} din 0 · off day`
      : `${actual} fara target`;

  return `
    <div class="lead-progress-row">
      <div class="lead-progress-head">
        <span>${label}</span>
        <strong>${valueText}</strong>
      </div>
      <div class="metric-progress-track">
        <div class="metric-progress-fill" style="width:${progress}%; background:${tone};"></div>
      </div>
    </div>
  `;
}

function buildActivityRatioCard(scorecard, metrics) {
  const ratioText = metrics.funnelCounts.meeting
    ? `${metrics.activityRatio.toFixed(1)} contacte pentru 1 meeting`
    : "Nu exista meetings suficiente pentru a calcula raportul.";
  const bottleneckCopy = metrics.bottleneck?.hasBase
    ? `Cel mai slab punct acum: ${
        metrics.bottleneck === metrics.contactToMeeting
          ? "Contact -> Meeting"
          : metrics.bottleneck === metrics.meetingToOffer
            ? "Meeting -> Oferta"
            : "Oferta -> Semnat"
      } (${metrics.bottleneck.value}%).`
    : "Completeaza saptamana curenta pentru a vedea bottleneck-ul principal.";
  const sourceCopy = metrics.funnelSource === "activities"
    ? "Calculat din activitatile live ale saptamanii curente."
    : "Calculat din valorile salvate in Scorecard.";

  return `
    <article class="ratio-card-shell">
      <div class="metric-kicker">Activity Ratio</div>
      <div class="ratio-value">${metrics.funnelCounts.meeting ? metrics.activityRatio.toFixed(1) : "-"}</div>
      <div class="metric-note">${ratioText}</div>
      <div class="ratio-foot">${sourceCopy}</div>
      <div class="ratio-foot">${bottleneckCopy}</div>
    </article>
  `;
}

function buildLagFunnel(scorecard, metrics) {
  const funnelStages = [
    {
      label: metrics.funnelSource === "activities" ? "Contacte live" : "Dream100 P1 noi",
      value: metrics.funnelCounts.contacted,
      width: 100,
      note: metrics.funnelSource === "activities" ? "baza live din activitatile saptamanii" : "punctul de intrare in palnie",
      tone: "#2f6ea2",
      bottleneck: false,
    },
    {
      label: "Meetings stabilite",
      value: metrics.funnelCounts.meeting,
      width: 82,
      note: `${metrics.contactToMeeting.hasBase ? `${metrics.contactToMeeting.value}% din ${metrics.funnelSource === "activities" ? "contactele live" : "prospectarea P1"}` : "asteapta date"}`,
      tone: metrics.bottleneck === metrics.contactToMeeting ? "#cb5846" : "#55779e",
      bottleneck: metrics.bottleneck === metrics.contactToMeeting,
    },
    {
      label: "Oferte trimise",
      value: metrics.funnelCounts.offer,
      width: 66,
      note: `${metrics.meetingToOffer.hasBase ? `${metrics.meetingToOffer.value}% din meetings` : "asteapta date"}`,
      tone: metrics.bottleneck === metrics.meetingToOffer ? "#cb5846" : "#c38b2a",
      bottleneck: metrics.bottleneck === metrics.meetingToOffer,
    },
    {
      label: "Contracte semnate",
      value: metrics.funnelCounts.contract_signed,
      width: 52,
      note: `${metrics.offerToSigned.hasBase ? `${metrics.offerToSigned.value}% din oferte` : "asteapta date"}`,
      tone: metrics.bottleneck === metrics.offerToSigned ? "#cb5846" : "#2d8f57",
      bottleneck: metrics.bottleneck === metrics.offerToSigned,
    },
  ];

  const outcomeCards = [
    {
      icon: "workers",
      label: "Volum muncitori semnati",
      value: scorecard.workers_signed,
      note: "indicator de scalabilitate",
      tone: "#2d8f57",
    },
    {
      icon: "plane",
      label: "Muncitori livrati",
      value: scorecard.workers_delivered,
      note: "indicator de finalitate",
      tone: "#c38b2a",
    },
  ];

  return `
    <div class="lag-funnel-stages">
      ${funnelStages.map((stage) => `
        <article class="lag-stage ${stage.bottleneck ? "is-bottleneck" : ""}" style="--stage-width:${stage.width}%; --stage-accent:${stage.tone};">
          <div class="lag-stage-body">
            <div class="lag-stage-head">
              <span>${stage.label}</span>
              <strong>${stage.value}</strong>
            </div>
            <div class="lag-stage-note">${stage.note}${stage.bottleneck ? " · bottleneck curent" : ""}</div>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="lag-outcome-grid">
      ${outcomeCards.map((card) => `
        <article class="lag-outcome-card" style="--metric-accent:${card.tone};">
          <div class="metric-icon metric-icon--lag">${scorecardIcon(card.icon)}</div>
          <div class="lag-outcome-value">${card.value}</div>
          <div class="lag-outcome-label">${card.label}</div>
          <div class="metric-note">${card.note}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function buildScorecardTrendList(scorecards) {
  const rows = scorecards.slice(0, 6);
  if (!rows.length) {
    return `<article class="empty-card">Nu exista saptamani salvate in tabela Scorecard inca.</article>`;
  }

  const maxWorkers = Math.max(...rows.map((row) => row.workers_signed), 1);

  return rows.map((row) => {
    const width = Math.max((row.workers_signed / maxWorkers) * 100, row.workers_signed ? 12 : 4);
    return `
      <article class="weekly-trend-row">
        <div class="weekly-trend-head">
          <strong>${escapeHtml(row.week_label)}</strong>
          <span>${row.new_contract_workers_mtd} muncitori MTD</span>
        </div>
        <div class="weekly-trend-bar">
          <div class="weekly-trend-fill" style="width:${width}%;"></div>
        </div>
        <div class="weekly-trend-copy">
          <span>${row.dream100_p1_prospects} P1</span>
          <span>${row.contracts_signed} contracte</span>
          <span>${row.workers_signed} muncitori semnati</span>
        </div>
      </article>
    `;
  }).join("");
}

function progressAgainstTarget(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function progressAgainstMax(value, target) {
  if (!value || !target) return 0;
  if (value <= target) return 100;
  return Math.max(0, Math.min(100, Math.round((target / value) * 100)));
}

function scorecardIcon(name) {
  const icons = {
    volume: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M6 13h3l2-5 3 9 2-4h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    target: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    speed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15a8 8 0 1 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 15l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 19h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h3l1 4-2 2a14 14 0 0 0 5 5l2-2 4 1v3c0 1-1 2-2 2A16 16 0 0 1 5 6c0-1 1-2 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    message: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    field: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="11" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
    meeting: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v6M16 3v6M4 10h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    workers: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm10 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8ZM3 21c1.2-2 3-3 4-3s2.8 1 4 3M13 21c1.2-2 3-3 4-3s2.8 1 4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    plane: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13 21 4l-5 16-3-5-5-2-5 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13 15 21 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  };

  return icons[name] || icons.target;
}

function getTodayActivities() {
  const today = new Date();
  return state.activities.filter((activity) => isSameDay(activity.date, today));
}

function getActivitiesForDate(date) {
  const selectedDate = parseDate(date);
  if (!selectedDate) return [];
  return state.activities.filter((activity) => isSameDay(activity.date, selectedDate));
}

function getMonthlyActivities() {
  const now = new Date();
  return state.activities.filter((activity) => {
    if (!activity.date) return false;
    return activity.date.getFullYear() === now.getFullYear() && activity.date.getMonth() === now.getMonth();
  });
}

function countActivities(activities) {
  const counts = {
    contacted: 0,
    meeting: 0,
    offer: 0,
    contract_signed: 0,
  };

  activities.forEach((activity) => {
    if (counts[activity.activity_type] !== undefined) {
      counts[activity.activity_type] += 1;
    }
  });

  return counts;
}

function workersWonThisMonth(monthlyActivities) {
  return monthlyActivities
    .filter((activity) => activity.activity_type === "contract_signed")
    .reduce((sum, activity) => sum + activity.workers_delta, 0);
}

function renderScorecards() {
  const todayActivities = getTodayActivities();
  const monthlyActivities = getMonthlyActivities();
  const todayCounts = countActivities(todayActivities);
  const monthCounts = countActivities(monthlyActivities);
  const workersWon = workersWonThisMonth(monthlyActivities);

  elements.todayGrid.innerHTML = buildStats([
    buildTodayCard("Contactate", todayCounts.contacted, "touch-uri salvate azi", "#2f6ea2"),
    buildTodayCard("Meetings", todayCounts.meeting, "programate sau tinute", "#c98622"),
    buildTodayCard("Oferte", todayCounts.offer, "trimise azi", "#8b5cf6"),
    buildTodayCard("Contracte", todayCounts.contract_signed, "inchise azi", "#2d8f57"),
  ]);

  elements.monthGrid.innerHTML = buildStats([
    buildTargetCard("Contactate", monthCounts.contacted, state.targets.contacted, "#2f6ea2"),
    buildTargetCard("Meetings", monthCounts.meeting, state.targets.meetings, "#c98622"),
    buildTargetCard("Oferte", monthCounts.offer, state.targets.offers, "#8b5cf6"),
    buildTargetCard("Contracte", monthCounts.contract_signed, state.targets.contracts, "#2d8f57"),
    {
      label: "Muncitori",
      value: workersWon,
      meta: "castigati luna asta",
      color: "#2d8f57",
      variant: "month",
      eyebrow: "Castig real",
      target: 0,
      pct: workersWon > 0 ? 100 : 0,
    },
  ]);
}

function buildTodayCard(label, value, meta, color) {
  return {
    label,
    value,
    meta,
    color,
    variant: "today",
    eyebrow: "Astazi",
    target: 0,
    pct: value > 0 ? 100 : 0,
  };
}

function buildTargetCard(label, value, target, color) {
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  return {
    label,
    value,
    meta: `target ${target} · ${pct}%`,
    color,
    variant: "month",
    eyebrow: "Luna curenta",
    target,
    pct,
  };
}

function buildStats(cards) {
  return cards
    .map(
      (card) => `
        <article class="stat-card stat-card--${card.variant || "default"}">
          <div class="stat-shell">
            <div class="stat-eyebrow">${card.eyebrow || "Indicator"}</div>
            <div class="stat-label">${card.label}</div>
            <div class="stat-value" style="color:${card.color};">${card.value}</div>
            <div class="card-meta">${card.meta}</div>
          </div>
          ${
            card.variant === "month" && card.target
              ? `
                <div class="stat-progress">
                  <div class="stat-progress-track">
                    <div class="stat-progress-fill" style="width:${Math.min(card.pct, 100)}%; background:${card.color};"></div>
                  </div>
                  <div class="stat-progress-meta">
                    <span>${card.value} din ${card.target}</span>
                    <strong>${card.pct}%</strong>
                  </div>
                </div>
              `
              : `
                <div class="stat-accent" style="background:linear-gradient(90deg, ${card.color}, rgba(255,255,255,0));"></div>
              `
          }
        </article>
      `
    )
    .join("");
}

function renderConversions() {
  const monthlyActivities = getMonthlyActivities();
  const counts = countActivities(monthlyActivities);
  const noResponseCount = monthlyActivities.filter((a) => isPendingContactOutcome(a.outcome)).length;

  const conversions = [
    buildConversionCard("Contact → Meeting", counts.meeting, counts.contacted),
    buildConversionCard("Meeting → Oferta", counts.offer, counts.meeting),
    buildConversionCard("Oferta → Contract", counts.contract_signed, counts.offer),
    buildConversionCard("Contact → Contract", counts.contract_signed, counts.contacted),
  ];

  const responseRatePct = counts.contacted > 0
    ? Math.round(((counts.contacted - noResponseCount) / counts.contacted) * 100)
    : null;

  const responseCard = responseRatePct !== null
    ? `<article class="conversion-card conversion-card--response">
        <div class="conversion-title">
          <span>Rata raspuns contacte</span>
          <strong style="color:${responseRatePct >= 60 ? "#2d8f57" : responseRatePct >= 40 ? "#c98622" : "#cb5846"};">${responseRatePct}%</strong>
        </div>
        <div class="conversion-track">
          <div class="conversion-fill" style="width:${responseRatePct}%; background:${responseRatePct >= 60 ? "#2d8f57" : responseRatePct >= 40 ? "#c98622" : "#cb5846"};"></div>
        </div>
        <div class="conversion-meta"><span>${counts.contacted - noResponseCount} raspunsuri din ${counts.contacted} contacte · ${noResponseCount} fara raspuns clar</span></div>
      </article>`
    : "";

  elements.conversionGrid.innerHTML = conversions
    .map(
      (item) => `
        <article class="conversion-card">
          <div class="conversion-title">
            <span>${item.label}</span>
            <strong style="color:${item.color};">${item.rate}</strong>
          </div>
          <div class="conversion-track">
            <div class="conversion-fill" style="width:${item.progress}%; background:${item.color};"></div>
          </div>
          <div class="conversion-meta">
            <span>${item.detail}</span>
            <span class="conversion-badge" style="color:${item.color}; background:${item.soft};">${item.note}</span>
          </div>
        </article>
      `
    )
    .join("") + responseCard;
}

function buildConversionCard(label, numerator, denominator) {
  if (!denominator) {
    return {
      label,
      rate: "-",
      detail: "Nu exista suficienta activitate in etapa anterioara.",
      progress: 0,
      color: "#93a08f",
      soft: "#eef1eb",
      note: "Fara baza",
    };
  }

  const progress = Math.round((numerator / denominator) * 100);
  let color = "#cb5846";
  let soft = "#fbe8e4";
  let note = "Sub prag";

  if (progress >= 60) {
    color = "#2d8f57";
    soft = "#e5f3eb";
    note = "Sanatos";
  } else if (progress >= 30) {
    color = "#c98622";
    soft = "#f7ecd5";
    note = "Mediu";
  }

  return {
    label,
    rate: `${progress}%`,
    detail: `${numerator} din ${denominator}`,
    progress,
    color,
    soft,
    note,
  };
}

function renderTrend() {
  if (!elements.dailyTrend) return;
  const series = getLastSevenDays();
  const maxContacts = Math.max(...series.map((day) => day.contacted), 1);

  elements.dailyTrend.innerHTML = series
    .map((day) => {
      const width = Math.max((day.contacted / maxContacts) * 100, day.contacted ? 10 : 3);
      return `
        <article class="trend-row">
          <div class="trend-label">${day.label}</div>
          <div class="trend-bar">
            <div class="trend-fill" style="width:${width}%;"></div>
          </div>
          <div class="trend-copy">
            <span>${day.contacted} contacte</span>
            <span>${day.meeting} meetings</span>
            <span>${day.offer} oferte</span>
            <span>${day.contract_signed} contracte</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function getLastSevenDays() {
  const rows = [];
  const scoreByDate = new Map(state.dailyScores.map((s) => [s.date, s]));
  const todayIso = getTodayIsoDate();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const isoDate = toIsoDateValue(date);
    const scoreRow = scoreByDate.get(isoDate);
    const liveCounts = countActivities(state.activities.filter((activity) => isSameDay(activity.date, date)));

    let counts;
    if (scoreRow) {
      const trendCounts = {
        contacted: scoreRow.contacted || 0,
        meeting: scoreRow.meetings || 0,
        offer: scoreRow.offers || 0,
        contract_signed: scoreRow.contracts || 0,
      };

      counts = isoDate === todayIso
        ? liveCounts
        : {
            contacted: Math.max(trendCounts.contacted, liveCounts.contacted),
            meeting: Math.max(trendCounts.meeting, liveCounts.meeting),
            offer: Math.max(trendCounts.offer, liveCounts.offer),
            contract_signed: Math.max(trendCounts.contract_signed, liveCounts.contract_signed),
          };
    } else {
      counts = liveCounts;
    }

    rows.push({
      label: new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(date),
      ...counts,
    });
  }

  return rows;
}

function getActivePipelineSortMeta(account = {}, now = new Date()) {
  const nextStepTime = account.next_step_date ? account.next_step_date.getTime() : Number.POSITIVE_INFINITY;
  const lastTouchTime = account.last_contact ? account.last_contact.getTime() : 0;
  const stageRank = pipelineStageValueRank(account.pipeline_stage);
  const workers = toNumber(account.workers);

  if (account.next_step_date) {
    const delta = dayDiff(account.next_step_date, now);

    if (delta > 0) {
      return {
        bucket: 0,
        bucketLabel: "Intarziat",
        primaryValue: nextStepTime,
        stageRank,
        workers,
        lastTouchTime,
      };
    }

    if (delta === 0) {
      return {
        bucket: 1,
        bucketLabel: "Azi",
        primaryValue: stageRank,
        stageRank,
        workers,
        lastTouchTime,
      };
    }

    return {
      bucket: 3,
      bucketLabel: "Viitor",
      primaryValue: nextStepTime,
      stageRank,
      workers,
      lastTouchTime,
    };
  }

  return {
    bucket: 2,
    bucketLabel: "Fara next step",
    primaryValue: account.last_contact ? dayDiff(account.last_contact, now) : Number.POSITIVE_INFINITY,
    stageRank,
    workers,
    lastTouchTime,
  };
}

function compareActivePipelineAccounts(left = {}, right = {}, now = new Date()) {
  const leftMeta = getActivePipelineSortMeta(left, now);
  const rightMeta = getActivePipelineSortMeta(right, now);

  if (leftMeta.bucket !== rightMeta.bucket) {
    return leftMeta.bucket - rightMeta.bucket;
  }

  if (leftMeta.bucket === 0 || leftMeta.bucket === 3) {
    if (leftMeta.primaryValue !== rightMeta.primaryValue) {
      return leftMeta.primaryValue - rightMeta.primaryValue;
    }
  } else if (leftMeta.bucket === 2) {
    if (leftMeta.primaryValue !== rightMeta.primaryValue) {
      return rightMeta.primaryValue - leftMeta.primaryValue;
    }
  }

  if (leftMeta.stageRank !== rightMeta.stageRank) {
    return rightMeta.stageRank - leftMeta.stageRank;
  }

  if (leftMeta.workers !== rightMeta.workers) {
    return rightMeta.workers - leftMeta.workers;
  }

  if (leftMeta.lastTouchTime !== rightMeta.lastTouchTime) {
    return leftMeta.lastTouchTime - rightMeta.lastTouchTime;
  }

  return left.company.localeCompare(right.company, "ro");
}

function renderPipeline() {
  const trackedAccounts = state.accounts.filter((account) => isTrackedAccount(account));
  const latestPlannedByCompany = buildLatestPlannedActivityIndex(state.activities);
  const filteredAccounts = trackedAccounts
    .filter((account) => !state.search || account.company.toLowerCase().includes(state.search));
  const activeAccounts = filteredAccounts
    .filter((account) => isMovingAccount(account))
    .sort((left, right) => compareActivePipelineAccounts(left, right));
  const standbyAccounts = filteredAccounts
    .filter((account) => isStandbyAccount(account))
    .sort(compareStandbyAccounts);

  const activeAccs = trackedAccounts.filter((account) => isMovingAccount(account));
  const counts = {
    active: activeAccs.length,
    offers: trackedAccounts.filter((account) => isOfferStage(account.pipeline_stage)).length,
    signed: trackedAccounts.filter((account) => account.pipeline_stage === "Contract semnat").length,
    standby: trackedAccounts.filter((account) => isStandbyAccount(account)).length,
    workersInPipeline: activeAccs.reduce((sum, a) => sum + (a.workers || 0), 0),
  };

  elements.pipelineSummary.innerHTML = `
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">In miscare</div>
      <div class="pipeline-stat-value">${counts.active}</div>
      <div class="pipeline-stat-meta">conturi in lucru</div>
    </article>
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">In oferta</div>
      <div class="pipeline-stat-value">${counts.offers}</div>
      <div class="pipeline-stat-meta">oferta sau negociere</div>
    </article>
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">Muncitori in pipeline</div>
      <div class="pipeline-stat-value" style="color:var(--forest-600);">${counts.workersInPipeline}</div>
      <div class="pipeline-stat-meta">potential din deal-uri active</div>
    </article>
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">Semnate</div>
      <div class="pipeline-stat-value">${counts.signed}</div>
      <div class="pipeline-stat-meta">castigate</div>
    </article>
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">Standby</div>
      <div class="pipeline-stat-value">${counts.standby}</div>
      <div class="pipeline-stat-meta">parcate pentru revenire</div>
    </article>
  `;

  if (!activeAccounts.length) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-card">Nu exista companii in miscare acum. Conturile ramase pe "Necontactat" nu apar in acest snapshot.</div>
        </td>
      </tr>
    `;
    renderStandbyTable(standbyAccounts);
    return;
  }

  elements.accountsTableBody.innerHTML = activeAccounts
    .map((account) => {
      const pipelineStage = pipelineStageTheme[account.pipeline_stage] || {
        color: "#94a3b8",
        bg: "rgba(148,163,184,0.14)",
      };
      const health = accountHealthTheme[account.account_health] || null;
      const plannedActivity = latestPlannedByCompany.get(normalizeCompanyKey(account.company));
      return `
        <tr>
          <td>
            <div class="company-cell">
              <div class="company-name">${escapeHtml(account.company)}</div>
              ${
                account.lead_date
                  ? `<div class="company-meta">Lead din ${escapeHtml(formatDateWithYear(account.lead_date))}</div>`
                  : ""
              }
            </div>
          </td>
          <td>
            <span class="status-pill" style="color:${pipelineStage.color}; background:${pipelineStage.bg}; border-color:${pipelineStage.color}33;">
              ${escapeHtml(account.pipeline_stage || "-")}
            </span>
          </td>
          <td>
            ${
              health
                ? `<span class="status-pill" style="color:${health.color}; background:${health.bg}; border-color:${health.color}33;">${escapeHtml(account.account_health)}</span>`
                : "-"
            }
          </td>
          <td>${escapeHtml(account.last_outcome || "-")}</td>
          <td>${formatDate(account.last_contact)}</td>
          <td>${renderNextStepCell(account, plannedActivity)}</td>
        </tr>
      `;
    })
    .join("");

  renderStandbyTable(standbyAccounts);
}

function compareStandbyAccounts(left = {}, right = {}) {
  const leftDate = left.reactivation_date ? left.reactivation_date.getTime() : Number.POSITIVE_INFINITY;
  const rightDate = right.reactivation_date ? right.reactivation_date.getTime() : Number.POSITIVE_INFINITY;

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  const leftTouch = left.last_contact ? left.last_contact.getTime() : 0;
  const rightTouch = right.last_contact ? right.last_contact.getTime() : 0;
  return rightTouch - leftTouch;
}

function renderStandbyTable(standbyAccounts = []) {
  if (!elements.standbyTableBody || !elements.standbyChip) return;

  const totalCount = standbyAccounts.length;
  const filteredStandbyAccounts = standbyAccounts.filter((account) => matchesStandbyFilter(account, state.standbyFilter));
  const visibleCount = filteredStandbyAccounts.length;
  const dueCount = standbyAccounts.filter((account) => {
    if (!account.reactivation_date) return false;
    return dayDiff(account.reactivation_date, new Date()) >= 0;
  }).length;

  elements.standbyFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", (button.dataset.standbyFilter || "all") === state.standbyFilter);
  });

  const countLabel = visibleCount === totalCount
    ? `${totalCount} standby`
    : `${visibleCount}/${totalCount} standby`;

  elements.standbyChip.textContent = dueCount
    ? `${countLabel} · ${dueCount} de reactivat`
    : countLabel;

  if (!filteredStandbyAccounts.length) {
    elements.standbyTableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-card">${getStandbyEmptyMessage(state.standbyFilter, totalCount)}</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.standbyTableBody.innerHTML = filteredStandbyAccounts
    .map((account) => `
      <tr>
        <td>
          <div class="company-cell">
            <div class="company-name">${escapeHtml(account.company)}</div>
            ${
              account.last_contact
                ? `<div class="company-meta">Ultimul touch ${escapeHtml(formatDateWithYear(account.last_contact))}</div>`
                : ""
            }
          </div>
        </td>
        <td>${escapeHtml(account.standby_reason || "-")}</td>
        <td>${renderReactivationCell(account)}</td>
        <td>${renderNextStepCell(account, null)}</td>
      </tr>
    `)
    .join("");
}

function matchesStandbyFilter(account = {}, filter = "all", now = new Date()) {
  if (filter === "today") {
    return Boolean(account.reactivation_date && dayDiff(account.reactivation_date, now) === 0);
  }

  if (filter === "week") {
    if (!account.reactivation_date) return false;
    const weekStart = parseDate(getWeekStart(now.toISOString().slice(0, 10)));
    const weekEnd = parseDate(getWeekEnd(now.toISOString().slice(0, 10)));
    if (!weekStart || !weekEnd) return false;
    const current = new Date(account.reactivation_date);
    current.setHours(0, 0, 0, 0);
    return current >= weekStart && current <= weekEnd;
  }

  if (filter === "no_date") {
    return !account.reactivation_date;
  }

  return true;
}

function getStandbyEmptyMessage(filter = "all", totalCount = 0) {
  if (!totalCount) {
    return "Nu exista lead-uri in standby in acest moment.";
  }

  if (filter === "today") {
    return "Nu exista lead-uri de reactivat azi.";
  }

  if (filter === "week") {
    return "Nu exista lead-uri de reactivat in aceasta saptamana.";
  }

  if (filter === "no_date") {
    return "Nu exista lead-uri in standby fara data de reactivare.";
  }

  return "Nu exista lead-uri in standby pentru filtrul ales.";
}

function renderAlerts() {
  const queues = getExecutionQueues();
  const sections = [
    {
      key: "today",
      eyebrow: "Astazi",
      title: "Azi",
      copy: "Conturile care au next step exact azi sau trebuie reactivate azi.",
      empty: "Nu ai next step-uri sau reactivari programate pentru azi.",
      tone: "#c98622",
      soft: "#f7ecd5",
      items: queues.today,
    },
    {
      key: "overdue",
      eyebrow: "Urgent",
      title: "Intarziate",
      copy: "Conturile unde termenul pentru next step sau reactivare a fost depasit.",
      empty: "Nu exista conturi sau reactivari intarziate acum.",
      tone: "#cb5846",
      soft: "#fbe8e4",
      items: queues.overdue,
    },
    {
      key: "stale",
      eyebrow: "Reci",
      title: "Reci > 7 zile",
      copy: "Conturile fara next step sau fara touch recent.",
      empty: "Nu exista conturi reci peste 7 zile.",
      tone: "#2f6ea2",
      soft: "#e4eef7",
      items: queues.stale,
    },
  ];

  const totalAccounts = sections.reduce((sum, section) => sum + section.items.length, 0);

  if (!totalAccounts) {
    elements.alertsList.innerHTML = `<article class="empty-card">Nu exista follow-up-uri urgente in acest moment.</article>`;
    return;
  }

  elements.alertsList.innerHTML = `
    <div class="execution-board">
      ${sections.map((section) => buildAlertLane(section)).join("")}
    </div>
  `;
}

function renderActivities() {
  const recent = state.activities.slice(0, 8);

  if (!recent.length) {
    elements.activitiesFeed.innerHTML = `<article class="empty-card">Nu exista activitate salvata inca.</article>`;
    return;
  }

  elements.activitiesFeed.innerHTML = recent
    .map((activity) => buildActivityCard(activity))
    .join("");
}

function renderExecutionSummary() {
  const queues = getExecutionQueues();
  const todayActivities = getTodayActivities();
  const todayCounts = countActivities(todayActivities);

  elements.executionSummary.innerHTML = buildStats([
    {
      label: "Azi",
      value: queues.today.length,
      meta: "next step-uri si reactivari pentru azi",
      color: "#c98622",
      variant: "today",
      eyebrow: "Cadenta",
      target: 0,
      pct: queues.today.length > 0 ? 100 : 0,
    },
    {
      label: "Intarziate",
      value: queues.overdue.length,
      meta: "next step sau reactivare depasita",
      color: "#cb5846",
      variant: "today",
      eyebrow: "Cadenta",
      target: 0,
      pct: queues.overdue.length > 0 ? 100 : 0,
    },
    {
      label: "Fara touch",
      value: queues.stale.length,
      meta: "peste 7 zile fara miscare",
      color: "#2f6ea2",
      variant: "today",
      eyebrow: "Cadenta",
      target: 0,
      pct: queues.stale.length > 0 ? 100 : 0,
    },
    {
      label: "Activitati azi",
      value: todayActivities.length,
      meta: `${todayCounts.contacted} contacte salvate azi`,
      color: "#2d8f57",
      variant: "today",
      eyebrow: "Executie",
      target: 0,
      pct: todayActivities.length > 0 ? 100 : 0,
    },
  ]);
}

function activityLabel(type) {
  const labels = {
    planned: "Planificat",
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
  };
  return labels[type] || type;
}

function statusLabel(type) {
  const status = activityTheme[type] || activityTheme.new;
  return status.label;
}

function buildAlertCopy(account, now) {
  if (isStandbyAccount(account) && account.reactivation_date) {
    const delta = dayDiff(account.reactivation_date, now);
    if (delta > 0) return `reactivare intarziata cu ${delta} zile`;
    if (delta === 0) return "reactivare azi";
    return `reactivare in ${Math.abs(delta)} zile`;
  }

  if (account.next_step_date) {
    const delta = dayDiff(account.next_step_date, now);
    if (delta > 0) return `next step intarziat cu ${delta} zile`;
    if (delta === 0) return "next step azi";
    return `next step in ${Math.abs(delta)} zile`;
  }

  return account.last_contact ? `${dayDiff(account.last_contact, now)} zile fara touch` : "fara touch salvat";
}

function getExecutionQueues(now = new Date()) {
  const openTrackedAccounts = state.accounts
    .filter((account) => isMovingAccount(account));
  const standbyTrackedAccounts = state.accounts
    .filter((account) => isTrackedAccount(account))
    .filter((account) => isStandbyAccount(account));

  const overdue = [];
  const today = [];
  const stale = [];

  openTrackedAccounts.forEach((account) => {
    if (account.next_step_date) {
      const delta = dayDiff(account.next_step_date, now);
      if (delta > 0) {
        overdue.push(account);
      } else if (delta === 0) {
        today.push(account);
      }
      return;
    }

    if (!account.last_contact || dayDiff(account.last_contact, now) > 7) {
      stale.push(account);
    }
  });

  standbyTrackedAccounts.forEach((account) => {
    if (!account.reactivation_date) return;

    const delta = dayDiff(account.reactivation_date, now);
    if (delta > 0) {
      overdue.push(account);
    } else if (delta === 0) {
      today.push(account);
    }
  });

  const all = [...overdue, ...today, ...stale].sort((left, right) => {
    const leftPriority = getAlertState(left, now).priority;
    const rightPriority = getAlertState(right, now).priority;
    return rightPriority - leftPriority;
  });

  return {
    overdue,
    today,
    stale,
    all,
  };
}

function getAlertState(account, now = new Date()) {
  if (isStandbyAccount(account) && account.reactivation_date) {
    const delta = dayDiff(account.reactivation_date, now);
    if (delta > 0) {
      return {
        eyebrow: "Reactivare",
        badge: delta === 1 ? "1 zi peste reactivare" : `${delta} zile peste reactivare`,
        copy: buildAlertCopy(account, now),
        tone: "#cb5846",
        soft: "#fbe8e4",
        priority: 320 + delta,
      };
    }

    if (delta === 0) {
      return {
        eyebrow: "Reactivare",
        badge: "Azi",
        copy: buildAlertCopy(account, now),
        tone: "#c98622",
        soft: "#f7ecd5",
        priority: 220,
      };
    }
  }

  if (account.next_step_date) {
    const delta = dayDiff(account.next_step_date, now);
    if (delta > 0) {
      return {
        eyebrow: "Intarziat",
        badge: delta === 1 ? "1 zi peste termen" : `${delta} zile peste termen`,
        copy: buildAlertCopy(account, now),
        tone: "#cb5846",
        soft: "#fbe8e4",
        priority: 300 + delta,
      };
    }

    if (delta === 0) {
      return {
        eyebrow: "De facut azi",
        badge: "Astazi",
        copy: buildAlertCopy(account, now),
        tone: "#c98622",
        soft: "#f7ecd5",
        priority: 200,
      };
    }
  }

  if (!account.last_contact) {
    return {
      eyebrow: "Fara touch",
      badge: "Primul pas",
      copy: "fara touch salvat",
      tone: "#2f6ea2",
      soft: "#e4eef7",
      priority: 150,
    };
  }

  const silentDays = dayDiff(account.last_contact, now);
  const isCold = silentDays > 14;
  return {
    eyebrow: isCold ? "Rece" : "Atentie",
    badge: `${silentDays} zile fara touch`,
    copy: buildAlertCopy(account, now),
    tone: isCold ? "#cb5846" : "#2f6ea2",
    soft: isCold ? "#fbe8e4" : "#e4eef7",
    priority: 100 + silentDays,
  };
}

function buildAlertCard(account) {
  const alertState = getAlertState(account);
  const pipelineTheme = pipelineStageTheme[account.pipeline_stage] || {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.14)",
  };

  const metaChips = [
    buildThemedPill(account.pipeline_stage || "Fara stadiu", pipelineTheme),
    buildHealthPill(account.account_health),
    account.standby_reason ? `<span class="execution-meta-pill">Standby: ${escapeHtml(account.standby_reason)}</span>` : "",
    account.workers ? `<span class="execution-meta-pill">${account.workers} muncitori</span>` : "",
  ].filter(Boolean);

  const detailText = account.last_outcome ? escapeHtml(account.last_outcome) : "";

  const footerLeft = isStandbyAccount(account) && account.reactivation_date
    ? `Data reactivare: ${formatDate(account.reactivation_date)}`
    : account.next_step_date
      ? `Data next step: ${formatDate(account.next_step_date)}`
      : `Ultimul touch: ${formatDate(account.last_contact)}`;

  const footerRight = account.next_step
    ? escapeHtml(account.next_step)
    : isStandbyAccount(account)
      ? "Fara pas de reactivare notat"
      : "Fara next step notat";

  return `
    <article class="execution-card execution-card--alert" style="--execution-accent:${alertState.tone}; --execution-soft:${alertState.soft};">
      <div class="execution-card-head">
        <div class="execution-kicker">${alertState.eyebrow}</div>
        <span class="execution-badge">${escapeHtml(alertState.badge)}</span>
      </div>
      <div class="execution-company">${escapeHtml(account.company)}</div>
      <div class="execution-copy">${escapeHtml(alertState.copy)}</div>
      ${metaChips.length ? `<div class="execution-chip-row">${metaChips.join("")}</div>` : ""}
      ${detailText ? `<div class="execution-note">${detailText}</div>` : ""}
      <div class="execution-footer">
        <span>${footerLeft}</span>
        <span>${footerRight}</span>
      </div>
    </article>
  `;
}

function buildAlertLane(section) {
  const cards = section.items.length
    ? section.items.map((account) => buildAlertCard(account)).join("")
    : `<article class="empty-card execution-lane-empty">${section.empty}</article>`;

  return `
    <section class="execution-lane" style="--lane-accent:${section.tone}; --lane-soft:${section.soft};">
      <div class="execution-lane-head">
        <div class="execution-lane-copy-wrap">
          <div class="execution-lane-kicker">${section.eyebrow}</div>
          <h3 class="execution-lane-title">${section.title}</h3>
          <p class="execution-lane-copy">${section.copy}</p>
        </div>
        <span class="execution-lane-count">${section.items.length}</span>
      </div>
      <div class="execution-lane-list">
        ${cards}
      </div>
    </section>
  `;
}

function buildActivityCard(activity) {
  const theme = activityTheme[activity.activity_type] || activityTheme.new;
  const metaChips = [
    activity.workers_delta ? `<span class="execution-meta-pill">${activity.workers_delta} muncitori</span>` : "",
    activity.next_step ? `<span class="execution-meta-pill">Next: ${escapeHtml(activity.next_step)}</span>` : "",
    activity.next_step_date ? `<span class="execution-meta-pill">${formatDate(activity.next_step_date)}</span>` : "",
  ].filter(Boolean);

  const primaryCopy = activity.outcome || activity.notes || "Actiune salvata in dashboard.";
  const secondaryCopy = activity.outcome && activity.notes ? escapeHtml(activity.notes) : "";

  return `
    <article class="execution-card execution-card--activity" style="--execution-accent:${theme.color}; --execution-soft:${theme.bg};">
      <div class="execution-card-head">
        <span class="execution-badge execution-badge--solid">${escapeHtml(activityLabel(activity.activity_type))}</span>
        <span class="execution-date">${formatDate(activity.date)}</span>
      </div>
      <div class="execution-company">${escapeHtml(activity.company)}</div>
      <div class="execution-copy">${escapeHtml(primaryCopy)}</div>
      ${secondaryCopy ? `<div class="execution-note">${secondaryCopy}</div>` : ""}
      ${metaChips.length ? `<div class="execution-chip-row">${metaChips.join("")}</div>` : ""}
    </article>
  `;
}

function buildThemedPill(label, theme) {
  if (!label) return "";
  return `
    <span class="status-pill" style="color:${theme.color}; background:${theme.bg}; border-color:${theme.color}33;">
      ${escapeHtml(label)}
    </span>
  `;
}

function buildHealthPill(value = "") {
  const normalized = normalizeAccountHealth(value);
  if (!normalized) return "";
  const dotClass = getHealthDotClass(normalized);
  return `
    <span class="execution-meta-pill execution-meta-pill--health">
      <span class="health-dot ${dotClass}"></span>
      ${escapeHtml(normalized)}
    </span>
  `;
}

function getHealthDotClass(value = "") {
  const normalized = normalizeAccountHealth(value);
  if (normalized === "Verde") return "health-verde";
  if (normalized === "Galben") return "health-galben";
  if (normalized === "Rosu") return "health-rosu";
  return "health-gri";
}

function formatNextStep(account) {
  const parts = [account.next_step];
  if (account.next_step_date) {
    parts.push(formatDate(account.next_step_date));
  }
  return parts.filter(Boolean).join(" · ") || "-";
}

function buildLatestPlannedActivityIndex(activities = []) {
  const index = new Map();

  activities.forEach((activity) => {
    if (!activity.company || !isPlannedActivity(activity)) return;
    const key = normalizeCompanyKey(activity.company);
    if (!index.has(key)) {
      index.set(key, activity);
    }
  });

  return index;
}

function renderNextStepCell(account = {}, activity) {
  const nextStep = normalizeString(account.next_step);

  if (nextStep || account.next_step_date) {
    const meta = [];
    if (account.next_step_date) {
      meta.push(formatDate(account.next_step_date));
    }

    return `
      <div class="planned-cell">
        <div class="planned-cell-title">${escapeHtml(nextStep || "Pas urmator notat")}</div>
        ${
          meta.length
            ? `<div class="company-meta">${escapeHtml(meta.join(" · "))}</div>`
            : ""
        }
      </div>
    `;
  }

  if (!activity) {
    return `<span class="table-muted">-</span>`;
  }

  const rawOutcome = normalizeString(activity.outcome);
  const genericPlannedOutcome = rawOutcome.toLowerCase() === "planificat";
  const primary = normalizeString(activity.next_step)
    || (!genericPlannedOutcome && rawOutcome)
    || "Pas urmator notat";

  const meta = [];
  if (activity.next_step_date) {
    meta.push(formatDate(activity.next_step_date));
  }

  return `
    <div class="planned-cell">
      <div class="planned-cell-title">${escapeHtml(primary)}</div>
      ${
        meta.length
          ? `<div class="company-meta">${escapeHtml(meta.join(" · "))}</div>`
          : ""
      }
    </div>
  `;
}

function renderReactivationCell(account = {}, now = new Date()) {
  if (!account.reactivation_date) {
    return `<span class="table-muted">-</span>`;
  }

  const delta = dayDiff(account.reactivation_date, now);
  let meta = "";

  if (delta > 0) {
    meta = delta === 1 ? "de reactivat ieri" : `intarziat ${delta} zile`;
  } else if (delta === 0) {
    meta = "de reactivat azi";
  } else {
    meta = `peste ${Math.abs(delta)} zile`;
  }

  return `
    <div class="planned-cell">
      <div class="planned-cell-title">${escapeHtml(formatDateWithYear(account.reactivation_date))}</div>
      <div class="company-meta">${escapeHtml(meta)}</div>
    </div>
  `;
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateWithYear(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isSameDay(left, right) {
  if (!left || !right) return false;
  return toIsoDateValue(left) === toIsoDateValue(right);
}

function dayDiff(left, right) {
  const ms = 1000 * 60 * 60 * 24;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  leftDate.setHours(0, 0, 0, 0);
  rightDate.setHours(0, 0, 0, 0);
  return Math.floor((rightDate.getTime() - leftDate.getTime()) / ms);
}

async function apiJson(url, options = {}) {
  const { body, headers, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}.`);
  }

  return payload;
}

function buildCompanyPatchFromActivityRaw(raw, record) {
  const payload = { company: record.company };
  let shouldSync = false;
  const requestedPipelineStage = normalizeString(raw.pipeline_stage);

  if (requestedPipelineStage) {
    const pipelineStage = normalizePipelineStage(requestedPipelineStage);
    if (pipelineStage) {
      payload.pipeline_stage = pipelineStage;
      if (pipelineStage !== "Parcat") {
        payload.standby_reason = "";
        payload.reactivation_date = "";
      }
      shouldSync = true;
    }
  }

  return shouldSync ? payload : null;
}

function buildCompanyUpdatePatch(record, raw = {}) {
  const payload = {
    company: record.company,
  };

  const requestedPipelineStage = normalizeString(raw.pipeline_stage);
  const hasNextStepInput = normalizeString(raw.next_step) !== "" || normalizeString(raw.next_step_date) !== "";
  const hasStandbyInput = normalizeString(raw.standby_reason) !== "" || normalizeString(raw.reactivation_date) !== "";
  const shouldClearStandby = Boolean(requestedPipelineStage && record.pipeline_stage !== "Parcat");
  const shouldSyncStandby = shouldClearStandby || hasStandbyInput;

  if (requestedPipelineStage) {
    payload.pipeline_stage = record.pipeline_stage;
  }

  if (raw.account_health !== undefined) {
    payload.account_health = record.account_health;
  }

  if (raw.workers !== undefined && raw.workers !== "") {
    payload.workers = record.workers;
  }

  if (raw.lead_date !== undefined && raw.lead_date !== "") {
    payload.lead_date = record.lead_date;
  }

  if (raw.last_contact !== undefined && raw.last_contact !== "") {
    payload.last_contact = record.last_contact;
  }

  if (hasNextStepInput) {
    payload.next_step = record.next_step;
    payload.next_step_date = record.next_step_date;
  }

  if (shouldSyncStandby) {
    payload.standby_reason = shouldClearStandby ? "" : record.standby_reason;
    payload.reactivation_date = shouldClearStandby ? null : record.reactivation_date;
  }

  if (raw.sector !== undefined && raw.sector !== "") {
    payload.sector = record.sector;
  }

  if (raw.notes !== undefined && raw.notes !== "") {
    payload.notes = record.notes;
  }

  return payload;
}

function buildActivityFromCompanyUpdate(record, raw = {}) {
  const requestedPipelineStage = normalizeString(raw.pipeline_stage);
  const activityType = mapPipelineStageToActivityType(requestedPipelineStage);

  if (!activityType) return null;

  const stage = normalizePipelineStage(requestedPipelineStage);
  return normalizeRow("activities", {
    date: getTodayIsoDate(),
    company: record.company,
    activity_type: activityType,
    next_step: raw.next_step || "",
    next_step_date: raw.next_step_date || "",
    notes: `Stadiu pipeline actualizat la ${stage} din Update rapid companie.`,
  });
}

function serializeActivityPayload(record) {
  return {
    date: record.date ? record.date.toISOString().slice(0, 10) : "",
    company: record.company,
    activity_type: record.activity_type,
    outcome: record.outcome,
    workers_delta: record.workers_delta,
    next_step: record.next_step,
    next_step_date: record.next_step_date ? record.next_step_date.toISOString().slice(0, 10) : "",
    notes: record.notes,
  };
}

function serializeCompanyPayload(record) {
  const payload = {
    company: record.company,
  };

  if ("pipeline_stage" in record) {
    payload.pipeline_stage = record.pipeline_stage;
  }

  if ("account_health" in record) {
    payload.account_health = record.account_health;
  }

  if ("workers" in record) {
    payload.workers = record.workers;
  }

  if ("lead_date" in record) {
    payload.lead_date = record.lead_date ? record.lead_date.toISOString().slice(0, 10) : "";
  }

  if ("last_contact" in record) {
    payload.last_contact = record.last_contact ? record.last_contact.toISOString().slice(0, 10) : "";
  }

  if ("next_step" in record) {
    payload.next_step = record.next_step;
  }

  if ("next_step_date" in record) {
    payload.next_step_date = record.next_step_date ? record.next_step_date.toISOString().slice(0, 10) : "";
  }

  if ("standby_reason" in record) {
    payload.standby_reason = record.standby_reason;
  }

  if ("reactivation_date" in record) {
    payload.reactivation_date = record.reactivation_date ? record.reactivation_date.toISOString().slice(0, 10) : "";
  }

  if ("sector" in record) {
    payload.sector = record.sector;
  }

  if ("notes" in record) {
    payload.notes = record.notes;
  }

  return payload;
}

function serializeScorecardPayload(record) {
  return {
    week_start: record.week_start,
    week_key: record.week_key,
    new_contract_workers_mtd: record.new_contract_workers_mtd,
    dream100_p1_prospects: record.dream100_p1_prospects,
    sales_velocity_days: record.sales_velocity_days,
    cold_calls: record.cold_calls,
    linkedin_messages: record.linkedin_messages,
    field_visits: record.field_visits,
    warm_outreach: record.warm_outreach,
    meetings_set: record.meetings_set,
    offers_sent: record.offers_sent,
    contracts_signed: record.contracts_signed,
    workers_signed: record.workers_signed,
    workers_delivered: record.workers_delivered,
    notes: record.notes,
  };
}

function serializeLeadMeasuresPayload(record) {
  return {
    date: record.date,
    cold_calls: record.cold_calls,
    whatsapp_messages: record.whatsapp_messages,
    field_visits: record.field_visits,
    warm_outreach: record.warm_outreach,
    notes: record.notes,
  };
}

function serializeDailyScorePayload(record) {
  return {
    date: record.date,
    contacted: record.contacted,
    meetings: record.meetings,
    offers: record.offers,
    contracts: record.contracts,
    notes: record.notes,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
