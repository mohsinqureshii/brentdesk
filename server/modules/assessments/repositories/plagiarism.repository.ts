/**
 * Plagiarism Reports Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `plagiarism_reports`. The actual similarity
 * computation lives in `services/plagiarism.service.ts`.
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { plagiarismReports } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function insert(values: Record<string, unknown>): Promise<number> {
  const d = await db();
  const result: any = await d.insert(plagiarismReports).values(values as any);
  const insertId =
    result?.[0]?.insertId ?? result?.insertId ?? result?.[0]?.[0]?.insertId ?? 0;
  return Number(insertId);
}

export async function listForAttempt(attemptId: number) {
  const d = await db();
  return d
    .select()
    .from(plagiarismReports)
    .where(eq(plagiarismReports.attemptId, attemptId))
    .orderBy(desc(plagiarismReports.createdAt));
}

export async function listForAnswer(answerId: number) {
  const d = await db();
  return d
    .select()
    .from(plagiarismReports)
    .where(eq(plagiarismReports.answerId, answerId))
    .orderBy(desc(plagiarismReports.createdAt));
}
