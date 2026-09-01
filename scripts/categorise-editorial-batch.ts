#!/usr/bin/env tsx
/**
 * Assign a main category plus sub-categories to every article in a batch.
 * ----------------------------------------------------------------------
 * The import gave almost every article the same pair — 86 of 100 were
 * "AI & Data" + "Events & Conferences" — which is not categorisation, it
 * is a default. This scores each article's own words against the
 * category vocabulary and picks a main plus up to `--subs` others.
 *
 *   See what the site actually has, and today's distribution:
 *     tsx scripts/categorise-editorial-batch.ts --batch=... --list
 *
 *   Dry run — shows every proposed change, writes nothing (default):
 *     tsx scripts/categorise-editorial-batch.ts --batch=...
 *
 *   Apply:
 *     tsx scripts/categorise-editorial-batch.ts --batch=... --execute
 *
 *   Undo:
 *     tsx scripts/categorise-editorial-batch.ts --batch=... --restore --execute
 *
 * IT NEVER CREATES A CATEGORY. The keyword map below is keyed by slug and
 * matched against the categories that already exist, so the script adapts
 * to whatever taxonomy production holds and simply reports any mapping
 * target that is missing. Creating categories from a script is how a
 * newsroom ends up with "AI & Data" next to "AI & ML".
 *
 * Every article keeps the event category as a sub — all 100 are LEAP /
 * DeepFest coverage — but it is only the main category when nothing
 * else scores, so the batch stops looking like one undifferentiated pile.
 */

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../server/db";
import {
  articleCategories, articleEditorialBatches, articles, categories, editorialBatches,
} from "../drizzle/schema";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};
const batchKey = val("batch") ?? "leap-deepfest-2026-day1";
const maxSubs = Number(val("subs") ?? "2");
const execute = flag("execute");
const restore = flag("restore");
const listOnly = flag("list");

/**
 * slug -> the words that mean it. Slugs are listed as alternatives
 * because sites differ ("ai-data" vs "ai-ml" vs "artificial-intelligence");
 * whichever exists is used and the rest are ignored.
 */
const SIGNALS: Array<{ slugs: string[]; terms: string[] }> = [
  { slugs: ["ai-data", "ai-ml", "artificial-intelligence", "ai"], terms: [
    "artificial intelligence", "machine learning", "llm", "large language model",
    "generative ai", "agentic", "inference", "training", "model", "neural",
    "deep learning", "chatbot", "copilot", "genai", "foundation model", "arabic ai"] },
  { slugs: ["cloud", "cloud-infrastructure", "infrastructure"], terms: [
    "cloud region", "data center", "datacenter", "hyperscaler", "compute",
    "kubernetes", "server", "megawatt", "capacity", "colocation", "bare-metal"] },
  { slugs: ["cybersecurity", "security", "cyber"], terms: [
    "cybersecurity", "zero-trust", "encryption", "cryptography", "threat",
    "ransomware", "vulnerability", "post-quantum", "firewall", "identity"] },
  { slugs: ["fintech", "finance"], terms: [
    "fintech", "payments", "banking", "wallet", "lending", "insurtech",
    "remittance", "digital bank", "financial services", "bnpl"] },
  { slugs: ["funding-vc", "funding", "venture-capital", "investment"], terms: [
    "raised", "funding round", "series a", "series b", "seed round", "valuation",
    "investors", "venture capital", "acquisition", "acquires", "stake", "ipo"] },
  { slugs: ["startups", "startup"], terms: [
    "startup", "founder", "accelerator", "incubator", "pitch competition",
    "early-stage", "cohort", "bootstrapped", "scaleup"] },
  { slugs: ["enterprise", "business"], terms: [
    // Deliberately narrow. Broad transformation language ("digital
    // transformation", "modernization", "workflow") appears in almost
    // every article in this batch and made Enterprise win 49 of 100.
    "erp", "crm", "salesforce", "sap netweaver", "enterprise software",
    "enterprise resource", "back office", "procurement platform"] },
  { slugs: ["telecom", "telecoms", "connectivity"], terms: [
    "5g", "6g", "spectrum", "operator", "network", "fiber", "fibre",
    "base station", "roaming", "satellite broadband"] },
  { slugs: ["mobility", "transport", "automotive"], terms: [
    "mobility", "robotaxi", "autonomous vehicle", "electric vehicle", "fleet",
    "logistics", "shuttle", "metro", "trucking", "transportation"] },
  { slugs: ["healthtech", "health", "healthcare"], terms: [
    "healthcare", "patient", "clinical", "medical", "prosthetics", "diagnosis",
    "hospital", "telemedicine", "biotech", "genomics"] },
  { slugs: ["energy", "cleantech", "climate", "climate-tech"], terms: [
    "renewable", "solar", "carbon", "emissions", "sustainability", "clean energy",
    "grid", "hydrogen", "climate"] },
  { slugs: ["gaming", "esports", "games"], terms: [
    "gaming", "esports", "game", "roblox", "console", "player", "metaverse"] },
  { slugs: ["govtech", "government", "public-sector"], terms: [
    "ministry", "government", "public sector", "national program", "regulator",
    "authority", "e-government", "citizens", "vision 2030"] },
  { slugs: ["space", "spacetech"], terms: [
    "space", "satellite", "orbit", "launch vehicle", "astronaut", "aerospace"] },
  { slugs: ["hardware", "semiconductors", "chips", "devices"], terms: [
    "chip", "semiconductor", "gpu", "processor", "silicon", "laptop", "smartphone",
    "device", "wafer", "foundry", "robot", "humanoid"] },
  { slugs: ["ecommerce", "retail", "commerce"], terms: [
    "e-commerce", "ecommerce", "retail", "marketplace", "checkout", "merchant"] },
  { slugs: ["proptech", "real-estate"], terms: [
    "real estate", "proptech", "property", "construction", "smart city",
    "smart cities", "urban"] },
  { slugs: ["events-conferences", "events", "conferences"], terms: [
    "leap 2026", "deepfest", "exhibition", "keynote", "showcase", "conference",
    "expo", "pavilion", "stage"] },
];

