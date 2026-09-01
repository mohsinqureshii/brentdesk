/**
 * Assessment Attempts Service
 * ----------------------------------------------------------------------
 * Drives the attempt lifecycle:
 *
 *   invited → in_progress → submitted → graded
 *                                   ↘ expired / disqualified
 *
 * Public API:
 *   invite()      — recruiter creates an invite + emails the candidate.
 *   startByToken()— candidate clicks the link; flips status, returns
 *                   the template + question set (correct answers
 *                   stripped). Bootstraps an AI interview when the
 *                   template category is `ai_interview`.
 *   saveAnswer()  — candidate-facing upsert per question; can fire a
 *                   Judge0 code run when the candidate hits "Run".
 *   submit()      — finalises and runs auto-grading.
 *   grade()       — public so recruiters can re-grade after manual
 *                   intervention on system-design questions.
 */

import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import * as attemptsRepo from "../repositories/attempts.repository";
import * as templatesRepo from "../repositories/templates.repository";
import * as answersRepo from "../repositories/answers.repository";
import * as codeRunsRepo from "../repositories/codeRuns.repository";
import { codeRunsService } from "./codeRuns.service";
import { aiInterviewService } from "./aiInterview.service";
import { plagiarismService } from "./plagiarism.service";
import { invokeLLMProvider } from "../../../services/ai/llmProvider.service";
import { sendEmail } from "../../../services/email.service";
import * as assessmentInviteTemplate from "../../../services/emailTemplates/assessmentInvite";
import { DEFAULT_TENANT_NAME } from "../../../services/emailTemplates/_layout";
import { tenantsService } from "../../tenants";
import { getDb } from "../../../db";
import { candidates, users } from "../../../../drizzle/schema";
import { assertTenantScope } from "../tenant.guard";
import { logPii } from "../../compliance";
import {
  AnswerDTO,
  AttemptDTO,
  AttemptExpiredError,
  AttemptNotFoundError,
  AttemptStatus,
  ForbiddenError,
  InvalidInviteTokenError,
  InviteCandidateInput,
  QuestionDTO,
  RequesterContext,
  SaveAnswerInput,
  TemplateNotFoundError,
  TenantScope,
} from "../types";

const INVITE_ROLES = new Set(["admin", "recruiter", "senior_editor"]);

function gateInvite(role: string) {
  if (!INVITE_ROLES.has(role)) throw new ForbiddenError("Insufficient permissions");
}

function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function attemptRowToDto(row: any): AttemptDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    templateId: row.templateId,
    candidateId: row.candidateId,
    applicationId: row.applicationId,
    invitedById: row.invitedById,
    inviteToken: row.inviteToken,
    expiresAt: row.expiresAt,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    status: row.status,
    totalScore: row.totalScore,
    passed: row.passed === null ? null : !!row.passed,
    proctorViolations: (row.proctorViolations as any) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function answerRowToDto(row: any): AnswerDTO {
  return {
    id: row.id,
    attemptId: row.attemptId,
    questionId: row.questionId,
    answerText: row.answerText,
    answerCode: row.answerCode,
    selectedChoiceKeys: (row.selectedChoiceKeys as any) ?? null,
    timeSpentSeconds: row.timeSpentSeconds,
    score: row.score,
    autoGraded: !!row.autoGraded,
    llmFeedback: row.llmFeedback,
    gradedById: row.gradedById,
    gradedAt: row.gradedAt,
  };
}

function questionRowToDto(row: any, includeCorrect = false): QuestionDTO {
  return {
    id: row.id,
    templateId: row.templateId,
    position: row.position,
    type: row.type,
    prompt: row.prompt,
    starterCode: row.starterCode,
    language: row.language,
    testCases: (row.testCases as any) ?? null,
    choices: (row.choices as any) ?? null,
    correctChoiceKeys: includeCorrect ? ((row.correctChoiceKeys as any) ?? null) : null,
    rubric: includeCorrect ? row.rubric : null,
    points: row.points,
    timeLimitSeconds: row.timeLimitSeconds,
  };
}

function nowMysql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

async function candidateEmail(candidateId: number): Promise<{ email: string | null; name: string | null }> {
  const db = await getDb();
  if (!db) return { email: null, name: null };
  const rows = await db
    .select({ email: users.email, name: users.name })
    .from(candidates)
    .innerJoin(users, eq(candidates.userId, users.id))
    .where(eq(candidates.id, candidateId))
    .limit(1);
  return rows[0] ?? { email: null, name: null };
}

