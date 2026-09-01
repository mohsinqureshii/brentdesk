/**
 * GitHub Router
 * ----------------------------------------------------------------------
 * tRPC surface for the GitHub Intelligence module (Phase 4).
 *
 * Surface:
 *   - authorizeUrl: candidate-grant OAuth init (returns URL to redirect to)
 *   - connect:      finishes OAuth, persists encrypted token, kicks initial_sync
 *   - disconnect:   nukes the profile + cascade
 *   - myProfile:    current user's own GitHub intel
 *   - getForCandidate: recruiter view by candidateId
 *   - refreshProfile:  enqueues a manual_refresh
 *   - runFetchJobs:    admin/scheduler endpoint to drain the queue
 *
 * SCHEDULER INTEGRATION
 * Add a tick to `server/services/scheduler.service.ts` similar to:
 *
 *   import { githubFetcherService } from "../modules/github";
 *   schedule.every("1 minute", async () => {
 *     await githubFetcherService.drainQueue(25);
 *   });
 *
 * (We don't modify scheduler.service.ts from this module — wire up
 * deliberately from the scheduler so it stays the single source of
 * truth for cron-like jobs.)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq } from "drizzle-orm";
import { candidates } from "../../../drizzle/schema";
import { githubFetcherService } from "./services/githubFetcher.service";
import { githubProfileService } from "./services/githubProfile.service";
import { githubAuthService } from "./services/githubAuth.service";

function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

/**
 * Look up the candidate row owned by the current user under the active
 * tenant scope. Used by `myProfile` + `refreshProfile` to bridge
 * userId → candidateId without crossing the candidates module boundary.
 */
async function candidateIdForUser(
  userId: number,
  tenantScope: number | null,
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: candidates.id, tenantId: candidates.tenantId })
    .from(candidates)
    .where(eq(candidates.userId, userId));
  // Prefer the row that matches the active tenant; fall back to NULL tenant.
  const match =
    rows.find((r) => (r.tenantId ?? null) === tenantScope) ||
    rows.find((r) => r.tenantId == null);
  return match?.id ?? null;
}

export const githubRouter = router({
  // ============================================================
  // OAuth flow
  // ============================================================

  authorizeUrl: protectedProcedure
    .input(z.object({ state: z.string().min(1) }))
    .query(async ({ input }) => {
      const url = await githubAuthService.buildAuthorizeUrl(input.state);
      return { url };
    }),

  connect: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        oauthCode: z.string().min(1),
      }),
    )
    .mutation(({ input, ctx }) =>
      githubFetcherService.connectCandidate(scope(ctx), input.candidateId, input.oauthCode),
    ),

  disconnect: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .mutation(({ input, ctx }) =>
      githubProfileService.disconnect(scope(ctx), input.candidateId, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  // ============================================================
  // Read endpoints
  // ============================================================

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const candId = await candidateIdForUser(ctx.user.id, scope(ctx));
    if (!candId) return null;
    return githubProfileService.getForCandidate(scope(ctx), candId, {
      userId: ctx.user.id,
      role: ctx.user.role,
    });
  }),

  getForCandidate: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(({ input, ctx }) =>
      githubProfileService.getForCandidate(scope(ctx), input.candidateId, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  // ============================================================
  // Mutations
  // ============================================================

  refreshProfile: protectedProcedure
    .input(z.object({ candidateId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      let candidateId = input.candidateId;
      if (!candidateId) {
        const myCandId = await candidateIdForUser(ctx.user.id, scope(ctx));
        if (!myCandId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No candidate row for current user",
          });
        }
        candidateId = myCandId;
      }
      return githubFetcherService.refreshProfile(scope(ctx), candidateId);
    }),

  // ============================================================
  // Queue drain — admin-only. Intended to be called by
  // scheduler.service.ts on a 1-minute tick.
  // ============================================================

  runFetchJobs: publicProcedure
    .input(z.object({ maxJobs: z.number().min(1).max(100).default(25) }))
    .mutation(async ({ input, ctx }) => {
      // Admin-only: also allow loopback (e.g. internal scheduler calls
      // skipping ctx.user when invoking via the service directly).
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "admin-only",
        });
      }
      return githubFetcherService.drainQueue(input.maxJobs);
    }),
});
