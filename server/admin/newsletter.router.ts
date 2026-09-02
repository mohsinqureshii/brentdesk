/**
 * Newsletter Router - Subscriber and Email Campaign Management
 * Handles subscribers, lists, campaigns, and lead capture
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  subscribers, 
  subscriptionLists, 
  subscriberLists,
  emailCampaigns,
  leads,
  gatedDownloads
} from "../../drizzle/schema";
import { eq, and, desc, like, sql, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAudit } from "./rbac.router";
import crypto from "crypto";
import { toDbDate } from "../_core/dbValues";

// Generate verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const newsletterRouter = router({
  // ============================================================
  // SUBSCRIPTION LISTS
  // ============================================================

  listSubscriptionLists: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];

    const lists = await database
      .select()
      .from(subscriptionLists)
      .where(eq(subscriptionLists.isActive, 1))
      .orderBy(subscriptionLists.name);

    return lists;
  }),

  getPublicLists: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];

    const lists = await database
      .select({
        id: subscriptionLists.id,
        name: subscriptionLists.name,
        slug: subscriptionLists.slug,
        description: subscriptionLists.description,
        frequency: subscriptionLists.frequency,
        isDefault: subscriptionLists.isDefault,
      })
      .from(subscriptionLists)
      .where(and(
        eq(subscriptionLists.isActive, 1),
        eq(subscriptionLists.isPublic, 1)
      ))
      .orderBy(subscriptionLists.name);

    return lists;
  }),

  createList: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slug: z.string().min(1).max(128),
      description: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "on_demand"]).default("weekly"),
      isPublic: z.boolean().default(true),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(subscriptionLists).values({
        name: input.name,
        slug: input.slug.toLowerCase().replace(/\s+/g, "-"),
        description: input.description ?? null,
        frequency: input.frequency,
        isPublic: input.isPublic,
        isDefault: input.isDefault,
      } as any);

      return { success: true, id: result.insertId };
    }),

  // ============================================================
  // SUBSCRIBERS
  // ============================================================

  listSubscribers: protectedProcedure
    .input(z.object({
      listId: z.number().optional(),
      status: z.enum(["active", "unsubscribed", "bounced", "complained"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { subscribers: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(subscribers.status, input.status));
      if (input.search) {
        conditions.push(sql`LOWER(${subscribers.email}) LIKE LOWER(${`%${input.search}%`})`);
      }

      let query = database.select().from(subscribers);
      
      if (input.listId) {
        // Join with subscriber_lists to filter by list
        query = database
          .select({ subscriber: subscribers })
          .from(subscribers)
          .innerJoin(subscriberLists, eq(subscribers.id, subscriberLists.subscriberId))
          .where(and(
            eq(subscriberLists.listId, input.listId),
            isNull(subscriberLists.unsubscribedAt),
            ...(conditions.length > 0 ? conditions : [])
          )) as unknown as typeof query;
      } else if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const subscribersList = await query
        .orderBy(desc(subscribers.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(subscribers);

      return {
        subscribers: subscribersList,
        total: countResult?.count ?? 0,
      };
    }),

  getSubscriber: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;

      const [subscriber] = await database
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, input.id));

      if (!subscriber) return null;

      // Get subscriber's lists
      const lists = await database
        .select({
          list: subscriptionLists,
          subscribedAt: subscriberLists.subscribedAt,
        })
        .from(subscriberLists)
        .innerJoin(subscriptionLists, eq(subscriberLists.listId, subscriptionLists.id))
        .where(and(
          eq(subscriberLists.subscriberId, input.id),
          isNull(subscriberLists.unsubscribedAt)
        ));

      return {
        ...subscriber,
        lists,
      };
    }),

  // Public subscribe endpoint
  subscribe: publicProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      subscriberType: z.enum(["founder", "investor", "employee", "job_seeker", "journalist", "general"]).optional(),
      companyName: z.string().optional(),
      jobTitle: z.string().optional(),
      listSlugs: z.array(z.string()).optional(), // Subscribe to specific lists by slug
      source: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      consentMarketing: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if subscriber already exists
      const [existing] = await database
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, input.email.toLowerCase()));

      let subscriberId: number;
      const verificationToken = generateVerificationToken();

      if (existing) {
        // Update existing subscriber if they're resubscribing
        if (existing.status === "unsubscribed") {
          await database
            .update(subscribers)
            .set({
              status: "active",
              firstName: input.firstName ?? existing.firstName,
              lastName: input.lastName ?? existing.lastName,
              subscriberType: input.subscriberType ?? existing.subscriberType,
              companyName: input.companyName ?? existing.companyName,
              jobTitle: input.jobTitle ?? existing.jobTitle,
              verificationToken,
              isVerified: 0,
            } as any)
            .where(eq(subscribers.id, existing.id));
        }
        subscriberId = existing.id;
      } else {
        // Create new subscriber
        const [result] = await database.insert(subscribers).values({
          email: input.email.toLowerCase(),
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          subscriberType: input.subscriberType ?? "general",
          companyName: input.companyName ?? null,
          jobTitle: input.jobTitle ?? null,
          source: input.source ?? "website",
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          verificationToken,
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        } as any);
        subscriberId = result.insertId;
      }

      // Subscribe to lists
      let listIds: number[] = [];
      
      if (input.listSlugs && input.listSlugs.length > 0) {
        // Get list IDs from slugs
        const lists = await database
          .select({ id: subscriptionLists.id })
          .from(subscriptionLists)
          .where(inArray(subscriptionLists.slug, input.listSlugs));
        listIds = lists.map(l => l.id);
      } else {
        // Subscribe to default list
        const [defaultList] = await database
          .select({ id: subscriptionLists.id })
          .from(subscriptionLists)
          .where(eq(subscriptionLists.isDefault, 1));
        if (defaultList) listIds = [defaultList.id];
      }

      // Add subscriber to lists
      for (const listId of listIds) {
        // Check if already subscribed
        const [existingSubscription] = await database
          .select()
          .from(subscriberLists)
          .where(and(
            eq(subscriberLists.subscriberId, subscriberId),
            eq(subscriberLists.listId, listId)
          ));

        if (!existingSubscription) {
          await database.insert(subscriberLists).values({
            subscriberId,
            listId,
          } as any);

          // Update subscriber count
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`${subscriptionLists.subscriberCount} + 1` } as any)
            .where(eq(subscriptionLists.id, listId));
        } else if (existingSubscription.unsubscribedAt) {
          // Resubscribe
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: null, subscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscriberLists.id, existingSubscription.id));
        }
      }

      // TODO: Send verification email

      return { 
        success: true, 
        subscriberId,
        message: "Please check your email to verify your subscription.",
      };
    }),

  // Public unsubscribe endpoint
  unsubscribe: publicProcedure
    .input(z.object({
      email: z.string().email(),
      listSlug: z.string().optional(), // Unsubscribe from specific list
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [subscriber] = await database
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, input.email.toLowerCase()));

      if (!subscriber) {
        return { success: true, message: "Unsubscribed successfully." };
      }

      if (input.listSlug) {
        // Unsubscribe from specific list
        const [list] = await database
          .select({ id: subscriptionLists.id })
          .from(subscriptionLists)
          .where(eq(subscriptionLists.slug, input.listSlug));

        if (list) {
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: toDbDate(new Date()) } as any)
            .where(and(
              eq(subscriberLists.subscriberId, subscriber.id),
              eq(subscriberLists.listId, list.id)
            ));

          // Update subscriber count
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`GREATEST(${subscriptionLists.subscriberCount} - 1, 0)` } as any)
            .where(eq(subscriptionLists.id, list.id));
        }
      } else {
        // Unsubscribe from all lists
        await database
          .update(subscribers)
          .set({
            status: "unsubscribed",
            unsubscribedAt: toDbDate(new Date()),
            unsubscribeReason: input.reason ?? null,
          } as any)
          .where(eq(subscribers.id, subscriber.id));

        await database
          .update(subscriberLists)
          .set({ unsubscribedAt: toDbDate(new Date()) } as any)
          .where(eq(subscriberLists.subscriberId, subscriber.id));
      }

      return { success: true, message: "Unsubscribed successfully." };
    }),

  // ============================================================
  // EMAIL CAMPAIGNS
  // ============================================================

  listCampaigns: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "scheduled", "sending", "sent", "cancelled"]).optional(),
      listId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { campaigns: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(emailCampaigns.status, input.status));
      if (input.listId) conditions.push(eq(emailCampaigns.listId, input.listId));

      let query = database.select().from(emailCampaigns);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const campaigns = await query
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        campaigns,
        total: campaigns.length,
      };
    }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return null;

      const [campaign] = await database
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, input.id));

      return campaign;
    }),

  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      subject: z.string().min(1).max(255),
      preheader: z.string().max(255).optional(),
      listId: z.number().optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(emailCampaigns).values({
        name: input.name,
        subject: input.subject,
        preheader: input.preheader ?? null,
        listId: input.listId ?? null,
        htmlContent: input.htmlContent ?? null,
        textContent: input.textContent ?? null,
        createdById: ctx.user?.id ?? null,
        status: "draft",
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "email_campaigns", result.insertId, { name: input.name });

      return { success: true, id: result.insertId };
    }),

  updateCampaign: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      subject: z.string().min(1).max(255).optional(),
      preheader: z.string().max(255).optional(),
      listId: z.number().optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      scheduledAt: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, scheduledAt, ...updateData } = input;
      const finalUpdateData: Record<string, unknown> = { ...updateData };
      
      if (scheduledAt) {
        finalUpdateData.scheduledAt = new Date(scheduledAt);
        finalUpdateData.status = "scheduled";
      }

      await database.update(emailCampaigns).set(finalUpdateData as any).where(eq(emailCampaigns.id, id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "email_campaigns", id, updateData);

      return { success: true };
    }),

  // ============================================================
  // LEADS
  // ============================================================

  listLeads: protectedProcedure
    .input(z.object({
      status: z.enum(["new", "contacted", "qualified", "converted", "disqualified"]).optional(),
      source: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { leads: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(leads.status, input.status));
      if (input.source) conditions.push(eq(leads.source, input.source));

      let query = database.select().from(leads);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const leadsList = await query
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(leads);

      return {
        leads: leadsList,
        total: countResult?.count ?? 0,
      };
    }),

  // Public lead capture endpoint
  captureLead: publicProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      jobTitle: z.string().optional(),
      phone: z.string().optional(),
      source: z.string(),
      sourceResourceId: z.number().optional(),
      consentMarketing: z.boolean().default(false),
      consentPartnerShare: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(leads).values({
        email: input.email.toLowerCase(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
        jobTitle: input.jobTitle ?? null,
        phone: input.phone ?? null,
        source: input.source,
        sourceResourceId: input.sourceResourceId ?? null,
        sourceUrl: ctx.req.headers.referer ?? null,
        consentMarketing: input.consentMarketing,
        consentPartnerShare: input.consentPartnerShare,
        consentTimestamp: new Date(),
        ipAddress: ctx.req.ip ?? null,
        countryCode: null, // Could be derived from IP
      } as any);

      // Also subscribe to newsletter if consent given
      if (input.consentMarketing) {
        // Check if subscriber exists
        const [existingSubscriber] = await database
          .select()
          .from(subscribers)
          .where(eq(subscribers.email, input.email.toLowerCase()));

        if (!existingSubscriber) {
          await database.insert(subscribers).values({
            email: input.email.toLowerCase(),
            firstName: input.firstName ?? null,
            lastName: input.lastName ?? null,
            companyName: input.companyName ?? null,
            jobTitle: input.jobTitle ?? null,
            source: input.source,
          } as any);
        }
      }

      return { success: true, leadId: result.insertId };
    }),

  updateLeadStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "qualified", "converted", "disqualified"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database.update(leads).set({ status: input.status } as any).where(eq(leads.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update_status", "leads", input.id, { status: input.status });

      return { success: true };
    }),

  // ============================================================
  // STATS
  // ============================================================

  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return null;

    // Get subscriber stats
    const [subscriberStats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
        unsubscribed: sql<number>`SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END)`,
      })
      .from(subscribers);

    // Get lead stats
    const [leadStats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        new: sql<number>`SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END)`,
        qualified: sql<number>`SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END)`,
        converted: sql<number>`SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END)`,
      })
      .from(leads);

    // Get campaign stats
    const [campaignStats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`,
        totalOpens: sql<number>`COALESCE(SUM(openCount), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(clickCount), 0)`,
      })
      .from(emailCampaigns);

    return {
      subscribers: subscriberStats,
      leads: leadStats,
      campaigns: campaignStats,
    };
  }),
});
