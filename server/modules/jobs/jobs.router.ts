/**
 * Jobs Router
 * ----------------------------------------------------------------------
 * tRPC surface for job listings — public listing/detail + admin CRUD,
 * bulk actions, suggestions, dropdowns. Routes validate input and
 * delegate to the service layer. No DB queries here.
 *
 * Tenant scope is currently `null` (legacy public job board) until
 * Phase 1 lands the tenantId column + extraction middleware. At that
 * point the resolved scope comes from `ctx.tenantId`.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { jobsService } from "./services/jobs.service";
import { jobSearchService } from "./services/jobSearch.service";

// ------------------------------------------------------------
// Zod schemas — the validation surface. Service input types in
// `types.ts` mirror these but are pure TypeScript so the service can
// be imported from non-router callers without dragging zod along.
// ------------------------------------------------------------

const createJobSchema = z.object({
  statusId: z.number().optional(),
  title: z.string().min(1).max(512),
  slug: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  companyId: z.number().optional(),
  companyName: z.string().min(1).max(255),
  companyLogo: z.string().optional(),
  companyWebsite: z.string().optional(),
  location: z.string().optional(),
  countryId: z.number().optional(),
  cityId: z.number().optional(),
  isRemote: z.boolean().optional(),
  remoteType: z.enum(["fully_remote", "hybrid", "on_site"]).optional(),
  roleType: z.enum(["full_time", "part_time", "contract", "internship", "freelance"]).optional(),
  seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  salaryPeriod: z.enum(["hourly", "monthly", "yearly"]).optional(),
  applyUrl: z.string().optional(),
  applyEmail: z.string().optional(),
  expiresAt: z.date().optional(),
  skills: z.array(z.string()).optional(),
  department: z.string().optional(),
  categoryIds: z.array(z.number()).optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
});

const updateJobSchema = createJobSchema.partial().extend({
  id: z.number(),
});

const listJobsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  categoryId: z.number().optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  roleType: z.enum(["full_time", "part_time", "contract", "internship", "freelance"]).optional(),
  seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
  isRemote: z.boolean().optional(),
  location: z.string().optional(),
  countryId: z.number().optional(),
  cityId: z.number().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  department: z.string().optional(),
  companyId: z.number().optional(),
  datePosted: z.enum(["past_24h", "past_week", "past_month", "any"]).optional(),
  // Edition bias — when set, jobs from this country are surfaced first,
  // then the rest fall in by the existing sort. Threaded from the
  // visitor's active edition via the client's useEdition() hook.
  editionCountryId: z.number().optional(),
  sortBy: z
    .enum(["createdAt", "publishedAt", "title", "salaryMax", "companyName", "status", "viewCount"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ------------------------------------------------------------
// Tenant scope is resolved by the tenant extraction middleware and
// placed on ctx. NULL = the legacy techscoop.io public job board;
// concrete = a SaaS tenant's branded board. Both paths share the same
// service + repository layer; scope only changes the WHERE clause.
// ------------------------------------------------------------
function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

export const jobsRouter = router({
  // ============================================================
  // Dropdowns
  // ============================================================

  listCountries: publicProcedure.query(() => jobSearchService.listCountries()),

  listCities: publicProcedure
    .input(z.object({ countryId: z.number() }))
    .query(({ input }) => jobSearchService.listCities(input.countryId)),

  suggestTitles: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input, ctx }) => jobSearchService.suggestTitles(scope(ctx), input.query)),

  suggestSkills: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(({ input, ctx }) => jobSearchService.suggestSkills(scope(ctx), input.query)),

  // ============================================================
  // Public listing + detail
  // ============================================================

  list: publicProcedure
    .input(listJobsSchema)
    .query(({ input, ctx }) => jobSearchService.listPublic(scope(ctx), input)),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input, ctx }) => jobsService.getPublicBySlug(scope(ctx), input.slug)),

  // ============================================================
  // Admin listing + detail
  // ============================================================

  adminList: protectedProcedure
    .input(listJobsSchema)
    .query(({ input, ctx }) =>
      jobSearchService.listAdmin(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      jobsService.getAdmin(scope(ctx), input.id, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  // ============================================================
  // CRUD
  // ============================================================

  create: protectedProcedure
    .input(createJobSchema)
    .mutation(({ input, ctx }) =>
      jobsService.create(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  update: protectedProcedure
    .input(updateJobSchema)
    .mutation(({ input, ctx }) =>
      jobsService.update(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  transition: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        transitionId: z.number(),
        comment: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      jobsService.transitionStatus(
        scope(ctx),
        input.jobId,
        input.transitionId,
        { userId: ctx.user.id, role: ctx.user.role },
        input.comment,
      ),
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      jobsService.deleteOne(scope(ctx), input.id, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  // ============================================================
  // Bulk actions
  // ============================================================

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        statusSlug: z.string(),
      }),
    )
    .mutation(({ input, ctx }) =>
      jobsService.bulkSetStatusBySlug(scope(ctx), input.ids, input.statusSlug, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(({ input, ctx }) =>
      jobsService.bulkDelete(scope(ctx), input.ids, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  // ============================================================
  // Tracking + Export
  // ============================================================

  trackApplication: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(({ input, ctx }) => jobsService.incrementApplicationCount(scope(ctx), input.jobId)),

  exportList: protectedProcedure
    .input(listJobsSchema.extend({ limit: z.number().default(10000) }))
    .query(({ input, ctx }) =>
      jobSearchService.exportList(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),
});
