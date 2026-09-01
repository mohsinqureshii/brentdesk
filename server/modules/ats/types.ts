/**
 * ATS Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Module boundary contract for the Phase 3 ATS pipeline. Consumers of
 * the ats module import from `../ats` (which re-exports from here),
 * NEVER from `drizzle/schema` directly.
 *
 * Convention:
 *   - DTOs are the shape returned by services (camelCase, no DB internals).
 *   - Input types describe service method parameters.
 *   - Zod schemas live next to the router that validates them.
 */

// ============================================================
// TENANT SCOPE
// ============================================================
//
// Every service method that touches data takes a TenantScope. NULL is
// the legacy/public path; a concrete tenantId means a SaaS tenant.

export type TenantScope = number | null;

// ============================================================
// Shared shapes
// ============================================================

export interface RequesterContext {
  userId: number;
  role: string;
}

// ============================================================
// DTOs — what services return
// ============================================================

export type PipelineStageCategory =
  | "sourcing"
  | "screening"
  | "interviewing"
  | "offer"
  | "hired"
  | "rejected";

export interface PipelineStageDTO {
  id: number;
  tenantId: TenantScope;
  jobId: number | null;
  name: string;
  slug: string;
  position: number;
  color: string | null;
  category: PipelineStageCategory;
  isTerminal: boolean;
  isDefault: boolean;
  autoEmailTemplateId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type InterviewType =
  | "phone_screen"
  | "technical"
  | "system_design"
  | "behavioral"
  | "culture"
  | "final"
  | "ai_interview";

export type InterviewStatus =
  | "scheduled"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface InterviewDTO {
  id: number;
  tenantId: TenantScope;
  applicationId: number;
  stageId: number | null;
  type: InterviewType;
  scheduledAt: string | null;
  durationMinutes: number | null;
  location: string | null;
  meetingUrl: string | null;
  assignedInterviewerIds: number[];
  status: InterviewStatus;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export type InterviewRecommendation =
  | "strong_hire"
  | "hire"
  | "no_hire"
  | "strong_no_hire"
  | "unsure";

export interface InterviewFeedbackDTO {
  id: number;
  tenantId: TenantScope;
  interviewId: number;
  interviewerId: number;
  overallRating: number | null;
  technicalRating: number | null;
  communicationRating: number | null;
  cultureRating: number | null;
  recommendation: InterviewRecommendation | null;
  strengths: string | null;
  concerns: string | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OfferStatus =
  | "drafted"
  | "sent"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired";

export interface OfferDTO {
  id: number;
  tenantId: TenantScope;
  applicationId: number;
  extendedById: number;
  baseSalary: string | null;
  bonus: string | null;
  equity: string | null;
  currency: string | null;
  startDate: string | null;
  expiresAt: string | null;
  status: OfferStatus;
  letterBody: string | null;
  declineReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecruiterNoteVisibility = "private" | "team" | "tenant";

export interface RecruiterNoteDTO {
  id: number;
  tenantId: TenantScope;
  applicationId: number | null;
  candidateId: number | null;
  authorId: number;
  body: string;
  visibility: RecruiterNoteVisibility;
  mentions: number[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Service input shapes (mirror the router zod schemas)
// ============================================================

export interface CreateStageInput {
  jobId?: number | null;
  name: string;
  slug?: string;
  position: number;
  color?: string;
  category?: PipelineStageCategory;
  isTerminal?: boolean;
  isDefault?: boolean;
  autoEmailTemplateId?: number;
}

export type UpdateStageInput = Partial<CreateStageInput>;

export interface CreateInterviewInput {
  applicationId: number;
  stageId?: number | null;
  type: InterviewType;
  scheduledAt: Date;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  assignedInterviewerIds: number[];
}

export interface SubmitFeedbackInput {
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  cultureRating?: number;
  recommendation?: InterviewRecommendation;
  strengths?: string;
  concerns?: string;
  notes?: string;
}

export interface CreateOfferInput {
  applicationId: number;
  baseSalary?: number;
  bonus?: number;
  equity?: string;
  currency?: string;
  startDate?: Date;
  expiresAt?: Date;
  letterBody?: string;
}

export interface NoteTarget {
  applicationId?: number;
  candidateId?: number;
}

// ============================================================
// Errors — typed errors callers can pattern-match on
// ============================================================

export class StageNotFoundError extends Error {
  constructor(id: number) {
    super(`Pipeline stage not found: ${id}`);
    this.name = "StageNotFoundError";
  }
}

export class InterviewNotFoundError extends Error {
  constructor(id: number) {
    super(`Interview not found: ${id}`);
    this.name = "InterviewNotFoundError";
  }
}

export class OfferNotFoundError extends Error {
  constructor(id: number) {
    super(`Offer not found: ${id}`);
    this.name = "OfferNotFoundError";
  }
}

export class NoteNotFoundError extends Error {
  constructor(id: number) {
    super(`Recruiter note not found: ${id}`);
    this.name = "NoteNotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ForbiddenError";
  }
}

export class TenantScopeViolationError extends Error {
  constructor(detail: string) {
    super(`Tenant scope violation: ${detail}`);
    this.name = "TenantScopeViolationError";
  }
}
