/**
 * Compliance Router
 * ----------------------------------------------------------------------
 * DSAR exports, erasure requests, retention policy management, PII
 * access log queries. Authorization:
 *   - Candidates can request their own DSAR / erasure
 *   - Recruiters (any role) can run DSAR for any candidate on their tenant
 *   - Tenant owner + super_admin can manage retention policies
 *   - Tenant owner + super_admin can query the PII access log
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { buildBundle } from "./services/dsar.service";
import {
  submit as submitErasure,
  cancel as cancelErasure,
  processDueErasures,
} from "./services/erasure.service";
import { processRetention } from "./services/retention.service";
import { getDb } from "../../db";
import {
  retentionPolicies,
  piiAccessLog,
  candidateErasureRequests,
} from "../../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  ErasureRequestNotFoundError,
  GracePeriodNotElapsedError,
} from "./types";

function rethrow(err: unknown): never {
  if (err instanceof ErasureRequestNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof GracePeriodNotElapsedError) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: err.message });
  }
  throw err;
}

function tenantScope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

const SUBJECT = z.enum(["candidate", "application", "assessment_attempt", "interview"]);
const LEGAL_BASIS = z.enum(["gdpr_article_17", "ccpa", "pdpl", "tenant_request"]);

export const complianceRouter = router({
  // ============================================================
  // DSAR
  // ============================================================

  exportCandidate: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await buildBundle(input.candidateId, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  // ============================================================
  // Erasure
  // ============================================================

  submitErasure: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        legalBasis: LEGAL_BASIS,
        requesterEmail: z.string().email().optional(),
        graceDays: z.number().int().min(0).max(90).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await submitErasure({
          candidateId: input.candidateId,
          tenantId: tenantScope(ctx),
          requestedByUserId: ctx.user.id,
          requesterEmail: input.requesterEmail,
          legalBasis: input.legalBasis,
          graceDays: input.graceDays,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  cancelErasure: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await cancelErasure(input.requestId);
        return { success: true as const };
      } catch (err) {
        rethrow(err);
      }
    }),

  listErasureRequests: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "executed", "rejected", "expired"]).optional(),
          page: z.number().default(1),
          limit: z.number().default(50),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const offset = ((input?.page ?? 1) - 1) * (input?.limit ?? 50);
      const conditions: any[] = [];
      if (input?.status) conditions.push(eq(candidateErasureRequests.status, input.status));
      const whereClause = conditions.length ? and(...conditions) : undefined;
      return db
        .select()
        .from(candidateErasureRequests)
        .where(whereClause)
        .orderBy(desc(candidateErasureRequests.createdAt))
        .limit(input?.limit ?? 50)
        .offset(offset);
    }),

  // Cron-callable entrypoints — admin only
  processDueErasures: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return { processed: await processDueErasures() };
  }),

  processRetention: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return { opened: await processRetention() };
  }),

  // ============================================================
  // Retention policies (tenant owner / admin)
  // ============================================================

  listPolicies: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(retentionPolicies)
        .where(eq(retentionPolicies.tenantId, input.tenantId));
    }),

  upsertPolicy: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        subjectType: SUBJECT,
        retentionDays: z.number().int().min(30).max(3650),
        appliesWhen: z
          .enum(["after_last_activity", "after_status_terminal", "after_creation"])
          .default("after_last_activity"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db
        .select({ id: retentionPolicies.id })
        .from(retentionPolicies)
        .where(
          and(
            eq(retentionPolicies.tenantId, input.tenantId),
            eq(retentionPolicies.subjectType, input.subjectType),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await db
          .update(retentionPolicies)
          .set({
            retentionDays: input.retentionDays,
            appliesWhen: input.appliesWhen,
          } as any)
          .where(eq(retentionPolicies.id, existing[0].id));
      } else {
        await db.insert(retentionPolicies).values({
          tenantId: input.tenantId,
          subjectType: input.subjectType,
          retentionDays: input.retentionDays,
          appliesWhen: input.appliesWhen,
        } as any);
      }
      return { success: true as const };
    }),

  // ============================================================
  // PII access log queries (tenant owner / admin)
  // ============================================================

  recentAccess: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().optional(),
        actorUserId: z.number().optional(),
        subjectType: z
          .enum(["candidate", "application", "resume", "assessment_attempt", "github_profile"])
          .optional(),
        subjectId: z.number().optional(),
        limit: z.number().default(100),
      }),
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin && input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [];
      if (input.tenantId) conditions.push(eq(piiAccessLog.tenantId, input.tenantId));
      if (input.actorUserId) conditions.push(eq(piiAccessLog.actorUserId, input.actorUserId));
      if (input.subjectType) conditions.push(eq(piiAccessLog.subjectType, input.subjectType));
      if (input.subjectId) conditions.push(eq(piiAccessLog.subjectId, input.subjectId));
      const whereClause = conditions.length ? and(...conditions) : undefined;
      return db
        .select()
        .from(piiAccessLog)
        .where(whereClause)
        .orderBy(desc(piiAccessLog.createdAt))
        .limit(input.limit);
    }),
});
