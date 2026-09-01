/**
 * Assessment Attempts Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `assessment_attempts`. Tenant scope and
 * status transition rules live in the service layer.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentAttempts } from "../../../../drizzle/schema";
import type { AttemptStatus, TenantScope } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function scopeFilter(scope: TenantScope) {
  return scope === null
    ? isNull(assessmentAttempts.tenantId)
    : eq(assessmentAttempts.tenantId, scope);
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByToken(token: string) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.inviteToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByCandidate(candidateId: number, scope: TenantScope = null) {
  const d = await db();
  return d
    .select()
    .from(assessmentAttempts)
    .where(and(scopeFilter(scope), eq(assessmentAttempts.candidateId, candidateId)))
    .orderBy(desc(assessmentAttempts.createdAt));
}

export async function listForTemplate(scope: TenantScope, templateId: number) {
  const d = await db();
  return d
    .select()
    .from(assessmentAttempts)
    .where(and(scopeFilter(scope), eq(assessmentAttempts.templateId, templateId)))
    .orderBy(desc(assessmentAttempts.createdAt));
}

export async function insert(values: Record<string, unknown>): Promise<number> {
  const d = await db();
  const result: any = await d.insert(assessmentAttempts).values(values as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(assessmentAttempts).set(values as any).where(eq(assessmentAttempts.id, id));
}

export async function setStatus(
  id: number,
  status: AttemptStatus,
  fields: Record<string, unknown> = {},
): Promise<void> {
  const d = await db();
  await d
    .update(assessmentAttempts)
    .set({ status, ...fields } as any)
    .where(eq(assessmentAttempts.id, id));
}

export async function setScore(id: number, totalScore: number, passed: boolean): Promise<void> {
  const d = await db();
  await d
    .update(assessmentAttempts)
    .set({ totalScore, passed: passed ? 1 : 0 } as any)
    .where(eq(assessmentAttempts.id, id));
}
