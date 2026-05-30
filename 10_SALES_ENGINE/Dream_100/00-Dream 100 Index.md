# Dream 100 Index

## Purpose

This folder contains one note per target company.

## Workflow

1. Create a new note from `_Templates/Company Template`.
2. Set `priority`, `industry`, `decision_maker`, and `last_contact`.
3. Link the company note to a pipeline opportunity when the account becomes active.

For the current Airtable-led Dream 300 workflow, use:

- [[Dream-300-Airtable-Workflow]]
- [[P1 Top 20 Strategic Accounts]]
- [[P1 Decision Maker Access Playbook]]

Rule: do not add new target companies before checking them against Airtable `Companies`.

## Fields That Matter Most

- `priority`
- `industry`
- `decision_maker`
- `status`
- `potential_volume`
- `last_contact`
- `next_step`
- `next_step_date`

## Dataview: Priority 1 Accounts Missing Follow-Up

```dataview
TABLE file.link AS "Companie", industry AS "Industrie", decision_maker AS "Decident", status AS "Status", potential_volume AS "Volum", last_contact AS "Ultimul contact", next_step AS "Next step"
FROM "10_SALES_ENGINE/Dream_100"
WHERE type = "company"
AND priority = 1
AND (!last_contact OR date(last_contact) <= date(today) - dur(7 days))
SORT last_contact ASC
```
