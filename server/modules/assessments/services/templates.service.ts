/**
 * Assessment Templates Service
 * ----------------------------------------------------------------------
 * CRUD on `assessment_templates` and their `assessment_questions`. All
 * methods are tenant-scoped — reads filter by tenantId, writes encode
 * tenantId on the row, and the guard catches accidental cross-tenant
 * access.
 *
 * Role gate mirrors the rest of the talent platform: admin + recruiter
 * may create / edit / delete; everyone else gets a 403.
 */

import * as repo from "../repositories/templates.repository";
import { slugService } from "../../../services/slug.service";
import { assertTenantScope } from "../tenant.guard";
import {
  AssessmentTemplateDTO,
  CreateQuestionInput,
  CreateTemplateInput,
  ForbiddenError,
  QuestionDTO,
  QuestionNotFoundError,
  RequesterContext,
  TemplateNotFoundError,
  TenantScope,
  UpdateQuestionInput,
  UpdateTemplateInput,
} from "../types";

const EDIT_ROLES = new Set(["admin", "recruiter", "senior_editor"]);

function gateEdit(role: string) {
  if (!EDIT_ROLES.has(role)) throw new ForbiddenError("Insufficient permissions");
}

function rowToDto(row: any): AssessmentTemplateDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    durationMinutes: row.durationMinutes,
    passThreshold: row.passThreshold,
    totalPoints: row.totalPoints,
    isActive: !!row.isActive,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    rubric: row.rubric,
    points: row.points,
    timeLimitSeconds: row.timeLimitSeconds,
  };
}

export class TemplatesService {
  async getById(
    scope: TenantScope,
    id: number,
    opts: { includeCorrect?: boolean } = {},
  ): Promise<AssessmentTemplateDTO> {
    const row = await repo.findById(id);
    if (!row) throw new TemplateNotFoundError(id);
    assertTenantScope(row.tenantId, scope, "templates.getById");
    const questions = await repo.listQuestions(id);
    return {
      ...rowToDto(row),
      questions: questions.map((q) => questionRowToDto(q, opts.includeCorrect)),
    };
  }

  async getBySlug(scope: TenantScope, slug: string): Promise<AssessmentTemplateDTO> {
    const row = await repo.findBySlug(scope, slug);
    if (!row) throw new TemplateNotFoundError(slug);
    const questions = await repo.listQuestions(row.id);
    return {
      ...rowToDto(row),
      questions: questions.map((q) => questionRowToDto(q, false)),
    };
  }

  async list(scope: TenantScope, opts: repo.ListTemplatesOpts = {}) {
    const { items, total } = await repo.listForTenant(scope, opts);
    return { items: items.map(rowToDto), total };
  }

  async create(
    scope: TenantScope,
    input: CreateTemplateInput,
    requester: RequesterContext,
  ): Promise<AssessmentTemplateDTO> {
    gateEdit(requester.role);
    const slug = input.slug || slugService.generateSlug(input.name);
    const id = await repo.insertTemplate({
      tenantId: scope,
      name: input.name,
      slug,
      description: input.description ?? null,
      category: input.category,
      durationMinutes: input.durationMinutes ?? 60,
      passThreshold: input.passThreshold ?? null,
      totalPoints: input.totalPoints ?? null,
      isActive: input.isActive === false ? 0 : 1,
      createdById: requester.userId,
    });
    return this.getById(scope, id, { includeCorrect: true });
  }

  async update(
    scope: TenantScope,
    input: UpdateTemplateInput,
    requester: RequesterContext,
  ): Promise<AssessmentTemplateDTO> {
    gateEdit(requester.role);
    const existing = await repo.findById(input.id);
    if (!existing) throw new TemplateNotFoundError(input.id);
    assertTenantScope(existing.tenantId, scope, "templates.update");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.description !== undefined) patch.description = input.description;
    if (input.category !== undefined) patch.category = input.category;
    if (input.durationMinutes !== undefined) patch.durationMinutes = input.durationMinutes;
    if (input.passThreshold !== undefined) patch.passThreshold = input.passThreshold;
    if (input.totalPoints !== undefined) patch.totalPoints = input.totalPoints;
    if (input.isActive !== undefined) patch.isActive = input.isActive ? 1 : 0;

