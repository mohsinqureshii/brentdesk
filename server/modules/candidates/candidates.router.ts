/**
 * Candidates Router
 * ----------------------------------------------------------------------
 * tRPC surface for the candidate core. Routes validate input and
 * delegate to the service layer. No DB queries here.
 *
 * Tenant scope is resolved by the tenant extraction middleware and
 * placed on ctx. NULL = legacy / public path; concrete = SaaS tenant.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { candidatesService } from "./services/candidates.service";
import { resumeExtraction } from "../../services/resumeExtraction.service";
import {
  CandidateNotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ResumeParseError,
} from "./types";

// ------------------------------------------------------------
// Tenant scope is resolved by the tenant extraction middleware and
// placed on ctx. Mirrors the jobs router pattern.
// ------------------------------------------------------------
function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

// ------------------------------------------------------------
// Map domain errors → TRPCError so clients see the right code.
// ------------------------------------------------------------
function rethrow(err: unknown): never {
  if (err instanceof CandidateNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof ForbiddenError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof UnauthorizedError) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
  }
  if (err instanceof ResumeParseError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  throw err;
}

// ------------------------------------------------------------
// Zod schemas
// ------------------------------------------------------------

const profileInputSchema = z.object({
  headline: z.string().max(255).nullable().optional(),
  currentTitle: z.string().max(255).nullable().optional(),
  currentCompany: z.string().max(255).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  countryId: z.number().int().nullable().optional(),
  cityId: z.number().int().nullable().optional(),
  openToRemote: z.boolean().optional(),
  openToRelocation: z.boolean().optional(),
  salaryExpectationMin: z.number().nullable().optional(),
  salaryExpectationMax: z.number().nullable().optional(),
  salaryExpectationCurrency: z.string().max(3).nullable().optional(),
  visaStatus: z.string().max(64).nullable().optional(),
  noticePeriod: z.string().max(64).nullable().optional(),
  githubHandle: z.string().max(128).nullable().optional(),
  linkedinUrl: z.string().max(2048).nullable().optional(),
  portfolioUrl: z.string().max(2048).nullable().optional(),
  summary: z.string().max(10000).nullable().optional(),
});

const listFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isArchived: z.boolean().optional(),
  location: z.string().optional(),
  openToRemote: z.boolean().optional(),
  yearsExperienceMin: z.number().int().min(0).optional(),
  yearsExperienceMax: z.number().int().min(0).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  skills: z.array(z.string()).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "lastActiveAt", "yearsExperience"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const consentKindSchema = z.enum(["data_processing", "marketing", "third_party"]);

// ------------------------------------------------------------
// Router
// ------------------------------------------------------------

export const candidatesRouter = router({
  // ============================================================
  // CANDIDATE-FACING
  // ============================================================

  /**
   * The current user's candidate profile in the active tenant. Creates
   * the row on first call (idempotent).
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      return await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
    } catch (err) {
      rethrow(err);
    }
  }),

  updateMyProfile: protectedProcedure
    .input(profileInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const me = await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
        return await candidatesService.updateProfile(scope(ctx), me.id, input, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  /**
   * Attach an uploaded resume media id + raw text. Parsing is awaited
   * so the client gets the parsed shape back in the same response.
   */
  uploadResume: protectedProcedure
    .input(
      z.object({
        mediaId: z.number().int(),
        rawText: z.string().min(20).max(200_000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const me = await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
        return await candidatesService.setResume(
          scope(ctx),
          me.id,
          input.mediaId,
          input.rawText,
          { userId: ctx.user.id, role: ctx.user.role },
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  /**
   * Upload a binary resume file (PDF / DOCX / TXT / MD) and have the
   * server extract its text before running the same setResume path that
   * `uploadResume` uses for pasted text. Lets the candidate UI accept
   * real files without shipping a PDF parser to the browser.
   *
   * WARN_MEDIA_BIND_TODO: mediaId can be 0 here when there's no actual
   * media row attached yet — the file binary isn't written into the
   * media table. A follow-up should wire the upload through the media
   * service so the parsed text and the original file stay linked.
   */
  uploadResumeFile: protectedProcedure
    .input(
      z.object({
        mediaId: z.number().int(),
        fileBase64: z.string().min(1),
        filename: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Empty file upload.",
        });
      }
      if (buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "Resume file exceeds 10MB limit.",
        });
      }
      let rawText: string;
      try {
        rawText = await resumeExtraction.extractText(buffer, input.filename);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to extract resume text.",
        });
      }
      if (rawText.trim().length < 20) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not extract enough text from the file. Try a different file or paste your resume as text.",
        });
      }
      try {
        const me = await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
        return await candidatesService.setResume(
          scope(ctx),
          me.id,
          input.mediaId,
          rawText,
          { userId: ctx.user.id, role: ctx.user.role },
        );
      } catch (err) {
        rethrow(err);
      }
    }),

  /** Latest parse for the current user. */
  getResumeParse: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const me = await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
      return await candidatesService.getLatestParse(scope(ctx), me.id, {
        userId: ctx.user.id,
        role: ctx.user.role,
      });
    } catch (err) {
      rethrow(err);
    }
  }),

  recordConsent: protectedProcedure
    .input(z.object({ kind: consentKindSchema }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const me = await candidatesService.getOrCreateForUser(scope(ctx), ctx.user.id);
        return await candidatesService.recordConsent(scope(ctx), me.id, input.kind, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  // ============================================================
  // RECRUITER / ADMIN
  // ============================================================

  /** Admin / recruiter view of an arbitrary candidate by id. */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await candidatesService.getProfile(scope(ctx), input.id, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  /** Tenant-scoped recruiter listing with filters + pagination. */
  listForTenant: protectedProcedure
    .input(listFiltersSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await candidatesService.listForTenant(scope(ctx), input, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await candidatesService.archive(scope(ctx), input.id, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await candidatesService.unarchive(scope(ctx), input.id, {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
      } catch (err) {
        rethrow(err);
      }
    }),
});
