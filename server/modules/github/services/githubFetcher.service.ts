/**
 * GitHub Fetcher Service
 * ----------------------------------------------------------------------
 * Connects a candidate's GitHub account, fetches profile + repos via
 * the REST API, persists them, then enqueues a `signals_compute` job.
 *
 * Uses native fetch — no @octokit dependency. Pagination follows the
 * GitHub Link header. Default cap is 100 repos, hard ceiling 200.
 *
 * Headers used on every API call:
 *   Authorization: Bearer <token>
 *   Accept: application/vnd.github+json
 *   X-GitHub-Api-Version: 2022-11-28
 */

import * as profilesRepo from "../repositories/githubProfiles.repository";
import * as reposRepo from "../repositories/githubRepos.repository";
import * as jobsRepo from "../repositories/githubFetchJobs.repository";
import { githubAuthService } from "./githubAuth.service";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import {
  GithubAuthError,
  GithubProfileNotFoundError,
  TenantScope,
} from "../types";

const API_BASE = "https://api.github.com";
const DEFAULT_REPO_LIMIT = 100;
const MAX_REPO_LIMIT = 200;

interface GhProfile {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  topics?: string[];
  homepage: string | null;
  archived: boolean;
}

// ------------------------------------------------------------
// Low-level HTTP
// ------------------------------------------------------------

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  // Format: <url1>; rel="next", <url2>; rel="last"
  for (const part of linkHeader.split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (m && m[2] === "next") return m[1];
  }
  return null;
}

