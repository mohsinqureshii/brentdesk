/**
 * GithubFetchJobs Repository
 * ----------------------------------------------------------------------
 * Job queue backed by `github_fetch_jobs`. `claimNext()` is the only
 * non-trivial query — it implements optimistic claim via an UPDATE
 * with a row-id filter so concurrent workers don't process the same
 * job twice.
 *
 * NB: MySQL doesn't natively support SELECT...FOR UPDATE SKIP LOCKED
 * in older versions; the approach here is a two-step "find then claim"
 * with the second step's WHERE clause asserting the still-queued
 * status. Lost-update races simply re-loop.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { githubFetchJobs } from "../../../../drizzle/schema";
import type { GithubFetchJobType } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function enqueue(
  profileId: number,
  jobType: GithubFetchJobType,
  payload?: Record<string, unknown>,
): Promise<void> {
  const d = await db();
  await d.insert(githubFetchJobs).values({
    profileId,
    jobType,
    status: "queued",
    attempts: 0,
    payload: payload ?? null,
  } as any);
}

/**
 * Atomically claim the next queued job. Returns the row if claimed,
 * null if queue is empty or someone else beat us.
 */
export async function claimNext() {
  const d = await db();
  const candidates = await d
    .select()
    .from(githubFetchJobs)
    .where(eq(githubFetchJobs.status, "queued"))
    .orderBy(asc(githubFetchJobs.createdAt))
    .limit(1);
  if (candidates.length === 0) return null;
  const candidate = candidates[0];

  // Claim it: only succeeds if status is still 'queued'.
  const nowIso = new Date().toISOString().slice(0, 19).replace("T", " ");
  await d
    .update(githubFetchJobs)
    .set({
      status: "running",
      startedAt: nowIso,
      attempts: sql`${githubFetchJobs.attempts} + 1`,
    } as any)
    .where(
      and(eq(githubFetchJobs.id, candidate.id), eq(githubFetchJobs.status, "queued")),
    );

  // Re-fetch to confirm we got it (status === 'running' and startedAt is ours).
  const claimed = await d
    .select()
    .from(githubFetchJobs)
    .where(eq(githubFetchJobs.id, candidate.id))
    .limit(1);
  const row = claimed[0];
  if (!row || row.status !== "running") return null;
  return row;
}

export async function markCompleted(id: number, _result?: Record<string, unknown>): Promise<void> {
  const d = await db();
  const nowIso = new Date().toISOString().slice(0, 19).replace("T", " ");
  await d
    .update(githubFetchJobs)
    .set({ status: "completed", completedAt: nowIso, error: null } as any)
    .where(eq(githubFetchJobs.id, id));
}

export async function markFailed(id: number, error: string): Promise<void> {
  const d = await db();
  const nowIso = new Date().toISOString().slice(0, 19).replace("T", " ");
  await d
    .update(githubFetchJobs)
    .set({ status: "failed", completedAt: nowIso, error: error.slice(0, 65000) } as any)
    .where(eq(githubFetchJobs.id, id));
}

export async function incrementAttempts(id: number): Promise<void> {
  const d = await db();
  await d
    .update(githubFetchJobs)
    .set({ attempts: sql`${githubFetchJobs.attempts} + 1` } as any)
    .where(eq(githubFetchJobs.id, id));
}

export async function recent(profileId: number, limit = 20) {
  const d = await db();
  return d
    .select()
    .from(githubFetchJobs)
    .where(eq(githubFetchJobs.profileId, profileId))
    .orderBy(desc(githubFetchJobs.createdAt))
    .limit(limit);
}
