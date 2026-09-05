/**
 * Search over the archive.
 *
 * The whole searchable corpus is held in memory, per language, and
 * rebuilt on a timer. That is a deliberate choice for an archive this
 * size — a few hundred articles, a couple of megabytes of prose — and it
 * buys three things SQL could not give us without a lot more machinery:
 *
 *   Arabic that works. The Arabic text lives in content_translations,
 *   not in `articles`, so the old `LIKE '%term%'` over the English
 *   columns could not find it at all. And Arabic needs folding — أ and ا
 *   are the same letter to a reader typing quickly — which no LIKE can
 *   do without a normalised column per language.
 *
 *   Ranking. A headline that is the thing you searched for should beat a
 *   passing mention in the last paragraph of something a year old.
 *
 *   Context. A result shows the passage the match is in, cut from the
 *   article's own text, with the reader's words marked in it.
 *
 * The size assumption is enforced rather than assumed: past
 * MAX_INDEXED_ARTICLES the index refuses to build and the caller falls
 * back to the database. If this archive ever gets there, this file is
 * the thing to replace with a real index, and the API above it does not
 * have to change.
 */

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  articles,
  articleCategories,
  articleTags,
  categories,
  contentTranslations,
  media,
  tags as tagsTable,
  users,
} from "../../drizzle/schema";
import { workflowService } from "./workflow.service";
import {
  foldText,
  makeSnippet,
  parseQuery,
  scoreDoc,
  stripHtml,
  type ParsedQuery,
  type ScorableDoc,
  type Snippet,
} from "../../shared/search";

/** Past this, hold nothing and let the caller fall back. */
const MAX_INDEXED_ARTICLES = 5000;

/** How long an index is trusted before it is rebuilt. The publish hooks
 *  drop it immediately, so this is the backstop, not the mechanism. */
const INDEX_TTL_MS = 5 * 60 * 1000;

interface IndexedArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  /** Tags stripped: the searchable, quotable prose of the piece. */
  body: string;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  eventDate: string | null;
  viewCount: number | null;
  /** The folded copies the scorer reads. */
  scorable: ScorableDoc;
}

interface LocaleIndex {
  builtAt: number;
  docs: IndexedArticle[];
}

const indexes = new Map<string, LocaleIndex>();

/** Called by the publish hooks: the next search rebuilds. */
export function invalidateSearchIndex(): void {
  indexes.clear();
}

function fresh(index: LocaleIndex | undefined): index is LocaleIndex {
  return !!index && Date.now() - index.builtAt < INDEX_TTL_MS;
}

/**
 * Build the index for one language.
 *
 * English reads `articles` directly. Any other language reads the same
 * rows and then overlays the published translation of every field that
 * has one — title, excerpt, content — so an Arabic search runs against
 * Arabic prose rather than against English prose with an Arabic headline
 * bolted on. An article with no translation stays in the index in
 * English: a reader searching in Arabic is better served by a result
 * they can still open than by a gap.
 */
