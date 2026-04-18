const defaultTargets = {
  leads: 40,
  meetings: 12,
  contracts: 4,
  workers: 100,
};

const statusTheme = {
  new: { label: "Nou", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  contacted: { label: "Contactat", color: "#38bdf8", bg: "rgba(56,189,248,0.16)" },
  meeting: { label: "Intalnire", color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  offer: { label: "Oferta", color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  contract_review: { label: "Contract review", color: "#f97316", bg: "rgba(249,115,22,0.16)" },
  signed: { label: "Semnat", color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  lost: { label: "Pierdut", color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
};

const activityAliases = {
  lead_new: "lead_new",
  new_lead: "lead_new",
  first_contact: "lead_new",
  contacted: "contacted",
  live_contact: "contacted",
  call: "contacted",
  call_live: "contacted",
  meeting_booked: "meeting",
  meeting_held: "meeting",
  meeting: "meeting",
  proposal_sent: "proposal",
  offer_sent: "proposal",
  contract_signed: "contract_signed",
  signed: "contract_signed",
  arrival: "arrival",
  worker_arrived: "arrival",
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
    artifacts: [],
  },
  manualData: loadManualData(),
  accounts: [],
  activities: [],
  artifacts: [],
  search: "",
  sourceMode: "empty",
  targets: loadTargets(),
};

const elements = {
  currentDate: document.getElementById("current-date"),
  dataModePill: document.getElementById("data-mode-pill"),
  statusMessage: document.getElementById("status-message"),
  accountsCount: document.getElementById("accounts-count"),
  activitiesCount: document.getElementById("activities-count"),
  artifactsCount: document.getElementById("artifacts-count"),
  kpiGrid: document.getElementById("kpi-grid"),
  funnelView: document.getElementById("funnel-view"),
  weeklyChart: document.getElementById("weekly-chart"),
  insightsList: document.getElementById("insights-list"),
  accountsTableBody: document.getElementById("accounts-table-body"),
  alertsList: document.getElementById("alerts-list"),
  activitiesFeed: document.getElementById("activities-feed"),
  artifactsGrid: document.getElementById("artifacts-grid"),
  companySearch: document.getElementById("company-search"),
  saveTargets: document.getElementById("save-targets"),
  clearSources: document.getElementById("clear-sources"),
  saveSources: document.getElementById("save-sources"),
  exportMemory: document.getElementById("export-memory"),
  clearMemory: document.getElementById("clear-memory"),
  targets: {
    leads: document.getElementById("target-leads"),
    meetings: document.getElementById("target-meetings"),
    contracts: document.getElementById("target-contracts"),
    workers: document.getElementById("target-workers"),
  },
  urls: {
    accounts: document.getElementById("accounts-url"),
    activities: document.getElementById("activities-url"),
    artifacts: document.getElementById("artifacts-url"),
  },
  files: {
    accounts: document.getElementById("accounts-file"),
    activities: document.getElementById("activities-file"),
    artifacts: document.getElementById("artifacts-file"),
  },
  forms: {
    activity: document.getElementById("activity-form"),
    account: document.getElementById("account-form"),
    artifact: document.getElementById("artifact-form"),
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
      leads: toNumber(elements.targets.leads.value),
      meetings: toNumber(elements.targets.meetings.value),
      contracts: toNumber(elements.targets.contracts.value),
      workers: toNumber(elements.targets.workers.value),
    };
    localStorage.setItem(storageKeys.targets, JSON.stringify(state.targets));
    render();
  });

  elements.companySearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderAccounts();
  });

  elements.clearSources.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.sources);
    Object.values(elements.urls).forEach((input) => {
      input.value = "";
    });
    Object.values(elements.files).forEach((input) => {
      input.value = "";
    });
    state.sourceData = {
      accounts: [],
      activities: [],
      artifacts: [],
    };
    state.sourceMode = "empty";
    refreshCombinedData();
    updateStatus(
      hasManualData()
        ? "Sursele externe au fost scoase. Dashboard-ul ruleaza acum doar pe memoria locala."
        : "Sursele externe au fost scoase."
    );
    render();
  });

  elements.saveSources.addEventListener("click", async () => {
    const sources = {
      accounts: elements.urls.accounts.value.trim(),
      activities: elements.urls.activities.value.trim(),
      artifacts: elements.urls.artifacts.value.trim(),
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
    state.manualData.activities.unshift(record);
    persistManualData();
    refreshCombinedData();
    updateStatus(`Activitatea pentru ${record.company || "companie"} a fost salvata in memoria locala.`);
    event.currentTarget.reset();
    setDefaultFormDates();
    render();
  });

  elements.forms.account.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const record = normalizeRow("accounts", Object.fromEntries(formData.entries()));
    const key = record.company.toLowerCase();
    const existingIndex = state.manualData.accounts.findIndex((item) => item.company.toLowerCase() === key);

    if (existingIndex >= 0) {
      state.manualData.accounts[existingIndex] = record;
    } else {
      state.manualData.accounts.unshift(record);
    }

    persistManualData();
    refreshCombinedData();
    updateStatus(`Contul ${record.company || "nou"} a fost salvat si memorat local.`);
    event.currentTarget.reset();
    setDefaultFormDates();
    render();
  });

  elements.forms.artifact.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const record = normalizeRow("artifacts", Object.fromEntries(formData.entries()));
    const key = record.title.toLowerCase();
    const existingIndex = state.manualData.artifacts.findIndex((item) => item.title.toLowerCase() === key);

    if (existingIndex >= 0) {
      state.manualData.artifacts[existingIndex] = record;
    } else {
      state.manualData.artifacts.unshift(record);
    }

    persistManualData();
    refreshCombinedData();
    updateStatus(`Artifact-ul ${record.title || "nou"} a fost salvat in memoria locala.`);
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
    link.download = `grow-dashboard-memory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("Memoria locala a fost exportata ca fisier JSON.");
  });

  elements.clearMemory.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.manual);
    state.manualData = {
      accounts: [],
      activities: [],
      artifacts: [],
    };
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
        : "Conecteaza surse live, incarca fisiere CSV locale sau foloseste formularele de captura zilnica."
    );
    render();
    return;
  }

  const sources = JSON.parse(raw);
  elements.urls.accounts.value = sources.accounts || "";
  elements.urls.activities.value = sources.activities || "";
  elements.urls.artifacts.value = sources.artifacts || "";

  try {
    await loadRemoteSources(sources);
  } catch (error) {
    updateStatus(`Sursele salvate nu au putut fi incarcate. ${error.message}`);
    render();
  }
}

async function loadRemoteSources(sources) {
  const loaders = Object.entries(sources)
    .map(async ([key, url]) => {
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
    updateStatus("Nu exista URL-uri salvate. Foloseste upload local sau configureaza surse live.");
    render();
    return;
  }

  await Promise.all(loaders);
  state.sourceMode = "remote";
  refreshCombinedData();
  updateStatus("Datele reale au fost incarcate din surse live si combinate cu memoria locala.");
  render();
}

function hydrateInputs() {
  elements.targets.leads.value = state.targets.leads;
  elements.targets.meetings.value = state.targets.meetings;
  elements.targets.contracts.value = state.targets.contracts;
  elements.targets.workers.value = state.targets.workers;
}

function setDefaultFormDates() {
  const today = new Date().toISOString().slice(0, 10);
  const activityDate = elements.forms.activity?.querySelector('input[name="date"]');
  const accountLastContact = elements.forms.account?.querySelector('input[name="last_contact"]');
  const artifactUpdatedAt = elements.forms.artifact?.querySelector('input[name="updated_at"]');

  if (activityDate && !activityDate.value) activityDate.value = today;
  if (artifactUpdatedAt && !artifactUpdatedAt.value) artifactUpdatedAt.value = today;
  if (accountLastContact && !accountLastContact.value) accountLastContact.value = today;
}

function loadTargets() {
  const raw = localStorage.getItem(storageKeys.targets);
  if (!raw) return { ...defaultTargets };
  try {
    return { ...defaultTargets, ...JSON.parse(raw) };
  } catch {
    return { ...defaultTargets };
  }
}

function loadManualData() {
  const raw = localStorage.getItem(storageKeys.manual);
  if (!raw) {
    return { accounts: [], activities: [], artifacts: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((row) => normalizeRow("accounts", row)) : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities.map((row) => normalizeRow("activities", row)) : [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts.map((row) => normalizeRow("artifacts", row)) : [],
    };
  } catch {
    return { accounts: [], activities: [], artifacts: [] };
  }
}

function persistManualData() {
  localStorage.setItem(storageKeys.manual, JSON.stringify(state.manualData));
}

function hasManualData() {
  return Boolean(
    state.manualData.accounts.length || state.manualData.activities.length || state.manualData.artifacts.length
  );
}

function refreshCombinedData() {
  state.accounts = mergeAccounts(state.sourceData.accounts, state.manualData.accounts);
  state.activities = [...state.sourceData.activities, ...state.manualData.activities]
    .filter((item) => item.company || item.date)
    .sort((left, right) => {
      const leftTime = left.date ? left.date.getTime() : 0;
      const rightTime = right.date ? right.date.getTime() : 0;
      return rightTime - leftTime;
    });
  state.artifacts = mergeArtifacts(state.sourceData.artifacts, state.manualData.artifacts);
}

function mergeAccounts(sourceAccounts, manualAccounts) {
  const merged = new Map();

  [...sourceAccounts, ...manualAccounts].forEach((account) => {
    if (!account.company) return;
    merged.set(account.company.toLowerCase(), account);
  });

  return [...merged.values()];
}

function mergeArtifacts(sourceArtifacts, manualArtifacts) {
  const merged = new Map();

  [...sourceArtifacts, ...manualArtifacts].forEach((artifact) => {
    if (!artifact.title) return;
    merged.set(artifact.title.toLowerCase(), artifact);
  });

  return [...merged.values()];
}

function normalizeRow(kind, row) {
  if (kind === "accounts") {
    return {
      company: row.company || row.name || "",
      sector: row.sector || row.industry || "",
      priority: toNumber(row.priority || row.tier || 0),
      status: normalizeStatus(row.status),
      workers: toNumber(row.workers || row.potential_volume || row.workers_requested || 0),
      owner: row.owner || "",
      last_contact: parseDate(row.last_contact),
      next_step: row.next_step || "",
      next_step_date: parseDate(row.next_step_date),
      signed_date: parseDate(row.signed_date),
      arrival_date: parseDate(row.arrival_date),
      notes: row.notes || "",
    };
  }

  if (kind === "activities") {
    return {
      date: parseDate(row.date),
      company: row.company || row.account || "",
      activity_type: normalizeActivity(row.activity_type || row.type || ""),
      channel: row.channel || "",
      notes: row.notes || row.summary || "",
      workers_delta: toNumber(row.workers_delta || row.workers || 0),
      contract_value: toNumber(row.contract_value || row.value || 0),
    };
  }

  return {
    title: row.title || row.name || "",
    category: row.category || "artifact",
    status: row.status || "draft",
    owner: row.owner || "",
    updated_at: parseDate(row.updated_at || row.date),
    url: row.url || row.link || "",
    notes: row.notes || "",
  };
}

function normalizeStatus(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  return statusTheme[key] ? key : "new";
}

function normalizeActivity(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  return activityAliases[key] || key || "unknown";
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

function updateStatus(message) {
  elements.statusMessage.textContent = message;
}

function render() {
  elements.accountsCount.textContent = String(state.accounts.length);
  elements.activitiesCount.textContent = String(state.activities.length);
  elements.artifactsCount.textContent = String(state.artifacts.length);

  const dataMode = state.sourceMode === "remote"
    ? "Conectat la date live"
    : state.sourceMode === "upload"
      ? "Date incarcate local"
      : "Fara sursa conectata";
  const manualSummary = state.manualData.accounts.length + state.manualData.activities.length + state.manualData.artifacts.length;
  elements.dataModePill.textContent = manualSummary ? `${dataMode} + memorie locala` : dataMode;

  renderKpis();
  renderFunnel();
  renderWeekly();
  renderInsights();
  renderAccounts();
  renderAlerts();
  renderActivities();
  renderArtifacts();
}

function getMonthlyActivities() {
  const now = new Date();
  return state.activities.filter((activity) => {
    if (!activity.date) return false;
    return activity.date.getFullYear() === now.getFullYear() && activity.date.getMonth() === now.getMonth();
  });
}

function computeKpis() {
  const monthlyActivities = getMonthlyActivities();
  const monthlyContracts = monthlyActivities.filter((item) => item.activity_type === "contract_signed");

  const leads = monthlyActivities.filter((item) => item.activity_type === "lead_new").length;
  const meetings = monthlyActivities.filter((item) => item.activity_type === "meeting").length;
  const contracts = monthlyContracts.length;

  let workers = monthlyContracts.reduce((sum, item) => sum + item.workers_delta, 0);
  if (!workers) {
    workers = state.accounts
      .filter((account) => account.status === "signed")
      .reduce((sum, account) => sum + account.workers, 0);
  }

  return {
    leads,
    meetings,
    contracts,
    workers,
  };
}

function renderKpis() {
  const metrics = computeKpis();
  const cards = [
    { key: "leads", label: "Lead-uri noi", icon: "Leads", color: "#38bdf8" },
    { key: "meetings", label: "Intalniri", icon: "Meet", color: "#f59e0b" },
    { key: "contracts", label: "Contracte semnate", icon: "Sign", color: "#8b5cf6" },
    { key: "workers", label: "Muncitori castigati", icon: "Crew", color: "#10b981" },
  ];

  elements.kpiGrid.innerHTML = cards
    .map((card) => {
      const value = metrics[card.key] || 0;
      const target = state.targets[card.key] || 0;
      const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 999) : 0;
      const barPct = Math.min(pct, 100);

      return `
        <article class="kpi-card">
          <div class="kpi-head">
            <span class="kpi-icon">${card.icon}</span>
            <span class="badge" style="color:${card.color}; border-color:${card.color}33; background:${card.color}1a;">target ${target}</span>
          </div>
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${card.label}</div>
          <div class="progress-meta">
            <span>progres lunar</span>
            <strong style="color:${card.color};">${pct}%</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${barPct}%; background:linear-gradient(90deg, ${card.color}88, ${card.color});"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderFunnel() {
  const metrics = computeKpis();
  const contactedAccounts = state.accounts.filter((account) =>
    ["contacted", "meeting", "offer", "contract_review", "signed"].includes(account.status)
  ).length;
  const meetingAccounts = state.accounts.filter((account) =>
    ["meeting", "offer", "contract_review", "signed"].includes(account.status)
  ).length;
  const offerAccounts = state.accounts.filter((account) =>
    ["offer", "contract_review", "signed"].includes(account.status)
  ).length;

  const steps = [
    { label: "Lead-uri noi", value: metrics.leads, color: "#38bdf8" },
    { label: "Contacte active", value: contactedAccounts, color: "#0ea5e9" },
    { label: "Intalniri", value: Math.max(metrics.meetings, meetingAccounts), color: "#f59e0b" },
    { label: "Oferte", value: offerAccounts, color: "#8b5cf6" },
    { label: "Contracte", value: metrics.contracts, color: "#10b981" },
  ];

  const max = Math.max(...steps.map((step) => step.value), 1);

  elements.funnelView.innerHTML = steps
    .map((step) => {
      const pct = Math.max((step.value / max) * 100, 8);
      return `
        <div class="funnel-step">
          <div class="funnel-label-row">
            <span>${step.label}</span>
            <strong>${step.value}</strong>
          </div>
          <div class="funnel-bar">
            <div class="funnel-fill" style="width:${pct}%; background:linear-gradient(90deg, ${step.color}66, ${step.color});"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWeekly() {
  const monthlyActivities = getMonthlyActivities();
  const weeklyBuckets = {};
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totalWeeks = Math.ceil(daysInMonth / 7);

  for (let index = 0; index < totalWeeks; index += 1) {
    weeklyBuckets[`S${index + 1}`] = { label: `S${index + 1}`, leads: 0, meetings: 0, contracts: 0 };
  }

  monthlyActivities.forEach((activity) => {
    if (!activity.date) return;
    const weekIndex = Math.floor((activity.date.getDate() - 1) / 7) + 1;
    const bucket = weeklyBuckets[`S${weekIndex}`];
    if (!bucket) return;

    if (activity.activity_type === "lead_new") bucket.leads += 1;
    if (activity.activity_type === "meeting") bucket.meetings += 1;
    if (activity.activity_type === "contract_signed") bucket.contracts += 1;
  });

  const series = Object.values(weeklyBuckets);
  const maxValue = Math.max(...series.flatMap((item) => [item.leads, item.meetings, item.contracts]), 1);

  elements.weeklyChart.innerHTML = series
    .map((item) => {
      const leadsHeight = Math.max((item.leads / maxValue) * 160, item.leads ? 12 : 4);
      const meetingsHeight = Math.max((item.meetings / maxValue) * 160, item.meetings ? 12 : 4);
      const contractsHeight = Math.max((item.contracts / maxValue) * 160, item.contracts ? 12 : 4);

      return `
        <div class="weekly-column">
          <div class="weekly-bars">
            <div class="weekly-bar" style="height:${leadsHeight}px; background:linear-gradient(180deg, #38bdf8, #2563eb);"></div>
            <div class="weekly-bar" style="height:${meetingsHeight}px; background:linear-gradient(180deg, #fbbf24, #f59e0b);"></div>
            <div class="weekly-bar" style="height:${contractsHeight}px; background:linear-gradient(180deg, #34d399, #10b981);"></div>
          </div>
          <div class="weekly-meta">
            <span>${item.label}</span>
            <span>${item.leads}/${item.meetings}/${item.contracts}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInsights() {
  const metrics = computeKpis();
  const convRate = metrics.leads > 0 ? metrics.contracts / metrics.leads : 0;
  const liveContacts = getMonthlyActivities().filter((activity) =>
    ["contacted", "meeting"].includes(activity.activity_type)
  ).length;

  const insights = [
    {
      title: "Lead -> Contract",
      copy: metrics.leads
        ? `Conversia curenta este ${Math.round(convRate * 100)}%. Daca ramane asa, ai nevoie de aproximativ ${Math.max(Math.ceil(state.targets.contracts / Math.max(convRate, 0.01)), metrics.leads)} lead-uri pentru targetul lunar.`
        : "Nu exista suficiente activitati de tip lead_new pentru a calcula conversia.",
    },
    {
      title: "Activitate live",
      copy: `${liveContacts} interactiuni de tip contact sau meeting au fost inregistrate in luna curenta.`,
    },
    {
      title: "Pipeline",
      copy: `${state.accounts.filter((account) => ["meeting", "offer", "contract_review"].includes(account.status)).length} companii sunt in zona calda a pipeline-ului.`,
    },
  ];

  elements.insightsList.innerHTML = insights
    .map(
      (insight) => `
        <article class="insight-card">
          <div class="insight-title">${insight.title}</div>
          <div class="artifact-copy">${insight.copy}</div>
        </article>
      `
    )
    .join("");
}

function renderAccounts() {
  const filtered = state.accounts
    .filter((account) => !state.search || account.company.toLowerCase().includes(state.search))
    .sort((left, right) => {
      const leftPriority = left.priority || 99;
      const rightPriority = right.priority || 99;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.company.localeCompare(right.company);
    });

  if (!filtered.length) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-card">Nu exista inca linii in accounts.csv. Poti totusi incepe imediat din formularele de captura zilnica.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.accountsTableBody.innerHTML = filtered
    .map((account) => {
      const status = statusTheme[account.status] || statusTheme.new;
      return `
        <tr>
          <td>
            <div class="company-name">${account.company || "-"}</div>
          </td>
          <td>${account.sector || "-"}</td>
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
  const stale = state.accounts
    .filter((account) => account.priority === 1)
    .filter((account) => {
      if (!account.last_contact) return true;
      const diff = Math.floor((now - account.last_contact) / (1000 * 60 * 60 * 24));
      return diff > 7;
    })
    .slice(0, 6);

  if (!stale.length) {
    elements.alertsList.innerHTML = `<div class="empty-card">Nu exista urgente P1 sau nu avem date suficiente inca.</div>`;
    return;
  }

  elements.alertsList.innerHTML = stale
    .map((account) => {
      const age = account.last_contact
        ? `${Math.floor((now - account.last_contact) / (1000 * 60 * 60 * 24))} zile fara contact`
        : "fara ultim contact";
      return `
        <article class="alert-card">
          <div class="insight-title">${account.company}</div>
          <div class="artifact-copy">${age}. Next step: ${account.next_step || "nesetat"}.</div>
        </article>
      `;
    })
    .join("");
}

function renderActivities() {
  const recent = [...state.activities]
    .filter((activity) => activity.date)
    .sort((left, right) => right.date - left.date)
    .slice(0, 8);

  if (!recent.length) {
    elements.activitiesFeed.innerHTML = `<div class="empty-card">Nu exista activitati reale inca. Adauga prima activitate din formularul de sus.</div>`;
    return;
  }

  elements.activitiesFeed.innerHTML = recent
    .map((activity) => `
      <article class="activity-card">
        <div class="activity-main">
          <strong>${activity.company || "Companie necunoscuta"}</strong>
          <span class="activity-subline">${activity.activity_type}${activity.channel ? ` · ${activity.channel}` : ""}${activity.notes ? ` · ${activity.notes}` : ""}</span>
        </div>
        <div class="activity-date">${formatDate(activity.date)}</div>
      </article>
    `)
    .join("");
}

function renderArtifacts() {
  if (!state.artifacts.length) {
    elements.artifactsGrid.innerHTML = `
      <article class="empty-card">
        In acest spatiu vom adauga playbook-uri, oferte, SOP-uri, call scripts, scorecard reviews si alte artifacts.
      </article>
    `;
    return;
  }

  elements.artifactsGrid.innerHTML = state.artifacts
    .sort((left, right) => {
      const leftTime = left.updated_at ? left.updated_at.getTime() : 0;
      const rightTime = right.updated_at ? right.updated_at.getTime() : 0;
      return rightTime - leftTime;
    })
    .map((artifact) => `
      <article class="artifact-card">
        <span class="badge">${artifact.category}</span>
        <div class="artifact-title">${artifact.title}</div>
        <div class="artifact-copy">${artifact.notes || "Fara descriere suplimentara."}</div>
        <div class="artifact-meta">
          <span>${artifact.status}</span>
          <span>${formatDate(artifact.updated_at)}</span>
        </div>
        ${artifact.url ? `<a class="artifact-link" href="${artifact.url}" target="_blank" rel="noreferrer">Deschide artifact</a>` : ""}
      </article>
    `)
    .join("");
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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
