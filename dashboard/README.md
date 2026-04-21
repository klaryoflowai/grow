# Grow Daily Sales Scorecard

## Purpose

This dashboard is now optimized for one thing:

- daily lead activity
- clear stage conversion
- simple pipeline visibility
- Airtable as source of truth

## Data Model

The model is intentionally split in two:

- `Activities` = everything that happened
- `Companies` = where the account stands now

The operational scorecard still works with only 4 core activity types:

- `contacted`
- `meeting`
- `offer`
- `contract_signed`

The pipeline conversion cards and execution summaries are built on top of these 4 values.

The dedicated weekly scorecard page now uses two Airtable tables:

- `Scorecard` = one row per week
- `Scorecard Trend` = one row per day

The richer activity log stores:

- `Outcome`
- `Next Step`
- `Next Step Date`

The company table stores only:

- `Stadiu Pipeline`
- `Sanatate Cont`
- `Last Contact`
- `Next Step`
- `Next Step Date`

`Ultimul rezultat` is not stored separately in `Companies`. The dashboard computes it from the latest saved activity for that company.

Hybrid pipeline rule:

- new activities can auto-advance an open account to a later pipeline stage
- manually closed stages such as `Parcat`, `Pierdut`, or `Contract semnat` stay locked until you change them explicitly from the company form

## Architecture

The frontend stays in:

- `dashboard/index.html`
- `dashboard/styles.css`
- `dashboard/app.js`

The dashboard also uses `flatpickr` from CDN for a consistent visual date picker across browsers.

The Vercel serverless layer lives in:

- `api/bootstrap.js`
- `api/activities.js`
- `api/companies.js`
- `api/targets.js`

Shared Airtable helpers live in:

- `api/_lib/config.js`
- `api/_lib/airtable.js`
- `api/_lib/normalize.js`

## Airtable Tables

Base:

- `Grow`

Tables expected by default:

- `Companies`
- `Activities`
- `Targets`
- `Scorecard`
- `Scorecard Trend`

Default field names are documented in:

- `.env.example`

If your Airtable field names differ, you do not need to rewrite code. Just override the environment variables in Vercel.

Recommended Airtable fields:

- `Companies -> Company`
- `Companies -> Stadiu Pipeline`
- `Companies -> Sanatate Cont`
- `Companies -> Potential Workers`
- `Companies -> Lead Date`
- `Companies -> Last Contact`
- `Companies -> Next Step`
- `Companies -> Next Step Date`
- `Companies -> Sector`
- `Companies -> Notes`
- `Activities -> Date`
- `Activities -> Company`
- `Activities -> Activity Type`
- `Activities -> Outcome`
- `Activities -> Workers Delta`
- `Activities -> Next Step`
- `Activities -> Next Step Date`
- `Activities -> Notes`
- `Targets -> Month`
- `Targets -> Contacted Target`
- `Targets -> Meetings Target`
- `Targets -> Offers Target`
- `Targets -> Contracts Target`
- `Scorecard -> Week Start`
- `Scorecard -> Week End`
- `Scorecard -> Week Key`
- `Scorecard -> Week Label`
- `Scorecard -> New Contract Workers MTD`
- `Scorecard -> Dream100 P1 Prospects`
- `Scorecard -> Sales Velocity Days`
- `Scorecard -> Cold Calls`
- `Scorecard -> LinkedIn Messages`
- `Scorecard -> Field Visits`
- `Scorecard -> Meetings Set`
- `Scorecard -> Offers Sent`
- `Scorecard -> Contracts Signed`
- `Scorecard -> Workers Signed`
- `Scorecard -> Workers Delivered`
- `Scorecard -> Notes`
- `Scorecard Trend -> Date`
- `Scorecard Trend -> Contacted`
- `Scorecard Trend -> Meetings`
- `Scorecard Trend -> Offers`
- `Scorecard Trend -> Contracts`
- `Scorecard Trend -> Notes`

Recommended Romanian pipeline options:

- `Necontactat`
- `Incercam sa ajungem la decident`
- `Discutie initiata`
- `Meeting programat`
- `Meeting tinut`
- `Oferta trimisa`
- `Negociere`
- `Asteapta decizie`
- `Contract semnat`
- `Parcat`
- `Pierdut`

Recommended Romanian account health options:

- `Verde`
- `Galben`
- `Rosu`
- `Gri`

If you prefer emoji-only Airtable badges for `Sanatate Cont`, the backend also supports:

- `🟢`
- `🟡`
- `🔴`
- `⚪️`

The dashboard still shows the Romanian labels, but it can read and write the emoji values in Airtable.

Recommended Romanian outcome options:

- `Am vorbit cu decidentul`
- `Nu am ajuns la decident`
- `Nu raspunde`
- `Numar gresit`
- `Nu au nevoie acum`
- `Revino mai tarziu`
- `Interesat`
- `Asteapta oferta`
- `Buget blocat`
- `Pierdut la competitor`

Legacy note:

- `Companies -> Status` is no longer required by the dashboard
- if you still have it in Airtable, the backend can still read it as fallback

## Important Airtable Note

For the `Activities` table, the easiest setup is:

- `Company` as plain text

If you already use a linked record field to `Companies`, set:

- `AIRTABLE_ACTIVITY_COMPANY_LINKED=true`

and optionally expose a lookup field like:

- `Company Name`

for cleaner reads in the UI.

## Local Development

Fastest static preview:

```bash
cd /Users/yuritimofte/Desktop/Grow
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/dashboard/`

Note: in plain static mode, `/api/*` will not exist, so the dashboard falls back to local memory.

## Vercel Setup

1. Import this GitHub repository into Vercel.
2. Add the environment variables from `.env.example`.
3. Keep `AIRTABLE_BASE_ID=appaD7MQAs7Im71m2`.
4. Deploy.
5. Open the production URL and the dashboard will start reading from Airtable through Vercel functions.

## Fallback Mode

Until Vercel and Airtable are configured:

- activities are stored in browser localStorage
- company updates are stored in browser localStorage
- targets are stored in browser localStorage
- weekly scorecards are stored in browser localStorage
- daily trend falls back to `Activities` if `Scorecard Trend` is not available

You can export or clear the fallback memory from the UI.
