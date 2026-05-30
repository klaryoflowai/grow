# Dream 300 peste Airtable

## Verdict

Dream 300 nu devine un CRM separat.

Lista existenta din Airtable `Companies` ramane sursa de adevar. Orice companie noua trebuie verificata contra `Companies` inainte de import, ca sa evitam duplicatele si sa pastram dashboard-ul curat.

## Roluri Nate / Rex

Nate evalueaza fit-ul comercial:

- segment operational
- volum probabil
- potential de echipa, nu doar un om
- urgenta comerciala
- prioritate `P1 / P2 / P3`

Rex valideaza datele:

- deduplicare dupa `IDNO`
- deduplicare dupa nume normalizat
- deduplicare dupa website
- deduplicare dupa telefon
- scor de incredere in date
- verdict `ADD / REVIEW / DUPLICATE`

Regula: fara verdict Rex, compania nu intra in import. Fara scor Nate, compania nu intra in Contact Priority.

## Tool local

Tool-ul sta in:

```bash
/Users/yuritimofte/Desktop/Grow/tools/dream300.js
```

Comenzi principale:

```bash
cd /Users/yuritimofte/Desktop/Grow

# 1. Exporta companiile existente din Airtable Companies
node tools/dream300.js export-companies \
  --out output/dream300/existing-companies.json \
  --limit 2000

# 2. Verifica o lista candidata contra Companies
node tools/dream300.js dedupe \
  --candidates "/Users/yuritimofte/Desktop/SCRAPER GROW/files/companii_moldova_ENRICHED_20260508_1313.xlsx" \
  --existing output/dream300/existing-companies.json \
  --out-dir output/dream300/review-2026-05-12
```

Daca `--existing` lipseste, tool-ul incearca sa citeasca direct Airtable `Companies`.

## Cerinta de env

Pentru citirea live Airtable, in `/Users/yuritimofte/Desktop/Grow` trebuie sa existe `.env.local` sau variabile de environment:

```bash
AIRTABLE_TOKEN=...
AIRTABLE_BASE_ID=...
```

Nu pune token-uri in vault, in AIOS sau in documente.

## Output

Tool-ul genereaza:

- `all-reviewed.csv` - toate companiile candidate cu verdict
- `add.csv` - companii care par noi
- `review.csv` - companii cu risc mediu de duplicare
- `duplicates.csv` - companii care par deja existente
- `summary.json` - totaluri pentru audit

## Regula de import

1. Importam doar `add.csv`.
2. `review.csv` se verifica manual in Airtable inainte de orice import.
3. `duplicates.csv` nu se importa; se foloseste doar pentru completarea datelor existente daca lipsesc telefon, website, IDNO sau sector.
4. Dupa import, companiile noi trebuie sa primeasca:
   - `Stadiu Pipeline = Necontactat`
   - `Sanatate Cont = Gri`
   - `Lead Date = data importului`
   - `Prioritate Grow = P1/P2/P3`, daca exista campul
   - `Next Step`, daca este deja clar cine suna si cand

## Cand cautam companii noi

Ordinea recomandata:

1. Surse deja existente in scraper.
2. Companii din verticale P1 insuficient reprezentate in `Companies`.
3. Companii din teritoriu unde putem face rute de vizite.
4. Lead-uri primite prin parteneri BD.
5. Liste publice sau directoare doar dupa deduplicare.

## Decizie operationala

Acum nu intrebam "mai avem 300 companii?".

Intrebarea buna este:

```text
Care sunt urmatoarele 50 companii net-new, fara duplicare, cu cel mai bun scor Nate si cel mai mic risc Rex?
```
