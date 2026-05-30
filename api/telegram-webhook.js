const { createActivity } = require("./_lib/airtable");
const { loadTelegramData } = require("./_lib/telegram-data");
const { readJsonBody, sendError, setNoStore } = require("./_lib/http");
const { buildIntelligenceReport } = require("./_lib/intelligence");
const { normalizeActivity, normalizeString, toIsoDate } = require("./_lib/normalize");
const { escapeHtml, sendTelegramMessage } = require("./_lib/telegram");
const { saveVaultNote } = require("./_lib/vault-notes");
const { buildWeeklyExpertReview } = require("./_lib/weekly-review");
const {
  buildAListCommandMessage,
  buildDailyPrioritiesBrief,
  buildFocusCommandMessage,
  buildMorningBrief,
  buildNextCommandMessage,
  buildPipelineCommandMessage,
  buildScorecardCommandMessage,
  buildTargetsCommandMessage,
  buildTodayCommandMessage,
  buildWeekCommandMessage,
} = require("./_lib/telegram-briefs");

function getWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
}

function getExpectedChatId() {
  return normalizeString(process.env.TELEGRAM_CHAT_ID);
}

function isAuthorizedWebhook(request) {
  const expectedSecret = getWebhookSecret();
  if (!expectedSecret) return false;
  const actualSecret = normalizeString(request.headers["x-telegram-bot-api-secret-token"]);
  return actualSecret === expectedSecret;
}

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
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeQuickDateToken(value = "", timezone = "Europe/Chisinau") {
  const raw = normalizeString(value).toLowerCase();
  if (!raw) return "";

  const today = getTodayIsoDate(timezone);
  if (["azi", "today"].includes(raw)) return today;
  if (["maine", "mâine", "tomorrow"].includes(raw)) return addDays(today, 1);
  if (["poimaine", "poimâine"].includes(raw)) return addDays(today, 2);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dotted = raw.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (dotted) {
    const year = Number(today.slice(0, 4));
    const month = String(Number(dotted[2])).padStart(2, "0");
    const day = String(Number(dotted[1])).padStart(2, "0");
    let iso = `${year}-${month}-${day}`;
    if (iso < today) {
      iso = `${year + 1}-${month}-${day}`;
    }
    return iso;
  }

  return "";
}

