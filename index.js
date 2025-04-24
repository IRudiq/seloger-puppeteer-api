const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.post("/seloger", async (req, res) => {
  const { nom_agence, ville_slug } = req.body;
  if (!nom_agence || !ville_slug) {
    return res.status(400).json({ error: "nom_agence ou ville_slug manquant" });
  }

  const url = `https://www.seloger.com/annuaire/${ville_slug}/`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { timeout: 60000 });
    await page.waitForTimeout(3000);

    const liens = await page.$$eval("a.c-pa-link", els =>
      els.map(el => ({ nom: el.textContent.trim(), url: el.href }))
    );

    const agence = liens.find(a =>
      a.nom.toLowerCase().includes(nom_agence.toLowerCase())
    );

    let nb_annonces = 0;
    if (agence) {
      await page.goto(agence.url, { timeout: 60000 });
      await page.waitForTimeout(2000);
      const contenu = await page.content();
      const match = contenu.match(/Biens en vente\s*\((\d+)\)/);
      nb_annonces = match ? parseInt(match[1], 10) : 0;
    }

    await browser.close();
    return res.json({
      nom: agence ? agence.nom : null,
      url: agence ? agence.url : null,
      nb_annonces
    });

  } catch (err) {
    console.error("Erreur scraping:", err);
    if (browser) await browser.close();
    return res.status(500).json({ error: err.message });
  }
});

app.get("/", (_req, res) => res.send("API SeLoger Scraper OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur le port ${port}`);
});
