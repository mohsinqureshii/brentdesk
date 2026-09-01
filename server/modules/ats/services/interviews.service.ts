/**
 * Interviews Service
 * ----------------------------------------------------------------------
 * Schedule, reschedule, cancel, complete interviews. On scheduling we
 * fire a candidate notification email through the shared email
 * service — same transport the rest of the platform uses.
 *
 * Tenant scoping mirrors the jobs module: every read/write filters or
 * sets tenantId, and post-read assertions ensure the row belongs to
 * the caller's tenant.
 */

import * as interviewsRepo from "../repositories/interviews.repository";
import { jobApplicationsService } from "../../jobs";
import { tenantsService } from "../../tenants";
import { logPii } from "../../compliance";
import { sendEmail } from "../../../services/email.service";
import * as interviewScheduledTemplate from "../../../services/emailTemplates/interviewScheduled";
import { DEFAULT_TENANT_NAME } from "../../../services/emailTemplates/_layout";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import {
  CreateInterviewInput,
  ForbiddenError,
  InterviewDTO,
  InterviewNotFoundError,
  InterviewStatus,
  InterviewType,
  RequesterContext,
  TenantScope,
} from "../types";

const RECRUITER_PLUS = new Set(["admin", "recruiter", "hiring_manager", "owner"]);

function gateRecruiter(requester: RequesterContext) {
  if (!RECRUITER_PLUS.has(requester.role)) {
    throw new ForbiddenError("Recruiter role required");
  }
}

function toDTO(row: any): InterviewDTO {
  let assigned: number[] = [];
  if (Array.isArray(row.assignedInterviewerIds)) {
    assigned = row.assignedInterviewerIds as number[];
  } else if (typeof row.assignedInterviewerIds === "string") {
    try {
      const parsed = JSON.parse(row.assignedInterviewerIds);
      if (Array.isArray(parsed)) assigned = parsed;
    } catch {
      assigned = [];
    }
  }
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    applicationId: row.applicationId,
    stageId: row.stageId ?? null,
    type: row.type as InterviewType,
    scheduledAt: row.scheduledAt ?? null,
    durationMinutes: row.durationMinutes ?? null,
    location: row.location ?? null,
    meetingUrl: row.meetingUrl ?? null,
    assignedInterviewerIds: assigned,
    status: row.status as InterviewStatus,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireInterview(id: number, scope: TenantScope) {
  const row = await interviewsRepo.findById(id);
  if (!row) throw new InterviewNotFoundError(id);
  assertTenantScope(row.tenantId ?? null, scope, "interviews.findById");
  return row;
}

export class InterviewsService {
  async schedule(
    scope: TenantScope,
    input: CreateInterviewInput,
    requester: RequesterContext,
  ): Promise<InterviewDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    const app = await jobApplicationsService.findById(scope, input.applicationId);
    if (!app) throw new ForbiddenError("Application not found in tenant scope");

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "application",
      subjectId: input.applicationId,
      action: "update",
      ipAddress: undefined,
    });

    const result = await interviewsRepo.insert({
      tenantId: scope,
      applicationId: input.applicationId,
      stageId: input.stageId ?? null,
      type: input.type,
      scheduledAt: input.scheduledAt.toISOString(),
      durationMinutes: input.durationMinutes ?? null,
      location: input.location ?? null,
      meetingUrl: input.meetingUrl ?? null,
      assignedInterviewerIds: input.assignedInterviewerIds,
      status: "scheduled",
      createdById: requester.userId,
    });

    const row = await interviewsRepo.findById(result.insertId);

    // Best-effort notification — failure is logged but the interview
    // is still scheduled; the recruiter can re-trigger the email.
    if ((app as any).applicantEmail) {
      try {
        const tenant = scope !== null ? await tenantsService.getById(scope) : null;
        const tenantName = tenant?.name || DEFAULT_TENANT_NAME;
        const { subject, html, text } = interviewScheduledTemplate.build({
          tenantName,
          candidateName: (app as any).applicantName || "there",
          jobTitle: (app as any).jobTitle || input.type.replace(/_/g, " "),
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes ?? null,
          meetingUrl: input.meetingUrl ?? null,
          location: input.location ?? null,
        });
        await sendEmail({
          to: (app as any).applicantEmail,
          subject,
          html,
          text,
          entityType: "interview",
          entityId: result.insertId,
          type: "interview_scheduled",
        });
      } catch (err) {
        console.error("[ATS][Interviews] schedule email failed:", err);
      }
    }

    return toDTO(row);
  }

  async reschedule(
    scope: TenantScope,
    id: number,
    newScheduledAt: Date,
    requester: RequesterContext,
  ): Promise<InterviewDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    await requireInterview(id, scope);

    await interviewsRepo.update(id, {
      scheduledAt: newScheduledAt.toISOString(),
      status: "rescheduled",
    });
    const row = await interviewsRepo.findById(id);
    return toDTO(row);
  }

  async cancel(
    scope: TenantScope,
    id: number,
    reason: string,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    await requireInterview(id, scope);
    await interviewsRepo.cancel(id, reason);
    return { success: true as const };
  }

  async complete(scope: TenantScope, id: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    await requireInterview(id, scope);
    await interviewsRepo.update(id, { status: "completed" });
    return { success: true as const };
  }

  async listForApplication(
    scope: TenantScope,
    applicationId: number,
    requester: RequesterContext,
  ): Promise<InterviewDTO[]> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    const rows = await interviewsRepo.listForApplication(applicationId);
    return rows
      .filter((r) => (r.tenantId ?? null) === scope)
      .map(toDTO);
  }

  async listUpcoming(
    scope: TenantScope,
    days: number,
    requester: RequesterContext,
  ): Promise<InterviewDTO[]> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    const now = new Date();
    const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = await interviewsRepo.listScheduledForTenant(scope, now, to);
    return rows.map(toDTO);
  }
}

export const interviewsService = new InterviewsService();