const EVENT_SLUGS = new Set(["events-conferences", "events", "conferences"]);

/**
 * `strong` counts only the headline and standfirst — what the piece is
 * actually about. `total` adds body mentions, which are useful for
 * ranking but far too noisy to qualify a category on their own: every
 * article in a tech-conference batch mentions investors and platforms
 * somewhere.
 */
function scoreText(terms: string[], title: string, excerpt: string, body: string) {
  let strong = 0;
  let total = 0;
  for (const t of terms) {
    if (title.includes(t)) { strong += 6; total += 6; }
    if (excerpt.includes(t)) { strong += 3; total += 3; }
    const hits = body.split(t).length - 1;
    if (hits) total += Math.min(hits, 4);
  }
  return { strong, total };
}

/** A category needs headline/standfirst evidence to be attached at all. */
const MIN_STRONG = 3;

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL.");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS editorial_category_backup (
      articleId int NOT NULL,
      categoryIds varchar(512),
      primaryCategoryId int,
      capturedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (articleId)
    )`);

  const cats = await (db as any)
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories).where(eq(categories.module, "news"));
  const bySlug = new Map<string, any>(cats.map((c: any) => [String(c.slug).toLowerCase(), c]));

  const [batch] = await (db as any)
    .select().from(editorialBatches)
    .where(eq(editorialBatches.batchKey, batchKey)).limit(1);
  if (!batch) throw new Error(`Batch '${batchKey}' not found.`);

  const rows = await (db as any)
    .select({
      id: articles.id, sequence: articleEditorialBatches.sequence,
      title: articles.title, excerpt: articles.excerpt,
      content: articles.content, primaryCategoryId: articles.primaryCategoryId,
    })
    .from(articleEditorialBatches)
    .innerJoin(articles, eq(articles.id, articleEditorialBatches.articleId))
    .where(eq(articleEditorialBatches.batchId, batch.id))
    .orderBy(articleEditorialBatches.sequence);

  // ---------------------------------------------------------------- list
  if (listOnly) {
    const dist = await (db as any)
      .select({ name: categories.name, slug: categories.slug, n: sql<number>`COUNT(*)` })
      .from(articleCategories)
      .innerJoin(categories, eq(categories.id, articleCategories.categoryId))
      .where(inArray(articleCategories.articleId, rows.map((r: any) => r.id)))
      .groupBy(categories.name, categories.slug);
    console.log("news categories that exist on this site:");
    for (const c of cats) console.log(`   ${String(c.slug).padEnd(28)} ${c.name}`);
    console.log("\ncurrent distribution across this batch:");
    for (const d of dist.sort((a: any, b: any) => b.n - a.n)) {
      console.log(`   ${String(d.n).padStart(3)}  ${d.name}`);
    }
    const missing = SIGNALS.filter((s) => !s.slugs.some((x) => bySlug.has(x)));
    console.log(`\nmapping targets with no matching category (${missing.length}):`);
    for (const m of missing) console.log(`   ${m.slugs.join(" | ")}`);
    return;
  }

  // ------------------------------------------------------------- restore
  if (restore) {
    const bk: any = await db.execute(
      sql`SELECT articleId, categoryIds, primaryCategoryId FROM editorial_category_backup`);
    const list = (Array.isArray(bk) ? (Array.isArray(bk[0]) ? bk[0] : bk) : []) as any[];
    const byId = new Map(list.map((b) => [Number(b.articleId), b]));
    const targets = rows.filter((r: any) => byId.has(r.id));
    console.log(JSON.stringify({ action: "restore", dryRun: !execute, willRestore: targets.length }, null, 2));
    if (!execute) return;
    for (const r of targets) {
      const b = byId.get(r.id)!;
      await (db as any).delete(articleCategories).where(eq(articleCategories.articleId, r.id));
      for (const idStr of String(b.categoryIds || "").split(",").filter(Boolean)) {
        await (db as any).insert(articleCategories)
          .values({ articleId: r.id, categoryId: Number(idStr) } as any);
      }
      await (db as any).update(articles)
        .set({ primaryCategoryId: b.primaryCategoryId } as any).where(eq(articles.id, r.id));
    }
    console.log(`Restored categories for ${targets.length} articles.`);
    return;
  }

  const plans: any[] = [];
  for (const r of rows) {
    const title = String(r.title ?? "").toLowerCase();
    const excerpt = String(r.excerpt ?? "").toLowerCase();
    const body = String(r.content ?? "").replace(/<[^>]+>/g, " ").toLowerCase();

    const scored = SIGNALS
      .map((sig) => {
        const cat = sig.slugs.map((s) => bySlug.get(s)).find(Boolean);
        if (!cat) return null;
        const { strong, total } = scoreText(sig.terms, title, excerpt, body);
        return { cat, slug: String(cat.slug).toLowerCase(), strong, total };
      })
      .filter((x): x is { cat: any; slug: string; strong: number; total: number } =>
        !!x && x.strong >= MIN_STRONG)
      .sort((a, b) => b.strong - a.strong || b.total - a.total);

    // The event category is context, not subject: it belongs on every
    // article in this batch but should only lead when nothing else does.
    const nonEvent = scored.filter((s) => !EVENT_SLUGS.has(s.slug));
    const eventCat = cats.find((c: any) => EVENT_SLUGS.has(String(c.slug).toLowerCase()));

    // Only promote a new main category when the headline actually
    // supports one. With no strong topic signal, keep whatever the
    // article already had rather than sweeping it into the event
    // category — that would replace one undifferentiated pile with
    // another, and it would rewrite the URL for no good reason.
    const existingPrimary = cats.find((c: any) => c.id === r.primaryCategoryId);
    const primary = nonEvent[0]?.cat ?? existingPrimary ?? scored[0]?.cat ?? null;
    if (!primary) continue;

    // The event category takes one of the sub slots rather than being
    // added on top, so an article never ends up with more categories
    // than asked for.
    const subs: any[] = [];
    const eventTakesASlot = !!eventCat && eventCat.id !== primary.id;
    const roomForTopics = Math.max(0, maxSubs - (eventTakesASlot ? 1 : 0));
    for (const s of nonEvent.slice(1)) {
      if (subs.length >= roomForTopics) break;
      if (s.cat.id !== primary.id) subs.push(s.cat);
    }
    if (eventTakesASlot) subs.push(eventCat);

    plans.push({
      sequence: r.sequence, id: r.id, title: r.title,
      primary, subs,
      wasPrimaryId: r.primaryCategoryId,
      top: scored.slice(0, 4).map((s) => `${s.cat.name}:${s.strong}/${s.total}`),
    });
  }

  const dist: Record<string, number> = {};
  for (const p of plans) dist[p.primary.name] = (dist[p.primary.name] ?? 0) + 1;

  console.log(JSON.stringify({
    batchKey, dryRun: !execute,
    articles: rows.length, planned: plans.length,
    subsPerArticle: maxSubs, newPrimaryDistribution: dist,
  }, null, 2));

  console.log("\n--- proposed ---");
  for (const p of plans) {
    console.log(`${String(p.sequence).padStart(3)}  ${String(p.title).slice(0, 68)}`);
    console.log(`     main: ${p.primary.name}   subs: ${p.subs.map((s: any) => s.name).join(", ") || "—"}`);
  }

  if (!execute) {
    console.log("\nDry run — nothing written. Re-run with --execute to apply.");
    return;
  }

  for (const r of rows) {
    const existing = await (db as any)
      .select({ categoryId: articleCategories.categoryId })
      .from(articleCategories).where(eq(articleCategories.articleId, r.id));
    await db.execute(sql`
      INSERT IGNORE INTO editorial_category_backup (articleId, categoryIds, primaryCategoryId)
      VALUES (${r.id}, ${existing.map((e: any) => e.categoryId).join(",")}, ${r.primaryCategoryId})`);
  }

  await (db as any).transaction(async (tx: any) => {
    for (const p of plans) {
      await tx.delete(articleCategories).where(eq(articleCategories.articleId, p.id));
      const wanted = [p.primary, ...p.subs];
      for (const c of wanted) {
        await tx.insert(articleCategories).values({ articleId: p.id, categoryId: c.id } as any);
      }
      await tx.update(articles)
        .set({ primaryCategoryId: p.primary.id } as any).where(eq(articles.id, p.id));
    }
  });

  console.log(`\nApplied to ${plans.length} articles. Undo with:  --restore --execute`);
  console.log("NOTE: changing the main category changes the article URL (/{category}/{slug}).");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
