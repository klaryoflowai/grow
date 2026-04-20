# Airtable Schema: Scorecard

Foloseste o singura tabela `Scorecard`.

Nu este nevoie de o tabela separata pentru `Scorecard Trend`.
Trendul saptamanal vine natural din faptul ca fiecare rand reprezinta o saptamana.

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
| `Cold Calls` | Number | Total apeluri reci |
| `LinkedIn Messages` | Number | Total mesaje LinkedIn |
| `Field Visits` | Number | Vizite in teren / networking |
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
- Istoricul pentru trendul saptamanal se construieste din ultimele randuri din aceasta tabela.

## Date live in Scorecard

Pagina `Scorecard` foloseste doua surse diferite:

- `Ultimele 7 zile` vine din activitatile zilnice deja salvate in dashboard / Airtable.
- `Evolutia ultimelor saptamani` vine din tabela `Scorecard`.
