const stageOrder = {
  new: 0,
  contacted: 1,
  meeting: 2,
  offer: 3,
  contract_signed: 4,
  lost: -1,
};

const activityAliases = {
  lead_new: "contacted",
  new_lead: "contacted",
  first_contact: "contacted",
  contacted: "contacted",
  live_contact: "contacted",
  call: "contacted",
  call_live: "contacted",
  email: "contacted",
  whatsapp: "contacted",
  meeting_booked: "meeting",
  meeting_held: "meeting",
  meeting: "meeting",
  proposal_sent: "offer",
  offer_sent: "offer",
  offer: "offer",
  contract_review: "offer",
  contract_signed: "contract_signed",
  signed: "contract_signed",
};

function normalizeString(value) {
  if (Array.isArray(value)) {
    return value
      .flat()
      .map((item) => normalizeString(item))
      .filter(Boolean)
      .join(", ");
  }

  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toNumber(value) {
  const num = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(value) {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function normalizeStatus(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "signed") return "contract_signed";
  if (key === "proposal" || key === "proposal_sent" || key === "offer_sent" || key === "contract_review") {
    return "offer";
  }
  return stageOrder[key] !== undefined ? key : key ? "contacted" : "new";
}

function normalizeActivity(value = "") {
  const key = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  return activityAliases[key] || "contacted";
}

function stageRank(status = "") {
  return stageOrder[status] ?? 0;
}

function getCurrentPeriod(timezone = "Europe/Chisinau") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

function normalizePeriod(value, timezone = "Europe/Chisinau") {
  const raw = normalizeString(value);
  if (!raw) return getCurrentPeriod(timezone);
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);

  const date = parseDate(raw);
  return date ? date.toISOString().slice(0, 7) : raw.toLowerCase();
}

module.exports = {
  getCurrentPeriod,
  normalizeActivity,
  normalizePeriod,
  normalizeStatus,
  normalizeString,
  parseDate,
  stageRank,
  toIsoDate,
  toNumber,
};
