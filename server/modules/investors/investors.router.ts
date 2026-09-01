/**
 * Investors Directory Module Router
 * VC/Angel profiles with claim/update moderation
 */

import { z } from "zod";
import { eq, and, desc, asc, like, gte, lte, sql, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  investors, 
  investorRegions,
  investorSectors,
  regions,
  sectors,
  workflowStatuses
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { editionOrderBias } from "../../services/editionOrder";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";
import { moderationService } from "../../services/moderation.service";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createInvestorSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  type: z.enum(["vc", "angel", "corporate_vc", "accelerator", "family_office", "other"]).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  headquarters: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  foundedYear: z.number().optional(),
  teamSize: z.string().optional(),
  aum: z.string().optional(),
  investmentStages: z.array(z.string()).optional(),
  checkSizeMin: z.number().optional(),
  checkSizeMax: z.number().optional(),
  checkSizeCurrency: z.string().optional(),
  portfolioCount: z.number().optional(),
  portfolioHighlights: z.array(z.string()).optional(),
  portfolioCompanies: z.any().optional(),
  notableExits: z.any().optional(),
  focusRegions: z.any().optional(),
  mission: z.string().optional(),
  investmentThesis: z.string().optional(),
  investmentPhilosophy: z.string().optional(),
  applicationProcess: z.string().optional(),
  teamMembers: z.any().optional(),
  officeLocations: z.any().optional(),
  socialLinks: z.any().optional(),
  awards: z.any().optional(),
  keyMetrics: z.any().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
  statusId: z.number().optional(),
});

const updateInvestorSchema = createInvestorSchema.partial().extend({
  id: z.number(),
});

const listInvestorsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  type: z.enum(["vc", "angel", "corporate_vc", "accelerator", "family_office", "other"]).optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  checkSizeMin: z.number().optional(),
  checkSizeMax: z.number().optional(),
  investmentStage: z.string().optional(),
  isVerified: z.boolean().optional(),
  // Edition bias — surface investors in this country first.
  editionCountryId: z.number().optional(),
  sortBy: z.enum(["name", "createdAt", "viewCount"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const claimProfileSchema = z.object({
  investorId: z.number(),
  claimantName: z.string().min(1),
  claimantEmail: z.string().email(),
  claimantRole: z.string().optional(),
  proofLinks: z.array(z.string()).optional(),
});

const suggestUpdateSchema = z.object({
  investorId: z.number(),
  proposedChanges: z.record(z.string(), z.object({
    old: z.unknown(),
    new: z.unknown(),
  })),
  reason: z.string().optional(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional(),
  evidenceLinks: z.array(z.string()).optional(),
});

// ============================================================
// INVESTORS ROUTER
// ============================================================

export const investorsRouter = router({
  /**
   * List published investors (public)
   */
  list: publicProcedure
    .input(listInvestorsSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      // Build conditions
      const conditions = [eq(investors.statusId, publishedStatus.id)];

      if (filters.search) {
        conditions.push(sql`LOWER(${investors.name}) LIKE LOWER(${`%${filters.search}%`})`);
      }
      if (filters.type) {
        conditions.push(eq(investors.type, filters.type));
      }
      if (filters.isVerified !== undefined) {
        conditions.push(eq(investors.isVerified, filters.isVerified as any));
      }

      // Build query
      const sortColumn = {
        name: investors.name,
        createdAt: investors.createdAt,
        viewCount: investors.viewCount,
      }[sortBy];

      const results = await db.select({
        id: investors.id,
        name: investors.name,
        slug: investors.slug,
        type: investors.type,
        shortDescription: investors.shortDescription,
        logo: investors.logo,
        headquarters: investors.headquarters,
        investmentStages: investors.investmentStages,
        checkSizeMin: investors.checkSizeMin,
        checkSizeMax: investors.checkSizeMax,
        checkSizeCurrency: investors.checkSizeCurrency,
        isVerified: investors.isVerified,
        viewCount: investors.viewCount,
      }).from(investors)
        .where(and(...conditions))
        .orderBy(
          ...editionOrderBias(investors.countryId, input.editionCountryId),
          sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn),
        );

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
   * Get single investor by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(investors)
        .where(eq(investors.slug, input.slug))
        .limit(1);

      if (!result[0]) return null;

      const investor = result[0];

      // Increment view count
      await db.update(investors)
        .set({ viewCount: (investor.viewCount || 0) + 1 } as any)
        .where(eq(investors.id, investor.id));

      // Get related data
      const investorRegions_ = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(investorRegions)
        .innerJoin(regions, eq(investorRegions.regionId, regions.id))
        .where(eq(investorRegions.investorId, investor.id));

      const investorSectors_ = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(investorSectors)
        .innerJoin(sectors, eq(investorSectors.sectorId, sectors.id))
        .where(eq(investorSectors.investorId, investor.id));

      // Get SEO meta
      const seo = await seoService.getSeoMeta("investor", investor.id, investor as Record<string, unknown>);

      return {
        ...investor,
        regions: investorRegions_,
        sectors: investorSectors_,
        seo,
      };
    }),

  /**
   * Claim profile (public)
   */
  claimProfile: publicProcedure
    .input(claimProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const claimId = await moderationService.submitClaim({
        entityType: "investor",
        entityId: input.investorId,
        claimantUserId: ctx.user?.id,
        claimantName: input.claimantName,
        claimantEmail: input.claimantEmail,
        claimantRole: input.claimantRole,
        proofLinks: input.proofLinks,
      });

      return { success: true, claimId };
    }),

  /**
   * Suggest update (public)
   */
  suggestUpdate: publicProcedure
    .input(suggestUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const updateId = await moderationService.submitUpdate({
        entityType: "investor",
        entityId: input.investorId,
        submitterUserId: ctx.user?.id,
        submitterName: input.submitterName,
        submitterEmail: input.submitterEmail,
        proposedChanges: input.proposedChanges as Record<string, { old: unknown; new: unknown }>,
        reason: input.reason,
        evidenceLinks: input.evidenceLinks,
      });

      return { success: true, updateId };
    }),

  /**
   * Get version history (public)
   */
  getVersionHistory: publicProcedure
    .input(z.object({ investorId: z.number() }))
    .query(async ({ input }) => {
      return moderationService.getVersionHistory("investor", input.investorId);
    }),

  // --------------------------------------------------------
  // ADMIN ENDPOINTS
  // --------------------------------------------------------

  /**
   * List all investors (admin)
   */
  adminList: protectedProcedure
    .input(listInvestorsSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { page, limit, search, type, isVerified } = input;
      const offset = (page - 1) * limit;

      // Build conditions for server-side filtering
      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${investors.name}) LIKE LOWER(${searchTerm}) OR LOWER(${investors.description}) LIKE LOWER(${searchTerm}) OR LOWER(${investors.headquarters}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (type) {
        conditions.push(eq(investors.type, type));
      }
      if (isVerified !== undefined) {
        conditions.push(eq(investors.isVerified, isVerified as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(investors)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      // Get paginated results with workflow status
      const rawResults = await db
        .select()
        .from(investors)
        .leftJoin(workflowStatuses, eq(investors.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(desc(investors.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: rawResults.map(row => ({
          ...row.investors,
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
   * Get single investor by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(investors)
        .where(eq(investors.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const investor = result[0];

      // Get taxonomy IDs
      const regIds = await db.select({ regionId: investorRegions.regionId })
        .from(investorRegions)
        .where(eq(investorRegions.investorId, investor.id));

      const secIds = await db.select({ sectorId: investorSectors.sectorId })
        .from(investorSectors)
        .where(eq(investorSectors.investorId, investor.id));

      // Get workflow info
      const availableTransitions = await workflowService.getAvailableTransitions(
        investor.statusId,
        ctx.user.role
      );

      return {
        ...investor,
        regionIds: regIds.map(r => r.regionId),
        sectorIds: secIds.map(s => s.sectorId),
        availableTransitions,
      };
    }),

  /**
   * Create investor (admin)
   */
  create: protectedProcedure
    .input(createInvestorSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { regionIds, sectorIds, checkSizeMin, checkSizeMax, ...investorData } = input;

      // Generate slug
      const baseSlug = input.slug || slugService.generateSlug(input.name);
      const slug = await slugService.generateUniqueSlug("investor", baseSlug);

      // Get status - use provided statusId or default to published for directory entries
      let statusId = investorData.statusId;
      if (!statusId) {
        // Default to published for directory entries (companies, people, investors)
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        statusId = publishedStatus?.id;
        if (!statusId) {
          const initialStatus = await workflowService.getInitialStatus("editorial");
          statusId = initialStatus?.id || 1;
        }
      }

      // Create investor
      await db.insert(investors).values({
        name: investorData.name,
        slug,
        type: investorData.type || "other",
        description: investorData.description,
        shortDescription: investorData.shortDescription,
        logo: investorData.logo,
        website: investorData.website,
        linkedIn: investorData.linkedIn,
        twitter: investorData.twitter,
        headquarters: investorData.headquarters,
        foundedYear: investorData.foundedYear,
        investmentStages: investorData.investmentStages,
        checkSizeMin: checkSizeMin !== undefined ? String(checkSizeMin) : undefined,
        checkSizeMax: checkSizeMax !== undefined ? String(checkSizeMax) : undefined,
        checkSizeCurrency: investorData.checkSizeCurrency,
        email: investorData.contactEmail,
        statusId,
      } as any);

      // Get inserted investor
      const inserted = await db.select()
        .from(investors)
        .where(eq(investors.slug, slug))
        .limit(1);

      const investorId = inserted[0].id;

      // Add taxonomies
      if (regionIds?.length) {
        for (const regionId of regionIds) {
          await db.insert(investorRegions).values({ investorId, regionId } as any);
        }
      }
      if (sectorIds?.length) {
        for (const sectorId of sectorIds) {
          await db.insert(investorSectors).values({ investorId, sectorId } as any);
        }
      }

      return { id: investorId, slug };
    }),

  /**
   * Update investor (admin)
   */
  update: protectedProcedure
    .input(updateInvestorSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, regionIds, sectorIds, checkSizeMin, checkSizeMax, ...updateData } = input;

      // Update investor
      await db.update(investors)
        .set({
          ...updateData,
          ...(checkSizeMin !== undefined && { checkSizeMin: String(checkSizeMin) }),
          ...(checkSizeMax !== undefined && { checkSizeMax: String(checkSizeMax) }),
        } as any)
        .where(eq(investors.id, id));

      // Update taxonomies
      if (regionIds !== undefined) {
        await db.delete(investorRegions).where(eq(investorRegions.investorId, id));
        for (const regionId of regionIds) {
          await db.insert(investorRegions).values({ investorId: id, regionId } as any);
        }
      }
      if (sectorIds !== undefined) {
        await db.delete(investorSectors).where(eq(investorSectors.investorId, id));
        for (const sectorId of sectorIds) {
          await db.insert(investorSectors).values({ investorId: id, sectorId } as any);
        }
      }

      return { success: true };
    }),

  /**
   * Transition investor status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      investorId: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await workflowService.executeTransition(
        "investor",
        input.investorId,
        input.transitionId,
        ctx.user.id,
        ctx.user.role,
        input.comment
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await db.update(investors)
        .set({ statusId: result.newStatusId } as any)
        .where(eq(investors.id, input.investorId));

      // If published, set publishedAt
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (result.newStatusId === publishedStatus?.id) {
        await db.update(investors)
          .set({ publishedAt: new Date().toISOString() } as any)
          .where(eq(investors.id, input.investorId));
      }

      return { success: true, newStatusId: result.newStatusId };
    }),

  /**
   * Delete investor (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(investorRegions).where(eq(investorRegions.investorId, input.id));
      await db.delete(investorSectors).where(eq(investorSectors.investorId, input.id));
      await db.delete(investors).where(eq(investors.id, input.id));

      return { success: true };
    }),

  /**
   * Verify investor (admin/moderator)
   */
  verify: protectedProcedure
    .input(z.object({ investorId: z.number(), isVerified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.update(investors)
        .set({ isVerified: (input.isVerified ? 1 : 0) } as any)
        .where(eq(investors.id, input.investorId));

      return { success: true };
    }),

  /**
   * Quick create investor (full fields with workflow support)
   */
  quickCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      type: z.enum(["vc", "angel", "corporate_vc", "family_office", "accelerator", "other"]),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      email: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      countryId: z.number().optional(),
      cityId: z.number().optional(),
      addressLine: z.string().optional(),
      location: z.string().optional(),
      foundedYear: z.number().optional(),
      teamSize: z.string().optional(),
      aum: z.string().optional(),
      checkSizeMin: z.number().optional(),
      checkSizeMax: z.number().optional(),
      portfolioCount: z.number().optional(),
      investmentStages: z.array(z.string()).optional(),
      publishDirectly: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Check for existing investor with same name (case-insensitive)
      const existing = await db
        .select({ id: investors.id, name: investors.name })
        .from(investors)
        .where(sql`LOWER(${investors.name}) = LOWER(${input.name})`)
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Investor "${existing[0].name}" already exists. Please link to the existing investor instead.`);
      }

      // Generate slug
      const baseSlug = slugService.generateSlug(input.name);
      const slug = await slugService.generateUniqueSlug("investor", baseSlug);

      // Determine status based on publishDirectly flag and user role
      let statusId: number;
      if (input.publishDirectly && ctx.user.role === "admin") {
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        if (!publishedStatus) throw new Error("Published status not found");
        statusId = publishedStatus.id;
      } else if (input.publishDirectly === false) {
        // Submit for review
        const submittedStatus = await workflowService.getStatusBySlug("editorial", "submitted");
        if (!submittedStatus) throw new Error("Submitted status not found");
        statusId = submittedStatus.id;
      } else {
        // Default to draft
        const initialStatus = await workflowService.getInitialStatus("editorial");
        if (!initialStatus) throw new Error("Workflow not initialized");
        statusId = initialStatus.id;
      }

      // Create investor with all provided data
      await db.insert(investors).values({
        name: input.name,
        slug,
        type: input.type,
        shortDescription: input.shortDescription,
        description: input.description,
        logo: input.logo,
        website: input.website,
        email: input.email,
        linkedIn: input.linkedIn,
        twitter: input.twitter,
        countryId: input.countryId,
        cityId: input.cityId,
        addressLine: input.addressLine,
        location: input.location,
        foundedYear: input.foundedYear,
        teamSize: input.teamSize,
        aum: input.aum,
        checkSizeMin: input.checkSizeMin?.toString(),
        checkSizeMax: input.checkSizeMax?.toString(),
        portfolioCount: input.portfolioCount,
        investmentStages: input.investmentStages ? JSON.stringify(input.investmentStages) : undefined,
        statusId,
        publishedAt: input.publishDirectly && ctx.user.role === "admin" ? new Date() : undefined,
      } as any);

      // Get inserted investor
      const inserted = await db.select()
        .from(investors)
        .where(eq(investors.slug, slug))
        .limit(1);

      return { id: inserted[0].id, name: input.name, slug };
    }),

  /**
   * Export investors for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(listInvestorsSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { search, type, isVerified } = input;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${investors.name}) LIKE LOWER(${searchTerm}) OR LOWER(${investors.description}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (type) {
        conditions.push(eq(investors.type, type));
      }
      if (isVerified !== undefined) {
        conditions.push(eq(investors.isVerified, isVerified as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(investors)
        .where(whereClause)
        .orderBy(desc(investors.createdAt))
        .limit(10000);

      return {
        items: results.map(investor => ({
          ...investor,
          investmentFocus: investor.description || '',
          minInvestment: investor.checkSizeMin,
          maxInvestment: investor.checkSizeMax,
          portfolioCount: investor.portfolioCount,
          linkedinUrl: investor.linkedIn,
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
      await db.update(investors)
        .set({ statusId: status.id } as any)
        .where(inArray(investors.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      for (const id of input.ids) {
        await db.delete(investorRegions).where(eq(investorRegions.investorId, id));
        await db.delete(investorSectors).where(eq(investorSectors.investorId, id));
      }
      await db.delete(investors).where(inArray(investors.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
});
