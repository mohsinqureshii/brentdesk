/**
 * Matching + Scoring Router
 * ----------------------------------------------------------------------
 * tRPC surface for embedding/indexing, semantic match, and composite
 * scoring. Tenant scope comes from the tenant extraction middleware
 * (ctx.tenantId); NULL = legacy public board.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import { scoringService } from "./services/scoring.service";
import { matchingService } from "./services/matching.service";
import { embeddingService } from "./services/embedding.service";
import { QdrantUnavailableError } from "./types";

const RECRUITER_ROLES = new Set(["admin", "recruiter", "editor", "senior_editor"]);
const ADMIN_ROLES = new Set(["admin"]);

function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

function gateRecruiter(role: string) {
  if (!RECRUITER_ROLES.has(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Recruiter+ required" });
  }
}

function gateAdmin(role: string) {
  if (!ADMIN_ROLES.has(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin required" });
  }
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    if (e instanceof QdrantUnavailableError) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: e.message });
    }
    throw e;
  }
}

export const matchingRouter = router({
  // ============================================================
  // Scoring
  // ============================================================
  score: router({
    computeForCandidate: protectedProcedure
      .input(z.object({ candidateId: z.number(), jobId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        gateRecruiter(ctx.user.role);
        return safeCall(() =>
          scoringService.computeForCandidate(
            scope(ctx),
            input.candidateId,
            input.jobId ?? null,
            { userId: ctx.user.id, role: ctx.user.role },
          ),
        );
      }),

    getCurrent: protectedProcedure
      .input(z.object({ candidateId: z.number(), jobId: z.number().optional() }))
      .query(({ input, ctx }) =>
        scoringService.getCurrent(scope(ctx), input.candidateId, input.jobId ?? null),
      ),

    bulkRecompute: protectedProcedure
      .input(z.object({ jobId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        gateAdmin(ctx.user.role);
        return safeCall(() =>
          scoringService.bulkRecompute(scope(ctx), input.jobId ?? null, {
            userId: ctx.user.id,
            role: ctx.user.role,
          }),
        );
      }),

    explain: protectedProcedure
      .input(z.object({ candidateId: z.number(), jobId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        gateRecruiter(ctx.user.role);
        return safeCall(() =>
          scoringService.explain(scope(ctx), input.candidateId, input.jobId, {
            userId: ctx.user.id,
            role: ctx.user.role,
          }),
        );
      }),
  }),

  // ============================================================
  // Matching (vector search)
  // ============================================================
  match: router({
    topCandidatesForJob: protectedProcedure
      .input(z.object({ jobId: z.number(), limit: z.number().min(1).max(100).default(20) }))
      .query(({ input, ctx }) =>
        safeCall(() =>
          matchingService.findTopCandidatesForJob(scope(ctx), input.jobId, input.limit, {
            userId: ctx.user.id,
            role: ctx.user.role,
          }),
        ),
      ),

    topJobsForCandidate: protectedProcedure
      .input(z.object({ candidateId: z.number(), limit: z.number().min(1).max(100).default(20) }))
      .query(({ input, ctx }) =>
        safeCall(() =>
          matchingService.findTopJobsForCandidate(scope(ctx), input.candidateId, input.limit, {
            userId: ctx.user.id,
            role: ctx.user.role,
          }),
        ),
      ),

    searchByQuery: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1).max(1000),
          type: z.enum(["candidates", "jobs"]),
          limit: z.number().min(1).max(50).default(20),
        }),
      )
      .query(({ input, ctx }) =>
        safeCall(() =>
          matchingService.searchByQuery(scope(ctx), input.query, input.type, input.limit, {
            userId: ctx.user.id,
            role: ctx.user.role,
          }),
        ),
      ),
  }),

  // ============================================================
  // Indexing
  // ============================================================
  index: router({
    reindexAll: protectedProcedure
      .input(z.object({ scope: z.enum(["candidates", "jobs", "all"]).default("all") }))
      .mutation(async ({ input, ctx }) => {
        gateAdmin(ctx.user.role);
        return safeCall(() => embeddingService.reindexAll(scope(ctx), input.scope));
      }),

    embedCandidate: protectedProcedure
      .input(z.object({ candidateId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        gateRecruiter(ctx.user.role);
        return safeCall(() => embeddingService.embedCandidate(scope(ctx), input.candidateId));
      }),

    embedJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        gateRecruiter(ctx.user.role);
        return safeCall(() => embeddingService.embedJob(scope(ctx), input.jobId));
      }),
  }),
});
