import { z } from "zod";
import { eq, and, desc, gte, inArray, isNull, or } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  emailDigestPreferences,
  articles,
  jobs,
  events,
  browsingHistory,
  categories,
} from "../../../drizzle/schema";
import { invokeLLM } from "../../_core/llm";
import { notifyOwner } from "../../_core/notification";
import { toDbDate } from "../../_core/dbValues";

export const emailDigestRouter = router({
  // Get current user's digest preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [pref] = await db
      .select()
      .from(emailDigestPreferences)
      .where(eq(emailDigestPreferences.userId, ctx.user.id))
      .limit(1);

    if (!pref) {
      // Return defaults
      return {
        frequency: "none" as const,
        categories: [] as string[],
        includeJobs: true,
        includeEvents: true,
        includeNews: true,
        includeRecommendations: true,
        lastSentAt: null,
      };
    }

    return {
      frequency: pref.frequency,
      categories: (pref.categories || []) as string[],
      includeJobs: pref.includeJobs ?? true,
      includeEvents: pref.includeEvents ?? true,
      includeNews: pref.includeNews ?? true,
      includeRecommendations: pref.includeRecommendations ?? true,
      lastSentAt: pref.lastSentAt,
    };
  }),

  // Update digest preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        frequency: z.enum(["daily", "weekly", "none"]),
        categories: z.array(z.string()).optional(),
        includeJobs: z.boolean().optional(),
        includeEvents: z.boolean().optional(),
        includeNews: z.boolean().optional(),
        includeRecommendations: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db
        .select()
        .from(emailDigestPreferences)
        .where(eq(emailDigestPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        await db
          .update(emailDigestPreferences)
          .set({
            frequency: input.frequency,
            ...(input.categories !== undefined && { categories: input.categories }),
            ...(input.includeJobs !== undefined && { includeJobs: input.includeJobs }),
            ...(input.includeEvents !== undefined && { includeEvents: input.includeEvents }),
            ...(input.includeNews !== undefined && { includeNews: input.includeNews }),
            ...(input.includeRecommendations !== undefined && {
              includeRecommendations: input.includeRecommendations,
            }),
          } as any)
          .where(eq(emailDigestPreferences.id, existing.id));
      } else {
        await db.insert(emailDigestPreferences).values({
          userId: ctx.user.id,
          frequency: input.frequency,
          categories: input.categories || [],
          includeJobs: input.includeJobs ?? true,
          includeEvents: input.includeEvents ?? true,
          includeNews: input.includeNews ?? true,
          includeRecommendations: input.includeRecommendations ?? true,
        } as any);
      }

      return { success: true };
    }),

  // Get available categories for digest preferences
  getAvailableCategories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const cats = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(eq(categories.isActive, 1))
      .orderBy(categories.name);

    return cats;
  }),

  // Preview what a digest would look like for the current user
  previewDigest: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const userId = ctx.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get user's preferences
    const [pref] = await db
      .select()
      .from(emailDigestPreferences)
      .where(eq(emailDigestPreferences.userId, userId))
      .limit(1);

    // Get user's browsing history to determine interests
    const history = await db
      .select({
        contentCategory: browsingHistory.contentCategory,
      })
      .from(browsingHistory)
      .where(eq(browsingHistory.userId, userId))
      .orderBy(desc(browsingHistory.lastViewedAt))
      .limit(50);

    const categoryMap = new Map<string, number>();
    for (const h of history) {
      if (h.contentCategory) {
        categoryMap.set(h.contentCategory, (categoryMap.get(h.contentCategory) || 0) + 1);
      }
    }
    const topCategories = Array.from(categoryMap.entries())
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5)
      .map((entry: [string, number]) => entry[0]);

    // Fetch recent articles
    const recentArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.primaryCategoryId, categories.id))
      .where(
        and(
          eq(articles.statusId, 4), // published
          gte(articles.publishedAt, sevenDaysAgo as any)
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(10);

    // Fetch recent jobs
    const recentJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        companyName: jobs.companyName,
        location: jobs.location,
        roleType: jobs.roleType,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.statusId, 4),
          gte(jobs.createdAt, sevenDaysAgo as any)
        )
      )
      .orderBy(desc(jobs.createdAt))
      .limit(5);

    // Fetch upcoming events
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        startDate: events.startDate,
        city: events.city,
        type: events.type,
      })
      .from(events)
      .where(
        and(
          eq(events.statusId, 4),
          gte(events.startDate, toDbDate(new Date()))
        )
      )
      .orderBy(events.startDate)
      .limit(5);

    return {
      topCategories,
      articles: recentArticles,
      jobs: recentJobs,
      events: upcomingEvents,
      preferences: pref
        ? {
            frequency: pref.frequency,
            categories: (pref.categories || []) as string[],
            includeJobs: pref.includeJobs,
            includeEvents: pref.includeEvents,
            includeNews: pref.includeNews,
          }
        : null,
    };
  }),

  // Admin: trigger digest send (for testing or manual sends)
  triggerDigest: adminProcedure
    .input(
      z.object({
        frequency: z.enum(["daily", "weekly"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Count users with this frequency preference
      const subscribers = await db
        .select({
          id: emailDigestPreferences.id,
          userId: emailDigestPreferences.userId,
        })
        .from(emailDigestPreferences)
        .where(eq(emailDigestPreferences.frequency, input.frequency));

      // Notify the owner about the digest trigger
      await notifyOwner({
        title: `Email Digest Triggered: ${input.frequency}`,
        content: `A ${input.frequency} email digest was triggered for ${subscribers.length} subscribers.`,
      });

      // Update lastSentAt for all subscribers
      if (subscribers.length > 0) {
        const ids = subscribers.map((s: { id: number; userId: number }) => s.id);
        await db
          .update(emailDigestPreferences)
          .set({ lastSentAt: toDbDate(new Date()) } as any)
          .where(inArray(emailDigestPreferences.id, ids));
      }

      return {
        success: true,
        subscriberCount: subscribers.length,
        frequency: input.frequency,
      };
    }),
});
