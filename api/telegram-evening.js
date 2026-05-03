const { getDashboardData } = require("./_lib/airtable");
const { authorizeCronRequest, isDryRun } = require("./_lib/cron");
const { sendError, setNoStore } = require("./_lib/http");
const { buildEveningBrief } = require("./_lib/telegram-briefs");
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
    const weeklyReview = ["1", "true", "yes"].includes(
      String(auth.url.searchParams.get("weeklyReview") || "").toLowerCase()
    );

    if (weeklyReview) {
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
          kind: "weekly_review",
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
        kind: "weekly_review",
        sent: true,
        forced: force,
        summary: review.summary,
      });
      return;
    }

    const data = await getDashboardData();
    const briefing = buildEveningBrief(data);

    if (dryRun) {
      response.status(200).json({
        ok: true,
        dryRun: true,
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
      summary: briefing.summary,
    });
  } catch (error) {
    sendError(response, error);
  }
};
