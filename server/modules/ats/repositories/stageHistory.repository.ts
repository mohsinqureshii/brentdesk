/**
 * Candidate Stage History Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `candidate_stage_history` — the audit trail
 * of pipeline-stage transitions. Append-only from the caller's POV.
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidateStageHistory } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(candidateStageHistory).values(values as any)) as any;
  return result;
}

export async function listForApplication(applicationId: number) {
  const d = await db();
  return d
    .select()
    .from(candidateStageHistory)
    .where(eq(candidateStageHistory.applicationId, applicationId))
    .orderBy(desc(candidateStageHistory.createdAt));
}
