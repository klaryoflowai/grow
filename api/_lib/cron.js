function getRequestUrl(request) {
  const forwardedProto = request.headers?.["x-forwarded-proto"];
  const host = request.headers?.host || "localhost";
  const protocol = forwardedProto || "https";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

function getBearerToken(request) {
  const header = request.headers?.authorization || "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return "";
  return header.slice(prefix.length).trim();
}

function isTruthy(value = "") {
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function authorizeCronRequest(request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return {
      ok: false,
      status: 500,
      message: "Lipseste CRON_SECRET in Environment Variables.",
    };
  }

  const url = getRequestUrl(request);
  const supplied = getBearerToken(request) || url.searchParams.get("key") || "";
  if (supplied !== secret) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized",
      url,
    };
  }

  return {
    ok: true,
    status: 200,
    url,
  };
}

function isDryRun(url) {
  if (!url) return false;
  return isTruthy(url.searchParams.get("dryRun")) || isTruthy(url.searchParams.get("preview"));
}

module.exports = {
  authorizeCronRequest,
  getRequestUrl,
  isDryRun,
};
