const { normalizeString } = require("./normalize");

const DEFAULT_OWNER = "klaryoflowai";
const DEFAULT_REPO = "SOIA";
const DEFAULT_BRANCH = "main";

function getVaultNotesConfig() {
  return {
    owner: normalizeString(process.env.VAULT_GITHUB_OWNER) || DEFAULT_OWNER,
    repo: normalizeString(process.env.VAULT_GITHUB_REPO) || DEFAULT_REPO,
    branch: normalizeString(process.env.VAULT_GITHUB_BRANCH) || DEFAULT_BRANCH,
    token: normalizeString(process.env.VAULT_GITHUB_TOKEN || process.env.GITHUB_TOKEN),
  };
}

function encodePath(path = "") {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64(content = "") {
  return Buffer.from(content, "base64").toString("utf8");
}

function encodeBase64(content = "") {
  return Buffer.from(content, "utf8").toString("base64");
}

async function githubRequest(path, options = {}) {
  const config = getVaultNotesConfig();
  if (!config.token) {
    throw new Error("Lipseste VAULT_GITHUB_TOKEN. Nota nu poate fi salvata in vault pana nu este configurat accesul GitHub pentru repo-ul SOIA.");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (response.status === 404) {
    return { ok: false, status: 404, data: null };
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message = data?.message || `GitHub API error ${response.status}`;
    throw new Error(message);
  }

  return { ok: true, status: response.status, data };
}

async function readVaultFile(path) {
  const config = getVaultNotesConfig();
  const encodedPath = encodePath(path);
  const result = await githubRequest(`/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`);

  if (result.status === 404) {
    return {
      exists: false,
      content: "",
      sha: "",
    };
  }

  return {
    exists: true,
    content: decodeBase64(result.data?.content || ""),
    sha: result.data?.sha || "",
  };
}

async function writeVaultFile(path, content, sha = "", message = "") {
  const config = getVaultNotesConfig();
  const encodedPath = encodePath(path);
  const body = {
    message: message || `Add Telegram vault note to ${path}`,
    content: encodeBase64(content),
    branch: config.branch,
  };

  if (sha) body.sha = sha;

  const result = await githubRequest(`/repos/${config.owner}/${config.repo}/contents/${encodedPath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return result.data;
}

function formatDateTime(date = new Date(), timezone = "Europe/Chisinau") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}:${value("second")} ${timezone}`;
}

function quoteMarkdown(text = "") {
  return normalizeString(text)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildQueueHeader(scope = {}) {
  return [
    `# Telegram Daily Notes Queue - ${scope.label || "Vault"}`,
    "",
    "Acest fisier este inbox/standby pentru notele trimise din Telegram.",
    "",
    "Reguli:",
    "",
    "- notele sunt capturate rapid din telefon;",
    "- raman aici pana cand Codex se conecteaza la vault si le proceseaza;",
    "- dupa procesare, nota se muta sau se sintetizeaza in locul final indicat de `Target final`;",
    "- nu salva aici secrete, token-uri, parole sau date personale sensibile.",
    "",
    "---",
    "",
  ].join("\n");
}

function buildNoteEntry(note = {}) {
  const timestamp = formatDateTime(new Date(note.receivedAt || Date.now()), note.timezone);
  return [
    `## ${timestamp}`,
    "",
    `- Scope: ${note.scope?.label || "Grow"}`,
    `- Status: standby`,
    `- Source: Telegram /note`,
    `- Target final: ${note.scope?.targetHint || "de decis la procesare"}`,
    note.telegramMessageId ? `- Telegram message id: ${note.telegramMessageId}` : "",
    "",
    "Nota:",
    "",
    quoteMarkdown(note.text),
    "",
    "Procesare Codex:",
    "",
    "- [ ] clasificata",
    "- [ ] mutata/sintetizata in fisierul final",
    "- [ ] stearsa din queue sau marcata ca procesata",
    "",
    "---",
    "",
  ].filter((line) => line !== "").join("\n");
}

function normalizeQueueContent(content = "", scope = {}) {
  const existing = normalizeString(content);
  return existing ? `${existing}\n\n` : buildQueueHeader(scope);
}

async function saveVaultNote(note = {}) {
  const queuePath = note.scope?.queuePath;
  if (!queuePath) {
    throw new Error("Nota nu are queuePath configurat pentru vault.");
  }

  const entry = buildNoteEntry(note);
  const commitMessage = `Capture Telegram note: ${note.scope?.label || "Vault"}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readVaultFile(queuePath);
    const nextContent = `${normalizeQueueContent(current.content, note.scope)}${entry}`;

    try {
      const result = await writeVaultFile(queuePath, nextContent, current.sha, commitMessage);
      const config = getVaultNotesConfig();
      return {
        ok: true,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        path: queuePath,
        url: result?.content?.html_url || `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${queuePath}`,
        commit: result?.commit?.html_url || "",
      };
    } catch (error) {
      if (!/sha|conflict|is at/i.test(error.message) || attempt > 0) {
        throw error;
      }
    }
  }

  throw new Error("Nu am putut salva nota in vault dupa retry.");
}

module.exports = {
  saveVaultNote,
};
