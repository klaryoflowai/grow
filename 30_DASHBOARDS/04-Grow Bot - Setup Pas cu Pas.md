# Grow Bot - Setup Pas cu Pas

## Scop

Aceasta nota este checklist-ul tehnic pentru a pune `Grow Bot` live fara costuri suplimentare.

Arhitectura este:

- `Vercel` -> ruleaza endpoint-urile
- `Telegram` -> primeste briefing-urile
- `cron-job.org` -> declanseaza mesajele la orele dorite

## Ce trebuie sa existe deja

Inainte sa incepi:

- dashboard-ul este live pe Vercel
- Airtable este deja conectat
- endpoint-urile exista in repo:
  - `/api/telegram-morning`
  - `/api/telegram-evening`

Documentatia functionala este aici:

- [[03-Grow Bot - Telegram Briefings]]

## Pasul 1 - Creeaza botul in Telegram

1. Deschide Telegram.
2. Cauta `@BotFather`.
3. Trimite comanda `/newbot`.
4. Alege:
   - un nume vizibil pentru bot
   - un username care trebuie sa se termine in `bot`

Exemplu:

- nume: `Grow Bot`
- username: `grow_sales_brief_bot`

5. BotFather iti va da un token.

Acesta este `TELEGRAM_BOT_TOKEN`.

Important:

- nu salva token-ul in Vault
- nu il pune in notite
- il salvezi doar in `Vercel Environment Variables`

## Pasul 2 - Porneste conversatia cu botul

1. Cauta botul nou creat in Telegram.
2. Deschide chat-ul cu el.
3. Trimite un mesaj simplu, de ex.:

`start`

Fara acest pas, `getUpdates` poate sa nu intoarca `chat_id`.

## Pasul 3 - Gaseste TELEGRAM_CHAT_ID

In browser, deschide:

```text
https://api.telegram.org/botTELEGRAM_BOT_TOKEN/getUpdates
```

In raspuns cauti:

- `chat`
- apoi `id`

Acea valoare este `TELEGRAM_CHAT_ID`.

De regula va arata ca un numar, de ex.:

```text
123456789
```

Sau, pentru unele grupuri, poate avea alt format numeric.

## Pasul 4 - Seteaza variabilele in Vercel

Intra in:

- `Vercel`
- proiectul `grow`
- `Settings`
- `Environment Variables`

Adauga:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`

La `CRON_SECRET` foloseste o valoare lunga si greu de ghicit.

Exemplu de format:

```text
grow-brief-2026-very-long-random-secret
```

Important:

- valorile reale raman doar in Vercel
- in Vault pastram doar numele variabilelor

## Pasul 5 - Fa redeploy

Dupa ce salvezi variabilele:

1. mergi in `Deployments`
2. selectezi ultimul deployment
3. apesi `Redeploy`

Sau faci un nou push daca preferi.

## Pasul 6 - Testeaza fara trimitere reala

Testeaza intai modul preview.

Morning:

```text
https://grow-seven-alpha.vercel.app/api/telegram-morning?key=CRON_SECRET&dryRun=1
```

Evening:

```text
https://grow-seven-alpha.vercel.app/api/telegram-evening?key=CRON_SECRET&dryRun=1
```

Inlocuiesti `CRON_SECRET` cu valoarea reala.

Ce trebuie sa verifici:

- raspuns `ok: true`
- mesajul este generat corect
- cifrele au sens
- top taskurile au sens
- `Key Lead Measures` arata bine

## Pasul 7 - Testeaza trimiterea reala

Dupa ce `dryRun` este bun, poti testa o trimitere reala.

Morning real:

```text
https://grow-seven-alpha.vercel.app/api/telegram-morning?key=CRON_SECRET
```

Evening real:

```text
https://grow-seven-alpha.vercel.app/api/telegram-evening?key=CRON_SECRET
```

Daca totul este corect, mesajul trebuie sa vina direct in Telegram.

## Pasul 8 - Configureaza cron-job.org

1. Intra pe `cron-job.org`.
2. Creeaza cont gratuit daca este nevoie.
3. Adauga primul job:

- URL:
  `https://grow-seven-alpha.vercel.app/api/telegram-morning?key=CRON_SECRET`
