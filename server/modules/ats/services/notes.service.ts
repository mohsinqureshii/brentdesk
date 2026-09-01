/**
 * Recruiter Notes Service
 * ----------------------------------------------------------------------
 * Free-form notes attached to a job application or candidate.
 * Visibility model:
 *   - `private` — author only
 *   - `team`    — anyone on the tenant with recruiter+ role
 *   - `tenant`  — anyone in the tenant
 *
 * Update / delete are restricted to the author or an admin.
 */

import * as notesRepo from "../repositories/recruiterNotes.repository";
import { logPii } from "../../compliance";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import {
  ForbiddenError,
  NoteNotFoundError,
  NoteTarget,
  RecruiterNoteDTO,
  RecruiterNoteVisibility,
  RequesterContext,
  TenantScope,
} from "../types";

const RECRUITER_PLUS = new Set(["admin", "recruiter", "hiring_manager", "owner"]);

function isRecruiter(requester: RequesterContext) {
  return RECRUITER_PLUS.has(requester.role);
}

function toDTO(row: any): RecruiterNoteDTO {
  let mentions: number[] = [];
  if (Array.isArray(row.mentions)) {
    mentions = row.mentions as number[];
  } else if (typeof row.mentions === "string") {
    try {
      const parsed = JSON.parse(row.mentions);
      if (Array.isArray(parsed)) mentions = parsed;
    } catch {
      mentions = [];
    }
  }
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    applicationId: row.applicationId ?? null,
    candidateId: row.candidateId ?? null,
    authorId: row.authorId,
    body: row.body,
    visibility: row.visibility as RecruiterNoteVisibility,
    mentions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function canRead(row: any, requester: RequesterContext): boolean {
  if (requester.role === "admin") return true;
  switch (row.visibility) {
    case "private":
      return row.authorId === requester.userId;
    case "team":
      return isRecruiter(requester);
    case "tenant":
      return true;
    default:
      return false;
  }
}

async function requireNote(id: number, scope: TenantScope) {
  const row = await notesRepo.findById(id);
  if (!row) throw new NoteNotFoundError(id);
  assertTenantScope(row.tenantId ?? null, scope, "recruiterNotes.findById");
  return row;
}

export class NotesService {
  async add(
    scope: TenantScope,
    target: NoteTarget,
    body: string,
    visibility: RecruiterNoteVisibility,
    mentions: number[],
    requester: RequesterContext,
  ): Promise<RecruiterNoteDTO> {
    assertTenantSupported(scope);
    if (!target.applicationId && !target.candidateId) {
      throw new ForbiddenError("Note target requires applicationId or candidateId");
    }
    if (!isRecruiter(requester)) {
      throw new ForbiddenError("Recruiter role required");
    }

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: target.applicationId ? "application" : "candidate",
      subjectId: (target.applicationId ?? target.candidateId)!,
      action: "update",
      ipAddress: undefined,
    });

    const result = await notesRepo.insert({
      tenantId: scope,
      applicationId: target.applicationId ?? null,
      candidateId: target.candidateId ?? null,
      authorId: requester.userId,
      body,
      visibility,
      mentions,
    });
    const row = await notesRepo.findById(result.insertId);
    return toDTO(row);
  }

  async list(
    scope: TenantScope,
    target: NoteTarget,
    requester: RequesterContext,
  ): Promise<RecruiterNoteDTO[]> {
    assertTenantSupported(scope);
    if (!target.applicationId && !target.candidateId) {
      throw new ForbiddenError("Note target requires applicationId or candidateId");
    }

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: target.applicationId ? "application" : "candidate",
      subjectId: (target.applicationId ?? target.candidateId)!,
      action: "read",
      ipAddress: undefined,
    });

    const rows = target.applicationId
      ? await notesRepo.listForApplication(target.applicationId, requester.role)
      : await notesRepo.listForCandidate(target.candidateId!, requester.role);

    return rows
      .filter((r) => (r.tenantId ?? null) === scope)
      .filter((r) => canRead(r, requester))
      .map(toDTO);
  }

  async update(
    scope: TenantScope,
    id: number,
    patch: { body?: string; visibility?: RecruiterNoteVisibility; mentions?: number[] },
    requester: RequesterContext,
  ): Promise<RecruiterNoteDTO> {
    assertTenantSupported(scope);
    const row = await requireNote(id, scope);
    if (row.authorId !== requester.userId && requester.role !== "admin") {
      throw new ForbiddenError("Only the author or an admin can update this note");
    }
    const values: Record<string, unknown> = {};
    if (patch.body !== undefined) values.body = patch.body;
    if (patch.visibility !== undefined) values.visibility = patch.visibility;
    if (patch.mentions !== undefined) values.mentions = patch.mentions;
    await notesRepo.update(id, values);
    const fresh = await notesRepo.findById(id);
    return toDTO(fresh);
  }

  async delete(scope: TenantScope, id: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    const row = await requireNote(id, scope);
    if (row.authorId !== requester.userId && requester.role !== "admin") {
      throw new ForbiddenError("Only the author or an admin can delete this note");
    }
    await notesRepo.deleteById(id);
    return { success: true as const };
  }
}

export const notesService = new NotesService();
