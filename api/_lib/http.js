async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string" && request.body.trim()) {
    return JSON.parse(request.body);
  }

  const raw = await new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });

  return raw ? JSON.parse(raw) : {};
}

function setNoStore(response) {
  response.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
}

function sendError(response, error) {
  setNoStore(response);
  const status = error.status || 500;
  response.status(status).json({
    error: error.message || "A aparut o eroare necunoscuta.",
  });
}

module.exports = {
  readJsonBody,
  setNoStore,
  sendError,
};
