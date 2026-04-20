const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
};

const appBuild = "20260420h";

const activityTheme = {
  new: { label: "Nou", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
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
};

const dashboardPages = new Set(["overview", "scorecard", "pipeline", "execution", "settings"]);

const state = {
  sourceData: {
    accounts: [],
    activities: [],
  },
  manualData: loadManualData(),
  accounts: [],
  activities: [],
  dailyScores: [],
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
  todayGrid: document.getElementById("today-grid"),
  monthGrid: document.getElementById("month-grid"),
  conversionGrid: document.getElementById("conversion-grid"),
  dailyTrend: document.getElementById("daily-trend"),
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
  companyOptions: document.getElementById("company-options"),
  pageButtons: [...document.querySelectorAll("[data-page-target]")],
  pageSections: [...document.querySelectorAll("[data-page]")],
  saveTargets: document.getElementById("save-targets"),
  targets: {
    contacted: document.getElementById("target-contacted"),
    meetings: document.getElementById("target-meetings"),
    offers: document.getElementById("target-offers"),
    contracts: document.getElementById("target-contracts"),
  },
  forms: {
    activity: document.getElementById("activity-form"),
    account: document.getElementById("account-form"),
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
  await refreshData({ silent: true });
  state.bootstrapReady = true;
  render();
}

async function submitActivityFromRaw(raw, form) {
  if (!state.bootstrapReady) {
    updateStatus("Dashboard-ul inca se conecteaza la Airtable. Asteapta 1-2 secunde si incearca din nou.");
    return;
  }
  const resolution = resolveCompanyInput(raw.company);
  if (!resolution.ok) {
    updateStatus(resolution.message);
    return;
  }
  raw.company = resolution.company;
  const record = normalizeRow("activities", raw);
  if (!record.company || !record.date) return;

  if (state.apiEnabled) {
    try {
      await apiJson("/api/activities", {
        method: "POST",
        body: serializeActivityPayload(record),
      });
      await refreshData({ silent: true });
      updateStatus(`Salvat in Airtable: ${record.company} → ${activityLabel(record.activity_type)}.`);
    } catch (error) {
      updateStatus(`Airtable nu a putut salva activitatea. ${error.message}`);
      return;
    }
  } else {
    state.manualData.activities.unshift(record);
    syncManualAccountFromActivity(record);
    persistManualData();
    refreshCombinedData();
    updateStatus(`Salvat local: ${record.company} → ${activityLabel(record.activity_type)}.`);
  }

  if (form) {
    form.reset();
    setDefaultFormDates();
  }
  render();
}

function bindEvents() {
  elements.pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPage(button.dataset.pageTarget);
    });
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
        const result = await apiJson("/api/scorecard", {
          method: "PUT",
          body: payload,
        });
        state.targets = normalizeTargets(result.scorecard || result.targets || payload);
        refreshCombinedData();
        updateStatus("Target-urile lunare au fost salvate in Scorecard (Airtable).");
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
      mobileSheet.classList.add("is-open");
      mobileSheet.classList.remove("is-hidden");
    });

    document.getElementById("mobile-log-close")?.addEventListener("click", () => {
      mobileSheet.classList.remove("is-open");
    });

    mobileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(mobileForm);
      const raw = Object.fromEntries(formData.entries());
      raw.date = new Date().toISOString().slice(0, 10);
      await submitActivityFromRaw(raw, mobileForm);
      mobileSheet.classList.remove("is-open");
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
      `Resetez tracking-ul pentru ${company}? Vor fi golite stadiul, sanatatea contului, ultimul contact si next step-ul.`
    );

    if (!confirmed) return;

    const payload = {
      company,
      pipeline_stage: "",
      account_health: "",
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
    const payload = JSON.stringify(state.manualData, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grow-scorecard-memory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("Fallback-ul local a fost exportat.");
  });

  elements.clearMemory.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.manual);
    state.manualData = { accounts: [], activities: [] };
    refreshCombinedData();
    updateStatus("Memoria locala a fost stearsa.");
    render();
  });
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

    state.dailyScores = Array.isArray(payload.dailyScores) ? payload.dailyScores : [];

    if (payload.targets) {
      state.targets = normalizeTargets(payload.targets);
      hydrateInputs();
    } else if (!state.apiEnabled) {
      state.targets = loadTargets();
    }

    refreshCombinedData();

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
    state.sourceData = { accounts: [], activities: [] };
    state.targets = loadTargets();
    refreshCombinedData();

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

