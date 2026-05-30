const { getRequestUrl, sendError, setNoStore } = require("./_lib/http");
const { normalizeString } = require("./_lib/normalize");
const { loadTelegramData } = require("./_lib/telegram-data");
const { buildMentorRecommendation } = require("./_lib/intelligence");

const mentorCache = new Map();
const MENTOR_CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(company = "") {
  return normalizeString(company).toLowerCase();
}

function readCachedRecommendation(key = "") {
  const cached = mentorCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > MENTOR_CACHE_TTL_MS) {
    mentorCache.delete(key);
    return null;
  }
  return cached.payload;
}

module.exports = async function handler(request, response) {
  setNoStore(response);
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const url = getRequestUrl(request);
    const company = normalizeString(url.searchParams.get("company"));
    if (!company) {
      response.status(400).json({ error: "Parametrul company este obligatoriu." });
      return;
    }

    const cacheKey = getCacheKey(company);
    const cached = readCachedRecommendation(cacheKey);
    if (cached) {
      response.status(200).json({ ...cached, cached: true });
      return;
    }

    const data = await loadTelegramData("intel", { fresh: url.searchParams.get("fresh") === "1" });
    const payload = await buildMentorRecommendation(data, company);
    mentorCache.set(cacheKey, { createdAt: Date.now(), payload });
    response.status(200).json({ ...payload, cached: false });
  } catch (error) {
    sendError(response, error);
  }
};
