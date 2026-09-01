/**
 * Enhanced Resources Router - BRD V3 Features
 * Perks, Templates, Tools, Playbooks, Calculators, Vendors, Regulations
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
  resourceReviews,
  calculators,
  vendors,
  regulations,
  founderDeals,
  dealRedemptions,
  starterPacks,
  gatedDownloads,
  leads,
  affiliateClicks,
  categories,
  regions,
  sectors
} from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { workflowService } from "../../services/workflow.service";
import { logAudit } from "../../admin/rbac.router";

// ============================================================
// CALCULATORS ROUTER
// ============================================================

export const calculatorsRouter = router({
  // List all active calculators
  list: publicProcedure
    .input(z.object({
      type: z.enum(["valuation", "runway", "dilution", "cap_table", "burn_rate", "break_even", "roi", "ltv_cac", "mrr", "custom"]).optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(calculators.isActive, 1)];
      if (input.type) conditions.push(eq(calculators.type, input.type));

      return db.select()
        .from(calculators)
        .where(and(...conditions))
        .orderBy(asc(calculators.sortOrder), desc(calculators.createdAt))
        .limit(input.limit);
    }),

  // Get calculator by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [calc] = await db.select()
        .from(calculators)
        .where(eq(calculators.slug, input.slug));

      if (calc) {
        // Increment usage count
        await db.update(calculators)
          .set({ usageCount: (calc.usageCount || 0) + 1 } as any)
          .where(eq(calculators.id, calc.id));
      }

      return calc;
    }),

  // Admin: Create calculator
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      type: z.enum(["valuation", "runway", "dilution", "cap_table", "burn_rate", "break_even", "roi", "ltv_cac", "mrr", "custom"]),
      config: z.any().optional(),
      inputFields: z.any().optional(),
      outputFields: z.any().optional(),
      helpText: z.string().optional(),
      exampleData: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(calculators).values({
        name: input.name,
        slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        type: input.type,
        config: input.config ?? null,
        inputFields: input.inputFields ?? null,
        outputFields: input.outputFields ?? null,
        helpText: input.helpText ?? null,
        exampleData: input.exampleData ?? null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "calculators", result.insertId, { name: input.name });

      return { success: true, id: result.insertId };
    }),

  // Admin: Update calculator
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      config: z.any().optional(),
      inputFields: z.any().optional(),
      outputFields: z.any().optional(),
      helpText: z.string().optional(),
      exampleData: z.any().optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...updateData } = input;
      await db.update(calculators).set(updateData as any).where(eq(calculators.id, id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "calculators", id, updateData);

      return { success: true };
    }),
});

// ============================================================
// VENDORS ROUTER
// ============================================================

export const vendorsRouter = router({
  // List vendors
  list: publicProcedure
    .input(z.object({
      category: z.enum(["legal", "accounting", "banking", "hr", "marketing", "development", "design", "consulting", "other"]).optional(),
      search: z.string().optional(),
      isVerified: z.boolean().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return { items: [], total: 0 };

      const conditions = [eq(vendors.statusId, publishedStatus.id)];
      if (input.category) conditions.push(eq(vendors.category, input.category));
      if (input.isVerified !== undefined) conditions.push(eq(vendors.isVerified, input.isVerified as any));
      if (input.search) conditions.push(sql`LOWER(${vendors.name}) LIKE LOWER(${`%${input.search}%`})`);

      const results = await db.select()
        .from(vendors)
        .where(and(...conditions))
        .orderBy(desc(vendors.isFeatured), asc(vendors.sortOrder), desc(vendors.rating))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: results,
        total: results.length,
      };
    }),

  // Get vendor by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [vendor] = await db.select()
        .from(vendors)
        .where(eq(vendors.slug, input.slug));

      if (vendor) {
        await db.update(vendors)
          .set({ viewCount: (vendor.viewCount || 0) + 1 } as any)
          .where(eq(vendors.id, vendor.id));
      }

      return vendor;
    }),

  // Admin: Create vendor
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      category: z.enum(["legal", "accounting", "banking", "hr", "marketing", "development", "design", "consulting", "other"]),
      subcategory: z.string().optional(),
      services: z.array(z.string()).optional(),
      specializations: z.array(z.string()).optional(),
      priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const draftStatus = await workflowService.getStatusBySlug("editorial", "draft");

      const [result] = await db.insert(vendors).values({
        name: input.name,
        slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        logo: input.logo ?? null,
        website: input.website ?? null,
        category: input.category,
        subcategory: input.subcategory ?? null,
        services: input.services ?? null,
        specializations: input.specializations ?? null,
        priceRange: input.priceRange ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        address: input.address ?? null,
        statusId: draftStatus?.id ?? 1,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "vendors", result.insertId, { name: input.name });

      return { success: true, id: result.insertId };
    }),

  // Admin: List all vendors
  adminList: protectedProcedure
    .input(z.object({
      category: z.enum(["legal", "accounting", "banking", "hr", "marketing", "development", "design", "consulting", "other"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [];
      if (input.category) conditions.push(eq(vendors.category, input.category));
      if (input.search) conditions.push(sql`LOWER(${vendors.name}) LIKE LOWER(${`%${input.search}%`})`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.select()
        .from(vendors)
        .where(whereClause)
        .orderBy(desc(vendors.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: results,
        total: results.length,
      };
    }),
});

// ============================================================
// REGULATIONS ROUTER
// ============================================================

export const regulationsRouter = router({
  // List regulations
  list: publicProcedure
    .input(z.object({
      type: z.enum(["law", "regulation", "guideline", "framework", "license", "visa", "tax", "labor", "other"]).optional(),
      country: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return { items: [], total: 0 };

      const conditions = [eq(regulations.statusId, publishedStatus.id)];
      if (input.type) conditions.push(eq(regulations.type, input.type));
      if (input.country) conditions.push(eq(regulations.country, input.country));
      if (input.search) conditions.push(sql`LOWER(${regulations.title}) LIKE LOWER(${`%${input.search}%`})`);

      const results = await db.select()
        .from(regulations)
        .where(and(...conditions))
        .orderBy(desc(regulations.isFeatured), asc(regulations.sortOrder), desc(regulations.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: results,
        total: results.length,
      };
    }),

  // Get regulation by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [reg] = await db.select()
        .from(regulations)
        .where(eq(regulations.slug, input.slug));

      if (reg) {
        await db.update(regulations)
          .set({ viewCount: (reg.viewCount || 0) + 1 } as any)
          .where(eq(regulations.id, reg.id));
      }

      return reg;
    }),

  // Get regulations by country
  getByCountry: publicProcedure
    .input(z.object({ country: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      return db.select()
        .from(regulations)
        .where(and(
          eq(regulations.statusId, publishedStatus.id),
          eq(regulations.country, input.country)
        ))
        .orderBy(desc(regulations.isFeatured), asc(regulations.sortOrder))
        .limit(input.limit);
    }),

  // Admin: Create regulation
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      content: z.string().optional(),
      summary: z.string().optional(),
      type: z.enum(["law", "regulation", "guideline", "framework", "license", "visa", "tax", "labor", "other"]),
      country: z.string(),
      region: z.string().optional(),
      authority: z.string().optional(),
      authorityUrl: z.string().optional(),
      documentUrl: z.string().optional(),
      keyPoints: z.array(z.string()).optional(),
      faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const draftStatus = await workflowService.getStatusBySlug("editorial", "draft");

      const [result] = await db.insert(regulations).values({
        title: input.title,
        slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
        description: input.description ?? null,
        content: input.content ?? null,
        summary: input.summary ?? null,
        type: input.type,
        country: input.country,
        region: input.region ?? null,
        authority: input.authority ?? null,
        authorityUrl: input.authorityUrl ?? null,
        documentUrl: input.documentUrl ?? null,
        keyPoints: input.keyPoints ?? null,
        faqs: input.faqs ?? null,
        statusId: draftStatus?.id ?? 1,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "regulations", result.insertId, { title: input.title });

      return { success: true, id: result.insertId };
    }),

  // Admin: List all regulations
  adminList: protectedProcedure
    .input(z.object({
      type: z.enum(["law", "regulation", "guideline", "framework", "license", "visa", "tax", "labor", "other"]).optional(),
      country: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [];
      if (input.type) conditions.push(eq(regulations.type, input.type));
      if (input.country) conditions.push(eq(regulations.country, input.country));
      if (input.search) conditions.push(sql`LOWER(${regulations.title}) LIKE LOWER(${`%${input.search}%`})`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.select()
        .from(regulations)
        .where(whereClause)
        .orderBy(desc(regulations.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: results,
        total: results.length,
      };
    }),
});

// ============================================================
// FOUNDER DEALS (PERKS) ROUTER
// ============================================================

export const founderDealsRouter = router({
  // List active deals
  list: publicProcedure
    .input(z.object({
      discountType: z.enum(["percentage", "fixed", "credits", "free_tier", "custom"]).optional(),
      isExclusive: z.boolean().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [eq(founderDeals.status, "active")];
      if (input.discountType) conditions.push(eq(founderDeals.discountType, input.discountType));
      if (input.isExclusive !== undefined) conditions.push(eq(founderDeals.isExclusive, input.isExclusive as any));

      const results = await db.select()
        .from(founderDeals)
        .where(and(...conditions))
        .orderBy(desc(founderDeals.isFeatured), desc(founderDeals.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: results,
        total: results.length,
      };
    }),

  // Get deal by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [deal] = await db.select()
        .from(founderDeals)
        .where(eq(founderDeals.id, input.id));

      return deal;
    }),

  // Redeem a deal (requires auth)
  redeem: protectedProcedure
    .input(z.object({ dealId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the deal
      const [deal] = await db.select()
        .from(founderDeals)
        .where(eq(founderDeals.id, input.dealId));

      if (!deal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      if (deal.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deal is not active" });
      }

      // Check max redemptions
      if (deal.maxRedemptions && deal.currentRedemptions && deal.currentRedemptions >= deal.maxRedemptions) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deal has reached maximum redemptions" });
      }

      // Check user's redemption limit
      if (deal.maxRedemptionsPerUser) {
        const userRedemptions = await db.select({ count: sql<number>`COUNT(*)` })
          .from(dealRedemptions)
          .where(and(
            eq(dealRedemptions.dealId, input.dealId),
            eq(dealRedemptions.userId, ctx.user?.id ?? 0)
          ));

        if (userRedemptions[0]?.count >= deal.maxRedemptionsPerUser) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You have already redeemed this deal" });
        }
      }

      // Record redemption
      await db.insert(dealRedemptions).values({
        dealId: input.dealId,
        userId: ctx.user?.id ?? null,
        email: ctx.user?.email ?? null,
      } as any);

      // Update redemption count
      await db.update(founderDeals)
        .set({ currentRedemptions: (deal.currentRedemptions || 0) + 1 } as any)
        .where(eq(founderDeals.id, input.dealId));

      return {
        success: true,
        promoCode: deal.promoCode,
        redemptionUrl: deal.redemptionUrl,
        instructions: deal.redemptionInstructions,
      };
    }),

  // Admin: Create deal
  create: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed", "credits", "free_tier", "custom"]),
      discountValue: z.string().optional(),
      promoCode: z.string().optional(),
      redemptionUrl: z.string().optional(),
      redemptionInstructions: z.string().optional(),
      eligibility: z.string().optional(),
      maxRedemptions: z.number().optional(),
      maxRedemptionsPerUser: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isExclusive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(founderDeals).values({
        partnerId: input.partnerId,
        title: input.title,
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue ?? null,
        promoCode: input.promoCode ?? null,
        redemptionUrl: input.redemptionUrl ?? null,
        redemptionInstructions: input.redemptionInstructions ?? null,
        eligibility: input.eligibility ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? 1,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isExclusive: input.isExclusive ?? false,
        status: "draft",
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "founder_deals", result.insertId, { title: input.title });

      return { success: true, id: result.insertId };
    }),
});

// ============================================================
// STARTER PACKS ROUTER
// ============================================================

export const starterPacksRouter = router({
  // List active starter packs
  list: publicProcedure
    .input(z.object({
      targetStage: z.enum(["idea", "pre_seed", "seed", "series_a", "growth"]).optional(),
      targetRegion: z.string().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(starterPacks.isActive, 1)];
      if (input.targetStage) conditions.push(eq(starterPacks.targetStage, input.targetStage));
      if (input.targetRegion) conditions.push(eq(starterPacks.targetRegion, input.targetRegion));

      return db.select()
        .from(starterPacks)
        .where(and(...conditions))
        .orderBy(desc(starterPacks.isFeatured), asc(starterPacks.sortOrder))
        .limit(input.limit);
    }),

  // Get pack by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [pack] = await db.select()
        .from(starterPacks)
        .where(eq(starterPacks.slug, input.slug));

      if (!pack) return null;

      // Get included resources
      const includedPerks = pack.includedPerks as number[] | null;
      const includedTemplates = pack.includedTemplates as number[] | null;
      const includedTools = pack.includedTools as number[] | null;
      const includedPlaybooks = pack.includedPlaybooks as number[] | null;

      const allResourceIds = [
        ...(includedPerks || []),
        ...(includedTemplates || []),
        ...(includedTools || []),
        ...(includedPlaybooks || []),
      ];

      let includedResources: typeof resources.$inferSelect[] = [];
      if (allResourceIds.length > 0) {
        includedResources = await db.select()
          .from(resources)
          .where(inArray(resources.id, allResourceIds));
      }

      return {
        ...pack,
        resources: includedResources,
      };
    }),

  // Admin: Create starter pack
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      tagline: z.string().optional(),
      description: z.string().optional(),
      featuredImage: z.string().optional(),
      targetStage: z.enum(["idea", "pre_seed", "seed", "series_a", "growth"]).optional(),
      targetRegion: z.string().optional(),
      includedPerks: z.array(z.number()).optional(),
      includedTemplates: z.array(z.number()).optional(),
      includedTools: z.array(z.number()).optional(),
      includedPlaybooks: z.array(z.number()).optional(),
      totalValueDisplay: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(starterPacks).values({
        name: input.name,
        slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        featuredImage: input.featuredImage ?? null,
        targetStage: input.targetStage ?? "seed",
        targetRegion: input.targetRegion ?? null,
        includedPerks: input.includedPerks ?? null,
        includedTemplates: input.includedTemplates ?? null,
        includedTools: input.includedTools ?? null,
        includedPlaybooks: input.includedPlaybooks ?? null,
        totalValueDisplay: input.totalValueDisplay ?? null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "starter_packs", result.insertId, { name: input.name });

      return { success: true, id: result.insertId };
    }),
});

// ============================================================
// RESOURCE REVIEWS ROUTER
// ============================================================

export const resourceReviewsRouter = router({
  // Get reviews for a resource
  getByResource: publicProcedure
    .input(z.object({
      resourceId: z.number(),
      limit: z.number().default(10),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { reviews: [], total: 0, avgRating: 0 };

      const reviews = await db.select()
        .from(resourceReviews)
        .where(and(
          eq(resourceReviews.resourceId, input.resourceId),
          eq(resourceReviews.isApproved, 1)
        ))
        .orderBy(desc(resourceReviews.helpfulCount), desc(resourceReviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get average rating
      const [stats] = await db.select({
        avgRating: sql<number>`AVG(rating)`,
        total: sql<number>`COUNT(*)`,
      })
        .from(resourceReviews)
        .where(and(
          eq(resourceReviews.resourceId, input.resourceId),
          eq(resourceReviews.isApproved, 1)
        ));

      return {
        reviews,
        total: stats?.total ?? 0,
        avgRating: stats?.avgRating ?? 0,
      };
    }),

  // Submit a review (requires auth)
  submit: protectedProcedure
    .input(z.object({
      resourceId: z.number(),
      rating: z.number().min(1).max(5),
      title: z.string().optional(),
      content: z.string().optional(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if user already reviewed this resource
      const [existing] = await db.select()
        .from(resourceReviews)
        .where(and(
          eq(resourceReviews.resourceId, input.resourceId),
          eq(resourceReviews.userId, ctx.user?.id ?? 0)
        ));

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already reviewed this resource" });
      }

      const [result] = await db.insert(resourceReviews).values({
        resourceId: input.resourceId,
        userId: ctx.user?.id ?? null,
        rating: input.rating.toString(),
        title: input.title ?? null,
        content: input.content ?? null,
        pros: input.pros ?? null,
        cons: input.cons ?? null,
        isApproved: 0, // Requires moderation
      } as any);

      return { success: true, id: result.insertId };
    }),

  // Mark review as helpful
  markHelpful: publicProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(resourceReviews)
        .set({ helpfulCount: sql`${resourceReviews.helpfulCount} + 1` } as any)
        .where(eq(resourceReviews.id, input.reviewId));

      return { success: true };
    }),
});

// ============================================================
// GATED CONTENT / LEAD CAPTURE
// ============================================================

export const gatedContentRouter = router({
  // Track download and capture lead
  trackDownload: publicProcedure
    .input(z.object({
      resourceId: z.number(),
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      jobTitle: z.string().optional(),
      consentMarketing: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the resource
      const [resource] = await db.select()
        .from(resources)
        .where(eq(resources.id, input.resourceId));

      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }

      // Create lead
      const [leadResult] = await db.insert(leads).values({
        email: input.email.toLowerCase(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
        jobTitle: input.jobTitle ?? null,
        source: "gated_download",
        sourceResourceId: input.resourceId,
        consentMarketing: input.consentMarketing,
        consentTimestamp: new Date(),
      } as any);

      // Record download
      await db.insert(gatedDownloads).values({
        resourceId: input.resourceId,
        leadId: leadResult.insertId,
        downloadedAt: new Date(),
      } as any);

      // Update resource download count
      await db.update(resources)
        .set({ downloadCount: sql`${resources.downloadCount} + 1` } as any)
        .where(eq(resources.id, input.resourceId));

      return {
        success: true,
        downloadUrl: resource.downloadUrl,
      };
    }),
});

// ============================================================
// AFFILIATE TRACKING
// ============================================================

export const affiliateTrackingRouter = router({
  // Track affiliate click
  trackClick: publicProcedure
    .input(z.object({
      resourceId: z.number(),
      partnerId: z.number().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the resource
      const [resource] = await db.select()
        .from(resources)
        .where(eq(resources.id, input.resourceId));

      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }

      // Record click
      const resourcePartnerId = (resource as Record<string, unknown>).partnerId as number | null;
      const [clickResult] = await db.insert(affiliateClicks).values({
        partnerId: input.partnerId ?? resourcePartnerId ?? 0,
        destinationUrl: (resource as Record<string, unknown>).affiliateUrl as string ?? resource.externalUrl ?? "",
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        ipAddress: ctx.req.ip ?? null,
        userAgent: ctx.req.headers["user-agent"] ?? null,
      } as any);

      // Update resource view count (clickCount not in schema yet)
      await db.update(resources)
        .set({ viewCount: sql`COALESCE(${resources.viewCount}, 0) + 1` } as any)
        .where(eq(resources.id, input.resourceId));

      return {
        success: true,
        clickId: clickResult.insertId,
        affiliateUrl: (resource as Record<string, unknown>).affiliateUrl ?? resource.externalUrl,
      };
    }),
});
