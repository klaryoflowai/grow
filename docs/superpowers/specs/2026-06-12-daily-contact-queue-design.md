# Daily Contact Queue — Design Spec

**Date:** 2026-06-12
**Status:** Approved (pending final spec review)
**Origin:** `aios-brain/core/level-up-log.md` entry "2026-06-12 — Grow" (artifact: `grow-daily-contact-queue`), refined through `superpowers:brainstorming`

## 1. Background & Problem

Grow runs a daily market-radar scraper (`scraper/output/market-radar/*.json`) that produces pre-scored signals (job postings, expansions, etc.) per company, each tagged with `priority` (P1/P2/P3/Watch), `score`, `reasons[]`, and `outreachAngle`. Separately, Yuri maintains a `Contact Priority` table in Airtable listing companies he intends to contact.

These two sources are currently disconnected:
- Existing Telegram commands (`/next`, `/a_list`, `/focus`, morning brief "priorities" mode) surface `Contact Priority` companies, but never reference market signals.
- Market-radar signals are scored and written to `scraper/output/market-radar/`, but nothing merges them with `Contact Priority` or tells Yuri "here's WHY to call this company today."

This was identified as a wishlist item ("dedup semnale -> Companies", "scoring de urgenta pentru Market Signals", "Daily Alfa Brief... semnale noi") in `context/projects/grow-moldova/03_Agents-and-Automations.md` under "Automatizari posibile" — never built.

## 2. Scope

**Note on origin:** the level-up-log entry framed this as "merge ~200 uncontacted companies... with deduplicated fresh market signals." During brainstorming, Yuri recreated `Contact Priority` as a small, manually-curated table (currently 1 test row). The artifact's job shifted from "reorder a large backlog" to "tell Yuri, each day, which `Contact Priority` companies have a fresh reason to be contacted right now, based on market signals" — a thinner, signal-merge layer.

**In scope (v1):**
- A standalone CLI tool, `tools/daily-contact-queue.js`, run manually
- Reads `Contact Priority` from Airtable (read-only)
- Reads the latest `scraper/output/market-radar/*.json` signals (already pre-scored)
- Matches signals to `Contact Priority` companies by normalized company name
- Deduplicates signals already surfaced on a prior run, via a local log
- Outputs a ranked markdown report: who to contact today, and why

**Out of scope (v1):**
- No writes to Airtable (no field updates, no new records)
- No scheduling/cron — manual invocation only
- No scoring engine — signal `score`/`priority` from the scraper is used as-is
- No "promote new company into Contact Priority" step — Contact Priority population stays manual/external
- No Telegram delivery — output is a local markdown file (may be piped into Telegram manually or in a future v2)

## 3. Architecture & Permissions

