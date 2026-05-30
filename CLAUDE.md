# Grow Sales OS — Claude Code Context

## What This Repo Is

A hybrid repo for a Director of Sales at Grow.md, a Romanian workforce placement company:

- **Obsidian vault** — Sales OS with strategy notes, SOPs, scripts, scorecards, and Dataview dashboards
- **Web dashboard** (`dashboard/` + `api/`) — standalone interactive dashboard backed by Airtable, deployed on Vercel

These two layers share the same git repo but are structurally separate. The `dashboard/` folder is a web app, not vault content.

## Vault Conventions

### Folder structure
```
00_STRATEGY/     strategic frameworks, ICP, book notes
10_SALES_ENGINE/ Dream 100, pipeline, scripts
20_OPERATIONS/   8-stage SOPs, bottlenecks, canvas
30_DASHBOARDS/   command center, weekly/monthly scorecards
40_MEETINGS/     client and internal meeting notes
90_ARCHIVE/      closed/inactive material
_Templates/      reusable note templates
```

### File naming
- Numbered files: `NN-Title With Spaces.md` (dash separator, not underscore)
- Unnumbered files: `Title With Spaces.md`
- Exception: `00_Start_Here.md` uses underscores (inconsistency — prefer dash convention going forward)

### Frontmatter
Required for Dataview to work. Use snake_case, lowercase, ASCII keys:
```yaml
---
type: company | sop | script | meeting | scorecard
priority: p1 | p2 | p3
stage: dream100 | contacted | meeting | offer | contract
last_contact: YYYY-MM-DD
next_step: string
next_step_date: YYYY-MM-DD
owner: string
company: string
---
```

### Language policy
- English: note titles, section headers, frontmatter keys, folder names
- Romanian: pitch scripts, pipeline stage values, Airtable field values, activity labels

## Dashboard App (`dashboard/` + `api/`)

- Stack: vanilla JS, HTML, CSS — no build step, no npm, no bundler
- Data: Airtable via Vercel serverless functions in `api/`
- Env vars: defined in `.env.example`, base ID `appaD7MQAs7Im71m2` (timezone: Europe/Chisinau)
- `appBuild` constant in `dashboard/app.js`: format `YYYYMMDDr` — increment on changes

### Pipeline stages (Romanian, ordered)
Necontactat → Contactat → Meeting → Oferta → Negociere → Contract semnat → Parcat → Pierdut

### Activity labels (Romanian)
Nou, Planificat, Contactat, Meeting, Oferta, Contract, Pierdut

### Airtable tables
Companies, Activities, Targets, Scorecard, Scorecard Trend

## What Not to Touch

- `.env` — never commit real tokens; use `.env.example` as reference
- `output/` — playwright test artifacts, not vault content
- `.obsidian/workspace.json` — volatile Obsidian UI state, should not be committed

## 8-Stage Operations Flow

Sales and Operations are aligned around these stages:
1. Needs Analysis
2. Proposal and Collaboration Agreement
3. Sourcing and Selection
4. Candidate Confirmation
5. Legal Documentation and Compliance
6. Logistics and Arrival
7. Housing, Orientation and Integration
8. Ongoing Support
