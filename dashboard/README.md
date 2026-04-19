# Grow Daily Sales Scorecard

## Purpose

This dashboard is now optimized for one thing:

- daily lead activity
- clear stage conversion
- simple pipeline visibility
- Airtable as source of truth

## Data Model

The UI only works with 4 core stages:

- `contacted`
- `meeting`
- `offer`
- `contract_signed`

Everything in the scorecard, trend, and conversion cards is built on top of these 4 values.

## Architecture

The frontend stays in:

- `dashboard/index.html`
- `dashboard/styles.css`
- `dashboard/app.js`

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

Default field names are documented in:

- `.env.example`

If your Airtable field names differ, you do not need to rewrite code. Just override the environment variables in Vercel.

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

You can export or clear the fallback memory from the UI.