function splitPipeParts(text = "") {
  return normalizeString(text)
    .split("|")
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function buildLogHelpMessage() {
  return [
    "<b>Format /log</b>",
    "• <code>/log Companie | tip | rezultat | next step | data next step | note</code>",
    "",
    "Tipuri utile:",
    "• <code>whatsapp</code>, <code>apel</code>, <code>meeting</code>, <code>oferta</code>, <code>semnat</code>",
    "",
    "Exemplu:",
    "• <code>/log GARMA-GRUP | whatsapp | Mesaj WhatsApp trimis | call followup | maine | a raspuns secretara</code>",
  ].join("\n");
}

function buildPlanHelpMessage() {
  return [
    "<b>Format /plan</b>",
    "• <code>/plan Companie | next step | data | note</code>",
    "",
    "Exemplu:",
    "• <code>/plan GARMA-GRUP | call Valentin pentru prim contact | maine | intra dupa 10:00</code>",
  ].join("\n");
}

function buildHqHelpMessage() {
  return [
    "<b>Format /hq</b>",
    "• <code>/hq done 1 | note</code> — marcheaza task HQ indeplinit",
    "• <code>/hq done all | note</code> — marcheaza toate cele 3 task-uri HQ indeplinite",
    "• <code>/hq move 2 | maine | note</code> — muta task HQ pe alta zi",
    "• <code>/hq note text</code> — adauga observatie despre implementarea HQ",
    "",
    "Exemple:",
    "• <code>/hq done 1 | CRM curatat si next step-uri setate</code>",
    "• <code>/hq move 3 | maine | nu am avut timp din cauza meetingului</code>",
    "• <code>/hq done all | toate 3 finalizate</code>",
  ].join("\n");
}

function buildNoteHelpMessage() {
  return [
    "<b>Format /note</b>",
    "• <code>/note textul notei</code> — salveaza nota in contextul Grow",
    "• <code>/note grow | textul notei</code> — context Grow / BD & Sales",
    "• <code>/note soia | textul notei</code> — context SOIA general",
    "• <code>/note founder | textul notei</code> — context Founder OS",
    "",
    "Poti folosi si tag rapid:",
    "• <code>/note #soia idee pentru Daily Brief antreprenor</code>",
    "• <code>/note #founder observatie despre energia mea azi</code>",
    "",
    "Exemple:",
    "• <code>/note Azi am observat ca obiectia principala este costul total, nu comisionul.</code>",
    "• <code>/note soia | clientii vor control de pe telefon, nu dashboard complicat</code>",
    "• <code>/note founder | dimineata functioneaza mai bine pentru prospectare decat dupa-amiaza</code>",
  ].join("\n");
}

function resolveNoteScope(rawScope = "") {
  const scope = normalizeString(rawScope)
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "_");

  const scopes = {
    grow: {
      key: "grow",
      label: "Grow",
      context: "Grow / BD & Sales",
      queuePath: "20_Projects/Grow/Inbox/Telegram-Daily-Notes-Queue.md",
      targetHint: "20_Projects/Grow",
    },
    bd: {
      key: "grow",
      label: "Grow",
      context: "Grow / BD & Sales",
      queuePath: "20_Projects/Grow/Inbox/Telegram-Daily-Notes-Queue.md",
      targetHint: "20_Projects/Grow",
    },
    sales: {
      key: "grow",
      label: "Grow",
      context: "Grow / BD & Sales",
      queuePath: "20_Projects/Grow/Inbox/Telegram-Daily-Notes-Queue.md",
      targetHint: "20_Projects/Grow",
    },
    soia: {
      key: "soia",
      label: "SOIA",
      context: "SOIA general",
      queuePath: "00_Inbox/Telegram-Daily-Notes-Queue.md",
      targetHint: "00_Inbox -> 01_Strategy / 02_Produs / 04_AI_System / 05_Operations / 06_Knowledge",
    },
    general: {
      key: "soia",
      label: "SOIA",
      context: "SOIA general",
      queuePath: "00_Inbox/Telegram-Daily-Notes-Queue.md",
      targetHint: "00_Inbox -> 01_Strategy / 02_Produs / 04_AI_System / 05_Operations / 06_Knowledge",
    },
    founder: {
      key: "founder",
      label: "Founder OS",
      context: "Founder OS",
      queuePath: "09_Founder_OS/00 - INBOX/Telegram-Daily-Notes-Queue.md",
      targetHint: "09_Founder_OS/00 - INBOX -> daily notes, reflections, principles or concepts",
    },
    founder_os: {
      key: "founder",
      label: "Founder OS",
      context: "Founder OS",
      queuePath: "09_Founder_OS/00 - INBOX/Telegram-Daily-Notes-Queue.md",
      targetHint: "09_Founder_OS/00 - INBOX -> daily notes, reflections, principles or concepts",
    },
    os: {
      key: "founder",
      label: "Founder OS",
      context: "Founder OS",
      queuePath: "09_Founder_OS/00 - INBOX/Telegram-Daily-Notes-Queue.md",
      targetHint: "09_Founder_OS/00 - INBOX -> daily notes, reflections, principles or concepts",
    },
    personal: {
      key: "founder",
      label: "Founder OS",
      context: "Founder OS",
      queuePath: "09_Founder_OS/00 - INBOX/Telegram-Daily-Notes-Queue.md",
      targetHint: "09_Founder_OS/00 - INBOX -> daily notes, reflections, principles or concepts",
    },
  };

  return scopes[scope] || scopes.grow;
}

