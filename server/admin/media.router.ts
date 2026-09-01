/**
 * Media Admin Router
 * Manage uploads and media library
 */

import { z } from "zod";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { media } from "../../drizzle/schema";
import { mediaService } from "../services/media.service";
import { altTextService } from "../services/altText.service";

// ============================================================
// MEDIA ADMIN ROUTER
// ============================================================

export const mediaRouter = router({
  /**
   * List all media files
   */
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      mimeType: z.string().optional(),
      folder: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, ...filters } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (filters.search) {
        conditions.push(sql`LOWER(${media.filename}) LIKE LOWER(${`%${filters.search}%`})`);
      }
      if (filters.mimeType) {
        conditions.push(like(media.mimeType, `${filters.mimeType}%`));
      }
      if (filters.folder) {
        conditions.push(eq(media.folder, filters.folder));
      }

      const allMedia = await db.select()
        .from(media)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(media.createdAt));

      const total = allMedia.length;
      const paginatedMedia = allMedia.slice(offset, offset + limit);

      return {
        items: paginatedMedia,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single media file
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Upload a file
   */
  upload: protectedProcedure
    .input(z.object({
      filename: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      folder: z.string().optional(),
      alt: z.string().optional(),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Convert base64 to buffer
      const buffer = Buffer.from(input.base64Data, "base64");

      // Upload using media service
      const result = await mediaService.upload({
        file: buffer,
        filename: input.filename,
        mimeType: input.mimeType,
        folder: input.folder,
        alt: input.alt,
        caption: input.caption,
        uploadedById: ctx.user.id,
      });

      return result;
    }),

  /**
   * Update media metadata
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      alt: z.string().optional(),
      caption: z.string().optional(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;
      await db.update(media)
        .set(updateData as any)
        .where(eq(media.id, id));

      return { success: true };
    }),

  /**
   * Delete a media file
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get the media record
      const mediaRecord = await db.select()
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);

      if (!mediaRecord[0]) {
        throw new Error("Media not found");
      }

      // Delete from database (S3 deletion would need additional implementation)
      await db.delete(media).where(eq(media.id, input.id));

      return { success: true };
    }),

  /**
   * Get folders
   */
  getFolders: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allMedia = await db.select({ folder: media.folder })
        .from(media);

      const folders = Array.from(new Set(allMedia.map(m => m.folder).filter(Boolean)));
      return folders;
    }),

  /**
   * Create folder
   */
  createFolder: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Folders are virtual - they exist when media is assigned to them
      return { success: true, folder: input.name };
    }),

  /**
   * Move media to folder
   */
  moveToFolder: protectedProcedure
    .input(z.object({
      mediaIds: z.array(z.number()),
      folder: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const id of input.mediaIds) {
        await db.update(media)
          .set({ folder: input.folder } as any)
          .where(eq(media.id, id));
      }

      return { success: true };
    }),

  /**
   * Bulk delete media
   */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      for (const id of input.ids) {
        await db.delete(media).where(eq(media.id, id));
      }

      return { success: true, deleted: input.ids.length };
    }),

  /**
   * Generate alt text for an image using AI
   */
  generateAltText: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      context: z.string().optional(),
      existingAlt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await altTextService.generateAltText({
        imageUrl: input.imageUrl,
        context: input.context,
        existingAlt: input.existingAlt,
      });
      return result;
    }),

  /**
   * Generate and save alt text for a media item
   */
  generateAndSaveAltText: protectedProcedure
    .input(z.object({
      mediaId: z.number(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the media item
      const mediaItem = await db.select()
        .from(media)
        .where(eq(media.id, input.mediaId))
        .limit(1);

      if (!mediaItem[0]) {
        throw new Error("Media not found");
      }

      // Generate alt text
      const result = await altTextService.generateAltText({
        imageUrl: mediaItem[0].url,
        context: input.context,
        existingAlt: mediaItem[0].alt || undefined,
      });

      // Update the media record
      await db.update(media)
        .set({
          alt: result.altText,
          caption: result.caption,
        } as any)
        .where(eq(media.id, input.mediaId));

      return {
        ...result,
        mediaId: input.mediaId,
      };
    }),

  /**
   * Batch generate alt text for multiple media items
   */
  batchGenerateAltText: protectedProcedure
    .input(z.object({
      mediaIds: z.array(z.number()),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all media items
      const mediaItems = await db.select()
        .from(media)
        .where(eq(media.id, input.mediaIds[0])); // We'll filter in memory

      const allMedia = await db.select().from(media);
      const targetMedia = allMedia.filter(m => input.mediaIds.includes(m.id));

      if (targetMedia.length === 0) {
        throw new Error("No media items found");
      }

      // Generate alt text for each
      const images = targetMedia.map(m => ({
        id: m.id,
        url: m.url,
        context: input.context,
      }));

      const results = await altTextService.generateBatchAltText(images);

      // Update each media record
      const entries = Array.from(results.entries());
      for (const [id, result] of entries) {
        await db.update(media)
          .set({
            alt: result.altText,
            caption: result.caption,
          } as any)
          .where(eq(media.id, id));
      }

      return {
        processed: results.size,
        results: Array.from(results.entries()).map(([id, result]) => ({
          mediaId: id,
          ...result,
        })),
      };
    }),

  /**
   * Get media items missing alt text
   */
  getMissingAltText: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit } = input;
      const offset = (page - 1) * limit;

      // Get images without alt text
      const allMedia = await db.select()
        .from(media)
        .where(like(media.mimeType, "image/%"))
        .orderBy(desc(media.createdAt));

      const missingAlt = allMedia.filter(m => !m.alt || m.alt.trim() === "");
      const total = missingAlt.length;
      const paginatedMedia = missingAlt.slice(offset, offset + limit);

      return {
        items: paginatedMedia,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get media stats
   */
  getStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allMedia = await db.select()
        .from(media);

      const totalSize = allMedia.reduce((sum, m) => sum + (m.size || 0), 0);
      const byType: Record<string, number> = {};

      for (const m of allMedia) {
        const type = m.mimeType?.split("/")[0] || "other";
        byType[type] = (byType[type] || 0) + 1;
      }

      return {
        totalFiles: allMedia.length,
        totalSize,
        byType,
      };
    }),
});
