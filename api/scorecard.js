const { getDashboardData, upsertScorecardTargets } = require("./_lib/airtable");
const { readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    if (request.method === "GET") {
      const data = await getDashboardData();
      response.status(200).json({ targets: data.targets, dailyScores: data.dailyScores || [] });
      return;
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      const payload = await readJsonBody(request);
      const scorecard = await upsertScorecardTargets(payload);
      response.status(200).json({ scorecard });
      return;
    }

    response.setHeader("Allow", "GET, PUT, PATCH");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    sendError(response, error);
  }
};
