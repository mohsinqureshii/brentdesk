/**
 * Resume Parses Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for the `resume_parses` table — the audit log of
 * every LLM resume-parse attempt. The candidates table holds the
 * "current" parsed JSON; this table holds the full history.
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { resumeParses } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function insert(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(resumeParses).values(values as any);
}

export async function findByCandidate(candidateId: number) {
  const d = await db();
  return d
    .select()
    .from(resumeParses)
    .where(eq(resumeParses.candidateId, candidateId))
    .orderBy(desc(resumeParses.createdAt));
}

export async function latestForCandidate(candidateId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(resumeParses)
    .where(eq(resumeParses.candidateId, candidateId))
    .orderBy(desc(resumeParses.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
