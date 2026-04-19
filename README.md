# Grow.md Obsidian Vault Setup

## What This Vault Is Built For

This Vault is designed as a sales operating system for a Director of Sales at Grow.md:

- strategic hunting of Dream 100 accounts
- pipeline visibility by stage
- reusable scripts and objection handling
- operations visibility across the full worker import journey
- weekly and monthly scorecards
- a standalone interactive dashboard for scorecard plus future artifacts

## Folder Map

- `00_STRATEGY` for strategic thinking, frameworks, books, and scale filters
- `10_SALES_ENGINE` for Dream 100, pipeline, and scripts
- `20_OPERATIONS` for SOPs, bottlenecks, and process visualization
- `30_DASHBOARDS` for command center and scorecards
- `40_MEETINGS` for internal and client meetings
- `90_ARCHIVE` for closed or inactive material
- `_Templates` for reusable note templates
- `dashboard` for the interactive web dashboard, now prepared for Airtable + Vercel

## Recommended Obsidian Configuration

Enable these core features:

- Properties
- Templates
- Canvas
- Command Palette
- Backlinks

Install these community plugins:

- Dataview
- Tasks
- Kanban

Optional but useful later:

- QuickAdd
- Templater
- Calendar

## Minimal Setup Steps

1. Open this folder as an Obsidian Vault.
2. Go to `Settings -> Core plugins` and enable `Templates` and `Canvas`.
3. Go to `Settings -> Community plugins`, turn them on, then install `Dataview`.
4. In `Settings -> Templates`, set the template folder to `_Templates`.
5. Pin `00_Start_Here.md` and `30_DASHBOARDS/00-Sales Command Center.md`.
6. Open `dashboard/index.html` when you want a richer visual dashboard outside Obsidian.
7. For real live data, deploy the repo to Vercel and connect Airtable through environment variables.

## GitHub Deploy

This repo is prepared for GitHub Pages with a workflow that deploys the `dashboard` folder as the live site.
That path is still useful for static preview, but the Airtable-backed version needs Vercel because the API token must stay server-side.

Recommended flow:

1. create an empty GitHub repository
2. push this folder to the `main` branch
3. in GitHub, open `Settings -> Pages`
4. set `Source` to `GitHub Actions`
5. push again if needed and wait for the `Deploy Dashboard to GitHub Pages` workflow

The published site will serve the dashboard directly from `dashboard/index.html`.

## Vercel + Airtable Deploy

For live Grow data, use Vercel instead of GitHub Pages:

1. import this GitHub repository into Vercel
2. add the environment variables from `.env.example`
3. keep `AIRTABLE_BASE_ID=appaD7MQAs7Im71m2`
4. adjust Airtable field names only in env vars if your schema differs
5. redeploy and open `/dashboard/`

## Metadata Standards

Use ASCII, lowercase, snake_case properties for Dataview stability.

Recommended common properties:

- `type`
- `priority`
- `stage`
- `last_contact`
- `next_step`
- `next_step_date`
- `owner`
- `company`

## Dream 100 Import Recommendation

Your Google Sheet currently requires login, so this Vault is prepared for import but does not assume a locked schema yet.

Best next step:

1. export the sheet to CSV
2. align its columns with the `Company Template`
3. optionally bulk-create one note per account later

## Canvas Recommendation

Create two canvases after opening the Vault:

1. `Value Map Canvas`
   - center: Grow value proposition
   - left: Construction, Retail, Industry
   - right: pains, objections, proof, case studies
   - bottom: scripts, offers, Dream 100 account clusters

2. `Recruitment Flow Canvas`
   - one card for each operations stage
   - color-code bottlenecks
   - connect stage notes from `20_OPERATIONS/SOPs`

This makes the Vault both operational and visual from day one.