function parseNotePayload(text = "", timezone = "Europe/Chisinau") {
  const raw = normalizeString(text);
  const match = raw.match(/^\/?note(?:@\w+)?\s*(.*)$/i)
    || raw.match(/^\/?(?:daily-note|daily_note|jurnal|journal)(?:@\w+)?\s*(.*)$/i);
  const payload = match ? normalizeString(match[1]) : raw.replace(/^(?:note|daily-note|daily_note|jurnal|journal)\s*/i, "");

  if (!payload || /^help$/i.test(payload)) {
    return { ok: false, error: buildNoteHelpMessage() };
  }

  const parts = splitPipeParts(payload);
  let scope = resolveNoteScope("grow");
  let note = payload;

  if (parts.length >= 2) {
    const maybeScope = resolveNoteScope(parts[0]);
    const firstLooksLikeScope = maybeScope.key !== "grow" || /^(?:grow|bd|sales)$/i.test(parts[0]);
    if (firstLooksLikeScope) {
      scope = maybeScope;
      note = parts.slice(1).join(" | ");
    }
  } else {
    const tagMatch = payload.match(/^#?([a-zA-Z_]+)\s+(.+)$/);
    if (tagMatch) {
      const maybeScope = resolveNoteScope(tagMatch[1]);
      const firstLooksLikeScope = maybeScope.key !== "grow" || /^(?:grow|bd|sales)$/i.test(tagMatch[1]);
      if (firstLooksLikeScope) {
        scope = maybeScope;
        note = normalizeString(tagMatch[2]);
      }
    }
  }

  note = normalizeString(note);
  if (!note) {
    return { ok: false, error: buildNoteHelpMessage() };
  }

  return {
    ok: true,
    scope,
    text: note,
    timezone,
    receivedAt: new Date().toISOString(),
  };
}

function parseLogPayload(text = "", timezone = "Europe/Chisinau") {
  const raw = normalizeString(text);
  const match = raw.match(/^\/?log(?:@\w+)?\s+(.+)$/i);
  const payload = match ? match[1] : raw.replace(/^log\s+/i, "");
  const parts = splitPipeParts(payload);

  if (parts.length < 3) {
    return { ok: false, error: buildLogHelpMessage() };
  }

  const [company, activityTypeRaw, outcome, nextStep = "", nextStepDateRaw = "", notes = ""] = parts;
  const activityType = normalizeActivity(activityTypeRaw);
  const nextStepDate = normalizeQuickDateToken(nextStepDateRaw, timezone);

  return {
    ok: Boolean(company && activityType && outcome),
    error: company && activityType && outcome ? "" : buildLogHelpMessage(),
    payload: {
      date: getTodayIsoDate(timezone),
      company,
      activity_type: activityType,
      outcome,
      next_step: nextStep,
      next_step_date: nextStepDate,
      notes,
    },
  };
}

function parsePlanPayload(text = "", timezone = "Europe/Chisinau") {
  const raw = normalizeString(text);
  const match = raw.match(/^\/?plan(?:@\w+)?\s+(.+)$/i);
  const payload = match ? match[1] : raw.replace(/^plan\s+/i, "");
  const parts = splitPipeParts(payload);

  if (parts.length < 3) {
    return { ok: false, error: buildPlanHelpMessage() };
  }

  const [company, nextStep, dateRaw, notes = ""] = parts;
  const nextStepDate = normalizeQuickDateToken(dateRaw, timezone);
  if (!nextStepDate) {
    return { ok: false, error: `${buildPlanHelpMessage()}\n\n• Data trebuie sa fie de tip <code>YYYY-MM-DD</code>, <code>DD.MM</code>, <code>azi</code>, <code>maine</code> sau <code>poimaine</code>.` };
  }

  return {
    ok: Boolean(company && nextStep && nextStepDate),
    error: company && nextStep && nextStepDate ? "" : buildPlanHelpMessage(),
    payload: {
      date: getTodayIsoDate(timezone),
      company,
      activity_type: "planned",
      outcome: "Planificat",
      next_step: nextStep,
      next_step_date: nextStepDate,
      notes,
    },
  };
}

function parseHqPayload(text = "", timezone = "Europe/Chisinau") {
  const raw = normalizeString(text);
  const match = raw.match(/^\/?hq(?:@\w+)?\s*(.*)$/i);
  const payload = match ? normalizeString(match[1]) : raw.replace(/^hq\s*/i, "");
  if (!payload || /^help$/i.test(payload)) {
    return { ok: false, error: buildHqHelpMessage() };
  }

  const parts = splitPipeParts(payload);
  const first = normalizeString(parts[0]);
  const doneMatch = first.match(/^done\s+(all|[123])$/i);
  const moveMatch = first.match(/^move\s+([123])$/i);
  const noteMatch = payload.match(/^note\s+(.+)$/i);

  if (doneMatch) {
    const task = doneMatch[1].toLowerCase();
    const note = normalizeString(parts[1]);
    return {
      ok: true,
      action: "done",
      task,
      payload: {
        date: getTodayIsoDate(timezone),
        company: "Grow HQ Implementation",
        activity_type: "planned",
        outcome: "",
        next_step: "",
        next_step_date: "",
        notes: `HQ ${task === "all" ? "all 3 tasks" : `task ${task}`} DONE${note ? ` — ${note}` : ""}`,
      },
    };
  }

  if (moveMatch) {
    const task = moveMatch[1];
    const dateRaw = normalizeString(parts[1]);
    const note = normalizeString(parts[2]);
    const nextStepDate = normalizeQuickDateToken(dateRaw, timezone);
    if (!nextStepDate) {
      return { ok: false, error: `${buildHqHelpMessage()}\n\n• Pentru move, data trebuie sa fie <code>azi</code>, <code>maine</code>, <code>poimaine</code>, <code>DD.MM</code> sau <code>YYYY-MM-DD</code>.` };
    }

    return {
      ok: true,
      action: "move",
      task,
      payload: {
        date: getTodayIsoDate(timezone),
        company: "Grow HQ Implementation",
        activity_type: "planned",
        outcome: "",
        next_step: `HQ task ${task} mutat`,
        next_step_date: nextStepDate,
        notes: `HQ task ${task} MOVED to ${nextStepDate}${note ? ` — ${note}` : ""}`,
      },
    };
  }

  if (noteMatch) {
    const note = normalizeString(noteMatch[1]);
    return {
      ok: true,
      action: "note",
      task: "",
      payload: {
        date: getTodayIsoDate(timezone),
        company: "Grow HQ Implementation",
        activity_type: "planned",
        outcome: "",
        next_step: "",
        next_step_date: "",
        notes: `HQ NOTE — ${note}`,
      },
    };
  }

  return { ok: false, error: buildHqHelpMessage() };
}

function buildSavedActivityMessage(result = {}, kind = "log") {
  const activity = result.activity || {};
  const company = normalizeString(activity.company || result.company?.company || "");
  const nextStep = normalizeString(activity.next_step);
  const nextStepDate = toIsoDate(activity.next_step_date);
  const duplicate = result.duplicate ? " (detectata ca dublura recenta)" : "";

  if (kind === "plan") {
    return [
      `<b>Plan salvat</b>${duplicate}`,
      `• ${company || "Companie"}`,
      nextStep ? `• Next step: ${nextStep}` : "",
      nextStepDate ? `• Data: ${nextStepDate}` : "",
    ].filter(Boolean).join("\n");
  }

  return [
    `<b>Activitate salvata</b>${duplicate}`,
    `• ${company || "Companie"} · ${activity.activity_type || "contacted"}`,
    activity.outcome ? `• Rezultat: ${activity.outcome}` : "",
    nextStep ? `• Next step: ${nextStep}` : "",
    nextStepDate ? `• Data next step: ${nextStepDate}` : "",
  ].filter(Boolean).join("\n");
}

function buildSavedHqMessage(result = {}, parsed = {}) {
  const taskLabel = parsed.task ? `task ${parsed.task}` : "nota";
  const nextStepDate = toIsoDate(result.activity?.next_step_date || parsed.payload?.next_step_date);
  const lines = [
    "<b>HQ update salvat</b>",
    `• Actiune: ${parsed.action || "update"} · ${taskLabel}`,
  ];
  if (nextStepDate) lines.push(`• Mutat pe: ${nextStepDate}`);
  if (parsed.payload?.notes) lines.push(`• Note: ${normalizeString(parsed.payload.notes)}`);
  lines.push("");
  lines.push("• Acest update intra in contextul de implementare HQ si review.");
  return lines.join("\n");
}

function buildSavedNoteMessage(result = {}, parsed = {}) {
  const scope = parsed.scope || resolveNoteScope("grow");
  return [
    "<b>Daily note salvata in vault</b>",
    `• Context: ${escapeHtml(scope.context)}`,
    `• Queue: <code>${escapeHtml(result.path || scope.queuePath)}</code>`,
    parsed.text ? `• Nota: ${escapeHtml(parsed.text)}` : "",
    "",
    "• Status: standby pana cand Codex proceseaza queue-ul in vault.",
  ].filter(Boolean).join("\n");
}

function buildSaveErrorMessage(error, kind = "log") {
  const title = kind === "note"
    ? "Nu am putut salva nota"
    : kind === "plan" ? "Nu am putut salva planul" : "Nu am putut salva activitatea";
  return [
    `<b>${title}</b>`,
    `• ${normalizeString(error?.message) || "A aparut o eroare neasteptata."}`,
    "",
    kind === "note" ? buildNoteHelpMessage() : kind === "plan" ? buildPlanHelpMessage() : buildLogHelpMessage(),
  ].join("\n");
}

function parseTelegramCommand(text = "") {
  const raw = normalizeString(text);
  if (!raw) return { type: "empty" };

  if (/^\/help(?:@\w+)?$/i.test(raw) || /^help$/i.test(raw)) {
    return { type: "help" };
  }

  if (/^\/log(?:@\w+)?(?:\s+.+)?$/i.test(raw) || /^log(?:\s+.+)?$/i.test(raw)) {
    return { type: "log", raw };
  }

  if (/^\/plan(?:@\w+)?(?:\s+.+)?$/i.test(raw) || /^plan(?:\s+.+)?$/i.test(raw)) {
    return { type: "plan", raw };
  }

  if (/^\/hq(?:@\w+)?(?:\s+.*)?$/i.test(raw) || /^hq(?:\s+.*)?$/i.test(raw)) {
    return { type: "hq", raw };
  }

  if (
    /^\/(?:note|daily-note|daily_note|jurnal|journal)(?:@\w+)?(?:\s+.*)?$/i.test(raw)
    || /^(?:note|daily-note|daily_note|jurnal|journal)(?:\s+.*)?$/i.test(raw)
  ) {
    return { type: "note", raw };
  }

  if (/^\/(?:next|followup|follow-up)(?:@\w+)?$/i.test(raw) || /^(?:next|followup|follow-up)$/i.test(raw)) {
    return { type: "next" };
  }

  if (/^\/today(?:@\w+)?$/i.test(raw) || /^today$/i.test(raw)) {
    return { type: "today" };
  }

  if (
    /^\/(?:morning|brief|morningbrief|morning-brief|dimineata|dimineață)(?:@\w+)?$/i.test(raw)
    || /^(?:morning|brief|morningbrief|morning-brief|dimineata|dimineață)$/i.test(raw)
  ) {
    return { type: "morning" };
  }

  if (
    /^\/(?:priorities|priority|prioritati|prioritate|top3)(?:@\w+)?$/i.test(raw)
    || /^(?:priorities|priority|prioritati|prioritate|top3)$/i.test(raw)
  ) {
    return { type: "daily_priorities" };
  }

  if (/^\/focus(?:@\w+)?$/i.test(raw) || /^focus$/i.test(raw)) {
    return { type: "focus" };
  }

  if (/^\/week(?:@\w+)?$/i.test(raw) || /^week$/i.test(raw)) {
    return { type: "week" };
  }

  if (/^\/(?:review|weeklyreview|weekly-review|board)(?:@\w+)?$/i.test(raw) || /^(?:review|weeklyreview|weekly-review|board)$/i.test(raw)) {
    return { type: "weekly_review" };
  }

  if (/^\/pipeline(?:@\w+)?$/i.test(raw) || /^pipeline$/i.test(raw)) {
    return { type: "pipeline" };
  }

  if (/^\/scorecard(?:@\w+)?$/i.test(raw) || /^scorecard$/i.test(raw)) {
    return { type: "scorecard" };
  }

  if (/^\/targets(?:@\w+)?$/i.test(raw) || /^targets$/i.test(raw)) {
    return { type: "targets" };
  }

  if (
    /^\/(?:a-list|alist|a_list)(?:@\w+)?$/i.test(raw)
    || /^(?:a-list|alist|a_list)$/i.test(raw)
  ) {
    return { type: "a_list" };
  }

  const intelLongMatch = raw.match(/^\/(?:intel\+|intelplus|research\+|skyview\+)(?:@\w+)?\s+(.+)$/i)
    || raw.match(/^(?:intel\+|intelplus|research\+|skyview\+)\s+(.+)$/i);

  if (intelLongMatch) {
    return {
      type: "intel",
      variant: "long",
      company: normalizeString(intelLongMatch[1]),
    };
  }

  const intelMatch = raw.match(/^\/(?:intel|research|skyview)(?:@\w+)?\s+(.+)$/i)
    || raw.match(/^(?:intel|research|skyview)\s+(.+)$/i);

  if (intelMatch) {
    return {
      type: "intel",
      variant: "short",
      company: normalizeString(intelMatch[1]),
    };
  }

  return { type: "unknown", raw };
}

function buildHelpMessage() {
  return [
    "<b>Grow Bot · Comenzi</b>",
    "",
    "• <code>/intel Nume Companie</code> — brief scurt, bun fix inainte de apel",
    "• <code>/intel+ Nume Companie</code> — versiune extinsa, cu mai mult context si intrebari",
    "• <code>/log</code> — salveaza rapid o activitate reala in Activities",
    "• <code>/plan</code> — salveaza rapid un next step planificat",
    "• <code>/hq done/move/note</code> — actualizeaza task-urile de implementare HQ",
    "• <code>/note</code> — salveaza daily notes pentru Grow, SOIA sau Founder OS",
    "• <code>/priorities</code> — cele 3 prioritati ale Directorului BD pentru azi",
    "• <code>/focus</code> — ce merita facut acum: follow-up + A-list + ritm azi",
    "• <code>/morning</code> — mesajul complet de dimineata",
    "• <code>/today</code> — mini brief de executie pentru ziua curenta",
    "• <code>/week</code> — snapshot operational live al saptamanii",
    "• <code>/review</code> — review saptamanal de tip board de experti",
    "• <code>/pipeline</code> — snapshot rapid al portofoliului activ",
    "• <code>/scorecard</code> — overview rapid al scorecard-ului saptamanii",
    "• <code>/targets</code> — progres fata de targetele lunare si lead measures",
    "• <code>/next</code> — top follow-up-uri urgente pentru azi",
    "• <code>/a-list</code> — top 5 companii noi prioritare pentru primul touch",
    "• <code>/help</code> — afiseaza comenzile disponibile",
    "",
    "Exemplu:",
    "• <code>/intel GARMA-GRUP</code>",
    "• <code>/intel+ GARMA-GRUP</code>",
    "• <code>/log GARMA-GRUP | whatsapp | Mesaj WhatsApp trimis | call followup | maine</code>",
    "• <code>/plan GARMA-GRUP | call Valentin | maine | dupa 10:00</code>",
    "• <code>/hq done 1 | CRM curatat</code>",
    "• <code>/hq move 2 | maine | prins in meeting client</code>",
    "• <code>/note soia | idee pentru interfata Daily Brief</code>",
    "• <code>/note founder | observatie personala despre ritmul meu de lucru</code>",
    "• <code>/priorities</code>",
    "• <code>/focus</code>",
    "• <code>/morning</code>",
    "• <code>/today</code>",
    "• <code>/week</code>",
    "• <code>/review</code>",
    "• <code>/pipeline</code>",
    "• <code>/scorecard</code>",
    "• <code>/targets</code>",
    "• <code>/next</code>",
    "• <code>/a-list</code>",
  ].join("\n");
}

module.exports = async function handler(request, response) {
  setNoStore(response);

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!isAuthorizedWebhook(request)) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const update = await readJsonBody(request);
    const message = update?.message;
    const text = normalizeString(message?.text);
    const chatId = normalizeString(message?.chat?.id);
    const expectedChatId = getExpectedChatId();

    if (!message || !text) {
      response.status(200).json({ ok: true, skipped: "no_message_text" });
      return;
    }

    if (expectedChatId && chatId !== expectedChatId) {
      response.status(200).json({ ok: true, skipped: "unexpected_chat" });
      return;
    }

    const command = parseTelegramCommand(text);

    if (command.type === "help" || command.type === "unknown" || command.type === "empty") {
      await sendTelegramMessage(buildHelpMessage(), {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({ ok: true, handled: command.type });
      return;
    }

    if (command.type === "intel") {
      const data = await loadTelegramData("intel");
      const report = await buildIntelligenceReport(data, command.company, {
        variant: command.variant || "short",
      });
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "intel",
        variant: command.variant || "short",
        found: report.found,
        company: report.context?.company || command.company,
      });
      return;
    }

    if (command.type === "log") {
      const timezone = process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
      const parsed = parseLogPayload(command.raw, timezone);
      if (!parsed.ok) {
        await sendTelegramMessage(parsed.error, {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({ ok: true, handled: "log_help" });
        return;
      }

      try {
        const result = await createActivity(parsed.payload);
        await sendTelegramMessage(buildSavedActivityMessage(result, "log"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "log",
          duplicate: Boolean(result.duplicate),
          company: result.activity?.company || result.company?.company || parsed.payload.company,
        });
      } catch (error) {
        await sendTelegramMessage(buildSaveErrorMessage(error, "log"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "log_error",
          error: normalizeString(error?.message),
        });
      }
      return;
    }

    if (command.type === "plan") {
      const timezone = process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
      const parsed = parsePlanPayload(command.raw, timezone);
      if (!parsed.ok) {
        await sendTelegramMessage(parsed.error, {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({ ok: true, handled: "plan_help" });
        return;
      }

      try {
        const result = await createActivity(parsed.payload);
        await sendTelegramMessage(buildSavedActivityMessage(result, "plan"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "plan",
          duplicate: Boolean(result.duplicate),
          company: result.activity?.company || result.company?.company || parsed.payload.company,
        });
      } catch (error) {
        await sendTelegramMessage(buildSaveErrorMessage(error, "plan"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "plan_error",
          error: normalizeString(error?.message),
        });
      }
      return;
    }

    if (command.type === "hq") {
      const timezone = process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
      const parsed = parseHqPayload(command.raw, timezone);
      if (!parsed.ok) {
        await sendTelegramMessage(parsed.error, {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({ ok: true, handled: "hq_help" });
        return;
      }

      try {
        const result = await createActivity(parsed.payload);
        await sendTelegramMessage(buildSavedHqMessage(result, parsed), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "hq",
          action: parsed.action,
          task: parsed.task,
          duplicate: Boolean(result.duplicate),
        });
      } catch (error) {
        await sendTelegramMessage(buildSaveErrorMessage(error, "plan"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "hq_error",
          error: normalizeString(error?.message),
        });
      }
      return;
    }

    if (command.type === "note") {
      const timezone = process.env.VAULT_NOTES_TIMEZONE || process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
      const parsed = parseNotePayload(command.raw, timezone);
      if (!parsed.ok) {
        await sendTelegramMessage(parsed.error, {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({ ok: true, handled: "note_help" });
        return;
      }

      try {
        const result = await saveVaultNote({
          scope: parsed.scope,
          text: parsed.text,
          timezone: parsed.timezone,
          receivedAt: parsed.receivedAt,
          telegramMessageId: message.message_id,
        });
        await sendTelegramMessage(buildSavedNoteMessage(result, parsed), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "note",
          scope: parsed.scope.key,
          path: result.path,
        });
      } catch (error) {
        await sendTelegramMessage(buildSaveErrorMessage(error, "note"), {
          chatId,
          replyToMessageId: message.message_id,
          disableNotification: true,
        });
        response.status(200).json({
          ok: true,
          handled: "note_error",
          error: normalizeString(error?.message),
        });
      }
      return;
    }

    if (command.type === "next") {
      const data = await loadTelegramData("next");
      const report = buildNextCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "next",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "today") {
      const data = await loadTelegramData("today");
      const report = buildTodayCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "today",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "morning") {
      const data = await loadTelegramData("morning");
      const report = buildMorningBrief(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "morning",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "daily_priorities") {
      const data = await loadTelegramData("priorities");
      const report = buildDailyPrioritiesBrief(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "daily_priorities",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "focus") {
      const data = await loadTelegramData("focus");
      const report = buildFocusCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "focus",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "week") {
      const data = await loadTelegramData("week");
      const report = buildWeekCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "week",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "weekly_review") {
      const data = await loadTelegramData("weekly_review");
      const review = await buildWeeklyExpertReview(data);
      await sendTelegramMessage(review.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "weekly_review",
        summary: review.summary,
      });
      return;
    }

    if (command.type === "pipeline") {
      const data = await loadTelegramData("pipeline");
      const report = buildPipelineCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "pipeline",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "scorecard") {
      const data = await loadTelegramData("scorecard");
      const report = buildScorecardCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "scorecard",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "targets") {
      const data = await loadTelegramData("targets");
      const report = buildTargetsCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "targets",
        summary: report.summary,
      });
      return;
    }

    if (command.type === "a_list") {
      const data = await loadTelegramData("a_list");
      const report = buildAListCommandMessage(data);
      await sendTelegramMessage(report.message, {
        chatId,
        replyToMessageId: message.message_id,
        disableNotification: true,
      });
      response.status(200).json({
        ok: true,
        handled: "a_list",
        summary: report.summary,
      });
      return;
    }

    response.status(200).json({ ok: true, skipped: "unhandled" });
  } catch (error) {
    sendError(response, error);
  }
};
