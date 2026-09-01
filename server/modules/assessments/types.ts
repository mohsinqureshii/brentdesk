/**
 * Assessments Module — Public Types & DTOs
 * ----------------------------------------------------------------------
 * Phase 5 of the TechScoop Talent Platform. Owns assessment templates,
 * candidate attempts, Judge0-backed code runs, AI interview state, and
 * plagiarism reports. Consumers import from `../assessments` (the
 * boundary), never from `drizzle/schema` directly — that lets us swap
 * the storage layer or extract the module to its own service without
 * rippling type changes through the codebase.
 *
 * Conventions mirror `server/modules/jobs/types.ts`:
 *   - DTOs are the camelCase shape returned by services.
 *   - Input types describe service method parameters (pure TypeScript,
 *     no zod, so non-router callers don't drag zod along).
 *   - Errors are typed so callers can pattern-match.
 */

// ============================================================
// TENANT SCOPE
// ============================================================
//
// Assessment templates and attempts are tenant-scoped. Unlike jobs, we
// expect concrete tenantIds in nearly every call — the legacy public
// surface doesn't run assessments. `null` is still accepted for parity
// with the rest of the module system.

export type TenantScope = number | null;

// ============================================================
// SHARED ENUMS
// ============================================================

export type AssessmentCategory =
  | "coding"
  | "system_design"
  | "technical_screen"
  | "behavioral"
  | "ai_interview"
  | "custom";

export type QuestionType =
  | "coding"
  | "multiple_choice"
  | "short_answer"
  | "long_answer"
  | "system_design"
  | "file_upload";

export type AttemptStatus =
  | "invited"
  | "in_progress"
  | "submitted"
  | "expired"
  | "graded"
  | "disqualified";

export type InterviewRole = "interviewer" | "candidate";

export type InterviewSessionStatus =
  | "active"
  | "completed"
  | "abandoned"
  | "timed_out";

export type PlagiarismMethod =
  | "token_shingle"
  | "embedding_similarity"
  | "exact_match";

// ============================================================
// DTOs
// ============================================================

export interface AssessmentTemplateDTO {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  description: string | null;
  category: AssessmentCategory;
  durationMinutes: number;
  passThreshold: number | null;
  totalPoints: number | null;
  isActive: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  questions?: QuestionDTO[];
}

export interface QuestionDTO {
  id: number;
  templateId: number;
  position: number;
  type: QuestionType;
  prompt: string;
  starterCode: string | null;
  language: string | null;
  testCases: TestCase[] | null;
  choices: Choice[] | null;
  /** Hidden from candidate-facing responses — only included for admin/grading paths. */
  correctChoiceKeys: string[] | null;
  rubric: string | null;
  points: number;
  timeLimitSeconds: number | null;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden?: boolean;
}

export interface Choice {
  key: string;
  label: string;
}

export interface AttemptDTO {
  id: number;
  tenantId: number;
  templateId: number;
  candidateId: number;
  applicationId: number | null;
  invitedById: number;
  inviteToken: string;
  expiresAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  status: AttemptStatus;
  totalScore: number | null;
  passed: boolean | null;
  proctorViolations: ProctorViolation[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProctorViolation {
  type: string;
  at: string;
  detail?: string;
}

export interface AnswerDTO {
  id: number;
  attemptId: number;
  questionId: number;
  answerText: string | null;
  answerCode: string | null;
  selectedChoiceKeys: string[] | null;
  timeSpentSeconds: number | null;
  score: number | null;
  autoGraded: boolean;
  llmFeedback: string | null;
  gradedById: number | null;
  gradedAt: string | null;
}

export interface CodeRunResult {
  id: number;
  answerId: number;
  language: string;
  judge0Token: string | null;
  statusId: number | null;
  statusDescription: string | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  passed: boolean | null;
}

export interface CodeTestSuiteResult {
  cases: Array<{
    index: number;
    input: string;
    expectedOutput: string;
    hidden: boolean;
    actualOutput: string | null;
    passed: boolean;
    runtimeMs: number | null;
    error: string | null;
  }>;
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
}

export interface InterviewTurnDTO {
  id: number;
  sessionId: number;
  turnIndex: number;
  role: InterviewRole;
  content: string;
  tokenCount: number | null;
  createdAt: string;
}

export interface InterviewSessionDTO {
  id: number;
  tenantId: number;
  attemptId: number;
  candidateId: number;
  templateId: number;
  provider: string | null;
  model: string | null;
  systemPrompt: string | null;
  currentTurn: number;
  totalTurns: number;
  status: InterviewSessionStatus;
  summary: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PlagiarismReportDTO {
  id: number;
  attemptId: number;
  answerId: number;
  method: PlagiarismMethod;
  similarityScore: number;
  matchedSource: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================================
// SERVICE INPUT SHAPES
// ============================================================

export interface CreateTemplateInput {
  name: string;
  slug?: string;
  description?: string;
  category: AssessmentCategory;
  durationMinutes?: number;
  passThreshold?: number;
  totalPoints?: number;
  isActive?: boolean;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput> & { id: number };

export interface CreateQuestionInput {
  templateId: number;
  position?: number;
  type: QuestionType;
  prompt: string;
  starterCode?: string;
  language?: string;
  testCases?: TestCase[];
  choices?: Choice[];
  correctChoiceKeys?: string[];
  rubric?: string;
  points?: number;
  timeLimitSeconds?: number;
}

export type UpdateQuestionInput = Partial<Omit<CreateQuestionInput, "templateId">> & { id: number };

export interface InviteCandidateInput {
  templateId: number;
  candidateId: number;
  applicationId?: number;
  expiresAt?: Date;
}

export interface SaveAnswerInput {
  answerText?: string;
  answerCode?: string;
  selectedChoiceKeys?: string[];
  timeSpentSeconds?: number;
  /** When true, kick off a Judge0 code run for coding questions. */
  runCode?: boolean;
}

export interface RequesterContext {
  userId: number;
  role: string;
}

// ============================================================
// ERRORS
// ============================================================

export class TemplateNotFoundError extends Error {
  constructor(idOrSlug: number | string) {
    super(`Assessment template not found: ${idOrSlug}`);
    this.name = "TemplateNotFoundError";
  }
}

export class QuestionNotFoundError extends Error {
  constructor(id: number) {
    super(`Assessment question not found: ${id}`);
    this.name = "QuestionNotFoundError";
  }
}

export class AttemptNotFoundError extends Error {
  constructor(idOrToken: number | string) {
    super(`Assessment attempt not found: ${idOrToken}`);
    this.name = "AttemptNotFoundError";
  }
}

export class AttemptExpiredError extends Error {
  constructor(id: number) {
    super(`Assessment attempt expired: ${id}`);
    this.name = "AttemptExpiredError";
  }
}

export class InvalidInviteTokenError extends Error {
  constructor() {
    super("Invalid or unknown invite token");
    this.name = "InvalidInviteTokenError";
  }
}

export class Judge0Error extends Error {
  constructor(detail: string) {
    super(`Judge0: ${detail}`);
    this.name = "Judge0Error";
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

export class InterviewSessionNotFoundError extends Error {
  constructor(id: number) {
    super(`Interview session not found: ${id}`);
    this.name = "InterviewSessionNotFoundError";
  }
}
