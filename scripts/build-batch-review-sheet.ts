#!/usr/bin/env tsx
/**
 * Build a single-page review sheet for an imported editorial batch.
 *
 *   tsx scripts/build-batch-review-sheet.ts --batch=leap-deepfest-2026-day1 --out=review.html
 *
 * One row per article: the image as it will appear, the headline, the
 * opening paragraph, and the counts that matter (words, companies,
 * people, events, sources). Image URLs come from the media row the
 * import created, so the sheet shows the real hosted asset rather than a
 * local file — if an image failed to upload, its box is visibly empty.
 *
 * Flags are advisory, not blocking: they mark rows worth a second look
 * (short copy, no linked people, no supporting source, a headline that
 * still carries capitalised function words).
 */

import { writeFileSync } from "node:fs";
import { eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../server/db";
import {
  articles, articleCompanies, articleEditorialBatches, articleEvents,
  articlePeople, articleSourceReferences, categories, editorialBatches, media,
} from "../drizzle/schema";

const args = process.argv.slice(2);
const val = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};
const batchKey = val("batch") ?? "leap-deepfest-2026-day1";
const outPath = val("out") ?? "batch-review.html";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL.");

  const [batch] = await (db as any)
    .select().from(editorialBatches)
    .where(eq(editorialBatches.batchKey, batchKey)).limit(1);
  if (!batch) throw new Error(`Batch '${batchKey}' not found.`);

  const rows = await (db as any)
    .select({
      id: articles.id,
      sequence: articleEditorialBatches.sequence,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      content: articles.content,
      publishedAt: articles.publishedAt,
      imageUrl: media.url,
      imageAlt: media.alt,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(articleEditorialBatches)
    .innerJoin(articles, eq(articles.id, articleEditorialBatches.articleId))
    .leftJoin(media, eq(media.id, articles.featuredImageId))
    .leftJoin(categories, eq(categories.id, articles.primaryCategoryId))
    .where(eq(articleEditorialBatches.batchId, batch.id))
    .orderBy(articleEditorialBatches.sequence);

  const ids = rows.map((r: any) => r.id);
  const count = async (table: any, col: any) => {
    const res = await (db as any)
      .select({ articleId: col, n: sql<number>`COUNT(*)` })
      .from(table).where(inArray(col, ids)).groupBy(col);
    return new Map(res.map((x: any) => [Number(x.articleId), Number(x.n)]));
  };
  const co = await count(articleCompanies, articleCompanies.articleId);
  const pe = await count(articlePeople, articlePeople.articleId);
  const ev = await count(articleEvents, articleEvents.articleId);
  const sr = await count(articleSourceReferences, articleSourceReferences.articleId);

  const cards = rows.map((r: any) => {
    const text = String(r.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    const first = text.slice(0, 320);
    const flags: string[] = [];
    if (!r.imageUrl) flags.push("no image");
    if (!r.categoryName) flags.push("no category");
    if (words < 500) flags.push(`short (${words}w)`);
    if (!pe.get(r.id)) flags.push("no people linked");
    if (!co.get(r.id)) flags.push("no companies linked");
    if ((sr.get(r.id) ?? 0) < 2) flags.push("single source");
    if (/ (The|And|With|For|To|In|On|At|Of|A|An) /.test(r.title)) flags.push("caps in headline");
    if (/<h[1-6]/i.test(r.content ?? "")) flags.push("heading left");
    if (/\[\d{1,2}\]/.test(r.content ?? "")) flags.push("citation marker left");

    return `
    <article class="row${flags.length ? " flagged" : ""}">
      <div class="seq">${r.sequence}</div>
      <div class="thumb">${r.imageUrl
        ? `<img src="${esc(r.imageUrl)}" alt="${esc(r.imageAlt ?? "")}" loading="lazy">`
        : `<div class="noimg">no image</div>`}</div>
      <div class="body">
        <h2>${esc(r.title)}</h2>
        <p class="meta">
          <span class="cat">${esc(r.categoryName ?? "—")}</span>
          <span>/${esc(r.categorySlug ?? "")}/${esc(r.slug)}</span>
          <span>${words} words</span>
          <span>${co.get(r.id) ?? 0} companies · ${pe.get(r.id) ?? 0} people · ${ev.get(r.id) ?? 0} events · ${sr.get(r.id) ?? 0} sources</span>
        </p>
        <p class="lede">${esc(first)}…</p>
        ${flags.length ? `<p class="flags">${flags.map((f) => `<span>${esc(f)}</span>`).join("")}</p>` : ""}
      </div>
    </article>`;
  }).join("\n");

  const flagged = rows.filter((r: any) =>
    !r.imageUrl || !r.categoryName || !pe.get(r.id) || !co.get(r.id)).length;

  const html = `<!doctype html><meta charset="utf-8">
<title>${esc(batchKey)} — review sheet</title>
<style>
:root{--ink:#12211b;--muted:#5e6d66;--rule:#dfe5e2;--accent:#047857;--flag:#a1590a;--paper:#f7f8f7}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{padding:2rem 1.5rem 1.25rem;border-bottom:2px solid var(--ink);max-width:1100px;margin:0 auto}
h1{margin:0;font-size:1.6rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:.4rem 0 0;font-size:.9rem}
main{max-width:1100px;margin:0 auto;padding:0 1.5rem 4rem}
.row{display:grid;grid-template-columns:2.5rem 200px 1fr;gap:1.1rem;padding:1.1rem 0;border-bottom:1px solid var(--rule);align-items:start}
.row.flagged{background:#fffaf2}
.seq{font:600 .8rem/1.6 ui-monospace,monospace;color:var(--muted);padding-top:.2rem}
.thumb img{width:200px;height:112px;object-fit:cover;border-radius:6px;border:1px solid var(--rule);display:block}
.noimg{width:200px;height:112px;display:flex;align-items:center;justify-content:center;border:1px dashed #c33;color:#c33;border-radius:6px;font-size:.8rem}
h2{margin:0 0 .35rem;font-size:1.05rem;line-height:1.35;letter-spacing:-.01em}
.meta{margin:0 0 .45rem;font-size:.78rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:.25rem .9rem}
.cat{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em}
.lede{margin:0;font-size:.86rem;color:#3d4a44}
.flags{margin:.5rem 0 0;display:flex;flex-wrap:wrap;gap:.35rem}
.flags span{background:#f7eddc;color:var(--flag);border:1px solid #e3cfa8;border-radius:3px;padding:.1rem .4rem;font-size:.72rem;font-weight:600}
@media(max-width:760px){.row{grid-template-columns:2rem 1fr}.thumb{grid-column:2}}
</style>
<header>
  <h1>${esc(batchKey)} — review sheet</h1>
  <p class="sub">${rows.length} articles · ${flagged} rows flagged for a second look · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.
  Highlighted rows have at least one flag; flags are advisory, not errors.</p>
</header>
<main>${cards}</main>`;

  writeFileSync(outPath, html);
  console.log(`Wrote ${outPath} — ${rows.length} articles, ${flagged} flagged.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
