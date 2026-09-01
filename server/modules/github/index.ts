/**
 * GitHub Module — Public Boundary (Phase 4)
 * ----------------------------------------------------------------------
 * The ONLY file consumers of the github module should import from. If
 * something isn't exported here, it's module-internal — touching it
 * from outside is a layering violation (enforced by
 * scripts/check-module-boundaries.mjs).
 *
 * Scheduler integration: import `githubFetcherService` from this
 * boundary and call `drainQueue()` on a tick — see github.router.ts
 * for the canonical wiring snippet.
 */

// ------------------------------------------------------------
// Routers — registered with the root tRPC router
// ------------------------------------------------------------
export { githubRouter } from "./github.router";

// ------------------------------------------------------------
// Services — for cross-module callers (scheduler, webhook handler)
// ------------------------------------------------------------
export { githubFetcherService } from "./services/githubFetcher.service";
export { githubSignalsService } from "./services/githubSignals.service";
export { githubProfileService } from "./services/githubProfile.service";
export { githubAuthService } from "./services/githubAuth.service";

// ------------------------------------------------------------
// Types — DTOs and signal shapes
// ------------------------------------------------------------
export type {
  GithubProfileDTO,
  GithubRepoDTO,
  GithubSignalDTO,
  GithubSignalType,
  EngineeringSignals,
  LanguageDistributionPayload,
  ContributionCadencePayload,
  CadenceCategory,
  ProjectVelocityPayload,
  CollaborationPayload,
  TechStackPayload,
  OpenSourceImpactPayload,
  AiSummaryPayload,
  GithubFetchJobType,
  GithubFetchJobStatus,
  GithubAppConfig,
  OauthTokenExchange,
  TenantScope,
  RequesterContext,
} from "./types";

export {
  GithubProfileNotFoundError,
  GithubAuthError,
  GithubConfigError,
  TenantScopeViolationError,
} from "./types";
