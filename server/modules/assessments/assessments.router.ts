/**
 * Assessments Router
 * ----------------------------------------------------------------------
 * tRPC surface for the Phase 5 assessment engine. Sub-namespaces:
 *   - template.*    — recruiter CRUD on templates + questions
 *   - attempt.*     — invite, candidate-take, submit, grade, list
 *   - answer.*      — per-question read + on-demand code runs
 *   - interview.*   — AI interview turns + summary
 *   - plagiarism.*  — read access to similarity reports
 *
 * Validation is the only thing this layer does; everything else
 * delegates to the service layer.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { templatesService } from "./services/templates.service";
import { attemptsService } from "./services/attempts.service";
import { codeRunsService } from "./services/codeRuns.service";
import { aiInterviewService } from "./services/aiInterview.service";
import { plagiarismService } from "./services/plagiarism.service";

// ------------------------------------------------------------
// Scope helper — same shape as other modules.
// ------------------------------------------------------------
function scope(ctx: { tenantId?: number | null }): number | null {
  return ctx.tenantId ?? null;
}

// ------------------------------------------------------------
// Zod schemas
// ------------------------------------------------------------

const categoryEnum = z.enum([
  "coding",
  "system_design",
  "technical_screen",
  "behavioral",
  "ai_interview",
  "custom",
]);

const questionTypeEnum = z.enum([
  "coding",
  "multiple_choice",
  "short_answer",
  "long_answer",
  "system_design",
  "file_upload",
]);

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  hidden: z.boolean().optional(),
});

const choiceSchema = z.object({ key: z.string(), label: z.string() });

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: categoryEnum,
  durationMinutes: z.number().int().positive().optional(),
  passThreshold: z.number().int().min(0).max(100).optional(),
  totalPoints: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({ id: z.number() });

const createQuestionSchema = z.object({
  templateId: z.number(),
  position: z.number().int().min(0).optional(),
  type: questionTypeEnum,
  prompt: z.string().min(1),
  starterCode: z.string().optional(),
  language: z.string().optional(),
  testCases: z.array(testCaseSchema).optional(),
  choices: z.array(choiceSchema).optional(),
  correctChoiceKeys: z.array(z.string()).optional(),
  rubric: z.string().optional(),
  points: z.number().int().min(0).optional(),
  timeLimitSeconds: z.number().int().min(0).optional(),
});

const updateQuestionSchema = createQuestionSchema
  .omit({ templateId: true })
  .partial()
  .extend({ id: z.number() });

const inviteSchema = z.object({
  templateId: z.number(),
  candidateId: z.number(),
  applicationId: z.number().optional(),
  expiresAt: z.date().optional(),
});

const saveAnswerSchema = z.object({
  attemptId: z.number(),
  questionId: z.number(),
  answerText: z.string().optional(),
  answerCode: z.string().optional(),
  selectedChoiceKeys: z.array(z.string()).optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  runCode: z.boolean().optional(),
});

// ============================================================
// SUB-ROUTERS
// ============================================================

const templateRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          category: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
        .optional(),
    )
    .query(({ input, ctx }) => templatesService.list(scope(ctx), input ?? {})),

  get: protectedProcedure
    .input(z.object({ id: z.number(), includeCorrect: z.boolean().optional() }))
    .query(({ input, ctx }) =>
      templatesService.getById(scope(ctx), input.id, {
        includeCorrect: input.includeCorrect ?? true,
      }),
    ),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input, ctx }) => templatesService.getBySlug(scope(ctx), input.slug)),

  create: protectedProcedure
    .input(createTemplateSchema)
    .mutation(({ input, ctx }) =>
      templatesService.create(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  update: protectedProcedure
    .input(updateTemplateSchema)
    .mutation(({ input, ctx }) =>
      templatesService.update(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      templatesService.delete(scope(ctx), input.id, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  addQuestion: protectedProcedure
    .input(createQuestionSchema)
    .mutation(({ input, ctx }) =>
      templatesService.addQuestion(scope(ctx), input, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  updateQuestion: protectedProcedure
    .input(updateQuestionSchema)
    .mutation(({ input, ctx }) =>
      templatesService.updateQuestion(scope(ctx), input, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      templatesService.deleteQuestion(scope(ctx), input.id, {
        userId: ctx.user.id,
        role: ctx.user.role,
      }),
    ),

  reorderQuestions: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        idToPos: z.record(z.string(), z.number()),
      }),
    )
    .mutation(({ input, ctx }) => {
      const idToPos: Record<number, number> = {};
      for (const [k, v] of Object.entries(input.idToPos)) idToPos[Number(k)] = v;
      return templatesService.reorderQuestions(scope(ctx), input.templateId, idToPos, {
        userId: ctx.user.id,
        role: ctx.user.role,
      });
    }),

  seedDefaults: protectedProcedure.mutation(({ ctx }) =>
    templatesService.seedDefaults(scope(ctx), { userId: ctx.user.id, role: ctx.user.role }),
  ),
});

const attemptRouter = router({
  invite: protectedProcedure
    .input(inviteSchema)
    .mutation(({ input, ctx }) =>
      attemptsService.invite(scope(ctx), input, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  /**
   * Candidate-facing entry point. Uses the invite token, not a session
   * — that's why it's `publicProcedure`. The token itself is the
   * 24-byte random identifier; without it nothing on the attempt is
   * reachable.
   */
  startByToken: publicProcedure
    .input(z.object({ token: z.string().min(20) }))
    .mutation(({ input }) => attemptsService.startByToken(input.token)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      attemptsService.getById(scope(ctx), input.id, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  listForTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(({ input, ctx }) => attemptsService.listForTemplate(scope(ctx), input.templateId)),

  listForCandidate: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(({ input, ctx }) => attemptsService.listForCandidate(scope(ctx), input.candidateId)),

  saveAnswer: publicProcedure
    .input(saveAnswerSchema)
    .mutation(({ input }) =>
      attemptsService.saveAnswer(input.attemptId, input.questionId, {
        answerText: input.answerText,
        answerCode: input.answerCode,
        selectedChoiceKeys: input.selectedChoiceKeys,
        timeSpentSeconds: input.timeSpentSeconds,
        runCode: input.runCode,
      }),
    ),

  submit: publicProcedure
    .input(z.object({ attemptId: z.number() }))
    .mutation(({ input }) => attemptsService.submit(input.attemptId)),

  grade: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .mutation(({ input }) => attemptsService.grade(input.attemptId)),
});

