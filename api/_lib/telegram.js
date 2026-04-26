function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendTelegramMessage(message, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Lipsesc TELEGRAM_BOT_TOKEN sau TELEGRAM_CHAT_ID.");
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: Boolean(options.disableNotification),
      reply_to_message_id: options.replyToMessageId || undefined,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram API error: ${details}`);
  }

  return response.json();
}

module.exports = {
  escapeHtml,
  isTelegramConfigured,
  sendTelegramMessage,
};
