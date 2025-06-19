import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { scrapeWebsite } from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/scrape', async (req, res) => {
  const url = req.body.website_url;

  try {
    const result = await scrapeWebsite(url);
    // Option 1: sende JSON zurück
    // res.json(result);

    // Option 2: rendere HTML-Ergebnis
    let html = '<h1>Scraper Ergebnis</h1><ul>';
    result.images.forEach(img => {
      html += `<li><img src="${img}" width="100"> ${img}</li>`;
    });
    html += '</ul>';
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler bei der Analyse.');
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
