const {
  getCurrentWeekStart,
  getWeekEnd,
  toIsoDate,
} = require("./normalize");
const {
  getConnectionData,
  getScorecardData,
  getTelegramProfileData,
} = require("./airtable");

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

function addDays(isoDate = "", days = 0) {
  const safeIso = toIsoDate(isoDate);
  if (!safeIso) return "";
  const date = new Date(`${safeIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonthStart(isoDate = "") {
  const safeIso = toIsoDate(isoDate);
  return safeIso ? `${safeIso.slice(0, 7)}-01` : "";
}

async function loadTelegramData(profile = "dashboard", options = {}) {
  const timezone = process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const todayIso = getTodayIsoDate(timezone);
  const weekStart = getCurrentWeekStart(timezone);
  const weekEnd = getWeekEnd(weekStart);
  const previousWeekStart = addDays(weekStart, -7);
  const monthStart = getMonthStart(todayIso);

  if (profile === "scorecard") {
    const [connection, scorecardBundle] = await Promise.all([
      getConnectionData(options),
      getScorecardData({
        ...options,
        includeComputedVelocity: false,
      }),
    ]);

    return {
      connection,
      companies: [],
      activities: [],
      contactPriority: [],
      targets: {},
      leadMeasuresDaily: [],
      scorecard: scorecardBundle?.scorecard || {},
      scorecards: scorecardBundle?.scorecards || [],
      warnings: [],
    };
  }

  const profiles = {
    next: { companies: true, activities: true, contactPriority: true },
    today: {
      companies: true,
      activities: true,
      targets: true,
      leadMeasuresDaily: true,
      activityRange: { start: todayIso, end: todayIso },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    morning: {
      companies: true,
      activities: true,
      contactPriority: true,
      targets: true,
      leadMeasuresDaily: true,
      activityRange: { start: weekStart, end: weekEnd },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    focus: {
      companies: true,
      activities: true,
      contactPriority: true,
      targets: true,
      leadMeasuresDaily: true,
      activityRange: { start: weekStart, end: weekEnd },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    week: {
      companies: true,
      activities: true,
      targets: true,
      leadMeasuresDaily: true,
      activityRange: { start: weekStart, end: weekEnd },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    pipeline: { companies: true, activities: true, activityRange: { start: weekStart, end: weekEnd } },
    targets: {
      targets: true,
      leadMeasuresDaily: true,
      resolveActivityCompany: false,
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    a_list: { companies: true, contactPriority: true },
    evening: {
      companies: true,
      activities: true,
      targets: true,
      leadMeasuresDaily: true,
      activityRange: { start: weekStart, end: weekEnd },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    weekly_review: {
      companies: true,
      activities: true,
      targets: true,
      leadMeasuresDaily: true,
      scorecard: true,
      activityRange: { start: previousWeekStart, end: weekEnd },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    },
    intel: { companies: true, activities: true, contactPriority: true },
    targets_month: { activities: true, activityRange: { start: monthStart, end: todayIso } },
  };

  const profileSelection = profiles[profile] || {};
  if (profile === "targets") {
    return getTelegramProfileData({
      ...profileSelection,
      activities: true,
      resolveActivityCompany: false,
      activityRange: { start: monthStart, end: todayIso },
      leadMeasuresRange: { start: monthStart, end: todayIso },
    }, options);
  }

  return getTelegramProfileData(profileSelection, options);
}

module.exports = {
  loadTelegramData,
};
