/**
 * Candidates Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Module boundary contract for the talent-platform candidate core
 * (Phase 2). Consumers import from `../candidates` (re-exported here),
 * NEVER from `drizzle/schema` directly. Keeping types here means we can
 * swap the storage layer or extract the module to its own service
 * without rippling type changes through the codebase.
 *
 * Conventions:
 *   - DTOs are the shape returned by services (camelCase, no DB internals).
 *   - Input types describe service method parameters.
 *   - Zod schemas live next to the router that validates them.
 */

// ============================================================
// TENANT SCOPE
// ============================================================
//
// Every service method that touches data takes a TenantScope. NULL is
// the global/legacy candidate pool. A concrete tenantId means a SaaS
// tenant's private candidate database.

export type TenantScope = number | null;

// ============================================================
// DTOs — what services return
// ============================================================

export interface CandidateDTO {
  id: number;
  tenantId: TenantScope;
  userId: number;
  headline: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  location: string | null;
  countryId: number | null;
  cityId: number | null;
  openToRemote: boolean;
  openToRelocation: boolean;
  salaryExpectationMin: number | null;
  salaryExpectationMax: number | null;
  salaryExpectationCurrency: string | null;
  visaStatus: string | null;
  noticePeriod: string | null;
  githubHandle: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeMediaId: number | null;
  parsedResumeJson: ParsedResume | null;
  parsedResumeAt: string | null;
  summary: string | null;
  consentDataProcessingAt: string | null;
  consentMarketingAt: string | null;
  consentThirdPartyAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
}

export interface ParsedResumeEducation {
  degree: string | null;
  institution: string | null;
  year: string | null;
}

export interface ParsedResumeExperience {
  company: string | null;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

export interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  skills: string[];
  education: ParsedResumeEducation[];
  experience: ParsedResumeExperience[];
  summary: string | null;
}

export interface ResumeParseDTO {
  id: number;
  candidateId: number;
  mediaId: number;
  provider: string | null;
  model: string | null;
  rawText: string | null;
  parsedJson: ParsedResume | null;
  qualityScore: number | null;
  error: string | null;
  latencyMs: number | null;
  createdAt: string;
}

// ============================================================
// Input shapes (mirror router zod schemas)
// ============================================================

export interface CandidateProfileInput {
  headline?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  yearsExperience?: number | null;
  location?: string | null;
  countryId?: number | null;
  cityId?: number | null;
  openToRemote?: boolean;
  openToRelocation?: boolean;
  salaryExpectationMin?: number | null;
  salaryExpectationMax?: number | null;
  salaryExpectationCurrency?: string | null;
  visaStatus?: string | null;
  noticePeriod?: string | null;
  githubHandle?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  summary?: string | null;
}

export type ConsentKind = "data_processing" | "marketing" | "third_party";

export type CandidateVisibilitySource =
  | "signup"
  | "referral"
  | "imported"
  | "application"
  | "admin";

export interface CandidateListFilters {
  page: number;
  limit: number;
  search?: string;
  isArchived?: boolean;
  location?: string;
  openToRemote?: boolean;
  yearsExperienceMin?: number;
  yearsExperienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  sortBy?: "createdAt" | "updatedAt" | "lastActiveAt" | "yearsExperience";
  sortOrder?: "asc" | "desc";
}

export interface CandidateListResult {
  items: CandidateDTO[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Requester / actor context
// ============================================================

export interface RequesterContext {
  userId: number;
  role: string;
}

// ============================================================
// Errors — typed errors callers can pattern-match on
// ============================================================

export class CandidateNotFoundError extends Error {
  constructor(id: number | string) {
    super(`Candidate not found: ${id}`);
    this.name = "CandidateNotFoundError";
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

export class ForbiddenError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ForbiddenError";
  }
}

export class ResumeParseError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ResumeParseError";
  }
}
