/**
 * GithubRepos Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `github_repos`. Upsert-by-(profileId,
 * githubRepoId) is the bread-and-butter operation — the fetcher rebuilds
 * the row set on every sync.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { githubRepos } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export interface ListReposOpts {
  limit?: number;
  includeForks?: boolean;
  orderBy?: "stars" | "lastPushAt";
}

export async function listForProfile(profileId: number, opts: ListReposOpts = {}) {
  const d = await db();
  const conditions: any[] = [eq(githubRepos.profileId, profileId)];
  if (opts.includeForks === false) conditions.push(eq(githubRepos.isFork, 0));

  const orderCol = opts.orderBy === "stars" ? githubRepos.stars : githubRepos.lastPushAt;
  const query = d
    .select()
    .from(githubRepos)
    .where(and(...conditions))
    .orderBy(desc(orderCol));

  if (opts.limit) {
    return query.limit(opts.limit);
  }
  return query;
}

export async function findByGithubRepoId(profileId: number, githubRepoId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(githubRepos)
    .where(
      and(eq(githubRepos.profileId, profileId), eq(githubRepos.githubRepoId, githubRepoId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertMany(
  profileId: number,
  repos: Array<Record<string, unknown>>,
): Promise<void> {
  if (repos.length === 0) return;
  const d = await db();
  for (const repo of repos) {
    const existing = await findByGithubRepoId(profileId, Number(repo.githubRepoId));
    if (existing) {
      await d
        .update(githubRepos)
        .set(repo as any)
        .where(eq(githubRepos.id, existing.id));
    } else {
      await d.insert(githubRepos).values({ ...repo, profileId } as any);
    }
  }
}

export async function deleteForProfile(profileId: number): Promise<void> {
  const d = await db();
  await d.delete(githubRepos).where(eq(githubRepos.profileId, profileId));
}

export async function countForProfile(profileId: number): Promise<number> {
  const d = await db();
  const rows = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(githubRepos)
    .where(eq(githubRepos.profileId, profileId));
  return Number(rows[0]?.count || 0);
}