function setDefaultFormDates() {
  const today = new Date().toISOString().slice(0, 10);
  const activityDate = elements.forms.activity?.querySelector('input[name="date"]');
  const activityNextStepDate = elements.forms.activity?.querySelector('input[name="next_step_date"]');
  const accountLastContact = elements.forms.account?.querySelector('input[name="last_contact"]');
  const accountNextStepDate = elements.forms.account?.querySelector('input[name="next_step_date"]');

  if (activityDate && !activityDate.value) setDateFieldValue(activityDate, today);
  if (activityNextStepDate && !activityNextStepDate.value) setDateFieldValue(activityNextStepDate, "");
  if (accountLastContact && !accountLastContact.value) setDateFieldValue(accountLastContact, today);
  if (accountNextStepDate && !accountNextStepDate.value) setDateFieldValue(accountNextStepDate, "");
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

function loadManualData() {
  const raw = localStorage.getItem(storageKeys.manual);
  if (!raw) return { accounts: [], activities: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((row) => normalizeRow("accounts", row)) : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities.map((row) => normalizeRow("activities", row)) : [],
    };
  } catch {
    return { accounts: [], activities: [] };
  }
}

function persistManualData() {
  localStorage.setItem(storageKeys.manual, JSON.stringify(state.manualData));
}

function hasManualData() {
  return Boolean(state.manualData.accounts.length || state.manualData.activities.length);
}

function refreshCombinedData() {
  if (state.apiEnabled) {
    state.activities = [...state.sourceData.activities]
      .filter((item) => item.company || item.date)
      .sort((left, right) => {
        const leftTime = left.date ? left.date.getTime() : 0;
        const rightTime = right.date ? right.date.getTime() : 0;
        return rightTime - leftTime;
      });

    state.accounts = mergeAccounts(state.sourceData.accounts, [], state.activities);
    updateCompanyOptions();
    return;
  }

  state.activities = [...state.manualData.activities]
    .filter((item) => item.company || item.date)
    .sort((left, right) => {
      const leftTime = left.date ? left.date.getTime() : 0;
      const rightTime = right.date ? right.date.getTime() : 0;
      return rightTime - leftTime;
    });

  state.accounts = mergeAccounts([], state.manualData.accounts, state.activities);
  updateCompanyOptions();
}

function mergeAccounts(sourceAccounts, manualAccounts, activities) {
  const merged = new Map();

  [...sourceAccounts, ...manualAccounts].forEach((account) => {
    if (!account.company) return;
    merged.set(account.company.toLowerCase(), { ...account });
  });

  activities.forEach((activity) => {
    if (!activity.company) return;
    const key = activity.company.toLowerCase();
    const existing = merged.get(key) || {
      company: activity.company,
      pipeline_stage: mapActivityToPipelineStage(activity.activity_type),
      account_health: "",
      last_outcome: "",
      workers: 0,
      last_contact: null,
      next_step: "",
      next_step_date: null,
      sector: "",
      notes: "",
    };

    if (activity.date && (!existing.last_contact || activity.date > existing.last_contact)) {
      existing.last_contact = activity.date;
    }

    if (
      activity.outcome
      && (
        !existing.last_outcome
        || !existing.last_contact
        || (activity.date && activity.date >= existing.last_contact)
      )
    ) {
      existing.last_outcome = activity.outcome;
    }

    existing.pipeline_stage = mergePipelineStage(existing.pipeline_stage, activity.activity_type);

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

  const activityKeys = new Set(activities.filter((a) => a.company).map((a) => a.company.toLowerCase()));
  return [...merged.values()].filter((account) => activityKeys.has(account.company.toLowerCase()));
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
        last_contact: null,
        next_step: "",
        next_step_date: null,
        sector: "",
        notes: "",
      };

  if (activity.date && (!current.last_contact || activity.date > current.last_contact)) {
    current.last_contact = activity.date;
  }

  if (
    activity.outcome
    && (
      !current.last_outcome
      || !current.last_contact
      || (activity.date && activity.date >= current.last_contact)
    )
  ) {
    current.last_outcome = activity.outcome;
  }

  current.pipeline_stage = mergePipelineStage(current.pipeline_stage, activity.activity_type);

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
    last_contact: null,
    next_step: "",
    next_step_date: null,
  };
}

