/**
 * Editorial ingestion — takes researched, fact-checked articles as JSON and
 * writes them into the CMS with their full relationship graph.
 *
 * Every article carries its own sourcing provenance:
 *   - eventDate  : when the underlying development actually happened
 *   - publishedAt: when BrentDesk published it (always truthful, never
 *                  back-dated to imply the publication existed earlier)
 *   - sourceUrl  : the primary source the reporting rests on
 *
 * Idempotent on slug: re-running updates the existing article and rebuilds
 * its joins rather than creating duplicates.
 *
 * Run: DATABASE_URL=... pnpm tsx scripts/ingest-articles.ts <file.json ...>
 */

import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  articles, articleTags, articleCompanies, articlePeople, articleCategories,
  articleRelatedEntities,
  tags, categories, companies, people, users, countries,
} from "../drizzle/schema";
import { toDbDate } from "../server/_core/dbValues";

type Db = MySql2Database<Record<string, never>>;

/** One researched article, as produced by the editorial pipeline. */
export interface ArticleInput {
  /** Commission number from the brief, for the audit trail. */
  commission: number;
  headline: string;
  slug: string;
  /** Standfirst / deck. Optional. */
  deck?: string;
  excerpt: string;
  /** Body as HTML paragraphs, with contextual links already inline. */
  content: string;
  author: "Mo" | "Jakson Gudawela" | "BrentDesk Staff";
  primaryCategory: string;
  /** Primary plus secondary categories. Written to article_categories, which
   *  is what relatedContent.service scores relatedness on. */
  categories?: string[];
  /** Slugs of other archive articles this one links to in its prose. */
  internalLinks?: string[];
  tags?: string[];
  companies?: string[];
  people?: string[];
  country?: string;
  /** ISO date (YYYY-MM-DD) of the underlying development. */
  eventDate: string;
  /** Latest date whose information the article may use. Audit only. */
  informationCutoff: string;
  primarySourceUrl: string;
  primarySourceName: string;
  secondarySourceUrls?: string[];
  seoTitle: string;
  seoDescription: string;
  articleType?: "news" | "opinion" | "report" | "interview";
  wordCount?: number;
}

/**
 * Common names for companies whose profile is filed under a different one.
 * Articles use whatever form reads naturally in the sentence, so "Lucid
 * Group" and "Saudi Ports Authority" were failing to link to the Lucid and
 * Mawani profiles that already existed.
 */
const COMPANY_ALIASES: Record<string, string> = {
  "Lucid Group": "Lucid",
  "Saudi Ports Authority": "Mawani",
  "New Murabba Development Company": "New Murabba",
  "DHL Group": "DHL",
  "DHL Supply Chain": "DHL",
  "Aramco": "Saudi Aramco",
  "Saudi Arabian Oil Company": "Saudi Aramco",
  "Saudi Arabian Mining Company": "Ma'aden",
  "Maaden": "Ma'aden",
  "PIF": "Public Investment Fund",
  "Abu Dhabi National Oil Company": "ADNOC",
  "Exxon Mobil": "ExxonMobil",
  "Exxon Mobil Corporation": "ExxonMobil",
  "Saudi Railway Company": "Saudi Arabia Railways",
  "SAR": "Saudi Arabia Railways",
  "Aluminium Bahrain": "Alba",
  "Ceer Motors": "Ceer",
  "Qatar Energy": "QatarEnergy",
  "Volvo Construction Equipment": "Volvo CE",
  "Emirates Global Aluminium": "EGA",
};

async function idFor(
  db: Db, table: any, column: any, value: string,
): Promise<number | null> {
  const [row] = await db.select({ id: table.id }).from(table).where(eq(column, value)).limit(1);
  return row?.id ?? null;
}

/** Resolve a byline to its user id. Never creates one — the approved list is fixed. */
async function resolveAuthor(db: Db, name: string): Promise<number> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.publicName, name))
    .limit(1);
  if (!row) {
    throw new Error(
      `Unknown byline "${name}". The approved list is Mo, Jakson Gudawela and ` +
        `BrentDesk Staff; run the author seed first.`,
    );
  }
  return row.id;
}

