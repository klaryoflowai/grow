# Grow Market Radar

Daily scraper for public workforce-demand signals in Moldova.

## What It Collects

- New operational job posts from Rabota.md, Lucru.md, Delucru.md, Jobber.md and selected 999.md work categories.
- Job posts are aggregated by company. One target company appears once, with `Job Count`, `Job Titles` and `Evidence URLs` attached as context.
- Active and awarded public tenders from Achizitii.md, with detail-page enrichment for CPV, procedure type, award criteria, lots, participants and winners where public.
- A scored list of potential Grow customers based on sector fit, workforce volume, urgency, tender value and contactability.
- Active tenders without a winner are watchlist items only. They are not treated as contactable leads because the buyer is usually a public institution, not Grow's customer.

Disabled sources:

- Joblist.md is intentionally excluded because the public site currently says the platform is unavailable and redirects users toward 999.md.

## Commands

```bash
cd /Users/yuritimofte/Desktop/Grow/scraper
npm run market:dry-run
npm run market:daily
```

Options:

```bash
node market-radar.js --jobs-only
node market-radar.js --tenders-only
node market-radar.js --limit 80
node market-radar.js --no-telegram
node market-radar.js --no-airtable
```

## Output

Reports are written to:

```text
/Users/yuritimofte/Desktop/Grow/scraper/output/market-radar/
```

Each run creates:

- `*.json` with structured signals.
- `*.md` with a readable daily brief.

## Optional Airtable Import

By default, the script only imports into Airtable if this variable exists:

```bash
AIRTABLE_TABLE_MARKET_SIGNALS="Market Signals"
```

If Market Signals is in a separate Airtable base/workspace, use dedicated credentials so the Grow CRM dashboard keeps using its existing base:

```bash
AIRTABLE_MARKET_TOKEN="pat_your_market_token"
AIRTABLE_MARKET_BASE_ID="app_your_market_base_id"
AIRTABLE_TABLE_MARKET_SIGNALS="Market Signals"
```

If `AIRTABLE_MARKET_TOKEN` and `AIRTABLE_MARKET_BASE_ID` are missing, the script falls back to the existing `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID`.

Recommended fields for that staging table:

- `Signal Key`
- `Duplicate Group Key`
- `Type`
- `Signal Kind`
- `Source`
- `Source Tier`
- `Company`
- `Target Company`
- `Job Count`
- `Job Titles`
- `Evidence URLs`
- `Buyer`
- `Winner`
- `Title`
- `Sector`
- `Score`
- `Priority`
- `URL`
- `Posted At`
- `Deadline`
- `Estimated Value MDL`
- `Awarded Value MDL`
- `Award Status`
- `CPV`
- `Procedure Type`
- `Award Criteria`
- `Participants`
- `Lots Detail`
- `Reasons`
- `Outreach Angle`
- `Scraped At`

If fields are missing, the script strips unknown fields and continues. If the table does not exist, it skips import and still writes local reports.

Minimum required field for dedupe:

- `Signal Key`

## Scoring

The score is intentionally simple:

- Sector fit: construction, production, logistics are P1.
- Workforce volume: multiple active jobs per company, words like `muncitori`, `personal`, `echipa`.
- Urgency: `urgent`, `imediat`, shift/night/weekend signals.
- Tender value and lot count.
- Awarded tenders score the winner as the sales target, not the public buyer.
- Active tenders without a winner are capped at `Watch` and kept out of Airtable import/top outreach.
- Public contact availability.

The radar intentionally excludes office/communication-heavy roles that are construction-adjacent but not Grow ICP, such as `intern`, `junior`, `desenator`, `AutoCAD`, `Revit`, `proiectant`, `arhitect`, `inginer`, `diriginte` and `devizier`. It also excludes recruitment agencies, abroad jobs and individual job-seeker posts.

Airtable architecture:

- One row means one company to contact, not one job post.
- `Signal Key` for job demand is company-level: `job-company:{normalized-company}`.
- The individual job posts remain visible in `Job Titles` and `Evidence URLs` for outreach context.
- Job posts without a usable company name are excluded from contactable Airtable import.

Tender exclusions:

- Food/product-supply tenders such as `produse alimentare`, meat, dairy, bakery, fruit/vegetables and similar procurement lots are excluded because they do not indicate workforce delivery demand.
- Product procurement such as medicines, uniforms, IT/software, furniture, office supplies, consumables, medical-equipment parts and construction materials is excluded.
- Design/proiectare tenders are excluded because they are communication/expertise-heavy, not workforce-volume execution signals.
- Tender monitoring is focused on works: construction, repair, roads, paving, infrastructure, renovation, finishing and similar labor-heavy execution.

Priority bands:

- `P1`: 75+
- `P2`: 55-74
- `P3`: 35-54
- `Watch`: below 35

## Guardrails

- Use only public employer and tender data.
- Do not scrape CVs, candidate profiles or private/login-only data.
- Treat job posts as demand signals, not verified buying intent.
- Tender buyers are often public institutions; the sales target may become the winning contractor after award.
