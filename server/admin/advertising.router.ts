/**
 * Advertising System Router
 * Handles ad slots, campaigns, creatives, impressions, and clicks
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  adSlots, 
  adCampaigns, 
  adCreatives,
  adImpressions,
  adClicks,
  partners,
  adsenseSettings,
  adBlocklist,
  adFrequencyLog
} from "../../drizzle/schema";
import { eq, and, asc, desc, sql, gte, lte, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAudit } from "./rbac.router";
import { toDbDate } from "../_core/dbValues";
import { localizeRows } from "../services/translation.service";

// Last successful adsense response per slot — served when a transient
// DB failure would otherwise blank every ad on the page. Revenue slots
// must degrade to "yesterday's config", not to nothing.
const lastKnownAdsense = new Map<string, unknown>();

/**
 * A house creative's headline, blurb and button are editorial copy; serve
 * them in the reader's language like the masthead and category labels.
 * A creative with no translation returns unchanged.
 */
async function localizeAdCreative<T extends { id: number }>(
  locale: { code: string; isDefault: boolean } | undefined, creative: T,
): Promise<T> {
  try {
    const [c] = await localizeRows(locale, "ad_creative", [creative]);
    return c ?? creative;
  } catch {
    return creative;
  }
}

export const advertisingRouter = router({
  // ============================================================
  // AD SLOTS
  // ============================================================

  // List all ad slots
  listSlots: protectedProcedure
    .input(z.object({
      pageType: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return [];

      const conditions = [];
      if (input.pageType) conditions.push(eq(adSlots.pageType, input.pageType));
      if (input.isActive !== undefined) conditions.push(eq(adSlots.isActive, input.isActive ? 1 : 0));

      const slots = await database
        .select()
        .from(adSlots)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(adSlots.pageType, adSlots.position);

      return slots;
    }),

  // Create ad slot
  createSlot: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slotKey: z.string().min(1).max(64),
      pageType: z.string().min(1).max(64),
      position: z.string().min(1).max(64),
      dimensions: z.string().optional(),
      floorPrice: z.number().min(0).optional(),
      isPremium: z.boolean().optional(),
      adsenseSlotId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(adSlots).values({
        name: input.name,
        slotKey: input.slotKey,
        pageType: input.pageType,
        position: input.position,
        dimensions: input.dimensions ?? null,
        floorPrice: input.floorPrice?.toFixed(2) ?? "0.00",
        isPremium: input.isPremium ? 1 : 0,
        adsenseSlotId: input.adsenseSlotId ?? null,
        isActive: 1,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "ad_slots", result.insertId, input);

      return { success: true, slotId: result.insertId };
    }),

  // Update ad slot
  updateSlot: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      floorPrice: z.number().min(0).optional(),
      isPremium: z.boolean().optional(),
      isActive: z.boolean().optional(),
      adsenseSlotId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, floorPrice, ...updateData } = input;
      const finalData: Record<string, unknown> = { ...updateData };
      if (floorPrice !== undefined) {
        finalData.floorPrice = floorPrice.toFixed(2);
      }

      await database.update(adSlots).set(finalData as any).where(eq(adSlots.id, id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "ad_slots", id, input);

      return { success: true };
    }),

  // ============================================================
  // AD CAMPAIGNS
  // ============================================================

  // List campaigns
  listCampaigns: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "pending_approval", "approved", "active", "paused", "completed", "rejected"]).optional(),
      partnerId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { campaigns: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(adCampaigns.status, input.status));
      if (input.partnerId) conditions.push(eq(adCampaigns.partnerId, input.partnerId));

      const campaigns = await database
        .select({
          campaign: adCampaigns,
          partner: {
            id: partners.id,
            companyName: partners.companyName,
          },
        })
        .from(adCampaigns)
        .leftJoin(partners, eq(adCampaigns.partnerId, partners.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adCampaigns.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(adCampaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        campaigns,
        total: countResult?.count ?? 0,
      };
    }),

  // Get campaign by ID
  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return null;

      const [campaign] = await database
        .select({
          campaign: adCampaigns,
          partner: {
            id: partners.id,
            companyName: partners.companyName,
          },
        })
        .from(adCampaigns)
        .leftJoin(partners, eq(adCampaigns.partnerId, partners.id))
        .where(eq(adCampaigns.id, input.id));

      if (!campaign) return null;

      // Get creatives for this campaign
      const creatives = await database
        .select()
        .from(adCreatives)
        .where(eq(adCreatives.campaignId, input.id));

      return {
        ...campaign,
        creatives,
      };
    }),

  // Create campaign
  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      partnerId: z.number().optional(),
      campaignType: z.enum(["direct", "sponsorship", "programmatic", "house"]),
      objective: z.enum(["awareness", "traffic", "leads", "conversions"]).optional(),
      budget: z.number().min(0),
      budgetType: z.enum(["total", "daily"]).optional(),
      pricingModel: z.enum(["cpm", "cpc", "cpa", "flat"]),
      pricePerUnit: z.number().min(0).optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      targetSlots: z.array(z.number()).optional(),
      targetCategories: z.array(z.string()).optional(),
      targetGeos: z.array(z.string()).optional(),
      targetDevices: z.array(z.string()).optional(),
      frequencyCap: z.number().optional(),
      frequencyCapPeriod: z.enum(["hour", "day", "week", "month"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(adCampaigns).values({
        name: input.name,
        partnerId: input.partnerId ?? null,
        campaignType: input.campaignType,
        objective: input.objective ?? "awareness",
        budget: input.budget.toFixed(2),
        budgetType: input.budgetType ?? "total",
        pricingModel: input.pricingModel,
        pricePerUnit: input.pricePerUnit?.toFixed(4) ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        targetSlots: input.targetSlots ? JSON.stringify(input.targetSlots) : null,
        targetCategories: input.targetCategories ? JSON.stringify(input.targetCategories) : null,
        targetGeos: input.targetGeos ? JSON.stringify(input.targetGeos) : null,
        targetDevices: input.targetDevices ? JSON.stringify(input.targetDevices) : null,
        frequencyCap: input.frequencyCap ?? null,
        frequencyCapPeriod: input.frequencyCapPeriod ?? null,
        status: "draft",
        createdById: ctx.user?.id ?? null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "ad_campaigns", result.insertId, input);

      return { success: true, campaignId: result.insertId };
    }),

  // Update campaign
  updateCampaign: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      budget: z.number().min(0).optional(),
      pricePerUnit: z.number().min(0).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      targetSlots: z.array(z.number()).optional(),
      targetCategories: z.array(z.string()).optional(),
      targetGeos: z.array(z.string()).optional(),
      status: z.enum(["draft", "pending_approval", "approved", "active", "paused", "completed", "rejected"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, budget, pricePerUnit, startDate, endDate, targetSlots, targetCategories, targetGeos, ...rest } = input;
      
      const updateData: Record<string, unknown> = { ...rest };
      if (budget !== undefined) updateData.budget = budget.toFixed(2);
      if (pricePerUnit !== undefined) updateData.pricePerUnit = pricePerUnit.toFixed(4);
      if (startDate) updateData.startDate = startDate;
      if (endDate) updateData.endDate = endDate;
      if (targetSlots) updateData.targetSlots = JSON.stringify(targetSlots);
      if (targetCategories) updateData.targetCategories = JSON.stringify(targetCategories);
      if (targetGeos) updateData.targetGeos = JSON.stringify(targetGeos);

      await database.update(adCampaigns).set(updateData as any).where(eq(adCampaigns.id, id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "ad_campaigns", id, input);

      return { success: true };
    }),

  // Approve campaign
  approveCampaign: protectedProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database.update(adCampaigns).set({
        status: input.approved ? "approved" : "rejected",
        approvedById: ctx.user?.id ?? null,
        approvedAt: toDbDate(new Date()),
      } as any).where(eq(adCampaigns.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, input.approved ? "approve" : "reject", "ad_campaigns", input.id, {});

      return { success: true };
    }),

  // ============================================================
  // AD CREATIVES
  // ============================================================

  // Create creative
  createCreative: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      name: z.string().min(1).max(255),
      format: z.enum(["banner", "native", "video", "text"]),
      fileUrl: z.string().optional(),
      nativeHeadline: z.string().optional(),
      nativeDescription: z.string().optional(),
      clickUrl: z.string().url(),
      nativeCta: z.string().optional(),
      dimensions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(adCreatives).values({
        campaignId: input.campaignId,
        name: input.name,
        format: input.format,
        fileUrl: input.fileUrl ?? null,
        nativeHeadline: input.nativeHeadline ?? null,
        nativeDescription: input.nativeDescription ?? null,
        clickUrl: input.clickUrl,
        nativeCta: input.nativeCta ?? null,
        dimensions: input.dimensions ?? null,
        status: "pending_approval",
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "ad_creatives", result.insertId, input);

      return { success: true, creativeId: result.insertId };
    }),

  // Approve/reject creative
  reviewCreative: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "ad_ops"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database.update(adCreatives).set({
        status: input.status,
      } as any).where(eq(adCreatives.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "review", "ad_creatives", input.id, input);

      return { success: true };
    }),

  // ============================================================
  // AD SERVING (Public)
  // ============================================================

  // Get ad for a slot (public endpoint for frontend)
  getAdForSlot: publicProcedure
    .input(z.object({
      slotKey: z.string(),
      pageUrl: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      // Get the slot
      const [slot] = await database
        .select()
        .from(adSlots)
        .where(and(
          eq(adSlots.slotKey, input.slotKey),
          eq(adSlots.isActive, 1)
        ));

      if (!slot) return null;

      const now = new Date();

      // Find an active campaign targeting this slot
      const campaigns = await database
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.status, "active"),
          lte(adCampaigns.startDate, sql`NOW()`),
          or(
            isNull(adCampaigns.endDate),
            gte(adCampaigns.endDate, sql`NOW()`)
          )
        ));

      // Filter campaigns that target this slot
      let selectedCampaign = null;
      for (const campaign of campaigns) {
        const targetSlots = campaign.targetSlots ? JSON.parse(campaign.targetSlots as string) : null;
        if (!targetSlots || targetSlots.includes(slot.id)) {
          selectedCampaign = campaign;
          break;
        }
      }

      if (!selectedCampaign) {
        // Return AdSense fallback if configured
        if (slot.adsenseSlotId) {
          return {
            type: "adsense",
            slotId: slot.adsenseSlotId,
            dimensions: slot.dimensions,
          };
        }
        return null;
      }

      // Get approved creative for this campaign
      const [creative] = await database
        .select()
        .from(adCreatives)
        .where(and(
          eq(adCreatives.campaignId, selectedCampaign.id),
          eq(adCreatives.status, "approved")
        ))
        .limit(1);

      if (!creative) return null;

      return {
        type: "direct",
        campaignId: selectedCampaign.id,
        creativeId: creative.id,
        format: creative.format,
        fileUrl: creative.fileUrl,
        nativeHeadline: creative.nativeHeadline,
        nativeDescription: creative.nativeDescription,
        clickUrl: creative.clickUrl,
        nativeCta: creative.nativeCta,
        dimensions: creative.dimensions || slot.dimensions,
      };
    }),

  // Track impression
  trackImpression: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      creativeId: z.number(),
      slotId: z.number(),
      pageUrl: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { success: false };

      await database.insert(adImpressions).values({
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        slotId: input.slotId,
        pageUrl: input.pageUrl ?? null,
        userAgent: input.userAgent ?? null,
      } as any);

      // Update campaign impressions count
      await database.update(adCampaigns).set({
        impressions: sql`${adCampaigns.impressions} + 1`,
      } as any).where(eq(adCampaigns.id, input.campaignId));

      return { success: true };
    }),

  // Track click
  trackClick: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      creativeId: z.number(),
      slotId: z.number(),
      pageUrl: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { success: false };

      // First create an impression record to get the impressionId
      const [impressionResult] = await database.insert(adImpressions).values({
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        slotId: input.slotId,
        pageUrl: input.pageUrl ?? null,
        userAgent: input.userAgent ?? null,
      } as any);

      await database.insert(adClicks).values({
        impressionId: impressionResult.insertId,
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        clickUrl: input.pageUrl ?? "",
      } as any);

      // Update campaign clicks count
      await database.update(adCampaigns).set({
        clicks: sql`${adCampaigns.clicks} + 1`,
      } as any).where(eq(adCampaigns.id, input.campaignId));

      return { success: true };
    }),

  // ============================================================
  // REPORTING
  // ============================================================

  // Get campaign stats
  getCampaignStats: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return null;

      const [campaign] = await database
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.id, input.campaignId));

      if (!campaign) return null;

      // Calculate CTR
      const impressions = campaign.impressions ?? 0;
      const clicks = campaign.clicks ?? 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      // Calculate spend based on pricing model
      const pricePerUnit = parseFloat(campaign.pricePerUnit ?? "0");
      let calculatedSpend = 0;
      if (campaign.pricingModel === "cpm") {
        calculatedSpend = (impressions / 1000) * pricePerUnit;
      } else if (campaign.pricingModel === "cpc") {
        calculatedSpend = clicks * pricePerUnit;
      } else if (campaign.pricingModel === "flat") {
        calculatedSpend = pricePerUnit;
      }

      const spend = parseFloat(campaign.spend ?? "0") || calculatedSpend;

      return {
        campaign,
        stats: {
          impressions,
          clicks,
          ctr: ctr.toFixed(2),
          spend: spend.toFixed(2),
          budget: campaign.budget,
          budgetRemaining: (parseFloat(campaign.budget ?? "0") - spend).toFixed(2),
        },
      };
    }),

  // Get overall ad stats
  getOverallStats: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "ad_ops", "sales"].includes(ctx.user?.role ?? "")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return null;

    // Get totals
    const [totals] = await database
      .select({
        totalCampaigns: sql<number>`COUNT(*)`,
        activeCampaigns: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
        totalImpressions: sql<number>`COALESCE(SUM(impressions), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
        totalBudget: sql<number>`COALESCE(SUM(CAST(budget AS DECIMAL(15,2))), 0)`,
      })
      .from(adCampaigns);

    // Get slot stats
    const [slotStats] = await database
      .select({
        totalSlots: sql<number>`COUNT(*)`,
        activeSlots: sql<number>`SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END)`,
        premiumSlots: sql<number>`SUM(CASE WHEN isPremium = 1 THEN 1 ELSE 0 END)`,
      })
      .from(adSlots);

    const totalImpressions = totals?.totalImpressions ?? 0;
    const totalClicks = totals?.totalClicks ?? 0;
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      campaigns: totals,
      slots: slotStats,
      overallCtr: overallCtr.toFixed(2),
    };
  }),

  // ============================================================
  // ADSENSE SETTINGS
  // ============================================================

  getAdsenseSettings: protectedProcedure.query(async ({ ctx }) => {
    if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    const database = await getDb();
    if (!database) return null;
    const [settings] = await database.select().from(adsenseSettings).limit(1);
    return settings ?? null;
  }),

  updateAdsenseSettings: protectedProcedure
    .input(z.object({
      publisherId: z.string().optional(),
      autoAdsEnabled: z.boolean().optional(),
      adsenseEnabled: z.boolean().optional(),
      adsTxtContent: z.string().optional(),
      globalKillSwitch: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const [existing] = await database.select().from(adsenseSettings).limit(1);
      const updateData: Partial<{
        publisherId: string | null;
        autoAdsEnabled: number;
        adsenseEnabled: number;
        adsTxtContent: string | null;
        globalKillSwitch: number;
      }> = {};
      if (input.publisherId !== undefined) updateData.publisherId = input.publisherId;
      if (input.autoAdsEnabled !== undefined) updateData.autoAdsEnabled = input.autoAdsEnabled ? 1 : 0;
      if (input.adsenseEnabled !== undefined) updateData.adsenseEnabled = input.adsenseEnabled ? 1 : 0;
      if (input.adsTxtContent !== undefined) updateData.adsTxtContent = input.adsTxtContent;
      if (input.globalKillSwitch !== undefined) updateData.globalKillSwitch = input.globalKillSwitch ? 1 : 0;

      if (existing) {
        await database.update(adsenseSettings).set(updateData as any).where(eq(adsenseSettings.id, existing.id));
      } else {
        await database.insert(adsenseSettings).values({
          publisherId: input.publisherId ?? null,
          autoAdsEnabled: input.autoAdsEnabled ? 1 : 0,
          adsenseEnabled: input.adsenseEnabled ? 1 : 0,
          adsTxtContent: input.adsTxtContent ?? null,
          globalKillSwitch: input.globalKillSwitch ? 1 : 0,
        } as any);
      }

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, 'update', 'adsense_settings', existing?.id ?? 1, input);
      return { success: true };
    }),

  // Global kill switch
  toggleGlobalKillSwitch: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await database.update(adsenseSettings).set({ globalKillSwitch: input.enabled ? 1 : 0 } as any);
      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, 'toggle_kill_switch', 'adsense_settings', 1, input);
      return { success: true };
    }),

  // ============================================================
  // BRAND SAFETY / BLOCKLIST
  // ============================================================

  listBlocklist: protectedProcedure.query(async ({ ctx }) => {
    if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    const database = await getDb();
    if (!database) return [];
    return database.select().from(adBlocklist).orderBy(desc(adBlocklist.createdAt));
  }),

  addToBlocklist: protectedProcedure
    .input(z.object({
      type: z.enum(['domain', 'keyword', 'category']),
      value: z.string().min(1).max(255),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [result] = await database.insert(adBlocklist).values({
        type: input.type,
        value: input.value,
        reason: input.reason ?? null,
        createdById: ctx.user?.id ?? null,
      } as any);
      return { success: true, id: result.insertId };
    }),

  removeFromBlocklist: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await database.delete(adBlocklist).where(eq(adBlocklist.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // ENHANCED AD SERVING (Public) - with house ad fallback
  // ============================================================

  getAdForSlotV2: publicProcedure
    .input(z.object({
      slotKey: z.string(),
      pageUrl: z.string().optional(),
      category: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
      const database = await getDb();
      if (!database) return { type: 'empty' as const, slotKey: input.slotKey };

      // Check global kill switch
      const [settings] = await database.select().from(adsenseSettings).limit(1);
      if (settings?.globalKillSwitch) {
        return { type: 'empty' as const, slotKey: input.slotKey };
      }

      // Get the slot
      const [slot] = await database
        .select()
        .from(adSlots)
        .where(and(
          eq(adSlots.slotKey, input.slotKey),
          eq(adSlots.isActive, 1)
        ));

      if (!slot) return { type: 'empty' as const, slotKey: input.slotKey };

      const now = new Date();

      // Priority 1: Direct campaigns targeting this slot
      const campaigns = await database
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.status, 'active'),
          lte(adCampaigns.startDate, sql`NOW()`),
          or(
            isNull(adCampaigns.endDate),
            gte(adCampaigns.endDate, sql`NOW()`)
          )
        ))
        .orderBy(desc(adCampaigns.pricingModel)); // Prefer higher-paying models

      // Filter for direct campaigns targeting this slot
      for (const campaign of campaigns) {
        if (campaign.campaignType === 'house') continue; // Skip house ads for now
        const targetSlots = campaign.targetSlots ? JSON.parse(campaign.targetSlots as string) : null;
        if (!targetSlots || targetSlots.includes(slot.id)) {
          // Check frequency cap
          if (campaign.frequencyCap && input.sessionId) {
            const [freqLog] = await database
              .select()
              .from(adFrequencyLog)
              .where(and(
                eq(adFrequencyLog.campaignId, campaign.id),
                eq(adFrequencyLog.sessionId, input.sessionId)
              ))
              .limit(1);
            if (freqLog && (freqLog.impressionCount ?? 0) >= campaign.frequencyCap) {
              continue; // Skip this campaign, frequency cap reached
            }
          }

          // Get approved creative
          const [creative] = await database
            .select()
            .from(adCreatives)
            .where(and(
              eq(adCreatives.campaignId, campaign.id),
              eq(adCreatives.status, 'approved')
            ))
            .limit(1);

          if (creative) {
            const c = await localizeAdCreative(ctx.locale, creative);
            return {
              type: 'direct' as const,
              slotKey: input.slotKey,
              slotId: slot.id,
              campaignId: campaign.id,
              creativeId: creative.id,
              format: creative.format,
              fileUrl: creative.fileUrl,
              nativeHeadline: c.nativeHeadline,
              nativeDescription: c.nativeDescription,
              clickUrl: creative.clickUrl,
              nativeCta: c.nativeCta,
              dimensions: creative.dimensions || slot.dimensions,
              isPremium: !!slot.isPremium,
            };
          }
        }
      }

      // Priority 2: House ads
      for (const campaign of campaigns) {
        if (campaign.campaignType !== 'house') continue;
        const targetSlots = campaign.targetSlots ? JSON.parse(campaign.targetSlots as string) : null;
        if (!targetSlots || targetSlots.includes(slot.id)) {
          const houseCreatives = await database
            .select()
            .from(adCreatives)
            .where(and(
              eq(adCreatives.campaignId, campaign.id),
              eq(adCreatives.status, 'approved')
            ))
            .orderBy(asc(adCreatives.id));

          // Spread the house creatives across slots instead of taking the
          // first one every time — a page with six slots was rendering six
          // copies of the same ad. Keyed on the slot id rather than random
          // so a given slot is stable between renders and between SSR and
          // hydration.
          const creative = houseCreatives.length
            ? houseCreatives[slot.id % houseCreatives.length]
            : undefined;

          if (creative) {
            const c = await localizeAdCreative(ctx.locale, creative);
            return {
              type: 'house' as const,
              slotKey: input.slotKey,
              slotId: slot.id,
              campaignId: campaign.id,
              creativeId: creative.id,
              format: creative.format,
              fileUrl: creative.fileUrl,
              nativeHeadline: c.nativeHeadline,
              nativeDescription: c.nativeDescription,
              clickUrl: creative.clickUrl,
              nativeCta: c.nativeCta,
              dimensions: creative.dimensions || slot.dimensions,
              isPremium: 0,
            };
          }
        }
      }

      // Priority 3: AdSense fallback
      if (settings?.adsenseEnabled && settings?.publisherId) {
        const adsenseResult = {
          type: 'adsense' as const,
          slotKey: input.slotKey,
          slotId: slot.id,
          publisherId: settings.publisherId,
          adsenseSlotId: slot.adsenseSlotId,
          dimensions: slot.dimensions,
          isPremium: !!slot.isPremium,
        };
        lastKnownAdsense.set(input.slotKey, adsenseResult);
        return adsenseResult;
      }

      // Priority 4: Empty
      return { type: 'empty' as const, slotKey: input.slotKey };
      } catch (err) {
        console.error('[Ads] getAdForSlotV2 failed, serving last known good:', (err as Error).message);
        const cached = lastKnownAdsense.get(input.slotKey);
        if (cached) return cached as any;
        return { type: 'empty' as const, slotKey: input.slotKey };
      }
    }),

  // Delete campaign
  deleteCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      // Delete creatives first
      await database.delete(adCreatives).where(eq(adCreatives.campaignId, input.id));
      await database.delete(adCampaigns).where(eq(adCampaigns.id, input.id));
      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, 'delete', 'ad_campaigns', input.id, {});
      return { success: true };
    }),

  // Delete slot
  deleteSlot: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await database.delete(adSlots).where(eq(adSlots.id, input.id));
      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, 'delete', 'ad_slots', input.id, {});
      return { success: true };
    }),

  // List creatives
  listCreatives: protectedProcedure
    .input(z.object({
      campaignId: z.number().optional(),
      status: z.enum(['draft', 'pending_approval', 'approved', 'rejected']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) return [];
      const conditions = [];
      if (input.campaignId) conditions.push(eq(adCreatives.campaignId, input.campaignId));
      if (input.status) conditions.push(eq(adCreatives.status, input.status));
      return database
        .select()
        .from(adCreatives)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adCreatives.createdAt));
    }),

  // Delete creative
  deleteCreative: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await database.delete(adCreatives).where(eq(adCreatives.id, input.id));
      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, 'delete', 'ad_creatives', input.id, {});
      return { success: true };
    }),

  // ============================================================
  // ANALYTICS
  // ============================================================

  getRevenueReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ input, ctx }) => {
      if (!['admin', 'ad_ops', 'sales'].includes(ctx.user?.role ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const database = await getDb();
      if (!database) return { data: [], summary: { totalImpressions: 0, totalClicks: 0, totalRevenue: 0, avgCtr: 0 } };

      // Get per-campaign breakdown
      const campaignBreakdown = await database
        .select({
          id: adCampaigns.id,
          name: adCampaigns.name,
          type: adCampaigns.campaignType,
          status: adCampaigns.status,
          impressions: adCampaigns.impressions,
          clicks: adCampaigns.clicks,
          spend: adCampaigns.spend,
          budget: adCampaigns.budget,
          pricingModel: adCampaigns.pricingModel,
          pricePerUnit: adCampaigns.pricePerUnit,
          startDate: adCampaigns.startDate,
          endDate: adCampaigns.endDate,
        })
        .from(adCampaigns)
        .orderBy(desc(adCampaigns.impressions));

      const summary = campaignBreakdown.reduce((acc, c) => {
        acc.totalImpressions += c.impressions ?? 0;
        acc.totalClicks += c.clicks ?? 0;
        acc.totalRevenue += parseFloat(c.spend ?? '0');
        return acc;
      }, { totalImpressions: 0, totalClicks: 0, totalRevenue: 0, avgCtr: 0 });

      summary.avgCtr = summary.totalImpressions > 0
        ? (summary.totalClicks / summary.totalImpressions) * 100
        : 0;

      return {
        data: campaignBreakdown,
        summary,
      };
    }),
});
