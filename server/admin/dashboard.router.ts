/**
 * Dashboard Admin Router
 * Admin dashboard analytics and overview
 */

import { z } from "zod";
import { eq, desc, count, sql, gte, and } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { toDbDate } from "../_core/dbValues";
import { 
  articles,
  jobs,
  people,
  investors,
  events,
  resources,
  users,
  profileClaims,
  suggestedUpdates,
  workflowStatuses
} from "../../drizzle/schema";

// ============================================================
// DASHBOARD ADMIN ROUTER
// ============================================================

export const dashboardRouter = router({
  /**
   * Get dashboard overview stats
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get counts for each content type
      const [
        articlesCount,
        jobsCount,
        peopleCount,
        investorsCount,
        eventsCount,
        resourcesCount,
        usersCount,
      ] = await Promise.all([
        db.select().from(articles).then(r => r.length),
        db.select().from(jobs).then(r => r.length),
        db.select().from(people).then(r => r.length),
        db.select().from(investors).then(r => r.length),
        db.select().from(events).then(r => r.length),
        db.select().from(resources).then(r => r.length),
        db.select().from(users).then(r => r.length),
      ]);

      // Get pending moderation counts
      const pendingClaims = await db.select()
        .from(profileClaims)
        .where(eq(profileClaims.status, "pending"))
        .then(r => r.length);

      const pendingUpdates = await db.select()
        .from(suggestedUpdates)
        .where(eq(suggestedUpdates.status, "pending"))
        .then(r => r.length);

      return {
        content: {
          articles: articlesCount,
          jobs: jobsCount,
          people: peopleCount,
          investors: investorsCount,
          events: eventsCount,
          resources: resourcesCount,
        },
        users: usersCount,
        moderation: {
          pendingClaims,
          pendingUpdates,
          total: pendingClaims + pendingUpdates,
        },
      };
    }),

  /**
   * Get content by status breakdown
   */
  getContentByStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get all statuses
      const statuses = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.workflowType, "editorial"));

      // Get article counts by status
      const articlesByStatus: Record<string, number> = {};
      for (const status of statuses) {
        const count = await db.select()
          .from(articles)
          .where(eq(articles.statusId, status.id))
          .then(r => r.length);
        articlesByStatus[status.name] = count;
      }

      return {
        statuses: statuses.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
          count: articlesByStatus[s.name] || 0,
        })),
      };
    }),

  /**
   * Get recent activity
   */
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get recent articles
      const recentArticles = await db.select({
        id: articles.id,
        title: articles.title,
        createdAt: articles.createdAt,
      })
        .from(articles)
        .orderBy(desc(articles.createdAt))
        .limit(input.limit);

      // Get recent claims
      const recentClaims = await db.select()
        .from(profileClaims)
        .orderBy(desc(profileClaims.createdAt))
        .limit(input.limit);

      // Get recent updates
      const recentUpdates = await db.select()
        .from(suggestedUpdates)
        .orderBy(desc(suggestedUpdates.createdAt))
        .limit(input.limit);

      return {
        articles: recentArticles.map(a => ({
          type: "article" as const,
          id: a.id,
          title: a.title,
          createdAt: a.createdAt,
        })),
        claims: recentClaims.map(c => ({
          type: "claim" as const,
          id: c.id,
          entityType: c.entityType,
          entityId: c.entityId,
          status: c.status,
          createdAt: c.createdAt,
        })),
        updates: recentUpdates.map(u => ({
          type: "update" as const,
          id: u.id,
          entityType: u.entityType,
          entityId: u.entityId,
          status: u.status,
          createdAt: u.createdAt,
        })),
      };
    }),

  /**
   * Get user activity stats
   */
  getUserActivity: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view user activity");
      }

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      // Get users who signed in recently
      const activeUsers = await db.select()
        .from(users)
        .where(gte(users.lastSignedIn, toDbDate(since)));

      // Get new users
      const newUsers = await db.select()
        .from(users)
        .where(gte(users.createdAt, toDbDate(since)));

      // Get users by role
      const allUsers = await db.select().from(users);
      const byRole: Record<string, number> = {};
      for (const user of allUsers) {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      }

      return {
        activeUsers: activeUsers.length,
        newUsers: newUsers.length,
        totalUsers: allUsers.length,
        byRole,
      };
    }),

  /**
   * Get quick actions for current user
   */
  getQuickActions: protectedProcedure
    .query(async ({ ctx }) => {
      const actions = [];

      if (["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        actions.push({
          id: "new-article",
          label: "New Article",
          icon: "file-text",
          href: "/admin/news/new",
        });
      }

      if (["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        actions.push({
          id: "new-job",
          label: "New Job",
          icon: "briefcase",
          href: "/admin/jobs/new",
        });
        actions.push({
          id: "new-event",
          label: "New Event",
          icon: "calendar",
          href: "/admin/events/new",
        });
      }

      if (["admin", "moderator"].includes(ctx.user.role)) {
        actions.push({
          id: "moderation-queue",
          label: "Moderation Queue",
          icon: "shield",
          href: "/admin/moderation",
        });
      }

      if (ctx.user.role === "admin") {
        actions.push({
          id: "settings",
          label: "Settings",
          icon: "settings",
          href: "/admin/settings",
        });
      }

      return actions;
    }),

  /**
   * Get pending items for current user
   */
  getPendingItems: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const items: Array<{
        type: string;
        count: number;
        label: string;
        href: string;
      }> = [];

      // Get pending moderation items for moderators/admins
      if (["admin", "moderator"].includes(ctx.user.role)) {
        const pendingClaims = await db.select()
          .from(profileClaims)
          .where(eq(profileClaims.status, "pending"))
          .then(r => r.length);

        const pendingUpdates = await db.select()
          .from(suggestedUpdates)
          .where(eq(suggestedUpdates.status, "pending"))
          .then(r => r.length);

        if (pendingClaims > 0) {
          items.push({
            type: "claims",
            count: pendingClaims,
            label: "Profile Claims",
            href: "/admin/moderation/claims",
          });
        }

        if (pendingUpdates > 0) {
          items.push({
            type: "updates",
            count: pendingUpdates,
            label: "Suggested Updates",
            href: "/admin/moderation/updates",
          });
        }
      }

      // Get pending review items for editors
      if (["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        // Get statuses that need review
        const reviewStatuses = await db.select()
          .from(workflowStatuses)
          .where(and(
            eq(workflowStatuses.workflowType, "editorial"),
            eq(workflowStatuses.slug, "submitted")
          ));

        if (reviewStatuses.length > 0) {
          const pendingReview = await db.select()
            .from(articles)
            .where(eq(articles.statusId, reviewStatuses[0].id))
            .then(r => r.length);

          if (pendingReview > 0) {
            items.push({
              type: "review",
              count: pendingReview,
              label: "Articles Pending Review",
              href: "/admin/news?status=submitted",
            });
          }
        }
      }

      return items;
    }),

  // ============================================================
  // ANALYTICS — pulls from Google APIs configured in Integration Hub.
  // Each procedure returns null when the integration isn't configured;
  // the dashboard treats null as "show the Connect via Hub empty state".
  // Cache TTL is in-memory per process (15 min for GA, 30 min for GSC).
  // ============================================================
  audienceSummary: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) return null;
      try {
        const { getAudienceSummary } = await import("../services/googleAnalytics.service");
        return await getAudienceSummary(input?.days ?? 30);
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) } as any;
      }
    }),

  revenueSummary: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ input, ctx }) => {
      if (!["admin", "senior_editor"].includes(ctx.user.role)) return null;
      try {
        const { getRevenueSummary } = await import("../services/googleAdsense.service");
        return await getRevenueSummary(input?.days ?? 30);
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) } as any;
      }
    }),

  searchConsoleSummary: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(28) }).optional())
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) return null;
      try {
        const { getSearchConsoleSummary } = await import("../services/searchConsole.service");
        return await getSearchConsoleSummary(input?.days ?? 28);
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) } as any;
      }
    }),
});