async function build(locale: string): Promise<LocaleIndex | null> {
  const db = await getDb();
  if (!db) return null;

  const published = await workflowService.getStatusBySlug("editorial", "published");
  if (!published) return null;

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      primaryCategoryId: articles.primaryCategoryId,
      authorId: articles.authorId,
      featuredImageId: articles.featuredImageId,
      publishedAt: articles.publishedAt,
      eventDate: articles.eventDate,
      viewCount: articles.viewCount,
    })
    .from(articles)
    .where(and(eq(articles.statusId, published.id), isNotNull(articles.publishedAt)));

  if (rows.length > MAX_INDEXED_ARTICLES) {
    console.warn(
      `[Search] ${rows.length} published articles exceeds the in-memory limit ` +
        `(${MAX_INDEXED_ARTICLES}); falling back to database search.`,
    );
    return null;
  }
  if (!rows.length) return { builtAt: Date.now(), docs: [] };

  const ids = rows.map((r) => r.id);

  // Translations for this language, if it is not the source language.
  const overlay = new Map<number, Record<string, string>>();
  if (locale && locale !== "en") {
    const translated = await db
      .select({
        entityId: contentTranslations.entityId,
        field: contentTranslations.field,
        value: contentTranslations.value,
      })
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entityType, "article"),
          eq(contentTranslations.locale, locale),
          eq(contentTranslations.status, "published"),
          inArray(contentTranslations.entityId, ids),
        ),
      );
    for (const t of translated) {
      const bag = overlay.get(t.entityId) ?? {};
      bag[t.field] = t.value;
      overlay.set(t.entityId, bag);
    }
  }

  // The taxonomy a story sits under, so a search for a beat or a topic
  // finds its coverage even where the words are not in the prose.
  const catRows = await db
    .select({
      articleId: articleCategories.articleId,
      name: categories.name,
      slug: categories.slug,
      id: categories.id,
    })
    .from(articleCategories)
    .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
    .where(inArray(articleCategories.articleId, ids));

  const tagRows = await db
    .select({ articleId: articleTags.articleId, name: tagsTable.name, id: tagsTable.id })
    .from(articleTags)
    .innerJoin(tagsTable, eq(articleTags.tagId, tagsTable.id))
    .where(inArray(articleTags.articleId, ids));

  // Category and tag names are themselves translated, and a reader
  // searching "الإنشاءات" should reach the construction beat.
  const taxonomyNames = new Map<string, string>();
  if (locale && locale !== "en") {
    const taxIds = {
      category: [...new Set(catRows.map((c) => c.id))],
      tag: [...new Set(tagRows.map((t) => t.id))],
    };
    for (const [type, list] of Object.entries(taxIds)) {
      if (!list.length) continue;
      const t = await db
        .select({
          entityId: contentTranslations.entityId,
          field: contentTranslations.field,
          value: contentTranslations.value,
        })
        .from(contentTranslations)
        .where(
          and(
            eq(contentTranslations.entityType, type),
            eq(contentTranslations.locale, locale),
            eq(contentTranslations.status, "published"),
            inArray(contentTranslations.entityId, list),
          ),
        );
      for (const row of t) {
        if (row.field === "name") taxonomyNames.set(`${type}:${row.entityId}`, row.value);
      }
    }
  }

  const catsByArticle = new Map<number, { id: number; name: string; slug: string }[]>();
  for (const c of catRows) {
    const list = catsByArticle.get(c.articleId) ?? [];
    list.push({ id: c.id, name: taxonomyNames.get(`category:${c.id}`) ?? c.name, slug: c.slug });
    catsByArticle.set(c.articleId, list);
  }
  const tagsByArticle = new Map<number, string[]>();
  for (const t of tagRows) {
    const list = tagsByArticle.get(t.articleId) ?? [];
    list.push(taxonomyNames.get(`tag:${t.id}`) ?? t.name);
    tagsByArticle.set(t.articleId, list);
  }

  // Authors and images, one query each rather than one per article.
  const authorIds = [...new Set(rows.map((r) => r.authorId).filter(Boolean))] as number[];
  const authors = authorIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds))
    : [];
  const authorById = new Map(authors.map((a) => [a.id, a.name]));

  const imageIds = [...new Set(rows.map((r) => r.featuredImageId).filter(Boolean))] as number[];
  const images = imageIds.length
    ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds))
    : [];
  const imageById = new Map(images.map((m) => [m.id, m.url]));

  const docs: IndexedArticle[] = rows.map((row) => {
    const tr = overlay.get(row.id) ?? {};
    const title = tr.title ?? row.title ?? "";
    const excerpt = tr.excerpt ?? row.excerpt ?? "";
    const body = stripHtml(tr.content ?? row.content ?? "");
    const cats = catsByArticle.get(row.id) ?? [];
    const tagNames = tagsByArticle.get(row.id) ?? [];
    // The beat the canonical URL is built from. Matched by id, not by
    // position: a story sits in several categories and the first one
    // out of the join is whichever the database felt like returning.
    const primary =
      cats.find((c) => c.id === row.primaryCategoryId) ?? cats[0] ?? null;

    return {
      id: row.id,
      slug: row.slug,
      title,
      excerpt,
      body,
      categoryName: primary?.name ?? null,
      categorySlug: primary?.slug ?? null,
      authorName: row.authorId ? authorById.get(row.authorId) ?? null : null,
      featuredImageUrl: row.featuredImageId ? imageById.get(row.featuredImageId) ?? null : null,
      publishedAt: row.publishedAt as unknown as string | null,
      eventDate: row.eventDate as unknown as string | null,
      viewCount: row.viewCount,
      scorable: {
        title: foldText(title),
        excerpt: foldText(excerpt),
        body: foldText(body),
        taxonomy: foldText([...cats.map((c) => c.name), ...tagNames].join(" ")),
        when: whenOf(row.eventDate as unknown as string, row.publishedAt as unknown as string),
      },
    };
  });

  return { builtAt: Date.now(), docs };
}

