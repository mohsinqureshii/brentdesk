/**
 * Assessments Module — Public Boundary
 * ----------------------------------------------------------------------
 * The ONLY file consumers of the assessments module should import from.
 * When the module is extracted to its own service (HTTP/gRPC), this file
 * becomes the client SDK — everything else stays put.
 *
 * Phase 5: backend complete. Frontend wires up against the router via
 * the standard tRPC client; cross-module consumers (scoring, candidate
 * profile, dashboards) import the services from here.
 */

// Router — registered with the root tRPC router
export { assessmentsRouter } from "./assessments.router";

// Services — for cross-module callers (scoring engine, candidate
// dashboard widgets, recruiter analytics).
export { templatesService } from "./services/templates.service";
export { attemptsService } from "./services/attempts.service";
export { codeRunsService } from "./services/codeRuns.service";
export { aiInterviewService } from "./services/aiInterview.service";
export { plagiarismService } from "./services/plagiarism.service";
// Phase 6 cross-module helper for scoring/matching (read-only score lookups).
export { assessmentAttemptsService } from "./services/assessmentAttempts.service";

// Types — DTOs and query shapes
export type {
  TenantScope,
  AssessmentCategory,
  QuestionType,
  AttemptStatus,
  InterviewRole,
  InterviewSessionStatus,
  PlagiarismMethod,
  AssessmentTemplateDTO,
  QuestionDTO,
  TestCase,
  Choice,
  AttemptDTO,
  ProctorViolation,
  AnswerDTO,
  CodeRunResult,
  CodeTestSuiteResult,
  InterviewTurnDTO,
  InterviewSessionDTO,
  PlagiarismReportDTO,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  InviteCandidateInput,
  SaveAnswerInput,
  RequesterContext,
} from "./types";

export {
  TemplateNotFoundError,
  QuestionNotFoundError,
  AttemptNotFoundError,
  AttemptExpiredError,
  InvalidInviteTokenError,
  Judge0Error,
  TenantScopeViolationError,
  UnauthorizedError,
  ForbiddenError,
  InterviewSessionNotFoundError,
} from "./types";
