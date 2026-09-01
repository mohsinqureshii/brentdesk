/**
 * Search Analytics Router
 * Logs search queries and provides analytics for the admin dashboard
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "search-analytics-salt").digest("hex").slice(0, 16);
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const searchAnalyticsRouter = router({
  /**
   * Log a search query (public — called from search pages)
   */
  logSearch: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      entityType: z.string().max(50).optional().default("all"),
      resultsCount: z.number().int().min(0).default(0),
      sessionId: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const ip = (ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket?.remoteAddress || "").split(",")[0].trim();
      const ipHash = ip ? hashIp(ip) : null;
      const ua = (ctx.req.headers["user-agent"] || "").slice(0, 512);
      const userId = ctx.user?.id ?? null;

      try {
        await db.execute(sql`
          INSERT INTO search_analytics (query, entity_type, results_count, user_id, session_id, ip_hash, user_agent)
          VALUES (${input.query}, ${input.entityType}, ${input.resultsCount}, ${userId}, ${input.sessionId ?? null}, ${ipHash}, ${ua})
        `);
        return { success: true };
      } catch {
        return { success: false };
      }
    }),

  /**
   * Get search analytics summary (admin only)
   */
  getSummary: protectedProcedure
    .input(z.object({
      days: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const since = new Date(Date.now() - input.days * 86400000)
        .toISOString().slice(0, 19).replace("T", " ");

      // Total searches
      const [totalRow] = await db.execute(sql`
        SELECT COUNT(*) as total, COUNT(DISTINCT ip_hash) as unique_searchers
        FROM search_analytics WHERE searched_at >= ${since}
      `) as any;
      const totals = (totalRow as any[])[0];

      // Top queries
      const [topQueriesRows] = await db.execute(sql`
        SELECT query, COUNT(*) as count, AVG(results_count) as avg_results
        FROM search_analytics
        WHERE searched_at >= ${since}
        GROUP BY LOWER(query)
        ORDER BY count DESC
        LIMIT 20
      `) as any;

      // Zero-result queries
      const [zeroResultRows] = await db.execute(sql`
        SELECT query, COUNT(*) as count
        FROM search_analytics
        WHERE searched_at >= ${since} AND results_count = 0
        GROUP BY LOWER(query)
        ORDER BY count DESC
        LIMIT 20
      `) as any;

      // Searches by day
      const [dailyRows] = await db.execute(sql`
        SELECT DATE(searched_at) as date, COUNT(*) as count
        FROM search_analytics
        WHERE searched_at >= ${since}
        GROUP BY DATE(searched_at)
        ORDER BY date ASC
      `) as any;

      // Searches by entity type
      const [entityRows] = await db.execute(sql`
        SELECT COALESCE(entity_type, 'all') as entity_type, COUNT(*) as count
        FROM search_analytics
        WHERE searched_at >= ${since}
        GROUP BY entity_type
        ORDER BY count DESC
      `) as any;

      return {
        totalSearches: Number(totals?.total || 0),
        uniqueSearchers: Number(totals?.unique_searchers || 0),
        topQueries: (topQueriesRows as any[]).map(r => ({
          query: r.query,
          count: Number(r.count),
          avgResults: Math.round(Number(r.avg_results || 0)),
        })),
        zeroResultQueries: (zeroResultRows as any[]).map(r => ({
          query: r.query,
          count: Number(r.count),
        })),
        dailySearches: (dailyRows as any[]).map(r => ({
          date: r.date,
          count: Number(r.count),
        })),
        byEntityType: (entityRows as any[]).map(r => ({
          entityType: r.entity_type,
          count: Number(r.count),
        })),
      };
    }),

  /**
   * Get recent search queries (admin only)
   */
  getRecentSearches: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
      search: z.string().optional(),
      entityType: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.limit;
      let where = "WHERE 1=1";
      const params: any[] = [];

      if (input.search) {
        where += " AND LOWER(query) LIKE LOWER(?)";
        params.push(`%${input.search}%`);
      }
      if (input.entityType) {
        where += " AND entity_type = ?";
        params.push(input.entityType);
      }

      const [rows] = await (db as any).execute(
        `SELECT id, query, entity_type, results_count, user_id, searched_at
         FROM search_analytics ${where}
         ORDER BY searched_at DESC
         LIMIT ? OFFSET ?`,
        [...params, input.limit, offset]
      );

      const [countRows] = await (db as any).execute(
        `SELECT COUNT(*) as total FROM search_analytics ${where}`,
        params
      );

      return {
        items: (rows as any[]).map(r => ({
          id: r.id,
          query: r.query,
          entityType: r.entity_type,
          resultsCount: r.results_count,
          userId: r.user_id,
          searchedAt: r.searched_at,
        })),
        total: Number((countRows as any[])[0]?.total || 0),
        page: input.page,
        totalPages: Math.ceil(Number((countRows as any[])[0]?.total || 0) / input.limit),
      };
    }),
});
