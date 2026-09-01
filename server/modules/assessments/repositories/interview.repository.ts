/**
 * AI Interview Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `ai_interview_sessions` and
 * `ai_interview_turns`. One session per attempt (enforced via unique
 * index `ais_attempt_unique` on the table).
 */

import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { aiInterviewSessions, aiInterviewTurns } from "../../../../drizzle/schema";
import type { InterviewRole } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ------------------------------------------------------------
// Sessions
// ------------------------------------------------------------

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(aiInterviewSessions)
    .where(eq(aiInterviewSessions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByAttemptId(attemptId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(aiInterviewSessions)
    .where(eq(aiInterviewSessions.attemptId, attemptId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertSession(values: Record<string, unknown>): Promise<number> {
  const d = await db();
  const result: any = await d.insert(aiInterviewSessions).values(values as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function updateSession(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(aiInterviewSessions).set(values as any).where(eq(aiInterviewSessions.id, id));
}

// ------------------------------------------------------------
// Turns
// ------------------------------------------------------------

export async function appendTurn(
  sessionId: number,
  role: InterviewRole,
  content: string,
  tokenCount?: number,
): Promise<number> {
  const d = await db();
  const existing = await d
    .select()
    .from(aiInterviewTurns)
    .where(eq(aiInterviewTurns.sessionId, sessionId));
  const turnIndex = existing.length;
  const result: any = await d.insert(aiInterviewTurns).values({
    sessionId,
    turnIndex,
    role,
    content,
    tokenCount: tokenCount ?? null,
  } as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function listTurns(sessionId: number) {
  const d = await db();
  return d
    .select()
    .from(aiInterviewTurns)
    .where(eq(aiInterviewTurns.sessionId, sessionId))
    .orderBy(asc(aiInterviewTurns.turnIndex));
}
