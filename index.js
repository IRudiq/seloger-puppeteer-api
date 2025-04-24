const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

app.post("/seloger", async (req, res) => {
  const { nom_agence, ville_slug } = req.body;
  if (!nom_agence || !ville_slug) {
    return res.status(400).json({ error: "nom_agence et ville_slug requis" });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  try {
    const url = `https://www.seloger.com/annuaire/${ville_slug}/`;
    await page.goto(url, { timeout: 60000 });
    await page.waitForTimeout(3000);
    const liens = await page.$$eval("a.c-pa-link", links =>
      links.map(link => ({
        nom: link.textContent.trim(),
        url: link.href
      }))
    );

    const agence = liens.find(ag => ag.nom.toLowerCase().includes(nom_agence.toLowerCase()));
    if (!agence) {
      await browser.close();
      return res.json({ nom: null, url: null, nb_annonces: 0 });
    }

    await page.goto(agence.url, { timeout: 60000 });
    await page.waitForTimeout(3000);
    const contenu = await page.content();
    const match = contenu.match(/Biens en vente\s*\((\d+)\)/);
    const nb_annonces = match ? parseInt(match[1]) : 0;

    await browser.close();
    return res.json({
      nom: agence.nom,
      url: agence.url,
      nb_annonces
    });

  } catch (error) {
    console.error("❌ Erreur Puppeteer :", error);
    await browser.close();
    return res.status(500).json({ error: "Erreur scraping" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Puppeteer API opérationnelle");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Serveur lancé sur le port", PORT);
});
