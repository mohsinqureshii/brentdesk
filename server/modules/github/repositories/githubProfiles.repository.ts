/**
 * GithubProfiles Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `github_profiles`. No business logic, no
 * encryption — that's the service's job. The repo only persists the
 * already-encrypted token blobs.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { githubProfiles, candidates } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(githubProfiles).where(eq(githubProfiles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findByCandidateId(candidateId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(githubProfiles)
    .where(eq(githubProfiles.candidateId, candidateId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByGithubUserId(githubUserId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(githubProfiles)
    .where(eq(githubProfiles.githubUserId, githubUserId))
    .limit(1);
  return rows[0] ?? null;
}

/** Returns candidate's tenantId for scope enforcement. */
export async function getCandidateTenantId(candidateId: number): Promise<number | null | undefined> {
  const d = await db();
  const rows = await d
    .select({ tenantId: candidates.tenantId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (rows.length === 0) return undefined;
  return rows[0].tenantId ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(githubProfiles).values(values as any);
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(githubProfiles).set(values as any).where(eq(githubProfiles.id, id));
}

export async function setLastSynced(id: number, at: string): Promise<void> {
  const d = await db();
  await d
    .update(githubProfiles)
    .set({ lastSyncedAt: at } as any)
    .where(eq(githubProfiles.id, id));
}

export async function setOauthTokens(
  id: number,
  accessEncrypted: string,
  refreshEncrypted: string | null,
  scopes: string[],
): Promise<void> {
  const d = await db();
  await d
    .update(githubProfiles)
    .set({
      oauthAccessTokenEncrypted: accessEncrypted,
      oauthRefreshTokenEncrypted: refreshEncrypted,
      oauthScopes: scopes,
    } as any)
    .where(eq(githubProfiles.id, id));
}

export async function deleteById(id: number): Promise<void> {
  const d = await db();
  await d.delete(githubProfiles).where(eq(githubProfiles.id, id));
}