async function ghGet<T>(url: string, token: string): Promise<{ data: T; res: Response }> {
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GithubAuthError(`GET ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as T;
  return { data, res };
}

async function ghPaginate<T>(startUrl: string, token: string, hardCap: number): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = startUrl;
  while (next && out.length < hardCap) {
    const { data, res } = await ghGet<T[]>(next, token);
    out.push(...data);
    next = parseNextLink(res.headers.get("link"));
  }
  return out.slice(0, hardCap);
}

// ------------------------------------------------------------
// High-level operations
// ------------------------------------------------------------

async function fetchProfile(token: string): Promise<GhProfile> {
  const { data } = await ghGet<GhProfile>(`${API_BASE}/user`, token);
  return data;
}

async function fetchRepos(token: string, limit: number): Promise<GhRepo[]> {
  const cap = Math.min(limit, MAX_REPO_LIMIT);
  const perPage = Math.min(cap, 100);
  return ghPaginate<GhRepo>(
    `${API_BASE}/user/repos?per_page=${perPage}&sort=pushed&direction=desc&affiliation=owner`,
    token,
    cap,
  );
}

async function fetchRepoLanguages(
  token: string,
  fullName: string,
): Promise<Record<string, number>> {
  try {
    const { data } = await ghGet<Record<string, number>>(
      `${API_BASE}/repos/${fullName}/languages`,
      token,
    );
    return data;
  } catch (err) {
    console.warn(`[GitHub] languages fetch failed for ${fullName}:`, err);
    return {};
  }
}

async function fetchRecentCommitCount(
  token: string,
  fullName: string,
  defaultBranch?: string,
): Promise<number> {
  // GitHub's "commit activity" stats endpoint is cheap but eventually
  // computed; for a faster signal we use the commits endpoint with a
  // since= filter and count up to one page.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const branchPart = defaultBranch ? `&sha=${encodeURIComponent(defaultBranch)}` : "";
    const { data } = await ghGet<unknown[]>(
      `${API_BASE}/repos/${fullName}/commits?since=${since}&per_page=100${branchPart}`,
      token,
    );
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

// ------------------------------------------------------------
// Service surface
// ------------------------------------------------------------

export class GithubFetcherService {
  /**
   * Wire a candidate to their GitHub account. Exchanges the OAuth code,
   * fetches the basic profile, upserts `github_profiles`, and enqueues
   * an initial sync job.
   */
  async connectCandidate(
    scope: TenantScope,
    candidateId: number,
    oauthCode: string,
  ): Promise<{ profileId: number; handle: string }> {
    assertTenantSupported(scope);
    const candidateTenant = await profilesRepo.getCandidateTenantId(candidateId);
    if (candidateTenant === undefined) {
      throw new GithubProfileNotFoundError(`candidate:${candidateId}`);
    }
    assertTenantScope(candidateTenant ?? null, scope, "connectCandidate");

    const tokens = await githubAuthService.exchangeCode(oauthCode);
    const gh = await fetchProfile(tokens.accessToken);

    const existing = await profilesRepo.findByCandidateId(candidateId);
    const accessEnc = githubAuthService.encrypt(tokens.accessToken);
    const refreshEnc = tokens.refreshToken
      ? githubAuthService.encrypt(tokens.refreshToken)
      : null;

    let profileId: number;
    if (existing) {
      await profilesRepo.update(existing.id, {
        githubUserId: gh.id,
        handle: gh.login,
        name: gh.name,
        bio: gh.bio,
        avatarUrl: gh.avatar_url,
        company: gh.company,
        location: gh.location,
        followers: gh.followers,
        following: gh.following,
        publicRepos: gh.public_repos,
        createdOnGithubAt: gh.created_at,
      });
      await profilesRepo.setOauthTokens(existing.id, accessEnc, refreshEnc, tokens.scopes);
      profileId = existing.id;
    } else {
      await profilesRepo.insert({
        candidateId,
        githubUserId: gh.id,
        handle: gh.login,
        name: gh.name,
        bio: gh.bio,
        avatarUrl: gh.avatar_url,
        company: gh.company,
        location: gh.location,
        followers: gh.followers,
        following: gh.following,
        publicRepos: gh.public_repos,
        createdOnGithubAt: gh.created_at,
        oauthAccessTokenEncrypted: accessEnc,
        oauthRefreshTokenEncrypted: refreshEnc,
        oauthScopes: tokens.scopes,
      });
      const inserted = await profilesRepo.findByCandidateId(candidateId);
      if (!inserted) throw new Error("profile insert produced no row");
      profileId = inserted.id;
    }

    await jobsRepo.enqueue(profileId, "initial_sync");
    return { profileId, handle: gh.login };
  }

  /**
   * Pull the next queued job and run it. Designed to be invoked from a
   * scheduler tick — see scheduler.service.ts integration notes.
   * Returns null when the queue is empty.
   */
  async runFetchJob(): Promise<{
    id: number;
    profileId: number;
    jobType: string;
    status: "completed" | "failed";
  } | null> {
    const job = await jobsRepo.claimNext();
    if (!job) return null;

    try {
      switch (job.jobType) {
        case "initial_sync":
        case "incremental":
        case "manual_refresh":
          await this.syncProfile(job.profileId);
          await jobsRepo.enqueue(job.profileId, "signals_compute");
          break;
        case "signals_compute": {
          // Lazy-load to avoid a circular import (signals → fetcher).
          const { githubSignalsService } = await import("./githubSignals.service");
          await githubSignalsService.computeAll(job.profileId);
          break;
        }
        default:
          throw new Error(`unknown jobType: ${String(job.jobType)}`);
      }
      await jobsRepo.markCompleted(job.id);
      return {
        id: job.id,
        profileId: job.profileId,
        jobType: job.jobType as string,
        status: "completed",
      };
    } catch (err: any) {
      console.error("[GitHub] fetch job failed:", err);
      await jobsRepo.markFailed(job.id, err?.message || String(err));
      return {
        id: job.id,
        profileId: job.profileId,
        jobType: job.jobType as string,
        status: "failed",
      };
    }
  }

  /** Run runFetchJob() in a loop up to `maxJobs` times or until queue empty. */
  async drainQueue(maxJobs = 25): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    for (let i = 0; i < maxJobs; i++) {
      const result = await this.runFetchJob();
      if (!result) break;
      if (result.status === "failed") failed++;
      processed++;
    }
    return { processed, failed };
  }

  /** Manual-refresh entry point — enqueues a job, returns immediately. */
  async refreshProfile(
    scope: TenantScope,
    candidateId: number,
  ): Promise<{ enqueued: true }> {
    assertTenantSupported(scope);
    const candidateTenant = await profilesRepo.getCandidateTenantId(candidateId);
    if (candidateTenant === undefined) {
      throw new GithubProfileNotFoundError(`candidate:${candidateId}`);
    }
    assertTenantScope(candidateTenant ?? null, scope, "refreshProfile");

    const profile = await profilesRepo.findByCandidateId(candidateId);
    if (!profile) throw new GithubProfileNotFoundError(`candidate:${candidateId}`);
    await jobsRepo.enqueue(profile.id, "manual_refresh");
    return { enqueued: true };
  }

  // ------------------------------------------------------------
  // Internal: profile sync
  // ------------------------------------------------------------

  private async syncProfile(profileId: number): Promise<void> {
    const profile = await profilesRepo.findById(profileId);
    if (!profile) throw new GithubProfileNotFoundError(profileId);
    if (!profile.oauthAccessTokenEncrypted) {
      throw new GithubAuthError("profile has no OAuth token");
    }
    const token = githubAuthService.decrypt(profile.oauthAccessTokenEncrypted);
    if (!token) throw new GithubAuthError("token decrypt failed");

    // Refresh basic profile fields.
    const gh = await fetchProfile(token);
    await profilesRepo.update(profile.id, {
      handle: gh.login,
      name: gh.name,
      bio: gh.bio,
      avatarUrl: gh.avatar_url,
      company: gh.company,
      location: gh.location,
      followers: gh.followers,
      following: gh.following,
      publicRepos: gh.public_repos,
    });

    // Pull recent repos and enrich each with languages + recent commits.
    const repos = await fetchRepos(token, DEFAULT_REPO_LIMIT);
    const persisted: Array<Record<string, unknown>> = [];
    for (const r of repos) {
      const [languages, commits30d] = await Promise.all([
        fetchRepoLanguages(token, r.full_name),
        fetchRecentCommitCount(token, r.full_name),
      ]);
      persisted.push({
        githubRepoId: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        isFork: r.fork ? 1 : 0,
        primaryLanguage: r.language,
        languages,
        stars: r.stargazers_count,
        forks: r.forks_count,
        openIssues: r.open_issues_count,
        lastPushAt: r.pushed_at,
        topics: r.topics ?? [],
        homepage: r.homepage,
        commitCount30d: commits30d,
        isArchived: r.archived ? 1 : 0,
      });
    }
    await reposRepo.upsertMany(profile.id, persisted);

    const nowIso = new Date().toISOString().slice(0, 19).replace("T", " ");
    await profilesRepo.setLastSynced(profile.id, nowIso);
  }
}

export const githubFetcherService = new GithubFetcherService();
