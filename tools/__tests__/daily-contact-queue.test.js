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

test("findLatestSignalsFile picks the most recent file by filename", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { findLatestSignalsFile, loadSignals } = require("../daily-contact-queue");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dcq-signals-"));
  fs.writeFileSync(path.join(dir, "2026-06-08-x.json"), JSON.stringify({ signals: [] }), "utf8");
  fs.writeFileSync(path.join(dir, "2026-06-10-x.json"), JSON.stringify({ signals: [{ company: "Acme" }] }), "utf8");
  fs.writeFileSync(path.join(dir, "2026-06-09-x.json"), JSON.stringify({ signals: [] }), "utf8");

  const latest = findLatestSignalsFile(dir);
  assert.equal(path.basename(latest), "2026-06-10-x.json");
  assert.deepEqual(loadSignals(latest), [{ company: "Acme" }]);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("findLatestSignalsFile returns an empty string when the directory does not exist", () => {
  const { findLatestSignalsFile } = require("../daily-contact-queue");
  assert.equal(findLatestSignalsFile("/tmp/does-not-exist-dcq-market-radar"), "");
});

test("loadSignals returns an empty array for an empty path", () => {
  const { loadSignals } = require("../daily-contact-queue");
  assert.deepEqual(loadSignals(""), []);
});

test("matchSignalsToContacts splits signals into matched and unmatched", () => {
  const { matchSignalsToContacts } = require("../daily-contact-queue");
  const contacts = [{ id: "rec1", company: "Trox BR srl" }];
  const signals = [
    { company: "Trox BR SRL", signalKind: "company_job_demand" },
    { company: "Some Other Company", signalKind: "company_job_demand" },
  ];

  const { matched, unmatched } = matchSignalsToContacts(signals, contacts);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].contact.company, "Trox BR srl");
  assert.equal(matched[0].signal.company, "Trox BR SRL");
  assert.equal(unmatched.length, 1);
  assert.equal(unmatched[0].company, "Some Other Company");
});

test("buildSeenKey combines normalized company and signal kind", () => {
  const { buildSeenKey } = require("../daily-contact-queue");
  assert.equal(buildSeenKey("Trox BR srl", "company_job_demand"), "troxbrsrl::company_job_demand");
});

test("loadSeenSignals returns an empty object when the file does not exist", () => {
  const { loadSeenSignals } = require("../daily-contact-queue");
  assert.deepEqual(loadSeenSignals("/tmp/does-not-exist-dcq-seen-signals.json"), {});
});

test("classifySignal returns 'new' when there is no seen entry", () => {
  const { classifySignal } = require("../daily-contact-queue");
  const signal = { priority: "P2", score: 60 };
  assert.equal(classifySignal(signal, undefined, "2026-06-12"), "new");
});

test("classifySignal returns 'escalated' when priority increases", () => {
  const { classifySignal } = require("../daily-contact-queue");
  const signal = { priority: "P1", score: 60 };
  const seenEntry = { lastSeenDate: "2026-06-11", lastSeenScore: 60, lastSeenPriority: "P2" };
  assert.equal(classifySignal(signal, seenEntry, "2026-06-12"), "escalated");
});

test("classifySignal returns 'escalated' when score increases at the same priority", () => {
  const { classifySignal } = require("../daily-contact-queue");
  const signal = { priority: "P2", score: 75 };
  const seenEntry = { lastSeenDate: "2026-06-11", lastSeenScore: 60, lastSeenPriority: "P2" };
  assert.equal(classifySignal(signal, seenEntry, "2026-06-12"), "escalated");
});

test("classifySignal returns 'resurfaced' when more than the window has passed", () => {
  const { classifySignal } = require("../daily-contact-queue");
  const signal = { priority: "P2", score: 60 };
  const seenEntry = { lastSeenDate: "2026-06-04", lastSeenScore: 60, lastSeenPriority: "P2" };
  assert.equal(classifySignal(signal, seenEntry, "2026-06-12"), "resurfaced");
});

test("classifySignal returns 'skip' when seen recently with no change", () => {
  const { classifySignal } = require("../daily-contact-queue");
  const signal = { priority: "P2", score: 60 };
  const seenEntry = { lastSeenDate: "2026-06-11", lastSeenScore: 60, lastSeenPriority: "P2" };
  assert.equal(classifySignal(signal, seenEntry, "2026-06-12"), "skip");
});

