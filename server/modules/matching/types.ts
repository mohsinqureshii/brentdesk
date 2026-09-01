/**
 * Matching Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Phase 6 of the Talent Platform — scoring + semantic match.
 * Consumers import from `../matching` (the boundary), never from
 * `drizzle/schema` or this file directly.
 *
 * Tenant scope mirrors jobs/candidates: NULL = legacy public scope,
 * concrete = a SaaS tenant's private board.
 */

// ============================================================
// TENANT SCOPE
// ============================================================

export type TenantScope = number | null;

// ============================================================
// REQUESTER CONTEXT
// ============================================================

export interface RequesterContext {
  userId: number;
  role: string;
}

// ============================================================
// SCORING WEIGHTS
// ============================================================

export interface ScoringWeights {
  resume: number;
  github: number;
  assessment: number;
  match: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  resume: 0.3,
  github: 0.2,
  assessment: 0.3,
  match: 0.2,
};

// ============================================================
// DTOs
// ============================================================

export interface CandidateScoreDTO {
  id: number;
  tenantId: number;
  candidateId: number;
  jobId: number | null;
  compositeScore: number | null;
  resumeScore: number | null;
  githubScore: number | null;
  assessmentScore: number | null;
  matchScore: number | null;
  weights: ScoringWeights;
  explanation: string | null;
  computedAt: string;
}

export interface ScoreBreakdown {
  resume: number | null;
  github: number | null;
  assessment: number | null;
  match: number | null;
  weights: ScoringWeights;
}

export interface JobMatchResult {
  candidateId: number;
  candidateName: string | null;
  matchScore: number;
  compositeScore: number | null;
  breakdown: ScoreBreakdown | null;
}

export interface CandidateJobMatchResult {
  jobId: number;
  jobTitle: string;
  matchScore: number;
  compositeScore: number | null;
}

export interface SemanticSearchResult {
  id: number;
  type: "candidate" | "job";
  name: string;
  score: number;
}

// ============================================================
// ERRORS
// ============================================================

export class ScoreNotComputedError extends Error {
  constructor(candidateId: number) {
    super(`Score not computed for candidate ${candidateId}`);
    this.name = "ScoreNotComputedError";
  }
}

export class QdrantUnavailableError extends Error {
  constructor(reason: string) {
    super(`Qdrant unavailable: ${reason}`);
    this.name = "QdrantUnavailableError";
  }
}

export class TenantScopeViolationError extends Error {
  constructor(detail: string) {
    super(`Tenant scope violation: ${detail}`);
    this.name = "TenantScopeViolationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnauthorizedError";
  }
}
