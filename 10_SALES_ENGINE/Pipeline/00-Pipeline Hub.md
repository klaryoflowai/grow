# Pipeline Hub

## Purpose

This folder contains one note per active opportunity, not one per company.

## Recommended Stages

- `prospecting`
- `meeting`
- `proposal`
- `contract_review`
- `contract_signed`
- `on_hold`
- `lost`

## Exit Criteria

- `prospecting` -> qualified target, outreach active
- `meeting` -> discovery happened or is scheduled
- `proposal` -> commercial proposal sent
- `contract_review` -> terms under review
- `contract_signed` -> contract executed and handed to Operations

## Dataview: Pipeline by Stage

```dataview
TABLE WITHOUT ID stage AS "Stage", length(rows) AS "Oportunitati", sum(rows.workers_requested) AS "Potential workers"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage != "lost"
GROUP BY stage
SORT stage ASC
```
