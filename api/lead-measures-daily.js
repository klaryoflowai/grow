const { getLeadMeasuresDailyData, upsertLeadMeasuresDaily } = require("./_lib/airtable");
const { hasTruthyQueryParam, readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
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
  } catch (error) {
    sendError(response, error);
  }
};
