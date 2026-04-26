# Grow Bot - Telegram Briefings

## Scop

`Grow Bot` este layer-ul de automatizare care trimite 2 briefing-uri Telegram pe baza datelor reale din dashboard si Airtable:

- `08:00` -> ce trebuie miscat azi
- `19:00` -> ce s-a facut azi si ce ramane pentru maine

Nu este un CRM separat. Botul doar citeste din sistemul existent si trimite rezumatul intr-un format foarte scurt.

Setup tehnic complet:

- [[04-Grow Bot - Setup Pas cu Pas]]

## Sursa de adevar

Botul foloseste aceleasi date ca dashboard-ul:

- `Companies`
- `Activities`
- `Targets`
- `Lead Measures Daily`

Nu exista introducere separata de date pentru bot.

## Ce trimite dimineata

Endpoint: `/api/telegram-morning`

Briefing-ul de dimineata include:

- focus-ul zilei
- conturi intarziate
- conturi de facut azi
- conturi reci peste 7 zile
- top taskuri de follow-up
- `Key Lead Measures`:
  - `Apel rece`
  - `WhatsApp personalizat`
  - `Vizita fizica`
  - `Warm Outreach`
- cadenta saptamanii:
  - companii miscate
  - companii noi
  - follow-up
  - touch-uri totale

## Ce trimite seara

Endpoint: `/api/telegram-evening`

Briefing-ul de seara include:

- rezultate azi:
  - contacte
  - meetings
  - oferte
  - contracte
- `Key Lead Measures` pentru azi / saptamana / luna
- ultimele actiuni salvate
- ce cere atentie maine
- cadenta curenta a saptamanii

## Comenzi Telegram

Botul poate raspunde si la comenzi primite in chat.

Comenzi disponibile:

- `/intel Nume Companie`
- `/intel+ Nume Companie`
- `/log Companie | tip | rezultat | next step | data | note`
- `/plan Companie | next step | data | note`
- `/focus`
- `/today`
- `/week`
- `/pipeline`
- `/scorecard`
- `/targets`
- `/next`
- `/a-list`
- `/help`

Exemplu:

- `/intel GARMA-GRUP`
- `/intel+ GARMA-GRUP`
- `/log GARMA-GRUP | whatsapp | Mesaj WhatsApp trimis | call followup | maine`
- `/plan GARMA-GRUP | call Valentin | maine | dupa 10:00`
- `/focus`
- `/today`
- `/week`
- `/pipeline`
- `/scorecard`
- `/targets`
- `/next`
- `/a-list`

Raportul de intelligence combina:

- datele interne din Airtable
- activitatea recenta salvata
- semnale publice rapide
- noutati recente
- unghi de abordare recomandat

## Variabile necesare

In Vercel trebuie sa existe:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`

Important:

- in Vault pastram doar numele variabilelor
- nu salvam aici valorile reale ale token-ului sau secretului

## Logica operationala

Botul functioneaza bine doar daca disciplina de date ramane simpla:

- fiecare touch real se salveaza in `Activities`
- `Next Step` si `Next Step Date` se mentin la zi pentru conturile in miscare
- `Lead Measures Daily` se completeaza zilnic
- `Parcat` + `Data reactivare` se folosesc pentru lead-urile pe standby

## Testare

Preview fara trimitere reala:

- `/api/telegram-morning?key=CRON_SECRET&dryRun=1`
- `/api/telegram-evening?key=CRON_SECRET&dryRun=1`

Acest mod este bun pentru:

- verificare text
- verificare cifre
- verificare ca datele din dashboard sunt interpretate corect

## Programare gratuita

Scheduler recomandat: `cron-job.org`

Job-uri:

- `08:00 Europe/Chisinau` -> `/api/telegram-morning?key=CRON_SECRET`
- `19:00 Europe/Chisinau` -> `/api/telegram-evening?key=CRON_SECRET`

Avantaj:

- ramane gratuit
- nu depinde de limitarile Vercel Hobby pentru cron

Pentru comenzile Telegram, botul foloseste un webhook separat.

## Checklist rapid

Inainte sa consideram botul "live":

- botul Telegram este creat in `@BotFather`
- botul a primit deja macar un mesaj de la contul meu
- `TELEGRAM_CHAT_ID` este verificat
- `CRON_SECRET` este setat
- endpoint-urile merg in `dryRun`
- mesajele arata corect in romana
- apoi activez job-urile din `cron-job.org`

## Daca ceva nu merge

Verific in aceasta ordine:

1. `dryRun` raspunde corect
2. `TELEGRAM_BOT_TOKEN` este valid
3. `TELEGRAM_CHAT_ID` este corect
4. `CRON_SECRET` din URL este identic cu cel din Vercel
5. datele exista in `Activities`, `Companies` si `Lead Measures Daily`

## Decizie de sistem

`Grow Bot` nu este locul unde scriem date.

Sistemul ramane:

- introducere date in dashboard / Airtable
- sumar automat in Telegram

Deci Telegram este stratul de executie si focus, nu stratul de operare.
