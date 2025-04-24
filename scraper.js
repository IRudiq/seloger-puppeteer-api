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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1) Aller sur l'annuaire
  const annuaireUrl = `https://www.seloger.com/annuaire/${villeSlug}/`;
  await page.goto(annuaireUrl);
  await page.waitForTimeout(3000);

  // 2) Récupérer les liens d'agences
  const liens = await page.$$eval("a.c-pa-link", els =>
    els.map(el => ({ nom: el.textContent.trim(), url: el.href }))
  );

  // 3) Trouver celle qui matche
  const agence = liens.find(a =>
    a.nom.toLowerCase().includes(nomAgence.toLowerCase())
  );

  let nbAnnonces = 0;
  if (agence) {
    // 4) Visiter la page agence
    await page.goto(agence.url);
    await page.waitForTimeout(2000);
    const html = await page.content();
    const match = html.match(/Biens en vente\s*\((\d+)\)/);
    nbAnnonces = match ? parseInt(match[1], 10) : 0;
  }

  await browser.close();

  // 5) Afficher le résultat JSON
  console.log(JSON.stringify({
    nom: agence ? agence.nom : null,
    url: agence ? agence.url : null,
    nbAnnonces
  }));
})();
