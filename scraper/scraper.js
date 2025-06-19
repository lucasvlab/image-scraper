import playwright from 'playwright';

export async function scrapeWebsite(startUrl) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto(startUrl);

  const toVisit = [startUrl];
  const visited = new Set();
  const images = new Set();

  while (toVisit.length > 0 && visited.size < 5) {
    const currentUrl = toVisit.shift();
    if (visited.has(currentUrl)) continue;

    await page.goto(currentUrl, { waitUntil: 'domcontentloaded' });

    // Sammle alle img src
    const pageImages = await page.$$eval('img', imgs =>
      imgs.map(img => img.src)
    );
    pageImages.forEach(src => images.add(src));

    // Finde Links auf Unterseiten (nur gleiche Domain!)
    const hrefs = await page.$$eval('a', as =>
      as.map(a => a.href).filter(href => href.startsWith('http'))
    );
    hrefs.forEach(href => {
      if (!visited.has(href) && href.includes(new URL(startUrl).hostname)) {
        toVisit.push(href);
      }
    });

    visited.add(currentUrl);
  }

  await browser.close();

  return {
    url: startUrl,
    pagesVisited: visited.size,
    images: Array.from(images),
  };
}
