/**
 * ATS Router
 * ----------------------------------------------------------------------
 * tRPC surface for the Phase 3 ATS module. Single router with
 * sub-namespaces: `pipeline.*`, `interview.*`, `feedback.*`,
 * `offer.*`, `note.*`. Routes validate input and delegate to the
 * service layer. No DB queries here.
 *
 * Tenant scope is resolved by the tenant extraction middleware via
 * `scope(ctx)`. Domain errors are rethrown as TRPCError matching the
 * jobApplications.router.ts pattern.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { pipelineService } from "./services/pipeline.service";
import { interviewsService } from "./services/interviews.service";
import { feedbackService } from "./services/feedback.service";
import { offersService } from "./services/offers.service";
import { notesService } from "./services/notes.service";
import { reportsService } from "./services/reports.service";
import {
  ForbiddenError,
  InterviewNotFoundError,
  NoteNotFoundError,
  OfferNotFoundError,
  StageNotFoundError,
  TenantScopeViolationError,
} from "./types";

// ------------------------------------------------------------
// Tenant scope is resolved by the tenant extraction middleware.
// NULL = legacy path; concrete = SaaS tenant.
// ------------------------------------------------------------
function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

// ------------------------------------------------------------
// Map domain errors → TRPCError so clients see the right code.
// ------------------------------------------------------------
function rethrow(err: unknown): never {
  if (err instanceof StageNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof InterviewNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof OfferNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof NoteNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof ForbiddenError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof TenantScopeViolationError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  throw err;
}

// ------------------------------------------------------------
// Zod enums (mirror types.ts)
// ------------------------------------------------------------

const STAGE_CATEGORY = z.enum([
  "sourcing",
  "screening",
  "interviewing",
  "offer",
  "hired",
  "rejected",
]);

const INTERVIEW_TYPE = z.enum([
  "phone_screen",
  "technical",
  "system_design",
  "behavioral",
  "culture",
  "final",
  "ai_interview",
]);

const RECOMMENDATION = z.enum([
  "strong_hire",
  "hire",
  "no_hire",
  "strong_no_hire",
  "unsure",
]);

const VISIBILITY = z.enum(["private", "team", "tenant"]);

function requester(ctx: any) {
  if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
  return { userId: ctx.user.id, role: ctx.user.role };
}

// ============================================================
// PIPELINE
// ============================================================

const pipelineRouter = router({
  listStages: protectedProcedure
    .input(z.object({ jobId: z.number().nullable().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        return await pipelineService.listStages(scope(ctx), input.jobId ?? null, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  createStage: protectedProcedure
    .input(
      z.object({
        jobId: z.number().nullable().optional(),
        name: z.string().min(1).max(128),
        slug: z.string().max(64).optional(),
        position: z.number().int().min(0),
        color: z.string().max(16).optional(),
        category: STAGE_CATEGORY.optional(),
        isTerminal: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        autoEmailTemplateId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await pipelineService.createStage(scope(ctx), input, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        slug: z.string().max(64).optional(),
        position: z.number().int().min(0).optional(),
        color: z.string().max(16).optional(),
        category: STAGE_CATEGORY.optional(),
        isTerminal: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        autoEmailTemplateId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...patch } = input;
      try {
        return await pipelineService.updateStage(scope(ctx), id, patch, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await pipelineService.deleteStage(scope(ctx), input.id, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  reorderStages: protectedProcedure
    .input(
      z.object({
        positions: z.array(z.object({ id: z.number(), position: z.number().int().min(0) })).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const map = new Map<number, number>();
      for (const p of input.positions) map.set(p.id, p.position);
      try {
        return await pipelineService.reorderStages(scope(ctx), map, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  moveApplication: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        toStageId: z.number(),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await pipelineService.moveApplicationToStage(
          scope(ctx),
          input.applicationId,
          input.toStageId,
          requester(ctx),
          input.reason,
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  bulkMove: protectedProcedure
    .input(
      z.object({
        applicationIds: z.array(z.number()).min(1).max(100),
        toStageId: z.number(),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await pipelineService.bulkMove(
          scope(ctx),
          input.applicationIds,
          input.toStageId,
          requester(ctx),
          input.reason,
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  seedDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Permission check happens in service via the tenant scope;
        // the operation is idempotent so re-runs are safe.
        return await pipelineService.seedDefaultsIfMissing(scope(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// INTERVIEW
// ============================================================

const interviewRouter = router({
  schedule: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        stageId: z.number().nullable().optional(),
        type: INTERVIEW_TYPE,
        scheduledAt: z.date(),
        durationMinutes: z.number().int().min(1).max(720).optional(),
        location: z.string().max(255).optional(),
        meetingUrl: z.string().url().optional(),
        assignedInterviewerIds: z.array(z.number()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await interviewsService.schedule(scope(ctx), input, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  reschedule: protectedProcedure
    .input(z.object({ id: z.number(), newScheduledAt: z.date() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await interviewsService.reschedule(
          scope(ctx),
          input.id,
          input.newScheduledAt,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().max(1000) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await interviewsService.cancel(
          scope(ctx),
          input.id,
          input.reason,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await interviewsService.complete(scope(ctx), input.id, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  listForApplication: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await interviewsService.listForApplication(
          scope(ctx),
          input.applicationId,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  listUpcoming: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(14) }))
    .query(async ({ input, ctx }) => {
      try {
        return await interviewsService.listUpcoming(scope(ctx), input.days, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// FEEDBACK
// ============================================================

const feedbackRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        interviewId: z.number(),
        overallRating: z.number().int().min(1).max(5).optional(),
        technicalRating: z.number().int().min(1).max(5).optional(),
        communicationRating: z.number().int().min(1).max(5).optional(),
        cultureRating: z.number().int().min(1).max(5).optional(),
        recommendation: RECOMMENDATION.optional(),
        strengths: z.string().max(5000).optional(),
        concerns: z.string().max(5000).optional(),
        notes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { interviewId, ...rest } = input;
      try {
        return await feedbackService.submit(scope(ctx), interviewId, rest, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  listForInterview: protectedProcedure
    .input(z.object({ interviewId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await feedbackService.listForInterview(
          scope(ctx),
          input.interviewId,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// OFFER
// ============================================================

const offerRouter = router({
  draft: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        baseSalary: z.number().optional(),
        bonus: z.number().optional(),
        equity: z.string().max(2000).optional(),
        currency: z.string().length(3).optional(),
        startDate: z.date().optional(),
        expiresAt: z.date().optional(),
        letterBody: z.string().max(20000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await offersService.draft(scope(ctx), input, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  send: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await offersService.send(scope(ctx), input.id, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  markAccepted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await offersService.markAccepted(scope(ctx), input.id);
      } catch (err) {
        rethrow(err);
      }
    }),

  markDeclined: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().max(2000) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await offersService.markDeclined(scope(ctx), input.id, input.reason);
      } catch (err) {
        rethrow(err);
      }
    }),

  withdraw: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await offersService.withdraw(scope(ctx), input.id, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  findForApplication: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await offersService.findForApplication(
          scope(ctx),
          input.applicationId,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// NOTE
// ============================================================

const noteRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        applicationId: z.number().optional(),
        candidateId: z.number().optional(),
        body: z.string().min(1).max(10000),
        visibility: VISIBILITY.default("team"),
        mentions: z.array(z.number()).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await notesService.add(
          scope(ctx),
          { applicationId: input.applicationId, candidateId: input.candidateId },
          input.body,
          input.visibility,
          input.mentions,
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        applicationId: z.number().optional(),
        candidateId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        return await notesService.list(
          scope(ctx),
          { applicationId: input.applicationId, candidateId: input.candidateId },
          requester(ctx),
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        body: z.string().min(1).max(10000).optional(),
        visibility: VISIBILITY.optional(),
        mentions: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...patch } = input;
      try {
        return await notesService.update(scope(ctx), id, patch, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await notesService.delete(scope(ctx), input.id, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// REPORT
// ============================================================

const REPORT_RANGE = z.enum(["7d", "30d", "90d", "1y"]);

const reportRouter = router({
  summary: protectedProcedure
    .input(z.object({ range: REPORT_RANGE.default("30d") }))
    .query(async ({ input, ctx }) => {
      try {
        return await reportsService.summary(scope(ctx), input.range, requester(ctx));
      } catch (err) {
        rethrow(err);
      }
    }),
});

// ============================================================
// COMPOSITE
// ============================================================

export const atsRouter = router({
  pipeline: pipelineRouter,
  interview: interviewRouter,
  feedback: feedbackRouter,
  offer: offerRouter,
  note: noteRouter,
  report: reportRouter,
});
