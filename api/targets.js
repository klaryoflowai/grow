const { getTargetsData, upsertTargets } = require("./_lib/airtable");
const { hasTruthyQueryParam, readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    if (request.method === "GET") {
      const targets = await getTargetsData({ fresh: hasTruthyQueryParam(request, "fresh") });
      response.status(200).json({ targets });
      return;
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      const payload = await readJsonBody(request);
      const targets = await upsertTargets(payload);
      response.status(200).json({ targets });
      return;
    }

    response.setHeader("Allow", "GET, PUT, PATCH");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    sendError(response, error);
  }
};