/** Find a tag by slug, creating it if the taxonomy does not have it yet. */
async function resolveTag(db: Db, name: string): Promise<number> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const existing = await idFor(db, tags, tags.slug, slug);
  if (existing) return existing;
  await db.insert(tags).values({ name, slug, tagType: "general", isActive: 1 });
  const created = await idFor(db, tags, tags.slug, slug);
  if (!created) throw new Error(`failed to create tag "${name}"`);
  return created;
}

/** articles.articleType is a MySQL enum; anything outside it fails the insert.
 *  Long-form pieces get written as "analysis" or "feature", which the schema
 *  calls "report" — map rather than reject a finished article. */
const ARTICLE_TYPES = new Set(["news", "opinion", "press_release", "report", "interview"]);
function normalizeType(t: string | undefined): "news" | "opinion" | "press_release" | "report" | "interview" {
  if (!t) return "news";
  if (ARTICLE_TYPES.has(t)) return t as any;
  return "report";
}

export async function ingest(db: Db, input: ArticleInput, publishedStatusId: number) {
  const authorId = await resolveAuthor(db, input.author);

  const categoryId = await idFor(db, categories, categories.slug, input.primaryCategory);
  if (!categoryId) throw new Error(`unknown category "${input.primaryCategory}"`);

  const countryId = input.country
    ? await idFor(db, countries, countries.name, input.country)
    : null;

  const now = toDbDate(new Date());
  const values = {
    title: input.headline,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    authorId,
    statusId: publishedStatusId,
    primaryCategoryId: categoryId,
    coverageCountryId: countryId,
    // Truthful: BrentDesk publishes these now. The historical date of the
    // development itself lives in eventDate.
    publishedAt: now,
    eventDate: input.eventDate,
    sourceUrl: input.primarySourceUrl,
    sourceName: input.primarySourceName,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    ogTitle: input.seoTitle,
    ogDescription: input.seoDescription,
    articleType: normalizeType(input.articleType),
    robotsIndexing: "index" as const,
  };

  const existingId = await idFor(db, articles, articles.slug, input.slug);
  let articleId: number;
  if (existingId) {
    await db.update(articles).set(values as any).where(eq(articles.id, existingId));
    articleId = existingId;
    // Rebuild joins so a re-run reflects the current input exactly.
    await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
    await db.delete(articleCompanies).where(eq(articleCompanies.articleId, articleId));
    await db.delete(articlePeople).where(eq(articlePeople.articleId, articleId));
    await db.delete(articleCategories).where(eq(articleCategories.articleId, articleId));
    await db.delete(articleRelatedEntities).where(eq(articleRelatedEntities.articleId, articleId));
  } else {
    await db.insert(articles).values(values as any);
    const created = await idFor(db, articles, articles.slug, input.slug);
    if (!created) throw new Error(`insert failed for "${input.slug}"`);
    articleId = created;
  }

  for (const t of input.tags ?? []) {
    await db.insert(articleTags).values({ articleId, tagId: await resolveTag(db, t) });
  }

  // Multi-category. relatedContent.service scores relatedness on shared
  // categories, tags and topics; with only articles.primaryCategoryId set it
  // found no shared taxonomy and fell back to "most recent", which is not
  // relatedness. Always includes the primary.
  const catSlugs = [...new Set([input.primaryCategory, ...(input.categories ?? [])])];
  for (const slug of catSlugs) {
    const id = await idFor(db, categories, categories.slug, slug);
    if (id) await db.insert(articleCategories).values({ articleId, categoryId: id });
  }

  // Companies and people are linked only when a profile already exists.
  // Creating a stub from a passing mention would put unverified entities in
  // the entity graph, which the brief forbids.
  const missing: string[] = [];
  for (const raw of input.companies ?? []) {
    const name = COMPANY_ALIASES[raw] ?? raw;
    const id = await idFor(db, companies, companies.name, name);
    if (id) await db.insert(articleCompanies).values({ articleId, companyId: id, mentionType: "mentioned" });
    else missing.push(`company:${raw}`);
  }
  for (const name of input.people ?? []) {
    const id = await idFor(db, people, people.name, name);
    if (id) await db.insert(articlePeople).values({ articleId, personId: id, mentionType: "mentioned" });
    else missing.push(`person:${name}`);
  }

  return { articleId, created: !existingId, missing };
}