function normalizeRow(kind, row) {
  if (kind === "accounts") {
    return {
      company: row.company || row.name || "",
      pipeline_stage: normalizePipelineStage(row.pipeline_stage || row.pipelineStage || row.stage),
      account_health: normalizeAccountHealth(row.account_health || row.accountHealth || row.health),
      last_outcome: row.last_outcome || row.lastOutcome || "",
      workers: toNumber(row.workers || row.potential_volume || row.workers_requested || 0),
      last_contact: parseDate(row.last_contact || row.date),
      next_step: row.next_step || "",
      next_step_date: parseDate(row.next_step_date),
      sector: row.sector || row.industry || "",
      notes: row.notes || "",
    };
  }

  return {
    date: parseDate(row.date),
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
  if (activityTheme[key]) return key;
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

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

  const exactMatch = state.accounts.find(
    (account) => account.company && normalizeCompanyKey(account.company) === normalizeCompanyKey(trimmed)
  );
  if (exactMatch) return exactMatch.company;

  if (trimmed.length < 3) return trimmed;

  const prefixMatches = state.accounts.filter(
    (account) => account.company && account.company.toLowerCase().startsWith(trimmed.toLowerCase())
  );

  return prefixMatches.length === 1 ? prefixMatches[0].company : trimmed;
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

  const similar = state.accounts.filter((account) => {
    if (!account.company) return false;
    const company = account.company.toLowerCase();
    const query = trimmed.toLowerCase();
    return company.startsWith(query) || company.includes(query);
  });

  if (similar.length > 1) {
    const options = similar.slice(0, 5).map((account) => account.company).join(", ");
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

function updateCompanyOptions() {
  const names = [...new Set(
    state.accounts
      .map((account) => account.company)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "ro"))
  )];

  elements.companyOptions.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function updateStatus(message) {
  elements.statusMessage.textContent = message;
  if (elements.companyFormStatus) {
    elements.companyFormStatus.textContent = message;
  }
}

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, "").trim();
  return dashboardPages.has(hash) ? hash : "overview";
}

function setPage(page, options = {}) {
  const { syncHash = true } = options;
  state.page = dashboardPages.has(page) ? page : "overview";

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
  renderScorecards();
  renderConversions();
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
    <div class="hero-pacing-label">Ritm zilnic</div>
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
    ? "Baza Grow este conectata. Formularele de mai sus scriu direct in Airtable prin endpoint-urile Vercel."
    : "Pana setezi variabilele de mediu in Vercel, dashboard-ul retine local activitatile si target-urile.";

  elements.connectionBadges.innerHTML = `
    <div class="chip-wrap">${chips.join("")}</div>
    ${warnings}
  `;
}

function getTodayActivities() {
  const today = new Date();
  return state.activities.filter((activity) => isSameDay(activity.date, today));
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
        <td colspan="6">
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
      return `
        <tr>
          <td><div class="company-name">${escapeHtml(account.company)}</div></td>
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
          <td>${escapeHtml(formatNextStep(account))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAlerts() {
  const staleAccounts = getExecutionQueues().all.slice(0, 6);

  if (!staleAccounts.length) {
    elements.alertsList.innerHTML = `<article class="empty-card">Nu exista follow-up-uri urgente in acest moment.</article>`;
    return;
  }

  elements.alertsList.innerHTML = staleAccounts
    .map((account) => buildAlertCard(account))
    .join("");
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

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
