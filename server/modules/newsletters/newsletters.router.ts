/**
 * Newsletters Router
 * ============================================================
 * Manages newsletter list and subscriptions. Provides:
 * - Public: list available newsletters
 * - Public: subscribe to newsletters
 * - Admin: manage newsletter list
 * - Admin: view subscription analytics
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const newslettersRouter = router({
  /**
   * List all active newsletters (public)
   */
  listActive: publicProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) return { success: false, newsletters: [] };

        const result = await db.execute(sql`
          SELECT id, slug, name, description, category, frequency, subscriberCount
          FROM newsletters
          WHERE isActive = 1
          ORDER BY name ASC
        `);

        const rows = (result as any)[0] as Array<any>;
        return {
          success: true,
          newsletters: rows || [],
        };
      } catch (error) {
        console.error("[Newsletters] listActive error:", error);
        return { success: false, newsletters: [] };
      }
    }),

  /**
   * Subscribe to one or more newsletters (public)
   * Idempotent - re-subscribing is safe
   */
  subscribe: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      newsletterSlugs: z.array(z.string().max(64)).min(1),
      source: z.string().max(128).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Service unavailable" };

        const email = input.email.toLowerCase();
        let successCount = 0;

        // Subscribe to each newsletter individually
        for (const slug of input.newsletterSlugs) {
          try {
            // Get newsletter ID from slug
            const newsletterResult = await db.execute(sql`
              SELECT id FROM newsletters WHERE slug = ${slug} AND isActive = 1
            `);

            const rows = (newsletterResult as any)[0] as Array<{ id: number }>;
            if (rows.length === 0) {
              console.warn(`[Newsletters] Newsletter slug not found: ${slug}`);
              continue;
            }

            const newsletterId = rows[0].id;

            // Insert or update subscription
            await db.execute(sql`
              INSERT INTO newsletter_subscriptions (email, newsletterId, status, source)
              VALUES (${email}, ${newsletterId}, 'subscribed', ${input.source || 'direct'})
              ON DUPLICATE KEY UPDATE
                status = 'subscribed',
                updated_at = NOW()
            `);

            successCount++;
          } catch (error) {
            console.error(`[Newsletters] Failed to subscribe to ${slug}:`, error);
          }
        }

        if (successCount === 0) {
          return { success: false, error: "No valid newsletters found" };
        }

        return { success: true, subscribedCount: successCount };
      } catch (error) {
        console.error("[Newsletters] subscribe error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Subscription failed" };
      }
    }),

  /**
   * Unsubscribe from a newsletter (public)
   */
  unsubscribe: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      newsletterSlug: z.string().max(64),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Service unavailable" };

        // Get newsletter ID
        const newsletter = await db.execute(sql`
          SELECT id FROM newsletters WHERE slug = ${input.newsletterSlug}
        `);

        const rows = (newsletter as any)[0] as Array<{ id: number }>;
        if (rows.length === 0) {
          return { success: false, error: "Newsletter not found" };
        }

        const newsletterId = rows[0].id;

        // Mark as unsubscribed
        await db.execute(sql`
          UPDATE newsletter_subscriptions
          SET status = 'unsubscribed', unsubscribed_at = NOW()
          WHERE email = ${input.email.toLowerCase()}
            AND newsletterId = ${newsletterId}
        `);

        return { success: true };
      } catch (error) {
        console.error("[Newsletters] unsubscribe error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unsubscribe failed" };
      }
    }),

  /**
   * Admin: List all newsletters with subscriber counts
   */
  listForAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const db = await getDb();
        if (!db) return { success: false, newsletters: [] };

        const result = await db.execute(sql`
          SELECT
            n.id,
            n.slug,
            n.name,
            n.description,
            n.category,
            n.frequency,
            n.isActive,
            n.subscriberCount,
            n.createdAt,
            n.updatedAt,
            COUNT(DISTINCT ns.id) as activeSubscribers
          FROM newsletters n
          LEFT JOIN newsletter_subscriptions ns ON n.id = ns.newsletterId
            AND ns.status = 'subscribed'
          GROUP BY n.id
          ORDER BY n.name ASC
        `);

        const rows = (result as any)[0] as Array<any>;
        return {
          success: true,
          newsletters: rows || [],
        };
      } catch (error) {
        console.error("[Newsletters] listForAdmin error:", error);
        return { success: false, newsletters: [] };
      }
    }),

  /**
   * Admin: Create a new newsletter
   */
  create: protectedProcedure
    .input(z.object({
      slug: z.string().max(64).regex(/^[a-z0-9_-]+$/),
      name: z.string().max(255),
      description: z.string().max(1000).optional(),
      category: z.string().max(64).optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Service unavailable" };

        const result = await db.execute(sql`
          INSERT INTO newsletters (slug, name, description, category, frequency, isActive)
          VALUES (${input.slug}, ${input.name}, ${input.description || null}, ${input.category || null}, ${input.frequency}, 1)
        `);

        return { success: true, id: (result as any)[0]?.insertId };
      } catch (error) {
        console.error("[Newsletters] create error:", error);
        if (error instanceof Error && error.message.includes("Duplicate entry")) {
          return { success: false, error: "Newsletter slug already exists" };
        }
        return { success: false, error: error instanceof Error ? error.message : "Creation failed" };
      }
    }),

  /**
   * Admin: Update a newsletter
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().max(255).optional(),
      description: z.string().max(1000).optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Service unavailable" };

        const updates: string[] = [];
        const values: any[] = [];

        if (input.name !== undefined) {
          updates.push(`name = '${input.name.replace(/'/g, "''")}'`);
        }
        if (input.description !== undefined) {
          updates.push(`description = '${input.description.replace(/'/g, "''")}'`);
        }
        if (input.frequency !== undefined) {
          updates.push(`frequency = '${input.frequency}'`);
        }
        if (input.isActive !== undefined) {
          updates.push(`isActive = ${input.isActive}`);
        }

        if (updates.length === 0) {
          return { success: true };
        }

        await db.execute(sql.raw(`
          UPDATE newsletters
          SET ${updates.join(", ")}
          WHERE id = ${input.id}
        `));

        return { success: true };
      } catch (error) {
        console.error("[Newsletters] update error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Update failed" };
      }
    }),

  /**
   * Admin: Get subscription analytics for a newsletter
   */
  getAnalytics: protectedProcedure
    .input(z.object({
      newsletterId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const db = await getDb();
        if (!db) return { success: false, analytics: null };

        const result = await db.execute(sql`
          SELECT
            COUNT(CASE WHEN status = 'subscribed' THEN 1 END) as activeSubscribers,
            COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END) as unsubscribed,
            COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
            COUNT(DISTINCT source) as sources
          FROM newsletter_subscriptions
          WHERE newsletterId = ${input.newsletterId}
        `);

        const rows = (result as any)[0] as Array<any>;
        return {
          success: true,
          analytics: rows[0] || null,
        };
      } catch (error) {
        console.error("[Newsletters] getAnalytics error:", error);
        return { success: false, analytics: null };
      }
    }),
});
