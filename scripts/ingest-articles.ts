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

import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";
import {
  articles, articleTags, articleCompanies, articlePeople,
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
  } else {
    await db.insert(articles).values(values as any);
    const created = await idFor(db, articles, articles.slug, input.slug);
    if (!created) throw new Error(`insert failed for "${input.slug}"`);
    articleId = created;
  }

  for (const t of input.tags ?? []) {
    await db.insert(articleTags).values({ articleId, tagId: await resolveTag(db, t) });
  }

  // Companies and people are linked only when a profile already exists.
  // Creating a stub from a passing mention would put unverified entities in
  // the entity graph, which the brief forbids.
  const missing: string[] = [];
  for (const name of input.companies ?? []) {
    const id = await idFor(db, companies, companies.name, name);
    if (id) await db.insert(articleCompanies).values({ articleId, companyId: id, mentionType: "mentioned" });
    else missing.push(`company:${name}`);
  }
  for (const name of input.people ?? []) {
    const id = await idFor(db, people, people.name, name);
    if (id) await db.insert(articlePeople).values({ articleId, personId: id, mentionType: "mentioned" });
    else missing.push(`person:${name}`);
  }

  return { articleId, created: !existingId, missing };
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error("usage: ingest-articles.ts <file.json ...>");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
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
    const allMissing = new Set<string>();
    for (const file of files) {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      const batch: ArticleInput[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of batch) {
        const r = await ingest(db, item, published.id);
        r.created ? created++ : updated++;
        r.missing.forEach(m => allMissing.add(m));
        console.log(`[ingest] ${r.created ? "created" : "updated"} #${item.commission} ${item.slug}`);
      }
    }
    console.log(`[ingest] ${created} created, ${updated} updated`);
    if (allMissing.size) {
      console.log(`[ingest] no profile yet (link skipped): ${[...allMissing].join(", ")}`);
    }
  } finally {
    await pool.end();
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(`[ingest] ${err.message}`);
  process.exit(1);
});
