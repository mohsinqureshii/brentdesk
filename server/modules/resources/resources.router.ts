/**
 * Resources Module Router
 * Templates, perks, tools, playbooks, programs
 */

import { z } from "zod";
import { eq, and, desc, asc, like, sql, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  resources, 
  resourceCategories,
  resourceRegions,
  resourceSectors,
  categories,
  regions,
  sectors,
  workflowStatuses
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";
import { toDbDate } from "../../_core/dbValues";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createResourceSchema = z.object({
  title: z.string().min(1).max(512),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  type: z.enum(["template", "toolkit", "perk", "regulation", "tool", "playbook", "program", "grant", "other"]).optional(),
  featuredImage: z.string().optional(),
  downloadUrl: z.string().optional(),
  externalUrl: z.string().optional(),
  provider: z.string().optional(),
  providerLogo: z.string().optional(),
  providerWebsite: z.string().optional(),
  isFree: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  price: z.string().optional(),
  priceCurrency: z.string().optional(),
  discount: z.string().optional(),
  promoCode: z.string().optional(),
  eligibility: z.string().optional(),
  expiresAt: z.date().optional(),
  categoryIds: z.array(z.number()).optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
});

const updateResourceSchema = createResourceSchema.partial().extend({
  id: z.number(),
});

const listResourcesSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  type: z.enum(["template", "toolkit", "perk", "regulation", "tool", "playbook", "program", "grant", "other"]).optional(),
  status: z.string().optional(),
  categoryId: z.number().optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  isFree: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  sortBy: z.enum(["createdAt", "title", "viewCount", "publishedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================
// RESOURCES ROUTER
// ============================================================

export const resourcesRouter = router({
  /**
   * List published resources (public)
   */
  list: publicProcedure
    .input(listResourcesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      // Build conditions
      const conditions = [eq(resources.statusId, publishedStatus.id)];

      if (filters.search) {
        conditions.push(sql`LOWER(${resources.title}) LIKE LOWER(${`%${filters.search}%`})`);
      }
      if (filters.type) {
        conditions.push(eq(resources.type, filters.type));
      }
      // isFree not in schema - filter removed

      // Build query
      const sortColumnMap = {
        createdAt: resources.createdAt,
        title: resources.title,
        viewCount: resources.viewCount,
        publishedAt: resources.createdAt,
      } as const;
      const sortColumn = sortColumnMap[sortBy] || resources.createdAt;

      const results = await db.select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        shortDescription: resources.shortDescription,
        type: resources.type,
        featuredImage: resources.featuredImage,
        provider: resources.provider,
        providerLogo: resources.providerLogo,
        value: resources.value,
        viewCount: resources.viewCount,
        downloadUrl: resources.downloadUrl,
        externalUrl: resources.externalUrl,
      }).from(resources)
        .where(and(...conditions))
        .orderBy(sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn));

      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        items: paginatedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single resource by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(resources)
        .where(eq(resources.slug, input.slug))
        .limit(1);

      if (!result[0]) return null;

      const resource = result[0];

      // Increment view count
      await db.update(resources)
        .set({ viewCount: (resource.viewCount || 0) + 1 } as any)
        .where(eq(resources.id, resource.id));

      // Get related data
      const resCats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(resourceCategories)
        .innerJoin(categories, eq(resourceCategories.categoryId, categories.id))
        .where(eq(resourceCategories.resourceId, resource.id));

      const resRegs = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(resourceRegions)
        .innerJoin(regions, eq(resourceRegions.regionId, regions.id))
        .where(eq(resourceRegions.resourceId, resource.id));

      const resSecs = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(resourceSectors)
        .innerJoin(sectors, eq(resourceSectors.sectorId, sectors.id))
        .where(eq(resourceSectors.resourceId, resource.id));

      // Get SEO meta
      const seo = await seoService.getSeoMeta("resource", resource.id, resource as Record<string, unknown>);

      return {
        ...resource,
        categories: resCats,
        regions: resRegs,
        sectors: resSecs,
        seo,
      };
    }),

  /**
   * Get resources by type
   */
  getByType: publicProcedure
    .input(z.object({ 
      type: z.enum(["template", "toolkit", "perk", "regulation", "tool", "playbook", "program", "grant", "other"]),
      limit: z.number().default(10) 
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      return db.select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        shortDescription: resources.shortDescription,
        type: resources.type,
        featuredImage: resources.featuredImage,
        provider: resources.provider,
      }).from(resources)
        .where(and(
          eq(resources.statusId, publishedStatus.id),
          eq(resources.type, input.type)
        ))
        .orderBy(desc(resources.createdAt))
        .limit(input.limit);
    }),

  // --------------------------------------------------------
  // ADMIN ENDPOINTS
  // --------------------------------------------------------

  /**
   * Get resource counts by type and status (admin)
   */
  adminCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get counts by type
      const typeCountsResult = await db
        .select({
          type: resources.type,
          count: sql<number>`COUNT(*)`,
        })
        .from(resources)
        .groupBy(resources.type);

      // Get counts by status
      const statusCountsResult = await db
        .select({
          statusSlug: workflowStatuses.slug,
          count: sql<number>`COUNT(${resources.id})`,
        })
        .from(resources)
        .leftJoin(workflowStatuses, eq(resources.statusId, workflowStatuses.id))
        .groupBy(workflowStatuses.slug);

      // Get total
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(resources);

      const typeCounts: Record<string, number> = {};
      for (const row of typeCountsResult) {
        typeCounts[row.type] = row.count;
      }

      const statusCounts: Record<string, number> = {
        total: totalResult[0]?.count || 0,
      };
      for (const row of statusCountsResult) {
        if (row.statusSlug) {
          statusCounts[row.statusSlug] = row.count;
        }
      }

      return { typeCounts, statusCounts };
    }),

  /**
   * List all resources (admin)
   */
  adminList: protectedProcedure
    .input(listResourcesSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { page, limit, search, type, status, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build conditions for server-side filtering
      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${resources.title}) LIKE LOWER(${searchTerm}) OR LOWER(${resources.description}) LIKE LOWER(${searchTerm}) OR LOWER(${resources.provider}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (type) {
        conditions.push(eq(resources.type, type));
      }
      if (status) {
        // Join condition: filter by workflow status slug
        conditions.push(eq(workflowStatuses.slug, status));
      }

      // Determine sort column
      const sortCol = sortBy === 'title' ? resources.title
        : sortBy === 'viewCount' ? resources.viewCount
        : resources.createdAt;
      const orderFn = sortOrder === 'asc' ? asc : desc;

      // Get total count (need to join for status filter)
      const countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(resources)
        .leftJoin(workflowStatuses, eq(resources.statusId, workflowStatuses.id));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const countResult = await (whereClause ? countQuery.where(whereClause) : countQuery);
      
      const total = Number(countResult[0]?.count || 0);

      // Get paginated results with workflow status
      const rawResults = await db
        .select()
        .from(resources)
        .leftJoin(workflowStatuses, eq(resources.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(orderFn(sortCol))
        .limit(limit)
        .offset(offset);

      return {
        items: rawResults.map(row => ({
          ...row.resources,
          status: row.workflow_statuses?.slug || 'draft',
          statusName: row.workflow_statuses?.name || 'Draft',
          statusColor: row.workflow_statuses?.color || '#6B7280',
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single resource by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(resources)
        .where(eq(resources.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const resource = result[0];

      // Get taxonomy IDs
      const catIds = await db.select({ categoryId: resourceCategories.categoryId })
        .from(resourceCategories)
        .where(eq(resourceCategories.resourceId, resource.id));

      const regIds = await db.select({ regionId: resourceRegions.regionId })
        .from(resourceRegions)
        .where(eq(resourceRegions.resourceId, resource.id));

      const secIds = await db.select({ sectorId: resourceSectors.sectorId })
        .from(resourceSectors)
        .where(eq(resourceSectors.resourceId, resource.id));

      // Get workflow info
      const availableTransitions = await workflowService.getAvailableTransitions(
        resource.statusId,
        ctx.user.role
      );

      return {
        ...resource,
        categoryIds: catIds.map(c => c.categoryId),
        regionIds: regIds.map(r => r.regionId),
        sectorIds: secIds.map(s => s.sectorId),
        availableTransitions,
      };
    }),

  /**
   * Create resource (admin)
   */
  create: protectedProcedure
    .input(createResourceSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { categoryIds, regionIds, sectorIds, ...resourceData } = input;

      // Generate slug
      const baseSlug = input.slug || slugService.generateSlug(input.title);
      const slug = await slugService.generateUniqueSlug("resource", baseSlug);

      // Get initial status
      const initialStatus = await workflowService.getInitialStatus("editorial");
      if (!initialStatus) throw new Error("Workflow not initialized");

      // Create resource (columns match schema: value, eligibility, expiresAt)
      await db.insert(resources).values({
        title: resourceData.title,
        slug,
        description: resourceData.description,
        shortDescription: resourceData.shortDescription,
        type: resourceData.type || "other",
        featuredImage: resourceData.featuredImage,
        downloadUrl: resourceData.downloadUrl,
        externalUrl: resourceData.externalUrl,
        provider: resourceData.provider,
        providerLogo: resourceData.providerLogo,
        providerWebsite: resourceData.providerWebsite,
        value: resourceData.price, // map price to value column
        eligibility: resourceData.eligibility,
        expiresAt: resourceData.expiresAt,
        statusId: initialStatus.id,
      } as any);

      // Get inserted resource
      const inserted = await db.select()
        .from(resources)
        .where(eq(resources.slug, slug))
        .limit(1);

      const resourceId = inserted[0].id;

      // Add taxonomies
      if (categoryIds?.length) {
        for (const categoryId of categoryIds) {
          await db.insert(resourceCategories).values({ resourceId, categoryId } as any);
        }
      }
      if (regionIds?.length) {
        for (const regionId of regionIds) {
          await db.insert(resourceRegions).values({ resourceId, regionId } as any);
        }
      }
      if (sectorIds?.length) {
        for (const sectorId of sectorIds) {
          await db.insert(resourceSectors).values({ resourceId, sectorId } as any);
        }
      }

      return { id: resourceId, slug };
    }),

  /**
   * Update resource (admin)
   */
  update: protectedProcedure
    .input(updateResourceSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, categoryIds, regionIds, sectorIds, ...updateData } = input;

      // Update resource
      await db.update(resources)
        .set(updateData as any)
        .where(eq(resources.id, id));

      // Update taxonomies
      if (categoryIds !== undefined) {
        await db.delete(resourceCategories).where(eq(resourceCategories.resourceId, id));
        for (const categoryId of categoryIds) {
          await db.insert(resourceCategories).values({ resourceId: id, categoryId } as any);
        }
      }
      if (regionIds !== undefined) {
        await db.delete(resourceRegions).where(eq(resourceRegions.resourceId, id));
        for (const regionId of regionIds) {
          await db.insert(resourceRegions).values({ resourceId: id, regionId } as any);
        }
      }
      if (sectorIds !== undefined) {
        await db.delete(resourceSectors).where(eq(resourceSectors.resourceId, id));
        for (const sectorId of sectorIds) {
          await db.insert(resourceSectors).values({ resourceId: id, sectorId } as any);
        }
      }

      return { success: true };
    }),

  /**
   * Transition resource status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      resourceId: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await workflowService.executeTransition(
        "resource",
        input.resourceId,
        input.transitionId,
        ctx.user.id,
        ctx.user.role,
        input.comment
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await db.update(resources)
        .set({ statusId: result.newStatusId } as any)
        .where(eq(resources.id, input.resourceId));

      // If published, set publishedAt
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (result.newStatusId === publishedStatus?.id) {
        await db.update(resources)
          .set({ publishedAt: toDbDate(new Date()) } as any)
          .where(eq(resources.id, input.resourceId));
      }

      return { success: true, newStatusId: result.newStatusId };
    }),

  /**
   * Delete resource (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(resourceCategories).where(eq(resourceCategories.resourceId, input.id));
      await db.delete(resourceRegions).where(eq(resourceRegions.resourceId, input.id));
      await db.delete(resourceSectors).where(eq(resourceSectors.resourceId, input.id));
      await db.delete(resources).where(eq(resources.id, input.id));

      return { success: true };
    }),

  /**
   * Track resource download/click
   */
  trackDownload: publicProcedure
    .input(z.object({ resourceId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const resource = await db.select({ downloadCount: resources.downloadCount })
        .from(resources)
        .where(eq(resources.id, input.resourceId))
        .limit(1);

      if (resource[0]) {
        await db.update(resources)
          .set({ downloadCount: (resource[0].downloadCount || 0) + 1 } as any)
          .where(eq(resources.id, input.resourceId));
      }

      return { success: true };
    }),

  /**
   * Export resources for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(listResourcesSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { search, type } = input;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${resources.title}) LIKE LOWER(${searchTerm}) OR LOWER(${resources.description}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (type) {
        conditions.push(eq(resources.type, type));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(resources)
        .where(whereClause)
        .orderBy(desc(resources.createdAt))
        .limit(10000);

      return {
        items: results.map(resource => ({
          ...resource,
          resourceType: resource.type,
          url: resource.downloadUrl || resource.externalUrl || '',
          isFree: 1, // Resources are free by default
          price: 0,
          currency: 'USD',
        })),
      };
    }),
  bulkUpdateStatus: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), statusSlug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const status = await workflowService.getStatusBySlug("editorial", input.statusSlug);
      if (!status) throw new Error("Status not found");
      await db.update(resources)
        .set({ statusId: status.id } as any)
        .where(inArray(resources.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      for (const id of input.ids) {
        await db.delete(resourceCategories).where(eq(resourceCategories.resourceId, id));
        await db.delete(resourceRegions).where(eq(resourceRegions.resourceId, id));
        await db.delete(resourceSectors).where(eq(resourceSectors.resourceId, id));
      }
      await db.delete(resources).where(inArray(resources.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
});
