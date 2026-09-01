/**
 * Matching Module — Public Boundary
 * ----------------------------------------------------------------------
 * Phase 6 of the Talent Platform. The ONLY file consumers of the
 * matching module should import from. If something isn't exported
 * here it's module-internal — touching it from outside is a layering
 * violation (enforced in CI by scripts/check-module-boundaries.mjs).
 *
 * When this module is extracted to its own service (HTTP/gRPC), this
 * file becomes the client SDK — everything else stays put.
 */

// ------------------------------------------------------------
// Router — registered with the root tRPC router
// ------------------------------------------------------------
export { matchingRouter } from "./matching.router";

// ------------------------------------------------------------
// Services — for cross-module callers (admin batch jobs, schedulers,
// the future external recruiter API). Wrapped as singletons so the
// extraction path is just s/import singleton/import client/g.
// ------------------------------------------------------------
export { scoringService } from "./services/scoring.service";
export { matchingService } from "./services/matching.service";
export { embeddingService } from "./services/embedding.service";
export { isConfigured as isQdrantConfigured } from "./services/qdrantClient.service";

// ------------------------------------------------------------
// Types — DTOs, weights, results
// ------------------------------------------------------------
export type {
  TenantScope,
  RequesterContext,
  ScoringWeights,
  CandidateScoreDTO,
  ScoreBreakdown,
  JobMatchResult,
  CandidateJobMatchResult,
  SemanticSearchResult,
} from "./types";

export { DEFAULT_WEIGHTS } from "./types";

export {
  ScoreNotComputedError,
  QdrantUnavailableError,
  TenantScopeViolationError,
  UnauthorizedError,
} from "./types";
