/**
 * Interview Feedback Service
 * ----------------------------------------------------------------------
 * Anti-bias rule: a participant can only see other interviewers'
 * feedback once they've submitted their own. This is enforced in
 * `listForInterview`. Submission itself is upsert-on-(interview,
 * interviewer) so a draft can be saved and re-saved without polluting
 * the audit row count.
 */

import * as feedbackRepo from "../repositories/interviewFeedback.repository";
import * as interviewsRepo from "../repositories/interviews.repository";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import { toDbDate } from "../../../_core/dbValues";
import {
  ForbiddenError,
  InterviewFeedbackDTO,
  InterviewNotFoundError,
  InterviewRecommendation,
  RequesterContext,
  SubmitFeedbackInput,
  TenantScope,
} from "../types";

function toDTO(row: any): InterviewFeedbackDTO {
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    interviewId: row.interviewId,
    interviewerId: row.interviewerId,
    overallRating: row.overallRating ?? null,
    technicalRating: row.technicalRating ?? null,
    communicationRating: row.communicationRating ?? null,
    cultureRating: row.cultureRating ?? null,
    recommendation: (row.recommendation ?? null) as InterviewRecommendation | null,
    strengths: row.strengths ?? null,
    concerns: row.concerns ?? null,
    notes: row.notes ?? null,
    submittedAt: row.submittedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireInterviewInScope(interviewId: number, scope: TenantScope) {
  const row = await interviewsRepo.findById(interviewId);
  if (!row) throw new InterviewNotFoundError(interviewId);
  assertTenantScope(row.tenantId ?? null, scope, "feedback.requireInterview");
  return row;
}

export class FeedbackService {
  /**
   * Submit (or update) an interviewer's feedback for an interview.
   * Only the interviewer themselves can write — admins included in
   * `assignedInterviewerIds` can submit, but admins not assigned
   * cannot submit "on behalf of" someone else (that bypass is left to
   * a future explicit endpoint).
   */
  async submit(
    scope: TenantScope,
    interviewId: number,
    input: SubmitFeedbackInput,
    requester: RequesterContext,
  ): Promise<InterviewFeedbackDTO> {
    assertTenantSupported(scope);
    const interview = await requireInterviewInScope(interviewId, scope);

    let assigned: number[] = [];
    if (Array.isArray(interview.assignedInterviewerIds)) {
      assigned = interview.assignedInterviewerIds as number[];
    } else if (typeof interview.assignedInterviewerIds === "string") {
      try {
        const parsed = JSON.parse(interview.assignedInterviewerIds);
        if (Array.isArray(parsed)) assigned = parsed;
      } catch {
        assigned = [];
      }
    }
    if (!assigned.includes(requester.userId)) {
      throw new ForbiddenError("Only assigned interviewers can submit feedback");
    }

    const existing = await feedbackRepo.findByInterviewer(interviewId, requester.userId);
    const values: Record<string, unknown> = {
      overallRating: input.overallRating ?? null,
      technicalRating: input.technicalRating ?? null,
      communicationRating: input.communicationRating ?? null,
      cultureRating: input.cultureRating ?? null,
      recommendation: input.recommendation ?? null,
      strengths: input.strengths ?? null,
      concerns: input.concerns ?? null,
      notes: input.notes ?? null,
      submittedAt: toDbDate(new Date()),
    };

    let id: number;
    if (existing) {
      await feedbackRepo.update(existing.id, values);
      id = existing.id;
    } else {
      const result = await feedbackRepo.insert({
        tenantId: scope,
        interviewId,
        interviewerId: requester.userId,
        ...values,
      });
      id = result.insertId;
    }

    const row = await feedbackRepo.findByInterviewer(interviewId, requester.userId);
    return toDTO(row ?? { id, interviewId, interviewerId: requester.userId, ...values, tenantId: scope });
  }

  /**
   * Returns all feedback for the interview only AFTER the requester
   * has submitted their own. Until then returns only their own row
   * (anti-bias). Admins bypass the gate to support audits.
   */
  async listForInterview(
    scope: TenantScope,
    interviewId: number,
    requester: RequesterContext,
  ): Promise<InterviewFeedbackDTO[]> {
    assertTenantSupported(scope);
    await requireInterviewInScope(interviewId, scope);

    const all = await feedbackRepo.listForInterview(interviewId);
    if (requester.role === "admin") return all.map(toDTO);

    const own = all.find((r) => r.interviewerId === requester.userId && r.submittedAt !== null);
    if (!own) {
      // Hide everyone else's until requester has submitted.
      return all.filter((r) => r.interviewerId === requester.userId).map(toDTO);
    }
    return all.map(toDTO);
  }
}

export const feedbackService = new FeedbackService();