/**
 * Record article-to-article relationships from the in-prose links.
 *
 * Runs after every article exists, because an edge can point at a slug that
 * had not been inserted yet when its source was written.
 */
async function linkRelatedArticles(db: Db, inputs: ArticleInput[]): Promise<number> {
  const ids = new Map<string, number>();
  for (const i of inputs) {
    const id = await idFor(db, articles, articles.slug, i.slug);
    if (id) ids.set(i.slug, id);
  }

  let edges = 0;
  for (const i of inputs) {
    const from = ids.get(i.slug);
    if (!from) continue;
    let order = 0;
    for (const targetSlug of i.internalLinks ?? []) {
      const to = ids.get(targetSlug);
      if (!to || to === from) continue;
      await db.insert(articleRelatedEntities).values({
        articleId: from, entityType: "article", entityId: to, sortOrder: order++,
      });
      edges++;
    }
  }
  return edges;
}

/**
 * Ingest a set of article files, or the archive bundled into dist/.
 *
 * The runtime image ships only dist/, drizzle/ and scripts/data, so the
 * source content/articles/ directory is not present in a deployed
 * container. The build writes the whole archive to dist/articles.json and
 * that is the default here, which lets a deploy publish the archive with
 * no filesystem assumptions and no shell.
 */
export async function runIngest(files?: string[]): Promise<{ created: number; updated: number; missing: string[] }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const candidates = files?.length
    ? files
    : [path.resolve(import.meta.dirname, "articles.json"),
       path.resolve(process.cwd(), "dist", "articles.json")];
  // Both default candidates resolve to the same file in most layouts, and
  // ingesting a file twice does the work twice — the second pass is an
  // update of what the first just created. Dedupe on the resolved path.
  const sources = [...new Set(candidates.map(f => path.resolve(f)))].filter(f => existsSync(f));
  if (!sources.length) {
    throw new Error(`no article files found (looked in: ${candidates.join(", ")})`);
  }

  const pool = mysql.createPool(url);
  const db = drizzle(pool) as Db;
  try {
    const { workflowService } = await import("../server/services/workflow.service");
    // Editorial statuses are normally created by the server at boot. Ingest
    // can run against a database no server has touched yet, so make sure
    // they exist rather than failing on a missing "published" status.
    let published = await workflowService.getStatusBySlug("editorial", "published");
    if (!published) {
      await workflowService.initializeWorkflows();
      published = await workflowService.getStatusBySlug("editorial", "published");
    }
    if (!published) throw new Error("could not resolve the published editorial status");

    let created = 0, updated = 0;
    const missing = new Set<string>();
    const seen: ArticleInput[] = [];
    for (const file of sources) {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      const batch: ArticleInput[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of batch) {
        seen.push(item);
        const r = await ingest(db, item, published.id);
        r.created ? created++ : updated++;
        r.missing.forEach(m => missing.add(m));
      }
    }
    const edges = await linkRelatedArticles(db, seen);
    console.log(`[ingest] ${created} created, ${updated} updated, ${edges} related-article links`);
    if (missing.size) {
      // Hundreds of one-off mentions would bury the useful output; the full
      // list is derivable from the article files if anyone needs it.
      const sample = [...missing].slice(0, 12).join(", ");
      console.log(
        `[ingest] ${missing.size} mentioned entities have no profile yet, so no link was made ` +
          `(e.g. ${sample}${missing.size > 12 ? ", …" : ""})`,
      );
    }
    return { created, updated, missing: [...missing] };
  } finally {
    await pool.end();
  }
}
