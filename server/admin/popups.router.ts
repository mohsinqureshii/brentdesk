/**
 * Popups Admin Router
 * Manage popups and banners with scheduling and targeting
 */

import { z } from "zod";
import { eq, desc, and, gte, lte, or, isNull } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { popups } from "../../drizzle/schema";

// ============================================================
// POPUPS ADMIN ROUTER
// ============================================================

export const popupsRouter = router({
  /**
   * Get active popups for a page (public - for frontend)
   */
  getActive: publicProcedure
    .input(z.object({
      pageUrl: z.string(),
      deviceType: z.enum(["desktop", "mobile", "tablet"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      // Get all active popups
      const allPopups = await db.select()
        .from(popups)
        .where(eq(popups.isActive, 1))
        .orderBy(desc(popups.createdAt));

      // Filter by schedule and targeting
      return allPopups.filter(popup => {
        // Check schedule
        if (popup.startDate && now < new Date(popup.startDate)) return false;
        if (popup.endDate && now > new Date(popup.endDate)) return false;

        // Check page targeting
        const targetPages = popup.pageTargeting as string[] | null;
        if (targetPages && targetPages.length > 0) {
          const matches = targetPages.some(pattern => {
            if (pattern === "*") return true;
            if (pattern.endsWith("*")) {
              return input.pageUrl.startsWith(pattern.slice(0, -1));
            }
            return input.pageUrl === pattern;
          });
          if (!matches) return false;
        }

        // Device targeting not in schema, skip

        return true;
      });
    }),

  /**
   * List all popups (admin)
   */
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["popup", "banner", "toast", "slide_in"]).optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const conditions = [];
      if (input?.type) conditions.push(eq(popups.type, input.type));
      if (input?.isActive !== undefined) conditions.push(eq(popups.isActive, input.isActive as any));

      return db.select()
        .from(popups)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(popups.createdAt));
    }),

  /**
   * Get single popup
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(popups)
        .where(eq(popups.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Create a popup
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      type: z.enum(["popup", "banner", "toast", "slide_in"]),
      title: z.string().optional(),
      content: z.string().optional(),
      ctaText: z.string().optional(),
      ctaUrl: z.string().optional(),
      imageId: z.number().optional(),
      position: z.enum(["center", "top", "bottom", "top_left", "top_right", "bottom_left", "bottom_right"]).optional(),
      triggerType: z.enum(["immediate", "delay", "scroll", "exit_intent"]).optional(),
      triggerValue: z.number().optional(),
      frequencyCap: z.enum(["always", "once", "once_per_day", "once_per_week", "once_per_session"]).optional(),
      pageTargeting: z.array(z.string()).optional(),
      isActive: z.boolean().default(true),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.insert(popups).values({
        name: input.name,
        type: input.type,
        title: input.title,
        content: input.content,
        ctaText: input.ctaText,
        ctaUrl: input.ctaUrl,
        imageId: input.imageId,
        position: input.position || "center",
        triggerType: input.triggerType || "immediate",
        triggerValue: input.triggerValue,
        frequencyCap: input.frequencyCap || "once_per_day",
        pageTargeting: input.pageTargeting,
        isActive: (input.isActive ? 1 : 0),
        startDate: input.startDate,
        endDate: input.endDate,
      } as any);

      const inserted = await db.select()
        .from(popups)
        .where(eq(popups.name, input.name))
        .orderBy(desc(popups.createdAt))
        .limit(1);

      return inserted[0];
    }),

  /**
   * Update a popup
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["popup", "banner", "toast", "slide_in"]).optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      ctaText: z.string().optional(),
      ctaUrl: z.string().optional(),
      imageId: z.number().optional(),
      position: z.enum(["center", "top", "bottom", "top_left", "top_right", "bottom_left", "bottom_right"]).optional(),
      triggerType: z.enum(["immediate", "delay", "scroll", "exit_intent"]).optional(),
      triggerValue: z.number().optional(),
      frequencyCap: z.enum(["always", "once", "once_per_day", "once_per_week", "once_per_session"]).optional(),
      pageTargeting: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, pageTargeting, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (pageTargeting) {
        updateData.pageTargeting = pageTargeting;
      }
      await db.update(popups)
        .set(updateData as any)
        .where(eq(popups.id, id));

      return { success: true };
    }),

  /**
   * Delete a popup
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(popups).where(eq(popups.id, input.id));
      return { success: true };
    }),

  /**
   * Toggle popup active status
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const popup = await db.select()
        .from(popups)
        .where(eq(popups.id, input.id))
        .limit(1);

      if (!popup[0]) throw new Error("Popup not found");

      await db.update(popups)
        .set({ isActive: !popup[0].isActive } as any)
        .where(eq(popups.id, input.id));

      return { success: true, isActive: !popup[0].isActive };
    }),

  /**
   * Duplicate a popup
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const original = await db.select()
        .from(popups)
        .where(eq(popups.id, input.id))
        .limit(1);

      if (!original[0]) throw new Error("Popup not found");

      await db.insert(popups).values({
        name: `${original[0].name} (Copy)`,
        type: original[0].type,
        title: original[0].title,
        content: original[0].content,
        ctaText: original[0].ctaText,
        ctaUrl: original[0].ctaUrl,
        imageId: original[0].imageId,
        position: original[0].position,
        triggerType: original[0].triggerType,
        triggerValue: original[0].triggerValue,
        frequencyCap: original[0].frequencyCap,
        pageTargeting: original[0].pageTargeting,
        isActive: 0,
      } as any);

      return { success: true };
    }),

  /**
   * Track popup impression
   */
  trackImpression: publicProcedure
    .input(z.object({ popupId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const popup = await db.select({ viewCount: popups.viewCount })
        .from(popups)
        .where(eq(popups.id, input.popupId))
        .limit(1);

      if (popup[0]) {
        await db.update(popups)
          .set({ viewCount: (popup[0].viewCount || 0) + 1 } as any)
          .where(eq(popups.id, input.popupId));
      }

      return { success: true };
    }),

  /**
   * Track popup click
   */
  trackClick: publicProcedure
    .input(z.object({ popupId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const popup = await db.select({ clickCount: popups.clickCount })
        .from(popups)
        .where(eq(popups.id, input.popupId))
        .limit(1);

      if (popup[0]) {
        await db.update(popups)
          .set({ clickCount: (popup[0].clickCount || 0) + 1 } as any)
          .where(eq(popups.id, input.popupId));
      }

      return { success: true };
    }),

  /**
   * Get popup analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const popup = await db.select()
        .from(popups)
        .where(eq(popups.id, input.id))
        .limit(1);

      if (!popup[0]) return null;

      const impressions = popup[0].viewCount || 0;
      const clicks = popup[0].clickCount || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        impressions,
        clicks,
        ctr: ctr.toFixed(2),
      };
    }),
});
