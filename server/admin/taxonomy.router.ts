/**
 * Taxonomy Admin Router
 * Manage categories, tags, topics, regions, sectors
 */

import { z } from "zod";
import { eq, desc, asc, like, and, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  categories, 
  tags, 
  topics, 
  regions, 
  sectors,
  keywords,
  articleCategories,
  articles,
  workflowStatuses
} from "../../drizzle/schema";
import { slugService } from "../services/slug.service";

// ============================================================
// CATEGORIES
// ============================================================

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.number().optional(),
  module: z.enum(["news", "jobs", "events", "resources", "research"]),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// TAXONOMY ROUTER
// ============================================================

export const taxonomyRouter = router({
  // --------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------
  categories: router({
    list: protectedProcedure
      .input(z.object({
        module: z.enum(["news", "jobs", "events", "resources", "research"]).optional(),
        search: z.string().optional(),
        parentId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const conditions = [];
        if (input?.module) conditions.push(eq(categories.module, input.module));
        if (input?.search) conditions.push(sql`LOWER(${categories.name}) LIKE LOWER(${`%${input.search}%`})`);
        if (input?.parentId !== undefined) {
          conditions.push(eq(categories.parentId, input.parentId));
        }

        const categoryList = await db.select()
          .from(categories)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(categories.sortOrder), asc(categories.name));

        // Get article counts for each category (only for news module)
        if (input?.module === "news" || !input?.module) {
          // Get published status
          const [publishedStatus] = await db
            .select({ id: workflowStatuses.id })
            .from(workflowStatuses)
            .where(eq(workflowStatuses.slug, "published"))
            .limit(1);

          if (publishedStatus) {
            const enrichedCategories = await Promise.all(
              categoryList.map(async (cat) => {
                const [countResult] = await db
                  .select({ count: sql<number>`count(DISTINCT ${articles.id})` })
                  .from(articleCategories)
                  .innerJoin(articles, eq(articleCategories.articleId, articles.id))
                  .where(
                    and(
                      eq(articleCategories.categoryId, cat.id),
                      eq(articles.statusId, publishedStatus.id)
                    )
                  );
                return {
                  ...cat,
                  articleCount: countResult?.count || 0,
                };
              })
            );
            return enrichedCategories;
          }
        }

        return categoryList.map(cat => ({ ...cat, articleCount: 0 }));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.select()
          .from(categories)
          .where(eq(categories.id, input.id))
          .limit(1);

        return result[0] || null;
      }),

    create: protectedProcedure
      .input(categorySchema)
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(categories).values({
          name: input.name,
          slug,
          description: input.description,
          parentId: input.parentId,
          module: input.module,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ? 1 : 0,
        } as any);

        const inserted = await db.select()
          .from(categories)
          .where(eq(categories.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    update: protectedProcedure
      .input(categorySchema.partial().extend({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { id, ...updateData } = input;
        await db.update(categories)
          .set(updateData as any)
          .where(eq(categories.id, id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(categories).where(eq(categories.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // TAGS
  // --------------------------------------------------------
  tags: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input?.search) {
          return db.select()
            .from(tags)
            .where(sql`LOWER(${tags.name}) LIKE LOWER(${`%${input.search}%`})`)
            .orderBy(asc(tags.name));
        }

        return db.select().from(tags).orderBy(asc(tags.name));
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(tags).values({
          name: input.name,
          slug,
          description: input.description,
        } as any);

        const inserted = await db.select()
          .from(tags)
          .where(eq(tags.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(tags).where(eq(tags.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // TOPICS
  // --------------------------------------------------------
  topics: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input?.search) {
          return db.select()
            .from(topics)
            .where(sql`LOWER(${topics.name}) LIKE LOWER(${`%${input.search}%`})`)
            .orderBy(asc(topics.name));
        }

        return db.select().from(topics).orderBy(asc(topics.name));
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(topics).values({
          name: input.name,
          slug,
          description: input.description,
        } as any);

        const inserted = await db.select()
          .from(topics)
          .where(eq(topics.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(topics).where(eq(topics.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // REGIONS
  // --------------------------------------------------------
  regions: router({
    list: protectedProcedure
      .input(z.object({ 
        search: z.string().optional(),
        parentId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const conditions = [];
        if (input?.search) conditions.push(sql`LOWER(${regions.name}) LIKE LOWER(${`%${input.search}%`})`);
        if (input?.parentId !== undefined) {
          conditions.push(eq(regions.parentId, input.parentId));
        }

        return db.select()
          .from(regions)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(regions.name));
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().optional(),
        code: z.string().optional(),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(regions).values({
          name: input.name,
          slug,
          code: input.code,
          parentId: input.parentId,
        } as any);

        const inserted = await db.select()
          .from(regions)
          .where(eq(regions.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(regions).where(eq(regions.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // SECTORS
  // --------------------------------------------------------
  sectors: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input?.search) {
          return db.select()
            .from(sectors)
            .where(sql`LOWER(${sectors.name}) LIKE LOWER(${`%${input.search}%`})`)
            .orderBy(asc(sectors.name));
        }

        return db.select().from(sectors).orderBy(asc(sectors.name));
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(sectors).values({
          name: input.name,
          slug,
          description: input.description,
          icon: input.icon,
        } as any);

        const inserted = await db.select()
          .from(sectors)
          .where(eq(sectors.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(sectors).where(eq(sectors.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // KEYWORDS (SEO Focus Keywords)
  // --------------------------------------------------------
  keywords: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input?.search) {
          return db.select()
            .from(keywords)
            .where(sql`LOWER(${keywords.name}) LIKE LOWER(${`%${input.search}%`})`)
            .orderBy(asc(keywords.name));
        }

        return db.select().from(keywords).orderBy(asc(keywords.name));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.select()
          .from(keywords)
          .where(eq(keywords.id, input.id))
          .limit(1);

        return result[0] || null;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const slug = input.slug || slugService.generateCategorySlug(input.name);

        await db.insert(keywords).values({
          name: input.name,
          slug,
          description: input.description,
        } as any);

        const inserted = await db.select()
          .from(keywords)
          .where(eq(keywords.slug, slug))
          .limit(1);

        return inserted[0];
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { id, ...updateData } = input;
        await db.update(keywords)
          .set(updateData as any)
          .where(eq(keywords.id, id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(keywords).where(eq(keywords.id, input.id));
        return { success: true };
      }),
  }),
});
