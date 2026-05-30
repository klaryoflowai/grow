const { getCompaniesData, upsertCompany } = require("./_lib/airtable");
const { hasTruthyQueryParam, readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    if (request.method === "GET") {
      const companies = await getCompaniesData({ fresh: hasTruthyQueryParam(request, "fresh") });
      response.status(200).json({ companies });
      return;
    }

    if (request.method === "POST" || request.method === "PATCH") {
      const payload = await readJsonBody(request);
      const company = await upsertCompany(payload);
      response.status(200).json({ company });
      return;
    }

    response.setHeader("Allow", "GET, POST, PATCH");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    sendError(response, error);
  }
};
