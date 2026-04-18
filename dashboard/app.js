const defaultTargets = {
  contacted: 40,
  meetings: 12,
  offers: 6,
  contracts: 4,
};

const statusTheme = {
  new: { label: "Nou", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  contacted: { label: "Contactat", color: "#38bdf8", bg: "rgba(56,189,248,0.16)" },
  meeting: { label: "Meeting", color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  offer: { label: "Oferta", color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  contract_signed: { label: "Contract", color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  lost: { label: "Pierdut", color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
};

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
  sources: "grow_dashboard_sources",
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
  sourceMode: "empty",
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
  saveTargets: document.getElementById("save-targets"),
  clearSources: document.getElementById("clear-sources"),
  saveSources: document.getElementById("save-sources"),
  exportMemory: document.getElementById("export-memory"),
  clearMemory: document.getElementById("clear-memory"),
  targets: {
    contacted: document.getElementById("target-contacted"),
    meetings: document.getElementById("target-meetings"),
    offers: document.getElementById("target-offers"),
    contracts: document.getElementById("target-contracts"),
  },
  urls: {
    accounts: document.getElementById("accounts-url"),
    activities: document.getElementById("activities-url"),
  },
  files: {
    accounts: document.getElementById("accounts-file"),
    activities: document.getElementById("activities-file"),
  },
  forms: {
    activity: document.getElementById("activity-form"),
    account: document.getElementById("account-form"),
  },
};

init();

function init() {
  elements.currentDate.textContent = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  hydrateInputs();
  setDefaultFormDates();
  refreshCombinedData();
  bindEvents();
  loadSavedSources();
  render();
}

function bindEvents() {
  elements.saveTargets.addEventListener("click", () => {
    state.targets = {
      contacted: toNumber(elements.targets.contacted.value),
      meetings: toNumber(elements.targets.meetings.value),
      offers: toNumber(elements.targets.offers.value),
      contracts: toNumber(elements.targets.contracts.value),
    };
    localStorage.setItem(storageKeys.targets, JSON.stringify(state.targets));
    updateStatus("Target-urile lunare au fost salvate.");
    render();
  });

  elements.companySearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderPipeline();
  });

  elements.clearSources.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.sources);
    Object.values(elements.urls).forEach((input) => {
      input.value = "";
    });
    Object.values(elements.files).forEach((input) => {
      input.value = "";
    });
    state.sourceData = { accounts: [], activities: [] };
    state.sourceMode = "empty";
    refreshCombinedData();
    updateStatus(
      hasManualData()
        ? "Sursele externe au fost scoase. Dashboard-ul ruleaza acum pe memoria locala."
        : "Sursele externe au fost scoase."
    );
    render();
  });

  elements.saveSources.addEventListener("click", async () => {
    const sources = {
      accounts: elements.urls.accounts.value.trim(),
      activities: elements.urls.activities.value.trim(),
    };

    localStorage.setItem(storageKeys.sources, JSON.stringify(sources));

    try {
      await loadRemoteSources(sources);
    } catch (error) {
      updateStatus(`Nu am putut incarca toate sursele live. ${error.message}`);
      render();
    }
  });

  Object.entries(elements.files).forEach(([key, input]) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      state.sourceData[key] = parseCsv(text).map((row) => normalizeRow(key, row));
      state.sourceMode = "upload";
      refreshCombinedData();
      updateStatus("Datele au fost incarcate din fisiere locale.");
      render();
    });
  });

  elements.forms.activity.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const record = normalizeRow("activities", Object.fromEntries(formData.entries()));
    if (!record.company || !record.date) return;

    state.manualData.activities.unshift(record);
    syncManualAccountFromActivity(record);
    persistManualData();
    refreshCombinedData();
    updateStatus(`Salvat: ${record.company} -> ${activityLabel(record.activity_type)}.`);
    event.currentTarget.reset();
    setDefaultFormDates();
    render();
  });

  elements.forms.account.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const record = normalizeRow("accounts", Object.fromEntries(formData.entries()));
    if (!record.company) return;

    upsertManualAccount(record);
    persistManualData();
    refreshCombinedData();
    updateStatus(`Compania ${record.company} a fost actualizata.`);
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
    updateStatus("Memoria locala a fost exportata.");
  });

  elements.clearMemory.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.manual);
    state.manualData = { accounts: [], activities: [] };
    refreshCombinedData();
    updateStatus("Memoria locala a fost stearsa.");
    render();
  });
}

