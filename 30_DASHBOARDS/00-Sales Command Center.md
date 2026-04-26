# Sales Command Center

Interactive version: open `dashboard/index.html` for the richer web dashboard fed by live CSV sources.

## Automation

- [[03-Grow Bot - Telegram Briefings]]
- [[04-Grow Bot - Setup Pas cu Pas]]

## Focus Today

- review stalled Dream 100 follow-ups
- push next meetings and proposals
- surface signed contracts this month
- watch operational bottlenecks that can block sales confidence

## Priority 1 Companies Not Contacted in 7+ Days

```dataview
TABLE file.link AS "Companie", industry AS "Industrie", decision_maker AS "Decident", status AS "Status", potential_volume AS "Potential volum", last_contact AS "Ultimul contact", next_step AS "Next step"
FROM "10_SALES_ENGINE/Dream_100"
WHERE type = "company"
AND priority = 1
AND (!last_contact OR date(last_contact) <= date(today) - dur(7 days))
SORT last_contact ASC
```

## Pipeline by Stage

```dataview
TABLE WITHOUT ID stage AS "Stage", length(rows) AS "Oportunitati", sum(rows.workers_requested) AS "Potential workers"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage != "lost"
GROUP BY stage
SORT key ASC
```

## Signed Contracts This Month

```dataview
TABLE WITHOUT ID key AS "Period", length(rows) AS "Contracts signed", sum(rows.workers_requested) AS "Workers won", sum(rows.estimated_monthly_value) AS "Estimated monthly value"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage = "contract_signed"
AND signed_date
AND dateformat(date(signed_date), "yyyy-MM") = dateformat(date(today), "yyyy-MM")
GROUP BY dateformat(date(today), "yyyy-MM")
```

## Contract List This Month

```dataview
TABLE file.link AS "Opportunity", company AS "Company", workers_requested AS "Workers", estimated_monthly_value AS "Value", signed_date AS "Signed date"
FROM "10_SALES_ENGINE/Pipeline"
WHERE type = "opportunity"
AND stage = "contract_signed"
AND signed_date
AND dateformat(date(signed_date), "yyyy-MM") = dateformat(date(today), "yyyy-MM")
SORT signed_date DESC
```
