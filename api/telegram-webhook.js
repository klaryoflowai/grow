const { getDashboardData } = require("./_lib/airtable");
const { readJsonBody, sendError, setNoStore } = require("./_lib/http");
const { buildIntelligenceReport } = require("./_lib/intelligence");
const { normalizeString } = require("./_lib/normalize");
const { sendTelegramMessage } = require("./_lib/telegram");
const {
  buildAListCommandMessage,
  buildNextCommandMessage,
  buildPipelineCommandMessage,
  buildScorecardCommandMessage,
  buildTargetsCommandMessage,
  buildTodayCommandMessage,
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

function parseTelegramCommand(text = "") {
  const raw = normalizeString(text);
  if (!raw) return { type: "empty" };

  if (/^\/help(?:@\w+)?$/i.test(raw) || /^help$/i.test(raw)) {
    return { type: "help" };
  }

  if (/^\/(?:next|followup|follow-up)(?:@\w+)?$/i.test(raw) || /^(?:next|followup|follow-up)$/i.test(raw)) {
    return { type: "next" };
  }

  if (/^\/today(?:@\w+)?$/i.test(raw) || /^today$/i.test(raw)) {
    return { type: "today" };
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
    /^\/(?:a-list|alist|a_list|priority)(?:@\w+)?$/i.test(raw)
    || /^(?:a-list|alist|a_list|priority)$/i.test(raw)
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
    "• <code>/today</code> — mini brief de executie pentru ziua curenta",
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
    "• <code>/today</code>",
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
      const data = await getDashboardData();
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

    if (command.type === "next") {
      const data = await getDashboardData();
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
      const data = await getDashboardData();
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

    if (command.type === "pipeline") {
      const data = await getDashboardData();
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
      const data = await getDashboardData();
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
      const data = await getDashboardData();
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
      const data = await getDashboardData();
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
