/**
 * News/Articles Module Router
 * Full CRUD with workflow integration, taxonomies, and related entities
 */

import { z } from "zod";
import { eq, and, or, desc, asc, like, inArray, isNotNull, sql, gte } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  articles, 
  articleCategories, 
  articleTags,
  articleTopics,
  articleRegions,
  articleSectors,
  articleRelatedEntities,
  articleLocations,
  categories,
  tags,
  topics,
  regions,
  sectors,
  users,
  workflowStatuses,
  workflowAuditLog,
  media,
  countries,
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";
import { editionOrderBias } from "../../services/editionOrder";
import { relatedContentService } from "../../services/relatedContent.service";
import { notifySearchEngines, notifySearchEnginesBatch } from "../../services/indexingNotification.service";
import { resolveArticleInfo, resolveArticleInfos } from "../../services/indexingNotification.helper";
import { 
  generateSeoSuggestions, 
  suggestSeoTitle, 
  suggestMetaDescription, 
  suggestKeywords,
  generateAiSeoSuggestions,
  searchKeywords,
  searchTags,
  getPrimaryKeywords,
  getSecondaryKeywords,
  getAllTags,
  incrementKeywordUsage
} from "../../services/seoAi.service";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createArticleSchema = z.object({
  title: z.string().min(1).max(512),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  featuredImageId: z.number().optional(),
  categoryIds: z.array(z.number()).optional(),
  primaryCategoryId: z.number().optional(),
  tagIds: z.array(z.number()).optional(),
  topicIds: z.array(z.number()).optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
  isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  featuredDurationHours: z.number().min(1).max(720).optional(), // 1 hour to 30 days
  isTrending: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  isEditorPick: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  isFlash: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  flashDurationHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
  publishedAt: z.string().optional(), // ISO date string for backdating or scheduling
  scheduledAt: z.date().optional(),
  // SEO fields
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  canonicalUrl: z.string().optional(),
  focusKeywordId: z.number().optional(),
  // Google News SEO fields
  robotsIndexing: z.enum(["index", "noindex"]).optional(),
  ogImageId: z.number().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  articleType: z.enum(["news", "opinion", "press_release", "report", "interview"]).optional(),
  googleNewsKeywords: z.string().optional(),
  // Coverage country — the single country this article is primarily
  // about. Drives the edition ordering (Saudi visitors see Saudi
  // articles first). Surfaced in the editor sidebar so authors set
  // it deliberately on every article, not as an afterthought in the
  // Location tab.
  coverageCountryId: z.number().nullable().optional(),
});

const updateArticleSchema = createArticleSchema.partial().extend({
  primaryCategoryId: z.number().optional(),
  id: z.number(),
  status: z.enum(["draft", "submitted", "editor_review", "senior_review", "approved", "scheduled", "published", "rejected"]).optional(),
  authorId: z.number().optional(), // Admin can change author
});

const listArticlesSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  status: z.string().optional(),
  categoryId: z.number().optional(),
  tagId: z.number().optional(),
  topicId: z.number().optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  authorId: z.number().optional(),
  search: z.string().optional(),
  isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  isTrending: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  publishedDateFrom: z.string().optional(),
  publishedDateTo: z.string().optional(),
  // Edition bias — surface articles whose coverageCountryId matches
  // this country first, then the rest by the existing sort. Combined
  // with the articleLocations fallback below for older articles that
  // never got coverageCountryId set.
  editionCountryId: z.number().optional(),
  sortBy: z.enum(["createdAt", "publishedAt", "updatedAt", "title", "viewCount", "authorName", "status"]).default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================
// NEWS ROUTER
// ============================================================