    await repo.updateTemplate(input.id, patch);
    return this.getById(scope, input.id, { includeCorrect: true });
  }

  async delete(scope: TenantScope, id: number, requester: RequesterContext): Promise<void> {
    gateEdit(requester.role);
    const existing = await repo.findById(id);
    if (!existing) throw new TemplateNotFoundError(id);
    assertTenantScope(existing.tenantId, scope, "templates.delete");
    await repo.deleteTemplate(id);
  }

  // ------------------------------------------------------------
  // Questions
  // ------------------------------------------------------------

  async listQuestions(
    scope: TenantScope,
    templateId: number,
    opts: { includeCorrect?: boolean } = {},
  ): Promise<QuestionDTO[]> {
    const template = await repo.findById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);
    assertTenantScope(template.tenantId, scope, "templates.listQuestions");
    const rows = await repo.listQuestions(templateId);
    return rows.map((r) => questionRowToDto(r, opts.includeCorrect));
  }

  async addQuestion(
    scope: TenantScope,
    input: CreateQuestionInput,
    requester: RequesterContext,
  ): Promise<QuestionDTO> {
    gateEdit(requester.role);
    const template = await repo.findById(input.templateId);
    if (!template) throw new TemplateNotFoundError(input.templateId);
    assertTenantScope(template.tenantId, scope, "templates.addQuestion");

    const existing = await repo.listQuestions(input.templateId);
    const position = input.position ?? existing.length;

    const id = await repo.addQuestion(input.templateId, {
      position,
      type: input.type,
      prompt: input.prompt,
      starterCode: input.starterCode ?? null,
      language: input.language ?? null,
      testCases: input.testCases ?? null,
      choices: input.choices ?? null,
      correctChoiceKeys: input.correctChoiceKeys ?? null,
      rubric: input.rubric ?? null,
      points: input.points ?? 10,
      timeLimitSeconds: input.timeLimitSeconds ?? null,
    });
    const row = await repo.findQuestionById(id);
    if (!row) throw new QuestionNotFoundError(id);
    return questionRowToDto(row, true);
  }

  async updateQuestion(
    scope: TenantScope,
    input: UpdateQuestionInput,
    requester: RequesterContext,
  ): Promise<QuestionDTO> {
    gateEdit(requester.role);
    const existing = await repo.findQuestionById(input.id);
    if (!existing) throw new QuestionNotFoundError(input.id);
    const template = await repo.findById(existing.templateId);
    if (!template) throw new TemplateNotFoundError(existing.templateId);
    assertTenantScope(template.tenantId, scope, "templates.updateQuestion");

    const patch: Record<string, unknown> = {};
    if (input.position !== undefined) patch.position = input.position;
    if (input.type !== undefined) patch.type = input.type;
    if (input.prompt !== undefined) patch.prompt = input.prompt;
    if (input.starterCode !== undefined) patch.starterCode = input.starterCode;
    if (input.language !== undefined) patch.language = input.language;
    if (input.testCases !== undefined) patch.testCases = input.testCases;
    if (input.choices !== undefined) patch.choices = input.choices;
    if (input.correctChoiceKeys !== undefined) patch.correctChoiceKeys = input.correctChoiceKeys;
    if (input.rubric !== undefined) patch.rubric = input.rubric;
    if (input.points !== undefined) patch.points = input.points;
    if (input.timeLimitSeconds !== undefined) patch.timeLimitSeconds = input.timeLimitSeconds;

    await repo.updateQuestion(input.id, patch);
    const row = await repo.findQuestionById(input.id);
    return questionRowToDto(row, true);
  }

  async deleteQuestion(
    scope: TenantScope,
    id: number,
    requester: RequesterContext,
  ): Promise<void> {
    gateEdit(requester.role);
    const existing = await repo.findQuestionById(id);
    if (!existing) throw new QuestionNotFoundError(id);
    const template = await repo.findById(existing.templateId);
    if (!template) throw new TemplateNotFoundError(existing.templateId);
    assertTenantScope(template.tenantId, scope, "templates.deleteQuestion");
    await repo.deleteQuestion(id);
  }

  async reorderQuestions(
    scope: TenantScope,
    templateId: number,
    idToPos: Record<number, number>,
    requester: RequesterContext,
  ): Promise<void> {
    gateEdit(requester.role);
    const template = await repo.findById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);
    assertTenantScope(template.tenantId, scope, "templates.reorderQuestions");
    await repo.reorderQuestions(templateId, idToPos);
  }

  /**
   * Seed defaults helper — creates a basic coding screen template when
   * a tenant onboards. Idempotent: skips when a template with the
   * canonical slug already exists.
   */
  async seedDefaults(scope: TenantScope, requester: RequesterContext): Promise<void> {
    gateEdit(requester.role);
    const existing = await repo.findBySlug(scope, "default-coding-screen");
    if (existing) return;
    const template = await this.create(
      scope,
      {
        name: "Default Coding Screen",
        slug: "default-coding-screen",
        description: "Two-question coding screen with fizzbuzz + reverse-string warmups.",
        category: "coding",
        durationMinutes: 45,
        passThreshold: 60,
        totalPoints: 20,
      },
      requester,
    );
    await this.addQuestion(
      scope,
      {
        templateId: template.id,
        type: "coding",
        prompt: "Write a program that prints the numbers 1..15. Replace multiples of 3 with 'Fizz', 5 with 'Buzz', both with 'FizzBuzz'.",
        language: "python",
        starterCode: "# your code here\n",
        testCases: [
          {
            input: "",
            expectedOutput:
              "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
          },
        ],
        points: 10,
      },
      requester,
    );
    await this.addQuestion(
      scope,
      {
        templateId: template.id,
        type: "coding",
        prompt: "Read a line from stdin and print it reversed.",
        language: "python",
        starterCode: "import sys\n",
        testCases: [{ input: "hello", expectedOutput: "olleh" }],
        points: 10,
      },
      requester,
    );
  }
}

export const templatesService = new TemplatesService();
