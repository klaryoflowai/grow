import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { listLeads, createLead, updateLead, isConfigured } from "./airtable.js";
import { notify } from "./telegram.js";

// URL-uri reale de pe rabota.md
const CATEGORIES = [
  // Construcții
  { url: "https://www.rabota.md/ro/jobs-moldova-Construcții;", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-muncitori", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-zidari", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-mesteri", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-tencuitori", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-finisori", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-zugravi", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-dulgheri", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/jobs-moldova-betonisti", industrie: "Construcții" },
  // Producție
  { url: "https://www.rabota.md/ro/jobs-moldova-Producție;", industrie: "Producție" },
  { url: "https://www.rabota.md/ro/jobs-moldova-sudori", industrie: "Producție" },
  { url: "https://www.rabota.md/ro/jobs-moldova-lacatusi", industrie: "Producție" },
  { url: "https://www.rabota.md/ro/jobs-moldova-operatori", industrie: "Producție" },
  { url: "https://www.rabota.md/ro/jobs-moldova-ambalatori", industrie: "Producție" },
  // Depozitare / Logistică
  { url: "https://www.rabota.md/ro/jobs-moldova-Depozitare;", industrie: "Depozitare" },
  { url: "https://www.rabota.md/ro/jobs-moldova-hamali", industrie: "Depozitare" },
  { url: "https://www.rabota.md/ro/jobs-moldova-sortatori", industrie: "Depozitare" },
  // Necalificați — transversal tuturor industriilor
  { url: "https://www.rabota.md/ro/jobs-moldova-necalificati", industrie: "Construcții" },
  // Agricultură
  { url: "https://www.rabota.md/ro/jobs-moldova-Agricultură;", industrie: "Agricultură" },
  { url: "https://www.rabota.md/ro/jobs-moldova-culegatori", industrie: "Agricultură" },
  // HoReCa
  { url: "https://www.rabota.md/ro/jobs-moldova-HoReCa;", industrie: "HoReCa" },
  { url: "https://www.rabota.md/ro/jobs-moldova-bucatari", industrie: "HoReCa" },
  { url: "https://www.rabota.md/ro/jobs-moldova-ospatari", industrie: "HoReCa" },
];

const VOLUME_EXCLUDE = [
  "1 persoană", "o persoană", "un angajat", "1 post", "singur angajat",
];

// Titluri/fraze care indică că persoana CAUTĂ loc de muncă, nu angajează
const JOBSEEKER_EXCLUDE = [
  "caut de lucru", "caut lucru", "caut un loc", "caut serviciu",
  "îmi caut", "imi caut", "disponibil pentru", "mă ofer", "ma ofer",
  "ofer servicii", "ofer munca", "ofer muncă",
];

function isJobOffer(titlu, descriere = "") {
  const text = `${titlu} ${descriere}`.toLowerCase();
  return !JOBSEEKER_EXCLUDE.some((kw) => text.includes(kw));
}

function matchesVolumeFilter(titlu, descriere = "") {
  const text = `${titlu} ${descriere}`.toLowerCase();
  if (VOLUME_EXCLUDE.some((kw) => text.includes(kw.toLowerCase()))) return false;
  return true;
}

function toIsoDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return isNaN(d.getTime()) ? str.trim() : d.toISOString().slice(0, 10);
}

