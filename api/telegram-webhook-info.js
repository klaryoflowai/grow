const { authorizeCronRequest } = require("./_lib/cron");
const { sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    response.status(auth.status).json({ error: auth.message });
    return;
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      response.status(500).json({ error: "Lipseste TELEGRAM_BOT_TOKEN." });
      return;
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
    const telegramResponse = await fetch(telegramUrl);
    const payload = await telegramResponse.json();

    response.status(200).json({
      ok: telegramResponse.ok,
      telegram: payload,
    });
  } catch (error) {
    sendError(response, error);
  }
};
