const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
};

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
  "Incercam sa ajungem la decident",
  "Discutie initiata",
  "Meeting programat",
  "Meeting tinut",
  "Oferta trimisa",
  "Negociere",
  "Asteapta decizie",
  "Contract semnat",
  "Parcat",
  "Pierdut",
];

const pipelineStageRank = {
  Necontactat: 0,
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

const pipelineStageTheme = {
  Necontactat: { color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  "Incercam sa ajungem la decident": { color: "#60a5fa", bg: "rgba(96,165,250,0.16)" },
  "Discutie initiata": { color: "#38bdf8", bg: "rgba(56,189,248,0.16)" },
  "Meeting programat": { color: "#fbbf24", bg: "rgba(251,191,36,0.16)" },
  "Meeting tinut": { color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  "Oferta trimisa": { color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  Negociere: { color: "#a855f7", bg: "rgba(168,85,247,0.16)" },
  "Asteapta decizie": { color: "#c084fc", bg: "rgba(192,132,252,0.16)" },
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

const state = {
  sourceData: {
    accounts: [],
    activities: [],
  },
  manualData: loadManualData(),
  accounts: [],
  activities: [],
  search: "",
  apiEnabled: false,
  sourceMode: "fallback",
  connection: null,
  warnings: [],
  targets: loadTargets(),
};

const elements = {
  currentDate: document.getElementById("current-date"),
  dataModePill: document.getElementById("data-mode-pill"),
  summaryChip: document.getElementById("summary-chip"),
  statusMessage: document.getElementById("status-message"),
  todayGrid: document.getElementById("today-grid"),
  monthGrid: document.getElementById("month-grid"),
  conversionGrid: document.getElementById("conversion-grid"),
  dailyTrend: document.getElementById("daily-trend"),
  pipelineSummary: document.getElementById("pipeline-summary"),
  accountsTableBody: document.getElementById("accounts-table-body"),
  alertsList: document.getElementById("alerts-list"),
  activitiesFeed: document.getElementById("activities-feed"),
  companySearch: document.getElementById("company-search"),
  refreshData: document.getElementById("refresh-data"),
  exportMemory: document.getElementById("export-memory"),
  clearMemory: document.getElementById("clear-memory"),
  connectionCopy: document.getElementById("connection-copy"),
  connectionBadges: document.getElementById("connection-badges"),
  companyOptions: document.getElementById("company-options"),
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
  render();
}

function bindEvents() {
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
        state.targets = normalizeTargets(result.targets);
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
    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries());
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
        updateStatus(`Salvat in Airtable: ${record.company} -> ${activityLabel(record.activity_type)}.`);
      } catch (error) {
        updateStatus(`Airtable nu a putut salva activitatea. ${error.message}`);
        return;
      }
    } else {
      state.manualData.activities.unshift(record);
      syncManualAccountFromActivity(record);
      persistManualData();
      refreshCombinedData();
      updateStatus(`Salvat local: ${record.company} -> ${activityLabel(record.activity_type)}.`);
    }

    event.currentTarget.reset();
    setDefaultFormDates();
    render();
  });

  elements.forms.account.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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

    event.currentTarget.reset();
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

    if (payload.targets) {
      state.targets = normalizeTargets(payload.targets);
      hydrateInputs();
    } else if (!state.apiEnabled) {
      state.targets = loadTargets();
    }

    refreshCombinedData();

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

    if (!silent) {
      updateStatus(`API-ul Vercel nu raspunde inca. Dashboard-ul ruleaza pe fallback local. ${error.message}`);
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

  return [...merged.values()];
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

function normalizeRow(kind, row) {
  if (kind === "accounts") {
    return {
      company: row.company || row.name || "",
      pipeline_stage: normalizePipelineStage(row.pipeline_stage || row.pipelineStage || row.stage || row.status),
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

  const match = pipelineStageOptions.find(
    (option) => option.toLowerCase() === raw.toLowerCase()
  );
  if (match) return match;

  const fallback = {
    new: "Necontactat",
    contacted: "Discutie initiata",
    meeting: "Meeting tinut",
    offer: "Oferta trimisa",
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
    contacted: "Discutie initiata",
    meeting: "Meeting tinut",
    offer: "Oferta trimisa",
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
  return ["Oferta trimisa", "Negociere", "Asteapta decizie"].includes(normalizePipelineStage(stage));
}

function isPipelineOpen(stage = "") {
  const normalized = normalizePipelineStage(stage);
  return !["Contract semnat", "Parcat", "Pierdut"].includes(normalized);
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
}

function render() {
  elements.dataModePill.textContent = state.apiEnabled
    ? "Airtable live"
    : hasManualData()
      ? "Fallback local"
      : "Asteapta conexiunea";
  elements.summaryChip.textContent = `${state.activities.length} activitati · ${state.accounts.length} companii`;

  renderScorecards();
  renderConversions();
  renderTrend();
  renderPipeline();
  renderAlerts();
  renderActivities();
  renderConnection();
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
    { label: "Contactate", value: todayCounts.contacted, meta: "actiuni salvate azi", color: "#38bdf8" },
    { label: "Meetings", value: todayCounts.meeting, meta: "stabilite sau tinute", color: "#f59e0b" },
    { label: "Oferte", value: todayCounts.offer, meta: "trimise azi", color: "#8b5cf6" },
    { label: "Contracte", value: todayCounts.contract_signed, meta: "inchise azi", color: "#10b981" },
  ]);

  elements.monthGrid.innerHTML = buildStats([
    buildTargetCard("Contactate", monthCounts.contacted, state.targets.contacted, "#38bdf8"),
    buildTargetCard("Meetings", monthCounts.meeting, state.targets.meetings, "#f59e0b"),
    buildTargetCard("Oferte", monthCounts.offer, state.targets.offers, "#8b5cf6"),
    buildTargetCard("Contracte", monthCounts.contract_signed, state.targets.contracts, "#10b981"),
    { label: "Muncitori", value: workersWon, meta: "castigati luna asta", color: "#10b981" },
  ]);
}

function buildTargetCard(label, value, target, color) {
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  return {
    label,
    value,
    meta: `target ${target} · ${pct}%`,
    color,
  };
}

function buildStats(cards) {
  return cards
    .map(
      (card) => `
        <article class="stat-card">
          <div class="stat-label">${card.label}</div>
          <div class="stat-value" style="color:${card.color};">${card.value}</div>
          <div class="card-meta">${card.meta}</div>
        </article>
      `
    )
    .join("");
}

function renderConversions() {
  const monthlyActivities = getMonthlyActivities();
  const counts = countActivities(monthlyActivities);

  const conversions = [
    buildConversionCard("Contact -> Meeting", counts.meeting, counts.contacted),
    buildConversionCard("Meeting -> Oferta", counts.offer, counts.meeting),
    buildConversionCard("Oferta -> Contract", counts.contract_signed, counts.offer),
    buildConversionCard("Contact -> Contract", counts.contract_signed, counts.contacted),
  ];

  elements.conversionGrid.innerHTML = conversions
    .map(
      (item) => `
        <article class="conversion-card">
          <div class="conversion-title">
            <span>${item.label}</span>
            <strong>${item.rate}</strong>
          </div>
          <div class="card-meta">${item.detail}</div>
        </article>
      `
    )
    .join("");
}

function buildConversionCard(label, numerator, denominator) {
  if (!denominator) {
    return {
      label,
      rate: "-",
      detail: "Nu exista suficienta activitate in etapa anterioara.",
    };
  }

  return {
    label,
    rate: `${Math.round((numerator / denominator) * 100)}%`,
    detail: `${numerator} din ${denominator}`,
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
            ${day.contacted} contacte · ${day.meeting} meetings · ${day.offer} oferte · ${day.contract_signed} contracte
          </div>
        </article>
      `;
    })
    .join("");
}

function getLastSevenDays() {
  const rows = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const activities = state.activities.filter((activity) => isSameDay(activity.date, date));
    const counts = countActivities(activities);

    rows.push({
      label: new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(date),
      contacted: counts.contacted,
      meeting: counts.meeting,
      offer: counts.offer,
      contract_signed: counts.contract_signed,
    });
  }

  return rows;
}

function renderPipeline() {
  const activeAccounts = state.accounts
    .filter((account) => !state.search || account.company.toLowerCase().includes(state.search))
    .sort((left, right) => {
      const stageDiff = pipelineStageValueRank(right.pipeline_stage) - pipelineStageValueRank(left.pipeline_stage);
      if (stageDiff !== 0) return stageDiff;
      const leftTime = left.last_contact ? left.last_contact.getTime() : 0;
      const rightTime = right.last_contact ? right.last_contact.getTime() : 0;
      return rightTime - leftTime;
    });

  const counts = {
    active: state.accounts.filter((account) => isPipelineOpen(account.pipeline_stage)).length,
    offers: state.accounts.filter((account) => isOfferStage(account.pipeline_stage)).length,
    signed: state.accounts.filter((account) => account.pipeline_stage === "Contract semnat").length,
    parked: state.accounts.filter((account) => ["Parcat", "Pierdut"].includes(account.pipeline_stage)).length,
  };

  elements.pipelineSummary.innerHTML = `
    <div class="mini-chip">Active: ${counts.active}</div>
    <div class="mini-chip">In oferta: ${counts.offers}</div>
    <div class="mini-chip">Semnate: ${counts.signed}</div>
    <div class="mini-chip">Parcate/Pierdute: ${counts.parked}</div>
  `;

  if (!activeAccounts.length) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-card">Nu exista companii in pipeline inca. Prima activitate salvata va crea automat compania.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.accountsTableBody.innerHTML = activeAccounts
    .map((account) => {
      const pipelineStage = pipelineStageTheme[account.pipeline_stage] || pipelineStageTheme.Necontactat;
      const health = accountHealthTheme[account.account_health] || null;
      return `
        <tr>
          <td><div class="company-name">${escapeHtml(account.company)}</div></td>
          <td>
            <span class="status-pill" style="color:${pipelineStage.color}; background:${pipelineStage.bg}; border-color:${pipelineStage.color}33;">
              ${escapeHtml(account.pipeline_stage || "Necontactat")}
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
  const now = new Date();
  const staleAccounts = state.accounts
    .filter((account) => isPipelineOpen(account.pipeline_stage))
    .filter((account) => {
      if (account.next_step_date) return dayDiff(account.next_step_date, now) >= 0;
      if (!account.last_contact) return true;
      return dayDiff(account.last_contact, now) > 7;
    })
    .sort((left, right) => {
      const leftDays = left.next_step_date
        ? dayDiff(left.next_step_date, now)
        : left.last_contact ? dayDiff(left.last_contact, now) : 999;
      const rightDays = right.next_step_date
        ? dayDiff(right.next_step_date, now)
        : right.last_contact ? dayDiff(right.last_contact, now) : 999;
      return rightDays - leftDays;
    })
    .slice(0, 6);

  if (!staleAccounts.length) {
    elements.alertsList.innerHTML = `<article class="empty-card">Nu exista follow-up-uri vechi de peste 7 zile.</article>`;
    return;
  }

  elements.alertsList.innerHTML = staleAccounts
    .map((account) => `
      <article class="alert-card">
        <div class="alert-main">
          <div class="alert-title">${escapeHtml(account.company)}</div>
          <div class="activity-copy">
            ${buildAlertCopy(account, now)}
            ${account.last_outcome ? ` · ${escapeHtml(account.last_outcome)}` : ""}
            ${account.next_step ? ` · next: ${escapeHtml(account.next_step)}` : ""}
          </div>
        </div>
        <div class="alert-date">${escapeHtml(account.pipeline_stage || "-")}</div>
      </article>
    `)
    .join("");
}

function renderActivities() {
  const recent = state.activities.slice(0, 8);

  if (!recent.length) {
    elements.activitiesFeed.innerHTML = `<article class="empty-card">Nu exista activitate salvata inca.</article>`;
    return;
  }

  elements.activitiesFeed.innerHTML = recent
    .map((activity) => `
      <article class="activity-card">
        <div class="activity-main">
          <div class="activity-title">${escapeHtml(activity.company)}</div>
          <div class="activity-copy">
            ${activityLabel(activity.activity_type)}
            ${activity.outcome ? ` · ${escapeHtml(activity.outcome)}` : ""}
            ${activity.workers_delta ? ` · ${activity.workers_delta} muncitori` : ""}
            ${activity.next_step ? ` · next: ${escapeHtml(activity.next_step)}` : ""}
            ${activity.next_step_date ? ` · ${formatDate(activity.next_step_date)}` : ""}
            ${activity.notes ? ` · ${escapeHtml(activity.notes)}` : ""}
          </div>
        </div>
        <div class="activity-date">${formatDate(activity.date)}</div>
      </article>
    `)
    .join("");
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
