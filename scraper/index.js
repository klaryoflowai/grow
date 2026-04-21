import { chromium } from "playwright";
import { listLeads, createLead, updateLead, isConfigured } from "./airtable.js";
import { notify } from "./telegram.js";

const CATEGORIES = [
  { url: "https://www.rabota.md/ro/locuri-de-munca/constructii", industrie: "Construcții" },
  { url: "https://www.rabota.md/ro/locuri-de-munca/productie", industrie: "Producție" },
  { url: "https://www.rabota.md/ro/locuri-de-munca/depozit-logistica", industrie: "Depozitare" },
  { url: "https://www.rabota.md/ro/locuri-de-munca/agricultura", industrie: "Agricultură" },
  { url: "https://www.rabota.md/ro/locuri-de-munca/hoteluri-restaurante-cafenele", industrie: "HoReCa" },
];

// Anunțuri care implică echipe / volum mare de personal
const VOLUME_INCLUDE = [
  "echipă", "echipa", "muncitori", "brigada", "brigadă", "angajăm", "angajam",
  "lucrători", "lucratori", "personal", "mai mulți", "mai multi", "mai multe",
  "forță de muncă", "forta de munca", "x2", "x3", "x5", "x10",
  "5+", "10+", "20+", "30+", "50+",
];

// Anunțuri pentru o singură persoană — excludem
const VOLUME_EXCLUDE = [
  "1 persoană", "o persoană", "un angajat", "1 post", "singur angajat",
];

function matchesVolumeFilter(titlu, descriere = "") {
  const text = `${titlu} ${descriere}`.toLowerCase();
  if (VOLUME_EXCLUDE.some((kw) => text.includes(kw.toLowerCase()))) return false;
  // dacă niciun keyword de volum nu e prezent, includem oricum (industria e filtrul principal)
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
    const url = pageNum === 1 ? category.url : `${category.url}?page=${pageNum}`;
    console.log(`  Pagina ${pageNum}: ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
    } catch (e) {
      console.error(`  Eroare navigare: ${e.message}`);
      break;
    }

    // Detectăm cardurile de anunțuri — selectori comuni pe rabota.md
    const cards = await page.$$eval(
      "article.job-item, .vacancy-item, .job-card, [class*='vacancy'], [class*='job-list'] li",
      (els) =>
        els.map((el) => {
          const titleEl = el.querySelector("h2, h3, .title, [class*='title'], a[href*='/job']");
          const companyEl = el.querySelector(".company, [class*='company'], [class*='employer']");
          const dateEl = el.querySelector("time, .date, [class*='date'], [datetime]");
          const linkEl = el.querySelector("a[href*='/job'], a[href*='/vacancy']");

          return {
            titlu: titleEl?.textContent?.trim() || "",
            companie: companyEl?.textContent?.trim() || "",
            data: dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "",
            url: linkEl?.href || "",
          };
        })
    );

    if (cards.length === 0) {
      console.log("  Niciun card găsit — pagina finală sau selector incompatibil.");
      break;
    }

    const validCards = cards.filter((c) => c.url && c.titlu);
    console.log(`  ${validCards.length} anunțuri găsite`);

    for (const card of validCards) {
      if (!matchesVolumeFilter(card.titlu)) continue;
      leads.push({ ...card, industrie: category.industrie });
    }

    // Verificăm dacă există pagina următoare
    const hasNext = await page.$("a[rel='next'], .pagination .next, [class*='next']:not([disabled])");
    if (!hasNext) break;
    pageNum++;
    if (pageNum > 20) break; // limită de siguranță
  }

  return leads;
}

async function getContactDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);

    const details = await page.evaluate(() => {
      const phoneEl = document.querySelector("a[href^='tel:'], .phone, [class*='phone']");
      const emailEl = document.querySelector("a[href^='mailto:'], .email, [class*='email']");
      return {
        telefon: phoneEl?.textContent?.trim() || phoneEl?.href?.replace("tel:", "") || "",
        email: emailEl?.textContent?.trim() || emailEl?.href?.replace("mailto:", "") || "",
      };
    });

    return details;
  } catch {
    return { telefon: "", email: "" };
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
    existing
      .filter((r) => r.fields?.URL)
      .map((r) => [r.fields.URL, r])
  );
  console.log(`${existingByUrl.size} lead-uri existente în Airtable.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
      const existing = existingByUrl.get(lead.url);

      if (!existing) {
        // Lead nou — obținem detalii de contact
        const contact = await getContactDetails(page, lead.url);

        const fields = {
          "Titlu Job": lead.titlu,
          "Companie": lead.companie,
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
          `<b>Companie:</b> ${lead.companie || "Necunoscută"}\n` +
          `<b>Job:</b> ${lead.titlu}\n` +
          (contact.telefon ? `📞 ${contact.telefon}\n` : "") +
          (contact.email ? `📧 ${contact.email}\n` : "") +
          `🔗 ${lead.url}`
        );

        await page.waitForTimeout(800); // pauză între requests
      } else {
        // Lead existent — verificăm dacă data s-a schimbat
        const dataExistenta = existing.fields?.["Data Actualizare"] || existing.fields?.["Data Postare"] || "";
        if (dataAzi && dataAzi !== dataExistenta) {
          await updateLead(existing.id, {
            "Data Actualizare": dataAzi,
            "Status": "Actualizat",
          });
          actualizat++;

          await notify(
            `🔄 <b>Anunț actualizat — ${lead.industrie}</b>\n` +
            `<b>Companie:</b> ${lead.companie || "Necunoscută"}\n` +
            `<b>Job:</b> ${lead.titlu}\n` +
            `🔗 ${lead.url}`
          );
        }
      }
    }
  }

  await browser.close();

  console.log(`\nRezultat: ${nou} lead-uri noi, ${actualizat} actualizate.`);

  if (nou === 0 && actualizat === 0) {
    console.log("Nicio modificare față de rularea anterioară.");
  }
}

main().catch((err) => {
  console.error("Eroare fatală:", err);
  process.exit(1);
});
