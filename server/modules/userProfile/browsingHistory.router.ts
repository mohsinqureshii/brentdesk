/**
 * Browsing History & Recommendations Router
 * Tracks user browsing behavior and provides personalized content recommendations
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { browsingHistory, articles, categories, articleCategories, jobs, events } from "../../../drizzle/schema";
import { eq, and, desc, sql, inArray, gte } from "drizzle-orm";
import { workflowStatuses } from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const browsingHistoryRouter = router({
  // Track a page view (upsert - increment viewCount if already visited)
  trackView: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "company", "event", "person", "investor", "accelerator"]),
      contentId: z.number(),
      contentTitle: z.string().max(500).optional(),
      contentSlug: z.string().max(500).optional(),
      contentCategory: z.string().max(128).optional(),
      contentImageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if this content was already viewed by this user
      const [existing] = await database
        .select()
        .from(browsingHistory)
        .where(and(
          eq(browsingHistory.userId, ctx.user.id),
          eq(browsingHistory.contentType, input.contentType),
          eq(browsingHistory.contentId, input.contentId)
        ))
        .limit(1);

      if (existing) {
        // Update view count and last viewed time
        await database
          .update(browsingHistory)
          .set({
            viewCount: sql`${browsingHistory.viewCount} + 1`,
            lastViewedAt: new Date(),
            // Update metadata in case it changed
            contentTitle: input.contentTitle || existing.contentTitle,
            contentSlug: input.contentSlug || existing.contentSlug,
            contentCategory: input.contentCategory || existing.contentCategory,
            contentImageUrl: input.contentImageUrl || existing.contentImageUrl,
          } as any)
          .where(eq(browsingHistory.id, existing.id));
      } else {
        // Insert new browsing history entry
        await database.insert(browsingHistory).values({
          userId: ctx.user.id,
          contentType: input.contentType,
          contentId: input.contentId,
          contentTitle: input.contentTitle || null,
          contentSlug: input.contentSlug || null,
          contentCategory: input.contentCategory || null,
          contentImageUrl: input.contentImageUrl || null,
        } as any);
      }

      return { success: true };
    }),

  // Get user's browsing history
  getHistory: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "company", "event", "person", "investor", "accelerator", "all"]).default("all"),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) return { items: [], total: 0 };

      const conditions = [eq(browsingHistory.userId, ctx.user.id)];
      if (input.contentType !== "all") {
        conditions.push(eq(browsingHistory.contentType, input.contentType));
      }

      const whereClause = and(...conditions);

      const items = await database
        .select()
        .from(browsingHistory)
        .where(whereClause)
        .orderBy(desc(browsingHistory.lastViewedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await database
        .select({ count: sql<number>`count(*)` })
        .from(browsingHistory)
        .where(whereClause);

      return {
        items,
        total: countResult?.count || 0,
      };
    }),

  // Get browsing stats for dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const database = await getDb();
    if (!database) return { articlesRead: 0, jobsViewed: 0, eventsViewed: 0, companiesViewed: 0, topCategories: [] };

    // Count by content type
    const typeCounts = await database
      .select({
        contentType: browsingHistory.contentType,
        count: sql<number>`count(*)`,
        totalViews: sql<number>`sum(${browsingHistory.viewCount})`,
      })
      .from(browsingHistory)
      .where(eq(browsingHistory.userId, ctx.user.id))
      .groupBy(browsingHistory.contentType);

    const countMap: Record<string, { count: number; totalViews: number }> = {};
    for (const tc of typeCounts) {
      countMap[tc.contentType] = { count: tc.count, totalViews: tc.totalViews };
    }

    // Get top categories from browsing history
    const topCategories = await database
      .select({
        category: browsingHistory.contentCategory,
        count: sql<number>`count(*)`,
      })
      .from(browsingHistory)
      .where(and(
        eq(browsingHistory.userId, ctx.user.id),
        sql`${browsingHistory.contentCategory} IS NOT NULL AND ${browsingHistory.contentCategory} != ''`
      ))
      .groupBy(browsingHistory.contentCategory)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    return {
      articlesRead: countMap["article"]?.count || 0,
      jobsViewed: countMap["job"]?.count || 0,
      eventsViewed: countMap["event"]?.count || 0,
      companiesViewed: countMap["company"]?.count || 0,
      totalViews: Object.values(countMap as any).reduce((sum: number, v: any) => sum + v.totalViews, 0),
      topCategories: topCategories.map(tc => ({
        name: tc.category || "Uncategorized",
        count: tc.count,
      })),
    };
  }),

  // Get personalized recommendations based on browsing history
  getRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(6),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) return { articles: [], jobs: [], events: [] };

      // Step 1: Get user's top categories from browsing history
      const topCategories = await database
        .select({
          category: browsingHistory.contentCategory,
          count: sql<number>`count(*)`,
        })
        .from(browsingHistory)
        .where(and(
          eq(browsingHistory.userId, ctx.user.id),
          eq(browsingHistory.contentType, "article"),
          sql`${browsingHistory.contentCategory} IS NOT NULL AND ${browsingHistory.contentCategory} != ''`
        ))
        .groupBy(browsingHistory.contentCategory)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      // Step 2: Get IDs of articles user already read
      const readArticleIds = await database
        .select({ contentId: browsingHistory.contentId })
        .from(browsingHistory)
        .where(and(
          eq(browsingHistory.userId, ctx.user.id),
          eq(browsingHistory.contentType, "article")
        ));

      const readIds = readArticleIds.map(r => r.contentId);

      // Step 3: Get recommended articles from user's top categories
      let recommendedArticles: any[] = [];
      const categoryNames = topCategories.map(tc => tc.category).filter(Boolean) as string[];

      if (categoryNames.length > 0) {
        // Find category IDs matching the names
        const matchingCategories = await database
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.name, categoryNames));

        const categoryIds = matchingCategories.map(c => c.id);

        if (categoryIds.length > 0) {
          // Get articles in those categories that the user hasn't read
          const recArticles = await database
            .select({
          id: articles.id,
            title: articles.title,
            slug: articles.slug,
            excerpt: articles.excerpt,
            featuredImageId: articles.featuredImageId,
            publishedAt: articles.publishedAt,
            categoryName: categories.name,
            categorySlug: categories.slug,
            })
            .from(articles)
            .innerJoin(articleCategories, eq(articleCategories.articleId, articles.id))
            .innerJoin(categories, eq(categories.id, articleCategories.categoryId))
            .where(and(
              inArray(articleCategories.categoryId, categoryIds),
              sql`${articles.statusId} IN (SELECT id FROM workflow_statuses WHERE workflowType = 'article' AND isPublished = 1)`,
              readIds.length > 0 ? sql`${articles.id} NOT IN (${sql.join(readIds.map(id => sql`${id}`), sql`, `)})` : sql`1=1`
            ))
            .orderBy(desc(articles.publishedAt))
            .limit(input.limit);

          recommendedArticles = recArticles;
        }
      }

      // If not enough recommendations from categories, fill with trending articles
      if (recommendedArticles.length < input.limit) {
        const remaining = input.limit - recommendedArticles.length;
        const existingIds = recommendedArticles.map(a => a.id);
        const excludeIds = [...readIds, ...existingIds];

        const trendingArticles = await database
          .select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            excerpt: articles.excerpt,
            featuredImageId: articles.featuredImageId,
            publishedAt: articles.publishedAt,
            categoryName: sql<string>`(SELECT c.name FROM article_categories ac JOIN categories c ON c.id = ac.categoryId WHERE ac.articleId = ${articles.id} LIMIT 1)`,
            categorySlug: sql<string>`(SELECT c.slug FROM article_categories ac JOIN categories c ON c.id = ac.categoryId WHERE ac.articleId = ${articles.id} LIMIT 1)`,
          })
            .from(articles)
            .where(and(
              sql`${articles.statusId} IN (SELECT id FROM workflow_statuses WHERE workflowType = 'article' AND isPublished = 1)`,
            excludeIds.length > 0 ? sql`${articles.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})` : sql`1=1`
          ))
          .orderBy(desc(articles.viewCount))
          .limit(remaining);

        recommendedArticles = [...recommendedArticles, ...trendingArticles];
      }

      // Step 4: Get recommended jobs based on user's interests
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get the published workflow status ID for jobs
      const [publishedJobStatus] = await database
        .select({ id: workflowStatuses.id })
        .from(workflowStatuses)
        .where(and(
          eq(workflowStatuses.workflowType, "job"),
          eq(workflowStatuses.isPublished, 1)
        ))
        .limit(1);

      const recommendedJobs = await database
        .select({
          id: jobs.id,
          title: jobs.title,
          slug: jobs.slug,
          companyName: jobs.companyName,
          companyLogo: jobs.companyLogo,
          location: jobs.location,
          roleType: jobs.roleType,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          salaryCurrency: jobs.salaryCurrency,
          publishedAt: jobs.publishedAt,
        })
        .from(jobs)
        .where(and(
          publishedJobStatus ? eq(jobs.statusId, publishedJobStatus.id) : sql`1=1`,
          gte(jobs.publishedAt, thirtyDaysAgo as any)
        ))
        .orderBy(desc(jobs.publishedAt))
        .limit(4);

      // Step 5: Get upcoming events
      const now = new Date();
      // Get the published workflow status ID for events
      const [publishedEventStatus] = await database
        .select({ id: workflowStatuses.id })
        .from(workflowStatuses)
        .where(and(
          eq(workflowStatuses.workflowType, "event"),
          eq(workflowStatuses.isPublished, 1)
        ))
        .limit(1);

      const recommendedEvents = await database
        .select({
          id: events.id,
          title: events.title,
          slug: events.slug,
          startDate: events.startDate,
          endDate: events.endDate,
          venue: events.venue,
          city: events.city,
          type: events.type,
          featuredImage: events.featuredImage,
          isFeatured: events.isFeatured,
        })
        .from(events)
        .where(and(
          publishedEventStatus ? eq(events.statusId, publishedEventStatus.id) : sql`1=1`,
          gte(events.startDate, now as any)
        ))
        .orderBy(events.startDate)
        .limit(4);

      return {
        articles: recommendedArticles,
        jobs: recommendedJobs,
        events: recommendedEvents,
      };
    }),

  // Clear browsing history
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await database
      .delete(browsingHistory)
      .where(eq(browsingHistory.userId, ctx.user.id));

    return { success: true };
  }),
});