/** The date a reader would call this story's date — the event where we
 *  know it, otherwise publication. Matches the cards. */
function whenOf(eventDate: string | null, publishedAt: string | null): number | null {
  const raw = eventDate ?? publishedAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

async function indexFor(locale: string): Promise<LocaleIndex | null> {
  const key = locale || "en";
  const existing = indexes.get(key);
  if (fresh(existing)) return existing;
  const built = await build(key);
  if (built) indexes.set(key, built);
  return built;
}

export interface SearchHit {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  categoryName: string | null;
  categorySlug: string | null;
  /** Shaped like every other article payload, so getArticleUrl() builds
   *  /<beat>/<slug> from a search hit the same way it does from a card
   *  — a result that linked to /news/<slug> would cost every click a
   *  redirect, and the canonical URL carries the beat. */
  primaryCategory: { slug: string; name: string } | null;
  authorName: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  eventDate: string | null;
  viewCount: number | null;
  score: number;
  /** The passage the match sits in, with offsets to mark. */
  snippet: Snippet;
  /** Which field carried the strongest signal — shown as a hint in the
   *  result row, and useful when tuning the weights. */
  matchedIn: "title" | "excerpt" | "body" | "topic";
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  page: number;
  totalPages: number;
  /** False when the archive outgrew the in-memory index and the caller
   *  should fall back. Callers must handle it; it is not an error. */
  indexed: boolean;
}

function whereMatched(doc: IndexedArticle, q: ParsedQuery): SearchHit["matchedIn"] {
  const anyIn = (hay: string) => q.terms.some((t) => hay.includes(t));
  if (anyIn(doc.scorable.title)) return "title";
  if (anyIn(doc.scorable.taxonomy)) return "topic";
  if (anyIn(doc.scorable.excerpt)) return "excerpt";
  return "body";
}

/**
 * Search the archive in one language.
 *
 * Returns `indexed: false` — and no items — when the corpus is too large
 * to hold, which is the caller's cue to fall back to the database rather
 * than to show an empty page.
 */
export async function searchArticles(opts: {
  query: string;
  locale?: string;
  page?: number;
  limit?: number;
}): Promise<SearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const q = parseQuery(opts.query ?? "");

  if (!q.terms.length) {
    return { items: [], total: 0, page, totalPages: 0, indexed: true };
  }

  const index = await indexFor(opts.locale || "en");
  if (!index) {
    return { items: [], total: 0, page, totalPages: 0, indexed: false };
  }

  const now = Date.now();
  const scored: { doc: IndexedArticle; score: number }[] = [];
  for (const doc of index.docs) {
    const score = scoreDoc(doc.scorable, q, now);
    if (score > 0) scored.push({ doc, score });
  }

  scored.sort((a, b) => b.score - a.score || (b.doc.scorable.when ?? 0) - (a.doc.scorable.when ?? 0));

  const total = scored.length;
  const slice = scored.slice((page - 1) * limit, (page - 1) * limit + limit);

  const items: SearchHit[] = slice.map(({ doc, score }) => ({
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    categoryName: doc.categoryName,
    categorySlug: doc.categorySlug,
    primaryCategory:
      doc.categorySlug && doc.categoryName
        ? { slug: doc.categorySlug, name: doc.categoryName }
        : null,
    authorName: doc.authorName,
    featuredImageUrl: doc.featuredImageUrl,
    publishedAt: doc.publishedAt,
    eventDate: doc.eventDate,
    viewCount: doc.viewCount,
    score,
    // Prefer a passage from the body; fall back to the standfirst, which
    // is what an article too short to have a distinct body will hit.
    snippet: makeSnippet(doc.body || doc.excerpt || doc.title, q),
    matchedIn: whereMatched(doc, q),
  }));

  return { items, total, page, totalPages: Math.ceil(total / limit), indexed: true };
}

