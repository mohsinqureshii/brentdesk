/**
 * Compliance Module — Public Types
 * GDPR Article 15 (DSAR) + Article 17 (RTBF), CCPA, PDPL.
 */

export type PiiSubjectType =
  | "candidate"
  | "application"
  | "resume"
  | "assessment_attempt"
  | "github_profile";

export type PiiAction = "read" | "export" | "update" | "delete" | "consent";

export type ErasureStatus = "pending" | "approved" | "executed" | "rejected" | "expired";

export type LegalBasis =
  | "gdpr_article_17"
  | "ccpa"
  | "pdpl"
  | "tenant_request";

export interface PiiAccessLogEntry {
  tenantId?: number | null;
  actorUserId: number;
  actorRole?: string;
  subjectType: PiiSubjectType;
  subjectId: number;
  action: PiiAction;
  ipAddress?: string;
  userAgent?: string;
}

export interface DsarBundle {
  candidate: Record<string, unknown> | null;
  applications: Record<string, unknown>[];
  resumeParses: Record<string, unknown>[];
  assessmentAttempts: Record<string, unknown>[];
  githubProfile: Record<string, unknown> | null;
  scores: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  exportedAt: string;
}

export class ErasureRequestNotFoundError extends Error {
  constructor(id: number) {
    super(`Erasure request not found: ${id}`);
    this.name = "ErasureRequestNotFoundError";
  }
}

export class GracePeriodNotElapsedError extends Error {
  constructor(remainingDays: number) {
    super(`Grace period not elapsed (${remainingDays} days remaining)`);
    this.name = "GracePeriodNotElapsedError";
  }
}
