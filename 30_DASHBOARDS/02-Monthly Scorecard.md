# Monthly Scorecard

## Review Areas

- contracts signed
- workers committed
- revenue potential
- stage conversion
- average sales cycle
- biggest lost deal reason
- biggest operations bottleneck

## Dataview: Won Opportunities by Month

```dataview
TABLE WITHOUT ID key AS "Month", length(rows) AS "Contracts", sum(rows.workers_requested) AS "Workers", sum(rows.estimated_monthly_value) AS "Estimated monthly value"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage = "contract_signed"
AND signed_date
GROUP BY dateformat(date(signed_date), "yyyy-MM")
SORT key DESC
```
