/**
 * Tenants Router
 * ----------------------------------------------------------------------
 * tRPC surface for tenant CRUD + membership management. Calls into
 * tenantsService — thin validate-and-call pattern.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { tenantsService } from "./services/tenants.service";
import {
  TenantMembershipNotFoundError,
  TenantNotFoundError,
  TenantSlugTakenError,
  TenantUnauthorizedError,
} from "./types";

const PLAN = z.enum(["free", "starter", "growth", "enterprise"]);
const STATUS = z.enum(["trial", "active", "suspended", "cancelled"]);
const RESIDENCY = z.enum(["us", "eu", "ksa"]);
const ROLE = z.enum(["owner", "recruiter", "hiring_manager", "interviewer", "viewer"]);

function rethrow(err: unknown): never {
  if (err instanceof TenantNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof TenantMembershipNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof TenantSlugTakenError) {
    throw new TRPCError({ code: "CONFLICT", message: err.message });
  }
  if (err instanceof TenantUnauthorizedError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  throw err;
}

export const tenantsRouter = router({
  // ============================================================
  // Admin CRUD (super_admin / admin)
  // ============================================================

  create: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(2).max(64),
        name: z.string().min(1).max(255),
        customDomain: z.string().optional(),
        plan: PLAN.optional(),
        dataResidency: RESIDENCY.optional(),
        brandingLogoUrl: z.string().url().optional(),
        brandingPrimaryColor: z.string().max(16).optional(),
        trialDays: z.number().int().min(0).max(365).optional(),
        ownerUserId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await tenantsService.createTenant(input, ctx.user.role);
      } catch (err) {
        rethrow(err);
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        customDomain: z.string().nullable().optional(),
        plan: PLAN.optional(),
        status: STATUS.optional(),
        dataResidency: RESIDENCY.optional(),
        brandingLogoUrl: z.string().url().nullable().optional(),
        brandingPrimaryColor: z.string().max(16).nullable().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await tenantsService.updateTenant(input, ctx.user.role);
      } catch (err) {
        rethrow(err);
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: STATUS.optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return tenantsService.list(input ?? { page: 1, limit: 20 });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => tenantsService.getBySlug(input.slug)),

  // ============================================================
  // Self-service — current user's tenants
  // ============================================================

  myTenants: protectedProcedure.query(({ ctx }) => tenantsService.listForUser(ctx.user.id)),

  // ============================================================
  // Membership management
  // ============================================================

  listMembers: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await tenantsService.listMembers(input.tenantId, ctx.user.id, ctx.user.role);
      } catch (err) {
        rethrow(err);
      }
    }),

  inviteMember: protectedProcedure
    .input(z.object({ tenantId: z.number(), userId: z.number(), role: ROLE }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await tenantsService.invite(input, ctx.user.id, ctx.user.role);
      } catch (err) {
        rethrow(err);
      }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .mutation(({ input, ctx }) => tenantsService.acceptInvite(input.tenantId, ctx.user.id)),

  changeRole: protectedProcedure
    .input(z.object({ tenantId: z.number(), userId: z.number(), role: ROLE }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await tenantsService.changeRole(
          input.tenantId,
          input.userId,
          input.role,
          ctx.user.id,
          ctx.user.role,
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  removeMember: protectedProcedure
    .input(z.object({ tenantId: z.number(), userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await tenantsService.removeMember(
          input.tenantId,
          input.userId,
          ctx.user.id,
          ctx.user.role,
        );
      } catch (err) {
        rethrow(err);
      }
    }),
});
