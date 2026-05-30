# P1 Account Command Prompts

Date: 2026-05-24  
type: script

## Purpose

These are AI command prompts for working with P1 accounts. They are not all implemented as Telegram commands yet.

## `/grow-p1-brief <company>`

Return:

- sector and pain hypothesis;
- likely worker profiles;
- fear/objection profile;
- decision-maker access paths;
- proof asset needed;
- next step for Airtable.

## `/grow-p1-access-map <company>`

Return:

- warm intro path;
- operational satellite path;
- fallback cold path;
- sources to verify;
- first message for each route;
- what to log in CRM.

## `/grow-first-touch <company> | <role> | <pain>`

Generate a first-touch message.

Rules:

- max 120 words;
- no generic agency pitch;
- focus on stability, replacements and 24-month continuity;
- do not invent decision makers;
- ask for a small 15-minute next step.

## `/grow-meeting-prep <company>`

Return:

- pain hypotheses;
- SPIN questions;
- Challenger reframe;
- Voss labels;
- qualification/disqualification criteria;
- target next step.

## `/grow-objection <company> | <objection>`

Return:

- fear behind objection;
- Voss label;
- calibrated question;
- short response;
- proof asset needed.

## `/grow-weekly-p1-review`

Return:

- accounts touched;
- real conversations;
- accounts without next step;
- top five actions next week;
- blockers needing proof assets or warm introductions.

## System Prompt

```text
Use Grow context from P1 Top 20, New Sales Simplified, Challenger Sale, Unified Sales Frameworks, Objection Handling and Airtable/Dream 100 rules. Be practical. Do not invent decision makers. Mark unstable people data as to_verify. Every recommendation must create a clear next step in Airtable/CRM.
```

