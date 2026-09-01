#!/usr/bin/env tsx
/**
 * Static Sitemap Pre-Generation
 *
 * WHY THIS EXISTS
 * The Manus platform edge intercepts /sitemap*.xml and /robots.txt before they
 * reach Express, so the dynamic routes in server/routes/sitemaps.ts never run
 * for those URLs and Google receives the SPA fallback HTML ("Article Not Found").
 *
 * This script writes physical XML files into client/public/ and dist/public/
 * during the build. Real files at those paths bypass the edge SPA fallback
 * and are also served correctly by express.static() at origin.
 *
 * It is invoked from `pnpm build` and from a post-publish hook (see
 * server/services/sitemapGenerator.service.ts) so production sitemaps are
 * regenerated whenever new content is published.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seoService } from "../server/services/seo.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const targets = [
  path.resolve(projectRoot, "client", "public"),
  path.resolve(projectRoot, "dist", "public"),
].filter(p => fs.existsSync(p));

const MODULES = [
  "articles",
  "jobs",
  "people",
  "investors",
  "companies",
  "accelerators",
  "events",
  "resources",
  "research",
  "categories",
  "tags",
  "authors",
  "pages",
];

async function writeFile(filename: string, content: string) {
  for (const dir of targets) {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`[Sitemap] Wrote ${filePath} (${content.length} bytes)`);
  }
}

async function main() {
  if (targets.length === 0) {
    console.warn("[Sitemap] No target directories exist; skipping");
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[Sitemap] DATABASE_URL not set; skipping static generation");
    return;
  }

  console.log(`[Sitemap] Generating static sitemaps -> ${targets.join(", ")}`);

  const indexXml = await seoService.generateSitemapIndex();
  await writeFile("sitemap.xml", indexXml);
  await writeFile("sitemap-index.xml", indexXml);

  for (const m of MODULES) {
    try {
      const xml = await seoService.generateSitemap(m);
      await writeFile(`sitemap-${m}.xml`, xml);
    } catch (err) {
      console.error(`[Sitemap] Failed to generate ${m}:`, err);
    }
  }

  // Google News (last 48 hours) — must always be present
  try {
    const newsXml = await seoService.generateGoogleNewsSitemap();
    await writeFile("sitemap-news.xml", newsXml);
  } catch (err) {
    console.error("[Sitemap] Failed to generate Google News sitemap:", err);
  }

  // Image sitemap (P6)
  try {
    const imgXml = await seoService.generateImagesSitemap();
    await writeFile("sitemap-images.xml", imgXml);
  } catch (err) {
    console.error("[Sitemap] Failed to generate images sitemap:", err);
  }

  // robots.txt — always reflect the latest list of sitemap URLs
  await writeFile("robots.txt", seoService.generateRobotsTxt());

  console.log("[Sitemap] Done.");
}

main().then(
  () => process.exit(0),
  err => {
    console.error("[Sitemap] Fatal:", err);
    process.exit(1);
  }
);
