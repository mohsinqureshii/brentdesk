/**
 * Assessment Templates Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `assessment_templates` and `assessment_questions`.
 * No business logic, no slug generation, no tenant guards — those live
 * in the service layer.
 *
 * The repository groups questions onto a template via `findByIdWithQuestions`.
 * Other reads return raw rows and let the caller decide whether to fetch
 * questions.
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentTemplates, assessmentQuestions } from "../../../../drizzle/schema";
import type { TenantScope } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function scopeFilter(scope: TenantScope) {
  return scope === null
    ? isNull(assessmentTemplates.tenantId)
    : eq(assessmentTemplates.tenantId, scope);
}

// ------------------------------------------------------------
// Templates
// ------------------------------------------------------------

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentTemplates)
    .where(eq(assessmentTemplates.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findBySlug(scope: TenantScope, slug: string) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentTemplates)
    .where(and(scopeFilter(scope), eq(assessmentTemplates.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export interface ListTemplatesOpts {
  isActive?: boolean;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listForTenant(scope: TenantScope, opts: ListTemplatesOpts = {}) {
  const d = await db();
  const conds: any[] = [scopeFilter(scope)];
  if (opts.isActive !== undefined) {
    conds.push(eq(assessmentTemplates.isActive, opts.isActive ? 1 : 0));
  }
  if (opts.category) {
    conds.push(eq(assessmentTemplates.category, opts.category as any));
  }
  if (opts.search) {
    conds.push(sql`LOWER(${assessmentTemplates.name}) LIKE LOWER(${`%${opts.search}%`})`);
  }
  const where = and(...conds);
  const [items, [countRow]] = await Promise.all([
    d
      .select()
      .from(assessmentTemplates)
      .where(where)
      .orderBy(asc(assessmentTemplates.name))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    d
      .select({ count: sql<number>`COUNT(*)` })
      .from(assessmentTemplates)
      .where(where),
  ]);
  return { items, total: Number(countRow?.count || 0) };
}

export async function insertTemplate(values: Record<string, unknown>): Promise<number> {
  const d = await db();
  const result: any = await d.insert(assessmentTemplates).values(values as any);
  // mysql2 returns { insertId } on the first element
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function updateTemplate(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(assessmentTemplates).set(values as any).where(eq(assessmentTemplates.id, id));
}

export async function deleteTemplate(id: number): Promise<void> {
  const d = await db();
  await d.delete(assessmentQuestions).where(eq(assessmentQuestions.templateId, id));
  await d.delete(assessmentTemplates).where(eq(assessmentTemplates.id, id));
}

// ------------------------------------------------------------
// Questions
// ------------------------------------------------------------

export async function listQuestions(templateId: number) {
  const d = await db();
  return d
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.templateId, templateId))
    .orderBy(asc(assessmentQuestions.position));
}

export async function findQuestionById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addQuestion(
  templateId: number,
  values: Record<string, unknown>,
): Promise<number> {
  const d = await db();
  const result: any = await d
    .insert(assessmentQuestions)
    .values({ ...values, templateId } as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function updateQuestion(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(assessmentQuestions).set(values as any).where(eq(assessmentQuestions.id, id));
}

export async function deleteQuestion(id: number): Promise<void> {
  const d = await db();
  await d.delete(assessmentQuestions).where(eq(assessmentQuestions.id, id));
}

/**
 * Reorder a template's questions. Pass `{ [questionId]: newPosition }`.
 * Runs sequential updates because MySQL doesn't have a clean batch path
 * for this and the question count per template is tiny in practice.
 */
export async function reorderQuestions(
  templateId: number,
  idToPos: Record<number, number>,
): Promise<void> {
  const d = await db();
  for (const [id, position] of Object.entries(idToPos)) {
    await d
      .update(assessmentQuestions)
      .set({ position } as any)
      .where(
        and(
          eq(assessmentQuestions.id, Number(id)),
          eq(assessmentQuestions.templateId, templateId),
        ),
      );
  }
}
