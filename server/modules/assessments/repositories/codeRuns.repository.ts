/**
 * Assessment Code Runs Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `assessment_code_runs`. Each row records a
 * single Judge0 submission tied to an answer.
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentCodeRuns } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function insert(values: Record<string, unknown>): Promise<number> {
  const d = await db();
  const result: any = await d.insert(assessmentCodeRuns).values(values as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentCodeRuns)
    .where(eq(assessmentCodeRuns.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByToken(token: string) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentCodeRuns)
    .where(eq(assessmentCodeRuns.judge0Token, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function latestForAnswer(answerId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentCodeRuns)
    .where(eq(assessmentCodeRuns.answerId, answerId))
    .orderBy(desc(assessmentCodeRuns.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listForAnswer(answerId: number) {
  const d = await db();
  return d
    .select()
    .from(assessmentCodeRuns)
    .where(eq(assessmentCodeRuns.answerId, answerId))
    .orderBy(desc(assessmentCodeRuns.id));
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(assessmentCodeRuns).set(values as any).where(eq(assessmentCodeRuns.id, id));
}
