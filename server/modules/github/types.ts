/**
 * GitHub Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Phase 4 (GitHub Intelligence) — backend-only contract for the Talent
 * Platform. Profiles attach to a candidate (1:1), repos+signals are
 * derived. Tenant scoping is via candidate.tenantId — this module
 * never reads candidate rows directly; callers pass scope + the
 * candidateId and the service rejects cross-tenant access.
 *
 * GitHub App credentials live in `integration_configs` with
 * integrationId='github-app' — same pattern Stripe + Resend use.
 * Required public fields: { appId, clientId }, secrets:
 * { clientSecret, privateKey, webhookSecret }.
 */

export type TenantScope = number | null;

// ============================================================
// DTOs — what services return
// ============================================================

export interface GithubProfileDTO {
  id: number;
  candidateId: number;
  githubUserId: number;
  handle: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  company: string | null;
  location: string | null;
  followers: number | null;
  following: number | null;
  publicRepos: number | null;
  createdOnGithubAt: string | null;
  installationId: number | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GithubRepoDTO {
  id: number;
  profileId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  isFork: boolean;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  openIssues: number;
  lastPushAt: string | null;
  topics: string[];
  homepage: string | null;
  commitCount30d: number | null;
  commitCountTotal: number | null;
  isArchived: boolean;
}

export type GithubSignalType =
  | "language_distribution"
  | "contribution_cadence"
  | "project_velocity"
  | "collaboration"
  | "tech_stack"
  | "open_source_impact"
  | "ai_summary";

export interface GithubSignalDTO<T = unknown> {
  id: number;
  profileId: number;
  signalType: GithubSignalType;
  payload: T;
  score: number | null;
  computedAt: string;
}

// ============================================================
// Signal payload shapes
// ============================================================

export interface LanguageDistributionPayload {
  languages: Array<{ language: string; bytes: number; percentage: number }>;
  totalBytes: number;
}

export type CadenceCategory = "inactive" | "sparse" | "steady" | "high";

export interface ContributionCadencePayload {
  recent30d: number;
  reposActive30d: number;
  cadenceCategory: CadenceCategory;
}

export interface ProjectVelocityPayload {
  reposPushed90d: number;
  totalRepos: number;
  velocityRatio: number;
}

export interface CollaborationPayload {
  reposWithForks: number;
  reposWithStars: number;
  reposWithIssues: number;
  collaborationScore: number;
}

export interface TechStackPayload {
  topLanguages: string[];
  topics: Array<{ topic: string; count: number }>;
}

export interface OpenSourceImpactPayload {
  totalStars: number;
  totalForks: number;
  originalRepos: number;
  forkRepos: number;
  impactRatio: number;
}

export interface AiSummaryPayload {
  summary: string;
  strengths: string[];
  concerns: string[];
}

/** Aggregated signals snapshot — what the recruiter-facing endpoints return. */
export interface EngineeringSignals {
  languageDistribution: LanguageDistributionPayload | null;
  contributionCadence: ContributionCadencePayload | null;
  projectVelocity: ProjectVelocityPayload | null;
  collaboration: CollaborationPayload | null;
  techStack: TechStackPayload | null;
  openSourceImpact: OpenSourceImpactPayload | null;
  aiSummary: AiSummaryPayload | null;
}

// ============================================================
// Job queue types
// ============================================================

export type GithubFetchJobType =
  | "initial_sync"
  | "incremental"
  | "signals_compute"
  | "manual_refresh";

export type GithubFetchJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "retrying";

// ============================================================
// Service input shapes
// ============================================================

export interface RequesterContext {
  userId: number;
  role: string;
}

export interface ConnectCandidateInput {
  candidateId: number;
  oauthCode: string;
}

export interface GithubAppConfig {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  webhookSecret: string;
}

export interface OauthTokenExchange {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
}

// ============================================================
// Errors
// ============================================================

export class GithubProfileNotFoundError extends Error {
  constructor(idOrCandidate: number | string) {
    super(`GitHub profile not found: ${idOrCandidate}`);
    this.name = "GithubProfileNotFoundError";
  }
}

export class GithubAuthError extends Error {
  constructor(reason: string) {
    super(`GitHub auth error: ${reason}`);
    this.name = "GithubAuthError";
  }
}

export class GithubConfigError extends Error {
  constructor(reason: string) {
    super(`GitHub config error: ${reason}`);
    this.name = "GithubConfigError";
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