- schedule:
  `08:00`
- timezone:
  `Europe/Chisinau`
- method:
  `GET`

4. Adauga al doilea job:

- URL:
  `https://grow-seven-alpha.vercel.app/api/telegram-evening?key=CRON_SECRET`
- schedule:
  `19:00`
- timezone:
  `Europe/Chisinau`
- method:
  `GET`

## Pasul 9 - Verificare finala

Botul este considerat live cand:

- `dryRun` merge pentru ambele endpoint-uri
- testul real a trimis mesajul
- job-ul de dimineata este activ
- job-ul de seara este activ

## Pasul 10 - Activeaza comenzile Telegram

Ca botul sa raspunda la comenzi de tip `/intel`, `/intel+`, `/today`, `/pipeline`, `/scorecard`, `/targets`, `/next` sau `/a-list`, activezi webhook-ul o singura data.

1. Deschizi:

```text
https://grow-seven-alpha.vercel.app/api/telegram-webhook-setup?key=CRON_SECRETUL_TAU
```

2. Verifici apoi:

```text
https://grow-seven-alpha.vercel.app/api/telegram-webhook-info?key=CRON_SECRETUL_TAU
```

3. Dupa aceea, in Telegram, ii poti scrie botului:

```text
/intel GARMA-GRUP
/intel+ GARMA-GRUP
/today
/pipeline
/scorecard
/targets
/next
/a-list
```

Sau:

```text
/help
```

## Ce intoarce comanda /intel

Raportul este scurt si gandit pentru primul touch sau pentru pregatirea follow-up-ului:

- snapshot intern din Airtable
- factor de decizie
- telefon
- pipeline / last contact / next step
- semnale de recrutare daca exista
- activitate recenta
- semnale publice rapide
- stiri recente
- unghi recomandat de abordare

## Alte comenzi utile

- `/intel+ Nume Companie`
Versiune extinsa, cu mai mult context, ipoteze de validat si intrebari de calibrare.

- `/today`
Mini brief de executie cu due azi, intarzieri, rezultate live si lead measures pe ziua curenta.

- `/pipeline`
Snapshot scurt cu conturi in miscare, oferta/negociere, semnate, parcate si potential workers in pipeline.

- `/scorecard`
Overview scurt al saptamanii curente din scorecard: Power Three, lead measures si lag measures.

- `/targets`
Progres fata de targetele lunare comerciale si fata de lead measures saptamanale/lunare.

- `/next`
Top follow-up-urile urgente pentru ziua curenta, pe aceeasi logica din Morning Brief.

- `/a-list`
Top 5 companii noi prioritare din `Contact Priority` care nu au inca `Last contact`.

## Troubleshooting rapid

### Nu vine mesajul

Verific:

1. ai trimis macar un mesaj botului in Telegram
2. `TELEGRAM_BOT_TOKEN` este corect
3. `TELEGRAM_CHAT_ID` este corect
4. `CRON_SECRET` din URL este identic cu cel din Vercel
5. deployment-ul nou a fost facut dupa setarea variabilelor

### dryRun merge, dar mesajul real nu vine

Cel mai des problema este una din acestea:

- `TELEGRAM_CHAT_ID` gresit
- nu ai deschis chat-ul cu botul
- token-ul este invalid

### Mesajul vine, dar cifrele nu au sens

Verific:

- `Activities`
- `Companies`
- `Lead Measures Daily`
- `Targets`

Botul nu inventeaza cifre. El doar rezuma datele deja salvate in sistem.

## Regula importanta

`Grow Bot` nu este loc de operare.

Ordinea corecta este:

1. salvez activitatea in dashboard / Airtable
2. dashboard-ul actualizeaza datele
3. Telegram-ul imi trimite rezumatul

Deci botul este stratul de focus, nu stratul in care introduc informatia.
