/**
 * Writer Monetization Router
 * Handles writer applications, profiles, earnings, and payouts
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  writerApplications, 
  writerProfiles, 
  articleEarnings,
  writerPayouts,
  articles,
  users
} from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAudit } from "./rbac.router";

// Writer tier configuration
const WRITER_TIERS = {
  new: { name: "New Writer", revenueShareRate: 40, minArticles: 0 },
  regular: { name: "Regular Writer", revenueShareRate: 50, minArticles: 5 },
  senior: { name: "Senior Writer", revenueShareRate: 60, minArticles: 20 },
  expert: { name: "Expert Writer", revenueShareRate: 70, minArticles: 50 },
} as const;

export const writersRouter = router({
  // ============================================================
  // WRITER APPLICATIONS
  // ============================================================

  // Public: Submit writer application
  submitApplication: publicProcedure
    .input(z.object({
      email: z.string().email(),
      fullName: z.string().min(2).max(255),
      bio: z.string().min(50).max(2000),
      expertiseAreas: z.array(z.string()).min(1),
      writingSamples: z.array(z.string().url()).min(1).max(5),
      linkedinUrl: z.string().url().optional(),
      twitterHandle: z.string().optional(),
      portfolioUrl: z.string().url().optional(),
      whyJoin: z.string().min(100).max(5000).optional(),
      proposedTopics: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if application already exists
      const [existing] = await database
        .select()
        .from(writerApplications)
        .where(eq(writerApplications.email, input.email.toLowerCase()));

      if (existing && existing.status === "pending") {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "An application with this email is already pending review." 
        });
      }

      const [result] = await database.insert(writerApplications).values({
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        bio: input.bio,
        expertiseAreas: JSON.stringify(input.expertiseAreas),
        writingSamples: JSON.stringify(input.writingSamples),
        linkedinUrl: input.linkedinUrl ?? null,
        twitterHandle: input.twitterHandle ?? null,
        portfolioUrl: input.portfolioUrl ?? null,
        whyJoin: input.whyJoin ?? null,
        proposedTopics: input.proposedTopics ?? null,
        status: "pending",
      } as any);

      return { 
        success: true, 
        applicationId: result.insertId,
        message: "Your application has been submitted. We'll review it and get back to you within 5-7 business days."
      };
    }),

  // Admin: List applications
  listApplications: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "under_review", "approved", "rejected"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { applications: [], total: 0 };

      const conditions = [];
      if (input.status) conditions.push(eq(writerApplications.status, input.status));

      let query = database.select().from(writerApplications);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const applications = await query
        .orderBy(desc(writerApplications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(writerApplications)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        applications: applications.map(app => ({
          ...app,
          expertiseAreas: app.expertiseAreas ? JSON.parse(app.expertiseAreas as string) : [],
          writingSamples: app.writingSamples ? JSON.parse(app.writingSamples as string) : [],

        })),
        total: countResult?.count ?? 0,
      };
    }),

  // Admin: Review application
  reviewApplication: protectedProcedure
    .input(z.object({
      applicationId: z.number(),
      status: z.enum(["approved", "rejected", "under_review"]),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [application] = await database
        .select()
        .from(writerApplications)
        .where(eq(writerApplications.id, input.applicationId));

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      await database.update(writerApplications).set({
        status: input.status,
        reviewedById: ctx.user?.id ?? null,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes ?? null,
      } as any).where(eq(writerApplications.id, input.applicationId));

      // If approved, create user account and writer profile
      if (input.status === "approved") {
        // Check if user exists
        const [existingUser] = await database
          .select()
          .from(users)
          .where(eq(users.email, application.email));

        let userId: number;

        if (!existingUser) {
          // Create user account with a unique openId
          const openId = `writer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const [userResult] = await database.insert(users).values({
            openId,
            email: application.email,
            name: application.fullName,
            role: "author",
          } as any);
          userId = userResult.insertId;
        } else {
          userId = existingUser.id;
          // Update role to author if not already a privileged role
          if (existingUser.role !== "author" && existingUser.role !== "admin" && existingUser.role !== "editor" && existingUser.role !== "senior_editor") {
            await database.update(users).set({ role: "author" } as any).where(eq(users.id, userId));
          }
        }

        // Create writer profile
        const [existingProfile] = await database
          .select()
          .from(writerProfiles)
          .where(eq(writerProfiles.userId, userId));

        if (!existingProfile) {
          await database.insert(writerProfiles).values({
            userId,
            bio: application.bio,
            expertiseAreas: application.expertiseAreas,
            tier: "new",
            revenueShareRate: WRITER_TIERS.new.revenueShareRate.toFixed(2),
            status: "active",
          } as any);
        }
      }

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "review", "writer_applications", input.applicationId, {
        status: input.status,
        reviewNotes: input.reviewNotes,
      });

      return { success: true };
    }),

  // ============================================================
  // WRITER PROFILES
  // ============================================================

  // Get current user's writer profile
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return null;

    const [profile] = await database
      .select()
      .from(writerProfiles)
      .where(eq(writerProfiles.userId, ctx.user?.id ?? 0));

    if (!profile) return null;

    return {
      ...profile,
      expertiseAreas: profile.expertiseAreas ? JSON.parse(profile.expertiseAreas as string) : [],
      tierInfo: WRITER_TIERS[profile.tier as keyof typeof WRITER_TIERS],
    };
  }),

  // Admin: List all writer profiles
  listProfiles: protectedProcedure
    .input(z.object({
      tier: z.enum(["new", "regular", "senior", "expert"]).optional(),
      isActive: z.boolean().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { profiles: [], total: 0 };

      const conditions = [];
      if (input.tier) conditions.push(eq(writerProfiles.tier, input.tier));
      if (input.isActive !== undefined) conditions.push(eq(writerProfiles.status, input.isActive ? "active" : "paused"));

      const profiles = await database
        .select({
          profile: writerProfiles,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(writerProfiles)
        .leftJoin(users, eq(writerProfiles.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(writerProfiles.totalEarnings))
        .limit(input.limit)
        .offset(input.offset);

      return {
        profiles: profiles.map(p => ({
          ...p.profile,
          user: p.user,
          expertiseAreas: p.profile.expertiseAreas ? JSON.parse(p.profile.expertiseAreas as string) : [],
          tierInfo: WRITER_TIERS[p.profile.tier as keyof typeof WRITER_TIERS],
        })),
        total: profiles.length,
      };
    }),

  // Admin: Update writer profile
  updateProfile: protectedProcedure
    .input(z.object({
      userId: z.number(),
      tier: z.enum(["new", "regular", "senior", "expert"]).optional(),
      revenueShareRate: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
      paymentMethod: z.enum(["bank_transfer", "paypal", "wise"]).optional(),
      paymentDetails: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { userId, ...updateData } = input;

      // If tier is updated, also update revenue share rate
      const finalUpdateData: Record<string, unknown> = { ...updateData };
      if (updateData.tier && !updateData.revenueShareRate) {
        finalUpdateData.revenueShareRate = WRITER_TIERS[updateData.tier].revenueShareRate.toFixed(2);
      } else if (updateData.revenueShareRate) {
        finalUpdateData.revenueShareRate = updateData.revenueShareRate.toFixed(2);
      }

      await database.update(writerProfiles).set(finalUpdateData as any).where(eq(writerProfiles.userId, userId));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "writer_profiles", userId, updateData);

      return { success: true };
    }),

  // ============================================================
  // ARTICLE EARNINGS
  // ============================================================

  // Get earnings for current writer
  getMyEarnings: protectedProcedure
    .input(z.object({
      startMonth: z.string().optional(), // YYYY-MM format
      endMonth: z.string().optional(),
      status: z.enum(["pending", "calculated", "paid"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) return { earnings: [], total: 0, pending: 0, paid: 0 };

      const conditions = [eq(articleEarnings.writerId, ctx.user?.id ?? 0)];
      
      if (input.startMonth) {
        conditions.push(gte(articleEarnings.periodMonth, input.startMonth));
      }
      if (input.endMonth) {
        conditions.push(lte(articleEarnings.periodMonth, input.endMonth));
      }
      if (input.status) {
        conditions.push(eq(articleEarnings.status, input.status));
      }

      const earnings = await database
        .select({
          earning: articleEarnings,
          article: {
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
          },
        })
        .from(articleEarnings)
        .leftJoin(articles, eq(articleEarnings.articleId, articles.id))
        .where(and(...conditions))
        .orderBy(desc(articleEarnings.periodMonth));

      // Calculate totals
      const [totals] = await database
        .select({
          total: sql<number>`COALESCE(SUM(CAST(writerShare AS DECIMAL(10,2))), 0)`,
          pending: sql<number>`COALESCE(SUM(CASE WHEN status IN ('pending', 'calculated') THEN CAST(writerShare AS DECIMAL(10,2)) ELSE 0 END), 0)`,
          paid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(writerShare AS DECIMAL(10,2)) ELSE 0 END), 0)`,
        })
        .from(articleEarnings)
        .where(eq(articleEarnings.writerId, ctx.user?.id ?? 0));

      return {
        earnings,
        total: totals?.total ?? 0,
        pending: totals?.pending ?? 0,
        paid: totals?.paid ?? 0,
      };
    }),

  // Admin: Calculate earnings for an article
  calculateArticleEarnings: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      periodMonth: z.string(), // YYYY-MM format
      pageviews: z.number(),
      directAdRevenue: z.number(),
      adsenseRevenueEstimated: z.number().default(0),
      affiliateRevenue: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get article and writer info
      const [article] = await database
        .select({
          id: articles.id,
          authorId: articles.authorId,
        })
        .from(articles)
        .where(eq(articles.id, input.articleId));

      if (!article || !article.authorId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Article or author not found" });
      }

      // Get writer's revenue share rate
      const [writerProfile] = await database
        .select()
        .from(writerProfiles)
        .where(eq(writerProfiles.userId, article.authorId));

      const revenueShareRate = writerProfile?.revenueShareRate ? parseFloat(writerProfile.revenueShareRate) : WRITER_TIERS.new.revenueShareRate;
      const totalRevenue = input.directAdRevenue + input.adsenseRevenueEstimated + input.affiliateRevenue;
      const writerShare = totalRevenue * (revenueShareRate / 100);

      const [result] = await database.insert(articleEarnings).values({
        articleId: input.articleId,
        writerId: article.authorId,
        periodMonth: input.periodMonth,
        pageviews: input.pageviews,
        directAdRevenue: input.directAdRevenue.toFixed(2),
        adsenseRevenueEstimated: input.adsenseRevenueEstimated.toFixed(2),
        affiliateRevenue: input.affiliateRevenue.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        writerShare: writerShare.toFixed(2),
        status: "calculated",
      } as any);

      return { success: true, earningId: result.insertId, writerShare };
    }),

  // Admin: Mark earnings as paid
  markEarningsPaid: protectedProcedure
    .input(z.object({
      earningIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      for (const earningId of input.earningIds) {
        await database.update(articleEarnings).set({
          status: "paid",
        } as any).where(eq(articleEarnings.id, earningId));
      }

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "mark_paid", "article_earnings", 0, {
        earningIds: input.earningIds,
      });

      return { success: true };
    }),

  // ============================================================
  // PAYOUTS
  // ============================================================

  // Get payouts for current writer
  getMyPayouts: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];

    const payouts = await database
      .select()
      .from(writerPayouts)
      .where(eq(writerPayouts.writerId, ctx.user?.id ?? 0))
      .orderBy(desc(writerPayouts.createdAt));

    return payouts;
  }),

  // Admin: List all pending payouts
  listPendingPayouts: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return [];

    // Get writers with calculated earnings that haven't been paid
    const pendingPayouts = await database
      .select({
        writerId: articleEarnings.writerId,
        writerName: users.name,
        writerEmail: users.email,
        totalPending: sql<number>`SUM(CAST(writerShare AS DECIMAL(10,2)))`,
        articleCount: sql<number>`COUNT(*)`,
      })
      .from(articleEarnings)
      .leftJoin(users, eq(articleEarnings.writerId, users.id))
      .where(eq(articleEarnings.status, "calculated"))
      .groupBy(articleEarnings.writerId, users.name, users.email);

    return pendingPayouts;
  }),

  // Admin: Create payout
  createPayout: protectedProcedure
    .input(z.object({
      writerId: z.number(),
      periodMonth: z.string(), // YYYY-MM format
      paymentMethod: z.enum(["bank_transfer", "paypal", "wise"]),
      paymentReference: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Calculate total amount from calculated earnings
      const earnings = await database
        .select()
        .from(articleEarnings)
        .where(and(
          eq(articleEarnings.writerId, input.writerId),
          eq(articleEarnings.status, "calculated")
        ));

      const totalAmount = earnings.reduce((sum, e) => sum + parseFloat(e.writerShare ?? "0"), 0);

      if (totalAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No calculated earnings to pay out" });
      }

      // Create payout record
      const [result] = await database.insert(writerPayouts).values({
        writerId: input.writerId,
        amount: totalAmount.toFixed(2),
        currency: "USD",
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference ?? null,
        status: "pending",
        periodMonth: input.periodMonth,
        notes: input.notes ?? null,
        processedById: ctx.user?.id ?? null,
      } as any);

      // Update earnings to paid status
      for (const earning of earnings) {
        await database.update(articleEarnings).set({
          status: "paid",
        } as any).where(eq(articleEarnings.id, earning.id));
      }

      // Update writer's total earnings
      await database.update(writerProfiles).set({
        totalEarnings: sql`${writerProfiles.totalEarnings} + ${totalAmount}`,
        totalArticles: sql`${writerProfiles.totalArticles} + ${earnings.length}`,
      } as any).where(eq(writerProfiles.userId, input.writerId));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "writer_payouts", result.insertId, {
        writerId: input.writerId,
        amount: totalAmount,
      });

      return { success: true, payoutId: result.insertId, amount: totalAmount };
    }),

  // Admin: Mark payout as completed
  completePayout: protectedProcedure
    .input(z.object({
      payoutId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database.update(writerPayouts).set({
        status: "completed",
        processedAt: new Date(),
      } as any).where(eq(writerPayouts.id, input.payoutId));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "complete", "writer_payouts", input.payoutId, {});

      return { success: true };
    }),

  // ============================================================
  // STATS
  // ============================================================

  getWriterStats: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "finance"].includes(ctx.user?.role ?? "")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return null;

    // Get writer counts by tier
    const [tierStats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        new: sql<number>`SUM(CASE WHEN tier = 'new' THEN 1 ELSE 0 END)`,
        regular: sql<number>`SUM(CASE WHEN tier = 'regular' THEN 1 ELSE 0 END)`,
        senior: sql<number>`SUM(CASE WHEN tier = 'senior' THEN 1 ELSE 0 END)`,
        expert: sql<number>`SUM(CASE WHEN tier = 'expert' THEN 1 ELSE 0 END)`,
        active: sql<number>`SUM(CASE WHEN isActive = true THEN 1 ELSE 0 END)`,
      })
      .from(writerProfiles);

    // Get application stats
    const [applicationStats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
      })
      .from(writerApplications);

    // Get earnings stats
    const [earningsStats] = await database
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(totalRevenue AS DECIMAL(10,2))), 0)`,
        totalWriterEarnings: sql<number>`COALESCE(SUM(CAST(writerShare AS DECIMAL(10,2))), 0)`,
        pendingPayouts: sql<number>`COALESCE(SUM(CASE WHEN status = 'calculated' THEN CAST(writerShare AS DECIMAL(10,2)) ELSE 0 END), 0)`,
      })
      .from(articleEarnings);

    return {
      writers: tierStats,
      applications: applicationStats,
      earnings: earningsStats,
    };
  }),
});
