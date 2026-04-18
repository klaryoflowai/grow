# Grow Daily Sales Scorecard

## Purpose

This is the standalone interactive dashboard for:

- daily contacts
- monthly scorecard
- pipeline visibility
- clear conversion metrics
- recent activity feed

## Open It

Fastest local option:

```bash
cd /Users/yuritimofte/Desktop/Grow
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/dashboard/`

## Deploy to GitHub Pages

This project already includes a GitHub Actions workflow at:

- `.github/workflows/deploy-dashboard.yml`

It publishes the `dashboard` folder directly to GitHub Pages, so the live site uses this folder as the web root.

## How Real Data Works

This dashboard is now intentionally simplified.

Use one of these:

1. paste published CSV URLs from Google Sheets
2. upload local CSV exports
3. write directly inside the dashboard and save to local memory

## CSV Schemas

### accounts.csv

Use these columns:

- `company`
- `status`
- `workers`
- `last_contact`
- `next_step`
- `sector`
- `notes`

### activities.csv

Use these columns:

- `date`
- `company`
- `activity_type`
- `workers_delta`
- `notes`
- `contract_value`

Recommended `activity_type` values:

- `contacted`
- `meeting`
- `offer`
- `contract_signed`

## Important Limitation

Your current Google Sheet link requires authentication, so I could not hydrate the dashboard with the real company list yet. Once the sheet is exported to CSV or published as CSV, this dashboard can use the actual names, current status, and live activity history.

## Daily Memory

The dashboard keeps the quick activity form and the quick company update form in browser localStorage. These entries are merged automatically with any live CSV source.
