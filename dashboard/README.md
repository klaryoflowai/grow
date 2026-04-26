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

The dedicated weekly scorecard page now uses three Airtable tables:

- `Scorecard` = one row per week
- `Scorecard Trend` = one row per day
- `Lead Measures Daily` = one row per day for Hormozi-style execution metrics

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
- `api/lead-measures-daily.js`
- `api/telegram-morning.js`
- `api/telegram-evening.js`
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
- `Lead Measures Daily`

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
- `Targets -> Cold Calls Daily`
- `Targets -> Cold Calls Weekly`
- `Targets -> Cold Calls Monthly`
- `Targets -> WhatsApp Messages Daily`
- `Targets -> WhatsApp Messages Weekly`
- `Targets -> WhatsApp Messages Monthly`
- `Targets -> Field Visits Daily`
- `Targets -> Field Visits Weekly`
- `Targets -> Field Visits Monthly`
- `Targets -> Warm Outreach Daily`
- `Targets -> Warm Outreach Weekly`
- `Targets -> Warm Outreach Monthly`
- `Scorecard -> Week Start`
- `Scorecard -> Week End`
- `Scorecard -> Week Key`
- `Scorecard -> Week Label`
- `Scorecard -> New Contract Workers MTD`
- `Scorecard -> Dream100 P1 Prospects`
- `Scorecard -> Sales Velocity Days`
- `Scorecard -> Cold Calls`
- `Scorecard -> WhatsApp Messages`
- `Scorecard -> Field Visits`
- `Scorecard -> Warm Outreach`
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
- `Lead Measures Daily -> Date`
- `Lead Measures Daily -> Cold Calls`
- `Lead Measures Daily -> WhatsApp Messages`
- `Lead Measures Daily -> Field Visits`
- `Lead Measures Daily -> Warm Outreach`
- `Lead Measures Daily -> Notes`

## Telegram Briefings

The repo now includes two secure Vercel endpoints for Telegram summaries:

- `/api/telegram-morning`
- `/api/telegram-evening`
- `/api/telegram-webhook`
- `/api/telegram-webhook-setup`
- `/api/telegram-webhook-info`

Both endpoints:

- read the same Airtable-backed data as the dashboard
- require `CRON_SECRET`
- support preview mode with `?dryRun=1`

Environment variables needed:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`

Recommended free setup:

1. create a Telegram bot with `@BotFather`
2. add `TELEGRAM_BOT_TOKEN` in Vercel
3. send one message to the bot from your Telegram account
4. discover your chat id
5. add `TELEGRAM_CHAT_ID` in Vercel
6. set any long random value as `CRON_SECRET`
7. redeploy
8. test previews:
   - `/api/telegram-morning?key=YOUR_SECRET&dryRun=1`
   - `/api/telegram-evening?key=YOUR_SECRET&dryRun=1`
9. configure two free jobs in `cron-job.org`:
   - `08:00 Europe/Chisinau` -> `/api/telegram-morning?key=YOUR_SECRET`
   - `19:00 Europe/Chisinau` -> `/api/telegram-evening?key=YOUR_SECRET`

Morning briefing includes:

- top follow-up accounts due today
- overdue and stale accounts
- daily/weekly/monthly key lead measures
- current weekly movement snapshot

Evening briefing includes:

- today's contacts, meetings, offers, contracts
- today's key lead measures
- recent saved actions
- what needs attention tomorrow

Telegram commands:

- `/intel Nume Companie` -> short pre-call brief from Airtable + public footprint
- `/intel+ Nume Companie` -> extended company intelligence with hypotheses and discovery questions
- `/help` -> command help

Webhook setup:

1. set `TELEGRAM_WEBHOOK_SECRET` in Vercel or reuse `CRON_SECRET`
2. open `/api/telegram-webhook-setup?key=YOUR_SECRET`
3. verify webhook state with `/api/telegram-webhook-info?key=YOUR_SECRET`

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

- `Mesaj WhatsApp trimis`
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
