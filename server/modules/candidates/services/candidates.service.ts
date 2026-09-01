/**
 * Candidates Service
 * ----------------------------------------------------------------------
 * Business logic for the candidate core (Phase 2). Owns:
 *   - idempotent get-or-create of a candidate row per (tenant, user)
 *   - profile read/update with consent + audit
 *   - resume upload trigger (delegates parsing to resumeParser.service)
 *   - archive / unarchive
 *   - tenant-scoped recruiter listing
 *
 * All public methods take a TenantScope and a RequesterContext. The
 * Phase 8 PII access log will hook in at the `PII_ACCESS_LOG_TODO`
 * markers below.
 */

import * as candidatesRepo from "../repositories/candidates.repository";
import * as resumeParsesRepo from "../repositories/resumeParses.repository";
import { resumeParserService } from "./resumeParser.service";
import { assertTenantSupported } from "../tenant.guard";
import { assertTenantScope } from "../tenant.guard";
import { logPii, logPiiBulk } from "../../compliance";
import {
  CandidateProfileInput,
  TenantScope,
  RequesterContext,
  CandidateNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConsentKind,
  CandidateListFilters,
  CandidateVisibilitySource,
} from "../types";

// ------------------------------------------------------------
// Role gate. Phase 1 RBAC will replace these with tenant-scoped
// `requirePermission()` calls once the membership table lands.
// ------------------------------------------------------------

const RECRUITER_ROLES = new Set(["admin", "recruiter", "hiring_manager", "senior_editor"]);
const ADMIN_ROLES = new Set(["admin"]);

function gateRecruiter(role: string) {
  if (!RECRUITER_ROLES.has(role)) throw new UnauthorizedError("Recruiter role required");
}

function isSelf(candidateUserId: number, requester: RequesterContext): boolean {
  return candidateUserId === requester.userId;
}

function gateReadProfile(candidateUserId: number, requester: RequesterContext) {
  if (isSelf(candidateUserId, requester)) return;
  if (RECRUITER_ROLES.has(requester.role)) return;
  throw new ForbiddenError("Cannot view this candidate profile");
}

function gateWriteProfile(candidateUserId: number, requester: RequesterContext) {
  if (isSelf(candidateUserId, requester)) return;
  if (ADMIN_ROLES.has(requester.role)) return;
  throw new ForbiddenError("Cannot edit this candidate profile");
}

// ------------------------------------------------------------
// Service
// ------------------------------------------------------------

export class CandidatesService {
  /**
   * Idempotent: one candidate row per (tenantId, userId). If the row
   * already exists, returns it; otherwise inserts a stub. Used by the
   * `me` procedure and the application flow (so applying creates the
   * row if needed).
   */
  async getOrCreateForUser(scope: TenantScope, userId: number) {
    assertTenantSupported(scope);

    const existing = await candidatesRepo.findByTenantUser(userId, scope);
    if (existing) return existing;

    await candidatesRepo.insert({
      tenantId: scope,
      userId,
      openToRemote: 0,
      openToRelocation: 0,
      isArchived: 0,
    });

    const created = await candidatesRepo.findByTenantUser(userId, scope);
    if (!created) throw new Error("Candidate insert produced no row");

    // For tenant-scoped candidates, fan out into the visibility table
    // so the same row shows up in the tenant's recruiter searches.
    if (scope !== null) {
      await candidatesRepo.addVisibility(created.id, scope, "signup");
    }

    return created;
  }

  /**
   * Profile fetch with authorization. Self can always read; recruiters
   * in this tenant can read. PII access is logged in Phase 8.
   */
  async getProfile(scope: TenantScope, candidateId: number, requester: RequesterContext) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.getProfile");

