/**
 * Jobs Module — Public Boundary
 * ----------------------------------------------------------------------
 * The ONLY file consumers of the jobs module should import from. If
 * something isn't exported here, it's module-internal — touching it
 * from outside is a layering violation.
 *
 * When this module is extracted to its own service (HTTP/gRPC), this
 * file becomes the client SDK — everything else stays put.
 *
 * Phase 0.5 status: scaffolding. The router exports are unchanged; the
 * service exports are stubs that get filled in steps 0.5c–0.5f.
 */

// ------------------------------------------------------------
// Routers — registered with the root tRPC router
// ------------------------------------------------------------
export { jobsRouter } from "./jobs.router";
export { jobApplicationsRouter } from "./jobApplications.router";

// ------------------------------------------------------------
// Services — for cross-module callers (e.g. SEO, sitemaps, related-
// content), and for the future microservice client
// ------------------------------------------------------------
export { jobsService } from "./services/jobs.service";
export { jobApplicationsService } from "./services/jobApplications.service";
export { jobSearchService } from "./services/jobSearch.service";
export { jobAnalyticsService } from "./services/jobAnalytics.service";

// ------------------------------------------------------------
// Types — DTOs and query shapes
// ------------------------------------------------------------
export type {
  JobDTO,
  JobApplicationDTO,
  JobSearchQuery,
  JobSearchResult,
  TenantScope,
} from "./types";

export {
  JobNotFoundError,
  JobApplicationNotFoundError,
  TenantScopeViolationError,
} from "./types";
