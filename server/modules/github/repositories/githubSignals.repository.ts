/**
 * GithubSignals Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `github_signals`. Latest-by-type is the
 * common read pattern (each computation produces a new row; readers
 * want the most recent one).
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { githubSignals } from "../../../../drizzle/schema";
import type { GithubSignalType } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function latestByType(profileId: number, signalType: GithubSignalType) {
  const d = await db();
  const rows = await d
    .select()
    .from(githubSignals)
    .where(
      and(eq(githubSignals.profileId, profileId), eq(githubSignals.signalType, signalType)),
    )
    .orderBy(desc(githubSignals.computedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(githubSignals).values(values as any);
}

export async function recent(profileId: number, limit = 50) {
  const d = await db();
  return d
    .select()
    .from(githubSignals)
    .where(eq(githubSignals.profileId, profileId))
    .orderBy(desc(githubSignals.computedAt))
    .limit(limit);
}

export async function deleteForProfile(profileId: number): Promise<void> {
  const d = await db();
  await d.delete(githubSignals).where(eq(githubSignals.profileId, profileId));
}