/**
 * What else this reader might mean.
 *
 * Cheap, and drawn from the same index: the beats and topics whose names
 * carry the query. Shown beside the results so a search for "logistics"
 * offers the beat page as well as ten stories.
 */
export async function searchSuggestions(opts: {
  query: string;
  locale?: string;
  limit?: number;
}): Promise<{ label: string; href: string }[]> {
  const q = parseQuery(opts.query ?? "");
  if (!q.terms.length) return [];
  const index = await indexFor(opts.locale || "en");
  if (!index) return [];

  const seen = new Map<string, string>();
  for (const doc of index.docs) {
    if (!doc.categoryName || !doc.categorySlug) continue;
    const folded = foldText(doc.categoryName);
    if (q.terms.some((t) => folded.includes(t))) {
      seen.set(`/${doc.categorySlug}`, doc.categoryName);
    }
    if (seen.size >= (opts.limit ?? 5)) break;
  }
  return [...seen].map(([href, label]) => ({ label, href }));
}

/**
 * The fallback, for an archive too big to hold in memory.
 *
 * Deliberately plain: a LIKE over the source columns, newest first, with
 * a snippet cut from whatever it finds. It is worse than the index at
 * everything — no ranking, no Arabic folding, no translated bodies — and
 * it exists so that outgrowing the index degrades the results rather
 * than emptying the page. If this path ever starts serving real traffic,
 * that is the signal to put a real search engine behind this API.
 */
export async function searchArticlesViaDb(opts: {
  query: string;
  locale?: string;
  page?: number;
  limit?: number;
}): Promise<SearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const q = parseQuery(opts.query ?? "");
  const db = await getDb();
  const published = db ? await workflowService.getStatusBySlug("editorial", "published") : null;
  if (!db || !published) return { items: [], total: 0, page, totalPages: 0, indexed: false };

  const term = `%${opts.query.trim()}%`;
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      publishedAt: articles.publishedAt,
      eventDate: articles.eventDate,
      viewCount: articles.viewCount,
    })
    .from(articles)
    .where(
      and(
        eq(articles.statusId, published.id),
        isNotNull(articles.publishedAt),
        sql`(LOWER(${articles.title}) LIKE LOWER(${term})
          OR LOWER(${articles.excerpt}) LIKE LOWER(${term})
          OR LOWER(${articles.content}) LIKE LOWER(${term}))`,
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const items: SearchHit[] = rows.map((row) => {
    const body = stripHtml(row.content ?? "");
    return {
      id: row.id,
      slug: row.slug,
      title: row.title ?? "",
      excerpt: row.excerpt ?? "",
      categoryName: null,
      categorySlug: null,
      primaryCategory: null,
      authorName: null,
      featuredImageUrl: null,
      publishedAt: row.publishedAt as unknown as string | null,
      eventDate: row.eventDate as unknown as string | null,
      viewCount: row.viewCount,
      score: 0,
      snippet: makeSnippet(body || row.excerpt || row.title || "", q),
      matchedIn: "body",
    };
  });

  return { items, total: items.length, page, totalPages: items.length < limit ? page : page + 1, indexed: false };
}
