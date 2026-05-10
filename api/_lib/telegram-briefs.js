const {
  getCurrentWeekStart,
  getWeekEnd,
  normalizeActivity,
  normalizeString,
  toIsoDate,
  toNumber,
} = require("./normalize");
const { escapeHtml } = require("./telegram");

const CLOSED_PIPELINE_STAGES = new Set(["Necontactat", "Contract semnat", "Parcat", "Pierdut"]);
const OFFER_PIPELINE_STAGES = new Set(["Oferta", "Negociere"]);

function getTodayIsoDate(timezone = "Europe/Chisinau") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value = "") {
  const iso = toIsoDate(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(isoDate = "", days = 0) {
  const date = parseIsoDate(isoDate);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDiff(left, right) {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  if (!leftDate || !rightDate) return 0;
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((rightDate.getTime() - leftDate.getTime()) / ms);
}

function isWithinRange(isoDate = "", start = "", end = "") {
  return Boolean(isoDate && start && end && isoDate >= start && isoDate <= end);
}

function getMonthStart(isoDate = "") {
  return isoDate ? `${isoDate.slice(0, 7)}-01` : "";
}

function getMonthEnd(isoDate = "") {
  const date = parseIsoDate(isoDate);
  if (!date) return "";
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  return new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
}

function formatFullDate(isoDate = "", timezone = "Europe/Chisinau") {
  const date = parseIsoDate(isoDate) || new Date();
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(isoDate = "", timezone = "Europe/Chisinau") {
  const date = parseIsoDate(isoDate);
  if (!date) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatLocalTime(timezone = "Europe/Chisinau") {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatCount(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function withVerbAgreement(value, singular, plural) {
  return value === 1 ? singular : plural;
}

function createEmptyLeadMeasures(date = "") {
  return {
    date,
    cold_calls: 0,
    whatsapp_messages: 0,
    field_visits: 0,
    warm_outreach: 0,
    notes: "",
  };
}

function sumLeadMeasures(rows = [], start = "", end = "") {
  return rows.reduce((totals, row) => {
    const rowDate = toIsoDate(row.date);
    if (!isWithinRange(rowDate, start, end)) return totals;

    totals.cold_calls += toNumber(row.cold_calls);
    totals.whatsapp_messages += toNumber(row.whatsapp_messages);
    totals.field_visits += toNumber(row.field_visits);
    totals.warm_outreach += toNumber(row.warm_outreach);
    return totals;
  }, createEmptyLeadMeasures(start));
}

function isFieldVisitTargetDay(isoDate = "") {
  const date = parseIsoDate(isoDate);
  if (!date) return false;
  const day = date.getUTCDay();
  return day === 3 || day === 4;
}

function getFieldVisitDailyTarget(isoDate = "", targets = {}) {
  return isFieldVisitTargetDay(isoDate) ? toNumber(targets.fieldVisitsDaily) : 0;
}

function isLiveActivity(activity = {}) {
  return normalizeActivity(activity.activity_type) !== "planned";
}

function countActivities(activities = []) {
  return activities.reduce((counts, activity) => {
    const type = normalizeActivity(activity.activity_type);
    if (type === "contacted") counts.contacted += 1;
    if (type === "meeting") counts.meeting += 1;
    if (type === "offer") counts.offer += 1;
    if (type === "contract_signed") counts.contract_signed += 1;
    return counts;
  }, {
    contacted: 0,
    meeting: 0,
    offer: 0,
    contract_signed: 0,
  });
}

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function isStandbyAccount(account = {}) {
  return normalizeString(account.pipeline_stage) === "Parcat";
}

function isPipelineOpen(stage = "") {
  const normalized = normalizeString(stage);
  return Boolean(normalized) && !CLOSED_PIPELINE_STAGES.has(normalized);
}

function isTrackedAccount(account = {}) {
  return Boolean(
    normalizeString(account.pipeline_stage)
    || normalizeString(account.account_health)
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

function isOfferStage(stage = "") {
  return OFFER_PIPELINE_STAGES.has(normalizeString(stage));
}

function getAlertPriority(account = {}, todayIso = "") {
  if (isStandbyAccount(account) && account.reactivation_date) {
    const delta = dayDiff(account.reactivation_date, todayIso);
    if (delta > 0) return 320 + delta;
    if (delta === 0) return 220;
  }

  if (account.next_step_date) {
    const delta = dayDiff(account.next_step_date, todayIso);
    if (delta > 0) return 300 + delta;
    if (delta === 0) return 200;
  }

  if (!account.last_contact) return 150;
  return 100 + dayDiff(account.last_contact, todayIso);
}

function buildExecutionQueues(companies = [], todayIso = "") {
  const openTrackedAccounts = companies.filter((account) => isMovingAccount(account));
  const standbyTrackedAccounts = companies
    .filter((account) => isTrackedAccount(account))
    .filter((account) => isStandbyAccount(account));

  const overdue = [];
  const today = [];
  const stale = [];

  openTrackedAccounts.forEach((account) => {
    if (account.next_step_date) {
      const delta = dayDiff(account.next_step_date, todayIso);
      if (delta > 0) {
        overdue.push(account);
      } else if (delta === 0) {
        today.push(account);
      }
      return;
    }

    if (!account.last_contact || dayDiff(account.last_contact, todayIso) > 7) {
      stale.push(account);
    }
  });

  standbyTrackedAccounts.forEach((account) => {
    if (!account.reactivation_date) return;
    const delta = dayDiff(account.reactivation_date, todayIso);
    if (delta > 0) {
      overdue.push(account);
    } else if (delta === 0) {
      today.push(account);
    }
  });

  const all = [...overdue, ...today, ...stale].sort(
    (left, right) => getAlertPriority(right, todayIso) - getAlertPriority(left, todayIso)
  );

  return {
    overdue,
    today,
    stale,
    all,
  };
}

function buildTodayAndWeeklyMetrics(data = {}, timezone = "Europe/Chisinau") {
  const todayIso = getTodayIsoDate(timezone);
  const weekStart = getCurrentWeekStart(timezone);
  const weekEnd = getWeekEnd(todayIso);
  const monthStart = getMonthStart(todayIso);
  const monthEnd = getMonthEnd(todayIso);

  const liveActivities = (data.activities || [])
    .filter((activity) => activity.company && activity.date)
    .filter((activity) => isLiveActivity(activity));

  const todayActivities = liveActivities.filter((activity) => toIsoDate(activity.date) === todayIso);
  const weekActivities = liveActivities.filter((activity) => isWithinRange(toIsoDate(activity.date), weekStart, weekEnd));
  const monthActivities = liveActivities.filter((activity) => isWithinRange(toIsoDate(activity.date), monthStart, monthEnd));

  const firstTouchByCompany = new Map();
  liveActivities
    .slice()
    .sort((left, right) => toIsoDate(left.date).localeCompare(toIsoDate(right.date)))
    .forEach((activity) => {
      const companyKey = normalizeCompanyKey(activity.company);
      const activityDate = toIsoDate(activity.date);
      if (!companyKey || !activityDate || firstTouchByCompany.has(companyKey)) return;
      firstTouchByCompany.set(companyKey, activityDate);
    });

  const movedCompanyKeys = new Set();
  const newCompanyKeys = new Set();
  weekActivities.forEach((activity) => {
    const companyKey = normalizeCompanyKey(activity.company);
    if (!companyKey) return;
    movedCompanyKeys.add(companyKey);
    const firstTouchDate = firstTouchByCompany.get(companyKey);
    if (isWithinRange(firstTouchDate, weekStart, weekEnd)) {
      newCompanyKeys.add(companyKey);
    }
  });

  const leadMeasuresDaily = data.leadMeasuresDaily || [];
  const todayLeadMeasures = sumLeadMeasures(leadMeasuresDaily, todayIso, todayIso);
  const weekLeadMeasures = sumLeadMeasures(leadMeasuresDaily, weekStart, weekEnd);
  const monthLeadMeasures = sumLeadMeasures(leadMeasuresDaily, monthStart, monthEnd);

  return {
    todayIso,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    todayActivities,
    weekActivities,
    monthActivities,
    todayCounts: countActivities(todayActivities),
    weekCounts: countActivities(weekActivities),
    monthCounts: countActivities(monthActivities),
    todayLeadMeasures,
    weekLeadMeasures,
    monthLeadMeasures,
    movedCompanies: movedCompanyKeys.size,
    newCompanies: newCompanyKeys.size,
    followUps: Math.max(movedCompanyKeys.size - newCompanyKeys.size, 0),
    weeklyTouches: weekActivities.length,
    todayMovedCompanies: new Set(todayActivities.map((activity) => normalizeCompanyKey(activity.company))).size,
  };
}

function getDailyLeadTargetLines(metrics, targets = {}) {
  const fieldVisitTarget = getFieldVisitDailyTarget(metrics.todayIso, targets);
  return [
    {
      label: "Apel rece",
      today: toNumber(metrics.todayLeadMeasures.cold_calls),
      todayTarget: toNumber(targets.coldCallsDaily),
      week: toNumber(metrics.weekLeadMeasures.cold_calls),
      weekTarget: toNumber(targets.coldCallsWeekly),
      month: toNumber(metrics.monthLeadMeasures.cold_calls),
      monthTarget: toNumber(targets.coldCallsMonthly),
    },
    {
      label: "WhatsApp personalizat",
      today: toNumber(metrics.todayLeadMeasures.whatsapp_messages),
      todayTarget: toNumber(targets.whatsappMessagesDaily),
      week: toNumber(metrics.weekLeadMeasures.whatsapp_messages),
      weekTarget: toNumber(targets.whatsappMessagesWeekly),
      month: toNumber(metrics.monthLeadMeasures.whatsapp_messages),
      monthTarget: toNumber(targets.whatsappMessagesMonthly),
    },
    {
      label: "Vizita fizica",
      today: toNumber(metrics.todayLeadMeasures.field_visits),
      todayTarget: fieldVisitTarget,
      week: toNumber(metrics.weekLeadMeasures.field_visits),
      weekTarget: toNumber(targets.fieldVisitsWeekly),
      month: toNumber(metrics.monthLeadMeasures.field_visits),
      monthTarget: toNumber(targets.fieldVisitsMonthly),
      offDay: fieldVisitTarget === 0,
    },
    {
      label: "Warm Outreach",
      today: toNumber(metrics.todayLeadMeasures.warm_outreach),
      todayTarget: toNumber(targets.warmOutreachDaily),
      week: toNumber(metrics.weekLeadMeasures.warm_outreach),
      weekTarget: toNumber(targets.warmOutreachWeekly),
      month: toNumber(metrics.monthLeadMeasures.warm_outreach),
      monthTarget: toNumber(targets.warmOutreachMonthly),
    },
  ];
}

function buildLeadMeasureLine(line) {
  const offDayNote = line.offDay ? " · off day" : "";
  return `• ${escapeHtml(line.label)}: ${line.today}/${line.todayTarget} azi · ${line.week}/${line.weekTarget} sapt · ${line.month}/${line.monthTarget} luna${offDayNote}`;
}

function buildTargetProgressLine(label, actual, target, unit = "") {
  const suffix = unit ? ` ${unit}` : "";
  const remaining = Math.max(target - actual, 0);
  return `• ${escapeHtml(label)}: ${actual}/${target}${suffix} · raman ${remaining}${suffix}`;
}

function buildContactPriorityQueue(data = {}) {
  const contactPriority = Array.isArray(data.contactPriority) ? data.contactPriority : [];

  return contactPriority
    .filter((item) => item.company)
    .filter((item) => !item.last_contact)
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.position - right.position;
    })
    .slice(0, 5);
}

function findCompanyByContactPriorityItem(data = {}, item = {}) {
  const companies = Array.isArray(data.companies) ? data.companies : [];
  const wanted = normalizeCompanyKey(item.company);
  if (!wanted) return null;
  return companies.find((company) => normalizeCompanyKey(company.company) === wanted) || null;
}

function getContactPriorityPipelineStage(data = {}, item = {}) {
  return normalizeString(item.pipeline_stage) || normalizeString(findCompanyByContactPriorityItem(data, item)?.pipeline_stage);
}

function isUncontactedPipelineStage(stage = "") {
  const normalized = normalizeString(stage)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "necontactat" || normalized === "necontacta";
}

function buildUncontactedContactPriorityQueue(data = {}, limit = 10) {
  const contactPriority = Array.isArray(data.contactPriority) ? data.contactPriority : [];

  return contactPriority
    .filter((item) => item.company)
    .filter((item) => isUncontactedPipelineStage(getContactPriorityPipelineStage(data, item)))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.position - right.position;
    })
    .slice(0, limit);
}

function buildContactPriorityIndex(data = {}) {
  const contactPriority = Array.isArray(data.contactPriority) ? data.contactPriority : [];
  const index = contactPriority.reduce((map, item) => {
    const key = normalizeCompanyKey(item.company);
    if (key && !map.has(key)) {
      map.set(key, item);
    }
    return map;
  }, new Map());
  index.items = contactPriority;
  return index;
}

function findContactPriorityForCompany(index, companyName = "") {
  const wanted = normalizeCompanyKey(companyName);
  if (!wanted) return {};

  const exact = index.get(wanted);
  if (exact) return exact;

  return (index.items || []).find((item) => {
    const key = normalizeCompanyKey(item.company);
    return key && (key.includes(wanted) || wanted.includes(key));
  }) || {};
}

function describePriorityContact(item = {}) {
  const parts = [`• <b>${escapeHtml(item.company || "Companie fara nume")}</b>`];
  if (item.sector) parts.push(`· ${escapeHtml(item.sector)}`);
  if (item.decision_maker) parts.push(`· decident: ${escapeHtml(item.decision_maker)}`);
  if (item.mobile) parts.push(`· ${escapeHtml(item.mobile)}`);
  return parts.join(" ");
}

function buildContactParts(contact = {}) {
  const parts = [];
  if (contact.decision_maker) parts.push(`decident: ${escapeHtml(contact.decision_maker)}`);
  if (contact.mobile) parts.push(`mobil: ${escapeHtml(contact.mobile)}`);
  if (contact.contact_person) parts.push(`contact: ${escapeHtml(contact.contact_person)}`);
  if (contact.secondary_phone) parts.push(`tel 2: ${escapeHtml(contact.secondary_phone)}`);
  return parts;
}

function describeTask(account = {}, todayIso = "", contact = {}) {
  const company = escapeHtml(account.company || "Companie fara nume");
  const stage = normalizeString(account.pipeline_stage) || "Fara stadiu";
  const stagePart = stage ? ` · ${escapeHtml(stage)}` : "";
  const contactParts = buildContactParts(contact);
  const contactPart = contactParts.length ? ` · ${contactParts.join(" · ")}` : "";

  if (isStandbyAccount(account) && account.reactivation_date) {
    const delta = dayDiff(account.reactivation_date, todayIso);
    const timing = delta > 0
      ? `reactivare intarziata cu ${formatCount(delta, "zi", "zile")}`
      : delta === 0
        ? "reactivare azi"
        : `reactivare in ${formatCount(Math.abs(delta), "zi", "zile")}`;
    const action = normalizeString(account.next_step) || normalizeString(account.standby_reason) || "revino pe cont";
    return `• <b>${company}</b> — ${escapeHtml(action)} · ${escapeHtml(timing)}${stagePart}${contactPart}`;
  }

  if (account.next_step_date) {
    const delta = dayDiff(account.next_step_date, todayIso);
    const timing = delta > 0
      ? `intarziat ${formatCount(delta, "zi", "zile")}`
      : delta === 0
        ? "azi"
        : `in ${formatCount(Math.abs(delta), "zi", "zile")}`;
    const action = normalizeString(account.next_step) || "next step";
    return `• <b>${company}</b> — ${escapeHtml(action)} · ${escapeHtml(timing)}${stagePart}${contactPart}`;
  }

  if (!account.last_contact) {
    return `• <b>${company}</b> — initiaza primul touch${stagePart}${contactPart}`;
  }

  const silentDays = dayDiff(account.last_contact, todayIso);
  const action = normalizeString(account.next_step) || "revino pe cont";
  return `• <b>${company}</b> — ${escapeHtml(action)} · ${formatCount(silentDays, "zi", "zile")} fara touch${stagePart}${contactPart}`;
}

function summarizeActivity(activity = {}) {
  const company = escapeHtml(activity.company || "Companie fara nume");
  const typeLabels = {
    contacted: "Contactat",
    meeting: "Meeting",
    offer: "Oferta",
    contract_signed: "Contract semnat",
  };

  const type = normalizeActivity(activity.activity_type);
  const label = typeLabels[type] || "Activitate";
  const outcome = normalizeString(activity.outcome);
  const nextStep = normalizeString(activity.next_step);
  const bits = [`• <b>${company}</b> — ${label}`];
  if (outcome) bits.push(`· ${escapeHtml(outcome)}`);
  if (nextStep) bits.push(`· next: ${escapeHtml(nextStep)}`);
  return bits.join(" ");
}

function getTomorrowCounts(companies = [], tomorrowIso = "") {
  const list = companies.filter((account) => {
    if (normalizeString(account.pipeline_stage) === "Parcat") {
      return account.reactivation_date === tomorrowIso;
    }

    return isMovingAccount(account) && account.next_step_date === tomorrowIso;
  });

  return {
    total: list.length,
    items: list,
  };
}

function buildFocusLine(queues, metrics) {
  if (queues.overdue.length) {
    return `Curata mai intai ${formatCount(queues.overdue.length, "cont intarziat", "conturi intarziate")}, apoi intra in outreach rece.`;
  }

  if (queues.today.length) {
    return `Misca next step-urile programate azi, apoi completeaza blocul de prospectare noua.`;
  }

  if (metrics.weeklyTouches === 0) {
    return "Deschide saptamana cu primele touch-uri reale si noteaza imediat next step-ul.";
  }

  return "Pastreaza mixul sanatos: companii noi abordate plus follow-up disciplinat pe conturile calde.";
}

function buildMorningBrief(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const uncontactedPriorityQueue = buildUncontactedContactPriorityQueue(data, 10);
  const contactPriorityByCompany = buildContactPriorityIndex(data);
  const totalContactPriority = Array.isArray(data.contactPriority) ? data.contactPriority.length : 0;
  const availableContactPriority = (Array.isArray(data.contactPriority) ? data.contactPriority : [])
    .filter((item) => item.company && !item.last_contact).length;
  const topTasks = queues.all.slice(0, 5);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);

  const message = [
    "<b>Grow · Morning Brief</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Focus azi</b>",
    `• ${escapeHtml(buildFocusLine(queues, metrics))}`,
    "",
    "<b>Pipeline azi</b>",
    `• ${formatCount(queues.overdue.length, "cont intarziat", "conturi intarziate")}`,
    `• ${formatCount(queues.today.length, "cont de facut azi", "conturi de facut azi")}`,
    `• ${formatCount(queues.stale.length, "cont rece peste 7 zile", "conturi reci peste 7 zile")}`,
    "",
    "<b>A-List azi</b>",
    uncontactedPriorityQueue.length
      ? uncontactedPriorityQueue.map((item) => describePriorityContact(item)).join("\n")
      : "• Nu exista companii cu Stadiu Pipeline = Necontactat in Contact Priority.",
    "",
    "<b>Top follow-up azi</b>",
    topTasks.length
      ? topTasks
        .map((account) => describeTask(
          account,
          metrics.todayIso,
          findContactPriorityForCompany(contactPriorityByCompany, account.company)
        ))
        .join("\n")
      : "• Nu exista follow-up-uri urgente acum. Poti merge agresiv pe prospectare noua.",
    "",
    "<b>Key Lead Measures</b>",
    leadLines.map(buildLeadMeasureLine).join("\n"),
    "",
    "<b>Cadenta saptamanii</b>",
    `• ${metrics.movedCompanies} companii miscate`,
    `• ${metrics.newCompanies} companii noi`,
    `• ${metrics.followUps} follow-up`,
    `• ${metrics.weeklyTouches} touch-uri totale`,
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      aList: {
        total: totalContactPriority,
        available: availableContactPriority,
        shown: uncontactedPriorityQueue.length,
        uncontactedShown: uncontactedPriorityQueue.length,
      },
      queues: {
        overdue: queues.overdue.length,
        today: queues.today.length,
        stale: queues.stale.length,
      },
      movement: {
        moved: metrics.movedCompanies,
        newCompanies: metrics.newCompanies,
        followUps: metrics.followUps,
        touches: metrics.weeklyTouches,
      },
    },
  };
}

function buildNextCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const topTasks = queues.all.slice(0, 5);

  const message = [
    "<b>Grow · Next</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Top follow-up azi</b>",
    topTasks.length
      ? topTasks.map((account) => describeTask(account, metrics.todayIso)).join("\n")
      : "• Nu exista follow-up-uri urgente acum. Poti merge agresiv pe prospectare noua.",
    "",
    "<b>Snapshot</b>",
    `• ${formatCount(queues.overdue.length, "cont intarziat", "conturi intarziate")}`,
    `• ${formatCount(queues.today.length, "cont de facut azi", "conturi de facut azi")}`,
    `• ${formatCount(queues.stale.length, "cont rece peste 7 zile", "conturi reci peste 7 zile")}`,
    "",
    "<i>Comanda: /next</i>",
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      queues: {
        overdue: queues.overdue.length,
        today: queues.today.length,
        stale: queues.stale.length,
      },
      shown: topTasks.length,
    },
  };
}

function buildAListCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const contactPriorityQueue = buildContactPriorityQueue(data);
  const totalContactPriority = Array.isArray(data.contactPriority) ? data.contactPriority.length : 0;
  const availableContactPriority = (Array.isArray(data.contactPriority) ? data.contactPriority : [])
    .filter((item) => item.company && !item.last_contact).length;

  const message = [
    "<b>Grow · A-List</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Top 5 companii noi de contactat</b>",
    contactPriorityQueue.length
      ? contactPriorityQueue.map((item) => describePriorityContact(item)).join("\n")
      : "• Nu exista companii noi ramase in Contact Priority fara touch live.",
    "",
    "<b>Snapshot</b>",
    `• ${totalContactPriority} companii totale in Contact Priority`,
    `• ${availableContactPriority} eligibile acum pentru primul touch`,
    `• ${contactPriorityQueue.length} afisate in acest raspuns`,
    "",
    "<i>Comanda: /a-list</i>",
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      aList: {
        total: totalContactPriority,
        available: availableContactPriority,
        shown: contactPriorityQueue.length,
      },
    },
  };
}

function buildTodayCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);

  const message = [
    "<b>Grow · Today</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Ce trebuie miscat azi</b>",
    `• ${formatCount(queues.today.length, "cont de facut azi", "conturi de facut azi")}`,
    `• ${formatCount(queues.overdue.length, "cont intarziat", "conturi intarziate")}`,
    `• ${formatCount(queues.stale.length, "cont rece peste 7 zile", "conturi reci peste 7 zile")}`,
    "",
    "<b>Rezultate live azi</b>",
    `• ${formatCount(metrics.todayCounts.contacted, "contact", "contacte")}`,
    `• ${formatCount(metrics.todayCounts.meeting, "meeting", "meetings")}`,
    `• ${formatCount(metrics.todayCounts.offer, "oferta", "oferte")}`,
    `• ${formatCount(metrics.todayCounts.contract_signed, "contract", "contracte")}`,
    `• ${formatCount(metrics.todayMovedCompanies, "companie miscata", "companii miscate")}`,
    "",
    "<b>Lead measures azi</b>",
    leadLines.map(buildLeadMeasureLine).join("\n"),
    "",
    "<i>Comanda: /today</i>",
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      queues: {
        overdue: queues.overdue.length,
        today: queues.today.length,
        stale: queues.stale.length,
      },
      results: metrics.todayCounts,
      todayMovedCompanies: metrics.todayMovedCompanies,
    },
  };
}

function buildPipelineCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const trackedAccounts = (data.companies || []).filter((account) => isTrackedAccount(account));
  const activeAccounts = trackedAccounts.filter((account) => isMovingAccount(account));
  const counts = {
    active: activeAccounts.length,
    offers: trackedAccounts.filter((account) => isOfferStage(account.pipeline_stage)).length,
    signed: trackedAccounts.filter((account) => normalizeString(account.pipeline_stage) === "Contract semnat").length,
    standby: trackedAccounts.filter((account) => isStandbyAccount(account)).length,
    workersInPipeline: activeAccounts.reduce((sum, account) => sum + toNumber(account.workers), 0),
  };

  const message = [
    "<b>Grow · Pipeline</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Snapshot pipeline</b>",
    `• ${counts.active} conturi in miscare`,
    `• ${counts.offers} in oferta sau negociere`,
    `• ${counts.signed} contracte semnate`,
    `• ${counts.standby} conturi parcate`,
    `• ${counts.workersInPipeline} muncitori potentiali in pipeline`,
    "",
    "<b>Cadenta saptamanii</b>",
    `• ${metrics.movedCompanies} companii miscate`,
    `• ${metrics.newCompanies} companii noi`,
    `• ${metrics.followUps} follow-up`,
    `• ${metrics.weeklyTouches} touch-uri totale`,
    "",
    "<i>Comanda: /pipeline</i>",
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      pipeline: counts,
      movement: {
        moved: metrics.movedCompanies,
        newCompanies: metrics.newCompanies,
        followUps: metrics.followUps,
        touches: metrics.weeklyTouches,
      },
    },
  };
}

function buildScorecardCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const scorecard = data.scorecard || {};
  const weekLabel = scorecard.week_label || "Saptamana curenta";

  const message = [
    "<b>Grow · Scorecard</b>",
    `<i>${escapeHtml(weekLabel)} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Power Three</b>",
    `• Workers MTD: ${toNumber(scorecard.new_contract_workers_mtd)}`,
    `• Dream100 P1: ${toNumber(scorecard.dream100_p1_prospects)}`,
    `• Sales Velocity: ${toNumber(scorecard.sales_velocity_days) || "-"} zile`,
    "",
    "<b>Lead measures saptamana</b>",
    `• Cold Calls: ${toNumber(scorecard.cold_calls)}`,
    `• WhatsApp: ${toNumber(scorecard.linkedin_messages)}`,
    `• Field Visits: ${toNumber(scorecard.field_visits)}`,
    `• Warm Outreach: ${toNumber(scorecard.warm_outreach)}`,
    "",
    "<b>Lag measures saptamana</b>",
    `• Meetings: ${toNumber(scorecard.meetings_set)}`,
    `• Oferte: ${toNumber(scorecard.offers_sent)}`,
    `• Contracte: ${toNumber(scorecard.contracts_signed)}`,
    `• Workers Signed: ${toNumber(scorecard.workers_signed)}`,
    `• Workers Delivered: ${toNumber(scorecard.workers_delivered)}`,
    scorecard.notes ? "" : "",
    scorecard.notes ? `<b>Note</b>\n• ${escapeHtml(scorecard.notes)}` : "",
    "",
    "<i>Comanda: /scorecard</i>",
  ].filter(Boolean).join("\n");

  return {
    message,
    summary: {
      week_start: scorecard.week_start || "",
      week_label: weekLabel,
      powerThree: {
        newContractWorkersMtd: toNumber(scorecard.new_contract_workers_mtd),
        dream100P1Prospects: toNumber(scorecard.dream100_p1_prospects),
        salesVelocityDays: toNumber(scorecard.sales_velocity_days),
      },
    },
  };
}

function buildTargetsCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);

  const monthlyTargetLines = [
    buildTargetProgressLine("Contactate", metrics.monthCounts.contacted, toNumber(targets.contacted)),
    buildTargetProgressLine("Meetings", metrics.monthCounts.meeting, toNumber(targets.meetings)),
    buildTargetProgressLine("Oferte", metrics.monthCounts.offer, toNumber(targets.offers)),
    buildTargetProgressLine("Contracte", metrics.monthCounts.contract_signed, toNumber(targets.contracts)),
  ];

  const weeklyLeadTargetLines = leadLines.map((line) => (
    `• ${escapeHtml(line.label)}: ${line.week}/${line.weekTarget} sapt · ${line.month}/${line.monthTarget} luna`
  ));

  const message = [
    "<b>Grow · Targets</b>",
    `<i>${escapeHtml(metrics.monthStart.slice(0, 7))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Targete lunare comerciale</b>",
    monthlyTargetLines.join("\n"),
    "",
    "<b>Lead measures</b>",
    weeklyLeadTargetLines.join("\n"),
    "",
    "<i>Comanda: /targets</i>",
  ].join("\n");

  return {
    message,
    summary: {
      period: metrics.monthStart.slice(0, 7),
      monthly: {
        contacted: { actual: metrics.monthCounts.contacted, target: toNumber(targets.contacted) },
        meetings: { actual: metrics.monthCounts.meeting, target: toNumber(targets.meetings) },
        offers: { actual: metrics.monthCounts.offer, target: toNumber(targets.offers) },
        contracts: { actual: metrics.monthCounts.contract_signed, target: toNumber(targets.contracts) },
      },
    },
  };
}

function buildFocusCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const contactPriorityQueue = buildContactPriorityQueue(data).slice(0, 3);
  const topTasks = queues.all.slice(0, 3);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);

  const message = [
    "<b>Grow · Focus</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Focus principal</b>",
    `• ${escapeHtml(buildFocusLine(queues, metrics))}`,
    "",
    "<b>Top 3 follow-up acum</b>",
    topTasks.length
      ? topTasks.map((account) => describeTask(account, metrics.todayIso)).join("\n")
      : "• Nu exista follow-up-uri urgente acum.",
    "",
    "<b>Top 3 prospectare noua</b>",
    contactPriorityQueue.length
      ? contactPriorityQueue.map((item) => describePriorityContact(item)).join("\n")
      : "• Nu exista companii noi eligibile acum in Contact Priority.",
    "",
    "<b>Lead measures azi</b>",
    leadLines.map((line) => `• ${escapeHtml(line.label)}: ${line.today}/${line.todayTarget}`).join("\n"),
    "",
    "<i>Comanda: /focus</i>",
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      topTasks: topTasks.length,
      aListShown: contactPriorityQueue.length,
      queues: {
        overdue: queues.overdue.length,
        today: queues.today.length,
        stale: queues.stale.length,
      },
    },
  };
}

function buildWeekCommandMessage(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);

  const weeklyLeadLines = leadLines.map((line) => (
    `• ${escapeHtml(line.label)}: ${line.week}/${line.weekTarget}`
  ));

  const message = [
    "<b>Grow · Week</b>",
    `<i>${escapeHtml(metrics.weekStart)} → ${escapeHtml(metrics.weekEnd)} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Cadenta saptamanii</b>",
    `• ${metrics.movedCompanies} companii miscate`,
    `• ${metrics.newCompanies} companii noi`,
    `• ${metrics.followUps} follow-up`,
    `• ${metrics.weeklyTouches} touch-uri totale`,
    "",
    "<b>Funnel live saptamana</b>",
    `• ${formatCount(metrics.weekCounts.contacted, "contact", "contacte")}`,
    `• ${formatCount(metrics.weekCounts.meeting, "meeting", "meetings")}`,
    `• ${formatCount(metrics.weekCounts.offer, "oferta", "oferte")}`,
    `• ${formatCount(metrics.weekCounts.contract_signed, "contract", "contracte")}`,
    "",
    "<b>Lead measures saptamana</b>",
    weeklyLeadLines.join("\n"),
    "",
    "<b>Presiune pipeline</b>",
    `• ${formatCount(queues.overdue.length, "cont intarziat", "conturi intarziate")}`,
    `• ${formatCount(queues.today.length, "cont de facut azi", "conturi de facut azi")}`,
    `• ${formatCount(queues.stale.length, "cont rece peste 7 zile", "conturi reci peste 7 zile")}`,
    "",
    "<i>Comanda: /week</i>",
  ].join("\n");

  return {
    message,
    summary: {
      weekStart: metrics.weekStart,
      weekEnd: metrics.weekEnd,
      movement: {
        moved: metrics.movedCompanies,
        newCompanies: metrics.newCompanies,
        followUps: metrics.followUps,
        touches: metrics.weeklyTouches,
      },
      weekCounts: metrics.weekCounts,
    },
  };
}

function buildEveningBrief(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const metrics = buildTodayAndWeeklyMetrics(data, timezone);
  const queues = buildExecutionQueues(data.companies || [], metrics.todayIso);
  const tomorrowIso = addDays(metrics.todayIso, 1);
  const tomorrow = getTomorrowCounts(data.companies || [], tomorrowIso);
  const targets = data.targets || {};
  const leadLines = getDailyLeadTargetLines(metrics, targets);
  const recentActivities = metrics.todayActivities
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.created_at || left.date || 0).getTime();
      const rightTime = new Date(right.created_at || right.date || 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 5);

  const message = [
    "<b>Grow · Evening Review</b>",
    `<i>${escapeHtml(formatFullDate(metrics.todayIso, timezone))} · ${escapeHtml(formatLocalTime(timezone))}</i>`,
    "",
    "<b>Rezultate azi</b>",
    `• ${formatCount(metrics.todayCounts.contacted, "contact", "contacte")}`,
    `• ${formatCount(metrics.todayCounts.meeting, "meeting", "meetings")}`,
    `• ${formatCount(metrics.todayCounts.offer, "oferta", "oferte")}`,
    `• ${formatCount(metrics.todayCounts.contract_signed, "contract", "contracte")}`,
    `• ${formatCount(metrics.todayMovedCompanies, "companie miscata", "companii miscate")}`,
    "",
    "<b>Key Lead Measures</b>",
    leadLines.map(buildLeadMeasureLine).join("\n"),
    "",
    "<b>Ultimele actiuni salvate</b>",
    recentActivities.length
      ? recentActivities.map((activity) => summarizeActivity(activity)).join("\n")
      : "• Nu exista activitati live salvate astazi.",
    "",
    "<b>Atentie pentru maine</b>",
    `• ${formatCount(tomorrow.total, "cont programat", "conturi programate")} pentru ${escapeHtml(formatShortDate(tomorrowIso, timezone))}`,
    `• ${formatCount(queues.overdue.length, "intarziere", "intarzieri")} ${withVerbAgreement(queues.overdue.length, "ramane deschisa", "raman deschise")}`,
    `• ${formatCount(queues.stale.length, "cont rece peste 7 zile", "conturi reci peste 7 zile")}`,
    "",
    "<b>Cadenta saptamanii</b>",
    `• ${metrics.movedCompanies} companii miscate`,
    `• ${metrics.newCompanies} companii noi`,
    `• ${metrics.followUps} follow-up`,
    `• ${metrics.weeklyTouches} touch-uri totale`,
  ].join("\n");

  return {
    message,
    summary: {
      today: metrics.todayIso,
      results: metrics.todayCounts,
      movement: {
        moved: metrics.movedCompanies,
        newCompanies: metrics.newCompanies,
        followUps: metrics.followUps,
        touches: metrics.weeklyTouches,
      },
      tomorrow: {
        total: tomorrow.total,
      },
    },
  };
}

module.exports = {
  buildAListCommandMessage,
  buildEveningBrief,
  buildFocusCommandMessage,
  buildMorningBrief,
  buildNextCommandMessage,
  buildPipelineCommandMessage,
  buildScorecardCommandMessage,
  buildTargetsCommandMessage,
  buildTodayCommandMessage,
  buildWeekCommandMessage,
};
