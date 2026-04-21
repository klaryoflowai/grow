const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_TABLE_LEADS || "Leads";

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function request(method, path, body) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}${path}`;
  const res = await fetch(url, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable ${method} ${path}: ${res.status} ${err}`);
  }
  return res.json();
}

// Retries write requests by stripping unknown fields when Airtable returns 422
async function requestWithFallback(method, path, body) {
  let current = body;
  const stripped = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await request(method, path, current);
    } catch (e) {
      const m = e.message.match(/UNKNOWN_FIELD_NAME.*?"([^"]+)"/);
      if (!m) throw e;
      const badField = m[1];
      stripped.push(badField);
      current = JSON.parse(JSON.stringify(current));
      for (const rec of current.records || []) {
        delete rec.fields?.[badField];
      }
      console.warn(`  Airtable: câmpul "${badField}" lipsește din tabel — ignorat.`);
    }
  }
  throw new Error("Prea multe câmpuri necunoscute în Airtable");
}

export async function listLeads() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const data = await request("GET", `?${params}`);
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

export async function createLead(fields) {
  const data = await requestWithFallback("POST", "", { records: [{ fields }] });
  return data.records?.[0];
}

export async function updateLead(id, fields) {
  const data = await requestWithFallback("PATCH", "", { records: [{ id, fields }] });
  return data.records?.[0];
}

export function isConfigured() {
  return Boolean(TOKEN && BASE_ID);
}