export const newsRouter = router({
  // --------------------------------------------------------
  // PUBLIC ENDPOINTS
  // --------------------------------------------------------

  /**
   * List published articles (public)
   */
  list: publicProcedure
    .input(listArticlesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Get published status ID
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      // Build conditions
      const conditions = [eq(articles.statusId, publishedStatus.id)];
      
      if (filters.search) {
        // Search in both title and content for better results
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          sql`(LOWER(${articles.title}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.content}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.excerpt}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (filters.isFeatured !== undefined) {
        conditions.push(eq(articles.isFeatured, filters.isFeatured as any));
      }
      if (filters.isTrending !== undefined) {
        conditions.push(eq(articles.isTrending, filters.isTrending as any));
      }

      // Build query with all conditions
      // Note: authorName and status sorting are handled differently in adminList
      const sortColumn = {
        createdAt: articles.createdAt,
        publishedAt: articles.publishedAt,
        updatedAt: articles.createdAt, // fallback - updatedAt not in schema
        title: articles.title,
        viewCount: articles.viewCount,
        authorName: articles.createdAt, // fallback for public list
        status: articles.statusId,
      }[sortBy] || articles.publishedAt;

      const results = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        primaryCategoryId: articles.primaryCategoryId,
        authorId: articles.authorId,
        isFeatured: articles.isFeatured,
        isTrending: articles.isTrending,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        // Primary coverage country surfaced for the article card flag.
        // Multi-country detail comes from getBySlug.coverageCountries.
        coverageCountryId: (articles as any).coverageCountryId,
        coverageCountryIso2: (countries as any).iso2,
        coverageCountryName: (countries as any).name,
      }).from(articles)
        .leftJoin(countries as any, eq((articles as any).coverageCountryId, (countries as any).id))
        .where(and(...conditions))
        .orderBy(
          ...editionOrderBias((articles as any).coverageCountryId, input.editionCountryId),
          sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn),
        );

      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      // Enrich with author info, categories, primary category, and featured image
      const enrichedResults = await Promise.all(paginatedResults.map(async (article) => {
        const author = await db.select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, article.authorId))
          .limit(1);

        const cats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
          .from(articleCategories)
          .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
          .where(eq(articleCategories.articleId, article.id));

        // Get primary category from the article's primaryCategoryId
        let primaryCategory: { id: number; name: string; slug: string } | null = null;
        if (article.primaryCategoryId) {
          const primaryCatResult = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, article.primaryCategoryId))
            .limit(1);
          primaryCategory = primaryCatResult[0] || null;
        }

        // Get featured image URL
        let featuredImageUrl: string | null = null;
        if (article.featuredImageId) {
          const mediaResult = await db.select({ url: media.url })
            .from(media)
            .where(eq(media.id, article.featuredImageId))
            .limit(1);
          featuredImageUrl = mediaResult[0]?.url || null;
        }

        return {
          ...article,
          author: author[0] || null,
          categories: cats,
          primaryCategory,
          featuredImageUrl,
        };
      }));

      return {
        items: enrichedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single article by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ 
      slug: z.string(),
      categorySlug: z.string().optional() // Category from URL to validate
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get published status ID to filter public access
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      const result = await db.select()
        .from(articles)
        .where(and(
          eq(articles.slug, input.slug),
          eq(articles.statusId, publishedStatus.id)
        ))
        .limit(1);

      if (!result[0]) return null;

      const article = result[0];

      // CRITICAL SEO FIX: Validate category slug matches primary category
      // This prevents duplicate content issues from URLs like /abc/article-slug
      if (input.categorySlug && article.primaryCategoryId) {
        const primaryCat = await db.select({ slug: categories.slug })
          .from(categories)
          .where(eq(categories.id, article.primaryCategoryId))
          .limit(1);
        
        if (primaryCat[0] && primaryCat[0].slug !== input.categorySlug) {
          // Return redirect info instead of article to signal frontend to redirect
          return {
            redirect: true,
            correctCategorySlug: primaryCat[0].slug,
            articleSlug: article.slug
          };
        }
      }

      // Increment view count
      await db.update(articles)
        .set({ viewCount: (article.viewCount || 0) + 1 } as any)
        .where(eq(articles.id, article.id));

      // Get related data - include full author info for author section
      const author = await db.select({ 
        id: users.id, 
        name: users.name, 
        avatar: users.avatar,
        username: users.username,
        bio: users.bio,
        authorBio: users.authorBio,
        jobTitle: users.jobTitle,
        twitterHandle: users.twitterHandle,
        linkedinUrl: users.linkedinUrl,
      })
        .from(users)
        .where(eq(users.id, article.authorId))
        .limit(1);

      const cats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(eq(articleCategories.articleId, article.id));

      const articleTags_ = await db.select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id));

      const articleTopics_ = await db.select({ id: topics.id, name: topics.name, slug: topics.slug })
        .from(articleTopics)
        .innerJoin(topics, eq(articleTopics.topicId, topics.id))
        .where(eq(articleTopics.articleId, article.id));

      const articleRegions_ = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(articleRegions)
        .innerJoin(regions, eq(articleRegions.regionId, regions.id))
        .where(eq(articleRegions.articleId, article.id));

      const articleSectors_ = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(articleSectors)
        .innerJoin(sectors, eq(articleSectors.sectorId, sectors.id))
        .where(eq(articleSectors.articleId, article.id));

      // Get SEO meta
      const seo = await seoService.getSeoMeta("article", article.id, article as Record<string, unknown>);

      // Get featured image URL
      let featuredImageUrl: string | null = null;
      if (article.featuredImageId) {
        const mediaResult = await db.select({ url: media.url })
          .from(media)
          .where(eq(media.id, article.featuredImageId))
          .limit(1);
        featuredImageUrl = mediaResult[0]?.url || null;
      }

      // Get primary category for canonical URL
      let primaryCategory: { id: number; name: string; slug: string } | null = null;
      if (article.primaryCategoryId) {
        const primaryCatResult = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
          .from(categories)
          .where(eq(categories.id, article.primaryCategoryId))
          .limit(1);
        primaryCategory = primaryCatResult[0] || null;
      }

      // Countries this article covers. The single coverageCountryId
      // is the primary (used for edition bias); articleLocations
      // contributes any additional countries the editor tagged via
      // the Location tab. We return a deduped flat list of {id,
      // name, iso2, flagEmoji} for the UI to render as flag badges.
      const coverageCountries: Array<{ id: number; name: string; iso2: string; flagEmoji: string }> = [];
      const seenCountryIds = new Set<number>();
      const flagFromIso2 = (iso2: string) => {
        if (!iso2 || iso2.length !== 2) return "";
        return String.fromCodePoint(
          ...iso2.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
        );
      };
      if ((article as any).coverageCountryId) {
        const [primary] = await db.select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
          .from(countries)
          .where(eq(countries.id, (article as any).coverageCountryId))
          .limit(1);
        if (primary?.iso2) {
          coverageCountries.push({ ...primary, flagEmoji: flagFromIso2(primary.iso2) });
          seenCountryIds.add(primary.id);
        }
      }
      // Pull any additional locations the editor tagged. The country
      // column holds the iso2 code (varchar(2)) — resolve to full
      // record via the countries table so the UI gets a uniform shape.
      const locationRows = await db.select({ iso2: articleLocations.country })
        .from(articleLocations)
        .where(eq(articleLocations.articleId, article.id));
      if (locationRows.length > 0) {
        const iso2List = Array.from(new Set(locationRows.map((r: any) => r.iso2).filter(Boolean)));
        if (iso2List.length > 0) {
          const extras = await db.select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
            .from(countries)
            .where(inArray(countries.iso2, iso2List));
          for (const c of extras) {
            if (seenCountryIds.has(c.id)) continue;
            coverageCountries.push({ ...c, flagEmoji: flagFromIso2(c.iso2) });
            seenCountryIds.add(c.id);
          }
        }
      }

      return {
        ...article,
        author: author[0] || null,
        categories: cats,
        primaryCategory,
        // coverageCountries: ordered list with primary first.
        // UI renders these as flag badges next to the article title.
        coverageCountries,
        tags: articleTags_,
        topics: articleTopics_,
        regions: articleRegions_,
        sectors: articleSectors_,
        seo,
        featuredImageUrl,
      };
    }),

  // --------------------------------------------------------
  // ADMIN ENDPOINTS
  // --------------------------------------------------------

  /**
   * Get article counts by status (for tabs)
   */
  getStatusCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all status counts
      const statusCountsResult = await db
        .select({
          statusSlug: workflowStatuses.slug,
          count: sql<number>`COUNT(${articles.id})`,
        })
        .from(articles)
        .leftJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .groupBy(workflowStatuses.slug);

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(articles);

      // Convert to object
      const counts: Record<string, number> = {
        total: totalResult[0]?.count || 0,
      };

      for (const row of statusCountsResult) {
        if (row.statusSlug) {
          counts[row.statusSlug] = row.count;
        }
      }

      return counts;
    }),

  /**
   * List all articles (admin)
   */
  adminList: protectedProcedure
    .input(listArticlesSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin/editor role
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];

      // Authors can only see their own articles
      if (ctx.user.role === "author") {
        conditions.push(eq(articles.authorId, ctx.user.id));
      }

      // Apply filters - search across title, excerpt, and content
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          sql`(LOWER(${articles.title}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.excerpt}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.content}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (filters.authorId) {
        conditions.push(eq(articles.authorId, filters.authorId));
      }
      // Filter by status slug
      if (filters.status) {
        conditions.push(eq(workflowStatuses.slug, filters.status));
      }
      // Filter by category
      if (filters.categoryId) {
        // Get article IDs that have this category
        const articleIdsWithCategory = await db
          .select({ articleId: articleCategories.articleId })
          .from(articleCategories)
          .where(eq(articleCategories.categoryId, filters.categoryId));
        const categoryArticleIds = articleIdsWithCategory.map(a => a.articleId);
        if (categoryArticleIds.length > 0) {
          conditions.push(inArray(articles.id, categoryArticleIds));
        } else {
          // No articles with this category, return empty
          conditions.push(sql`1 = 0`);
        }
      }
      // Filter by published date range
      if (filters.publishedDateFrom) {
        conditions.push(sql`${articles.publishedAt} >= ${new Date(filters.publishedDateFrom)}`);
      }
      if (filters.publishedDateTo) {
        conditions.push(sql`${articles.publishedAt} <= ${new Date(filters.publishedDateTo)}`);
      }

      // Get total count first (more efficient than fetching all)
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(articles)
        .leftJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      // Build dynamic sort order
      const sortFn = sortOrder === "asc" ? asc : desc;
      let orderByClause;
      switch (sortBy) {
        case "publishedAt":
          orderByClause = sortFn(articles.publishedAt);
          break;
        case "updatedAt":
          orderByClause = sortFn(articles.updatedAt);
          break;
        case "title":
          orderByClause = sortFn(articles.title);
          break;
        case "viewCount":
          orderByClause = sortFn(articles.viewCount);
          break;
        case "authorName":
          orderByClause = sortFn(users.name);
          break;
        case "status":
          orderByClause = sortFn(workflowStatuses.name);
          break;
        case "createdAt":
        default:
          orderByClause = sortFn(articles.createdAt);
          break;
      }

      // Get paginated articles with status info and author name
      const paginatedResults = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          featuredImageId: articles.featuredImageId,
          authorId: articles.authorId,
          authorName: users.name,
          statusId: articles.statusId,
          statusSlug: workflowStatuses.slug,
          statusName: workflowStatuses.name,
          isFeatured: articles.isFeatured,
          isTrending: articles.isTrending,
          isFlash: articles.isFlash,
          viewCount: articles.viewCount,
          publishedAt: articles.publishedAt,
          primaryCategoryId: articles.primaryCategoryId,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
        })
        .from(articles)
        .leftJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get categories for each article
      const articleIds = paginatedResults.map(a => a.id);
      let articleCategoriesMap: Record<number, { id: number; name: string; slug: string }[]> = {};
      
      if (articleIds.length > 0) {
        const categoriesData = await db
          .selectDistinct({
            articleId: articleCategories.articleId,
            categoryId: categories.id,
            categoryName: categories.name,
            categorySlug: categories.slug,
          })
          .from(articleCategories)
          .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
          .where(inArray(articleCategories.articleId, articleIds));
        
        for (const cat of categoriesData) {
          if (!articleCategoriesMap[cat.articleId]) {
            articleCategoriesMap[cat.articleId] = [];
          }
          // Avoid adding duplicate categories
          const exists = articleCategoriesMap[cat.articleId].some(c => c.id === cat.categoryId);
          if (exists) continue;
          
          articleCategoriesMap[cat.articleId].push({
            id: cat.categoryId,
            name: cat.categoryName,
            slug: cat.categorySlug,
          });
        }
      }

      return {
        items: paginatedResults.map(item => ({
          ...item,
          status: item.statusSlug || 'draft',
          categories: articleCategoriesMap[item.id] || [],
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Preview article by ID (admin) - works for any status
   */
  preview: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin/editor role
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const result = await db.select()
        .from(articles)
        .where(eq(articles.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const article = result[0];

      // Authors can only preview their own articles
      if (ctx.user.role === "author" && article.authorId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // Get related data - include full author info for author section
      const author = await db.select({ 
        id: users.id, 
        name: users.name, 
        avatar: users.avatar,
        username: users.username,
        bio: users.bio,
        authorBio: users.authorBio,
        jobTitle: users.jobTitle,
        twitterHandle: users.twitterHandle,
        linkedinUrl: users.linkedinUrl,
      })
        .from(users)
        .where(eq(users.id, article.authorId))
        .limit(1);

      const cats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(eq(articleCategories.articleId, article.id));

      const articleTags_ = await db.select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id));

      const articleTopics_ = await db.select({ id: topics.id, name: topics.name, slug: topics.slug })
        .from(articleTopics)
        .innerJoin(topics, eq(articleTopics.topicId, topics.id))
        .where(eq(articleTopics.articleId, article.id));

      const articleRegions_ = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(articleRegions)
        .innerJoin(regions, eq(articleRegions.regionId, regions.id))
        .where(eq(articleRegions.articleId, article.id));

      const articleSectors_ = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(articleSectors)
        .innerJoin(sectors, eq(articleSectors.sectorId, sectors.id))
        .where(eq(articleSectors.articleId, article.id));

      // Get workflow status
      const status = await db.select({ name: workflowStatuses.name, slug: workflowStatuses.slug })
        .from(workflowStatuses)
        .where(eq(workflowStatuses.id, article.statusId))
        .limit(1);

      // Get SEO meta
      const seo = await seoService.getSeoMeta("article", article.id, article as Record<string, unknown>);

      // Get featured image URL
      let featuredImageUrl: string | null = null;
      if (article.featuredImageId) {
        const mediaResult = await db.select({ url: media.url })
          .from(media)
          .where(eq(media.id, article.featuredImageId))
          .limit(1);
        featuredImageUrl = mediaResult[0]?.url || null;
      }

      return {
        ...article,
        featuredImageUrl,
        author: author[0] || null,
        categories: cats,
        tags: articleTags_,
        topics: articleTopics_,
        regions: articleRegions_,
        sectors: articleSectors_,
        status: status[0] || null,
        seo,
        isPreview: true,
      };
    }),

  /**
   * Get single article by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(articles)
        .where(eq(articles.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const article = result[0];

      // Authors can only see their own articles
      if (ctx.user.role === "author" && article.authorId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // Get all related data
      const catIds = await db.select({ categoryId: articleCategories.categoryId })
        .from(articleCategories)
        .where(eq(articleCategories.articleId, article.id));

      const tagIdsResult = await db.select({ tagId: articleTags.tagId })
        .from(articleTags)
        .where(eq(articleTags.articleId, article.id));

      // Get tag names for display
      const tagNamesResult = await db.select({ id: tags.id, name: tags.name })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id));

      const topicIds = await db.select({ topicId: articleTopics.topicId })
        .from(articleTopics)
        .where(eq(articleTopics.articleId, article.id));

      const regionIds = await db.select({ regionId: articleRegions.regionId })
        .from(articleRegions)
        .where(eq(articleRegions.articleId, article.id));

      const sectorIds = await db.select({ sectorId: articleSectors.sectorId })
        .from(articleSectors)
        .where(eq(articleSectors.articleId, article.id));

      // Get featured image URL
      let featuredImageUrl: string | null = null;
      if (article.featuredImageId) {
        const mediaResult = await db.select({ url: media.url })
          .from(media)
          .where(eq(media.id, article.featuredImageId))
          .limit(1);
        featuredImageUrl = mediaResult[0]?.url || null;
      }

      // Get author info
      let authorInfo = null;
      if (article.authorId) {
        const authorResult = await db.select({
          id: users.id,
          name: users.name,
          publicName: users.publicName,
          username: users.username,
          avatar: users.avatar,
        })
          .from(users)
          .where(eq(users.id, article.authorId))
          .limit(1);
        authorInfo = authorResult[0] || null;
      }

      // Get workflow info
      const availableTransitions = await workflowService.getAvailableTransitions(
        article.statusId,
        ctx.user.role
      );

      const auditHistory = await workflowService.getAuditHistory("article", article.id);

      return {
        ...article,
        featuredImageUrl,
        author: authorInfo,
        categoryIds: catIds.map(c => c.categoryId),
        tagIds: tagIdsResult.map(t => t.tagId),
        tagNames: tagNamesResult.map(t => t.name),
        topicIds: topicIds.map(t => t.topicId),
        regionIds: regionIds.map(r => r.regionId),
        sectorIds: sectorIds.map(s => s.sectorId),
        availableTransitions,
        auditHistory,
      };
    }),

  /**
   * Create article (admin)
   */
  create: protectedProcedure
    .input(createArticleSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check role
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Generate unique slug for article (no category prefix - category is handled by URL routing)
      const articleSlug = input.slug || slugService.generateSlug(input.title);
      const slug = await slugService.generateUniqueSlug("article", articleSlug);
      
      // Get primary category ID
      const primaryCatId = input.primaryCategoryId || (input.categoryIds?.length ? input.categoryIds[0] : undefined);

      // Get initial status
      const initialStatus = await workflowService.getInitialStatus("editorial");
      if (!initialStatus) throw new Error("Workflow not initialized");

      // Calculate flash expiration if flash is enabled
      let flashExpiresAt: Date | undefined;
      if (input.isFlash && input.flashDurationHours) {
        flashExpiresAt = new Date();
        flashExpiresAt.setHours(flashExpiresAt.getHours() + input.flashDurationHours);
      }

      // Calculate featured expiration if featured is enabled
      let featuredExpiresAt: Date | undefined;
      if (input.isFeatured && input.featuredDurationHours) {
        featuredExpiresAt = new Date();
        featuredExpiresAt.setHours(featuredExpiresAt.getHours() + input.featuredDurationHours);
      }

      // Create article
      await db.insert(articles).values({
        title: input.title,
        slug,
        excerpt: input.excerpt,
        content: input.content,
        featuredImageId: input.featuredImageId,
        authorId: ctx.user.id,
        statusId: initialStatus.id,
        primaryCategoryId: primaryCatId,
        isFeatured: (input.isFeatured ? 1 : 0) || false,
        featuredDurationHours: input.featuredDurationHours,
        featuredExpiresAt,
        isTrending: input.isTrending || false,
        isEditorPick: input.isEditorPick || false,
        isFlash: input.isFlash || false,
        flashDurationHours: input.flashDurationHours,
        flashExpiresAt,
        scheduledAt: input.scheduledAt,
        // SEO fields
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        seoKeywords: input.seoKeywords,
        canonicalUrl: input.canonicalUrl,
        focusKeywordId: input.focusKeywordId,
        // Google News SEO fields
        robotsIndexing: input.robotsIndexing || "index",
        ogImageId: input.ogImageId || input.featuredImageId, // Default to featured image
        ogTitle: input.ogTitle,
        ogDescription: input.ogDescription,
        articleType: input.articleType || "news",
        googleNewsKeywords: input.googleNewsKeywords,
        coverageCountryId: input.coverageCountryId ?? null,
      } as any);

      // Get inserted article
      const inserted = await db.select()
        .from(articles)
        .where(eq(articles.slug, slug))
        .limit(1);

      const articleId = inserted[0].id;

      // Add taxonomies
      if (input.categoryIds?.length) {
        for (const categoryId of input.categoryIds) {
          await db.insert(articleCategories).values({ articleId, categoryId } as any);
        }
      }
      if (input.tagIds?.length) {
        for (const tagId of input.tagIds) {
          await db.insert(articleTags).values({ articleId, tagId } as any);
        }
      }
      if (input.topicIds?.length) {
        for (const topicId of input.topicIds) {
          await db.insert(articleTopics).values({ articleId, topicId } as any);
        }
      }
      if (input.regionIds?.length) {
        for (const regionId of input.regionIds) {
          await db.insert(articleRegions).values({ articleId, regionId } as any);
        }
      }
      if (input.sectorIds?.length) {
        for (const sectorId of input.sectorIds) {
          await db.insert(articleSectors).values({ articleId, sectorId } as any);
        }
      }

      // SEO meta is now saved directly in the articles table

      // Create initial audit log
      await db.insert(require("../../../drizzle/schema").workflowAuditLog).values({
        entityType: "article",
        entityId: articleId,
        toStatusId: initialStatus.id,
        userId: ctx.user.id,
        comment: "Article created",
      } as any);

      // Schedule debounced static-sitemap regeneration (fire-and-forget)
      try {
        const { scheduleSitemapRegenFor } = await import("../../services/publishHooks.service");
        scheduleSitemapRegenFor("article");
      } catch (err) {
        console.error("[News] Failed to schedule sitemap regen:", err);
      }

      return { id: articleId, slug };
    }),

  /**
   * Update article (admin)
   */
  update: protectedProcedure
    .input(updateArticleSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, categoryIds, tagIds, topicIds, regionIds, sectorIds, status, ...updateData } = input;

      // Handle publishedAt date - check if it's a future date for scheduling
      let isFutureDate = false;
      if ((updateData as any).publishedAt) {
        const publishedAtDate = new Date((updateData as any).publishedAt);
        const now = new Date();
        isFutureDate = publishedAtDate > now;
        // Convert string to Date object for database
        (updateData as Record<string, unknown>).publishedAt = publishedAtDate;
      }

      // Handle status change if provided
      let newStatusId: number | undefined;
      let effectiveStatus = status;
      
      // If publishing with a future date, set to scheduled instead
      if (status === "published" && isFutureDate) {
        effectiveStatus = "scheduled";
      }
      
      if (effectiveStatus) {
        const statusRecord = await workflowService.getStatusBySlug("editorial", effectiveStatus);
        if (statusRecord) {
          newStatusId = statusRecord.id;
          (updateData as Record<string, unknown>).statusId = statusRecord.id;
          // If transitioning to published (not scheduled), set publishedAt to now if not already set
          if (effectiveStatus === "published" && !(updateData as any).publishedAt) {
            (updateData as Record<string, unknown>).publishedAt = new Date();
          }
          // If scheduling, also set scheduledAt
          if (effectiveStatus === "scheduled" && (updateData as any).publishedAt) {
            (updateData as Record<string, unknown>).scheduledAt = (updateData as any).publishedAt;
          }
        }
      }

      // Get existing article
      const existing = await db.select()
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);

      if (!existing[0]) throw new Error("Article not found");

      // Check permissions
      if (ctx.user.role === "author" && existing[0].authorId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // Only admins can change author
      if ((updateData as any).authorId && ctx.user.role !== "admin") {
        delete (updateData as any).authorId;
      }

      // Update slug if title changed
      if (updateData.title && !updateData.slug) {
        const baseSlug = slugService.generateSlug(updateData.title);
        updateData.slug = await slugService.generateUniqueSlug("article", baseSlug);
      }

      // Calculate flash expiration if flash is being enabled
      if (updateData.isFlash && updateData.flashDurationHours) {
        (updateData as Record<string, unknown>).flashExpiresAt = new Date();
        ((updateData as Record<string, unknown>).flashExpiresAt as Date).setHours(
          ((updateData as Record<string, unknown>).flashExpiresAt as Date).getHours() + updateData.flashDurationHours
        );
      } else if (updateData.isFlash === false) {
        (updateData as Record<string, unknown>).flashExpiresAt = null;
        (updateData as Record<string, unknown>).flashDurationHours = null;
      }

      // Calculate featured expiration if featured is being enabled
      if (updateData.isFeatured && updateData.featuredDurationHours) {
        (updateData as Record<string, unknown>).featuredExpiresAt = new Date();
        ((updateData as Record<string, unknown>).featuredExpiresAt as Date).setHours(
          ((updateData as Record<string, unknown>).featuredExpiresAt as Date).getHours() + updateData.featuredDurationHours
        );
      } else if (updateData.isFeatured === false) {
        (updateData as Record<string, unknown>).featuredExpiresAt = null;
        (updateData as Record<string, unknown>).featuredDurationHours = null;
      }

      // Update article - cast to any to handle dynamic fields
      await db.update(articles)
        .set(updateData as any)
        .where(eq(articles.id, id));

      // Update taxonomies
      if (categoryIds !== undefined) {
        await db.delete(articleCategories).where(eq(articleCategories.articleId, id));
        for (const categoryId of categoryIds) {
          await db.insert(articleCategories).values({ articleId: id, categoryId } as any);
        }
      }
      if (tagIds !== undefined) {
        await db.delete(articleTags).where(eq(articleTags.articleId, id));
        for (const tagId of tagIds) {
          await db.insert(articleTags).values({ articleId: id, tagId } as any);
        }
      }
      if (topicIds !== undefined) {
        await db.delete(articleTopics).where(eq(articleTopics.articleId, id));
        for (const topicId of topicIds) {
          await db.insert(articleTopics).values({ articleId: id, topicId } as any);
        }
      }
      if (regionIds !== undefined) {
        await db.delete(articleRegions).where(eq(articleRegions.articleId, id));
        for (const regionId of regionIds) {
          await db.insert(articleRegions).values({ articleId: id, regionId } as any);
        }
      }
      if (sectorIds !== undefined) {
        await db.delete(articleSectors).where(eq(articleSectors.articleId, id));
        for (const sectorId of sectorIds) {
          await db.insert(articleSectors).values({ articleId: id, sectorId } as any);
        }
      }

      // SEO fields are now updated directly in the articles table via updateData

      // Log status change to audit log if status was changed
      if (newStatusId && newStatusId !== existing[0].statusId) {
        await db.insert(workflowAuditLog).values({
          entityType: "article",
          entityId: id,
          fromStatusId: existing[0].statusId,
          toStatusId: newStatusId,
          userId: ctx.user.id,
          comment: `Status changed to ${status}`,
        } as any);
      }

      // Notify search engines when article is published (fire-and-forget)
      if (effectiveStatus === "published") {
        resolveArticleInfo(id).then(info => {
          if (info) notifySearchEngines({
            url: info.url,
            type: "URL_UPDATED",
            articleId: info.articleId,
            articleTitle: info.articleTitle,
            articleSlug: info.articleSlug,
            trigger: "publish",
            triggeredBy: ctx.user.id,
          });
        }).catch(err => console.error("[IndexingNotification] Failed to resolve article URL:", err));
      }

      // Schedule debounced static-sitemap regeneration (fire-and-forget)
      try {
        const { scheduleSitemapRegenFor } = await import("../../services/publishHooks.service");
        scheduleSitemapRegenFor("article");
      } catch (err) {
        console.error("[News] Failed to schedule sitemap regen:", err);
      }

      return { success: true };
    }),

  /**
   * Transition article status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await workflowService.executeTransition(
        "article",
        input.articleId,
        input.transitionId,
        ctx.user.id,
        ctx.user.role,
        input.comment
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update article status
      await db.update(articles)
        .set({ statusId: result.newStatusId } as any)
        .where(eq(articles.id, input.articleId));

      // If transitioning to published, set publishedAt only if not already set
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (result.newStatusId === publishedStatus?.id) {
        // Check if article already has a publishedAt date (e.g., backdated or scheduled)
        const existingArticle = await db.select({ publishedAt: articles.publishedAt })
          .from(articles)
          .where(eq(articles.id, input.articleId))
          .limit(1);
        
        // Only set publishedAt if it's not already set
        if (!existingArticle[0]?.publishedAt) {
          await db.update(articles)
            .set({ publishedAt: new Date().toISOString() } as any)
            .where(eq(articles.id, input.articleId));
        }
      }

      // Notify search engines when article transitions to published (fire-and-forget)
      if (result.newStatusId === publishedStatus?.id) {
        resolveArticleInfo(input.articleId).then(info => {
          if (info) notifySearchEngines({
            url: info.url,
            type: "URL_UPDATED",
            articleId: info.articleId,
            articleTitle: info.articleTitle,
            articleSlug: info.articleSlug,
            trigger: "transition",
            triggeredBy: ctx.user.id,
          });
        }).catch(err => console.error("[IndexingNotification] Failed to resolve article URL:", err));
      }

      return { success: true, newStatusId: result.newStatusId };
    }),

  /**
   * Delete article (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin role
      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Delete related data
      await db.delete(articleCategories).where(eq(articleCategories.articleId, input.id));
      await db.delete(articleTags).where(eq(articleTags.articleId, input.id));
      await db.delete(articleTopics).where(eq(articleTopics.articleId, input.id));
      await db.delete(articleRegions).where(eq(articleRegions.articleId, input.id));
      await db.delete(articleSectors).where(eq(articleSectors.articleId, input.id));
      await db.delete(articleRelatedEntities).where(eq(articleRelatedEntities.articleId, input.id));

      // Delete article
      await db.delete(articles).where(eq(articles.id, input.id));

      return { success: true };
    }),

  /**
   * Permanently delete an article (only from trash)
   */
  permanentDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin role
      if (!ctx.user.role || !['admin', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Verify article is in trash
      const trashStatus = await workflowService.getStatusBySlug("editorial", "trash");
      if (!trashStatus) throw new Error("Trash status not found");

      const article = await db.select().from(articles).where(eq(articles.id, input.id)).limit(1);
      if (!article[0]) throw new Error("Article not found");
      if (article[0].statusId !== trashStatus.id) {
        throw new Error("Only articles in trash can be permanently deleted");
      }

      // Delete related data
      await db.delete(articleCategories).where(eq(articleCategories.articleId, input.id));
      await db.delete(articleTags).where(eq(articleTags.articleId, input.id));
      await db.delete(articleTopics).where(eq(articleTopics.articleId, input.id));
      await db.delete(articleRegions).where(eq(articleRegions.articleId, input.id));
      await db.delete(articleSectors).where(eq(articleSectors.articleId, input.id));
      await db.delete(articleRelatedEntities).where(eq(articleRelatedEntities.articleId, input.id));

      // Delete article
      await db.delete(articles).where(eq(articles.id, input.id));

      return { success: true };
    }),

  /**
   * Bulk permanently delete articles (only from trash)
   */
  bulkPermanentDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin role
      if (!ctx.user.role || !['admin', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Verify all articles are in trash
      const trashStatus = await workflowService.getStatusBySlug("editorial", "trash");
      if (!trashStatus) throw new Error("Trash status not found");

      const articlesToDelete = await db.select()
        .from(articles)
        .where(and(
          inArray(articles.id, input.ids),
          eq(articles.statusId, trashStatus.id)
        ));

      if (articlesToDelete.length !== input.ids.length) {
        throw new Error("Some articles are not in trash and cannot be permanently deleted");
      }

      // Delete related data for all articles
      await db.delete(articleCategories).where(inArray(articleCategories.articleId, input.ids));
      await db.delete(articleTags).where(inArray(articleTags.articleId, input.ids));
      await db.delete(articleTopics).where(inArray(articleTopics.articleId, input.ids));
      await db.delete(articleRegions).where(inArray(articleRegions.articleId, input.ids));
      await db.delete(articleSectors).where(inArray(articleSectors.articleId, input.ids));
      await db.delete(articleRelatedEntities).where(inArray(articleRelatedEntities.articleId, input.ids));

      // Delete articles
      await db.delete(articles).where(inArray(articles.id, input.ids));

      return { count: input.ids.length };
    }),

  /**
   * Bulk delete articles (move to trash)
   */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin role
      if (!ctx.user.role || !['admin', 'senior_editor', 'editor'].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get trash status
      const trashStatus = await workflowService.getStatusBySlug("editorial", "trash");
      if (!trashStatus) throw new Error("Trash status not found");

      // Move articles to trash
      await db.update(articles)
        .set({ statusId: trashStatus.id, updatedAt: new Date().toISOString() } as any)
        .where(inArray(articles.id, input.ids));

      return { count: input.ids.length };
    }),

  /**
   * Get featured articles
   */
  getFeatured: publicProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      return db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        publishedAt: articles.publishedAt,
      })
        .from(articles)
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          eq(articles.isFeatured, 1)
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit);
    }),

  /**
   * Get trending articles
   */
  getTrending: publicProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      return db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
      })
        .from(articles)
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          eq(articles.isTrending, 1)
        ))
        .orderBy(desc(articles.viewCount))
        .limit(input.limit);
    }),

  /**
   * Get most-read articles (sorted by viewCount desc)
   */
  getMostRead: publicProcedure
    .input(z.object({ limit: z.number().default(5), days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      // Only consider articles published within the last N days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.days);

      const results = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        primaryCategoryId: articles.primaryCategoryId,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
      })
        .from(articles)
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          gte(articles.publishedAt, cutoff as any)
        ))
        .orderBy(desc(articles.viewCount))
        .limit(input.limit);

      // Enrich with category slug and featured image URL
      return Promise.all(results.map(async (article) => {
        let categorySlug: string | null = null;
        if (article.primaryCategoryId) {
          const cat = await db.select({ slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, article.primaryCategoryId))
            .limit(1);
          categorySlug = cat[0]?.slug || null;
        }
        let featuredImageUrl: string | null = null;
        if (article.featuredImageId) {
          const m = await db.select({ url: media.url })
            .from(media)
            .where(eq(media.id, article.featuredImageId))
            .limit(1);
          featuredImageUrl = m[0]?.url || null;
        }
        return { ...article, categorySlug, featuredImageUrl };
      }));
    }),

  /**
   * Get editor's picks (manually marked first, then featured as fallback)
   */
  getEditorPicks: publicProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      // First try manually marked editor's picks
      let results = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        primaryCategoryId: articles.primaryCategoryId,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
      })
        .from(articles)
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          eq(articles.isEditorPick, 1)
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit);

      // If not enough manual picks, fill with featured articles
      if (results.length < input.limit) {
        const manualIds = results.map(r => r.id);
        const fallback = await db.select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          featuredImageId: articles.featuredImageId,
          primaryCategoryId: articles.primaryCategoryId,
          viewCount: articles.viewCount,
          publishedAt: articles.publishedAt,
        })
          .from(articles)
          .where(and(
            eq(articles.statusId, publishedStatus.id),
            eq(articles.isFeatured, 1),
            manualIds.length > 0 ? sql`${articles.id} NOT IN (${sql.join(manualIds.map(id => sql`${id}`), sql`, `)})` : sql`1=1`
          ))
          .orderBy(desc(articles.publishedAt))
          .limit(input.limit - results.length);
        results = [...results, ...fallback];
      }

      // Enrich with category slug and featured image URL
      return Promise.all(results.map(async (article) => {
        let categorySlug: string | null = null;
        if (article.primaryCategoryId) {
          const cat = await db.select({ slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, article.primaryCategoryId))
            .limit(1);
          categorySlug = cat[0]?.slug || null;
        }
        let featuredImageUrl: string | null = null;
        if (article.featuredImageId) {
          const m = await db.select({ url: media.url })
            .from(media)
            .where(eq(media.id, article.featuredImageId))
            .limit(1);
          featuredImageUrl = m[0]?.url || null;
        }
        return { ...article, categorySlug, featuredImageUrl };
      }));
    }),

  /**
   * Bulk update status (admin)
   */
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      statusSlug: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin role
      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const status = await workflowService.getStatusBySlug("editorial", input.statusSlug);
      if (!status) throw new Error("Status not found");

      // Update all articles - for published status, only set publishedAt if not already set
      if (input.statusSlug === "published") {
        // Get articles that don't have publishedAt set
        const articlesWithoutPublishedAt = await db.select({ id: articles.id })
          .from(articles)
          .where(and(
            inArray(articles.id, input.ids),
            sql`${articles.publishedAt} IS NULL`
          ));
        const idsWithoutPublishedAt = articlesWithoutPublishedAt.map(a => a.id);
        
        // Update status for all articles
        await db.update(articles)
          .set({ statusId: status.id } as any)
          .where(inArray(articles.id, input.ids));
        
        // Set publishedAt only for articles that don't have it
        if (idsWithoutPublishedAt.length > 0) {
          await db.update(articles)
            .set({ publishedAt: new Date().toISOString() } as any)
            .where(inArray(articles.id, idsWithoutPublishedAt));
        }
      } else {
        await db.update(articles)
          .set({ statusId: status.id } as any)
          .where(inArray(articles.id, input.ids));
      }

      // Notify search engines when articles are bulk-published (fire-and-forget)
      if (input.statusSlug === "published" && input.ids.length > 0) {
        resolveArticleInfos(input.ids).then(infos => {
          if (infos.length > 0) {
            const urls = infos.map(i => i.url);
            notifySearchEnginesBatch(urls, {
              trigger: "bulk_publish",
              triggeredBy: ctx.user.id,
            });
          }
        }).catch(err => console.error("[IndexingNotification] Batch notification failed:", err));
      }

      return { success: true, count: input.ids.length };
    }),

  /**
   * Get active flash news (public)
   */
  getFlashNews: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get published status ID
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      const now = new Date();

      // Get flash articles that are published and not expired
      const flashArticles = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        flashExpiresAt: articles.flashExpiresAt,
        publishedAt: articles.publishedAt,
      })
        .from(articles)
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          eq(articles.isFlash, 1),
          sql`${articles.flashExpiresAt} > ${now}`
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(10);

      return flashArticles;
    }),

  /**
   * Generate AI SEO suggestions for an article
   */
  generateSeoSuggestions: protectedProcedure
    .input(z.object({
      articleId: z.number().optional(),
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const suggestions = await generateSeoSuggestions(
        input.title,
        input.content,
        input.excerpt
      );
      return suggestions;
    }),

  /**
   * Suggest SEO title only
   */
  suggestSeoTitle: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const seoTitle = await suggestSeoTitle(input.title, input.content);
      return { seoTitle };
    }),

  /**
   * Suggest meta description only
   */
  suggestMetaDescription: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const metaDescription = await suggestMetaDescription(
        input.title,
        input.content,
        input.excerpt
      );
      return { metaDescription };
    }),

  /**
   * Suggest keywords only
   */
  suggestKeywords: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const keywords = await suggestKeywords(input.title, input.content);
      return keywords;
    }),

  // ============================================================
  // SEO TAXONOMY ENDPOINTS
  // ============================================================

  /**
   * Get primary keywords for dropdown
   */
  getPrimaryKeywords: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      return getPrimaryKeywords(input.limit);
    }),

  /**
   * Get secondary keywords for dropdown
   */
  getSecondaryKeywords: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(200),
    }))
    .query(async ({ input }) => {
      return getSecondaryKeywords(input.limit);
    }),

  /**
   * Search keywords by term
   */
  searchKeywords: protectedProcedure
    .input(z.object({
      term: z.string(),
      type: z.enum(["primary", "secondary"]).optional(),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      return searchKeywords(input.term, input.type, input.limit);
    }),

  /**
   * Get all tags grouped by type
   */
  getAllTags: protectedProcedure
    .query(async () => {
      return getAllTags();
    }),

  /**
   * Search tags by term
   */
  searchTags: protectedProcedure
    .input(z.object({
      term: z.string(),
      tagType: z.string().optional(),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      return searchTags(input.term, input.tagType, input.limit);
    }),

  /**
   * AI-powered SEO suggestions with database matching
   */
  generateAiSeo: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
      categoryName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateAiSeoSuggestions(
        input.title,
        input.content,
        input.excerpt,
        input.categoryName
      );
    }),

  /**
   * Increment keyword usage count
   */
  incrementKeywordUsage: protectedProcedure
    .input(z.object({
      keywordId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await incrementKeywordUsage(input.keywordId);
      return { success: true };
    }),

  /**
   * Export articles for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(listArticlesSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check admin/editor role
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { sortBy, sortOrder, ...filters } = input;

      // Build conditions
      const conditions = [];

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          sql`(LOWER(${articles.title}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.excerpt}) LIKE LOWER(${searchTerm}) OR LOWER(${articles.content}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (filters.authorId) {
        conditions.push(eq(articles.authorId, filters.authorId));
      }
      if (filters.status) {
        conditions.push(eq(workflowStatuses.slug, filters.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get all matching articles for export
      const results = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          authorId: articles.authorId,
          authorName: users.name,
          statusName: workflowStatuses.name,
          isFeatured: articles.isFeatured,
          isTrending: articles.isTrending,
          isFlash: articles.isFlash,
          viewCount: articles.viewCount,
          publishedAt: articles.publishedAt,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
        })
        .from(articles)
        .leftJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(whereClause)
        .orderBy(desc(articles.createdAt))
        .limit(10000);

      // Get categories for each article
      const enrichedResults = await Promise.all(results.map(async (article) => {
        const cats = await db.select({ name: categories.name })
          .from(articleCategories)
          .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
          .where(eq(articleCategories.articleId, article.id));

        return {
          ...article,
          status: { name: article.statusName },
          author: { name: article.authorName },
          primaryCategory: { name: cats[0]?.name || '' },
        };
      }));

      return { items: enrichedResults };
    }),

  /**
   * Get category by slug (public)
   */
  getCategoryBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(categories)
        .where(and(
          eq(categories.slug, input.slug),
          eq(categories.module, "news")
        ))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * List articles by category slug (public)
   */
  listByCategory: publicProcedure
    .input(z.object({
      categorySlug: z.string(),
      page: z.number().default(1),
      limit: z.number().default(20),
      sortBy: z.enum(["publishedAt", "viewCount"]).default("publishedAt"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { categorySlug, page, limit, sortBy } = input;
      const offset = (page - 1) * limit;

      // Get category by slug
      const categoryResult = await db.select()
        .from(categories)
        .where(and(
          eq(categories.slug, categorySlug),
          eq(categories.module, "news")
        ))
        .limit(1);

      if (!categoryResult[0]) {
        return { items: [], total: 0, page, totalPages: 0, category: null };
      }

      const category = categoryResult[0];

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) {
        return { items: [], total: 0, page, totalPages: 0, category };
      }

      // Get article IDs that have this category (either as primary or secondary)
      const articleIdsWithCategory = await db
        .select({ articleId: articleCategories.articleId })
        .from(articleCategories)
        .where(eq(articleCategories.categoryId, category.id));
      
      // Also include articles with this as primary category
      const articleIdsWithPrimary = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.primaryCategoryId, category.id));

      const allArticleIds = Array.from(new Set([
        ...articleIdsWithCategory.map(a => a.articleId),
        ...articleIdsWithPrimary.map(a => a.id)
      ]));

      if (allArticleIds.length === 0) {
        return { items: [], total: 0, page, totalPages: 0, category };
      }

      // Build sort column
      const sortColumn = sortBy === "viewCount" ? articles.viewCount : articles.publishedAt;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(articles)
        .where(and(
          inArray(articles.id, allArticleIds),
          eq(articles.statusId, publishedStatus.id)
        ));

      const total = Number(countResult[0]?.count || 0);

      // Get paginated articles
      const articleResults = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        primaryCategoryId: articles.primaryCategoryId,
        authorId: articles.authorId,
        isFeatured: articles.isFeatured,
        isTrending: articles.isTrending,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
        .from(articles)
        .where(and(
          inArray(articles.id, allArticleIds),
          eq(articles.statusId, publishedStatus.id)
        ))
        .orderBy(desc(sortColumn))
        .limit(limit)
        .offset(offset);

      // Enrich with author, primary category, and featured image
      const enrichedResults = await Promise.all(articleResults.map(async (article) => {
        const author = await db.select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, article.authorId))
          .limit(1);

        let primaryCategory: { id: number; name: string; slug: string } | null = null;
        if (article.primaryCategoryId) {
          const primaryCatResult = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, article.primaryCategoryId))
            .limit(1);
          primaryCategory = primaryCatResult[0] || null;
        }

        let featuredImageUrl: string | null = null;
        if (article.featuredImageId) {
          const mediaResult = await db.select({ url: media.url })
            .from(media)
            .where(eq(media.id, article.featuredImageId))
            .limit(1);
          featuredImageUrl = mediaResult[0]?.url || null;
        }

        // Get tags for this article (deduplicated)
        const articleTagsResult = await db.selectDistinct({ id: tags.id, name: tags.name, slug: tags.slug })
          .from(articleTags)
          .innerJoin(tags, eq(articleTags.tagId, tags.id))
          .where(eq(articleTags.articleId, article.id));

        return {
          ...article,
          author: author[0] || null,
          primaryCategory,
          featuredImageUrl,
          tags: articleTagsResult,
        };
      }));

      return {
        items: enrichedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        category,
      };
    }),

  /**
   * Get all categories with article counts (public) - for Browse Categories sidebar
   */
  getAllCategoriesWithCounts: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get published status using workflowService
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) {
        return [];
      }

      // Get all categories
      const allCategories = await db.select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,

      })
        .from(categories)
        .orderBy(asc(categories.name));

      // Get article counts for each category
      const categoriesWithCounts = await Promise.all(allCategories.map(async (cat) => {
        // Count articles where this category is the primary category
        const countResult = await db.select({ count: sql<number>`count(*)` })
          .from(articles)
          .where(and(
            eq(articles.primaryCategoryId, cat.id),
            eq(articles.statusId, publishedStatus.id)
          ));

        return {
          ...cat,
          articleCount: Number(countResult[0]?.count || 0),
        };
      }));

      // Sort by article count descending
      return categoriesWithCounts.sort((a: any, b: any) => b.articleCount - a.articleCount);
    }),

  /**
   * Get sub-categories for a parent category with article counts (public)
   */
  getSubCategoriesWithCounts: publicProcedure
    .input(z.object({ parentSlug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get parent category
      const parentCategory = await db.select()
        .from(categories)
        .where(eq(categories.slug, input.parentSlug))
        .limit(1);

      if (!parentCategory[0]) {
        return [];
      }

      // Get published status using workflowService
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) {
        return [];
      }

      // Get sub-categories
      const subCategories = await db.select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,

      })
        .from(categories)
        .where(eq(categories.parentId, parentCategory[0].id))
        .orderBy(asc(categories.name));

      // Get article counts for each sub-category
      const subCategoriesWithCounts = await Promise.all(subCategories.map(async (cat) => {
        const countResult = await db.select({ count: sql<number>`count(*)` })
          .from(articles)
          .where(and(
            eq(articles.primaryCategoryId, cat.id),
            eq(articles.statusId, publishedStatus.id)
          ));

        return {
          ...cat,
          articleCount: Number(countResult[0]?.count || 0),
        };
      }));

      // Sort by article count descending
      return subCategoriesWithCounts.sort((a: any, b: any) => b.articleCount - a.articleCount);
    }),

  /**
   * Get related articles for an article
   */
  getRelatedArticles: publicProcedure
    .input(z.object({
      articleId: z.number(),
      limit: z.number().default(5),
    }))
    .query(async ({ input }) => {
      return relatedContentService.getRelatedArticles(input.articleId, input.limit);
    }),

  /**
   * Get related entities (people, companies, events) for an article
   */
  getRelatedEntities: publicProcedure
    .input(z.object({
      articleId: z.number(),
      limit: z.number().default(6),
    }))
    .query(async ({ input }) => {
      return relatedContentService.getRelatedEntities(input.articleId, input.limit);
    }),

  /**
   * Suggest internal links for article content
   */
  suggestInternalLinks: protectedProcedure
    .input(z.object({
      content: z.string(),
      excludeArticleId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return relatedContentService.suggestInternalLinks(input.content, input.excludeArticleId);
    }),

  /**
   * Get articles by category slug
   */
  getByCategory: publicProcedure
    .input(z.object({
      categorySlug: z.string(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      return relatedContentService.getArticlesByCategory(input.categorySlug, input.page, input.limit);
    }),

  /**
   * Get articles by topic slug
   */
  getByTopic: publicProcedure
    .input(z.object({
      topicSlug: z.string(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      return relatedContentService.getArticlesByTopic(input.topicSlug, input.page, input.limit);
    }),

  /**
   * List articles by tag slug (public) - for dedicated tag pages
   */
  listByTag: publicProcedure
    .input(z.object({
      tagSlug: z.string(),
      page: z.number().default(1),
      limit: z.number().default(20),
      sortBy: z.enum(["publishedAt", "viewCount"]).default("publishedAt"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { tagSlug, page, limit, sortBy } = input;
      const offset = (page - 1) * limit;

      // Get tag by slug
      const tagResult = await db.select()
        .from(tags)
        .where(and(
          eq(tags.slug, tagSlug),
          eq(tags.isActive, 1)
        ))
        .limit(1);

      if (!tagResult[0]) {
        return { items: [], total: 0, page, totalPages: 0, tag: null };
      }

      const tag = tagResult[0];

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) {
        return { items: [], total: 0, page, totalPages: 0, tag };
      }

      // Get article IDs that have this tag (distinct to handle duplicates)
      const articleIdsWithTag = await db
        .selectDistinct({ articleId: articleTags.articleId })
        .from(articleTags)
        .where(eq(articleTags.tagId, tag.id));

      const allArticleIds = articleIdsWithTag.map(a => a.articleId);

      if (allArticleIds.length === 0) {
        return { items: [], total: 0, page, totalPages: 0, tag };
      }

      // Build sort column
      const sortColumn = sortBy === "viewCount" ? articles.viewCount : articles.publishedAt;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(articles)
        .where(and(
          inArray(articles.id, allArticleIds),
          eq(articles.statusId, publishedStatus.id)
        ));

      const total = Number(countResult[0]?.count || 0);

      // Get paginated articles
      const articleResults = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        primaryCategoryId: articles.primaryCategoryId,
        authorId: articles.authorId,
        isFeatured: articles.isFeatured,
        isTrending: articles.isTrending,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
        .from(articles)
        .where(and(
          inArray(articles.id, allArticleIds),
          eq(articles.statusId, publishedStatus.id)
        ))
        .orderBy(desc(sortColumn))
        .limit(limit)
        .offset(offset);

      // Enrich with author, primary category, featured image, and tags
      const enrichedResults = await Promise.all(articleResults.map(async (article) => {
        const author = await db.select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, article.authorId))
          .limit(1);

        let primaryCategory: { id: number; name: string; slug: string } | null = null;
        if (article.primaryCategoryId) {
          const primaryCatResult = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, article.primaryCategoryId))
            .limit(1);
          primaryCategory = primaryCatResult[0] || null;
        }

        let featuredImageUrl: string | null = null;
        if (article.featuredImageId) {
          const mediaResult = await db.select({ url: media.url })
            .from(media)
            .where(eq(media.id, article.featuredImageId))
            .limit(1);
          featuredImageUrl = mediaResult[0]?.url || null;
        }

        // Get tags for this article (deduplicated)
        const articleTagsResult = await db.selectDistinct({ id: tags.id, name: tags.name, slug: tags.slug })
          .from(articleTags)
          .innerJoin(tags, eq(articleTags.tagId, tags.id))
          .where(eq(articleTags.articleId, article.id));

        return {
          ...article,
          author: author[0] || null,
          primaryCategory,
          featuredImageUrl,
          tags: articleTagsResult,
        };
      }));

      return {
        items: enrichedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        tag,
      };
    }),

  /**
   * Get all active tags with article counts (public) - for Browse Tags sidebar
   */
  getAllTagsWithCounts: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) {
        return [];
      }

      // Get all active tags with their published article counts
      const allTags = await db.select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        tagType: tags.tagType,
      })
        .from(tags)
        .where(eq(tags.isActive, 1))
        .orderBy(asc(tags.name));

      // Get article counts for each tag (only published articles)
      const tagsWithCounts = await Promise.all(allTags.map(async (tag) => {
        const countResult = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${articleTags.articleId})` })
          .from(articleTags)
          .innerJoin(articles, eq(articleTags.articleId, articles.id))
          .where(and(
            eq(articleTags.tagId, tag.id),
            eq(articles.statusId, publishedStatus.id)
          ));

        return {
          ...tag,
          articleCount: Number(countResult[0]?.count || 0),
        };
      }));

      // Only return tags with at least 1 published article, sorted by count desc
      return tagsWithCounts
        .filter(t => t.articleCount > 0)
        .sort((a: any, b: any) => b.articleCount - a.articleCount);
    }),

  /**
   * Get tag by slug (public) - for tag page SEO
   */
  getTagBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(tags)
        .where(and(
          eq(tags.slug, input.slug),
          eq(tags.isActive, 1)
        ))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Get all tags for sitemap generation
   */
  getTagsForSitemap: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      // Get active tags that have at least one published article
      const result = await db
        .select({
          slug: tags.slug,
          name: tags.name,
          updatedAt: tags.updatedAt,
        })
        .from(tags)
        .innerJoin(articleTags, eq(tags.id, articleTags.tagId))
        .innerJoin(articles, and(
          eq(articleTags.articleId, articles.id),
          eq(articles.statusId, publishedStatus.id)
        ))
        .where(eq(tags.isActive, 1))
        .groupBy(tags.id)
        .orderBy(asc(tags.name));

      return result;
    }),
});
