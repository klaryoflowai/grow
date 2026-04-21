const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
};

const scorecardTargets = {
  powerThree: {
    newContractWorkersMtd: 100,
    dream100P1Prospects: 10,
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
    prospectsPerWeek: 20,
    meetingsPerWeek: 5,
    followUpTarget: 100,
  },
};

const appBuild = "20260421f";

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
  },
  manualData: loadManualData(),
  manualScorecards: loadScorecards(),
  accounts: [],
  activities: [],
  dailyScores: [],
  scorecards: [],
  scorecard: createEmptyScorecard(),
  search: "",
  page: getPageFromHash(),
  apiEnabled: false,
  sourceMode: "fallback",
  bootstrapReady: false,
  connection: null,
  warnings: [],
  targets: loadTargets(),
};

const elements = {
  currentDate: document.getElementById("current-date"),
  pacingCard: document.getElementById("pacing-card"),
  dataModePill: document.getElementById("data-mode-pill"),
  summaryChip: document.getElementById("summary-chip"),
  statusMessage: document.getElementById("status-message"),
  retryConnection: document.getElementById("retry-connection"),
  scorecardWeekChip: document.getElementById("scorecard-week-chip"),
  scorecardSourceChip: document.getElementById("scorecard-source-chip"),
  checklistSnapshot: document.getElementById("checklist-snapshot"),
  checklistDayGrid: document.getElementById("checklist-day-grid"),
  checklistWeekGrid: document.getElementById("checklist-week-grid"),
  wigGrid: document.getElementById("wig-grid"),
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
  companyOptions: document.getElementById("company-options"),
  pageButtons: [...document.querySelectorAll("[data-page-target]")],
  pageSections: [...document.querySelectorAll("[data-page]")],
  saveTargets: document.getElementById("save-targets"),
  hydrateDailyTrend: document.getElementById("hydrate-daily-trend"),
  targets: {
    contacted: document.getElementById("target-contacted"),
    meetings: document.getElementById("target-meetings"),
    offers: document.getElementById("target-offers"),
    contracts: document.getElementById("target-contracts"),
  },
  forms: {
    activity: document.getElementById("activity-form"),
    account: document.getElementById("account-form"),
    scorecard: document.getElementById("scorecard-form"),
    dailyTrend: document.getElementById("daily-trend-form"),
  },
  companyInputs: [...document.querySelectorAll('input[name="company"]')],
};

init();

