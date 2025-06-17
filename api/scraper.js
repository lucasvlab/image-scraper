// Vercel Serverless Function (api/scrape.js)
import { parse } from "node-html-parser";
import fetch from "node-fetch";
import { SitemapStream, parseSitemap } from "sitemap-stream-parser";
import { stringify } from "csv-stringify/sync";

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    // 1. Sitemap holen
    const sitemapURL = url.endsWith("/") ? `${url}sitemap.xml` : `${url}/sitemap.xml`;
    const sitemapRes = await fetch(sitemapURL);
    if (!sitemapRes.ok) throw new Error("Sitemap nicht gefunden");

    const sitemapText = await sitemapRes.text();
    const urls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]).slice(0, 5);

    const allImages = [];

    for (const pageURL of urls) {
      const pageRes = await fetch(pageURL);
      const html = await pageRes.text();
      const root = parse(html);

      // IMG Tags
      root.querySelectorAll("img").forEach(img => {
        allImages.push({
          page: pageURL,
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || ""
        });
      });

      // Inline style background-images
      root.querySelectorAll("[style]").forEach(el => {
        const style = el.getAttribute("style");
        const bgMatch = style.match(/background(-image)?:.*url\(["']?(.*?)["']?\)/i);
        if (bgMatch) {
          allImages.push({
            page: pageURL,
            src: bgMatch[2],
            alt: "(background-image)"
          });
        }
      });

      // Lazy load (z.B. data-src)
      root.querySelectorAll("[data-src]").forEach(el => {
        allImages.push({
          page: pageURL,
          src: el.getAttribute("data-src"),
          alt: "(lazy-load)"
        });
      });

      // iFrames (nur Youtube/Vimeo als Beispiel)
      root.querySelectorAll("iframe").forEach(iframe => {
        const src = iframe.getAttribute("src");
        if (src) {
          allImages.push({
            page: pageURL,
            src: src,
            alt: "(iframe)"
          });
        }
      });
    }

    // CSV generieren
    const csv = stringify(allImages, {
      header: true,
      columns: ["page", "src", "alt"]
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=alt-text-report.csv");
    res.status(200).send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
};
