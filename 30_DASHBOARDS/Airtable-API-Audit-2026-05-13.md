# Airtable API Audit

Data: 2026-05-13  
Proiect: Grow  
Scop: verificare live a consumului Airtable API si optimizari cu risc mic.

## Verdict

Dashboard-ul Grow foloseste Airtable doar prin endpoint-urile `/api/*`, nu direct din browser.

Problema initiala nu era doar `bootstrap`, ci combinatia dintre:

- full bootstrap dupa aproape fiecare write
- read-before-write cu scan complet de tabela
- endpoint-uri inguste care tot cheama `getDashboardData()`

Aceste trei zone au fost reduse in dashboard/API. Bottleneck-ul ramas este mai ales pe comenzile Telegram care cer context complet.

## Masuratori live

### Bootstrap dashboard

Masurat direct prin `getDashboardData()` cu Airtable live:

- `319` companii
- `185` activitati
- `63` randuri in `Contact Priority`
- `4` randuri in `Scorecard Weekly`
- `11` randuri in `Lead Measures Daily`
- `11` call-uri Airtable pe `fresh load`
- `0` call-uri Airtable pe al doilea hit in fereastra de cache intern

Structura actuala:

- `Companies` = 4 request-uri paginate
- `Activities` = 2 request-uri paginate
- `Contact Priority` = 1
- `Targets` = 1
- `Scorecard Weekly` = 1
- `Scorecard Trend` = 1
- `Lead Measures Daily` = 1

Observatie:

request-ul de metadata a disparut dupa completarea `AIRTABLE_TABLE_ID_*` si `AIRTABLE_VIEW_ID_*` in env.

### Dry run backend `createActivity()`

Masurat fara write real in Airtable, cu GET-uri live si write-uri interceptate local:

#### Scenariu `planned follow-up`

- `4` call-uri Airtable
- `2` GET
- `1` PATCH
- `1` POST

Structura:

- `Activities` duplicate check pe `date + company` = 1 request
- `Companies` exact match = 1 request
- `Companies` update = 1 request
- `Activities` create = 1 request

#### Scenariu `live follow-up` pe companie existenta, cu `lead_date` deja mai vechi

- `8` call-uri Airtable
- `5` GET
- `1` PATCH
- `2` POST

Structura:

- `Activities` duplicate check pe `date + company` = 1 request
- `Activities` toate activitatile din ziua curenta = 1 request
- `Companies` exact match = 1 request
- `Companies` update = 1 request
- `Activities` create = 1 request
- `Contact Priority` exact match = 1 request
- `Scorecard Trend` exact match = 1 request
- `Scorecard Trend` upsert = 1 request

Observatie:

- pentru `planned`, flow-ul nu mai incarca istoric de companie sau ziua curenta
- pentru `live follow-up` pe cont deja atins anterior, flow-ul evita acum `companyHistory`, deci scoate un GET din `Activities`
- pentru `first touch` pe companie noua, flow-ul ramane la `11` call-uri, pentru ca are nevoie de:
  - `duplicate check`
  - `companyHistory`
  - `same-day activities`
  - sync pe `Scorecard Weekly`
  - sync pe `Scorecard Trend`
- daca activitatea este `first touch`, `meeting`, `offer` sau `contract_signed`, flow-ul poate urca din nou fiindca trebuie sa atinga si `Scorecard Weekly`
- frontend-ul nu mai face acum `refreshData()` global dupa acest flow

### Dry run backend `upsertCompany()`

Masurat fara write real in Airtable:

- `2` call-uri backend Airtable
- `1` GET exact match pe companie
- `1` PATCH pe companie

Din frontend, acest refresh global a fost eliminat.

### Telegram command profiles

Masurat pe profile Telegram cu `fresh load`, dupa refactor:

- `next` = `7` call-uri Airtable
- `today` = `7`
- `morning` = `8`
- `focus` = `8`
- `week` = `7`
- `pipeline` = `5`
- `scorecard` = `1`
- `targets` = `3`
- `a_list` = `5`
- `evening` = `7`
- `weekly_review` = `8`
- `intel` = `7`

Interpretare:

- comenzile Telegram nu mai trec prin `getDashboardData()` complet
- fiecare comanda incarca doar tabelele strict necesare pentru acel raspuns
- profilele bazate pe activitati saptamanale citesc acum doar fereastra necesara din `Activities`
- `targets` nu mai incarca `Companies`; foloseste doar `Activities + Targets + Lead Measures Daily`
- `scorecard` si `targets` au devenit foarte ieftine

## Ce am optimizat acum

In [api/_lib/airtable.js](/Users/yuritimofte/Desktop/Grow/api/_lib/airtable.js):

- `listRecords()` suporta acum `filterByFormula`, `maxRecords`, `pageSize`, `sort` si `view override`
- `getDashboardData()` are cache intern cu TTL scurt controlat prin `AIRTABLE_CACHE_TTL_MS`
- lookup-urile punctuale nu mai scaneaza tabele intregi pentru:
  - `Companies`
  - `Targets`
  - `Scorecard Weekly`
  - `Scorecard Trend`
  - `Lead Measures Daily`
  - `Contact Priority`
- `createActivity()` nu mai incarca complet `Activities`, ci doar:
  - activitatile relevante pentru `duplicate check`
  - istoricul companiei pana la data curenta
  - activitatile din ziua curenta pentru trend
- `createActivity()` foloseste acum contextul existent din `Companies.lead_date`:
  - `planned` nu mai incarca deloc istoric/trend
  - `live follow-up` pe cont deja atins evita citirea `companyHistory`
- endpoint-urile GET inguste nu mai trec prin `getDashboardData()`:
  - `/api/companies`
  - `/api/activities`
  - `/api/targets`
  - `/api/scorecard`
  - `/api/scorecard-trend`
  - `/api/lead-measures-daily`
- comenzile Telegram si cron-urile `morning/evening` nu mai folosesc `getDashboardData()` complet
- loader-ul Telegram aplica `activityRange` pe `Activities` si `leadMeasuresRange` pe `Lead Measures Daily`
- comanda Telegram `/targets` foloseste un flux fara rezolvare de companii, deci evita cele `4` call-uri pe `Companies`
- dashboard-ul nu mai face `refreshData()` global dupa write; foloseste delta returnat de endpoint
- manual refresh foloseste `/api/bootstrap?fresh=1`, deci bypass-eaza cache-ul intern la cerere
- `created_at` in activitati este tratat corect ca `Date`, nu ca string

## Ce NU am schimbat inca

- nu exista inca invalidare granulata pe tabele; pe write se invalideaza cache-ul Airtable din proces
- cache-ul este in-memory pe instanta, nu shared intre mai multe instante serverless
- comenzile Telegram `today/morning/focus/week/evening/weekly_review` inca au nevoie de `Companies + Activities`, deci sunt inerent mai grele decat `targets` sau `scorecard`
- `next` si `intel` inca citesc `Activities` fara fereastra de timp, pentru ca raspunsurile lor se bazeaza pe ultimul touch relevant per cont
- `/log` pe `first touch` sau pe activitati care misca `Scorecard Weekly` ramane mai scump decat un follow-up simplu, fiindca are nevoie de context suplimentar si sync pe scorecard

## Faza 2 recomandata

1. Copiem `AIRTABLE_TABLE_ID_*`, `AIRTABLE_VIEW_ID_*` si `AIRTABLE_CACHE_TTL_MS` si in Vercel.
2. Daca volumetria creste, trecem de la cache global invalidat complet la invalidare pe scope/tabela.
3. Daca apar spike-uri de trafic, facem snapshot dedicat pentru brief-urile Telegram.
4. Optional: pentru `today/week/evening/weekly_review`, putem introduce tabele agregate dedicate daca vrem sa coboram si mai mult costul pe `Activities`.

## Concluzie

Am redus deja costul backend pe write-path-urile cele mai importante si am scos refresh-ul global din dashboard.

Castigul mare ramas este pe partea de cache strategy + eventual agregate dedicate pentru comenzile bazate pe `Activities`:

```text
mai putine scanari pe Activities pentru briefing-urile operationale = urmatoarea economie majora
```