export class AttemptsService {
  /**
   * Recruiter creates an invite. Generates a unique token, persists an
   * attempt with status='invited', and sends the candidate an email
   * with the take-the-assessment URL.
   */
  async invite(
    scope: TenantScope,
    input: InviteCandidateInput,
    requester: RequesterContext,
  ): Promise<AttemptDTO> {
    gateInvite(requester.role);
    const template = await templatesRepo.findById(input.templateId);
    if (!template) throw new TemplateNotFoundError(input.templateId);
    assertTenantScope(template.tenantId, scope, "attempts.invite");

    const inviteToken = generateInviteToken();
    const expiresAt = input.expiresAt
      ? input.expiresAt.toISOString().slice(0, 19).replace("T", " ")
      : null;

    const id = await attemptsRepo.insert({
      tenantId: scope,
      templateId: input.templateId,
      candidateId: input.candidateId,
      applicationId: input.applicationId ?? null,
      invitedById: requester.userId,
      inviteToken,
      expiresAt,
      status: "invited",
    });

    // Best-effort email; failures don't roll back the invite — the
    // recruiter can resend manually via the UI.
    const { email, name } = await candidateEmail(input.candidateId);
    if (email) {
      const inviteUrl = `${process.env.APP_BASE_URL || "https://techscoop.io"}/assessments/take/${inviteToken}`;
      const tenant = scope !== null ? await tenantsService.getById(scope) : null;
      const tenantName = tenant?.name || DEFAULT_TENANT_NAME;
      const { subject, html, text } = assessmentInviteTemplate.build({
        tenantName,
        candidateName: name || "there",
        templateName: template.name,
        durationMinutes: template.durationMinutes,
        expiresAt: input.expiresAt ?? null,
        inviteUrl,
      });
      await sendEmail({
        to: email,
        subject,
        html,
        text,
        entityType: "assessment_attempt",
        entityId: id,
        type: "assessment_invite",
      }).catch((err) => {
        console.error("[Assessments] invite email failed:", err);
      });
    }

    const row = await attemptsRepo.findById(id);
    return attemptRowToDto(row);
  }

