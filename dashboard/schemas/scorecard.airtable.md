# Airtable Schema: Scorecard

Foloseste o tabela separata `Scorecard` pentru datele saptamanale.

Aceasta tabela alimenteaza:

- `The Power Three`
- `Velocity si funnel efficiency`
- `Lead Measures`
- `Pâlnia de output si bottleneck`
- `Evolutia ultimelor saptamani`
- formularul `Completeaza scorecard-ul de vineri`

## Structura recomandata

| Field | Type | Observatii |
| --- | --- | --- |
| `Week Start` | Date | Lunea saptamanii respective |
| `Week End` | Date | Duminica saptamanii respective |
| `Week Key` | Single line text | Valoare unica, de forma `YYYY-MM-DD` |
| `Week Label` | Single line text | Ex: `20 apr. - 26 apr. 2026` |
| `New Contract Workers MTD` | Number | Numar total de muncitori semnati in contracte noi in luna curenta |
| `Dream100 P1 Prospects` | Number | Cate companii P1 noi au fost abordate in saptamana |
| `Sales Velocity Days` | Number | Media de zile de la lead la contract semnat |
| `Cold Calls` | Number | Optional / mirror automat pentru companiile mutate din `Necontactat` in pipeline |
| `WhatsApp Messages` | Number | Legacy / optional |
| `Field Visits` | Number | Vizite in teren / networking |
| `Warm Outreach` | Number | Legacy / optional |
| `Meetings Set` | Number | Meetings confirmate |
| `Offers Sent` | Number | Oferte trimise |
| `Contracts Signed` | Number | Contracte semnate |
| `Workers Signed` | Number | Volum muncitori semnati |
| `Workers Delivered` | Number | Muncitori livrati efectiv |
| `Notes` | Long text | Observatii, blocaje, pattern-uri |

## Regula de lucru

- Un rand = o saptamana.
- `Week Start` este cheia operationala principala.
- Dashboard-ul cauta saptamana curenta dupa `Week Start` / `Week Key`.
- Dashboard-ul calculeaza majoritatea indicatorilor din `Activities`, `Companies` si `Lead Measures Daily`.

## Ce NU intra aici

Nu pune datele zilnice in `Scorecard`.

Pentru panoul `Ultimele 7 zile`, foloseste tabela separata `Scorecard Trend`.

Pentru executia zilnica `Field Visits`, foloseste tabela separata `Lead Measures Daily`. `Cold Calls` si `Followups` se calculeaza automat din pipeline si activitati.
