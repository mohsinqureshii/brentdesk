/**
 * Bookmarks / Saved Items Router
 * Allows users to bookmark articles, jobs, and events for later reading
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { bookmarks } from "../../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const bookmarksRouter = router({
  // Add a bookmark
  add: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "event", "company", "person", "investor", "accelerator"]),
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

      // Check if already bookmarked
      const [existing] = await database
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, ctx.user.id),
          eq(bookmarks.contentType, input.contentType),
          eq(bookmarks.contentId, input.contentId)
        ))
        .limit(1);

      if (existing) {
        return { success: true, bookmarkId: existing.id, alreadyExists: true };
      }

      const [result] = await database.insert(bookmarks).values({
        userId: ctx.user.id,
        contentType: input.contentType,
        contentId: input.contentId,
        contentTitle: input.contentTitle || null,
        contentSlug: input.contentSlug || null,
        contentCategory: input.contentCategory || null,
        contentImageUrl: input.contentImageUrl || null,
      } as any);

      return { success: true, bookmarkId: result.insertId, alreadyExists: false };
    }),

  // Remove a bookmark
  remove: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "event", "company", "person", "investor", "accelerator"]),
      contentId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database
        .delete(bookmarks)
        .where(and(
          eq(bookmarks.userId, ctx.user.id),
          eq(bookmarks.contentType, input.contentType),
          eq(bookmarks.contentId, input.contentId)
        ));

      return { success: true };
    }),

  // Toggle a bookmark (add if not exists, remove if exists)
  toggle: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "event", "company", "person", "investor", "accelerator"]),
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

      // Check if already bookmarked
      const [existing] = await database
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, ctx.user.id),
          eq(bookmarks.contentType, input.contentType),
          eq(bookmarks.contentId, input.contentId)
        ))
        .limit(1);

      if (existing) {
        // Remove bookmark
        await database
          .delete(bookmarks)
          .where(eq(bookmarks.id, existing.id));
        return { bookmarked: false };
      } else {
        // Add bookmark
        await database.insert(bookmarks).values({
          userId: ctx.user.id,
          contentType: input.contentType,
          contentId: input.contentId,
          contentTitle: input.contentTitle || null,
          contentSlug: input.contentSlug || null,
          contentCategory: input.contentCategory || null,
          contentImageUrl: input.contentImageUrl || null,
        } as any);
        return { bookmarked: true };
      }
    }),

  // Check if a specific item is bookmarked
  check: protectedProcedure
    .input(z.object({
      contentType: z.enum(["article", "job", "event", "company", "person", "investor", "accelerator"]),
      contentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        return { bookmarked: false };
      }

      const database = await getDb();
      if (!database) return { bookmarked: false };

      const [existing] = await database
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, ctx.user.id),
          eq(bookmarks.contentType, input.contentType),
          eq(bookmarks.contentId, input.contentId)
        ))
        .limit(1);

      return { bookmarked: !!existing };
    }),

  // List all bookmarks for the current user with optional type filter
  list: protectedProcedure
    .input(z.object({
      contentType: z.enum(["all", "article", "job", "event", "company", "person", "investor", "accelerator"]).optional().default("all"),
      page: z.number().min(1).optional().default(1),
      limit: z.number().min(1).max(50).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.limit;

      // Build where conditions
      const conditions = [eq(bookmarks.userId, ctx.user.id)];
      if (input.contentType !== "all") {
        conditions.push(eq(bookmarks.contentType, input.contentType));
      }

      const items = await database
        .select()
        .from(bookmarks)
        .where(and(...conditions))
        .orderBy(desc(bookmarks.createdAt))
        .limit(input.limit)
        .offset(offset);

      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`count(*)` })
        .from(bookmarks)
        .where(and(...conditions));

      // Get counts by type
      const typeCounts = await database
        .select({
          contentType: bookmarks.contentType,
          count: sql<number>`count(*)`,
        })
        .from(bookmarks)
        .where(eq(bookmarks.userId, ctx.user.id))
        .groupBy(bookmarks.contentType);

      const counts: Record<string, number> = {
        all: 0,
        article: 0,
        job: 0,
        event: 0,
        company: 0,
        person: 0,
        investor: 0,
        accelerator: 0,
      };
      typeCounts.forEach((tc) => {
        counts[tc.contentType as keyof typeof counts] = Number(tc.count);
        counts.all += Number(tc.count);
      });

      return {
        items,
        total: Number(countResult?.count || 0),
        counts,
        page: input.page,
        totalPages: Math.ceil(Number(countResult?.count || 0) / input.limit),
      };
    }),
});
