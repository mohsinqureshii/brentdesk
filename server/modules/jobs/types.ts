/**
 * Jobs Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Module boundary contract. Consumers of the jobs module import from
 * `../jobs` (which re-exports from here), NEVER from `drizzle/schema`
 * directly. Keeping types here means we can later swap the storage
 * layer (or extract the module to its own service) without rippling
 * type changes through the codebase.
 *
 * Convention:
 *   - DTOs are the shape returned by services (camelCase, no DB internals).
 *   - Query/Input types describe service method parameters.
 *   - Zod schemas live next to the router that validates them.
 */

// ============================================================
// TENANT SCOPE
// ============================================================
//
// Every service method that touches data takes a TenantScope. NULL is
// the public job board (legacy public job listings). A concrete
// tenantId means a SaaS tenant's private/branded board.

export type TenantScope = number | null;

// ============================================================
// DTOs — what services return
// ============================================================

export interface JobDTO {
  id: number;
  tenantId: TenantScope;
  statusId: number | null;
  title: string;
  slug: string;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  companyId: number | null;
  companyName: string;
  companyLogo: string | null;
  companyWebsite: string | null;
  location: string | null;
  countryId: number | null;
  cityId: number | null;
  isRemote: boolean;
  remoteType: "fully_remote" | "hybrid" | "on_site" | null;
  roleType: "full_time" | "part_time" | "contract" | "internship" | "freelance" | null;
  seniority: "entry" | "mid" | "senior" | "lead" | "executive" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "hourly" | "monthly" | "yearly" | null;
  applyUrl: string | null;
  applyEmail: string | null;
  department: string | null;
  skills: string[];
  visaSponsorship: boolean | null;
  publishedAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationDTO {
  id: number;
  jobId: number;
  tenantId: TenantScope;
  applicantUserId: number | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  cvUrl: string | null;
  coverLetter: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentTitle: string | null;
  yearsOfExperience: number | null;
  expectedSalary: number | null;
  noticePeriod: string | null;
  status:
    | "new"
    | "reviewed"
    | "shortlisted"
    | "interview"
    | "offered"
    | "hired"
    | "rejected"
    | "withdrawn";
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Query/Input shapes
// ============================================================

export interface JobSearchQuery {
  tenantId: TenantScope;
  page: number;
  limit: number;
  search?: string;
  status?: string;
  categoryId?: number;
  regionId?: number;
  sectorId?: number;
  roleType?: JobDTO["roleType"];
  seniority?: JobDTO["seniority"];
  isRemote?: boolean;
  location?: string;
  countryId?: number;
  cityId?: number;
  salaryMin?: number;
  salaryMax?: number;
  visaSponsorship?: boolean;
  sortBy?: "newest" | "oldest" | "salary_high" | "salary_low" | "relevance";
}

export interface JobSearchResult {
  items: JobDTO[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Errors — typed errors callers can pattern-match on
// ============================================================

export class JobNotFoundError extends Error {
  constructor(idOrSlug: number | string) {
    super(`Job not found: ${idOrSlug}`);
    this.name = "JobNotFoundError";
  }
}

export class TenantScopeViolationError extends Error {
  constructor(detail: string) {
    super(`Tenant scope violation: ${detail}`);
    this.name = "TenantScopeViolationError";
  }
}

export class JobApplicationNotFoundError extends Error {
  constructor(id: number) {
    super(`Job application not found: ${id}`);
    this.name = "JobApplicationNotFoundError";
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

export class AlreadyAppliedError extends Error {
  constructor() {
    super("You have already applied to this job");
    this.name = "AlreadyAppliedError";
  }
}

// ============================================================
// Service input shapes (mirror the router zod schemas)
// ============================================================

export interface CreateJobInput {
  statusId?: number;
  title: string;
  slug?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  companyId?: number;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  location?: string;
  countryId?: number;
  cityId?: number;
  isRemote?: boolean;
  remoteType?: "fully_remote" | "hybrid" | "on_site";
  roleType?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  seniority?: "entry" | "mid" | "senior" | "lead" | "executive";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: "hourly" | "monthly" | "yearly";
  applyUrl?: string;
  applyEmail?: string;
  expiresAt?: Date;
  skills?: string[];
  department?: string;
  categoryIds?: number[];
  regionIds?: number[];
  sectorIds?: number[];
}

export type UpdateJobInput = Partial<CreateJobInput> & { id: number };

export interface JobApplicationInput {
  jobId: number;
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  expectedSalary?: number;
  expectedSalaryCurrency: string;
  noticePeriod?: string;
  cvUrl?: string;
}

export interface JobApplicantContext {
  userId: number;
  name: string | null;
  email: string | null;
  jobTitle?: string | null;
  company?: string | null;
  avatar?: string | null;
  cvUrl?: string | null;
}

export type JobApplicationStatus =
  | "new"
  | "reviewed"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export type JobApplicationStatusFilter = JobApplicationStatus | "all";

export interface RequesterContext {
  userId: number;
  role: string;
}

export interface PublicListInput {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  employmentType?: string;
  categoryId?: number;
  regionId?: number;
  sectorId?: number;
  roleType?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  seniority?: "entry" | "mid" | "senior" | "lead" | "executive";
  isRemote?: boolean;
  location?: string;
  countryId?: number;
  cityId?: number;
  salaryMin?: number;
  salaryMax?: number;
  department?: string;
  companyId?: number;
  datePosted?: "past_24h" | "past_week" | "past_month" | "any";
  editionCountryId?: number;
  sortBy: "createdAt" | "publishedAt" | "title" | "salaryMax" | "companyName" | "status" | "viewCount";
  sortOrder: "asc" | "desc";
}

export type ClickType = "view" | "apply_click" | "save" | "share" | "external_apply";

export interface ClickActorContext {
  userId?: number | null;
  name?: string | null;
  avatar?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}