    gateReadProfile(row.userId, requester);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "read",
      ipAddress: undefined,
    });
    return row;
  }

  /**
   * Update profile fields. Only self or admin can edit; recruiters can
   * read but not edit a candidate's own profile fields.
   */
  async updateProfile(
    scope: TenantScope,
    candidateId: number,
    input: CandidateProfileInput,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.updateProfile");

    gateWriteProfile(row.userId, requester);

    const updateValues: Record<string, unknown> = { ...input };
    if (input.openToRemote !== undefined) {
      updateValues.openToRemote = input.openToRemote ? 1 : 0;
    }
    if (input.openToRelocation !== undefined) {
      updateValues.openToRelocation = input.openToRelocation ? 1 : 0;
    }
    if (input.salaryExpectationMin !== undefined && input.salaryExpectationMin !== null) {
      updateValues.salaryExpectationMin = String(input.salaryExpectationMin);
    }
    if (input.salaryExpectationMax !== undefined && input.salaryExpectationMax !== null) {
      updateValues.salaryExpectationMax = String(input.salaryExpectationMax);
    }

    await candidatesRepo.update(candidateId, updateValues);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "update",
      ipAddress: undefined,
    });
    return { success: true as const };
  }

  /**
   * Attach a resume media id and kick off LLM parsing. The parser
   * writes to `resume_parses` and updates `candidates.parsedResumeJson`.
   * Returns the parsed shape so the client can show a preview.
   *
   * The raw text comes from the media pipeline (PDF/docx extraction).
   * If you only have the media id, the caller is responsible for
   * resolving text first; this method assumes `rawText` is provided.
   */
  async setResume(
    scope: TenantScope,
    candidateId: number,
    mediaId: number,
    rawText: string,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.setResume");

    gateWriteProfile(row.userId, requester);

    // Record the media id immediately so the UI reflects upload, then
    // parse asynchronously-but-awaited so the client gets the parsed
    // shape in the same tRPC response.
    await candidatesRepo.update(candidateId, { resumeMediaId: mediaId });

    const parsed = await resumeParserService.parseAndPersist({
      candidateId,
      mediaId,
      rawText,
    });

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "resume",
      subjectId: mediaId,
      action: "update",
      ipAddress: undefined,
    });
    return { parsed };
  }

  /**
   * Latest parse result for a candidate. Used by the "resume preview"
   * UI. Self or recruiter can read.
   */
  async getLatestParse(scope: TenantScope, candidateId: number, requester: RequesterContext) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.getLatestParse");

    gateReadProfile(row.userId, requester);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "resume",
      subjectId: candidateId,
      action: "read",
      ipAddress: undefined,
    });
    return resumeParsesRepo.latestForCandidate(candidateId);
  }

  async archive(scope: TenantScope, candidateId: number, requester: RequesterContext) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.archive");

    gateWriteProfile(row.userId, requester);
    await candidatesRepo.archive(candidateId);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "update",
      ipAddress: undefined,
    });
    return { success: true as const };
  }

  async unarchive(scope: TenantScope, candidateId: number, requester: RequesterContext) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.unarchive");

    gateWriteProfile(row.userId, requester);
    await candidatesRepo.unarchive(candidateId);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "update",
      ipAddress: undefined,
    });
    return { success: true as const };
  }

  /**
   * Records a timestamped consent. Only the candidate themself can
   * record their own consent; admins recording on a user's behalf is
   * a Phase 8 (compliance) hook.
   */
  async recordConsent(
    scope: TenantScope,
    candidateId: number,
    kind: ConsentKind,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.recordConsent");

    if (!isSelf(row.userId, requester)) {
      throw new ForbiddenError("Only the candidate can record their consent");
    }

    const now = new Date().toISOString();
    const field =
      kind === "data_processing"
        ? "consentDataProcessingAt"
        : kind === "marketing"
          ? "consentMarketingAt"
          : "consentThirdPartyAt";

    await candidatesRepo.update(candidateId, { [field]: now });

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "consent",
      ipAddress: undefined,
    });
    return { success: true as const, kind, at: now };
  }

  /**
   * Recruiter listing. Currently scoped to a concrete tenant — the
   * legacy public scope (null) has no recruiter surface. Use
   * `listVisibleTo` to pick up referrals/application fan-out as well
   * as the tenant's own signups.
   */
  async listForTenant(
    scope: TenantScope,
    opts: CandidateListFilters,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    gateRecruiter(requester.role);

    if (scope === null) {
      // No public recruiter view — Phase 2 keeps the legacy null-scope
      // read-only for the candidate themself.
      return { items: [], total: 0, page: opts.page, limit: opts.limit };
    }

    const { items, total } = await candidatesRepo.listVisibleTo(scope, opts);

    await logPiiBulk(
      items.map((it: any) => ({
        tenantId: scope,
        actorUserId: requester.userId,
        actorRole: requester.role,
        subjectType: "candidate" as const,
        subjectId: it.id,
        action: "read" as const,
        ipAddress: undefined,
      })),
    );
    return { items, total, page: opts.page, limit: opts.limit };
  }

  /**
   * Fan-out helper: surface an existing candidate into another tenant
   * (e.g. when they apply to a tenant's job posting). Idempotent.
   */
  async grantVisibility(
    scope: TenantScope,
    candidateId: number,
    source: CandidateVisibilitySource,
  ) {
    assertTenantSupported(scope);
    if (scope === null) return; // No fan-out for legacy scope

    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);

    await candidatesRepo.addVisibility(candidateId, scope, source);
  }

  /** Untyped helper for callers (e.g. application flow) needing the row. */
  async requireById(scope: TenantScope, candidateId: number) {
    assertTenantSupported(scope);
    const row = await candidatesRepo.findById(candidateId);
    if (!row) throw new CandidateNotFoundError(candidateId);
    assertTenantScope(row.tenantId, scope, "candidates.requireById");
    return row;
  }
}

export const candidatesService = new CandidatesService();