const answerRouter = router({
  listForAttempt: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(({ input, ctx }) =>
      attemptsService.listAnswers(scope(ctx), input.attemptId, { userId: ctx.user.id, role: ctx.user.role }),
    ),

  runCode: publicProcedure
    .input(
      z.object({
        answerId: z.number(),
        language: z.string(),
        sourceCode: z.string(),
        stdin: z.string().optional(),
        expectedStdout: z.string().optional(),
      }),
    )
    .mutation(({ input }) =>
      codeRunsService.runOnce(
        input.answerId,
        input.language,
        input.sourceCode,
        input.stdin,
        input.expectedStdout,
      ),
    ),

  latestRun: publicProcedure
    .input(z.object({ answerId: z.number() }))
    .query(({ input }) => codeRunsService.latestForAnswer(input.answerId)),
});

const interviewRouter = router({
  start: publicProcedure
    .input(z.object({ attemptId: z.number() }))
    .mutation(({ input }) => aiInterviewService.start(input.attemptId)),

  getByAttempt: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(({ input }) => aiInterviewService.getByAttempt(input.attemptId)),

  nextTurn: publicProcedure
    .input(z.object({ sessionId: z.number(), candidateMessage: z.string().min(1) }))
    .mutation(({ input }) =>
      aiInterviewService.nextTurn(input.sessionId, input.candidateMessage),
    ),

  finish: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => aiInterviewService.finish(input.sessionId)),

  listTurns: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => aiInterviewService.listTurns(input.sessionId)),
});

const plagiarismRouter = router({
  checkAnswer: protectedProcedure
    .input(z.object({ answerId: z.number() }))
    .mutation(({ input }) => plagiarismService.checkAnswer(input.answerId)),

  listForAttempt: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(({ input }) => plagiarismService.listForAttempt(input.attemptId)),
});

export const assessmentsRouter = router({
  template: templateRouter,
  attempt: attemptRouter,
  answer: answerRouter,
  interview: interviewRouter,
  plagiarism: plagiarismRouter,
});
