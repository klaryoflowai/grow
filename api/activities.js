const { createActivity, getDashboardData } = require("./_lib/airtable");
const { readJsonBody, sendError, setNoStore } = require("./_lib/http");

module.exports = async function handler(request, response) {
  setNoStore(response);
  try {
    if (request.method === "GET") {
      const data = await getDashboardData();
      response.status(200).json({ activities: data.activities });
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
