const test = require("node:test");
const assert = require("node:assert/strict");

test("loadEnvFile sets process.env from a file without overwriting existing vars", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { loadEnvFile } = require("../daily-contact-queue");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dcq-test-"));
  const envPath = path.join(dir, ".env.local");
  fs.writeFileSync(envPath, "DCQ_TEST_NEW=hello\nDCQ_TEST_EXISTING=should-not-override\n", "utf8");

  process.env.DCQ_TEST_EXISTING = "original";
  delete process.env.DCQ_TEST_NEW;

  loadEnvFile(envPath);

  assert.equal(process.env.DCQ_TEST_NEW, "hello");
  assert.equal(process.env.DCQ_TEST_EXISTING, "original");

  delete process.env.DCQ_TEST_NEW;
  delete process.env.DCQ_TEST_EXISTING;
  fs.rmSync(dir, { recursive: true, force: true });
});

test("normalizeCompanyKey strips diacritics, case and punctuation", () => {
  const { normalizeCompanyKey } = require("../daily-contact-queue");
  assert.equal(normalizeCompanyKey("Trox BR srl"), "troxbrsrl");
  assert.equal(normalizeCompanyKey("KABLEM-MLD-IT\n"), "kablemmldit");
  assert.equal(normalizeCompanyKey("Întreprinderea Mixtă S.R.L."), "intreprindereamixtasrl");
  assert.equal(normalizeCompanyKey(""), "");
});

test("findBestMatch finds an exact match first", () => {
  const { findBestMatch } = require("../daily-contact-queue");
  const items = [{ company: "Trox BR srl" }, { company: "KABLEM-MLD-IT" }];
  const match = findBestMatch(items, "Trox BR SRL");
  assert.equal(match.company, "Trox BR srl");
});

test("findBestMatch falls back to a contains match", () => {
  const { findBestMatch } = require("../daily-contact-queue");
  const items = [{ company: "Magnetec Components SRL" }];
  const match = findBestMatch(items, "Magnetec Components");
  assert.equal(match.company, "Magnetec Components SRL");
});

test("findBestMatch falls back to a reverse-contains match", () => {
  const { findBestMatch } = require("../daily-contact-queue");
  const items = [{ company: "Magnetec" }];
  const match = findBestMatch(items, "Magnetec Components SRL");
  assert.equal(match.company, "Magnetec");
});

test("findBestMatch returns null when nothing matches or company name is empty", () => {
  const { findBestMatch } = require("../daily-contact-queue");
  const items = [{ company: "Trox BR srl" }];
  assert.equal(findBestMatch(items, "Unrelated Company"), null);
  assert.equal(findBestMatch(items, ""), null);
});

test("resolveContactPriorityCompanyName reads the 'Company (from Company)' lookup field", () => {
  const { getAirtableConfig } = require("../../api/_lib/config");
  const { resolveContactPriorityCompanyName } = require("../daily-contact-queue");
  const config = getAirtableConfig();
  const fields = {
    Name: 1,
    "Sector (from Company)": ["Textile"],
    "Stadiu Pipeline (from Company)": ["Necontactat"],
    Company: ["rec6KC48iE1IwCIBX"],
    "Company (from Company)": ["Trox BR srl"],
  };
  assert.equal(resolveContactPriorityCompanyName(fields, config), "Trox BR srl");
});

test("resolveContactPriorityCompanyName trims trailing whitespace from the lookup value", () => {
  const { getAirtableConfig } = require("../../api/_lib/config");
  const { resolveContactPriorityCompanyName } = require("../daily-contact-queue");
  const config = getAirtableConfig();
  const fields = { "Company (from Company)": ["KABLEM-MLD-IT\n"] };
  assert.equal(resolveContactPriorityCompanyName(fields, config), "KABLEM-MLD-IT");
});

test("resolveContactPriorityCompanyName returns empty string when no company is linked", () => {
  const { getAirtableConfig } = require("../../api/_lib/config");
  const { resolveContactPriorityCompanyName } = require("../daily-contact-queue");
  const config = getAirtableConfig();
  const fields = { Name: 3 };
  assert.equal(resolveContactPriorityCompanyName(fields, config), "");
});
