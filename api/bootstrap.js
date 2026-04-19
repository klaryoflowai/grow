const { getDashboardData } = require("./_lib/airtable");
const { sendError } = require("./_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const data = await getDashboardData();
    response.status(200).json(data);
  } catch (error) {
    sendError(response, error);
  }
};