async function init() {
  elements.currentDate.textContent = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

  if (state.apiEnabled) {
    try {
      await apiJson("/api/activities", {
        method: "POST",
        body: serializeActivityPayload(record),
      });
      if (companyPatchPayload) {
        await apiJson("/api/companies", {
          method: "PATCH",
          body: companyPatchPayload,
        });
      }
      await refreshData({ silent: true });
      updateStatus(
        `Salvat in Airtable: ${record.company} → ${activityLabel(record.activity_type)}${
          companyPatchPayload ? " + pipeline sincronizat" : ""
        }.`
      );
    } catch (error) {
      updateStatus(`Airtable nu a putut salva activitatea. ${error.message}`);
      return false;
    }
  } else {
    state.manualData.activities.unshift(record);
    syncManualAccountFromActivity(record);
    if (companyPatchPayload) {
      upsertManualAccount(normalizeRow("accounts", companyPatchPayload));
    }
    persistManualData();
    refreshCombinedData();
    updateStatus(
      `Salvat local: ${record.company} → ${activityLabel(record.activity_type)}${
        companyPatchPayload ? " + pipeline sincronizat" : ""
      }.`
    );
  }

  if (form) {
    form.reset();
    setDefaultFormDates();
  }
  render();
  return true;
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
    };

    if (state.apiEnabled) {
      try {
        const result = await apiJson("/api/targets", {
          method: "PUT",
          body: payload,
        });
        state.targets = normalizeTargets(result.targets || payload);
        refreshCombinedData();
        updateStatus("Target-urile lunare au fost salvate in Airtable.");
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
    updateStatus("Target-urile au fost salvate local pana conectam Vercel-ul la Airtable.");
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
    if (!raw.date) raw.date = new Date().toISOString().slice(0, 10);
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
      raw.date = new Date().toISOString().slice(0, 10);
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

    if (state.apiEnabled) {
      try {
        await apiJson("/api/companies", {
          method: "PATCH",
          body: serializeCompanyPayload(record, raw),
        });
        await refreshData({ silent: true });
        updateStatus(`Compania ${record.company} a fost actualizata in Airtable.`);
      } catch (error) {
        updateStatus(`Airtable nu a putut salva compania. ${error.message}`);
        return;
      }
    } else {
      upsertManualAccount(record);
      persistManualData();
      refreshCombinedData();
      updateStatus(`Compania ${record.company} a fost actualizata local.`);
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
        await apiJson("/api/scorecard", {
          method: "PUT",
          body: serializeScorecardPayload(record),
        });
        await refreshData({ silent: true });
        updateScorecardStatus(`Scorecard-ul pentru ${record.week_label} a fost salvat in Airtable.`);
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
    hydrateDailyTrendForm(selectedDate || new Date().toISOString().slice(0, 10), { preferActivityCounts: true });
    updateDailyTrendStatus("Formularul a fost precompletat din activitatile salvate pentru data aleasa.");
  });

  elements.forms.dailyTrend?.elements?.namedItem("date")?.addEventListener("change", (event) => {
    hydrateDailyTrendForm(event.currentTarget.value);
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
      `Resetez tracking-ul pentru ${company}? Vor fi golite stadiul, sanatatea contului, lead date, ultimul contact si next step-ul.`
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
    link.download = `grow-scorecard-memory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("Fallback-ul local a fost exportat, inclusiv scorecard-ul saptamanal.");
  });

  elements.clearMemory.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.manual);
    localStorage.removeItem(storageKeys.scorecards);
    localStorage.removeItem(storageKeys.targets);
    state.manualData = { accounts: [], activities: [], dailyScores: [] };
    state.manualScorecards = [];
    state.dailyScores = [];
    state.targets = { ...defaultTargets };
    hydrateInputs();
    refreshCombinedData();
    hydrateDailyTrendForm();
    updateStatus("Memoria locala a fost stearsa, inclusiv trendul zilnic si scorecard-ul saptamanal.");
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

    if (payload.targets) {
      state.targets = normalizeTargets(payload.targets);
      hydrateInputs();
    } else if (!state.apiEnabled) {
      state.targets = loadTargets();
    }

    refreshCombinedData();
    hydrateScorecardForm();
    hydrateDailyTrendForm();

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
    state.sourceData = { accounts: [], activities: [], scorecards: [], dailyScores: [] };
    state.targets = loadTargets();
    refreshCombinedData();
    hydrateScorecardForm();
    hydrateDailyTrendForm();

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

  assign("week_start", scorecard.week_start);
  assign("new_contract_workers_mtd", scorecard.new_contract_workers_mtd);
  assign("dream100_p1_prospects", scorecard.dream100_p1_prospects);
  assign("sales_velocity_days", scorecard.sales_velocity_days);
  assign("cold_calls", scorecard.cold_calls);
  assign("linkedin_messages", scorecard.linkedin_messages);
  assign("field_visits", scorecard.field_visits);
  assign("meetings_set", scorecard.meetings_set);
  assign("offers_sent", scorecard.offers_sent);
  assign("contracts_signed", scorecard.contracts_signed);
  assign("workers_signed", scorecard.workers_signed);
  assign("workers_delivered", scorecard.workers_delivered);
  assign("notes", scorecard.notes);
}

function hydrateDailyTrendForm(date = "", options = {}) {
  const form = elements.forms.dailyTrend;
  if (!form) return;

  const requestedDate = normalizeString(date)
    || normalizeString(form.elements.namedItem("date")?.value)
    || new Date().toISOString().slice(0, 10);
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
  const isoDate = normalizeString(date) || new Date().toISOString().slice(0, 10);
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

function setDefaultFormDates() {
  const today = new Date().toISOString().slice(0, 10);
  const activityDate = elements.forms.activity?.querySelector('input[name="date"]');
  const activityNextStepDate = elements.forms.activity?.querySelector('input[name="next_step_date"]');
  const accountLastContact = elements.forms.account?.querySelector('input[name="last_contact"]');
  const accountNextStepDate = elements.forms.account?.querySelector('input[name="next_step_date"]');
  const scorecardWeekStart = elements.forms.scorecard?.querySelector('input[name="week_start"]');
  const dailyTrendDate = elements.forms.dailyTrend?.querySelector('input[name="date"]');

  if (activityDate && !activityDate.value) setDateFieldValue(activityDate, today);
  if (activityNextStepDate && !activityNextStepDate.value) setDateFieldValue(activityNextStepDate, "");
  if (accountLastContact && !accountLastContact.value) setDateFieldValue(accountLastContact, today);
  if (accountNextStepDate && !accountNextStepDate.value) setDateFieldValue(accountNextStepDate, "");
  if (scorecardWeekStart && !scorecardWeekStart.value) setDateFieldValue(scorecardWeekStart, getWeekStart(today));
  if (dailyTrendDate && !dailyTrendDate.value) setDateFieldValue(dailyTrendDate, today);
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
  return {
    contacted: toNumber(value.contacted ?? value.leads ?? defaultTargets.contacted),
    meetings: toNumber(value.meetings ?? defaultTargets.meetings),
    offers: toNumber(value.offers ?? defaultTargets.offers),
    contracts: toNumber(value.contracts ?? defaultTargets.contracts),
  };
}

function createEmptyScorecard(weekStart = getWeekStart(new Date().toISOString().slice(0, 10))) {
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
    meetings_set: 0,
    offers_sent: 0,
    contracts_signed: 0,
    workers_signed: 0,
    workers_delivered: 0,
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
  if (!raw) return { accounts: [], activities: [], dailyScores: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((row) => normalizeRow("accounts", row)) : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities.map((row) => normalizeRow("activities", row)) : [],
      dailyScores: Array.isArray(parsed.dailyScores) ? parsed.dailyScores.map((row) => normalizeRow("dailyScores", row)) : [],
    };
  } catch {
    return { accounts: [], activities: [], dailyScores: [] };
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
    || state.manualScorecards.length
  );
}

function selectCurrentScorecard(scorecards) {
  const currentWeekStart = getWeekStart(new Date().toISOString().slice(0, 10));
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
  updateCompanyOptions();
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
      pipeline_stage: mapActivityToPipelineStage(activity.activity_type),
      account_health: "",
      last_outcome: "",
      workers: 0,
      lead_date: null,
      last_contact: null,
      next_step: "",
      next_step_date: null,
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

    if (!plannedActivity) {
      existing.pipeline_stage = mergePipelineStage(existing.pipeline_stage, activity.activity_type);
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
        pipeline_stage: mapActivityToPipelineStage(activity.activity_type),
        account_health: "",
        last_outcome: "",
        workers: 0,
        lead_date: null,
        last_contact: null,
        next_step: "",
        next_step_date: null,
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

  if (!plannedActivity) {
    current.pipeline_stage = mergePipelineStage(current.pipeline_stage, activity.activity_type);
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

function normalizeRow(kind, row) {
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
      linkedin_messages: toNumber(row.linkedin_messages || row.linkedInMessages || 0),
      field_visits: toNumber(row.field_visits || row.fieldVisits || 0),
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

function isPipelineOpen(stage = "") {
  const normalized = normalizePipelineStage(stage);
  if (!normalized) return false;
  return !["Contract semnat", "Parcat", "Pierdut"].includes(normalized);
}

function isTrackedAccount(account = {}) {
  return Boolean(
    normalizeString(account.pipeline_stage)
    || normalizeString(account.account_health)
    || normalizeString(account.last_outcome)
    || account.last_contact
    || normalizeString(account.next_step)
    || account.next_step_date
  );
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
  const trackedCount = state.accounts.filter((account) => isTrackedAccount(account)).length;
  elements.dataModePill.textContent = !state.bootstrapReady
    ? "Se conecteaza..."
    : state.apiEnabled
    ? "Airtable live"
    : hasManualData()
      ? "Fallback local"
      : "Asteapta conexiunea";
  elements.summaryChip.textContent = `${state.activities.length} activitati · ${trackedCount} companii cu tracking`;

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

function renderPacingCard() {
  if (!elements.pacingCard) return;

  const todayCounts = countActivities(getTodayActivities());
  const monthlyCounts = countActivities(getMonthlyActivities());
  const { total, elapsed } = getWorkingDaysInfo();
  const target = state.targets.contacted || 1;
  const expectedByNow = Math.round((target / total) * elapsed);
  const ratio = expectedByNow > 0 ? monthlyCounts.contacted / expectedByNow : 1;

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
    <div class="hero-pacing-label">Contactate / target lunar</div>
    <div class="hero-pacing-number" style="color:${statusColor};">${monthlyCounts.contacted}<span class="hero-pacing-target"> / ${target}</span></div>
    <div class="hero-pacing-status">
      Azi: <strong>${todayCounts.contacted}</strong> contacte · <strong>${todayCounts.meeting}</strong> meetings
      <span class="hero-pacing-badge" style="color:${statusColor}; border-color:${statusColor}33; background:${pacingBg};">${statusLabel}</span>
    </div>
    <div class="hero-pacing-meta">Asteptat pana azi: ${expectedByNow} · Zi lucratoare ${elapsed} din ${total}</div>
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
    ? "Baza Grow este conectata. Formularele scriu direct in Airtable, iar trendul zilnic poate veni din tabela Scorecard Trend."
    : "Pana setezi variabilele de mediu in Vercel, dashboard-ul retine local activitatile, target-urile, trendul zilnic si scorecard-ul saptamanal.";

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
    (account) => isTrackedAccount(account) && isPipelineOpen(account.pipeline_stage)
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
        "Dupa fiecare apel, mesaj sau meeting real, salveaza touch-ul in aceeasi zi.",
        "Daca nu ai ajuns la decident, marcheaza outcome-ul real: Nu am ajuns la decident, Nu raspunde, Revino mai tarziu.",
        "Pentru activitatile doar planificate, foloseste Planificat; nu le amesteca cu executia reala.",
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
        "Completeaza Companie, Actiune si Rezultat.",
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
        "Planned inseamna planificat, nu realizat.",
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
    buildConversionCard4dx("Contact -> Meeting", metrics.contactToMeeting, scorecardTargets.funnel.contactToMeeting),
    buildConversionCard4dx("Meeting -> Oferta", metrics.meetingToOffer, scorecardTargets.funnel.meetingToOffer),
    buildConversionCard4dx("Oferta -> Semnat", metrics.offerToSigned, scorecardTargets.funnel.offerToSigned),
  ].join("");

  elements.leadMeasuresGrid.innerHTML = [
    buildLeadMeasureCard({
      icon: "phone",
      label: "Contacte Reci (Outreach)",
      value: metrics.outreachTotal,
      target: scorecardTargets.leadMeasures.outreach,
      tone: "#2f6ea2",
      detail: `${scorecard.cold_calls} cold calls · ${scorecard.linkedin_messages} LinkedIn`,
    }),
    buildLeadMeasureCard({
      icon: "field",
      label: "Vizite in teren / networking",
      value: scorecard.field_visits,
      target: scorecardTargets.leadMeasures.fieldVisits,
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

function getCurrentWeekScorecardRecord() {
  const currentWeekStart = getWeekStart(new Date().toISOString().slice(0, 10));
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
  const currentWeekStart = parseDate(scorecard.week_start || getWeekStart(new Date().toISOString().slice(0, 10)));
  const currentWeekEnd = parseDate(scorecard.week_end || getWeekEnd(scorecard.week_start));
  const weeklyMeetings = state.activities.filter(
    (activity) =>
      activity.activity_type === "meeting"
      && isDateWithinInclusiveRange(activity.date, currentWeekStart, currentWeekEnd)
  );
  const meetingsWithFollowUp = weeklyMeetings.filter(hasFollowUpWithin24h).length;
  const followUpMetric = buildRateMetric(meetingsWithFollowUp, weeklyMeetings.length);
  const daysRemainingInQ2 = q2End ? Math.max(dayDiff(q2End, new Date()), 0) : 0;

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
  const outreachTotal = scorecard.cold_calls + scorecard.linkedin_messages;
  const contactToMeeting = buildRateMetric(scorecard.meetings_set, scorecard.dream100_p1_prospects);
  const meetingToOffer = buildRateMetric(scorecard.offers_sent, scorecard.meetings_set);
  const offerToSigned = buildRateMetric(scorecard.contracts_signed, scorecard.offers_sent);
  const activityRatio = scorecard.meetings_set ? outreachTotal / scorecard.meetings_set : 0;
  const bottleneck = [contactToMeeting, meetingToOffer, offerToSigned]
    .filter((item) => item.hasBase)
    .sort((left, right) => left.value - right.value)[0];
  const velocityGood = velocity.averageDays > 0 && velocity.averageDays <= scorecardTargets.powerThree.salesVelocityDays;

  return {
    outreachTotal,
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
      <div class="metric-note">P1 vine din Scorecard-ul saptamanii curente. Follow-up-ul de 24h este calculat live din activitatile de meeting care au next step imediat sau actiune ulterioara in 24h.</div>
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
      <div class="velocity-foot">${conversionCount.join(" · ")}</div>
    </article>
  `;
}

function buildConversionCard4dx(label, metric, target) {
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
        <span>${metric.hasBase ? `${metric.numerator} din ${metric.denominator}` : "Fara baza suficienta in saptamana curenta."}</span>
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

function buildActivityRatioCard(scorecard, metrics) {
  const ratioText = scorecard.meetings_set
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

  return `
    <article class="ratio-card-shell">
      <div class="metric-kicker">Activity Ratio</div>
      <div class="ratio-value">${scorecard.meetings_set ? metrics.activityRatio.toFixed(1) : "-"}</div>
      <div class="metric-note">${ratioText}</div>
      <div class="ratio-foot">${bottleneckCopy}</div>
    </article>
  `;
}

function buildLagFunnel(scorecard, metrics) {
  const funnelStages = [
    {
      label: "Dream100 P1 noi",
      value: scorecard.dream100_p1_prospects,
      width: 100,
      note: "punctul de intrare in palnie",
      tone: "#2f6ea2",
      bottleneck: false,
    },
    {
      label: "Meetings stabilite",
      value: scorecard.meetings_set,
      width: 82,
      note: `${metrics.contactToMeeting.hasBase ? `${metrics.contactToMeeting.value}% din prospectarea P1` : "asteapta date"}`,
      tone: metrics.bottleneck === metrics.contactToMeeting ? "#cb5846" : "#55779e",
      bottleneck: metrics.bottleneck === metrics.contactToMeeting,
    },
    {
      label: "Oferte trimise",
      value: scorecard.offers_sent,
      width: 66,
      note: `${metrics.meetingToOffer.hasBase ? `${metrics.meetingToOffer.value}% din meetings` : "asteapta date"}`,
      tone: metrics.bottleneck === metrics.meetingToOffer ? "#cb5846" : "#c38b2a",
      bottleneck: metrics.bottleneck === metrics.meetingToOffer,
    },
    {
      label: "Contracte semnate",
      value: scorecard.contracts_signed,
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
  const noResponseCount = monthlyActivities.filter(
    (a) => a.outcome && a.outcome.toLowerCase().includes("nu raspunde")
  ).length;

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
        <div class="conversion-meta"><span>${counts.contacted - noResponseCount} raspunsuri din ${counts.contacted} contacte · ${noResponseCount} "Nu raspunde"</span></div>
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

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const isoDate = date.toISOString().slice(0, 10);
    const scoreRow = scoreByDate.get(isoDate);

    let counts;
    if (scoreRow) {
      counts = {
        contacted: scoreRow.contacted || 0,
        meeting: scoreRow.meetings || 0,
        offer: scoreRow.offers || 0,
        contract_signed: scoreRow.contracts || 0,
      };
    } else {
      counts = countActivities(state.activities.filter((activity) => isSameDay(activity.date, date)));
    }

    rows.push({
      label: new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(date),
      ...counts,
    });
  }

  return rows;
}

function renderPipeline() {
  const trackedAccounts = state.accounts.filter((account) => isTrackedAccount(account));
  const latestPlannedByCompany = buildLatestPlannedActivityIndex(state.activities);
  const activeAccounts = trackedAccounts
    .filter((account) => !state.search || account.company.toLowerCase().includes(state.search))
    .sort((left, right) => {
      const stageDiff = pipelineStageValueRank(right.pipeline_stage) - pipelineStageValueRank(left.pipeline_stage);
      if (stageDiff !== 0) return stageDiff;
      const leftTime = left.last_contact ? left.last_contact.getTime() : 0;
      const rightTime = right.last_contact ? right.last_contact.getTime() : 0;
      return rightTime - leftTime;
    });

  const activeAccs = trackedAccounts.filter((account) => isPipelineOpen(account.pipeline_stage));
  const counts = {
    active: activeAccs.length,
    offers: trackedAccounts.filter((account) => isOfferStage(account.pipeline_stage)).length,
    signed: trackedAccounts.filter((account) => account.pipeline_stage === "Contract semnat").length,
    parked: trackedAccounts.filter((account) => ["Parcat", "Pierdut"].includes(account.pipeline_stage)).length,
    workersInPipeline: activeAccs.reduce((sum, a) => sum + (a.workers || 0), 0),
  };

  elements.pipelineSummary.innerHTML = `
    <article class="pipeline-stat-card">
      <div class="pipeline-stat-label">Active</div>
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
  `;

  if (!activeAccounts.length) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-card">Nu exista companii cu tracking activ inca. Prima activitate sau primul update de companie le va adauga aici.</div>
        </td>
      </tr>
    `;
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
          <td>${renderPlannedActivityCell(plannedActivity, account)}</td>
          <td>${formatDate(account.last_contact)}</td>
          <td>${escapeHtml(formatNextStep(account))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAlerts() {
  const queues = getExecutionQueues();
  const sections = [
    {
      key: "today",
      eyebrow: "Astazi",
      title: "Azi",
      copy: "Conturile care au next step exact azi.",
      empty: "Nu ai next step-uri programate pentru azi.",
      tone: "#c98622",
      soft: "#f7ecd5",
      items: queues.today,
    },
    {
      key: "overdue",
      eyebrow: "Urgent",
      title: "Intarziate",
      copy: "Conturile unde termenul pentru next step a fost depasit.",
      empty: "Nu exista conturi intarziate acum.",
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
      label: "Next step azi",
      value: queues.today.length,
      meta: "conturi programate pentru azi",
      color: "#c98622",
      variant: "today",
      eyebrow: "Cadenta",
      target: 0,
      pct: queues.today.length > 0 ? 100 : 0,
    },
    {
      label: "Intarziate",
      value: queues.overdue.length,
      meta: "next step depasit",
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
    .filter((account) => isTrackedAccount(account))
    .filter((account) => isPipelineOpen(account.pipeline_stage));

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
    account.workers ? `<span class="execution-meta-pill">${account.workers} muncitori</span>` : "",
  ].filter(Boolean);

  const detailText = account.last_outcome ? escapeHtml(account.last_outcome) : "";

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
        <span>${account.next_step_date ? `Data next step: ${formatDate(account.next_step_date)}` : `Ultimul touch: ${formatDate(account.last_contact)}`}</span>
        <span>${account.next_step ? escapeHtml(account.next_step) : "Fara next step notat"}</span>
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

function renderPlannedActivityCell(activity, account = {}) {
  if (!activity) {
    const fallbackPlan = normalizeString(account.next_step);
    if (!fallbackPlan) {
      return `<span class="table-muted">-</span>`;
    }

    const fallbackMeta = [];
    if (account.next_step_date) {
      fallbackMeta.push(formatDate(account.next_step_date));
    }
    fallbackMeta.push("din tracking companie");

    return `
      <div class="planned-cell">
        <div class="planned-cell-title">${escapeHtml(fallbackPlan)}</div>
        <div class="company-meta">${escapeHtml(fallbackMeta.join(" · "))}</div>
      </div>
    `;
  }

  const rawOutcome = normalizeString(activity.outcome);
  const genericPlannedOutcome = rawOutcome.toLowerCase() === "planificat";
  const primary = !genericPlannedOutcome && rawOutcome
    ? rawOutcome
    : normalizeString(activity.next_step) || "Activitate planificata";

  const meta = [];

  if (activity.next_step && primary !== activity.next_step) {
    meta.push(activity.next_step);
  }

  if (activity.next_step_date) {
    meta.push(formatDate(activity.next_step_date));
  } else if (activity.date) {
    meta.push(`notat ${formatDate(activity.date)}`);
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
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
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

  if (raw.pipeline_stage !== undefined) {
    const pipelineStage = normalizePipelineStage(raw.pipeline_stage);
    if (pipelineStage) {
      payload.pipeline_stage = pipelineStage;
      shouldSync = true;
    }
  }

  return shouldSync ? payload : null;
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

function serializeCompanyPayload(record, raw = {}) {
  const payload = {
    company: record.company,
  };

  if (raw.pipeline_stage !== undefined) {
    payload.pipeline_stage = record.pipeline_stage;
  }

  if (raw.account_health !== undefined) {
    payload.account_health = record.account_health;
  }

  if (raw.workers !== undefined && raw.workers !== "") {
    payload.workers = record.workers;
  }

  if (raw.lead_date !== undefined) {
    payload.lead_date = record.lead_date ? record.lead_date.toISOString().slice(0, 10) : "";
  }

  if (raw.last_contact !== undefined) {
    payload.last_contact = record.last_contact ? record.last_contact.toISOString().slice(0, 10) : "";
  }

  if (raw.next_step !== undefined) {
    payload.next_step = record.next_step;
  }

  if (raw.next_step_date !== undefined) {
    payload.next_step_date = record.next_step_date ? record.next_step_date.toISOString().slice(0, 10) : "";
  }

  if (raw.sector !== undefined) {
    payload.sector = record.sector;
  }

  if (raw.notes !== undefined) {
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
    meetings_set: record.meetings_set,
    offers_sent: record.offers_sent,
    contracts_signed: record.contracts_signed,
    workers_signed: record.workers_signed,
    workers_delivered: record.workers_delivered,
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
