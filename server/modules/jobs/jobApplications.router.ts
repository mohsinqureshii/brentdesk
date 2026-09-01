/**
 * Job Applications Router
 * ----------------------------------------------------------------------
 * tRPC surface for the applicant flow + recruiter flow + click
 * tracking. Routes validate input and delegate to the service layer.
 * No DB queries here.
 *
 * Recruiter authorization (company-owner or admin) lives in the
 * service via `gateOwnerOrAdmin`. Phase 1 will replace it with
 * tenant-scoped RBAC.
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { jobApplicationsService } from "./services/jobApplications.service";
import { jobAnalyticsService } from "./services/jobAnalytics.service";
import {
  AlreadyAppliedError,
  ForbiddenError,
  JobApplicationNotFoundError,
  JobNotFoundError,
  UnauthorizedError,
} from "./types";

// ------------------------------------------------------------
// Tenant scope is resolved by the tenant extraction middleware.
// NULL = legacy public path; concrete = SaaS tenant.
// ------------------------------------------------------------
function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

const STATUS_FILTER = z.enum([
  "new",
  "reviewed",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
  "all",
]);

const ACTIVE_STATUS = z.enum([
  "reviewed",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
]);

const CLICK_TYPE = z.enum(["view", "apply_click", "save", "share", "external_apply"]);

// ------------------------------------------------------------
// Map domain errors → TRPCError so clients see the right code.
// ------------------------------------------------------------
function rethrow(err: unknown): never {
  if (err instanceof JobNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }
  if (err instanceof JobApplicationNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (err instanceof AlreadyAppliedError) {
    throw new TRPCError({ code: "CONFLICT", message: err.message });
  }
  if (err instanceof ForbiddenError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof UnauthorizedError) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
  }
  throw err;
}

export const jobApplicationsRouter = router({
  // ============================================================
  // APPLICANT-FACING
  // ============================================================

  applyInternal: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        coverLetter: z.string().max(5000).optional(),
        linkedinUrl: z.string().url().optional(),
        portfolioUrl: z.string().url().optional(),
        currentCompany: z.string().max(255).optional(),
        currentTitle: z.string().max(255).optional(),
        yearsOfExperience: z.number().min(0).max(50).optional(),
        expectedSalary: z.number().optional(),
        expectedSalaryCurrency: z.string().max(3).default("USD"),
        noticePeriod: z.string().max(64).optional(),
        cvUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.applyInternal(scope(ctx), input, {
          userId: ctx.user.id,
          name: ctx.user.name ?? null,
          email: ctx.user.email ?? null,
          jobTitle: (ctx.user as any).jobTitle ?? null,
          company: (ctx.user as any).company ?? null,
          cvUrl: (ctx.user as any).cvUrl ?? null,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  checkApplication: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) return { applied: false, application: null };
      return jobApplicationsService.checkApplication(scope(ctx), input.jobId, ctx.user.id);
    }),

  myApplications: protectedProcedure
    .input(
      z
        .object({
          status: STATUS_FILTER.default("all"),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return jobApplicationsService.listForUser(
        scope(ctx),
        ctx.user.id,
        input?.status || "all",
        input?.page || 1,
        input?.limit || 20,
      );
    }),

  withdrawApplication: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.withdraw(scope(ctx), input.applicationId, ctx.user.id);
      } catch (err) {
        rethrow(err);
      }
    }),

  // ============================================================
  // CLICK / INTEREST TRACKING
  // ============================================================

  trackClick: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        clickType: CLICK_TYPE,
        referrer: z.string().max(512).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      return jobAnalyticsService.recordClick(
        scope(ctx),
        input.jobId,
        input.clickType,
        {
          userId: user?.id ?? null,
          name: user?.name ?? null,
          avatar: user?.avatar ?? null,
          jobTitle: (user as any)?.jobTitle ?? null,
          company: (user as any)?.company ?? null,
        },
        input.referrer,
      );
    }),

  trackExternalApply: publicProcedure
    .input(z.object({ jobId: z.number(), referrer: z.string().max(512).optional() }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      return jobAnalyticsService.recordExternalApply(
        scope(ctx),
        input.jobId,
        {
          userId: user?.id ?? null,
          name: user?.name ?? null,
          avatar: user?.avatar ?? null,
          jobTitle: (user as any)?.jobTitle ?? null,
          company: (user as any)?.company ?? null,
        },
        input.referrer,
      );
    }),

  // ============================================================
  // COMPANY OWNER / RECRUITER
  // ============================================================

  getJobApplications: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        status: STATUS_FILTER.default("all"),
        page: z.number().default(1),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.listForJob(
          scope(ctx),
          input.jobId,
          input.status,
          input.page,
          input.limit,
          { userId: ctx.user.id, role: ctx.user.role },
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  updateApplicationStatus: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        status: ACTIVE_STATUS,
        statusNote: z.string().max(1000).optional(),
        rating: z.number().min(1).max(5).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.updateStatus(
          scope(ctx),
          input.applicationId,
          input.status,
          { userId: ctx.user.id, role: ctx.user.role },
          input.statusNote,
          input.rating,
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  getJobInterest: protectedProcedure
    .input(z.object({ jobId: z.number(), days: z.number().default(30) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobAnalyticsService.getJobInterest(scope(ctx), input.jobId, input.days, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  getCompanyJobs: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.listCompanyJobs(
          scope(ctx),
          input.companyId,
          input.page,
          input.limit,
          { userId: ctx.user.id, role: ctx.user.role },
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  addApplicationNote: protectedProcedure
    .input(z.object({ applicationId: z.number(), note: z.string().max(2000) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.addNote(scope(ctx), input.applicationId, input.note, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  rateApplicant: protectedProcedure
    .input(z.object({ applicationId: z.number(), rating: z.number().min(1).max(5) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.rate(scope(ctx), input.applicationId, input.rating, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  exportApplicants: protectedProcedure
    .input(z.object({ jobId: z.number(), status: STATUS_FILTER.default("all") }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.exportForJob(scope(ctx), input.jobId, input.status, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  getApplicantStats: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobAnalyticsService.getApplicantStats(scope(ctx), input.jobId, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        applicationIds: z.array(z.number()).min(1).max(100),
        status: ACTIVE_STATUS,
        statusNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await jobApplicationsService.bulkUpdateStatus(
          scope(ctx),
          input.applicationIds,
          input.status,
          { userId: ctx.user.id, role: ctx.user.role },
          input.statusNote,
        );
      } catch (err) {
        rethrow(err);
      }
    }),
});
