const { authorizeCronRequest, isDryRun } = require("./_lib/cron");
const { sendError, setNoStore } = require("./_lib/http");
const { loadTelegramData } = require("./_lib/telegram-data");
const { buildDailyPrioritiesBrief, buildMorningBrief } = require("./_lib/telegram-briefs");
const { isTelegramConfigured, sendTelegramMessage } = require("./_lib/telegram");

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
    const data = await loadTelegramData("morning");
    const mode = String(auth.url.searchParams.get("mode") || "").trim().toLowerCase();
    const briefing = mode === "priorities"
      ? buildDailyPrioritiesBrief(data)
      : buildMorningBrief(data);
    const dryRun = isDryRun(auth.url);

    if (dryRun) {
      response.status(200).json({
        ok: true,
        dryRun: true,
        mode: mode || "morning",
        configured: isTelegramConfigured(),
        summary: briefing.summary,
        message: briefing.message,
      });
      return;
    }

    await sendTelegramMessage(briefing.message);
    response.status(200).json({
      ok: true,
      dryRun: false,
      sent: true,
      mode: mode || "morning",
      summary: briefing.summary,
    });
  } catch (error) {
    sendError(response, error);
  }
};
