const {
  getScorecardTrendData,
  upsertScorecardTrend,
  getLeadMeasuresDailyData,
  upsertLeadMeasuresDaily,
} = require("./_lib/airtable");
const { getRequestUrl, hasTruthyQueryParam, readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    const type = getRequestUrl(request).searchParams.get("type");

    if (type === "lead-measures") {
      if (request.method === "GET") {
        const leadMeasuresDaily = await getLeadMeasuresDailyData({ fresh: hasTruthyQueryParam(request, "fresh") });
        response.status(200).json({
          leadMeasuresDaily: leadMeasuresDaily || [],
        });
        return;
      }

      if (request.method === "PUT" || request.method === "PATCH") {
        const payload = await readJsonBody(request);
        const leadMeasure = await upsertLeadMeasuresDaily(payload);
        response.status(200).json({ leadMeasure });
        return;
      }

      response.setHeader("Allow", "GET, PUT, PATCH");
      response.status(405).json({ error: "Method not allowed." });
      return;
    }

    if (type === "trend") {
      if (request.method === "GET") {
        const dailyScores = await getScorecardTrendData({ fresh: hasTruthyQueryParam(request, "fresh") });
        response.status(200).json({
          dailyScores,
        });
        return;
      }

      if (request.method === "PUT" || request.method === "PATCH") {
        const payload = await readJsonBody(request);
        const dailyScore = await upsertScorecardTrend(payload);
        response.status(200).json({ dailyScore });
        return;
      }

      response.setHeader("Allow", "GET, PUT, PATCH");
      response.status(405).json({ error: "Method not allowed." });
      return;
    }

    response.status(400).json({ error: "Parametrul ?type= este obligatoriu (trend sau lead-measures)." });
  } catch (error) {
    sendError(response, error);
  }
};
