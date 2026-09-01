/**
 * Homepage Admin Router
 * Manage CMS-driven homepage content blocks
 */

import { z } from "zod";
import { eq, asc, and, gte, lte, or, isNull } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { homepageBlocks, homepageSections, articles, categories, media } from "../../drizzle/schema";
import { workflowService } from "../services/workflow.service";
import { desc, sql } from "drizzle-orm";

// ============================================================
// HOMEPAGE ADMIN ROUTER
// ============================================================

export const homepageRouter = router({
  /**
   * Get all homepage blocks (public - for frontend rendering)
   */
  getBlocks: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      // Get active blocks that are either:
      // 1. Not scheduled (no start/end date)
      // 2. Within their scheduled period
      const blocks = await db.select()
        .from(homepageBlocks)
        .where(eq(homepageBlocks.isActive, 1))
        .orderBy(asc(homepageBlocks.sortOrder));

      // Filter by schedule
      return blocks.filter(block => {
        if (!block.startDate && !block.endDate) return true;
        if (block.startDate && now < new Date(block.startDate)) return false;
        if (block.endDate && now > new Date(block.endDate)) return false;
        return true;
      });
    }),

  /**
   * Get all homepage blocks (admin - includes inactive)
   */
  adminList: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      return db.select()
        .from(homepageBlocks)
        .orderBy(asc(homepageBlocks.sortOrder));
    }),

  /**
   * Get single block
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(homepageBlocks)
        .where(eq(homepageBlocks.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Create a homepage block
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slug: z.string().min(1).max(128),
      type: z.string(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      sortOrder: z.number().optional(),
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

      // Get max sort order
      const existing = await db.select()
        .from(homepageBlocks)
        .orderBy(asc(homepageBlocks.sortOrder));
      
      const maxOrder = existing.length > 0 
        ? Math.max(...existing.map(b => b.sortOrder || 0)) 
        : 0;

      await db.insert(homepageBlocks).values({
        name: input.name,
        slug: input.slug,
        type: input.type,
        title: input.title,
        subtitle: input.subtitle,
        config: input.config,
        sortOrder: input.sortOrder ?? maxOrder + 1,
        isActive: (input.isActive ? 1 : 0),
        startDate: input.startDate,
        endDate: input.endDate,
      } as any);

      const inserted = await db.select()
        .from(homepageBlocks)
        .where(eq(homepageBlocks.slug, input.slug))
        .limit(1);

      return inserted[0];
    }),

  /**
   * Update a homepage block
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
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

      const { id, ...updateData } = input;
      await db.update(homepageBlocks)
        .set(updateData as any)
        .where(eq(homepageBlocks.id, id));

      return { success: true };
    }),

  /**
   * Delete a homepage block
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(homepageBlocks).where(eq(homepageBlocks.id, input.id));
      return { success: true };
    }),

  /**
   * Reorder homepage blocks
   */
  reorder: protectedProcedure
    .input(z.object({
      blockIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Update sort order based on array position
      for (let i = 0; i < input.blockIds.length; i++) {
        await db.update(homepageBlocks)
          .set({ sortOrder: i } as any)
          .where(eq(homepageBlocks.id, input.blockIds[i]));
      }

      return { success: true };
    }),

  /**
   * Toggle block active status
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const block = await db.select()
        .from(homepageBlocks)
        .where(eq(homepageBlocks.id, input.id))
        .limit(1);

      if (!block[0]) throw new Error("Block not found");

      await db.update(homepageBlocks)
        .set({ isActive: block[0].isActive ? 0 : 1 } as any)
        .where(eq(homepageBlocks.id, input.id));

      return { success: true, isActive: !block[0].isActive };
    }),

  /**
   * Duplicate a block
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
        .from(homepageBlocks)
        .where(eq(homepageBlocks.id, input.id))
        .limit(1);

      if (!original[0]) throw new Error("Block not found");

      const newSlug = `${original[0].slug}-copy-${Date.now()}`;

      await db.insert(homepageBlocks).values({
        name: `${original[0].name} (Copy)`,
        slug: newSlug,
        type: original[0].type,
        title: original[0].title,
        subtitle: original[0].subtitle,
        config: original[0].config,
        sortOrder: (original[0].sortOrder || 0) + 1,
        isActive: 0,
      } as any);

      const inserted = await db.select()
        .from(homepageBlocks)
        .where(eq(homepageBlocks.slug, newSlug))
        .limit(1);

      return inserted[0];
    }),

  /**
   * Get active campaigns
   */
  getCampaigns: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get blocks with scheduled dates (campaign blocks)
      return db.select()
        .from(homepageBlocks)
        .where(and(
          eq(homepageBlocks.isActive, 1),
          // Filter blocks that have start/end dates set
        ))
        .orderBy(asc(homepageBlocks.startDate));
    }),

  // ============================================================
  // HOMEPAGE SECTIONS (Category-based news sections)
  // ============================================================

  /**
   * Get all active sections with category info (public - for frontend rendering)
   */
  getSections: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const sections = await db.select({
        id: homepageSections.id,
        name: homepageSections.name,
        slug: homepageSections.slug,
        sectionType: homepageSections.sectionType,
        categoryId: homepageSections.categoryId,
        accentColor: homepageSections.accentColor,
        icon: homepageSections.icon,
        articleCount: homepageSections.articleCount,
        layout: homepageSections.layout,
        showImage: homepageSections.showImage,
        showExcerpt: homepageSections.showExcerpt,
        showDate: homepageSections.showDate,
        showAuthor: homepageSections.showAuthor,
        showViewMore: homepageSections.showViewMore,
        viewMoreUrl: homepageSections.viewMoreUrl,
        sortOrder: homepageSections.sortOrder,
        isActive: homepageSections.isActive,
        position: homepageSections.position,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
        .from(homepageSections)
        .leftJoin(categories, eq(homepageSections.categoryId, categories.id))
        .where(eq(homepageSections.isActive, 1))
        .orderBy(asc(homepageSections.sortOrder));

      return sections;
    }),

  /**
   * Get articles for a specific section
   */
  getSectionArticles: publicProcedure
    .input(z.object({
      sectionId: z.number(),
      limit: z.number().optional().default(4),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get section config
      const section = await db.select()
        .from(homepageSections)
        .where(eq(homepageSections.id, input.sectionId))
        .limit(1);

      if (!section[0]) return [];

      const limit = input.limit || section[0].articleCount || 4;
      const categoryId = section[0].categoryId;

      // Resolve the published status by slug — status ids are seeded per
      // environment and must never be hardcoded (the old literal 6 pointed
      // at a different status on freshly-provisioned databases).
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      // Build query based on section type
      let query = db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        publishedAt: articles.publishedAt,
        viewCount: articles.viewCount,
        categoryId: articles.primaryCategoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        featuredImageUrl: media.url,
      })
        .from(articles)
        .leftJoin(categories, eq(articles.primaryCategoryId, categories.id))
        .leftJoin(media, eq(articles.featuredImageId, media.id))
        .where(and(
          eq(articles.statusId, publishedStatus.id),
          categoryId ? eq(articles.primaryCategoryId, categoryId) : sql`1=1`
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

      return query;
    }),

  /**
   * Admin: List all sections
   */
  adminListSections: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const sections = await db.select({
        id: homepageSections.id,
        name: homepageSections.name,
        slug: homepageSections.slug,
        sectionType: homepageSections.sectionType,
        categoryId: homepageSections.categoryId,
        accentColor: homepageSections.accentColor,
        icon: homepageSections.icon,
        articleCount: homepageSections.articleCount,
        layout: homepageSections.layout,
        showImage: homepageSections.showImage,
        showExcerpt: homepageSections.showExcerpt,
        showDate: homepageSections.showDate,
        showAuthor: homepageSections.showAuthor,
        showViewMore: homepageSections.showViewMore,
        viewMoreUrl: homepageSections.viewMoreUrl,
        sortOrder: homepageSections.sortOrder,
        isActive: homepageSections.isActive,
        position: homepageSections.position,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
        .from(homepageSections)
        .leftJoin(categories, eq(homepageSections.categoryId, categories.id))
        .orderBy(asc(homepageSections.sortOrder));

      return sections;
    }),

  /**
   * Admin: Create a section
   */
  createSection: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slug: z.string().min(1).max(128),
      sectionType: z.enum(["hero", "trending", "headlines", "category", "in_brief", "podcasts", "videos", "stocks", "sidebar_jobs", "sidebar_events", "sidebar_links", "sidebar_podcast"]).default("category"),
      categoryId: z.number().optional(),
      accentColor: z.string().optional(),
      icon: z.string().optional(),
      articleCount: z.number().optional(),
      layout: z.enum(["featured_grid", "two_column", "list", "horizontal_scroll", "compact"]).optional(),
      showImage: z.boolean().optional(),
      showExcerpt: z.boolean().optional(),
      showDate: z.boolean().optional(),
      showAuthor: z.boolean().optional(),
      showViewMore: z.boolean().optional(),
      viewMoreUrl: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().default(true),
      position: z.enum(["main", "sidebar"]).default("main"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get max sort order
      const existing = await db.select()
        .from(homepageSections)
        .orderBy(asc(homepageSections.sortOrder));
      
      const maxOrder = existing.length > 0 
        ? Math.max(...existing.map(s => s.sortOrder || 0)) 
        : 0;

      await db.insert(homepageSections).values({
        name: input.name,
        slug: input.slug,
        sectionType: input.sectionType,
        categoryId: input.categoryId,
        accentColor: input.accentColor,
        icon: input.icon,
        articleCount: input.articleCount,
        layout: input.layout,
        showImage: input.showImage,
        showExcerpt: input.showExcerpt,
        showDate: input.showDate,
        showAuthor: input.showAuthor,
        showViewMore: input.showViewMore,
        viewMoreUrl: input.viewMoreUrl,
        sortOrder: input.sortOrder ?? maxOrder + 1,
        isActive: (input.isActive ? 1 : 0),
        position: input.position,
      } as any);

      return { success: true };
    }),

  /**
   * Admin: Update a section
   */
  updateSection: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      sectionType: z.enum(["hero", "trending", "headlines", "category", "in_brief", "podcasts", "videos", "stocks", "sidebar_jobs", "sidebar_events", "sidebar_links", "sidebar_podcast"]).optional(),
      categoryId: z.number().nullable().optional(),
      accentColor: z.string().optional(),
      icon: z.string().optional(),
      articleCount: z.number().optional(),
      layout: z.enum(["featured_grid", "two_column", "list", "horizontal_scroll", "compact"]).optional(),
      showImage: z.boolean().optional(),
      showExcerpt: z.boolean().optional(),
      showDate: z.boolean().optional(),
      showAuthor: z.boolean().optional(),
      showViewMore: z.boolean().optional(),
      viewMoreUrl: z.string().optional(),
      isActive: z.boolean().optional(),
      position: z.enum(["main", "sidebar"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, ...updateData } = input;
      await db.update(homepageSections)
        .set(updateData as any)
        .where(eq(homepageSections.id, id));

      return { success: true };
    }),

  /**
   * Admin: Delete a section
   */
  deleteSection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(homepageSections).where(eq(homepageSections.id, input.id));
      return { success: true };
    }),

  /**
   * Admin: Reorder sections
   */
  reorderSections: protectedProcedure
    .input(z.object({
      sectionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      for (let i = 0; i < input.sectionIds.length; i++) {
        await db.update(homepageSections)
          .set({ sortOrder: i } as any)
          .where(eq(homepageSections.id, input.sectionIds[i]));
      }

      return { success: true };
    }),

  /**
   * Admin: Toggle section active status
   */
  toggleSectionActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const section = await db.select()
        .from(homepageSections)
        .where(eq(homepageSections.id, input.id))
        .limit(1);

      if (!section[0]) throw new Error("Section not found");

      await db.update(homepageSections)
        .set({ isActive: !section[0].isActive } as any)
        .where(eq(homepageSections.id, input.id));

      return { success: true, isActive: !section[0].isActive };
    }),
});
