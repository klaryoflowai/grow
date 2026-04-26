const { authorizeCronRequest, isDryRun } = require("./_lib/cron");
const { sendError, setNoStore } = require("./_lib/http");

function getWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
}

function getBaseUrl(request) {
  const host = request.headers.host;
  const proto = request.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

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
    const secret = getWebhookSecret();
    const baseUrl = getBaseUrl(request);
    const webhookUrl = `${baseUrl}/api/telegram-webhook`;

    if (!token) {
      response.status(500).json({ error: "Lipseste TELEGRAM_BOT_TOKEN." });
      return;
    }

    if (!secret) {
      response.status(500).json({ error: "Lipseste TELEGRAM_WEBHOOK_SECRET sau CRON_SECRET." });
      return;
    }

    if (isDryRun(auth.url)) {
      response.status(200).json({
        ok: true,
        dryRun: true,
        webhookUrl,
        secretConfigured: true,
      });
      return;
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message"],
      }),
    });
    const payload = await telegramResponse.json();

    response.status(200).json({
      ok: telegramResponse.ok,
      webhookUrl,
      telegram: payload,
    });
  } catch (error) {
    sendError(response, error);
  }
};
