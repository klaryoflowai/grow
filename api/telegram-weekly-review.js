const { getDashboardData } = require("./_lib/airtable");
const { authorizeCronRequest, isDryRun } = require("./_lib/cron");
const { sendError, setNoStore } = require("./_lib/http");
const { isTelegramConfigured, sendTelegramMessage } = require("./_lib/telegram");
const { buildWeeklyExpertReview, isFridayAtSix } = require("./_lib/weekly-review");

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
    const dryRun = isDryRun(auth.url);
    const force = auth.url.searchParams.get("force") === "1";
    const timezone = process.env.AIRTABLE_TIMEZONE || "Europe/Chisinau";
    const shouldBuildAndSend = dryRun || force || isFridayAtSix(timezone);

    if (!shouldBuildAndSend) {
      response.status(200).json({
        ok: true,
        skipped: "outside_friday_18_window",
        timezone,
        configured: isTelegramConfigured(),
      });
      return;
    }

    const data = await getDashboardData();
    const review = await buildWeeklyExpertReview(data);

    if (dryRun) {
      response.status(200).json({
        ok: true,
        dryRun: true,
        configured: isTelegramConfigured(),
        summary: review.summary,
        message: review.message,
      });
      return;
    }

    await sendTelegramMessage(review.message);
    response.status(200).json({
      ok: true,
      dryRun: false,
      sent: true,
      forced: force,
      summary: review.summary,
    });
  } catch (error) {
    sendError(response, error);
  }
};