- **Location:** `tools/daily-contact-queue.js` in the Grow repo, alongside `tools/dream300.js`
- **Invocation:** `node tools/daily-contact-queue.js` (no subcommands needed for v1 — single report-generation run)
- **Config/env:** follows the `dream300.js` convention — load `.env.local`, then `.env`, then `process.env`, for `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID`. No new secrets; nothing token-related appears in this spec, the plan, or any committed file.
- **Output location:** `output/daily-contact-queue/` (already covered by the repo's gitignored `output/` — same pattern as `output/dream300/`)
  - `output/daily-contact-queue/YYYY-MM-DD.md` — the daily report
  - `output/daily-contact-queue/seen-signals.json` — dedup log (persists across runs)
- **Bike Method ring:** Ring 1-2 only.
  - Ring 1 (read-only, no confirmation): Airtable `Contact Priority` read, market-radar JSON read
  - Ring 2 (local file mutation, no confirmation): writing the markdown report and updating `seen-signals.json`
  - Ring 3 (none in v1): no Airtable writes, no external messages, no automation/cron
- **Kill switch:** none needed beyond "don't run it" — manual-invocation-only with zero Airtable writes means there's nothing to disable. If a future v2 adds scheduling, a kill switch should be added then (per Grow AI-Native principle: "Cunoaștere înainte de sisteme" — automate only once the manual version is proven).

## 4. Data Flow

### Step 1 — Load Contact Priority
Read all records from the `Contact Priority` table via the existing Airtable read pattern (`api/_lib/airtable.js`'s `listRecords()` approach, or the equivalent CLI-side helper used by `tools/airtable.js`/`tools/dream300.js`). Extract company name per record.

*Implementation note:* the exact table key and field names for the recreated, simplified `Contact Priority` table will be confirmed by reading the live table schema at the start of implementation (Ring 1, read-only — no separate approval needed). At minimum, a "Company" name field is expected to exist.

### Step 2 — Load latest market-radar signals
Find the most recent file in `scraper/output/market-radar/*.json` (by filename date, e.g. `2026-06-10-...json`) and read its `.signals[]` array. Each signal already includes (from the documented schema): `company`, `signalKind`, `score`, `priority` (P1/P2/P3/Watch), `reasons[]`, `outreachAngle`, `title`, `url`, `postedAt`, `scrapedAt`, etc. No re-scoring is performed — `score`/`priority` are used as provided.

### Step 3 — Match signals to Contact Priority companies
For each signal, normalize `signal.company` using `normalizeCompanyKey()` (replicating the logic in `api/_lib/intelligence.js`: lowercase, strip diacritics, strip non-alphanumeric characters) and match against normalized `Contact Priority` company names using the same exact → contains → reverse-contains strategy as `findBestMatch()`.

Each signal ends up in one of two buckets:
- **Matched** — `signal.company` matches a `Contact Priority` company
- **Unmatched** — no match (informational only, see Step 5)

### Step 4 — Deduplicate against prior runs
Maintain `output/daily-contact-queue/seen-signals.json`, a map keyed by `normalizeCompanyKey(company) + "::" + signalKind`, storing `{ lastSeenDate, lastSeenScore, lastSeenPriority }`.

For each matched signal:
- If the key is **not** in `seen-signals.json` → **new**, include in report
- If the key **is** in `seen-signals.json`:
  - If `priority` has escalated (e.g. P2 → P1) or `score` increased → **escalated**, include in report with an "↑ escalated" note
  - If `lastSeenDate` is more than 7 days ago → **resurfaced**, include in report (treated as a fresh nudge)
  - Otherwise → skip (already surfaced recently, no change)

After generating the report, update `seen-signals.json` for every signal included in this run's output (new, escalated, or resurfaced) with the current date/score/priority.

### Step 5 — Build the ranked report
Sort included matched signals by `priority` (P1 > P2 > P3 > Watch), then by `score` (descending). Group by company (a company may have multiple signals).

### Step 6 — Write the markdown report
Write `output/daily-contact-queue/YYYY-MM-DD.md` with three sections:

1. **"Contactează azi — semnal nou"** — `Contact Priority` companies with new/escalated/resurfaced signals (from Step 4), ranked. For each: company name, signal priority/score, `reasons[]`, `outreachAngle`, source `url`.
2. **"Contact Priority — fara semnal nou"** — remaining `Contact Priority` companies (no matching fresh signal this run), listed in their existing Airtable order, as a fallback list (so the report is still useful on days with no new signals).
3. **"Semnale noi — companii in afara Contact Priority"** — unmatched signals with `priority` P1/P2 (informational; surfaces potential new leads without writing to Airtable). P3/Watch unmatched signals are omitted from this section to keep it short.

## 5. Error Handling & Edge Cases

- **No market-radar file found:** report still generates with Section 1 empty and a note ("Nu exista fisier de semnale pentru azi — verifica scraper-ul"); Section 2 still lists all Contact Priority companies.
- **Empty Contact Priority table:** Section 2 is empty; Section 1 will also be empty (nothing to match against), but Section 3 still runs. Tool should still complete successfully and note this in the report header.
- **`seen-signals.json` missing (first run):** treat as empty map — all matched signals are "new".
- **Airtable read failure:** fail loudly with a clear error message (this is a manual CLI tool — no silent fallback needed; Yuri re-runs after fixing credentials/connectivity).

## 6. Testing Approach

- Unit tests for the pure-logic pieces: `normalizeCompanyKey`, the matching function, the dedup/escalation decision (Step 4), and markdown report assembly — using fixture data (a small sample `Contact Priority` array + a small sample `signals[]` array based on the real schema documented in this spec).
- Airtable reads and filesystem reads/writes are isolated behind small functions so they can be mocked/stubbed in tests; no live Airtable calls in the test suite.
- Manual end-to-end check: run `node tools/daily-contact-queue.js` against the real (currently 1-row) `Contact Priority` table and the latest real market-radar JSON, confirm the report is generated and readable.

## 7. Open Questions Resolved During Brainstorming

| Question | Resolution |
|---|---|
| Where do the ~200 companies live? | Contact Priority was recreated, simplified, and is now manually curated by Yuri — not this tool's concern |
| Should the tool reorder/promote companies into Contact Priority? | No — population of Contact Priority is manual and external to this tool |
| What should the artifact prioritize, given Contact Priority is now nearly empty? | Combined: merge signals + Contact Priority (this spec) |
| Where does dedup state live? | `output/daily-contact-queue/seen-signals.json`, gitignored, same pattern as `dream300.js` |
| Does the tool need a scoring engine? | No — market-radar signals are already pre-scored (`score`, `priority`) |
| Airtable write-back to Contact Priority? | None in v1 (Ring 1-2 only) |

## 8. Future Considerations (Not Built in v1)

- Telegram delivery of the daily report (reuse existing bot infra)
- Scheduling via cron (would require a kill switch per Bike Method, once proven manually)
- Writing "new lead" signals (Section 3) into a Companies/Contact Priority table — would be Ring 3, needs explicit approval
- Cross-referencing CRM pipeline stage (`CLOSED_PIPELINE_STAGES`) to exclude already-closed companies from Section 3
