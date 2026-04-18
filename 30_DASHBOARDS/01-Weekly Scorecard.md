# Weekly Scorecard

## Manual KPIs To Review Every Friday

- new Dream 100 accounts added
- first contacts sent
- meetings booked
- meetings held
- proposals sent
- contracts signed
- workers won
- blocked accounts
- top objections heard

## Dataview: Opportunities Requiring Next Step

```dataview
TABLE file.link AS "Opportunity", company AS "Company", stage AS "Stage", next_step AS "Next step", next_step_date AS "Due"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage != "contract_signed"
AND stage != "lost"
AND next_step_date
SORT next_step_date ASC
```
