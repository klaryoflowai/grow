# RAG Source Map

Date: 2026-05-24  
type: strategy

## Purpose

This note maps the newly imported RAG context into the Grow Sales OS.

The goal is not to create another CRM. Airtable remains the operational source of truth. This vault stores strategy, training, scripts, account hypotheses and reusable AI context.

## Imported Pack

Source archive:

- [[../90_ARCHIVE/Imported-Sources/2026-05-24-RAG-Sales-Books-P1-Accounts/README]]

Operational notes created from the source pack:

- [[Books/New Sales Simplified - Notes]]
- [[Books/The Challenger Sale - Notes]]
- [[Books/Unified Sales Frameworks - Notes]]
- [[../10_SALES_ENGINE/Dream_100/P1 Top 20 Strategic Accounts]]
- [[../10_SALES_ENGINE/Dream_100/P1 Decision Maker Access Playbook]]
- [[../10_SALES_ENGINE/Scripts/P1 Account Command Prompts]]

## RAG Routing Rules

Use this routing when asking AI to generate work:

| Task | Primary source | Must include |
|---|---|---|
| P1 account brief | P1 Top 20 Strategic Accounts | sector pain, access path, next step |
| Decision-maker access | P1 Decision Maker Access Playbook | warm path, operational satellite, proof asset |
| First-touch message | P1 Command Prompts + Challenger | 120 words max, no generic agency pitch |
| Meeting preparation | New Sales Simplified + Challenger | SPIN questions, reframe, qualification |
| Objection handling | Unified Sales Frameworks | Voss label, calibrated question, proof asset |
| Weekly execution | Strategy Map + Dream 100 | Airtable status, next steps, blocked accounts |

## Guardrails

- Do not invent decision makers.
- Treat names from imported documents as `to_verify`.
- Before outreach, check Airtable `Companies`.
- Every active account needs `next_step` and `next_step_date`.
- RAG context should increase pipeline clarity, not create duplicate operating systems.
