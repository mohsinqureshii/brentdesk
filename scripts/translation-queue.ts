/**
 * What still needs translating, newest first.
 *
 * Recency order on purpose: the homepage and the category pages are what a
 * reader switching to Arabic lands on, so the archive becomes usefully
 * bilingual long before the last file is done.
 *
 * Run: pnpm tsx scripts/translation-queue.ts [locale] [count]
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";

const DIR = path.resolve(import.meta.dirname, "..", "content", "articles");
const locale = process.argv[2] || "ar";
const count = Number(process.argv[3] || 10);
const TDIR = path.resolve(import.meta.dirname, "..", "content", "translations", locale);

const done = new Set(
  existsSync(TDIR)
    ? readdirSync(TDIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""))
    : [],
);

const all: any[] = [];
for (const f of readdirSync(DIR).filter(f => f.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  for (const a of Array.isArray(parsed) ? parsed : [parsed]) all.push(a);
}

const pending = all
  .filter(a => !done.has(a.slug))
  .sort((x, y) => (y.eventDate || "").localeCompare(x.eventDate || ""));

if (process.argv.includes("--count")) {
  console.log(`${done.size} done · ${pending.length} pending · ${all.length} total`);
} else {
  console.log(JSON.stringify(
    pending.slice(0, count).map(a => ({
      slug: a.slug,
      title: a.title ?? a.headline,
      excerpt: a.excerpt,
      content: a.content,
      seoTitle: a.seoTitle,
      seoDescription: a.seoDescription,
    })),
    null, 1,
  ));
}
