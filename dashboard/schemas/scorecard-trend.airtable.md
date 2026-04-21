# Airtable Schema: Scorecard Trend

Foloseste o tabela separata `Scorecard Trend` pentru datele zilnice.

Aceasta tabela alimenteaza:

- sectiunea `Trend`
- blocul `Ultimele 7 zile`

## Structura recomandata

| Field | Type | Observatii |
| --- | --- | --- |
| `Date` | Date | Ziua pentru care raportezi |
| `Contacted` | Number | Numar contacte reale in ziua respectiva |
| `Meetings` | Number | Meetings stabilite sau tinute in ziua respectiva |
| `Offers` | Number | Oferte trimise in ziua respectiva |
| `Contracts` | Number | Contracte semnate in ziua respectiva |
| `Notes` | Long text | Optional: observatii scurte despre zi |

## Regula de lucru

- Un rand = o zi.
- Nu duplica aceeasi data pe mai multe randuri.
- Dashboard-ul ia ultimele 7 zile dupa campul `Date`.
- Daca tabela lipseste, dashboard-ul foloseste fallback din `Activities`.

## Recomandare practica

Completeaza `Scorecard Trend` zilnic sau la final de zi.

Completeaza `Scorecard` saptamanal, vinerea sau lunea pentru saptamana anterioara.
