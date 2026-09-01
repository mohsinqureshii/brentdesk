/**
 * ATS Module — Public Boundary
 * ----------------------------------------------------------------------
 * The ONLY file consumers of the ats module should import from. If
 * something isn't exported here, it's module-internal — touching it
 * from outside is a layering violation.
 *
 * When this module is extracted to its own service (HTTP/gRPC), this
 * file becomes the client SDK — everything else stays put.
 */

// ------------------------------------------------------------
// Routers — registered with the root tRPC router
// ------------------------------------------------------------
export { atsRouter } from "./ats.router";

// ------------------------------------------------------------
// Services — for cross-module callers (e.g. tenant onboarding,
// candidate portal, future microservice client)
// ------------------------------------------------------------
export { pipelineService } from "./services/pipeline.service";
export { interviewsService } from "./services/interviews.service";
export { feedbackService } from "./services/feedback.service";
export { offersService } from "./services/offers.service";
export { notesService } from "./services/notes.service";
export { reportsService } from "./services/reports.service";
export type { ReportRange, ReportSummaryDTO } from "./services/reports.service";

// ------------------------------------------------------------
// Types — DTOs and query shapes
// ------------------------------------------------------------
export type {
  TenantScope,
  RequesterContext,
  PipelineStageDTO,
  PipelineStageCategory,
  InterviewDTO,
  InterviewType,
  InterviewStatus,
  InterviewFeedbackDTO,
  InterviewRecommendation,
  OfferDTO,
  OfferStatus,
  RecruiterNoteDTO,
  RecruiterNoteVisibility,
  NoteTarget,
  CreateStageInput,
  UpdateStageInput,
  CreateInterviewInput,
  SubmitFeedbackInput,
  CreateOfferInput,
} from "./types";

export {
  StageNotFoundError,
  InterviewNotFoundError,
  OfferNotFoundError,
  NoteNotFoundError,
  ForbiddenError,
  TenantScopeViolationError,
} from "./types";
