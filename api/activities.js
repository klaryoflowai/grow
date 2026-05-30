const { createActivity, getActivitiesData } = require("./_lib/airtable");
const { hasTruthyQueryParam, readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    if (request.method === "GET") {
      const activities = await getActivitiesData({ fresh: hasTruthyQueryParam(request, "fresh") });
      response.status(200).json({ activities });
      return;
    }

    if (request.method === "POST") {
      const payload = await readJsonBody(request);
      const result = await createActivity(payload);
      response.status(201).json(result);
      return;
    }

    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    sendError(response, error);
  }
};
