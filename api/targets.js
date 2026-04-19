const { getDashboardData, upsertTargets } = require("./_lib/airtable");
const { readJsonBody, sendError } = require("./_lib/http");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const data = await getDashboardData();
      response.status(200).json({ targets: data.targets });
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
