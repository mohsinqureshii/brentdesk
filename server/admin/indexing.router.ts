/**
 * Indexing Admin Router
 * Provides endpoints for viewing indexing notification logs and stats
 */

import { z } from "zod";
import { eq, desc, sql, and, gte, count } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { indexingLogs, users } from "../../drizzle/schema";
import { notifySearchEngines } from "../services/indexingNotification.service";
import { resolveArticleInfo } from "../services/indexingNotification.helper";

export const indexingRouter = router({
  /**
   * Get recent indexing logs with pagination
   */
  getLogs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      method: z.enum(["sitemap_ping", "indexnow", "google_indexing_api"]).optional(),
      successOnly: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Build conditions
      const conditions = [];
      if (input.method) {
        conditions.push(eq(indexingLogs.method, input.method));
      }
      if (input.successOnly !== undefined) {
        conditions.push(eq(indexingLogs.success, input.successOnly ? 1 : 0));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, totalResult] = await Promise.all([
        db.select({
          id: indexingLogs.id,
          articleId: indexingLogs.articleId,
          articleTitle: indexingLogs.articleTitle,
          articleSlug: indexingLogs.articleSlug,
          url: indexingLogs.url,
          method: indexingLogs.method,
          success: indexingLogs.success,
          statusCode: indexingLogs.statusCode,
          message: indexingLogs.message,
          trigger: indexingLogs.trigger,
          triggeredBy: indexingLogs.triggeredBy,
          createdAt: indexingLogs.createdAt,
        })
          .from(indexingLogs)
          .where(whereClause)
          .orderBy(desc(indexingLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() })
          .from(indexingLogs)
          .where(whereClause),
      ]);

      return {
        logs: logs.map(log => ({
          ...log,
          success: !!log.success,
        })),
        total: totalResult[0]?.count || 0,
      };
    }),

  /**
   * Get indexing stats summary (for dashboard widget)
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get stats for last 24 hours (createdAt is string mode timestamp)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      // Get stats for last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      const [
        totalAll,
        successAll,
        total24h,
        success24h,
        total7d,
        success7d,
        byMethod,
        recentLogs,
      ] = await Promise.all([
        // All time totals
        db.select({ count: count() }).from(indexingLogs),
        db.select({ count: count() }).from(indexingLogs).where(sql`${indexingLogs.success} = 1`),
        // Last 24h
        db.select({ count: count() }).from(indexingLogs).where(sql`${indexingLogs.createdAt} >= ${oneDayAgo}`),
        db.select({ count: count() }).from(indexingLogs).where(sql`${indexingLogs.createdAt} >= ${oneDayAgo} AND ${indexingLogs.success} = 1`),
        // Last 7 days
        db.select({ count: count() }).from(indexingLogs).where(sql`${indexingLogs.createdAt} >= ${sevenDaysAgo}`),
        db.select({ count: count() }).from(indexingLogs).where(sql`${indexingLogs.createdAt} >= ${sevenDaysAgo} AND ${indexingLogs.success} = 1`),
        // By method (last 7 days)
        db.select({
          method: indexingLogs.method,
          total: count(),
          successes: sql<number>`SUM(CASE WHEN ${indexingLogs.success} = 1 THEN 1 ELSE 0 END)`,
        })
          .from(indexingLogs)
          .where(sql`${indexingLogs.createdAt} >= ${sevenDaysAgo}`)
          .groupBy(indexingLogs.method),
        // Recent 5 logs for quick preview
        db.select({
          id: indexingLogs.id,
          articleTitle: indexingLogs.articleTitle,
          method: indexingLogs.method,
          success: indexingLogs.success,
          createdAt: indexingLogs.createdAt,
        })
          .from(indexingLogs)
          .orderBy(desc(indexingLogs.createdAt))
          .limit(5),
      ]);

      const methodStats = {
        sitemap_ping: { total: 0, successes: 0 },
        indexnow: { total: 0, successes: 0 },
        google_indexing_api: { total: 0, successes: 0 },
      };

      for (const row of byMethod) {
        if (row.method in methodStats) {
          methodStats[row.method as keyof typeof methodStats] = {
            total: Number(row.total),
            successes: Number(row.successes),
          };
        }
      }

      return {
        allTime: {
          total: totalAll[0]?.count || 0,
          successes: successAll[0]?.count || 0,
          successRate: totalAll[0]?.count
            ? Math.round(((successAll[0]?.count || 0) / totalAll[0].count) * 100)
            : 0,
        },
        last24h: {
          total: total24h[0]?.count || 0,
          successes: success24h[0]?.count || 0,
          successRate: total24h[0]?.count
            ? Math.round(((success24h[0]?.count || 0) / total24h[0].count) * 100)
            : 0,
        },
        last7d: {
          total: total7d[0]?.count || 0,
          successes: success7d[0]?.count || 0,
          successRate: total7d[0]?.count
            ? Math.round(((success7d[0]?.count || 0) / total7d[0].count) * 100)
            : 0,
        },
        byMethod: methodStats,
        recentLogs: recentLogs.map(log => ({
          ...log,
          success: !!log.success,
        })),
        googleIndexingApiConfigured: !!process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT,
      };
    }),

  /**
   * Save Google Indexing API service account JSON
   * Stores the service account credentials as an environment variable
   */
  saveGoogleServiceAccount: protectedProcedure
    .input(z.object({
      serviceAccountJson: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can configure Google Indexing API");
      }

      try {
        // Validate JSON format
        const parsed = JSON.parse(input.serviceAccountJson);
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error("Invalid service account JSON: missing client_email or private_key");
        }

        // Set the environment variable at runtime
        process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT = input.serviceAccountJson;

        return {
          success: true,
          clientEmail: parsed.client_email,
          projectId: parsed.project_id || "unknown",
        };
      } catch (err) {
        if (err instanceof SyntaxError) {
          throw new Error("Invalid JSON format. Please paste the complete service account JSON file content.");
        }
        throw err;
      }
    }),

  /**
   * Check Google Indexing API configuration status
   */
  getGoogleApiStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const json = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
      if (!json) {
        return { configured: false, clientEmail: null, projectId: null };
      }

      try {
        const parsed = JSON.parse(json);
        return {
          configured: true,
          clientEmail: parsed.client_email || null,
          projectId: parsed.project_id || null,
        };
      } catch {
        return { configured: false, clientEmail: null, projectId: null };
      }
    }),

  /**
   * Remove Google Indexing API configuration
   */
  removeGoogleServiceAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can configure Google Indexing API");
      }

      delete process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
      return { success: true };
    }),

  /**
   * Manually trigger indexing notification for an article
   */
  triggerManual: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can manually trigger indexing");
      }

      const info = await resolveArticleInfo(input.articleId);
      if (!info) throw new Error("Article not found");

      const results = await notifySearchEngines({
        url: info.url,
        type: "URL_UPDATED",
        articleId: info.articleId,
        articleTitle: info.articleTitle,
        articleSlug: info.articleSlug,
        trigger: "manual",
        triggeredBy: ctx.user.id,
      });

      return {
        success: true,
        results: results.map(r => ({
          method: r.method,
          success: r.success,
          statusCode: r.statusCode,
          message: r.message,
        })),
      };
    }),
});
