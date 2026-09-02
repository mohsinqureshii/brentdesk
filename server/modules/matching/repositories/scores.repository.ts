/**
 * Candidate Scores Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `candidate_scores`. No business logic — tenant
 * scope checks, weight normalization, and composite math live in the
 * scoring service.
 *
 * The table acts as an append-friendly snapshot: the latest row per
 * (candidateId, jobId) is "current". We update-in-place when a row
 * already exists and insert otherwise.
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidateScores } from "../../../../drizzle/schema";
import { toDbDate } from "../../../_core/dbValues";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function jobFilter(jobId: number | null | undefined) {
  if (jobId === null || jobId === undefined) return isNull(candidateScores.jobId);
  return eq(candidateScores.jobId, jobId);
}

/** Most recent score row for (candidateId, jobId). */
export async function findCurrent(candidateId: number, jobId: number | null = null) {
  const d = await db();
  const rows = await d
    .select()
    .from(candidateScores)
    .where(and(eq(candidateScores.candidateId, candidateId), jobFilter(jobId)))
    .orderBy(desc(candidateScores.computedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(candidateScores)
    .where(eq(candidateScores.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Update-if-exists, insert-otherwise. Match key = (candidateId, jobId).
 * Returns the id of the affected row.
 */
export async function upsert(values: {
  tenantId: number;
  candidateId: number;
  jobId: number | null;
  compositeScore: number | null;
  resumeScore: number | null;
  githubScore: number | null;
  assessmentScore: number | null;
  matchScore: number | null;
  weights: unknown;
  explanation?: string | null;
}): Promise<number> {
  const d = await db();
  const existing = await findCurrent(values.candidateId, values.jobId);

  const payload: Record<string, unknown> = {
    tenantId: values.tenantId,
    candidateId: values.candidateId,
    jobId: values.jobId,
    compositeScore:
      values.compositeScore !== null ? String(values.compositeScore) : null,
    resumeScore:
      values.resumeScore !== null ? String(values.resumeScore) : null,
    githubScore:
      values.githubScore !== null ? String(values.githubScore) : null,
    assessmentScore:
      values.assessmentScore !== null ? String(values.assessmentScore) : null,
    matchScore: values.matchScore !== null ? String(values.matchScore) : null,
    weights: values.weights as any,
    computedAt: toDbDate(new Date()),
  };
  if (values.explanation !== undefined) payload.explanation = values.explanation;

  if (existing) {
    await d
      .update(candidateScores)
      .set(payload as any)
      .where(eq(candidateScores.id, existing.id));
    return existing.id;
  }

  await d.insert(candidateScores).values(payload as any);
  const inserted = await findCurrent(values.candidateId, values.jobId);
  if (!inserted) throw new Error("Insert produced no row");
  return inserted.id;
}

export async function updateExplanation(id: number, explanation: string): Promise<void> {
  const d = await db();
  await d
    .update(candidateScores)
    .set({ explanation } as any)
    .where(eq(candidateScores.id, id));
}

/** Top N candidates for a job, ordered by composite score desc. */
export async function listForJob(jobId: number, limit = 50) {
  const d = await db();
  return d
    .select()
    .from(candidateScores)
    .where(eq(candidateScores.jobId, jobId))
    .orderBy(desc(candidateScores.compositeScore))
    .limit(limit);
}

/** All score rows for a candidate (every job + the null-job summary). */
export async function listForCandidate(candidateId: number) {
  const d = await db();
  return d
    .select()
    .from(candidateScores)
    .where(eq(candidateScores.candidateId, candidateId))
    .orderBy(desc(candidateScores.computedAt));
}

/** Map of jobId → latest row for a single candidate. */
export async function latestPerJobForCandidate(candidateId: number) {
  const rows = await listForCandidate(candidateId);
  const map = new Map<number | null, typeof rows[number]>();
  for (const r of rows) {
    const key = r.jobId ?? null;
    if (!map.has(key)) map.set(key, r);
  }
  return map;
}

/** Used by bulk paths to find candidates with no score row yet. */
export async function countForTenant(tenantId: number) {
  const d = await db();
  const rows = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(candidateScores)
    .where(eq(candidateScores.tenantId, tenantId));
  return Number(rows[0]?.count || 0);
}
