/**
 * Claimed Profiles Router
 * Multi-stage claim workflow: pending → under_review → approved / rejected / needs_clarification
 * Tracks review history for audit trail
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  claimedProfiles,
  claimReviewHistory,
  people,
  companies,
  accelerators,
  events,
  investors,
  users,
  jobs,
  jobApplications,
  jobClicks,
  entityTeamMembers,
} from "../../../drizzle/schema";
import { eq, and, desc, sql, like, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { toDbDate } from "../../_core/dbValues";

const entityTypeEnum = z.enum(["person", "company", "accelerator", "event", "investor"]);

// Helper to get entity details by type and id
async function getEntityDetails(database: any, entityType: string, entityId: number) {
  switch (entityType) {
    case "person": {
      const [person] = await database.select({
        name: people.name,
        slug: people.slug,
        logo: people.avatar,
      }).from(people).where(eq(people.id, entityId));
      return person;
    }
    case "company": {
      const [company] = await database.select({
        name: companies.name,
        slug: companies.slug,
        logo: companies.logo,
      }).from(companies).where(eq(companies.id, entityId));
      return company;
    }
    case "accelerator": {
      const [acc] = await database.select({
        name: accelerators.name,
        slug: accelerators.slug,
        logo: accelerators.logo,
      }).from(accelerators).where(eq(accelerators.id, entityId));
      return acc;
    }
    case "event": {
      const [evt] = await database.select({
        name: events.title,
        slug: events.slug,
        logo: events.featuredImage,
      }).from(events).where(eq(events.id, entityId));
      return evt;
    }
    case "investor": {
      const [inv] = await database.select({
        name: investors.name,
        slug: investors.slug,
        logo: investors.logo,
      }).from(investors).where(eq(investors.id, entityId));
      return inv;
    }
    default:
      return null;
  }
}

export const claimedProfilesRouter = router({
  // ============================================================
  // USER ENDPOINTS
  // ============================================================

  // Claim a profile (with full form: reason, proof, companyEmail)
  claimProfile: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
      requestNote: z.string().max(2000),
      proofText: z.string().max(2000).optional(),
      companyEmail: z.string().email().max(320).optional(),
      role: z.enum(["owner", "admin", "editor"]).default("owner"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if already claimed by this user
      const existing = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
        ));

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `You have already claimed this ${input.entityType}. Status: ${existing[0].status}`,
        });
      }

      // Get entity details
      const entity = await getEntityDetails(database, input.entityType, input.entityId);
      if (!entity) {
        throw new TRPCError({ code: "NOT_FOUND", message: `${input.entityType} not found` });
      }

      const [result] = await database.insert(claimedProfiles).values({
        userId: ctx.user.id,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: entity.name,
        entitySlug: entity.slug,
        entityLogo: entity.logo,
        requestNote: input.requestNote,
        proofText: input.proofText || null,
        companyEmail: input.companyEmail || null,
        role: input.role,
        status: "pending",
      } as any);

      // Add initial history entry
      await database.insert(claimReviewHistory).values({
        claimId: result.insertId,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.name || "User",
        action: "submitted",
        comment: input.requestNote,
        fromStatus: null,
        toStatus: "pending",
      } as any);

      return { success: true, id: result.insertId, status: "pending" };
    }),

  // List my claimed profiles
  myClaimedProfiles: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "under_review", "needs_clarification", "approved", "rejected", "all"]).default("all"),
    }).optional())
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions: any[] = [eq(claimedProfiles.userId, ctx.user.id)];
      const statusFilter = input?.status || "all";
      if (statusFilter !== "all") {
        conditions.push(eq(claimedProfiles.status, statusFilter as any));
      }

      const profiles = await database.select()
        .from(claimedProfiles)
        .where(and(...conditions))
        .orderBy(desc(claimedProfiles.createdAt));

      return profiles;
    }),

  // Remove a claimed profile (user can remove their own pending/rejected claims)
  removeClaim: protectedProcedure
    .input(z.object({ claimId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.id, input.claimId),
          eq(claimedProfiles.userId, ctx.user.id),
        ));

      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

      await database.delete(claimedProfiles).where(eq(claimedProfiles.id, input.claimId));
      return { success: true };
    }),

  // Check if user has claimed a specific entity
  checkClaim: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) return { claimed: false, status: null, role: null };

      const database = await getDb();
      if (!database) return { claimed: false, status: null, role: null };

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
        ));

      return {
        claimed: !!claim,
        status: claim?.status || null,
        role: claim?.role || null,
      };
    }),

  // Get stats for a claimed profile
  getClaimedProfileStats: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (!claim) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have an approved claim for this profile" });
      }

      let jobCount = 0;
      if (input.entityType === "company") {
        const [jobResult] = await database.select({
          count: sql<number>`COUNT(*)`,
        }).from(jobs).where(eq(jobs.companyId, input.entityId));
        jobCount = jobResult?.count || 0;
      }

      return {
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: claim.entityName,
        jobCount,
        role: claim.role,
      };
    }),

  // Search entities by type for claiming
  searchEntities: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      query: z.string().min(2).max(100),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const searchPattern = `%${input.query}%`;
      let results: { id: number; name: string; description?: string | null }[] = [];

      switch (input.entityType) {
        case "company": {
          results = await database.select({
            id: companies.id,
            name: companies.name,
            description: companies.description,
          }).from(companies)
            .where(sql`LOWER(${companies.name}) LIKE LOWER(${searchPattern})`)
            .limit(10);
          break;
        }
        case "person": {
          results = await database.select({
            id: people.id,
            name: people.name,
            description: people.title,
          }).from(people)
            .where(sql`LOWER(${people.name}) LIKE LOWER(${searchPattern})`)
            .limit(10);
          break;
        }
        case "accelerator": {
          results = await database.select({
            id: accelerators.id,
            name: accelerators.name,
            description: accelerators.description,
          }).from(accelerators)
            .where(sql`LOWER(${accelerators.name}) LIKE LOWER(${searchPattern})`)
            .limit(10);
          break;
        }
        case "event": {
          results = await database.select({
            id: events.id,
            name: events.title,
            description: events.description,
          }).from(events)
            .where(sql`LOWER(${events.title}) LIKE LOWER(${searchPattern})`)
            .limit(10);
          break;
        }
        case "investor": {
          results = await database.select({
            id: investors.id,
            name: investors.name,
            description: investors.description,
          }).from(investors)
            .where(sql`LOWER(${investors.name}) LIKE LOWER(${searchPattern})`)
            .limit(10);
          break;
        }
      }

      return results;
    }),

  // Check if an entity has any approved claim (public - for showing claimed badge)
  getClaimStatus: publicProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return { isClaimed: 0 };

      const [claim] = await database.select({
        id: claimedProfiles.id,
        userId: claimedProfiles.userId,
        role: claimedProfiles.role,
        entityName: claimedProfiles.entityName,
      }).from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
          eq(claimedProfiles.status, "approved"),
        ))
        .limit(1);

      return {
        isClaimed: !!claim,
        claimedByUserId: claim?.userId || null,
      };
    }),

  // ============================================================
  // COMPANY JOBS DASHBOARD (for claimed company owners)
  // ============================================================

  companyJobsDashboard: protectedProcedure
    .input(z.object({
      companyId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify the user has an approved claim for this company
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (!claim) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have an approved claim for this company" });
      }

      // Get all jobs for this company
      const companyJobs = await database.select()
        .from(jobs)
        .where(eq(jobs.companyId, input.companyId))
        .orderBy(desc(jobs.createdAt));

      // Get application counts per job
      const jobIds = companyJobs.map(j => j.id);
      let applicationStats: Record<number, { total: number; new: number; shortlisted: number; rejected: number }> = {};
      let interestStats: Record<number, { views: number; clicks: number; saves: number }> = {};

      if (jobIds.length > 0) {
        // Get application counts
        const appCounts = await database.select({
          jobId: jobApplications.jobId,
          status: jobApplications.status,
          count: sql<number>`COUNT(*)`,
        }).from(jobApplications)
          .where(sql`${jobApplications.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(jobApplications.jobId, jobApplications.status);

        for (const row of appCounts) {
          if (!applicationStats[row.jobId]) {
            applicationStats[row.jobId] = { total: 0, new: 0, shortlisted: 0, rejected: 0 };
          }
          applicationStats[row.jobId].total += row.count;
          if (row.status === "new") applicationStats[row.jobId].new += row.count;
          if (row.status === "shortlisted") applicationStats[row.jobId].shortlisted += row.count;
          if (row.status === "rejected") applicationStats[row.jobId].rejected += row.count;
        }

        // Get interest counts
        const intCounts = await database.select({
          jobId: jobClicks.jobId,
          clickType: jobClicks.clickType,
          count: sql<number>`COUNT(*)`,
        }).from(jobClicks)
          .where(sql`${jobClicks.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(jobClicks.jobId, jobClicks.clickType);

        for (const row of intCounts) {
          if (!interestStats[row.jobId]) {
            interestStats[row.jobId] = { views: 0, clicks: 0, saves: 0 };
          }
          if (row.clickType === "view") interestStats[row.jobId].views += row.count;
          if (row.clickType === "apply_click") interestStats[row.jobId].clicks += row.count;
          if (row.clickType === "save") interestStats[row.jobId].saves += row.count;
        }
      }

      // Calculate totals
      const totalApplications = Object.values(applicationStats as any).reduce((sum: number, s: any) => sum + s.total, 0);
      const totalNew = Object.values(applicationStats as any).reduce((sum: number, s: any) => sum + s.new, 0);
      const totalViews = Object.values(interestStats as any).reduce((sum: number, s: any) => sum + s.views, 0);
      const totalClicks = Object.values(interestStats as any).reduce((sum: number, s: any) => sum + s.clicks, 0);

      return {
        company: {
          id: input.companyId,
          name: claim.entityName,
          logo: claim.entityLogo,
        },
        summary: {
          totalJobs: companyJobs.length,
          activeJobs: companyJobs.filter(j => j.statusId != null).length,
          totalApplications,
          newApplications: totalNew,
          totalViews,
          totalClicks,
        },
        jobs: companyJobs.map(job => ({
          ...job,
          applications: applicationStats[job.id] || { total: 0, new: 0, shortlisted: 0, rejected: 0 },
          interest: interestStats[job.id] || { views: 0, clicks: 0, saves: 0 },
        })),
      };
    }),

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  // Admin: List all claims (for review)
  adminListClaims: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "under_review", "needs_clarification", "approved", "rejected", "all"]).default("pending"),
      entityType: entityTypeEnum.optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.role || !["admin", "editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions: any[] = [];
      if (input.status !== "all") {
        conditions.push(eq(claimedProfiles.status, input.status as any));
      }
      if (input.entityType) {
        conditions.push(eq(claimedProfiles.entityType, input.entityType));
      }

      const offset = (input.page - 1) * input.limit;

      const claims = await database.select({
        claim: claimedProfiles,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
        .from(claimedProfiles)
        .leftJoin(users, eq(claimedProfiles.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(claimedProfiles.createdAt))
        .limit(input.limit)
        .offset(offset);

      const [countResult] = await database.select({
        total: sql<number>`COUNT(*)`,
      }).from(claimedProfiles)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get counts per status for tabs
      const statusCounts = await database.select({
        status: claimedProfiles.status,
        count: sql<number>`COUNT(*)`,
      }).from(claimedProfiles)
        .groupBy(claimedProfiles.status);

      const counts: Record<string, number> = { all: 0, pending: 0, under_review: 0, needs_clarification: 0, approved: 0, rejected: 0 };
      for (const row of statusCounts) {
        counts[row.status] = row.count;
        counts.all += row.count;
      }

      return {
        claims: claims.map(c => ({
          ...c.claim,
          userName: c.userName,
          userEmail: c.userEmail,
          userAvatar: c.userAvatar,
        })),
        counts,
        total: countResult?.total || 0,
        page: input.page,
        totalPages: Math.ceil((countResult?.total || 0) / input.limit),
      };
    }),

  // ============================================================
  // COMPANY JOBS ANALYTICS - TIME SERIES
  // ============================================================
  companyJobsTimeSeries: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      days: z.number().min(7).max(90).default(30),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify claim
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (!claim) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have an approved claim for this company" });
      }

      // Get job IDs for this company
      const companyJobs = await database.select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.companyId, input.companyId));
      const jobIds = companyJobs.map(j => j.id);

      if (jobIds.length === 0) {
        return { views: [], applications: [], clicks: [] };
      }

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - input.days);

      // Views time series from jobClicks
      const viewsSeries = await database.select({
        date: sql<string>`DATE(${jobClicks.createdAt})`,
        count: sql<number>`COUNT(*)`,
      }).from(jobClicks)
        .where(and(
          sql`${jobClicks.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`,
          eq(jobClicks.clickType, "view"),
          sql`${jobClicks.createdAt} >= ${sinceDate}`,
        ))
        .groupBy(sql`DATE(${jobClicks.createdAt})`)
        .orderBy(sql`DATE(${jobClicks.createdAt})`);

      // Apply clicks time series
      const clicksSeries = await database.select({
        date: sql<string>`DATE(${jobClicks.createdAt})`,
        count: sql<number>`COUNT(*)`,
      }).from(jobClicks)
        .where(and(
          sql`${jobClicks.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`,
          eq(jobClicks.clickType, "apply_click"),
          sql`${jobClicks.createdAt} >= ${sinceDate}`,
        ))
        .groupBy(sql`DATE(${jobClicks.createdAt})`)
        .orderBy(sql`DATE(${jobClicks.createdAt})`);

      // Applications time series
      const appsSeries = await database.select({
        date: sql<string>`DATE(${jobApplications.createdAt})`,
        count: sql<number>`COUNT(*)`,
      }).from(jobApplications)
        .where(and(
          sql`${jobApplications.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${jobApplications.createdAt} >= ${sinceDate}`,
        ))
        .groupBy(sql`DATE(${jobApplications.createdAt})`)
        .orderBy(sql`DATE(${jobApplications.createdAt})`);

      return {
        views: viewsSeries.map(r => ({ date: String(r.date), count: Number(r.count) })),
        applications: appsSeries.map(r => ({ date: String(r.date), count: Number(r.count) })),
        clicks: clicksSeries.map(r => ({ date: String(r.date), count: Number(r.count) })),
      };
    }),

  // ============================================================
  // COMPANY JOBS CSV EXPORT
  // ============================================================
  companyJobsExport: protectedProcedure
    .input(z.object({
      companyId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify claim
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (!claim) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have an approved claim for this company" });
      }

      // Get all jobs with analytics
      const companyJobs = await database.select()
        .from(jobs)
        .where(eq(jobs.companyId, input.companyId))
        .orderBy(desc(jobs.createdAt));

      const jobIds = companyJobs.map(j => j.id);
      let applicationStats: Record<number, { total: number; new: number; shortlisted: number }> = {};
      let interestStats: Record<number, { views: number; clicks: number }> = {};

      if (jobIds.length > 0) {
        const appCounts = await database.select({
          jobId: jobApplications.jobId,
          status: jobApplications.status,
          count: sql<number>`COUNT(*)`,
        }).from(jobApplications)
          .where(sql`${jobApplications.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(jobApplications.jobId, jobApplications.status);

        for (const row of appCounts) {
          if (!applicationStats[row.jobId]) applicationStats[row.jobId] = { total: 0, new: 0, shortlisted: 0 };
          applicationStats[row.jobId].total += row.count;
          if (row.status === "new") applicationStats[row.jobId].new += row.count;
          if (row.status === "shortlisted") applicationStats[row.jobId].shortlisted += row.count;
        }

        const intCounts = await database.select({
          jobId: jobClicks.jobId,
          clickType: jobClicks.clickType,
          count: sql<number>`COUNT(*)`,
        }).from(jobClicks)
          .where(sql`${jobClicks.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(jobClicks.jobId, jobClicks.clickType);

        for (const row of intCounts) {
          if (!interestStats[row.jobId]) interestStats[row.jobId] = { views: 0, clicks: 0 };
          if (row.clickType === "view") interestStats[row.jobId].views += row.count;
          if (row.clickType === "apply_click") interestStats[row.jobId].clicks += row.count;
        }
      }

      return companyJobs.map(job => ({
        title: job.title,
        location: job.location || "",
        roleType: job.roleType || "",
        seniority: job.seniority || "",
        totalApplications: applicationStats[job.id]?.total || 0,
        newApplications: applicationStats[job.id]?.new || 0,
        shortlisted: applicationStats[job.id]?.shortlisted || 0,
        views: interestStats[job.id]?.views || 0,
        applyClicks: interestStats[job.id]?.clicks || 0,
        conversionRate: interestStats[job.id]?.views
          ? ((applicationStats[job.id]?.total || 0) / interestStats[job.id].views * 100).toFixed(1) + "%"
          : "0.0%",
        publishedAt: job.publishedAt ? new Date(job.publishedAt).toISOString().split("T")[0] : "",
        createdAt: new Date(job.createdAt).toISOString().split("T")[0],
      }));
    }),

  // ============================================================
  // CLAIMED ENTITY EDITING (for approved claims)
  // ============================================================

  // Helper: verify user has approved claim on entity
  // Get full entity data for editing (only for approved claims)
  getClaimedEntityForEdit: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify approved claim
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (!claim) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have an approved claim for this entity" });
      }

      switch (input.entityType) {
        case "company": {
          const [entity] = await database.select().from(companies).where(eq(companies.id, input.entityId));
          return { entityType: "company", entity, claim };
        }
        case "person": {
          const [entity] = await database.select().from(people).where(eq(people.id, input.entityId));
          return { entityType: "person", entity, claim };
        }
        case "investor": {
          const [entity] = await database.select().from(investors).where(eq(investors.id, input.entityId));
          return { entityType: "investor", entity, claim };
        }
        case "event": {
          const [entity] = await database.select().from(events).where(eq(events.id, input.entityId));
          return { entityType: "event", entity, claim };
        }
        case "accelerator": {
          const [entity] = await database.select().from(accelerators).where(eq(accelerators.id, input.entityId));
          return { entityType: "accelerator", entity, claim };
        }
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid entity type" });
      }
    }),

  // Edit a claimed company
  editClaimedCompany: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      name: z.string().min(1).max(255).optional(),
      tagline: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
      foundedYear: z.number().optional(),
      employeeCount: z.string().optional(),
      totalFunding: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify approved claim OR createdByUserId
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      const [company] = await database.select({ createdByUserId: companies.createdByUserId })
        .from(companies).where(eq(companies.id, input.companyId));

      if (!claim && company?.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this company" });
      }

      const { companyId, ...updateData } = input;
      await database.update(companies).set({ ...updateData, updatedAt: toDbDate(new Date()) } as any).where(eq(companies.id, companyId));

      return { success: true };
    }),

  // Edit a claimed person
  editClaimedPerson: protectedProcedure
    .input(z.object({
      personId: z.number(),
      name: z.string().min(1).max(255).optional(),
      title: z.string().optional(),
      bio: z.string().optional(),
      shortBio: z.string().optional(),
      avatar: z.string().optional(),
      coverImage: z.string().optional(),
      company: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      github: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      location: z.string().optional(),
      nationality: z.string().optional(),
      languages: z.string().optional(),
      expertise: z.any().optional(),
      education: z.any().optional(),
      experience: z.any().optional(),
      achievements: z.any().optional(),
      publications: z.any().optional(),
      boardPositions: z.any().optional(),
      speakingTopics: z.any().optional(),
      isAvailableForMentoring: z.boolean().optional(),
      isAvailableForSpeaking: z.boolean().optional(),
      isAvailableForAdvisory: z.boolean().optional(),
      contactPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "person"),
          eq(claimedProfiles.entityId, input.personId),
          eq(claimedProfiles.status, "approved"),
        ));

      const [person] = await database.select({ createdByUserId: people.createdByUserId })
        .from(people).where(eq(people.id, input.personId));

      if (!claim && person?.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this person" });
      }

      const { personId, ...updateData } = input;
      await database.update(people).set({ ...updateData, updatedAt: toDbDate(new Date()) } as any).where(eq(people.id, personId));

      return { success: true };
    }),

  // Edit a claimed investor
  editClaimedInvestor: protectedProcedure
    .input(z.object({
      investorId: z.number(),
      name: z.string().min(1).max(255).optional(),
      type: z.enum(["vc", "angel", "corporate_vc", "family_office", "accelerator", "other"]).optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      email: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      location: z.string().optional(),
      foundedYear: z.number().optional(),
      teamSize: z.string().optional(),
      aum: z.string().optional(),
      investmentStages: z.any().optional(),
      investmentThesis: z.string().optional(),
      sectorFocus: z.any().optional(),
      geographicFocus: z.any().optional(),
      ticketSize: z.string().optional(),
      portfolioHighlights: z.any().optional(),
      teamMembers: z.any().optional(),
      notableExits: z.any().optional(),
      totalInvestments: z.number().optional(),
      totalExits: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "investor"),
          eq(claimedProfiles.entityId, input.investorId),
          eq(claimedProfiles.status, "approved"),
        ));

      const [investor] = await database.select({ createdByUserId: investors.createdByUserId })
        .from(investors).where(eq(investors.id, input.investorId));

      if (!claim && investor?.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this investor" });
      }

      const { investorId, ...updateData } = input;
      await database.update(investors).set({ ...updateData, updatedAt: toDbDate(new Date()) } as any).where(eq(investors.id, investorId));

      return { success: true };
    }),

  // Edit a claimed event
  editClaimedEvent: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      title: z.string().min(1).max(512).optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      type: z.enum(["conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"]).optional(),
      format: z.enum(["in_person", "virtual", "hybrid"]).optional(),
      featuredImage: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      venue: z.string().optional(),
      venueName: z.string().optional(),
      venueAddress: z.string().optional(),
      virtualUrl: z.string().optional(),
      registrationUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
      ticketUrl: z.string().optional(),
      isFree: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
      organizerName: z.string().optional(),
      organizerEmail: z.string().optional(),
      organizerWebsite: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "event"),
          eq(claimedProfiles.entityId, input.eventId),
          eq(claimedProfiles.status, "approved"),
        ));

      const [event] = await database.select({ createdByUserId: events.createdByUserId })
        .from(events).where(eq(events.id, input.eventId));

      if (!claim && event?.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this event" });
      }

      const { eventId, ...updateData } = input;
      await database.update(events).set({ ...updateData, updatedAt: toDbDate(new Date()) } as any).where(eq(events.id, eventId));

      return { success: true };
    }),

  // Edit a claimed accelerator
  editClaimedAccelerator: protectedProcedure
    .input(z.object({
      acceleratorId: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      email: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      location: z.string().optional(),
      programLength: z.string().optional(),
      equity: z.string().optional(),
      funding: z.string().optional(),
      benefits: z.string().optional(),
      requirements: z.string().optional(),
      applicationUrl: z.string().optional(),
      applicationDeadline: z.string().optional(),
      applicationProcess: z.string().optional(),
      mission: z.string().optional(),
      cohortSize: z.string().optional(),
      investmentRange: z.string().optional(),
      equityTaken: z.string().optional(),
      successRate: z.string().optional(),
      totalRaisedByAlumni: z.string().optional(),
      avgFollowon: z.string().optional(),
      nextCohortDate: z.string().optional(),
      batchCount: z.number().optional(),
      totalFunded: z.number().optional(),
      alumniCompanies: z.any().optional(),
      successStories: z.any().optional(),
      programDetails: z.any().optional(),
      teamMembers: z.any().optional(),
      partners: z.any().optional(),
      notableAlumni: z.any().optional(),
      gallery: z.any().optional(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "accelerator"),
          eq(claimedProfiles.entityId, input.acceleratorId),
          eq(claimedProfiles.status, "approved"),
        ));

      const [acc] = await database.select({ createdById: accelerators.createdById })
        .from(accelerators).where(eq(accelerators.id, input.acceleratorId));

      if (!claim && acc?.createdById !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this accelerator" });
      }

      const { acceleratorId, ...updateData } = input;
      await database.update(accelerators).set({ ...updateData, updatedAt: toDbDate(new Date()) } as any).where(eq(accelerators.id, acceleratorId));

      return { success: true };
    }),

  // Check if current user can edit a specific entity (for inline editing on public profiles)
  checkCanEdit: publicProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) return { canEdit: false, editUrl: null };

      const database = await getDb();
      if (!database) return { canEdit: false, editUrl: null };

      // Check for approved claim
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, input.entityType),
          eq(claimedProfiles.entityId, input.entityId),
          eq(claimedProfiles.status, "approved"),
        ));

      if (claim) {
        return {
          canEdit: true,
          editUrl: `/dashboard/edit-entity/${input.entityType}/${input.entityId}`,
        };
      }

      // Check if user created the entity
      let isCreator = false;
      switch (input.entityType) {
        case "company": {
          const [entity] = await database.select({ createdByUserId: companies.createdByUserId }).from(companies).where(eq(companies.id, input.entityId));
          isCreator = entity?.createdByUserId === ctx.user.id;
          break;
        }
        case "person": {
          const [entity] = await database.select({ createdByUserId: people.createdByUserId }).from(people).where(eq(people.id, input.entityId));
          isCreator = entity?.createdByUserId === ctx.user.id;
          break;
        }
        case "investor": {
          const [entity] = await database.select({ createdByUserId: investors.createdByUserId }).from(investors).where(eq(investors.id, input.entityId));
          isCreator = entity?.createdByUserId === ctx.user.id;
          break;
        }
        case "accelerator": {
          const [entity] = await database.select({ createdById: accelerators.createdById }).from(accelerators).where(eq(accelerators.id, input.entityId));
          isCreator = entity?.createdById === ctx.user.id;
          break;
        }
      }

      if (isCreator) {
        return {
          canEdit: true,
          editUrl: `/dashboard/edit-entity/${input.entityType}/${input.entityId}`,
        };
      }

      // Check if user is admin
      if (ctx.user.role === "admin") {
        const adminPaths: Record<string, string> = {
          company: `/admin/companies/${input.entityId}`,
          person: `/admin/people/${input.entityId}`,
          investor: `/admin/investors/${input.entityId}`,
          accelerator: `/admin/accelerators/${input.entityId}`,
          event: `/admin/events/${input.entityId}`,
        };
        return {
          canEdit: true,
          editUrl: adminPaths[input.entityType] || null,
        };
      }

      return { canEdit: false, editUrl: null };
    }),

  // Get user's claimed companies (for job posting restriction)
  myClaimedCompanies: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const claims = await database.select({
        claimId: claimedProfiles.id,
        entityId: claimedProfiles.entityId,
        entityName: claimedProfiles.entityName,
        entityLogo: claimedProfiles.entityLogo,
        role: claimedProfiles.role,
      })
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.status, "approved"),
        ));

      // Enrich with company details
      const enriched = await Promise.all(claims.map(async (claim) => {
        const [company] = await database.select({
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
          logo: companies.logo,
          website: companies.website,
        }).from(companies).where(eq(companies.id, claim.entityId));
        return { ...claim, company };
      }));

      return enriched;
    }),

  // Admin: Get claim detail with full info + review history
  adminGetClaimDetail: protectedProcedure
    .input(z.object({ claimId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.role || !["admin", "editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claimRow] = await database.select({
        claim: claimedProfiles,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        userCreatedAt: users.createdAt,
      })
        .from(claimedProfiles)
        .leftJoin(users, eq(claimedProfiles.userId, users.id))
        .where(eq(claimedProfiles.id, input.claimId));

      if (!claimRow) throw new TRPCError({ code: "NOT_FOUND" });

      // Get review history
      const history = await database.select()
        .from(claimReviewHistory)
        .where(eq(claimReviewHistory.claimId, input.claimId))
        .orderBy(desc(claimReviewHistory.createdAt));

      // Get entity details (fresh)
      const entityDetails = await getEntityDetails(database, claimRow.claim.entityType, claimRow.claim.entityId);

      return {
        ...claimRow.claim,
        userName: claimRow.userName,
        userEmail: claimRow.userEmail,
        userAvatar: claimRow.userAvatar,
        userCreatedAt: claimRow.userCreatedAt,
        entityDetails,
        reviewHistory: history,
      };
    }),

  // Admin: Review a claim (multi-stage: approve / reject / needs_clarification / under_review)
  adminReviewClaim: protectedProcedure
    .input(z.object({
      claimId: z.number(),
      action: z.enum(["under_review", "needs_clarification", "approved", "rejected"]),
      comment: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.role || !["admin", "editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Reject requires mandatory comment
      if (input.action === "rejected" && (!input.comment || input.comment.trim().length === 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A comment is required when rejecting a claim" });
      }

      // Needs clarification requires mandatory comment
      if (input.action === "needs_clarification" && (!input.comment || input.comment.trim().length === 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A comment is required when requesting clarification" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(eq(claimedProfiles.id, input.claimId));

      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

      const previousStatus = claim.status;

      await database.update(claimedProfiles)
        .set({
          status: input.action,
          verificationNote: input.comment || claim.verificationNote,
          reviewedById: ctx.user.id,
          reviewedAt: toDbDate(new Date()),
        } as any)
        .where(eq(claimedProfiles.id, input.claimId));

      // Add review history entry
      await database.insert(claimReviewHistory).values({
        claimId: input.claimId,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.name || "Admin",
        action: input.action,
        comment: input.comment || null,
        fromStatus: previousStatus,
        toStatus: input.action,
      } as any);

      // If approved, also update the entity's claimedByUserId field
      if (input.action === "approved") {
        switch (claim.entityType) {
          case "company":
            await database.update(companies)
              .set({ claimedByUserId: claim.userId } as any)
              .where(eq(companies.id, claim.entityId));
            break;
          case "person":
            await database.update(people)
              .set({ claimedByUserId: claim.userId } as any)
              .where(eq(people.id, claim.entityId));
            break;
          case "investor":
            await database.update(investors)
              .set({ claimedByUserId: claim.userId } as any)
              .where(eq(investors.id, claim.entityId));
            break;
          case "accelerator":
            await database.update(accelerators)
              .set({ claimedByUserId: claim.userId } as any)
              .where(eq(accelerators.id, claim.entityId));
            break;
          case "event":
            await database.update(events)
              .set({ claimedByUserId: claim.userId } as any)
              .where(eq(events.id, claim.entityId));
            break;
        }
      }

      return { success: true };
    }),

  // ============================================================
  // BULK JOB MANAGEMENT (for company owners)
  // ============================================================

  // Bulk update job status (pause/unpause/archive)
  bulkUpdateJobStatus: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      jobIds: z.array(z.number()).min(1).max(100),
      action: z.enum(["pause", "unpause", "archive"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership via claim or team membership
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      let hasAccess = !!claim;
      if (!hasAccess) {
        const [team] = await database.select()
          .from(entityTeamMembers)
          .where(and(
            eq(entityTeamMembers.userId, ctx.user.id),
            eq(entityTeamMembers.entityType, "company"),
            eq(entityTeamMembers.entityId, input.companyId),
            eq(entityTeamMembers.status, "accepted"),
          ));
        hasAccess = !!team;
      }

      const isAdmin = ctx.user.role === "admin";
      if (!hasAccess && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Map action to statusId
      // 6 = Published (active), 1 = Draft (paused), 7 = Archived
      let newStatusId: number;
      let additionalUpdates: any = {};
      switch (input.action) {
        case "pause":
          newStatusId = 1; // Draft = paused
          break;
        case "unpause":
          newStatusId = 6; // Published = active
          additionalUpdates.publishedAt = new Date();
          break;
        case "archive":
          newStatusId = 7; // Archived
          break;
      }

      await database.update(jobs)
        .set({ statusId: newStatusId, ...additionalUpdates } as any)
        .where(and(
          inArray(jobs.id, input.jobIds),
          eq(jobs.companyId, input.companyId),
        ));

      return { success: true, updated: input.jobIds.length };
    }),

  // Duplicate a job
  duplicateJob: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      companyId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership
      const [claim] = await database.select()
        .from(claimedProfiles)
        .where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));

      let hasAccess = !!claim;
      if (!hasAccess) {
        const [team] = await database.select()
          .from(entityTeamMembers)
          .where(and(
            eq(entityTeamMembers.userId, ctx.user.id),
            eq(entityTeamMembers.entityType, "company"),
            eq(entityTeamMembers.entityId, input.companyId),
            eq(entityTeamMembers.status, "accepted"),
          ));
        hasAccess = !!team;
      }

      const isAdmin = ctx.user.role === "admin";
      if (!hasAccess && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Get the original job
      const [original] = await database.select()
        .from(jobs)
        .where(and(eq(jobs.id, input.jobId), eq(jobs.companyId, input.companyId)));

      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      // Create a copy with a new slug and draft status
      const timestamp = Date.now();
      const newSlug = `${original.slug}-copy-${timestamp}`;

      const [result] = await database.insert(jobs).values({
        title: `${original.title} (Copy)`,
        slug: newSlug,
        description: original.description,
        requirements: original.requirements,
        benefits: original.benefits,
        companyName: original.companyName,
        companyId: original.companyId,
        companyLogo: original.companyLogo,
        companyWebsite: original.companyWebsite,
        countryId: original.countryId,
        geoRegionId: original.geoRegionId,
        cityId: original.cityId,
        location: original.location,
        isRemote: original.isRemote,
        remoteType: original.remoteType,
        roleType: original.roleType,
        seniority: original.seniority,
        salaryMin: original.salaryMin,
        salaryMax: original.salaryMax,
        salaryCurrency: original.salaryCurrency,
        salaryPeriod: original.salaryPeriod,
        applyUrl: original.applyUrl,
        applyEmail: original.applyEmail,
        statusId: 1, // Draft
        postedById: ctx.user.id,
        viewCount: 0,
        applicationCount: 0,
      } as any);

      return { success: true, newJobId: result.insertId };
    }),
});
