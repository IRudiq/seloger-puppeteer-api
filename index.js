const express = require("express");
const { chromium } = require("playwright");
const re = require("re2");

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

    const liens = await page.$$("a.c-pa-link");

    for (const lien of liens) {
      const nom = (await lien.innerText()).trim();
      const href = await lien.getAttribute("href");

      if (nom.toLowerCase().includes(nom_agence.toLowerCase())) {
        // Visite de la page de l'agence
        await page.goto(href, { timeout: 60000 });
        await page.waitForTimeout(2000);
        const contenu = await page.content();

        const match = contenu.match(/Biens en vente\s*\((\d+)\)/);
        const nb_annonces = match ? parseInt(match[1]) : 0;

        await browser.close();
        return res.json({
          nom,
          url: href,
          nb_annonces
        });
      }
    }

    await browser.close();
    return res.json({
      nom: null,
      url: null,
      nb_annonces: 0
    });
  } catch (err) {
    console.error("Erreur scraping:", err);
    if (browser) await browser.close();
    return res.status(500).json({ error: "Erreur scraping : " + err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API SeLoger Scraper en ligne !");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur le port ${port}`);
});