async function scrapeCategory(page, category) {
  const leads = [];
  let pageNum = 1;

  while (true) {
    // Rabota.md pagination: adaugam /pageN; la sfarsit
    const url = pageNum === 1
      ? category.url
      : category.url.replace(";", "") + `/page${pageNum};`;
    console.log(`  Pagina ${pageNum}: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.error(`  Eroare navigare: ${e.message}`);
      break;
    }

    const finalUrl = page.url();
    const title = await page.title();
    console.log(`  URL final: ${finalUrl} | Titlu: ${title}`);

    // Salvam debug pentru prima pagina din fiecare categorie
    if (pageNum === 1) {
      try {
        mkdirSync("debug", { recursive: true });
        const slug = category.industrie.replace(/[^\w]/g, "_");
        await page.screenshot({ path: `debug/${slug}.png`, fullPage: false });

        // Logam toate linkurile de pe pagina — sa vedem structura
        const allLinks = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"))
            .map((a) => ({ text: a.textContent.trim().slice(0, 60), href: a.href }))
            .filter((l) => l.href.includes("rabota.md") && l.text.length > 3)
            .slice(0, 20)
        );
        console.log(`  Toate link-urile gasite:`);
        allLinks.forEach((l) => console.log(`    "${l.text}" → ${l.href}`));

        // Primele clase CSS
        const classes = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll("[class]")).slice(0, 60);
          return [...new Set(els.flatMap((el) => el.className.toString().split(/\s+/)).filter(Boolean))].slice(0, 25);
        });
        console.log(`  Clase CSS: ${classes.join(", ")}`);

        writeFileSync(`debug/${slug}.html`, (await page.content()).slice(0, 10000));
      } catch (e) {
        console.log(`  Debug error: ${e.message}`);
      }
    }

    // Strategie 1: gasim carduri prin linkuri care arata ca anunturi individuale
    // Pe rabota.md, anunturile individuale au URL diferit de categoria curenta
    const categoryBase = category.url.replace(";", "").toLowerCase();
    const jobCards = await page.evaluate((catBase) => {
      const seen = new Set();
      const results = [];

      // Incercam mai multi selectori
      const cardSelectors = [
        ".job-item", ".vacancy-item", ".job-card", ".vacancy-card",
        "[class*='job-item']", "[class*='vacancy-item']", "[class*='job-card']",
        "article", "li.job", ".search-result-item",
      ];

      for (const sel of cardSelectors) {
        const els = Array.from(document.querySelectorAll(sel));
        for (const el of els) {
          const link = el.querySelector("a[href]") || (el.tagName === "A" ? el : null);
          if (!link) continue;
          const href = link.href || "";
          // Excludem linkuri care sunt categoria insasi
          if (!href.includes("rabota.md")) continue;
          if (href.toLowerCase().replace(";", "") === catBase) continue;
          if (seen.has(href)) continue;
          seen.add(href);

          const titleEl = el.querySelector("h1, h2, h3, h4, [class*='title'], [class*='name'], strong") || link;
          const companyEl = el.querySelector("[class*='company'], [class*='employer'], [class*='firm']");
          const dateEl = el.querySelector("time, [datetime], [class*='date'], [class*='data']");

          results.push({
            titlu: titleEl?.textContent?.trim() || "",
            companie: companyEl?.textContent?.trim() || "",
            data: dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "",
            url: href,
          });
        }
        if (results.length > 0) break; // am gasit ceva, nu mai incercam alti selectori
      }

      // Fallback: gasim direct orice link care arata a anunt individual
      if (results.length === 0) {
        Array.from(document.querySelectorAll("a[href]")).forEach((a) => {
          const href = a.href;
          if (!href.includes("rabota.md")) return;
          if (href.toLowerCase().replace(";", "") === catBase) return;
          // Anunturile individuale au de obicei un ID numeric sau un slug mai lung
          if (!/jobs-moldova.*-\w{5,}|vacancy|job\/\d|anunt\/\d/i.test(href)) return;
          if (seen.has(href)) return;
          seen.add(href);
          results.push({
            titlu: a.textContent.trim(),
            companie: "",
            data: "",
            url: href,
          });
        });
      }

      return results;
    }, categoryBase);

    console.log(`  ${jobCards.length} carduri gasite cu strategia combinata`);

    if (jobCards.length === 0) {
      console.log("  Niciun anunt gasit pe aceasta pagina — oprire.");
      break;
    }

    const validCards = jobCards.filter((c) => c.url && c.titlu && c.titlu.length > 3);
    for (const card of validCards) {
      if (!isJobOffer(card.titlu)) continue;
      if (!matchesVolumeFilter(card.titlu)) continue;
      leads.push({ ...card, industrie: category.industrie });
    }

    // Verificam paginarea
    const hasNext = await page.$("a[rel='next'], .pagination a.next, [class*='pagination'] a[class*='next'], a[aria-label*='urmatoare'], a[aria-label*='next']");
    if (!hasNext) break;
    pageNum++;
    if (pageNum > 15) break;
  }

  return leads;
}

async function getContactDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    const details = await page.evaluate(() => {
      const phoneEl = document.querySelector("a[href^='tel:'], [class*='phone'], [class*='telefon']");
      const emailEl = document.querySelector("a[href^='mailto:'], [class*='email']");
      const companyEl = document.querySelector("[class*='company-name'], [class*='employer-name'], [class*='firma']");
      return {
        telefon: phoneEl?.href?.replace("tel:", "") || phoneEl?.textContent?.trim() || "",
        email: emailEl?.href?.replace("mailto:", "") || emailEl?.textContent?.trim() || "",
        companie: companyEl?.textContent?.trim() || "",
      };
    });

    return details;
  } catch {
    return { telefon: "", email: "", companie: "" };
  }
}

async function main() {
  if (!isConfigured()) {
    console.error("AIRTABLE_TOKEN sau AIRTABLE_BASE_ID lipsesc. Oprire.");
    process.exit(1);
  }

  console.log("Încarc lead-urile existente din Airtable...");
  const existing = await listLeads();
  const existingByUrl = new Map(
    existing.filter((r) => r.fields?.URL).map((r) => [r.fields.URL, r])
  );
  console.log(`${existingByUrl.size} lead-uri existente în Airtable.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "ro-RO",
    extraHTTPHeaders: { "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8" },
  });
  const page = await context.newPage();

  let nou = 0;
  let actualizat = 0;

  for (const category of CATEGORIES) {
    console.log(`\nScanez categoria: ${category.industrie}`);
    const leads = await scrapeCategory(page, category);
    console.log(`${leads.length} anunțuri filtrate în ${category.industrie}`);

    for (const lead of leads) {
      if (!lead.url) continue;

      const dataAzi = toIsoDate(lead.data) || new Date().toISOString().slice(0, 10);
      const existingLead = existingByUrl.get(lead.url);

      if (!existingLead) {
        const contact = await getContactDetails(page, lead.url);

        const fields = {
          "Titlu Job": lead.titlu,
          "Companie": contact.companie || lead.companie,
          "Industrie": lead.industrie,
          "URL": lead.url,
          "Data Postare": dataAzi,
          "Data Actualizare": dataAzi,
          "Telefon": contact.telefon,
          "Email": contact.email,
          "Status": "Nou",
          "Prima data vazut": new Date().toISOString().slice(0, 10),
        };

        await createLead(fields);
        nou++;
        existingByUrl.set(lead.url, { fields });

        await notify(
          `🆕 <b>Lead nou — ${lead.industrie}</b>\n` +
          `<b>Companie:</b> ${fields["Companie"] || "Necunoscută"}\n` +
          `<b>Job:</b> ${lead.titlu}\n` +
          (contact.telefon ? `📞 ${contact.telefon}\n` : "") +
          (contact.email ? `📧 ${contact.email}\n` : "") +
          `🔗 ${lead.url}`
        );

        await page.waitForTimeout(800);
      } else {
        const dataExistenta = existingLead.fields?.["Data Actualizare"] || existingLead.fields?.["Data Postare"] || "";
        if (dataAzi && dataAzi !== dataExistenta) {
          await updateLead(existingLead.id, { "Data Actualizare": dataAzi, "Status": "Actualizat" });
          actualizat++;

          await notify(
            `🔄 <b>Anunț actualizat — ${lead.industrie}</b>\n` +
            `<b>Companie:</b> ${existingLead.fields?.["Companie"] || "Necunoscută"}\n` +
            `<b>Job:</b> ${lead.titlu}\n` +
            `🔗 ${lead.url}`
          );
        }
      }
    }
  }

  await browser.close();
  console.log(`\nRezultat: ${nou} lead-uri noi, ${actualizat} actualizate.`);
}

main().catch((err) => {
  console.error("Eroare fatală:", err);
  process.exit(1);
});
