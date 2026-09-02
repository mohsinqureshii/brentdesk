/**
 * Partners Router - Partner Management System
 * Handles partner CRUD, API keys, and affiliate tracking
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  partners, 
  partnerUsers, 
  partnerApiKeys,
  affiliateClicks,
  affiliateConversions,
  partnerPayouts,
  users
} from "../../drizzle/schema";
import { eq, and, desc, like, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAudit } from "./rbac.router";
import crypto from "crypto";
import { toDbDate } from "../_core/dbValues";

// Generate secure API key
function generateApiKey(): string {
  return `ts_${crypto.randomBytes(24).toString("hex")}`;
}

function generateApiSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generate slug from company name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const partnersRouter = router({
  // ============================================================
  // PARTNER CRUD
  // ============================================================

  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "active", "suspended", "terminated"]).optional(),
      tier: z.enum(["free", "growth", "pro", "enterprise"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { partners: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(partners.status, input.status));
      if (input.tier) conditions.push(eq(partners.tier, input.tier));
      if (input.search) {
        conditions.push(sql`LOWER(${partners.companyName}) LIKE LOWER(${`%${input.search}%`})`);
      }

      let query = database.select().from(partners);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const partnersList = await query
        .orderBy(desc(partners.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(partners)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        partners: partnersList,
        total: countResult?.count ?? 0,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;

      const [partner] = await database
        .select()
        .from(partners)
        .where(eq(partners.id, input.id));

      if (!partner) return null;

      // Get partner users
      const partnerUsersList = await database
        .select({
          partnerUser: partnerUsers,
          user: users,
        })
        .from(partnerUsers)
        .innerJoin(users, eq(partnerUsers.userId, users.id))
        .where(eq(partnerUsers.partnerId, input.id));

      // Get API keys (without secrets)
      const apiKeys = await database
        .select({
          id: partnerApiKeys.id,
          keyName: partnerApiKeys.keyName,
          apiKey: partnerApiKeys.apiKey,
          lastUsedAt: partnerApiKeys.lastUsedAt,
          expiresAt: partnerApiKeys.expiresAt,
          isActive: partnerApiKeys.isActive,
          createdAt: partnerApiKeys.createdAt,
        })
        .from(partnerApiKeys)
        .where(eq(partnerApiKeys.partnerId, input.id));

      return {
        ...partner,
        users: partnerUsersList,
        apiKeys,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1).max(255),
      website: z.string().url().optional(),
      description: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      tier: z.enum(["free", "growth", "pro", "enterprise"]).default("free"),
      partnershipType: z.enum(["resource_provider", "affiliate", "sponsor", "media", "strategic"]).default("resource_provider"),
      commissionRate: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const slug = generateSlug(input.companyName);

      // Check for duplicate slug
      const existing = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, slug));

      const finalSlug = existing.length > 0 ? `${slug}-${Date.now()}` : slug;

      const [result] = await database.insert(partners).values({
        companyName: input.companyName,
        slug: finalSlug,
        website: input.website ?? null,
        description: input.description ?? null,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        tier: input.tier,
        partnershipType: input.partnershipType,
        commissionRate: input.commissionRate?.toString() ?? "15.00",
        status: "pending",
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "partners", result.insertId, input);

      return { success: true, id: result.insertId, slug: finalSlug };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      companyName: z.string().min(1).max(255).optional(),
      logo: z.string().optional(),
      website: z.string().url().optional(),
      description: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      tier: z.enum(["free", "growth", "pro", "enterprise"]).optional(),
      partnershipType: z.enum(["resource_provider", "affiliate", "sponsor", "media", "strategic"]).optional(),
      commissionRate: z.number().min(0).max(100).optional(),
      billingEmail: z.string().email().optional(),
      billingAddress: z.string().optional(),
      notes: z.string().optional(),
      monthlyClickLimit: z.number().optional(),
      monthlyLeadLimit: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, commissionRate, ...restData } = input;
      
      // Build update data with proper type conversion
      const updateData: Record<string, unknown> = { ...restData };
      if (commissionRate !== undefined) {
        updateData.commissionRate = commissionRate.toString();
      }

      await database.update(partners).set(updateData as any).where(eq(partners.id, id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "partners", id, updateData);

      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "active", "suspended", "terminated"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = { status: input.status };
      
      if (input.status === "active") {
        updateData.approvedById = ctx.user?.id;
        updateData.approvedAt = new Date();
      }

      await database.update(partners).set(updateData as any).where(eq(partners.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update_status", "partners", input.id, { status: input.status });

      return { success: true };
    }),

  // ============================================================
  // PARTNER API KEYS
  // ============================================================

  createApiKey: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      keyName: z.string().min(1).max(128),
      expiresAt: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const apiKey = generateApiKey();
      const apiSecret = generateApiSecret();

      const [result] = await database.insert(partnerApiKeys).values({
        partnerId: input.partnerId,
        keyName: input.keyName,
        apiKey,
        apiSecret, // In production, hash this
        expiresAt: input.expiresAt ? toDbDate(new Date(input.expiresAt)) : null,
        createdById: ctx.user?.id ?? null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create_api_key", "partner_api_keys", result.insertId, { partnerId: input.partnerId, keyName: input.keyName });

      // Return the secret only once
      return { 
        success: true, 
        id: result.insertId,
        apiKey,
        apiSecret, // Only shown once!
      };
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database
        .update(partnerApiKeys)
        .set({ isActive: 0 } as any)
        .where(eq(partnerApiKeys.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "revoke_api_key", "partner_api_keys", input.id, {});

      return { success: true };
    }),

  // ============================================================
  // AFFILIATE TRACKING
  // ============================================================

  trackClick: publicProcedure
    .input(z.object({
      resourceId: z.number().optional(),
      partnerId: z.number().optional(),
      destinationUrl: z.string().url(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmContent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return { success: false };

      // Get session ID from cookie or generate one
      const sessionId = ctx.req.cookies?.sessionId || crypto.randomBytes(16).toString("hex");

      await database.insert(affiliateClicks).values({
        resourceId: input.resourceId ?? null,
        partnerId: input.partnerId ?? null,
        sessionId,
        userId: ctx.user?.id ?? null,
        pageUrl: ctx.req.headers.referer ?? null,
        destinationUrl: input.destinationUrl,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmContent: input.utmContent ?? null,
        ipAddress: ctx.req.ip ?? null,
        userAgent: ctx.req.headers["user-agent"] ?? null,
        referer: ctx.req.headers.referer ?? null,
      } as any);

      return { success: true, sessionId };
    }),

  getAffiliateStats: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;

      const conditions = [eq(affiliateClicks.partnerId, input.partnerId)];
      if (input.startDate) {
        conditions.push(gte(affiliateClicks.clickedAt, toDbDate(new Date(input.startDate))));
      }
      if (input.endDate) {
        conditions.push(lte(affiliateClicks.clickedAt, toDbDate(new Date(input.endDate))));
      }

      // Get click count
      const [clickStats] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(affiliateClicks)
        .where(and(...conditions));

      // Get conversion stats
      const conversionConditions = [eq(affiliateConversions.partnerId, input.partnerId)];
      if (input.startDate) {
        conversionConditions.push(gte(affiliateConversions.convertedAt, toDbDate(new Date(input.startDate))));
      }
      if (input.endDate) {
        conversionConditions.push(lte(affiliateConversions.convertedAt, toDbDate(new Date(input.endDate))));
      }

      const [conversionStats] = await database
        .select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
          totalCommission: sql<number>`COALESCE(SUM(commissionAmount), 0)`,
        })
        .from(affiliateConversions)
        .where(and(...conversionConditions));

      return {
        clicks: clickStats?.count ?? 0,
        conversions: conversionStats?.count ?? 0,
        totalAmount: conversionStats?.totalAmount ?? 0,
        totalCommission: conversionStats?.totalCommission ?? 0,
        conversionRate: clickStats?.count ? ((conversionStats?.count ?? 0) / clickStats.count * 100).toFixed(2) : "0.00",
      };
    }),

  // ============================================================
  // PAYOUTS
  // ============================================================

  listPayouts: protectedProcedure
    .input(z.object({
      partnerId: z.number().optional(),
      status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { payouts: [], total: 0 };

      const conditions = [];
      if (input.partnerId) conditions.push(eq(partnerPayouts.partnerId, input.partnerId));
      if (input.status) conditions.push(eq(partnerPayouts.status, input.status));

      let query = database
        .select({
          payout: partnerPayouts,
          partner: partners,
        })
        .from(partnerPayouts)
        .innerJoin(partners, eq(partnerPayouts.partnerId, partners.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const payoutsList = await query
        .orderBy(desc(partnerPayouts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        payouts: payoutsList,
        total: payoutsList.length,
      };
    }),

  createPayout: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      amount: z.number().positive(),
      paymentMethod: z.enum(["bank_transfer", "paypal", "stripe", "check"]),
      periodStart: z.string(),
      periodEnd: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(partnerPayouts).values({
        partnerId: input.partnerId,
        amount: input.amount.toString(),
        paymentMethod: input.paymentMethod,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        notes: input.notes ?? null,
        status: "pending",
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create_payout", "partner_payouts", result.insertId, input);

      return { success: true, id: result.insertId };
    }),

  updatePayoutStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "processing", "completed", "failed"]),
      paymentReference: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.paymentReference) updateData.paymentReference = input.paymentReference;
      if (input.status === "completed") {
        updateData.processedAt = new Date();
        updateData.processedById = ctx.user?.id;
      }

      await database.update(partnerPayouts).set(updateData as any).where(eq(partnerPayouts.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update_payout_status", "partner_payouts", input.id, input);

      return { success: true };
    }),

  // ============================================================
  // PARTNER DASHBOARD ENDPOINTS
  // ============================================================

  // Get current user's partner (if they are a partner user)
  getMyPartner: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return null;

      // Find partner user record for current user
      const [partnerUser] = await database
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.userId, ctx.user?.id ?? 0));

      if (!partnerUser) return null;

      // Get partner details
      const [partner] = await database
        .select()
        .from(partners)
        .where(eq(partners.id, partnerUser.partnerId));

      return partner;
    }),

  // Get affiliate stats for partner dashboard
  getAffiliateStatsDashboard: protectedProcedure
    .input(z.object({
      dateRange: z.enum(["7d", "30d", "90d"]).default("30d"),
    }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;

      // Find partner for current user
      const [partnerUser] = await database
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.userId, ctx.user?.id ?? 0));

      if (!partnerUser) return null;

      const days = input.dateRange === "7d" ? 7 : input.dateRange === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get click count
      const [clickStats] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(affiliateClicks)
        .where(and(
          eq(affiliateClicks.partnerId, partnerUser.partnerId),
          gte(affiliateClicks.clickedAt, startDate as any)
        ));

      // Get conversion stats
      const [conversionStats] = await database
        .select({
          count: sql<number>`COUNT(*)`,
          totalCommission: sql<number>`COALESCE(SUM(commissionAmount), 0)`,
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.partnerId, partnerUser.partnerId),
          gte(affiliateConversions.convertedAt, startDate as any)
        ));

      // Get pending earnings (unpaid conversions)
      const [pendingStats] = await database
        .select({
          pending: sql<number>`COALESCE(SUM(commissionAmount), 0)`,
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.partnerId, partnerUser.partnerId),
          eq(affiliateConversions.status, "pending")
        ));

      return {
        totalClicks: clickStats?.count ?? 0,
        totalConversions: conversionStats?.count ?? 0,
        totalEarnings: conversionStats?.totalCommission ?? 0,
        pendingEarnings: pendingStats?.pending ?? 0,
        conversionRate: clickStats?.count ? ((conversionStats?.count ?? 0) / clickStats.count * 100) : 0,
        clicksChange: 0, // TODO: Calculate vs previous period
      };
    }),

  // Get recent clicks for partner dashboard
  getRecentClicks: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return [];

      // Find partner for current user
      const [partnerUser] = await database
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.userId, ctx.user?.id ?? 0));

      if (!partnerUser) return [];

      return database
        .select()
        .from(affiliateClicks)
        .where(eq(affiliateClicks.partnerId, partnerUser.partnerId))
        .orderBy(desc(affiliateClicks.clickedAt))
        .limit(input.limit);
    }),

  // Get partner's deals
  getMyDeals: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];

      // Find partner for current user
      const [partnerUser] = await database
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.userId, ctx.user?.id ?? 0));

      if (!partnerUser) return [];

      // Import founderDeals
      const { founderDeals } = await import("../../drizzle/schema");

      return database
        .select()
        .from(founderDeals)
        .where(eq(founderDeals.partnerId, partnerUser.partnerId))
        .orderBy(desc(founderDeals.createdAt));
    }),
});
