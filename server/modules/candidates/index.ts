/**
 * Candidates Module — Public Boundary
 * ----------------------------------------------------------------------
 * The ONLY file consumers of the candidates module should import from.
 * If something isn't exported here, it's module-internal — touching it
 * from outside is a layering violation (enforced in CI by
 * `scripts/check-module-boundaries.mjs`).
 *
 * When this module is extracted to its own service (HTTP/gRPC), this
 * file becomes the client SDK — everything else stays put.
 */

// ------------------------------------------------------------
// Routers — registered with the root tRPC router
// ------------------------------------------------------------
export { candidatesRouter } from "./candidates.router";

// ------------------------------------------------------------
// Services — for cross-module callers (e.g. ATS pipeline applications
// flow, recruiter tooling) and for the future microservice client
// ------------------------------------------------------------
export { candidatesService } from "./services/candidates.service";
export { resumeParserService } from "./services/resumeParser.service";
export { candidatesQueryService } from "./services/candidatesQuery.service";

// ------------------------------------------------------------
// Types — DTOs, inputs, errors
// ------------------------------------------------------------
export type {
  CandidateDTO,
  CandidateProfileInput,
  CandidateListFilters,
  CandidateListResult,
  ParsedResume,
  ParsedResumeEducation,
  ParsedResumeExperience,
  ResumeParseDTO,
  ConsentKind,
  CandidateVisibilitySource,
  RequesterContext,
  TenantScope,
} from "./types";

export {
  CandidateNotFoundError,
  TenantScopeViolationError,
  UnauthorizedError,
  ForbiddenError,
  ResumeParseError,
} from "./types";
