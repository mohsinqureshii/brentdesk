import { publication, getBaseUrl } from "../../shared/publication";

const DESK_AUTHOR = `${publication.name} Desk`;
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import {
  articleCategories,
  articleCompanies,
  articleEditorialBatches,
  articleEvents,
  articleKeywords,
  articleLocations,
  articlePeople,
  articleSourceReferences,
  articleTags,
  articleTopics,
  articles,
  categories,
  cities,
  companies,
  countries,
  editorialBatches,
  events,
  geoRegions,
  keywords,
  people,
  tags,
  topics,
  users,
  workflowAuditLog,
  workflowStatuses,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { MediaService } from "./media.service";
import { toDbDate } from "../_core/dbValues";

export type EventBucket = "LEAP 2026" | "DeepFest 2026" | "Both";
export type RightsStatus = "owned" | "licensed" | "editorial_use" | "generated" | "pending_review";

export interface EditorialBatchArticle {
  batch_id: string;
  sequence: number;
  candidate_id: string;
  canonical_announcement_key: string;
  title: string;
  slug: string;
  author_public_name: string;
  workflow_status_slug: "draft";
  article_type: "news" | "opinion" | "press_release" | "report" | "interview";
  display_datetime_local: string;
  display_datetime_utc: string;
  timezone: "Asia/Riyadh";
  excerpt: string;
  content_html: string;
  content_word_count: number;
  primary_category_name: string;
  category_names: string[];
  event_names: string[];
  event_bucket: EventBucket;
  company_names: string[];
  people_names: string[];
  topic_names: string[];
  tag_names: string[];
  coverage: {
    country_iso2: "SA";
    country_name: string;
    city_name: string;
    region_name: string;
  };
  seo: {
    focus_keyword: string;
    keywords: string[];
    seo_title: string;
    seo_description: string;
    og_title: string;
    og_description: string;
    google_news_keywords: string[];
    canonical_url: string;
    robots_indexing: "index" | "noindex";
  };
  sources: {
    primary_title: string;
    primary_url: string;
    supporting_urls: string[];
    verified_angle_summary: string;
    verified_key_facts: string;
    confidence: number;
  };
  image: {
    local_path: string;
    filename: string;
    mime_type: "image/webp" | "image/jpeg" | "image/png";
    width: number;
    height: number;
    alt: string;
    caption: string;
    credit: string;
    source_url: string;
    license: string;
    rights_status: RightsStatus;
    rights_notes: string;
  };
}

export interface EditorialBatchManifest {
  batch: {
    id: string;
    name: string;
    article_count: number;
    author_public_name: string; // canonical desk author, `${publication.name} Desk`
    workflow_status_slug: "draft";
    public_publish_allowed: false;
    review_required: true;
    date: "2026-08-31";
    timezone: "Asia/Riyadh";
    window_start: string;
    window_end: string;
  };
  articles: EditorialBatchArticle[];
}

export interface ImportOptions {
  dryRun?: boolean;
  createMissingTaxonomy?: boolean;
  createMissingEntities?: boolean;
  uploadedById?: number;
}

export interface ValidationIssue {
  level: "error" | "warning";
  sequence?: number;
  field: string;
  message: string;
}

export interface ImportReport {
  batchId: string;
  dryRun: boolean;
  valid: boolean;
  issues: ValidationIssue[];
  plannedArticles: number;
  importedArticles: number;
  skippedArticles: number;
  articleIds: number[];
}

const mediaService = new MediaService();

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function articleBodyHtml(value: string): string {
  const referencesHeading = /<h[1-6][^>]*>\s*References\s*<\/h[1-6]>/i;
  const match = referencesHeading.exec(value);
  return match?.index === undefined ? value : value.slice(0, match.index);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * MySQL DATETIME/TIMESTAMP columns reject the ISO-8601 form the manifest
 * carries ("2026-08-31T09:00:00Z") with ER_TRUNCATED_WRONG_VALUE — the
 * "T" separator and trailing "Z" are both invalid. Convert to the
 * "YYYY-MM-DD HH:MM:SS" MySQL expects, keeping the instant in UTC.
 */
function toMysqlDatetime(isoUtc: string): string {
  const parsed = new Date(isoUtc);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid display_datetime_utc: '${isoUtc}'`);
  }
  return toDbDate(parsed);
}

function publisherFromUrl(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function loadEditorialBatchManifest(manifestPath: string): Promise<EditorialBatchManifest> {
  const resolved = path.resolve(manifestPath);
  const parsed = JSON.parse(await readFile(resolved, "utf8"));
  return parsed as EditorialBatchManifest;
}

export async function validateEditorialBatchManifest(manifest: EditorialBatchManifest): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const error = (field: string, message: string, sequence?: number) => issues.push({ level: "error", sequence, field, message });
  const warning = (field: string, message: string, sequence?: number) => issues.push({ level: "warning", sequence, field, message });

  if (manifest.batch.id !== "leap-deepfest-2026-day1") error("batch.id", "Unexpected batch ID.");
  if (manifest.batch.article_count !== 100) error("batch.article_count", "Batch must declare exactly 100 articles.");
  if (manifest.articles.length !== 100) error("articles", `Batch must contain exactly 100 articles; found ${manifest.articles.length}.`);
  if (manifest.batch.author_public_name !== DESK_AUTHOR) error("batch.author_public_name", `Author must be ${DESK_AUTHOR}.`);
  if (manifest.batch.workflow_status_slug !== "draft") error("batch.workflow_status_slug", "Batch must target draft status.");
  if (manifest.batch.public_publish_allowed !== false) error("batch.public_publish_allowed", "Publishing must remain disabled.");
  if (manifest.batch.review_required !== true) error("batch.review_required", "Editorial review must be required.");
  if (manifest.batch.date !== "2026-08-31" || manifest.batch.timezone !== "Asia/Riyadh") error("batch.date", "Batch date/timezone must be 2026-08-31 Asia/Riyadh.");

  const sequences = new Set<number>();
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const announcementKeys = new Set<string>();
  const focusKeywords = new Set<string>();

  for (const article of manifest.articles) {
    const seq = article.sequence;
    if (!Number.isInteger(seq) || seq < 1 || seq > 100) error("sequence", "Sequence must be an integer from 1 to 100.", seq);
    if (sequences.has(seq)) error("sequence", "Duplicate sequence.", seq);
    sequences.add(seq);

    const titleKey = normalize(article.title);
    const slugKey = normalize(article.slug);
    const announcementKey = normalize(article.canonical_announcement_key);
    const focusKey = normalize(article.seo.focus_keyword);
    if (!article.title || article.title.length > 512) error("title", "Title is required and must be at most 512 characters.", seq);
    if (titles.has(titleKey)) error("title", "Duplicate title.", seq);
    titles.add(titleKey);
    if (!article.slug || article.slug.length > 512 || article.slug !== slugify(article.slug)) error("slug", "Slug must be lowercase, URL-safe and at most 512 characters.", seq);
    if (slugs.has(slugKey)) error("slug", "Duplicate slug.", seq);
    slugs.add(slugKey);
    if (!announcementKey) error("canonical_announcement_key", "Canonical announcement key is required.", seq);
    if (announcementKeys.has(announcementKey)) error("canonical_announcement_key", "Duplicate underlying news announcement.", seq);
    announcementKeys.add(announcementKey);
    if (!focusKey) error("seo.focus_keyword", "Focus keyword is required.", seq);
    if (focusKeywords.has(focusKey)) error("seo.focus_keyword", "Focus keyword must be unique across the batch.", seq);
    focusKeywords.add(focusKey);

    if (article.author_public_name !== DESK_AUTHOR) error("author_public_name", "Author must be the canonical desk Desk.", seq);
    if (article.workflow_status_slug !== "draft") error("workflow_status_slug", "Article must remain a draft.", seq);
    if (article.timezone !== "Asia/Riyadh") error("timezone", "Article timezone must be Asia/Riyadh.", seq);
    if (!article.display_datetime_local.startsWith("2026-08-31T")) error("display_datetime_local", "Display date must be 31 August 2026.", seq);
    const hour = Number(article.display_datetime_local.slice(11, 13));
    if (!Number.isFinite(hour) || hour < 12 || hour > 23) error("display_datetime_local", "Display time must be between 12:00 PM and 11:59 PM Riyadh time.", seq);

    const computedWords = stripHtml(articleBodyHtml(article.content_html || "")).split(/\s+/).filter(Boolean).length;
    if (!article.content_html) error("content_html", "Article body is required.", seq);
    if (computedWords < 800 || computedWords > 1400) error("content_html", `Article body must contain 800–1,400 words; found ${computedWords}.`, seq);
    if (Math.abs(computedWords - article.content_word_count) > 5) error("content_word_count", "Stored word count does not match article HTML.", seq);
    if (!article.excerpt || article.excerpt.length > 320) error("excerpt", "Excerpt is required and should be at most 320 characters.", seq);

    if (!article.primary_category_name || article.category_names.length === 0) error("category_names", "At least one category is required.", seq);
    if (!article.event_names.length || !article.event_names.every((name) => ["LEAP 2026", "DeepFest 2026"].includes(name))) error("event_names", "Every article must link to LEAP 2026, DeepFest 2026, or both.", seq);
    if (article.company_names.length === 0) error("company_names", "At least one company or institution is required.", seq);
    if (article.topic_names.length < 2) warning("topic_names", "Fewer than two controlled topics.", seq);
    if (article.tag_names.length < 3) warning("tag_names", "Fewer than three tags.", seq);
    if (article.coverage.country_iso2 !== "SA" || article.coverage.city_name !== "Riyadh") error("coverage", "Coverage must map to Saudi Arabia / Riyadh.", seq);

    if (!article.seo.seo_title || article.seo.seo_title.length > 65) error("seo.seo_title", "SEO title must be 1–65 characters.", seq);
    if (!article.seo.seo_description || article.seo.seo_description.length > 165) error("seo.seo_description", "SEO description must be 1–165 characters.", seq);
    if (article.seo.keywords.length < 5) warning("seo.keywords", "Use at least five natural keywords.", seq);
    if (!article.seo.canonical_url.startsWith(`${getBaseUrl()}/`)) error("seo.canonical_url", "Canonical URL must use the publication base URL over HTTPS.", seq);

    if (!article.sources.primary_url.startsWith("https://")) error("sources.primary_url", "Primary source must be an HTTPS URL.", seq);
    if (article.sources.confidence < 70) error("sources.confidence", "Source confidence must be at least 70.", seq);

    if (!article.image.local_path || !(await fileExists(article.image.local_path))) error("image.local_path", "Local image file is missing.", seq);
    if (article.image.width !== 1600 || article.image.height !== 900) error("image.dimensions", "Image must be exactly 1600×900.", seq);
    if (!article.image.alt || article.image.alt.length > 255) error("image.alt", "Image alt text is required and must be at most 255 characters.", seq);
    if (!article.image.caption) error("image.caption", "Image caption is required.", seq);
    if (!article.image.credit) error("image.credit", "Image credit is required.", seq);
    if (!article.image.license) error("image.license", "Image license label is required.", seq);
    if (article.image.rights_status === "pending_review") warning("image.rights_status", "Image rights still require editorial review.", seq);
  }

  for (let seq = 1; seq <= 100; seq += 1) {
    if (!sequences.has(seq)) error("sequence", `Missing sequence ${seq}.`);
  }

  return issues;
}

async function getInitialStatus(db: any, workflowType: string) {
  const rows = await db.select().from(workflowStatuses).where(and(eq(workflowStatuses.workflowType, workflowType), eq(workflowStatuses.isInitial, 1))).limit(1);
  if (!rows[0]) throw new Error(`No initial workflow status found for ${workflowType}`);
  return rows[0];
}

async function requireDraftStatus(db: any) {
  const rows = await db.select().from(workflowStatuses).where(and(eq(workflowStatuses.workflowType, "editorial"), eq(workflowStatuses.slug, "draft"))).limit(1);
  const status = rows[0] || await getInitialStatus(db, "editorial");
  if (status.isPublished) throw new Error("Refusing import: resolved editorial status is published.");
  return status;
}

async function requireDeskAuthor(db: any, publicName: string) {
  const rows = await db.select().from(users);
  const author = rows.find((row: any) => [row.publicName, row.name, row.username].filter(Boolean).some((value: string) => normalize(value) === normalize(publicName)));
  if (!author) throw new Error(`Author '${publicName}' was not found. Create or rename the canonical desk authop Desk backend user before import.`);
  return author;
}

async function resolveEvent(db: any, eventName: string) {
  const rows = await db.select().from(events);
  const event = rows.find((row: any) => normalize(row.title) === normalize(eventName) || normalize(row.slug) === slugify(eventName));
  if (!event) throw new Error(`Required event '${eventName}' was not found.`);
  return event;
}

async function resolveCountry(db: any, iso2: string) {
  const rows = await db.select().from(countries).where(eq(countries.iso2, iso2)).limit(1);
  if (!rows[0]) throw new Error(`Required country '${iso2}' was not found.`);
  return rows[0];
}

async function resolveCity(db: any, countryId: number, cityName: string) {
  const rows = await db.select().from(cities).where(eq(cities.countryId, countryId));
  const city = rows.find((row: any) => normalize(row.name) === normalize(cityName));
  if (!city) throw new Error(`Required city '${cityName}' was not found.`);
  return city;
}

async function resolveRegion(db: any, countryId: number, regionName: string) {
  const rows = await db.select().from(geoRegions).where(eq(geoRegions.countryId, countryId));
  return rows.find((row: any) => normalize(row.name) === normalize(regionName)) || null;
}

async function resolveCategory(db: any, name: string, createMissing: boolean) {
  const rows = await db.select().from(categories).where(eq(categories.module, "news"));
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug) === slugify(name));
  if (match) return match;
  if (!createMissing) throw new Error(`News category '${name}' was not found.`);
  const result = await db.insert(categories).values({ name, slug: slugify(name), module: "news", isActive: 1 } as any);
  return { id: result[0].insertId, name, slug: slugify(name) };
}

async function resolveTopic(db: any, name: string, createMissing: boolean) {
  const rows = await db.select().from(topics);
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug) === slugify(name));
  if (match) return match;
  if (!createMissing) throw new Error(`Topic '${name}' was not found.`);
  const result = await db.insert(topics).values({ name, slug: slugify(name), isActive: 1 } as any);
  return { id: result[0].insertId, name, slug: slugify(name) };
}

async function resolveTag(db: any, name: string, createMissing: boolean) {
  const rows = await db.select().from(tags);
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug) === slugify(name));
  if (match) return match;
  if (!createMissing) throw new Error(`Tag '${name}' was not found.`);
  const tagType = name === "LEAP 2026" || name === "DeepFest 2026" ? "event" : name === "Saudi Arabia" || name === "Riyadh" ? "region" : "general";
  const result = await db.insert(tags).values({ name, slug: slugify(name), tagType, isActive: 1 } as any);
  return { id: result[0].insertId, name, slug: slugify(name) };
}

async function resolveKeyword(db: any, name: string, keywordType: "primary" | "secondary", createMissing: boolean) {
  const rows = await db.select().from(keywords);
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug || "") === slugify(name));
  if (match) return match;
  if (!createMissing) throw new Error(`SEO keyword '${name}' was not found.`);
  const result = await db.insert(keywords).values({ name, slug: slugify(name), keywordType, isActive: 1 } as any);
  return { id: result[0].insertId, name, slug: slugify(name) };
}

type EntityResolutionCache = Map<string, any>;

function entityCacheKey(name: string): string {
  return slugify(name);
}

async function resolveCompany(db: any, name: string, createdById: number, createMissing: boolean, cache?: EntityResolutionCache) {
  const key = entityCacheKey(name);
  if (cache?.has(key)) return cache.get(key);
  const rows = await db.select().from(companies);
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug) === key);
  if (match) {
    cache?.set(key, match);
    return match;
  }
  if (!createMissing) throw new Error(`Company/institution '${name}' was not found.`);
  const status = await getInitialStatus(db, "company");
  const result = await db.insert(companies).values({ name, slug: key, statusId: status.id, createdByUserId: createdById, dataSource: "editorial", lastUpdatedBy: "editorial_batch" } as any);
  const created = { id: result[0].insertId, name, slug: key };
  cache?.set(key, created);
  return created;
}

async function resolvePerson(db: any, name: string, createdById: number, createMissing: boolean, cache?: EntityResolutionCache) {
  const key = entityCacheKey(name);
  if (cache?.has(key)) return cache.get(key);
  const rows = await db.select().from(people);
  const match = rows.find((row: any) => normalize(row.name) === normalize(name) || normalize(row.slug) === key);
  if (match) {
    cache?.set(key, match);
    return match;
  }
  if (!createMissing) throw new Error(`Person '${name}' was not found.`);
  const status = await getInitialStatus(db, "person");
  const result = await db.insert(people).values({ name, slug: key, statusId: status.id, createdByUserId: createdById } as any);
  const created = { id: result[0].insertId, name, slug: key };
  cache?.set(key, created);
  return created;
}

export async function importEditorialBatch(manifest: EditorialBatchManifest, options: ImportOptions = {}): Promise<ImportReport> {
  const dryRun = options.dryRun !== false;
  const issues = await validateEditorialBatchManifest(manifest);
  const blocking = issues.filter((issue) => issue.level === "error");
  const report: ImportReport = {
    batchId: manifest.batch.id,
    dryRun,
    valid: blocking.length === 0,
    issues,
    plannedArticles: manifest.articles.length,
    importedArticles: 0,
    skippedArticles: 0,
    articleIds: [],
  };
  if (blocking.length || dryRun) return report;

  const db = await getDb();
  if (!db) throw new Error("Database not available. Run the importer in the deployed backend environment or provide DATABASE_URL.");
  const createMissingTaxonomy = options.createMissingTaxonomy !== false;
  const createMissingEntities = options.createMissingEntities !== false;

  const draftStatus = await requireDraftStatus(db);
  const author = await requireDeskAuthor(db, manifest.batch.author_public_name);
  const eventMap = new Map<string, any>();
  for (const eventName of ["LEAP 2026", "DeepFest 2026"]) eventMap.set(eventName, await resolveEvent(db, eventName));
  const companyCache: EntityResolutionCache = new Map();
  const personCache: EntityResolutionCache = new Map();
  const country = await resolveCountry(db, "SA");
  const city = await resolveCity(db, country.id, "Riyadh");
  const region = await resolveRegion(db, country.id, "Gulf Region");

  const existingBatch = await db.select().from(editorialBatches).where(eq(editorialBatches.batchKey, manifest.batch.id)).limit(1);
  let batchId: number;
  if (existingBatch[0]) {
    batchId = existingBatch[0].id;
    if (existingBatch[0].status === "imported" && Number(existingBatch[0].importedArticleCount) === manifest.articles.length) {
      report.skippedArticles = manifest.articles.length;
      return report;
    }
    await db.update(editorialBatches).set({ status: "importing", metadata: manifest.batch as any } as any).where(eq(editorialBatches.id, batchId));
  } else {
    const result = await db.insert(editorialBatches).values({
      batchKey: manifest.batch.id,
      name: manifest.batch.name,
      status: "importing",
      requestedArticleCount: manifest.articles.length,
      importedArticleCount: 0,
      metadata: manifest.batch as any,
      createdById: author.id,
    } as any);
    batchId = result[0].insertId;
  }

  try {
    for (const article of manifest.articles) {
      const prior = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, article.slug)).limit(1);
      if (prior[0]) throw new Error(`Slug '${article.slug}' already exists; refusing to overwrite an existing article.`);

      const imageBuffer = await readFile(article.image.local_path);
      const mediaItem = await mediaService.upload({
        file: imageBuffer,
        filename: article.image.filename,
        mimeType: article.image.mime_type,
        uploadedById: options.uploadedById || author.id,
        folder: "/events/leap-deepfest-2026",
        alt: article.image.alt,
        caption: article.image.caption,
        credit: article.image.credit,
        sourceUrl: article.image.source_url,
        license: article.image.license,
        rightsStatus: article.image.rights_status,
        rightsNotes: article.image.rights_notes,
      });

      const persistedArticleId = await db.transaction(async (tx: any) => {
        const categoryRows = [];
        for (const name of unique(article.category_names)) categoryRows.push(await resolveCategory(tx, name, createMissingTaxonomy));
        const topicRows = [];
        for (const name of unique(article.topic_names)) topicRows.push(await resolveTopic(tx, name, createMissingTaxonomy));
        const tagRows = [];
        for (const name of unique(article.tag_names)) tagRows.push(await resolveTag(tx, name, createMissingTaxonomy));
        const companyRows = [];
        for (const name of unique(article.company_names)) companyRows.push(await resolveCompany(tx, name, author.id, createMissingEntities, companyCache));
        const personRows = [];
        for (const name of unique(article.people_names)) personRows.push(await resolvePerson(tx, name, author.id, createMissingEntities, personCache));
        const focusKeyword = await resolveKeyword(tx, article.seo.focus_keyword, "primary", createMissingTaxonomy);
        const keywordRows = [focusKeyword];
        for (const name of unique(article.seo.keywords).filter((value) => normalize(value) !== normalize(article.seo.focus_keyword))) {
          keywordRows.push(await resolveKeyword(tx, name, "secondary", createMissingTaxonomy));
        }

        const primaryCategory = categoryRows.find((row: any) => normalize(row.name) === normalize(article.primary_category_name)) || categoryRows[0];
        const insertResult = await tx.insert(articles).values({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content_html,
          featuredImageId: mediaItem.id,
          ogImageId: mediaItem.id,
          authorId: author.id,
          statusId: draftStatus.id,
          primaryCategoryId: primaryCategory.id,
          focusKeywordId: focusKeyword.id,
          coverageCountryId: country.id,
          coverageGeoRegionId: region?.id || null,
          coverageCityId: city.id,
          publishedAt: toMysqlDatetime(article.display_datetime_utc),
          scheduledAt: null,
          articleType: article.article_type,
          robotsIndexing: article.seo.robots_indexing,
          seoTitle: article.seo.seo_title,
          seoDescription: article.seo.seo_description,
          seoKeywords: article.seo.keywords.join(", "),
          canonicalUrl: article.seo.canonical_url,
          ogTitle: article.seo.og_title,
          ogDescription: article.seo.og_description,
          googleNewsKeywords: article.seo.google_news_keywords.join(", "),
          autoGenerated: 0,
          isFeatured: 0,
          isTrending: 0,
          isEditorPick: 0,
          isFlash: 0,
        } as any);
        const articleId = insertResult[0].insertId;

        for (const row of categoryRows) await tx.insert(articleCategories).values({ articleId, categoryId: row.id } as any);
        for (const row of topicRows) await tx.insert(articleTopics).values({ articleId, topicId: row.id } as any);
        for (const row of tagRows) await tx.insert(articleTags).values({ articleId, tagId: row.id } as any);
        for (let index = 0; index < companyRows.length; index += 1) {
          const row = companyRows[index];
          await tx.insert(articleCompanies).values({ articleId, companyId: row.id, mentionType: index === 0 ? "primary" : "mentioned", createdById: author.id } as any);
        }
        for (let index = 0; index < personRows.length; index += 1) {
          const row = personRows[index];
          await tx.insert(articlePeople).values({ articleId, personId: row.id, mentionType: index === 0 ? "primary" : "mentioned", createdById: author.id } as any);
        }
        for (const eventName of unique(article.event_names)) {
          const event = eventMap.get(eventName);
          await tx.insert(articleEvents).values({ articleId, eventId: event.id, mentionType: "primary", createdById: author.id } as any);
        }
        for (let index = 0; index < keywordRows.length; index += 1) {
          const row = keywordRows[index];
          await tx.insert(articleKeywords).values({ articleId, keywordId: row.id, keywordType: index === 0 ? "focus" : "additional", sortOrder: index } as any);
        }
        await tx.insert(articleLocations).values({ articleId, country: "SA", region: region?.code || null, city: "Riyadh", createdById: author.id } as any);

        await tx.insert(articleSourceReferences).values({
          articleId,
          sourceType: "primary",
          title: article.sources.primary_title,
          url: article.sources.primary_url,
          publisher: publisherFromUrl(article.sources.primary_url),
          publishedAt: toMysqlDatetime(article.display_datetime_utc),
          sortOrder: 0,
        } as any);
        for (let index = 0; index < article.sources.supporting_urls.length; index += 1) {
          const sourceUrl = article.sources.supporting_urls[index];
          await tx.insert(articleSourceReferences).values({
            articleId,
            sourceType: "supporting",
            url: sourceUrl,
            publisher: publisherFromUrl(sourceUrl),
            sortOrder: index + 1,
          } as any);
        }

        await tx.insert(articleEditorialBatches).values({ batchId, articleId, sequence: article.sequence, sourceCandidateId: article.candidate_id } as any);
        await tx.insert(workflowAuditLog).values({
          entityType: "article",
          entityId: articleId,
          toStatusId: draftStatus.id,
          userId: author.id,
          comment: `Imported as unpublished draft from editorial batch ${manifest.batch.id}`,
          metadata: { batchId, sequence: article.sequence, candidateId: article.candidate_id } as any,
        } as any);
        return articleId;
      });

      report.importedArticles += 1;
      report.articleIds.push(persistedArticleId);
      await db.update(editorialBatches).set({ importedArticleCount: report.importedArticles } as any).where(eq(editorialBatches.id, batchId));
    }

    await db.update(editorialBatches).set({ status: "imported", importedArticleCount: report.importedArticles, importedAt: toDbDate(new Date()) } as any).where(eq(editorialBatches.id, batchId));
    return report;
  } catch (error) {
    await db.update(editorialBatches).set({ status: "failed", metadata: { ...manifest.batch, error: error instanceof Error ? error.message : String(error) } as any } as any).where(eq(editorialBatches.id, batchId));
    throw error;
  }
}
