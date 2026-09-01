/**
 * WordPress Import Admin Router
 * Import content from WordPress exports
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  wpMigrationLog,
  articles,
  categories,
  tags,
  redirects,
} from "../../drizzle/schema";
import { slugService } from "../services/slug.service";
import { workflowService } from "../services/workflow.service";

// ============================================================
// WP IMPORT ADMIN ROUTER
// ============================================================

export const wpImportRouter = router({
  /**
   * Get migration status
   */
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can access migration tools");
      }

      const logs = await db.select()
        .from(wpMigrationLog)
        .orderBy(desc(wpMigrationLog.migratedAt))
        .limit(100);

      // Calculate stats
      const stats = {
        posts: { total: 0, success: 0, failed: 0 },
        categories: { total: 0, success: 0, failed: 0 },
        tags: { total: 0, success: 0, failed: 0 },
        authors: { total: 0, success: 0, failed: 0 },
        media: { total: 0, success: 0, failed: 0 },
      };

      for (const log of logs) {
        const type = log.wpPostType as keyof typeof stats;
        if (stats[type]) {
          stats[type].total++;
          if (log.status === "success") stats[type].success++;
          if (log.status === "failed") stats[type].failed++;
        }
      }

      return { logs, stats };
    }),

  /**
   * Import posts from WordPress XML
   */
  importPosts: protectedProcedure
    .input(z.object({
      posts: z.array(z.object({
        wpId: z.number(),
        title: z.string(),
        slug: z.string(),
        content: z.string(),
        excerpt: z.string().optional(),
        status: z.string(),
        publishedAt: z.date().optional(),
        authorId: z.number().optional(),
        categoryIds: z.array(z.number()).optional(),
        tagIds: z.array(z.number()).optional(),
        featuredImage: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can import content");
      }

      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Get initial status
      const initialStatus = await workflowService.getInitialStatus("editorial");
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");

      for (const post of input.posts) {
        try {
          // Check if already imported
          const existing = await db.select()
            .from(wpMigrationLog)
            .where(eq(wpMigrationLog.wpPostId, post.wpId))
            .limit(1);

          if (existing[0]) {
            results.skipped++;
            continue;
          }

          // Generate unique slug
          const slug = await slugService.generateUniqueSlug("article", post.slug);

          // Determine status
          const statusId = post.status === "publish" && publishedStatus
            ? publishedStatus.id
            : initialStatus?.id || 1;

          // Create article
          await db.insert(articles).values({
            title: post.title,
            slug,
            content: post.content,
            excerpt: post.excerpt,
            statusId,
            authorId: ctx.user.id,
            publishedAt: post.publishedAt,
            wpOriginalId: post.wpId,
            wpOriginalUrl: `/${post.slug}`,
          } as any);

          // Get inserted article
          const inserted = await db.select()
            .from(articles)
            .where(eq(articles.slug, slug))
            .limit(1);

          const oldUrl = `/${post.slug}`;
          const newUrl = `/news/${slug}`;

          // Create redirect from old URL
          if (post.slug !== slug) {
            await db.insert(redirects).values({
              fromPath: oldUrl,
              toPath: newUrl,
              statusCode: 301,
              isActive: 1,
            } as any);
          }

          // Log migration
          await db.insert(wpMigrationLog).values({
            wpPostId: post.wpId,
            wpPostType: "post",
            wpUrl: oldUrl,
            newEntityType: "article",
            newEntityId: inserted[0]?.id || 0,
            newUrl: newUrl,
            status: "success",
          } as any);

          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Post ${post.wpId}: ${error instanceof Error ? error.message : "Unknown error"}`);

          // Log failure
          await db.insert(wpMigrationLog).values({
            wpPostId: post.wpId,
            wpPostType: "post",
            wpUrl: `/${post.slug}`,
            newEntityType: "article",
            newEntityId: 0,
            newUrl: "",
            status: "failed",
            notes: error instanceof Error ? error.message : "Unknown error",
          } as any);
        }
      }

      return results;
    }),

  /**
   * Import categories from WordPress
   */
  importCategories: protectedProcedure
    .input(z.object({
      categories: z.array(z.object({
        wpId: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        parentWpId: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can import content");
      }

      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      // First pass: create all categories
      const wpIdToNewId = new Map<number, number>();

      for (const cat of input.categories) {
        try {
          const existing = await db.select()
            .from(categories)
            .where(eq(categories.slug, cat.slug))
            .limit(1);

          if (existing[0]) {
            wpIdToNewId.set(cat.wpId, existing[0].id);
            results.skipped++;
            continue;
          }

          await db.insert(categories).values({
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            module: "news",
            isActive: 1,
          } as any);

          const inserted = await db.select()
            .from(categories)
            .where(eq(categories.slug, cat.slug))
            .limit(1);

          if (inserted[0]) {
            wpIdToNewId.set(cat.wpId, inserted[0].id);
          }

          // Log migration
          await db.insert(wpMigrationLog).values({
            wpPostId: cat.wpId,
            wpPostType: "category",
            wpUrl: `/category/${cat.slug}`,
            newEntityType: "category",
            newEntityId: inserted[0]?.id || 0,
            newUrl: `/category/${cat.slug}`,
            status: "success",
          } as any);

          results.imported++;
        } catch (error) {
          results.failed++;
        }
      }

      // Second pass: update parent relationships
      for (const cat of input.categories) {
        if (cat.parentWpId) {
          const newId = wpIdToNewId.get(cat.wpId);
          const parentId = wpIdToNewId.get(cat.parentWpId);

          if (newId && parentId) {
            await db.update(categories)
              .set({ parentId } as any)
              .where(eq(categories.id, newId));
          }
        }
      }

      return results;
    }),

  /**
   * Import tags from WordPress
   */
  importTags: protectedProcedure
    .input(z.object({
      tags: z.array(z.object({
        wpId: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can import content");
      }

      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      for (const tag of input.tags) {
        try {
          const existing = await db.select()
            .from(tags)
            .where(eq(tags.slug, tag.slug))
            .limit(1);

          if (existing[0]) {
            results.skipped++;
            continue;
          }

          await db.insert(tags).values({
            name: tag.name,
            slug: tag.slug,
            description: tag.description,
          } as any);

          const inserted = await db.select()
            .from(tags)
            .where(eq(tags.slug, tag.slug))
            .limit(1);

          // Log migration
          await db.insert(wpMigrationLog).values({
            wpPostId: tag.wpId,
            wpPostType: "tag",
            wpUrl: `/tag/${tag.slug}`,
            newEntityType: "tag",
            newEntityId: inserted[0]?.id || 0,
            newUrl: `/tag/${tag.slug}`,
            status: "success",
          } as any);

          results.imported++;
        } catch (error) {
          results.failed++;
        }
      }

      return results;
    }),

  /**
   * Generate URL parity report
   */
  generateParityReport: protectedProcedure
    .input(z.object({
      wpUrls: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can generate reports");
      }

      // Check each URL against redirects and content
      const report = {
        matched: [] as string[],
        redirected: [] as { from: string; to: string }[],
        missing: [] as string[],
      };

      for (const url of input.wpUrls) {
        // Check if there's a redirect
        const redirect = await db.select()
          .from(redirects)
          .where(eq(redirects.fromPath, url))
          .limit(1);

        if (redirect[0]) {
          report.redirected.push({ from: url, to: redirect[0].toPath });
          continue;
        }

        // Check migration log
        const migration = await db.select()
          .from(wpMigrationLog)
          .where(eq(wpMigrationLog.wpUrl, url))
          .limit(1);

        if (migration[0] && migration[0].status === "success") {
          report.matched.push(url);
        } else {
          report.missing.push(url);
        }
      }

      return report;
    }),

  /**
   * Clear migration log
   */
  clearLog: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can clear migration log");
      }

      // Note: Would need a proper delete all implementation
      return { success: true };
    }),

  /**
   * Rollback migration
   */
  rollback: protectedProcedure
    .input(z.object({
      wpType: z.enum(["post", "category", "tag", "author", "media"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can rollback migrations");
      }

      // Get all successful migrations of this type
      const migrations = await db.select()
        .from(wpMigrationLog)
        .where(eq(wpMigrationLog.wpPostType, input.wpType));

      let rolledBack = 0;

      for (const migration of migrations) {
        if (migration.newEntityId && migration.status === "success") {
          // Delete the imported entity based on type
          if (input.wpType === "post" && migration.newEntityType === "article") {
            await db.delete(articles).where(eq(articles.id, migration.newEntityId));
            rolledBack++;
          } else if (input.wpType === "category") {
            await db.delete(categories).where(eq(categories.id, migration.newEntityId));
            rolledBack++;
          } else if (input.wpType === "tag") {
            await db.delete(tags).where(eq(tags.id, migration.newEntityId));
            rolledBack++;
          }

          // Update migration log - mark as failed since rolled_back not in enum
          await db.update(wpMigrationLog)
            .set({ status: "failed", notes: "Rolled back" } as any)
            .where(eq(wpMigrationLog.id, migration.id));
        }
      }

      return { rolledBack };
    }),
});
