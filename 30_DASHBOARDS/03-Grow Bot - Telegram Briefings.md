# Grow Bot - Telegram Briefings

## Scop

`Grow Bot` este layer-ul de automatizare care trimite briefing-uri Telegram pe baza datelor reale din dashboard si Airtable:

- `08:00` zile lucratoare -> cele 3 prioritati ale Directorului BD & Sales
- `08:00` optional -> ce trebuie miscat azi, in format complet
- `19:00` -> ce s-a facut azi si ce ramane pentru maine
- `vineri 18:00` -> review saptamanal de tip board de experti

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

Endpoint scurt pentru Director: `/api/telegram-morning?mode=priorities`

Briefing-ul de 08:00 pentru zile lucratoare include 3 prioritati comerciale si 3 task-uri de implementare HQ:

- `Pipeline cald / risc` — follow-up-uri intarziate sau next step-uri programate azi
- `Pipeline nou in Productie` — primele companii din Contact Priority / A-List
- `Disciplina de sistem` — log CRM, next step, data, AI logging si follow-up
- `Implementare HQ` — 3 task-uri rotative pe zile: CRM/AI Memory, scoring, dashboard, Sales-CS-Ops, proof assets, scripturi sau weekly review

Scopul este sa ramana actionabil pe telefon, nu sa devina raport lung.

Comenzi utile pentru ajustare:

- `/priorities` sau `/priority` — regenereaza cele 3 prioritati
- `/focus` — vezi follow-up + A-list + lead measures
- `/plan Companie | next step | azi/maine | note` — inlocuieste sau adauga un next step
- `/log Companie | apel | rezultat | next step | maine | note` — marcheaza progresul
- `/hq done 1 | note` — marcheaza un task HQ finalizat
- `/hq move 2 | maine | note` — muta un task HQ pe alta zi
- `/hq done all | note` — marcheaza toate cele 3 task-uri HQ finalizate
- `/note grow | text` — salveaza o nota zilnica in vault, queue Grow
- `/note soia | text` — salveaza o nota zilnica in vault, queue SOIA general
- `/note founder | text` — salveaza o nota zilnica in vault, queue Founder OS

## Daily Notes Catre Vault

Comanda `/note` este pentru context, nu pentru pipeline operational.

Regula:

- `/log` si `/plan` scriu in Airtable, pentru activitati comerciale si follow-up.
- `/note` scrie in vault-ul SOIA, in fisiere Markdown de tip queue/standby.
- Daca Codex nu este conectat live la Mac, nota ramane in repo-ul vault ca standby pana cand Codex se reconecteaza si proceseaza queue-ul.

Rute:

| Comanda | Queue in vault | Cand se foloseste |
|---|---|---|
| `/note grow | ...` | `20_Projects/Grow/Inbox/Telegram-Daily-Notes-Queue.md` | observatii despre Grow, vanzari, clienti, HQ, echipa |
| `/note soia | ...` | `00_Inbox/Telegram-Daily-Notes-Queue.md` | idei generale SOIA / KlaryoFlow / AIOS |
| `/note founder | ...` | `09_Founder_OS/00 - INBOX/Telegram-Daily-Notes-Queue.md` | reflectii personale, energie, principii, decizii personale |

Exemple:

- `/note grow | Rodals intreaba mai mult despre stabilitate si inlocuiri decat despre comision`
- `/note soia | clientii vor control de pe telefon, nu dashboard complicat`
- `/note founder | prospectarea merge mai bine dimineata, dupa 14:00 scade energia`

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

## Ce trimite vineri: Weekly Expert Board Review

Endpoint: `/api/telegram-evening?weeklyReview=1`

Review-ul saptamanal foloseste datele din Airtable si contextul din Vault:

- `Scorecard Weekly`
- `Lead Measures Daily`
- `Activities`
- `Companies`
- `Contact Priority`
- note din activitati si intalniri
- `Next Step` si `Next Step Date`
- modificari de stadiu din `Data Schimbare Stadiu`
- `Stadiu Pipeline`
- `Sanatate Cont`
- context strategic din Strategy Map, 4DX, Scaling Up si ICP