async function loadSavedSources() {
  const raw = localStorage.getItem(storageKeys.sources);
  if (!raw) {
    updateStatus(
      hasManualData()
        ? "Nu exista surse live salvate. Dashboard-ul foloseste memoria locala."
        : "Poti incepe direct din formularul de sus sau poti conecta doua CSV-uri: accounts si activities."
    );
    render();
    return;
  }

  const sources = JSON.parse(raw);
  elements.urls.accounts.value = sources.accounts || "";
  elements.urls.activities.value = sources.activities || "";

  try {
    await loadRemoteSources(sources);
  } catch (error) {
    updateStatus(`Sursele salvate nu au putut fi incarcate. ${error.message}`);
    render();
  }
}

async function loadRemoteSources(sources) {
  const loaders = Object.entries(sources).map(async ([key, url]) => {
    if (!url) {
      state.sourceData[key] = [];
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sursa ${key} a raspuns cu ${response.status}.`);
    }

    const text = await response.text();
    state.sourceData[key] = parseCsv(text).map((row) => normalizeRow(key, row));
  });

  if (!Object.values(sources).some(Boolean)) {
    updateStatus("Nu exista URL-uri salvate. Foloseste upload local sau configureaza sursele live.");
    render();
    return;
  }

  await Promise.all(loaders);
  state.sourceMode = "remote";
  refreshCombinedData();
  updateStatus("Datele live au fost incarcate si combinate cu memoria locala.");
  render();
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
  const accountLastContact = elements.forms.account?.querySelector('input[name="last_contact"]');

  if (activityDate && !activityDate.value) activityDate.value = today;
  if (accountLastContact && !accountLastContact.value) accountLastContact.value = today;
}

function loadTargets() {
  const raw = localStorage.getItem(storageKeys.targets);
  if (!raw) return { ...defaultTargets };

  try {
    const parsed = JSON.parse(raw);
    return {
      contacted: parsed.contacted ?? parsed.leads ?? defaultTargets.contacted,
      meetings: parsed.meetings ?? defaultTargets.meetings,
      offers: parsed.offers ?? defaultTargets.offers,
      contracts: parsed.contracts ?? defaultTargets.contracts,
    };
  } catch {
    return { ...defaultTargets };
  }
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
  state.activities = [...state.sourceData.activities, ...state.manualData.activities]
    .filter((item) => item.company || item.date)
    .sort((left, right) => {
      const leftTime = left.date ? left.date.getTime() : 0;
      const rightTime = right.date ? right.date.getTime() : 0;
      return rightTime - leftTime;
    });

  state.accounts = mergeAccounts(state.sourceData.accounts, state.manualData.accounts, state.activities);
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
      status: "contacted",
      workers: 0,
      last_contact: null,
      next_step: "",
      sector: "",
      notes: "",
    };

    if (activity.date && (!existing.last_contact || activity.date > existing.last_contact)) {
      existing.last_contact = activity.date;
    }

    if (stageRank(activity.activity_type) > stageRank(existing.status)) {
      existing.status = activity.activity_type;
    }

    if (activity.activity_type === "contract_signed" && activity.workers_delta > existing.workers) {
      existing.workers = activity.workers_delta;
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
        status: "contacted",
        workers: 0,
        last_contact: null,
        next_step: "",
        sector: "",
        notes: "",
      };

  if (activity.date && (!current.last_contact || activity.date > current.last_contact)) {
    current.last_contact = activity.date;
  }

  if (stageRank(activity.activity_type) > stageRank(current.status)) {
    current.status = activity.activity_type;
  }

  if (activity.activity_type === "contract_signed" && activity.workers_delta > current.workers) {
    current.workers = activity.workers_delta;
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
      status: normalizeStatus(row.status || row.stage || row.activity_type),
      workers: toNumber(row.workers || row.potential_volume || row.workers_requested || 0),
      last_contact: parseDate(row.last_contact || row.date),
      next_step: row.next_step || "",
      sector: row.sector || row.industry || "",
      notes: row.notes || "",
    };
  }

  return {
    date: parseDate(row.date),
    company: row.company || row.account || "",
    activity_type: normalizeActivity(row.activity_type || row.type || row.status),
    workers_delta: toNumber(row.workers_delta || row.workers || 0),
    notes: row.notes || row.summary || "",
  };
}

function normalizeStatus(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "signed") return "contract_signed";
  if (key === "proposal" || key === "proposal_sent" || key === "offer_sent" || key === "contract_review") {
    return "offer";
  }
  if (statusTheme[key]) return key;
  return key ? "contacted" : "new";
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

function updateStatus(message) {
  elements.statusMessage.textContent = message;
}

function render() {
  const dataMode = state.sourceMode === "remote"
    ? "Date live + memorie locala"
    : state.sourceMode === "upload"
      ? "CSV local + memorie locala"
      : hasManualData()
        ? "Memorie locala"
        : "Fara sursa conectata";

  elements.dataModePill.textContent = dataMode;
  elements.summaryChip.textContent = `${state.activities.length} activitati · ${state.accounts.length} companii`;

  renderScorecards();
  renderConversions();
  renderTrend();
  renderPipeline();
  renderAlerts();
  renderActivities();
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
      const stageDiff = stageRank(right.status) - stageRank(left.status);
      if (stageDiff !== 0) return stageDiff;
      const leftTime = left.last_contact ? left.last_contact.getTime() : 0;
      const rightTime = right.last_contact ? right.last_contact.getTime() : 0;
      return rightTime - leftTime;
    });

  const counts = {
    contacted: state.accounts.filter((account) => account.status === "contacted").length,
    meeting: state.accounts.filter((account) => account.status === "meeting").length,
    offer: state.accounts.filter((account) => account.status === "offer").length,
    contract_signed: state.accounts.filter((account) => account.status === "contract_signed").length,
  };

  elements.pipelineSummary.innerHTML = `
    <div class="mini-chip">Contactate: ${counts.contacted}</div>
    <div class="mini-chip">Meetings: ${counts.meeting}</div>
    <div class="mini-chip">Oferte: ${counts.offer}</div>
    <div class="mini-chip">Contracte: ${counts.contract_signed}</div>
  `;

  if (!activeAccounts.length) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-card">Nu exista companii in pipeline inca. Prima activitate salvata va crea automat compania.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.accountsTableBody.innerHTML = activeAccounts
    .map((account) => {
      const status = statusTheme[account.status] || statusTheme.new;
      return `
        <tr>
          <td><div class="company-name">${account.company}</div></td>
          <td>
            <span class="status-pill" style="color:${status.color}; background:${status.bg}; border-color:${status.color}33;">
              ${status.label}
            </span>
          </td>
          <td>${account.workers || 0}</td>
          <td>${formatDate(account.last_contact)}</td>
          <td>${account.next_step || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAlerts() {
  const now = new Date();
  const staleAccounts = state.accounts
    .filter((account) => !["contract_signed", "lost"].includes(account.status))
    .filter((account) => {
      if (!account.last_contact) return true;
      return dayDiff(account.last_contact, now) > 7;
    })
    .sort((left, right) => {
      const leftDays = left.last_contact ? dayDiff(left.last_contact, now) : 999;
      const rightDays = right.last_contact ? dayDiff(right.last_contact, now) : 999;
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
          <div class="alert-title">${account.company}</div>
          <div class="activity-copy">
            ${account.last_contact ? `${dayDiff(account.last_contact, now)} zile fara touch` : "fara touch salvat"}
            ${account.next_step ? ` · next: ${account.next_step}` : ""}
          </div>
        </div>
        <div class="alert-date">${statusLabel(account.status)}</div>
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
          <div class="activity-title">${activity.company}</div>
          <div class="activity-copy">
            ${activityLabel(activity.activity_type)}
            ${activity.workers_delta ? ` · ${activity.workers_delta} muncitori` : ""}
            ${activity.notes ? ` · ${activity.notes}` : ""}
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
  const status = statusTheme[type] || statusTheme.new;
  return status.label;
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

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (!rows.length) return [];

  const [headerRow, ...dataRows] = rows.filter((item) => item.some((cell) => cell.trim().length));
  const headers = headerRow.map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));

  return dataRows.map((dataRow) => {
    const record = {};
    headers.forEach((header, columnIndex) => {
      record[header] = (dataRow[columnIndex] || "").trim();
    });
    return record;
  });
}
