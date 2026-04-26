const { getDashboardData } = require("./_lib/airtable");
const { readJsonBody, sendError, setNoStore } = require("./_lib/http");
const { buildIntelligenceReport } = require("./_lib/intelligence");
const { normalizeString } = require("./_lib/normalize");
const { sendTelegramMessage } = require("./_lib/telegram");

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
    "• <code>/help</code> — afiseaza comenzile disponibile",
    "",
    "Exemplu:",
    "• <code>/intel GARMA-GRUP</code>",
    "• <code>/intel+ GARMA-GRUP</code>",
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

    response.status(200).json({ ok: true, skipped: "unhandled" });
  } catch (error) {
    sendError(response, error);
  }
};