test("daysBetween counts whole UTC days between two ISO date strings", () => {
  const { daysBetween } = require("../daily-contact-queue");
  assert.equal(daysBetween("2026-06-04", "2026-06-12"), 8);
  assert.equal(daysBetween("2026-06-11", "2026-06-12"), 1);
  assert.equal(daysBetween("2026-06-12", "2026-06-12"), 0);
});

test("sortMatchedSignals orders by priority rank then score, descending", () => {
  const { sortMatchedSignals } = require("../daily-contact-queue");
  const entries = [
    { contact: { company: "A" }, signal: { priority: "P3", score: 90 } },
    { contact: { company: "B" }, signal: { priority: "P1", score: 50 } },
    { contact: { company: "C" }, signal: { priority: "P1", score: 80 } },
  ];

  const sorted = sortMatchedSignals(entries);
  assert.deepEqual(sorted.map((e) => e.contact.company), ["C", "B", "A"]);
});

test("buildReport groups new signals by company under 'semnal nou'", () => {
  const { buildReport } = require("../daily-contact-queue");
  const report = buildReport({
    dateIso: "2026-06-12",
    contacts: [
      { id: "rec1", company: "Trox BR srl" },
      { id: "rec2", company: "KABLEM-MLD-IT" },
    ],
    matchedEntries: [
      {
        contact: { id: "rec1", company: "Trox BR srl" },
        signal: {
          company: "Trox BR SRL",
          signalKind: "company_job_demand",
          priority: "P1",
          score: 85,
          reasons: ["3 joburi noi postate"],
          outreachAngle: "Ofera suport pentru recrutare rapida",
          url: "https://example.com/trox",
        },
        status: "new",
      },
    ],
    unmatchedSignals: [],
    signalsFileFound: true,
  });

  assert.match(report, /## Contactează azi — semnal nou/);
  assert.match(report, /### Trox BR srl/);
  assert.match(report, /\*\*P1\*\* \(scor 85, company_job_demand\): 3 joburi noi postate/);
  assert.match(report, /## Contact Priority — fără semnal nou/);
  assert.match(report, /- KABLEM-MLD-IT/);
});

test("buildReport marks escalated signals with an escalation note", () => {
  const { buildReport } = require("../daily-contact-queue");
  const report = buildReport({
    dateIso: "2026-06-12",
    contacts: [{ id: "rec1", company: "Trox BR srl" }],
    matchedEntries: [
      {
        contact: { id: "rec1", company: "Trox BR srl" },
        signal: {
          company: "Trox BR SRL",
          signalKind: "company_job_demand",
          priority: "P1",
          score: 90,
          reasons: ["Scor crescut fata de ieri"],
          outreachAngle: "Contacteaza acum, urgenta in crestere",
          url: "https://example.com/trox",
        },
        status: "escalated",
      },
    ],
    unmatchedSignals: [],
    signalsFileFound: true,
  });

  assert.match(report, /\(↑ escalat\)/);
});

test("buildReport lists only P1/P2 unmatched leads and notes an empty Contact Priority", () => {
  const { buildReport } = require("../daily-contact-queue");
  const report = buildReport({
    dateIso: "2026-06-12",
    contacts: [],
    matchedEntries: [],
    unmatchedSignals: [
      {
        company: "Acme SRL",
        signalKind: "company_expansion",
        priority: "P1",
        score: 80,
        reasons: ["Deschide birou nou"],
        outreachAngle: "Propune servicii de recrutare pentru noul birou",
        url: "https://example.com/acme",
      },
      {
        company: "Beta SRL",
        signalKind: "company_job_demand",
        priority: "P3",
        score: 40,
        reasons: ["1 job nou"],
        outreachAngle: "Monitorizeaza",
        url: "https://example.com/beta",
      },
    ],
    signalsFileFound: true,
  });

  assert.match(report, /_Contact Priority este goala — nimic de potrivit cu semnalele\._/);
  assert.match(report, /_Nicio companie in Contact Priority\._/);
  assert.match(report, /\*\*Acme SRL\*\* — \*\*P1\*\*/);
  assert.doesNotMatch(report, /Beta SRL/);
});

test("buildReport notes when no market-radar signals file was found", () => {
  const { buildReport } = require("../daily-contact-queue");
  const report = buildReport({
    dateIso: "2026-06-12",
    contacts: [{ id: "rec1", company: "Trox BR srl" }],
    matchedEntries: [],
    unmatchedSignals: [],
    signalsFileFound: false,
  });

  assert.match(report, /_Nu exista fisier de semnale pentru azi — verifica scraper-ul\._/);
  assert.match(report, /_Niciun semnal nou pentru companiile din Contact Priority\._/);
  assert.match(report, /- Trox BR srl/);
});
