// scraper.js
const { chromium } = require("playwright");
const argv = require("minimist")(process.argv.slice(2));

const nomAgence = argv.name;
const villeSlug = argv.slug;
if (!nomAgence || !villeSlug) {
  console.error("Usage: node scraper.js --name \"Nom agence\" --slug \"ville-CP\"");
  process.exit(1);
}

(async () => {
  console.log(`🔍 Debut du scraping pour "${nomAgence}" dans "${villeSlug}"`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const annuaireUrl = `https://www.seloger.com/annuaire/${villeSlug}/`;
  console.log(`→ Navigation vers : ${annuaireUrl}`);
  await page.goto(annuaireUrl, { timeout: 60000 });
  await page.waitForTimeout(3000);

  // 1) Récupération des liens d'agences
  const liens = await page.$$eval("a.c-pa-link", els =>
    els.map(el => ({ nom: el.textContent.trim(), url: el.href }))
  );
  console.log(`✨ Liens trouvés : ${liens.length}`);
  console.log("🔗 Premiers liens :", liens.slice(0, 3));

  // 2) Recherche de l'agence
  const agence = liens.find(a =>
    a.nom.toLowerCase().includes(nomAgence.toLowerCase())
  );
  console.log("🏷️ Nom recherché :", nomAgence);
  console.log("🔎 Agency match :", agence);

  let nbAnnonces = 0;
  if (agence) {
    console.log(`→ Visite de ${agence.url}`);
    await page.goto(agence.url, { timeout: 60000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    const match = html.match(/Biens en vente\s*\((\d+)\)/);
    nbAnnonces = match ? parseInt(match[1], 10) : 0;
    console.log(`✅ Nombre d'annonces extrait : ${nbAnnonces}`);
  } else {
    console.log("⚠️ Aucune agence n'a matché le nom recherché");
  }

  await browser.close();

  console.log("📊 Résultat final :", JSON.stringify({
    nom: agence ? agence.nom : null,
    url: agence ? agence.url : null,
    nbAnnonces
  }));
})();
