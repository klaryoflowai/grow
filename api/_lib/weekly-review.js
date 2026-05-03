const fs = require("fs");
const path = require("path");
const { buildWeekLabel, getCurrentWeekStart, getWeekEnd, normalizeActivity, normalizeString, toIsoDate, toNumber } = require("./normalize");
const { escapeHtml } = require("./telegram");

const BOARD_ROLES = [
  "Sales Strategy Advisor",
  "4DX Execution Coach",
  "RevOps / Pipeline Analyst",
  "Dream 100 Prospecting Coach",
  "Customer Success / Delivery Risk Advisor",
];

const WIG_2026 = {
  annual: "De la 0 la 35 contracte active cu minim 15 workers per contract pana la 31 decembrie 2026.",
  q2Rock: "5 contracte active pana la 30 iunie 2026.",
  quarterlyRocks: [
    { quarter: "Q2", contracts: 5 },
    { quarter: "Q3", contracts: 13 },
    { quarter: "Q4", contracts: 17 },
  ],
  leadMeasures: {
    dream100P1ContactedWeekly: 20,
    meetingsHeldWeekly: 5,
    followUpWithin24h: 100,
  },
};

const VAULT_CONTEXT_FILES = [
  "00_STRATEGY/00-Strategy Map.md",
  "00_STRATEGY/02-ICP and Scalability Filter.md",
  "00_STRATEGY/Books/4 Disciplines of Execution - Notes.md",
  "00_STRATEGY/Books/Scaling Up - Notes.md",
  "30_DASHBOARDS/00-Sales Command Center.md",
  "30_DASHBOARDS/01-Weekly Scorecard.md",
  "30_DASHBOARDS/02-Monthly Scorecard.md",
];

function getVaultRoot() {
  return path.resolve(__dirname, "..", "..");
}

