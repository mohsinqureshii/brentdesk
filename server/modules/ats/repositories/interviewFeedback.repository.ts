/**
 * Interview Feedback Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `interview_feedback`. The (interviewId,
 * interviewerId) pair is unique in the schema — services treat that
 * as the upsert key.
 */

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { interviewFeedback } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findByInterviewer(interviewId: number, interviewerId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(interviewFeedback)
    .where(
      and(
        eq(interviewFeedback.interviewId, interviewId),
        eq(interviewFeedback.interviewerId, interviewerId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listForInterview(interviewId: number) {
  const d = await db();
  return d
    .select()
    .from(interviewFeedback)
    .where(eq(interviewFeedback.interviewId, interviewId))
    .orderBy(asc(interviewFeedback.createdAt));
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(interviewFeedback).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(interviewFeedback).set(values as any).where(eq(interviewFeedback.id, id));
}
