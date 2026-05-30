# Airtable Schema: Lead Measures Daily

Foloseste o tabela separata `Lead Measures Daily` pentru executia zilnica inspirata din `$100M Leads`.

Aceasta tabela alimenteaza:

- cardul `Key Lead Measures`
- formularul zilnic de pe pagina `Scorecard`
- totalul zilnic / saptamanal / lunar pentru vizite fizice

## Structura recomandata

| Field | Type | Observatii |
| --- | --- | --- |
| `Date` | Date | O zi = un singur rand |
| `Cold Calls` | Number | Optional / mirror automat. Dashboard-ul calculeaza `Apel rece` din companiile mutate din `Necontactat` in alt stadiu. |
| `WhatsApp Messages` | Number | Legacy / optional. Nu mai apare in scoreboard-ul principal. |
| `Field Visits` | Number | Vizite fizice / networking |
| `Warm Outreach` | Number | Legacy / optional. Nu mai apare in scoreboard-ul principal. |
| `Notes` | Long text | Observatii operationale scurte |

## Regula de lucru

- Un rand = o zi.
- Nu duplica aceeasi data pe mai multe randuri.
- Daca vrei sa actualizezi ziua, editezi randul existent.
- Dashboard-ul citeste aceasta tabela pentru vizite fizice si note.
- `Apel rece` se calculeaza automat din pipeline: companie trecuta din `Necontactat` in orice alt stadiu.
- `Followups` se calculeaza automat din activitati live pe companii deja contactate anterior.

## Legatura cu celelalte tabele

- `Targets` tine planul zilnic / saptamanal / lunar, inclusiv `Moved Companies Weekly` pentru cardul de ritm.
- `Lead Measures Daily` tine executia reala de zi cu zi.
- `Scorecard` ramane snapshot-ul saptamanal de vineri.
