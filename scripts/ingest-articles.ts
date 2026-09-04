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
import { createHash } from "crypto";
import {
  articles, articleTags, articleCompanies, articlePeople, articleCategories,
  articleRelatedEntities,
  tags, categories, companies, people, users, countries, events,
  contentTranslations, homepageSections, redirects, settings,
} from "../drizzle/schema";
import { toDbDate } from "../server/_core/dbValues";

type Db = MySql2Database<Record<string, never>>;

/** One researched article, as produced by the editorial pipeline. */
export interface ArticleInput {
  /** Commission number from the brief, for the audit trail. */
  commission: number;
  headline: string;
  slug: string;
  /** Slugs this article was published under before. A rename keeps the
   *  database row — same id, so translations, links and history survive —
   *  and updates the slug in place; the old URL is a 301 in
   *  content/redirects.json rather than a second copy of the article. */
  previousSlugs?: string[];
  /** Standfirst / deck. Optional. */
  deck?: string;
  excerpt: string;
  /** Body as HTML paragraphs, with contextual links already inline. */
  content: string;
  author: "Mo Qureshi" | "Jakson Gudawela" | "BrentDesk Staff" | "BrentDesk Research" | "Mo Qureshi + BrentDesk Staff";
  primaryCategory: string;
  /** Primary plus secondary categories. Written to article_categories, which
   *  is what relatedContent.service scores relatedness on. */
  categories?: string[];
  /** Slugs of other archive articles this one links to in its prose. */
  internalLinks?: string[];
  tags?: string[];
  companies?: string[];
  /** Exhibitions and conferences the article covers. Linked to the events
   *  table, not the company table. */
  events?: string[];
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
  // Big 5 Construct Saudi cohort. Articles name these companies in whatever
  // form the sentence wanted; the profiles are filed under one of them.
  "Masdar Building Materials Company": "Masdar Building Materials",
  "Al-Futtaim Engineering": "Al-Futtaim Engineering Company",
  "ROSHN Group": "ROSHN",
  "Mace Consult": "Mace",
  "Al Yamamah Steel": "Al Yamamah Steel Industries",
  "Arkaz Alsharq Building Materials": "Arkaz",
  "CPC Holding": "Construction Products Holding Company",
  "CPC": "Construction Products Holding Company",
  "CMCI": "Construction Material Chemical Industries",
  "SICAST": "Specialized Industrial Casting Company",
  "Aratile": "Arabian Tile Company",
  "PRIMECO": "Prime Middle East Trading Company",
  "GASTAT": "General Authority for Statistics",
  "SASO": "Saudi Standards, Metrology and Quality Organization",
  "LCGPA": "Local Content and Government Procurement Authority",
  "MOMAH": "Ministry of Municipalities and Housing",
  "Saudi Building Code Centre": "Saudi Building Code Center",
  "TVTC": "Technical and Vocational Training Corporation",
  "KEPCO": "Korea Electric Power Corporation",
  "EWEC": "Emirates Water and Electricity Company",
  "GACA": "General Authority of Civil Aviation",
  "Al-Muhaidib": "Al-Muhaidib Group",
  "Abdulkadir Al-Muhaidib & Sons": "Al-Muhaidib Group",
};

/**
 * Exhibitions the archive names constantly. An exhibition is not a company,
 * so these live in the events table and link through
 * article_related_entities with entityType "event".
 */
const EVENT_ALIASES: Record<string, string> = {
  "Big 5 Construct Saudi": "Big 5 Construct Saudi 2026",
  "Big 5 Construct Saudi 2026": "Big 5 Construct Saudi 2026",
  "HVACR Saudi Arabia": "HVACR Saudi Arabia 2026",
  "Heavy Saudi Arabia": "Heavy Saudi Arabia 2026",
  "Totally Concrete Saudi Arabia": "Totally Concrete Saudi Arabia 2026",
  "Saudi FM & Clean": "Saudi FM & Clean 2026",
  "Saudi WoodShow": "Saudi WoodShow 2026",
  "LEAP": "LEAP 2026",
  "LEAP 2026": "LEAP 2026",
};

async function idFor(
  db: Db, table: any, column: any, value: string,
): Promise<number | null> {
  const [row] = await db.select({ id: table.id }).from(table).where(eq(column, value)).limit(1);
  return row?.id ?? null;
}

/** Resolve a byline to its user id. Never creates one — the approved list is fixed. */
/** Bylines link to /author/<username>; the seed sets these, but a database
 *  seeded before usernames existed only gets them from a seed that the boot
 *  check no longer runs. The ingest sees every byline on every deploy, so it
 *  is the reliable place to fill a missing one. Same values as the seed. */