function readVaultContext() {
  const root = getVaultRoot();
  return VAULT_CONTEXT_FILES.map((relativePath) => {
    const filePath = path.join(root, relativePath);
    try {
      const body = fs.readFileSync(filePath, "utf8");
      return `# ${relativePath}\n${body.slice(0, 5000)}`;
    } catch (error) {
      return `# ${relativePath}\n[unavailable: ${error.message}]`;
    }
  }).join("\n\n---\n\n");
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

function dayDiff(left = "", right = "") {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  if (!leftDate || !rightDate) return 0;
  return Math.floor((rightDate.getTime() - leftDate.getTime()) / (1000 * 60 * 60 * 24));
}

function isWithinRange(isoDate = "", start = "", end = "") {
  return Boolean(isoDate && start && end && isoDate >= start && isoDate <= end);
}

function normalizeCompanyKey(value = "") {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getLocalDateParts(timezone = "Europe/Chisinau") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return {
    weekday: part("weekday"),
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
}

function isFridayAtSix(timezone = "Europe/Chisinau") {
  const parts = getLocalDateParts(timezone);
  return parts.weekday === "Fri" && parts.hour === 18;
}

function countActivities(activities = []) {
  return activities.reduce((counts, activity) => {
    const type = normalizeActivity(activity.activity_type);
    if (type === "contacted") counts.contacted += 1;
    if (type === "meeting") counts.meetings += 1;
    if (type === "offer") counts.offers += 1;
    if (type === "contract_signed") counts.contracts += 1;
    return counts;
  }, {
    contacted: 0,
    meetings: 0,
    offers: 0,
    contracts: 0,
  });
}

function sumLeadMeasures(rows = [], start = "", end = "") {
  return rows.reduce((totals, row) => {
    if (!isWithinRange(toIsoDate(row.date), start, end)) return totals;
    totals.cold_calls += toNumber(row.cold_calls);
    totals.whatsapp_messages += toNumber(row.whatsapp_messages);
    totals.field_visits += toNumber(row.field_visits);
    totals.warm_outreach += toNumber(row.warm_outreach);
    return totals;
  }, {
    cold_calls: 0,
    whatsapp_messages: 0,
    field_visits: 0,
    warm_outreach: 0,
  });
}

function scorePercent(actual, target) {
  if (!target) return actual ? 100 : 0;
  return Math.round((actual / target) * 100);
}

function buildPipelineSummary(companies = []) {
  const stages = companies.reduce((counts, company) => {
    const stage = normalizeString(company.pipeline_stage) || "Fara stadiu";
    counts[stage] = (counts[stage] || 0) + 1;
    return counts;
  }, {});

  const health = companies.reduce((counts, company) => {
    const value = normalizeString(company.account_health) || "Fara health";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

  return { stages, health };
}

function findFollowUpRisks(companies = [], todayIso = "") {
  return companies
    .filter((company) => normalizeString(company.pipeline_stage) !== "Contract semnat")
    .filter((company) => normalizeString(company.pipeline_stage) !== "Pierdut")
    .map((company) => {
      const overdueDays = company.next_step_date ? dayDiff(company.next_step_date, todayIso) : 0;
      const staleDays = company.last_contact ? dayDiff(company.last_contact, todayIso) : 999;
      return {
        company: company.company,
        pipeline_stage: company.pipeline_stage,
        next_step: company.next_step,
        next_step_date: company.next_step_date,
        overdue_days: Math.max(overdueDays, 0),
        stale_days: Math.max(staleDays, 0),
      };
    })
    .filter((company) => company.overdue_days > 0 || company.stale_days >= 7)
    .sort((left, right) => (right.overdue_days - left.overdue_days) || (right.stale_days - left.stale_days))
    .slice(0, 10);
}

function getRecentNotes(activities = [], start = "", end = "") {
  return activities
    .filter((activity) => isWithinRange(toIsoDate(activity.date), start, end))
    .filter((activity) => normalizeString(activity.notes) || normalizeString(activity.outcome))
    .sort((left, right) => `${right.date}|${right.created_at}`.localeCompare(`${left.date}|${left.created_at}`))
    .slice(0, 18)
    .map((activity) => ({
      date: activity.date,
      company: activity.company,
      type: activity.activity_type,
      outcome: activity.outcome,
      notes: activity.notes,
      next_step: activity.next_step,
      next_step_date: activity.next_step_date,
    }));
}

function getRecentStatusChanges(companies = [], activities = [], start = "", end = "") {
  const explicitStageChanges = companies
    .filter((company) => isWithinRange(toIsoDate(company.stage_changed_date), start, end))
    .map((company) => ({
      date: company.stage_changed_date,
      company: company.company,
      source: "Companies.Data Schimbare Stadiu",
      pipeline_stage: company.pipeline_stage,
      account_health: company.account_health,
      workers: company.workers,
      next_step: company.next_step,
      next_step_date: company.next_step_date,
      notes: company.notes,
    }));

  const activityStageChanges = activities
    .filter((activity) => isWithinRange(toIsoDate(activity.date), start, end))
    .filter((activity) => ["meeting", "offer", "contract_signed"].includes(normalizeActivity(activity.activity_type)))
    .map((activity) => ({
      date: activity.date,
      company: activity.company,
      source: "Activities",
      activity_type: activity.activity_type,
      outcome: activity.outcome,
      workers_delta: activity.workers_delta,
      next_step: activity.next_step,
      next_step_date: activity.next_step_date,
      notes: activity.notes,
    }));

  return [...explicitStageChanges, ...activityStageChanges]
    .sort((left, right) => `${right.date}|${right.company}`.localeCompare(`${left.date}|${left.company}`))
    .slice(0, 20);
}

function buildWeeklyReviewInput(data = {}) {
  const timezone = data.connection?.timezone || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
  const todayIso = getLocalDateParts(timezone).date;
  const weekStart = getCurrentWeekStart(timezone);
  const weekEnd = getWeekEnd(weekStart);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekEnd, -7);
  const companies = Array.isArray(data.companies) ? data.companies : [];
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const weeklyActivities = activities.filter((activity) => isWithinRange(toIsoDate(activity.date), weekStart, weekEnd));
  const previousActivities = activities.filter((activity) => isWithinRange(toIsoDate(activity.date), previousWeekStart, previousWeekEnd));
  const weeklyCounts = countActivities(weeklyActivities);
  const previousCounts = countActivities(previousActivities);
  const movedCompanyKeys = new Set(weeklyActivities.map((activity) => normalizeCompanyKey(activity.company)).filter(Boolean));
  const leadMeasures = sumLeadMeasures(data.leadMeasuresDaily || [], weekStart, weekEnd);
  const scorecard = data.scorecard || {};
  const targets = data.targets || {};
  const pipeline = buildPipelineSummary(companies);
  const risks = findFollowUpRisks(companies, todayIso);

  return {
    generated_at: new Date().toISOString(),
    timezone,
    week: {
      start: weekStart,
      end: weekEnd,
      label: buildWeekLabel(weekStart, weekEnd),
    },
    wig_2026: WIG_2026,
    metrics: {
      activities: weeklyCounts,
      previous_activities: previousCounts,
      moved_companies: movedCompanyKeys.size,
      scorecard: {
        dream100_p1_prospects: toNumber(scorecard.dream100_p1_prospects),
        meetings_set: toNumber(scorecard.meetings_set),
        offers_sent: toNumber(scorecard.offers_sent),
        contracts_signed: toNumber(scorecard.contracts_signed),
        workers_signed: toNumber(scorecard.workers_signed),
        workers_delivered: toNumber(scorecard.workers_delivered),
        cold_calls: toNumber(scorecard.cold_calls),
        whatsapp_messages: toNumber(scorecard.linkedin_messages),
        field_visits: toNumber(scorecard.field_visits),
        warm_outreach: toNumber(scorecard.warm_outreach),
        notes: normalizeString(scorecard.notes),
      },
      lead_measures_daily: leadMeasures,
      targets: {
        dream100_p1_contacted_weekly: WIG_2026.leadMeasures.dream100P1ContactedWeekly,
        meetings_held_weekly: WIG_2026.leadMeasures.meetingsHeldWeekly,
        follow_up_24h_percent: WIG_2026.leadMeasures.followUpWithin24h,
        moved_companies_weekly: toNumber(targets.movedCompaniesWeekly),
        cold_calls_weekly: toNumber(targets.coldCallsWeekly),
        whatsapp_messages_weekly: toNumber(targets.whatsappMessagesWeekly),
        field_visits_weekly: toNumber(targets.fieldVisitsWeekly),
        warm_outreach_weekly: toNumber(targets.warmOutreachWeekly),
      },
      target_attainment: {
        dream100_p1_contacted: scorePercent(toNumber(scorecard.dream100_p1_prospects), WIG_2026.leadMeasures.dream100P1ContactedWeekly),
        meetings: scorePercent(weeklyCounts.meetings || toNumber(scorecard.meetings_set), WIG_2026.leadMeasures.meetingsHeldWeekly),
        contracts_q2_rock: scorePercent(toNumber(scorecard.contracts_signed), WIG_2026.quarterlyRocks[0].contracts),
      },
    },
    pipeline,
    follow_up_risks: risks,
    recent_meeting_and_activity_context: getRecentNotes(activities, weekStart, weekEnd),
    recent_status_and_stage_changes: getRecentStatusChanges(companies, activities, weekStart, weekEnd),
    warnings: data.warnings || [],
    vault_context: readVaultContext(),
  };
}

function formatFallbackReview(input = {}) {
  const metrics = input.metrics || {};
  const activities = metrics.activities || {};
  const scorecard = metrics.scorecard || {};
  const risks = input.follow_up_risks || [];
  const lead = metrics.lead_measures_daily || {};
  const targets = metrics.targets || {};
  const lines = [
    "<b>Grow · Weekly Expert Board Review</b>",
    `<i>${escapeHtml(input.week?.label || "")}</i>`,
    "",
    "<b>Verdict</b>",
    activities.contracts > 0
      ? `• Ai produs ${activities.contracts} contract(e) saptamana asta. Urmatorul risc este consistenta lead measures.`
      : "• Nu exista contracte salvate saptamana asta. Focusul trebuie sa ramana pe conversia P1 -> meeting -> oferta.",
    "",
    "<b>Scoreboard</b>",
    `• Dream 100 P1: ${scorecard.dream100_p1_prospects}/${targets.dream100_p1_contacted_weekly}`,
    `• Meetings: ${activities.meetings || scorecard.meetings_set}/${targets.meetings_held_weekly}`,
    `• Oferte: ${activities.offers || scorecard.offers_sent}`,
    `• Contracte: ${activities.contracts || scorecard.contracts_signed}`,
    `• Workers semnati: ${scorecard.workers_signed}`,
    "",
    "<b>Lead Measures</b>",
    `• Calls: ${lead.cold_calls}/${targets.cold_calls_weekly || "-"}`,
    `• WhatsApp: ${lead.whatsapp_messages}/${targets.whatsapp_messages_weekly || "-"}`,
    `• Field visits: ${lead.field_visits}/${targets.field_visits_weekly || "-"}`,
    `• Warm outreach: ${lead.warm_outreach}/${targets.warm_outreach_weekly || "-"}`,
    "",
    "<b>Unde trebuie mai strict</b>",
    risks.length
      ? `• ${risks.length} conturi au follow-up intarziat sau sunt reci peste 7 zile. Inchide aceste bucle inainte de prospectare noua.`
      : "• Nu apar follow-up-uri critice restante in datele curente.",
    scorecard.dream100_p1_prospects < targets.dream100_p1_contacted_weekly
      ? "• Volumul P1 este sub tinta. Blocheaza sloturi zilnice de prospectare, fara exceptii."
      : "• Volumul P1 este pe directie buna. Urmatorul nivel este calitatea conversatiei si next step-ul ferm.",
    "",
    "<b>Cum crestem vanzarile</b>",
    "• Prioritizeaza companiile care pot absorbi echipe recurente, nu plasari izolate.",
    "• Construieste abordarea pe deficit de forta de munca + viteza de livrare + reducerea riscului operational.",
    "• Cauta semnale clare: recrutari active, crestere operationala, santiere/proiecte noi, sezonalitate si pozitii greu de acoperit local.",
    "",
    "<b>Abordari pentru clienti noi</b>",
    "• Pentru Construction: mesaj despre continuitate pe santier si reducerea intarzierilor cauzate de lipsa muncitorilor.",
    "• Pentru Retail: mesaj despre stabilitate operationala, rotatie mica si acoperirea turelor.",
    "• Pentru Manufacturing/Industry: mesaj despre echipe stabile, predictibilitate si cost de oprire a productiei.",
    "",
    "<b>Commitments recomandate pentru saptamana viitoare</b>",
    "• Alege 20 P1 inainte de luni 10:00 si lucreaza lista fara schimbari tactice zilnice.",
    "• Fiecare meeting trebuie sa se termine cu next step, data, responsabil si volum estimat de workers.",
    "• Revizuieste vineri toate conturile cu next_step_date lipsa.",
  ];

  return lines.join("\n");
}

function toTelegramHtml(text = "") {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/^# (.+)$/gm, "<b>$1</b>")
    .replace(/^## (.+)$/gm, "\n<b>$1</b>")
    .replace(/^- /gm, "• ");
}

function trimTelegramMessage(message = "") {
  const limit = 3900;
  if (message.length <= limit) return message;
  return `${message.slice(0, limit - 80).trim()}\n\n<i>Review scurtat pentru limita Telegram.</i>`;
}

async function callOpenAiWeeklyReview(input = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  const model = process.env.OPENAI_WEEKLY_REVIEW_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const system = [
    "You are an expert board reviewing a Director of Sales weekly execution for Grow.md.",
    "Write in Romanian, direct and practical.",
    "Use the board perspectives: Sales Strategy, 4DX Execution, RevOps, Dream 100 Prospecting, Customer Success/Delivery Risk.",
    "Do not invent data. If data is missing, say what is missing and how to log it next week.",
    "Keep the Telegram message under 3600 characters.",
    "Use HTML-safe plain structure: short title lines and bullet points. No markdown tables.",
  ].join(" ");

  const user = [
    "Generate the weekly expert board review using this context.",
    "Required sections:",
    "1. Verdict",
    "2. Results vs WIG/Rocks",
    "3. What improved",
    "4. Where discipline must be stricter",
    "5. How to grow sales next week",
    "6. New client approach recommendations",
    "7. Expert board recommendations",
    "8. Three commitments for next week",
    "",
    "In sections 5 and 6, answer concretely:",
    "- which type of accounts/sectors should be approached now and why",
    "- what message angle should be used",
    "- where to tighten the sales motion to create more meetings, offers and signed contracts",
    "- what should be stopped because it does not help the 2026 WIG",
    "",
    JSON.stringify(input, null, 2).slice(0, 60000),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI weekly review error: ${details}`);
  }

  const payload = await response.json();
  return normalizeString(payload?.choices?.[0]?.message?.content);
}

async function buildWeeklyExpertReview(data = {}) {
  const input = buildWeeklyReviewInput(data);
  let llmReview = "";
  let llmError = "";

  try {
    llmReview = await callOpenAiWeeklyReview(input);
  } catch (error) {
    llmError = normalizeString(error?.message) || "OpenAI weekly review failed.";
  }

  const message = llmReview
    ? trimTelegramMessage(toTelegramHtml(llmReview))
    : formatFallbackReview(input);

  return {
    message,
    summary: {
      week: input.week,
      usedLlm: Boolean(llmReview),
      activities: input.metrics.activities,
      scorecard: input.metrics.scorecard,
      followUpRisks: input.follow_up_risks.length,
      warnings: llmError ? [...input.warnings, llmError] : input.warnings,
    },
    input,
  };
}

module.exports = {
  buildWeeklyExpertReview,
  buildWeeklyReviewInput,
  isFridayAtSix,
};
