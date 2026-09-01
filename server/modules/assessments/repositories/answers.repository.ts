/**
 * Assessment Attempt Answers Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `assessment_attempt_answers`. The
 * (attempt_id, question_id) pair is unique — `upsertAnswer` enforces
 * that at the application layer so the service doesn't have to think
 * about it.
 */

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentAttemptAnswers } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentAttemptAnswers)
    .where(eq(assessmentAttemptAnswers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByAttemptAndQuestion(attemptId: number, questionId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(assessmentAttemptAnswers)
    .where(
      and(
        eq(assessmentAttemptAnswers.attemptId, attemptId),
        eq(assessmentAttemptAnswers.questionId, questionId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listForAttempt(attemptId: number) {
  const d = await db();
  return d
    .select()
    .from(assessmentAttemptAnswers)
    .where(eq(assessmentAttemptAnswers.attemptId, attemptId))
    .orderBy(asc(assessmentAttemptAnswers.id));
}

/**
 * Upserts (attemptId, questionId) → values. Returns the row's id.
 * MySQL has ON DUPLICATE KEY UPDATE for the unique index, but the
 * Drizzle-friendly form for this codebase is read-then-write.
 */
export async function upsertAnswer(
  attemptId: number,
  questionId: number,
  values: Record<string, unknown>,
): Promise<number> {
  const d = await db();
  const existing = await findByAttemptAndQuestion(attemptId, questionId);
  if (existing) {
    if (Object.keys(values).length > 0) {
      await d
        .update(assessmentAttemptAnswers)
        .set(values as any)
        .where(eq(assessmentAttemptAnswers.id, existing.id));
    }
    return existing.id;
  }
  const result: any = await d
    .insert(assessmentAttemptAnswers)
    .values({ attemptId, questionId, ...values } as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function setScore(
  id: number,
  score: number,
  llmFeedback?: string,
  gradedById?: number,
): Promise<void> {
  const d = await db();
  const fields: any = {
    score,
    autoGraded: 1,
    gradedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  if (llmFeedback !== undefined) fields.llmFeedback = llmFeedback;
  if (gradedById !== undefined) fields.gradedById = gradedById;
  await d
    .update(assessmentAttemptAnswers)
    .set(fields)
    .where(eq(assessmentAttemptAnswers.id, id));
}