const AUTHOR_USERNAMES: Record<string, string> = {
  "Mo Qureshi": "mo-qureshi",
  "Jakson Gudawela": "jakson-gudawela",
  "BrentDesk Research": "brentdesk-research",
  "Mo Qureshi + BrentDesk Staff": "mo-qureshi-brentdesk-staff",
  "BrentDesk Staff": "brentdesk-staff",
};

async function resolveAuthor(db: Db, name: string): Promise<number> {
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.publicName, name))
    .limit(1);
  if (row && !row.username && AUTHOR_USERNAMES[name]) {
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(eq(users.username, AUTHOR_USERNAMES[name])).limit(1);
    if (!taken) await db.update(users).set({ username: AUTHOR_USERNAMES[name] } as any).where(eq(users.id, row.id));
  }
  if (!row) {
    // List what the database actually has rather than a hardcoded set. The
    // hardcoded list said "Mo" while the seeded author was "Mo Qureshi",
    // so the message that was supposed to help sent the writing the wrong
    // way. Reading the names back cannot drift from the seed.
    const known = await db.select({ name: users.publicName }).from(users);
    const names = known.map(r => r.name).filter(Boolean).sort();
    throw new Error(
      `Unknown byline "${name}". Bylines present in this database: ` +
        `${names.join(", ") || "(none — run the author seed first)"}.`,
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

  let existingId = await idFor(db, articles, articles.slug, input.slug);
  if (!existingId) {
    for (const old of input.previousSlugs ?? []) {
      existingId = await idFor(db, articles, articles.slug, old);
      if (existingId) break;
    }
  }
  let articleId: number;
  if (existingId) {
    // Only write when something the reader sees has changed. `updatedAt`
    // is ON UPDATE CURRENT_TIMESTAMP, so an unconditional UPDATE on every
    // boot bumped dateModified on all 288 articles each deploy — a signal
    // to search engines that the whole archive was revised daily.
    const [cur] = await db.select({
      slug: articles.slug,
      title: articles.title, excerpt: articles.excerpt, content: articles.content,
      seoTitle: articles.seoTitle, seoDescription: articles.seoDescription,
      eventDate: articles.eventDate, sourceUrl: articles.sourceUrl,
    }).from(articles).where(eq(articles.id, existingId)).limit(1);
    const same = cur && (["slug","title","excerpt","content","seoTitle","seoDescription","sourceUrl"] as const)
      .every(k => (cur as any)[k] === (values as any)[k])
      && String(cur.eventDate ?? "").slice(0, 10) === String(values.eventDate ?? "").slice(0, 10);
    if (!same) {
      // An edit is not a publication. Re-ingesting a corrected article must
      // keep the date it was first published — an audit that touched every
      // headline used to re-date the whole archive to the day it deployed.
      const { publishedAt: _keep, ...edits } = values;
      await db.update(articles).set(edits as any).where(eq(articles.id, existingId));
    }
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

  for (const raw of input.events ?? []) {
    const title = EVENT_ALIASES[raw] ?? raw;
    const id = await idFor(db, events, events.title, title);
    if (id) {
      await db.insert(articleRelatedEntities).values({
        articleId, entityType: "event", entityId: id,
      });
    } else missing.push(`event:${raw}`);
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
/** Where the bundled archive lives, in preference order. */
function archiveCandidates(files?: string[]): string[] {
  return files?.length
    ? files
    : [bundledFile("articles.json") ?? path.resolve(process.cwd(), "dist", "articles.json"),
       path.resolve(process.cwd(), "dist", "articles.json")];
}

/** Existing archive files, deduped. Both default candidates resolve to the
 *  same file in most layouts, and ingesting a file twice does the work twice
 *  — the second pass is an update of what the first just created. */
function archiveSources(files?: string[]): string[] {
  return [...new Set(archiveCandidates(files).map(f => path.resolve(f)))].filter(f => existsSync(f));
}

/**
 * How many articles the bundled archive would publish right now.
 *
 * Scheduled commissions dated in the future are excluded, because they are
 * deliberately not published yet — counting them would leave the boot check
 * permanently convinced the database was behind. Returns 0 when the archive
 * file cannot be read, which makes the caller fall back to its own test
 * rather than run an ingest that has nothing to ingest.
 */
/**
 * How many translated fields the build carries.
 *
 * The boot check compared article counts alone, so a deploy whose only new
 * content was a translated archive looked, to the check, exactly like a
 * deploy with nothing to publish: 268 articles in the build, 268 in the
 * database, skip. The Arabic then never landed and the site served English
 * under an Arabic switcher. Counting fields rather than files means adding
 * bodies to already-translated headlines also registers as new content.
 */
/**
 * Where a bundled data file might be, next to this module and under dist/.
 *
 * `import.meta.dirname` is defined in the built ESM bundle and undefined
 * under a CJS transpile, where passing it to path.resolve throws. The throw
 * was caught and turned into "0 files", which silently means "nothing to
 * publish" — a failure mode that looks exactly like success in the logs.
 */
function bundledFile(name: string): string | undefined {
  const here = typeof import.meta.dirname === "string" ? import.meta.dirname : undefined;
  const candidates = [
    here ? path.resolve(here, name) : undefined,
    path.resolve(process.cwd(), "dist", name),
  ].filter((f): f is string => !!f);
  return [...new Set(candidates)].find(f => existsSync(f));
}

export function publishableTranslationCount(): number {
  try {
    const file = bundledFile("translations.json");
    if (!file) return 0;
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const batch: Array<{ fields?: Record<string, string> }> =
      Array.isArray(parsed) ? parsed : [parsed];
    return batch.reduce(
      (n, t) => n + Object.values(t.fields ?? {}).filter(v => v && String(v).trim()).length,
      0,
    );
  } catch {
    return 0;
  }
}

export function publishableArticleCount(): number {
  try {
    const file = archiveSources()[0];
    if (!file) return 0;
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const batch: ArticleInput[] = Array.isArray(parsed) ? parsed : [parsed];
    const today = new Date().toISOString().slice(0, 10);
    return batch.filter(
      a => !((a as any).status === "SCHEDULED" && a.eventDate > today),
    ).length;
  } catch {
    return 0;
  }
}


/**
 * Publish the translated archive bundled at dist/translations.json.
 *
 * Runs after the articles, because a translation is keyed to an article that
 * has to exist first. Idempotent on (entity, locale, field): re-running
 * updates in place, so a corrected translation ships on the next deploy
 * without anything to clean up.
 *
 * Rows land as `published` — these were reviewed in the repository before
 * they were merged, which is the review step a runtime translation gets in
 * the admin panel instead.
 */
/** Translatable site furniture, by the entityType a translation file declares.
 *  Each entry needs a table with `id`, `slug` and `name`. */
const FURNITURE: Record<string, { entityType: string; table: any }> = {
  category: { entityType: "category", table: categories },
  homepage_section: { entityType: "homepage_section", table: homepageSections },
};

async function ingestTranslations(db: Db): Promise<{ written: number; missing: string[] }> {
  const file = bundledFile("translations.json");
  if (!file) return { written: 0, missing: [] };

  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const batch: Array<{ slug: string; locale: string; fields: Record<string, string>; translator?: string }> =
    Array.isArray(parsed) ? parsed : [parsed];
  if (!batch.length) return { written: 0, missing: [] };

  const { createHash } = await import("crypto");
  const hash = (t: string) => createHash("sha256").update(t).digest("hex");

  let written = 0;
  const missing: string[] = [];
  const now = toDbDate(new Date());

  for (const t of batch) {
    // The site's own chrome — navigation, buttons, labels — rather than an
    // article. Stored under entityType "ui" with the string key as the
    // field, which is why entityId is 0: there is no row it belongs to.
    if ((t as any).entityType === "ui") {
      for (const [key, value] of Object.entries(t.fields)) {
        if (!value || !String(value).trim()) continue;
        await db.insert(contentTranslations).values({
          entityType: "ui", entityId: 0, locale: t.locale, field: key, value,
          source: "ai", status: "published", model: t.translator ?? null,
          sourceHash: null, translatedAt: now,
        } as any).onDuplicateKeyUpdate({
          set: { value, status: "published", model: t.translator ?? null, translatedAt: now } as any,
        });
        written++;
      }
      continue;
    }

    // The site's furniture: category names and homepage block headings.
    // Editors write these, they are not article copy, and a reader meets them
    // on every page — an Arabic homepage under an English "Latest Headlines"
    // is the same half-translated page as an Arabic article under an English
    // masthead. Keyed by slug, because ids differ per environment.
    const furniture = FURNITURE[(t as any).entityType as string];
    if (furniture) {
      const [ent] = await db
        .select({ id: furniture.table.id, name: furniture.table.name })
        .from(furniture.table)
        .where(eq(furniture.table.slug, t.slug))
        .limit(1);
      if (!ent) { missing.push(`${(t as any).entityType}:${t.slug}`); continue; }
      for (const [field, value] of Object.entries(t.fields)) {
        if (!value || !String(value).trim()) continue;
        const source = (ent as any)[field] as string | undefined;
        await db.insert(contentTranslations).values({
          entityType: furniture.entityType, entityId: ent.id, locale: t.locale,
          field, value, source: "ai", status: "published",
          model: t.translator ?? null,
          sourceHash: source ? hash(source) : null, translatedAt: now,
        } as any).onDuplicateKeyUpdate({
          set: {
            value, source: "ai", status: "published", model: t.translator ?? null,
            sourceHash: source ? hash(source) : null, translatedAt: now,
          } as any,
        });
        written++;
      }
      continue;
    }

    const [row] = await db
      .select({ id: articles.id, title: articles.title, excerpt: articles.excerpt,
                content: articles.content, seoTitle: articles.seoTitle,
                seoDescription: articles.seoDescription })
      .from(articles).where(eq(articles.slug, t.slug)).limit(1);
    if (!row) { missing.push(t.slug); continue; }

    for (const [field, value] of Object.entries(t.fields)) {
      if (!value || !String(value).trim()) continue;
      const source = (row as any)[field] as string | undefined;
      await db.insert(contentTranslations).values({
        entityType: "article",
        entityId: row.id,
        locale: t.locale,
        field,
        value,
        source: "ai",
        status: "published",
        model: t.translator ?? null,
        // Hashed against the English it was made from, so editing the article
        // later marks the translation stale instead of silently serving a
        // translation of a paragraph that is no longer there.
        sourceHash: source ? hash(source) : null,
        translatedAt: now,
      } as any).onDuplicateKeyUpdate({
        set: {
          value, source: "ai", status: "published", model: t.translator ?? null,
          sourceHash: source ? hash(source) : null, translatedAt: now,
        } as any,
      });
      written++;
    }
  }
  return { written, missing };
}


/**
 * Publish the redirect list bundled at dist/redirects.json. A merged or
 * renamed article records its old URL here so the request layer answers
 * it with a 301 instead of a 404. Upsert on fromPath, so re-running is
 * safe and an edited target replaces the old one.
 */
async function ingestRedirects(db: Db): Promise<number> {
  const file = bundledFile("redirects.json");
  if (!file) return 0;
  let rows: { from: string; to: string }[] = [];
  try { rows = JSON.parse(readFileSync(file, "utf8")).redirects ?? []; } catch { return 0; }
  let n = 0;
  for (const r of rows) {
    if (!r.from || !r.to || r.from === r.to) continue;
    const [existing] = await db.select({ id: redirects.id, toPath: redirects.toPath })
      .from(redirects).where(eq(redirects.fromPath, r.from)).limit(1);
    if (existing) {
      if (existing.toPath !== r.to) await db.update(redirects).set({ toPath: r.to, statusCode: 301, isActive: 1 } as any).where(eq(redirects.id, existing.id));
    } else {
      await db.insert(redirects).values({ fromPath: r.from, toPath: r.to, statusCode: 301, isActive: 1 } as any);
    }
    n++;
  }
  return n;
}

/**
 * Unpublish archive articles that were merged away.
 *
 * Deleting the JSON file removes an article from the build, not from the
 * database: the row stayed published, listed in feeds and sitemaps and
 * indexed at its old URL, while the redirect for that URL sent readers
 * elsewhere — two copies of one story as far as a crawler could tell. An
 * article whose path is a redirect source and whose slug the archive no
 * longer carries is moved to the archived status, marked noindex and has its
 * publication date cleared, which is the "unpublished" every public query
 * already understands. A slug the archive still ships is never touched, so a
 * redirect cannot retire a live article by accident.
 */
async function retireRedirectedArticles(db: Db, live: Set<string>): Promise<number> {
  const file = bundledFile("redirects.json");
  if (!file) return 0;
  let rows: { from: string; to: string }[] = [];
  try { rows = JSON.parse(readFileSync(file, "utf8")).redirects ?? []; } catch { return 0; }
  const { workflowService } = await import("../server/services/workflow.service");
  const archived = await workflowService.getStatusBySlug("editorial", "archived");
  const published = await workflowService.getStatusBySlug("editorial", "published");
  if (!archived || !published) return 0;
  let n = 0;
  for (const r of rows) {
    const slug = String(r.from ?? "").split("/").filter(Boolean).pop();
    if (!slug || live.has(slug)) continue;
    const [row] = await db.select({ id: articles.id, statusId: articles.statusId })
      .from(articles).where(eq(articles.slug, slug)).limit(1);
    if (!row || row.statusId !== published.id) continue;
    await db.update(articles)
      .set({ statusId: archived.id, robotsIndexing: "noindex", publishedAt: null } as any)
      .where(eq(articles.id, row.id));
    n++;
  }
  return n;
}

/**
 * Fingerprint of everything this build would publish.
 *
 * The boot check compares row counts, and a release that edits, merges or
 * renames articles ships the same number of rows as the one before it —
 * invisible to a count, so the corrected headlines never reached the site.
 * The fingerprint is recorded after a successful ingest and compared on the
 * next boot; a build that changed anything the reader sees no longer needs
 * anyone to remember a deploy variable.
 */
export function archiveRevision(): string {
  const h = createHash("sha256");
  for (const name of ["articles.json", "translations.json", "redirects.json"]) {
    const f = bundledFile(name);
    h.update(`${name}:`);
    if (f) h.update(readFileSync(f));
  }
  return h.digest("hex").slice(0, 16);
}

const REVISION_KEY = "archive_revision";

/** The fingerprint last published, "" when none was ever recorded, null when
 *  the table could not be read — the caller must not decide on a null. */
export async function recordedArchiveRevision(db: Db): Promise<string | null> {
  try {
    const [row] = await db.select({ value: settings.value })
      .from(settings).where(eq(settings.key, REVISION_KEY)).limit(1);
    if (!row) return "";
    // A JSON column hands the string back either parsed or as its JSON
    // text ("\"abc\"", quotes included) depending on the driver; either
    // way the fingerprint is the bare string.
    const raw = row.value;
    if (typeof raw !== "string") return raw == null ? "" : String(raw);
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : raw;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

async function recordArchiveRevision(db: Db, rev: string): Promise<void> {
  const [existing] = await db.select({ id: settings.id })
    .from(settings).where(eq(settings.key, REVISION_KEY)).limit(1);
  if (existing) {
    await db.update(settings).set({ value: rev } as any).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      key: REVISION_KEY, value: rev, type: "string", group: "content",
      label: "Published archive revision",
      description: "Fingerprint of the bundled editorial archive the boot ingest last published.",
      isPublic: 0,
    } as any);
  }
}

export async function runIngest(files?: string[]): Promise<{ created: number; updated: number; missing: string[] }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sources = archiveSources(files);
  if (!sources.length) {
    throw new Error(`no article files found (looked in: ${archiveCandidates(files).join(", ")})`);
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

    let created = 0, updated = 0, held = 0;
    const missing = new Set<string>();
    const seen: ArticleInput[] = [];
    const shipped = new Set<string>();
    const today = new Date().toISOString().slice(0, 10);
    for (const file of sources) {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      const batch: ArticleInput[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of batch) {
        // A commission dated ahead of today is written but not yet news. It
        // ships in the archive file so the next deploy after its date picks
        // it up, and stays out of the database until then rather than being
        // published under a date that has not happened.
        shipped.add(item.slug);
        if ((item as any).status === "SCHEDULED" && item.eventDate > today) { held++; continue; }
        seen.push(item);
        const r = await ingest(db, item, published.id);
        r.created ? created++ : updated++;
        r.missing.forEach(m => missing.add(m));
      }
    }
    const edges = await linkRelatedArticles(db, seen);
    const redirectCount = await ingestRedirects(db);
    if (redirectCount) console.log(`[ingest] ${redirectCount} redirects published`);
    const retired = await retireRedirectedArticles(db, shipped);
    if (retired) console.log(`[ingest] ${retired} merged articles unpublished`);
    const translations = await ingestTranslations(db);
    if (translations.written) {
      console.log(`[ingest] ${translations.written} translated fields published` +
        (translations.missing.length
          ? ` · ${translations.missing.length} referenced an article that is not in the archive`
          : ""));
    }
    console.log(`[ingest] ${created} created, ${updated} updated, ${edges} related-article links`);
    if (held) console.log(`[ingest] ${held} scheduled for a later date and held back`);
    if (missing.size) {
      // Hundreds of one-off mentions would bury the useful output; the full
      // list is derivable from the article files if anyone needs it.
      const sample = [...missing].slice(0, 12).join(", ");
      console.log(
        `[ingest] ${missing.size} mentioned entities have no profile yet, so no link was made ` +
          `(e.g. ${sample}${missing.size > 12 ? ", …" : ""})`,
      );
    }
    // Only a full run of the bundled archive is "the archive published".
    if (!files?.length) await recordArchiveRevision(db, archiveRevision());
    return { created, updated, missing: [...missing] };
  } finally {
    await pool.end();
  }
}
