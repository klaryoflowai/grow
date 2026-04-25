# Airtable Schema: Lead Measures Daily

Foloseste o tabela separata `Lead Measures Daily` pentru executia zilnica inspirata din `$100M Leads`.

Aceasta tabela alimenteaza:

- cardul `Key Lead Measures`
- formularul zilnic de pe pagina `Scorecard`
- precompletarea lead measures in `Completeaza scorecard-ul de vineri`

## Structura recomandata

| Field | Type | Observatii |
| --- | --- | --- |
| `Date` | Date | O zi = un singur rand |
| `Cold Calls` | Number | Apeluri reci efectuate in ziua respectiva |
| `WhatsApp Messages` | Number | Mesaje WhatsApp personalizate trimise |
| `Field Visits` | Number | Vizite fizice / networking |
| `Warm Outreach` | Number | Outreach cald catre clienti existenti, parteneri sau referrals |
| `Notes` | Long text | Observatii operationale scurte |

## Regula de lucru

- Un rand = o zi.
- Nu duplica aceeasi data pe mai multe randuri.
- Daca vrei sa actualizezi ziua, editezi randul existent.
- Dashboard-ul citeste aceasta tabela pentru totalurile `azi`, `saptamana` si `luna`.

## Legatura cu celelalte tabele

- `Targets` tine planul zilnic / saptamanal / lunar.
- `Lead Measures Daily` tine executia reala de zi cu zi.
- `Scorecard` ramane snapshot-ul saptamanal de vineri.
