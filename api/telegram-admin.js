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

async function getWebhookInfo(token) {
  const telegramUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const telegramResponse = await fetch(telegramUrl);
  const payload = await telegramResponse.json();

  return {
    ok: telegramResponse.ok,
    telegram: payload,
  };
}

async function setupWebhook({ request, token, secret, auth }) {
  const baseUrl = getBaseUrl(request);
  const webhookUrl = `${baseUrl}/api/telegram-webhook`;

  if (!secret) {
    return {
      status: 500,
      payload: { error: "Lipseste TELEGRAM_WEBHOOK_SECRET sau CRON_SECRET." },
    };
  }

  if (isDryRun(auth.url)) {
    return {
      status: 200,
      payload: {
        ok: true,
        dryRun: true,
        webhookUrl,
        secretConfigured: true,
      },
    };
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

  return {
    status: 200,
    payload: {
      ok: telegramResponse.ok,
      webhookUrl,
      telegram: payload,
    },
  };
}

function getAction(request) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const pathAction = url.pathname.split("/").filter(Boolean).pop();
  const action = url.searchParams.get("action") || pathAction;

  if (action === "setup" || action === "telegram-webhook-setup") return "setup";
  if (action === "info" || action === "telegram-webhook-info" || action === "telegram-admin") return "info";

  return "info";
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
    if (!token) {
      response.status(500).json({ error: "Lipseste TELEGRAM_BOT_TOKEN." });
      return;
    }

    const action = getAction(request);

    if (action === "setup") {
      const result = await setupWebhook({
        request,
        token,
        secret: getWebhookSecret(),
        auth,
      });
      response.status(result.status).json(result.payload);
      return;
    }

    const payload = await getWebhookInfo(token);
    response.status(200).json(payload);
  } catch (error) {
    sendError(response, error);
  }
};