  /**
   * Candidate-facing entry point. Flips status to 'in_progress' on
   * first call (idempotent on subsequent calls during the session).
   * Strips `correctChoiceKeys` from the returned questions.
   */
  async startByToken(token: string): Promise<{
    attempt: AttemptDTO;
    template: { id: number; name: string; category: string; durationMinutes: number };
    questions: QuestionDTO[];
    interviewSessionId: number | null;
  }> {
    const attempt = await attemptsRepo.findByToken(token);
    if (!attempt) throw new InvalidInviteTokenError();
    if (attempt.status === "expired" || isExpired(attempt.expiresAt)) {
      if (attempt.status !== "expired") {
        await attemptsRepo.setStatus(attempt.id, "expired", { expiredAt: nowMysql() });
      }
      throw new AttemptExpiredError(attempt.id);
    }

    const template = await templatesRepo.findById(attempt.templateId);
    if (!template) throw new TemplateNotFoundError(attempt.templateId);

    if (attempt.status === "invited") {
      await attemptsRepo.setStatus(attempt.id, "in_progress", { startedAt: nowMysql() });
    }

    const questions = await templatesRepo.listQuestions(template.id);

    let interviewSessionId: number | null = null;
    if (template.category === "ai_interview") {
      const session = await aiInterviewService.start(attempt.id);
      interviewSessionId = session.id;
    }

    const refreshed = await attemptsRepo.findById(attempt.id);
    return {
      attempt: attemptRowToDto(refreshed),
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        durationMinutes: template.durationMinutes,
      },
      questions: questions.map((q) => questionRowToDto(q, false)),
      interviewSessionId,
    };
  }

  async getById(
    scope: TenantScope,
    id: number,
    requester?: RequesterContext,
  ): Promise<AttemptDTO> {
    const row = await attemptsRepo.findById(id);
    if (!row) throw new AttemptNotFoundError(id);
    assertTenantScope(row.tenantId, scope, "attempts.getById");
    if (requester) {
      await logPii({
        tenantId: scope,
        actorUserId: requester.userId,
        actorRole: requester.role,
        subjectType: "assessment_attempt",
        subjectId: id,
        action: "read",
        ipAddress: undefined,
      });
    }
    return attemptRowToDto(row);
  }

  async listForTemplate(scope: TenantScope, templateId: number): Promise<AttemptDTO[]> {
    const template = await templatesRepo.findById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);
    assertTenantScope(template.tenantId, scope, "attempts.listForTemplate");
    const rows = await attemptsRepo.listForTemplate(scope, templateId);
    return rows.map(attemptRowToDto);
  }

  async listForCandidate(scope: TenantScope, candidateId: number): Promise<AttemptDTO[]> {
    const rows = await attemptsRepo.findByCandidate(candidateId, scope);
    return rows.map(attemptRowToDto);
  }

  async listAnswers(
    scope: TenantScope,
    attemptId: number,
    requester?: RequesterContext,
  ): Promise<AnswerDTO[]> {
    const attempt = await attemptsRepo.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(attemptId);
    assertTenantScope(attempt.tenantId, scope, "attempts.listAnswers");
    const rows = await answersRepo.listForAttempt(attemptId);
    if (requester) {
      await logPii({
        tenantId: scope,
        actorUserId: requester.userId,
        actorRole: requester.role,
        subjectType: "assessment_attempt",
        subjectId: attemptId,
        action: "read",
        ipAddress: undefined,
      });
    }
    return rows.map(answerRowToDto);
  }

  /**
   * Upserts an answer for the given (attempt, question) pair. When
   * `input.runCode` is true and the question is a coding type, fires a
   * Judge0 run against the question's first test case.
   */
  async saveAnswer(
    attemptId: number,
    questionId: number,
    input: SaveAnswerInput,
  ): Promise<{ answer: AnswerDTO; codeRunQueued: boolean }> {
    const attempt = await attemptsRepo.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(attemptId);
    if (attempt.status === "expired" || isExpired(attempt.expiresAt)) {
      throw new AttemptExpiredError(attempt.id);
    }
    if (attempt.status !== "in_progress" && attempt.status !== "invited") {
      throw new ForbiddenError(`Cannot save answer on attempt with status=${attempt.status}`);
    }

    const question = await templatesRepo.findQuestionById(questionId);
    if (!question || question.templateId !== attempt.templateId) {
      throw new ForbiddenError("Question does not belong to the attempt's template");
    }

    const patch: Record<string, unknown> = {};
    if (input.answerText !== undefined) patch.answerText = input.answerText;
    if (input.answerCode !== undefined) patch.answerCode = input.answerCode;
    if (input.selectedChoiceKeys !== undefined) patch.selectedChoiceKeys = input.selectedChoiceKeys;
    if (input.timeSpentSeconds !== undefined) patch.timeSpentSeconds = input.timeSpentSeconds;

    const answerId = await answersRepo.upsertAnswer(attemptId, questionId, patch);

    let codeRunQueued = false;
    if (input.runCode && question.type === "coding" && input.answerCode) {
      const language = question.language || "python";
      const testCases = (question.testCases as any[]) || [];
      const first = testCases[0];
      try {
        await codeRunsService.runOnce(
          answerId,
          language,
          input.answerCode,
          first?.input,
          first?.expectedOutput,
        );
        codeRunQueued = true;
      } catch (err) {
        console.error("[Assessments] runCode failed:", err);
      }
    }

    const row = await answersRepo.findByAttemptAndQuestion(attemptId, questionId);
    return { answer: answerRowToDto(row), codeRunQueued };
  }

  /**
   * Candidate submits. Flips status to 'submitted', then runs
   * auto-grading. Grading is invoked inline so the candidate's UI can
   * show the score immediately; for heavier templates we'd queue this.
   */
  async submit(attemptId: number): Promise<AttemptDTO> {
    const attempt = await attemptsRepo.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(attemptId);
    if (attempt.status === "submitted" || attempt.status === "graded") {
      return attemptRowToDto(attempt);
    }
    await attemptsRepo.setStatus(attemptId, "submitted", { submittedAt: nowMysql() });
    await this.grade(attemptId);
    const updated = await attemptsRepo.findById(attemptId);
    return attemptRowToDto(updated);
  }

  /**
   * Auto-grading pipeline. Per question type:
   *   - coding: run the full test suite, score = (passed / total) * points
   *   - multiple_choice: exact set match → full points, else 0
   *   - short_answer / long_answer: LLM-graded against the rubric
   *   - system_design: deferred — left autoGraded=0 for manual review
   *   - file_upload: left for manual review
   *
   * Composite totalScore = sum(answer.score) / sum(question.points) * 100.
   */
  async grade(attemptId: number): Promise<AttemptDTO> {
    const attempt = await attemptsRepo.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(attemptId);
    const template = await templatesRepo.findById(attempt.templateId);
    if (!template) throw new TemplateNotFoundError(attempt.templateId);
    const questions = await templatesRepo.listQuestions(template.id);
    const answers = await answersRepo.listForAttempt(attemptId);
    const byQuestion = new Map<number, any>(answers.map((a: any) => [a.questionId, a]));

    let earned = 0;
    let possible = 0;

    for (const q of questions) {
      possible += q.points;
      const a = byQuestion.get(q.id);
      if (!a) continue;

      switch (q.type) {
        case "coding": {
          const language = q.language || "python";
          const cases = ((q.testCases as any[]) || []) as Array<{
            input: string;
            expectedOutput: string;
            hidden?: boolean;
          }>;
          if (!a.answerCode || cases.length === 0) {
            await answersRepo.setScore(a.id, 0);
            break;
          }
          let result;
          try {
            result = await codeRunsService.runTestSuite(a.id, language, a.answerCode, cases);
          } catch (err) {
            console.error("[Assessments] grade coding failed:", err);
            await answersRepo.setScore(a.id, 0, "Code execution failed");
            break;
          }
          const score = Math.round((result.passedCount / result.totalCount) * q.points);
          await answersRepo.setScore(
            a.id,
            score,
            `${result.passedCount}/${result.totalCount} test cases passed`,
          );
          earned += score;
          break;
        }

        case "multiple_choice": {
          const expected = new Set<string>(((q.correctChoiceKeys as any[]) || []) as string[]);
          const got = new Set<string>(((a.selectedChoiceKeys as any[]) || []) as string[]);
          const isMatch =
            expected.size === got.size && Array.from(expected).every((k) => got.has(k));
          const score = isMatch ? q.points : 0;
          await answersRepo.setScore(a.id, score);
          earned += score;
          break;
        }

        case "short_answer":
        case "long_answer": {
          if (!a.answerText) {
            await answersRepo.setScore(a.id, 0);
            break;
          }
          const rubric = q.rubric || "Evaluate clarity, correctness, and depth.";
          try {
            const resp = await invokeLLMProvider({
              operation: "assessment_grade_text",
              temperature: 0.2,
              messages: [
                {
                  role: "system",
                  content:
                    "You grade short-answer interview responses. Output JSON only: {\"score\": <int 0..points>, \"feedback\": \"...\"}",
                },
                {
                  role: "user",
                  content: `Question: ${q.prompt}\n\nRubric: ${rubric}\n\nMax points: ${q.points}\n\nCandidate response:\n${a.answerText}`,
                },
              ],
            });
            const cleaned = resp.content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            let score = 0;
            let feedback = "";
            try {
              const parsed = JSON.parse(cleaned);
              score = Math.max(0, Math.min(q.points, Math.round(parsed.score ?? 0)));
              feedback = String(parsed.feedback ?? "");
            } catch {
              score = 0;
              feedback = "Auto-grader could not parse response; manual review required.";
            }
            await answersRepo.setScore(a.id, score, feedback);
            earned += score;
          } catch (err) {
            console.error("[Assessments] grade text failed:", err);
            await answersRepo.setScore(a.id, 0, "LLM grader unavailable");
          }
          break;
        }

        case "system_design":
        case "file_upload":
        default: {
          // DEFERRED: system-design auto-grading isn't part of Phase 5.
          // Leave autoGraded=0 so the recruiter UI surfaces these for
          // manual review. Don't count them toward `possible` for the
          // composite score either, otherwise candidates can't pass.
          possible -= q.points;
          break;
        }
      }
    }

    const totalScore = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    const passed = template.passThreshold !== null ? totalScore >= template.passThreshold : false;
    await attemptsRepo.setScore(attemptId, totalScore, passed);
    await attemptsRepo.setStatus(attemptId, "graded", {});

    // Best-effort plagiarism sweep — runs after grading so it doesn't
    // block scoring. Each text/code answer is checked against peers.
    for (const a of answers) {
      plagiarismService.checkAnswer(a.id).catch((err) => {
        console.error("[Assessments] plagiarism check failed:", err);
      });
    }

    const updated = await attemptsRepo.findById(attemptId);
    return attemptRowToDto(updated);
  }
}

export const attemptsService = new AttemptsService();