Review-ul raspunde la:

- ce rezultate au fost obtinute fata de WIG si Rocks
- unde trebuie disciplina mai stricta
- ce trebuie imbunatatit in cadenta de sales
- ce recomandari are board-ul de experti
- cum crestem vanzarile in saptamana urmatoare
- ce clienti noi si sectoare merita abordate
- ce unghiuri de mesaj trebuie testate

Board-ul de experti simulat:

- Sales Strategy Advisor
- 4DX Execution Coach
- RevOps / Pipeline Analyst
- Dream 100 Prospecting Coach
- Customer Success / Delivery Risk Advisor

## Comenzi Telegram

Botul poate raspunde si la comenzi primite in chat.

Comenzi disponibile:

- `/intel Nume Companie`
- `/intel+ Nume Companie`
- `/log Companie | tip | rezultat | next step | data | note`
- `/plan Companie | next step | data | note`
- `/hq done 1 | note`
- `/hq move 2 | data | note`
- `/hq note text`
- `/note grow | text`
- `/note soia | text`
- `/note founder | text`
- `/priorities`
- `/priority`
- `/focus`
- `/today`
- `/week`
- `/review`
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
- `/hq done 1 | CRM curatat si next step-uri setate`
- `/hq move 2 | maine | prins in meeting client`
- `/hq done all | toate task-urile HQ finalizate`
- `/note grow | insight din apeluri despre costul total`
- `/note soia | idee pentru Daily Brief`
- `/note founder | observatie despre energia mea azi`
- `/priorities`
- `/focus`
- `/today`
- `/week`
- `/review`
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
- `OPENAI_API_KEY`
- `OPENAI_WEEKLY_REVIEW_MODEL`
- `VAULT_GITHUB_OWNER`
- `VAULT_GITHUB_REPO`
- `VAULT_GITHUB_BRANCH`
- `VAULT_GITHUB_TOKEN`
- `VAULT_NOTES_TIMEZONE`

Important:

- in Vault pastram doar numele variabilelor
- nu salvam aici valorile reale ale token-ului sau secretului
- `VAULT_GITHUB_TOKEN` trebuie sa fie token GitHub fine-grained cu acces `Contents: Read and write` doar pe repo-ul `klaryoflowai/SOIA`
- comanda `/note` scrie in vault, nu in Airtable

## Logica operationala

Botul functioneaza bine doar daca disciplina de date ramane simpla:

- fiecare touch real se salveaza in `Activities`
- `Next Step` si `Next Step Date` se mentin la zi pentru conturile in miscare
- `Lead Measures Daily` se completeaza zilnic
- `Parcat` + `Data reactivare` se folosesc pentru lead-urile pe standby

## Testare

Preview fara trimitere reala:

- `/api/telegram-morning?key=CRON_SECRET&dryRun=1`
- `/api/telegram-morning?mode=priorities&key=CRON_SECRET&dryRun=1`
- `/api/telegram-evening?key=CRON_SECRET&dryRun=1`
- `/api/telegram-evening?weeklyReview=1&key=CRON_SECRET&dryRun=1`
- `/api/telegram-evening?weeklyReview=1&key=CRON_SECRET&force=1`

Acest mod este bun pentru:

- verificare text
- verificare cifre
- verificare ca datele din dashboard sunt interpretate corect

## Programare gratuita

Scheduler recomandat: `cron-job.org`

Job-uri:

- `08:00 Europe/Chisinau`, luni-vineri -> `/api/telegram-morning?mode=priorities&key=CRON_SECRET`
- optional `08:05 Europe/Chisinau`, luni-vineri -> `/api/telegram-morning?key=CRON_SECRET`
- `19:00 Europe/Chisinau` -> `/api/telegram-evening?key=CRON_SECRET`
- `18:00 vineri Europe/Chisinau` -> `/api/telegram-evening?weeklyReview=1&key=CRON_SECRET&force=1`

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
