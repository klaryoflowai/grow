const { getDashboardData } = require("./_lib/airtable");
const { hasTruthyQueryParam, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const data = await getDashboardData({ fresh: hasTruthyQueryParam(request, "fresh") });
    response.status(200).json(data);
  } catch (error) {
    sendError(response, error);
  }
};
