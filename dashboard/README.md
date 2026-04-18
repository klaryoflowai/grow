# Grow Activity Dashboard

## Purpose

This is the standalone interactive dashboard for:

- monthly scorecard
- Dream 100 account visibility
- recent activity feed
- daily data capture with local memory
- future artifacts

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

This dashboard does not use fake data by default.

Use one of these:

1. paste published CSV URLs from Google Sheets
2. upload local CSV exports
3. write directly inside the dashboard and save to local memory

## CSV Schemas

### accounts.csv

Use these columns:

- `company`
- `sector`
- `priority`
- `status`
- `workers`
- `owner`
- `last_contact`
- `next_step`
- `next_step_date`
- `signed_date`
- `arrival_date`
- `notes`

### activities.csv

Use these columns:

- `date`
- `company`
- `activity_type`
- `channel`
- `notes`
- `workers_delta`
- `contract_value`

Recommended `activity_type` values:

- `lead_new`
- `contacted`
- `meeting`
- `proposal_sent`
- `contract_signed`
- `arrival`

### artifacts.csv

Use these columns:

- `title`
- `category`
- `status`
- `owner`
- `updated_at`
- `url`
- `notes`

## Important Limitation

Your current Google Sheet link requires authentication, so I could not hydrate the dashboard with the real company list yet. Once the sheet is exported to CSV or published as CSV, this dashboard can use the actual names, current status, and live activity history.

## Daily Memory

The dashboard now has three built-in forms:

- activity capture
- account updates
- artifact capture

These entries are stored in browser localStorage and are merged automatically with any live CSV source.
