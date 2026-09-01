/**
 * GitHub Profile Service
 * ----------------------------------------------------------------------
 * Read-side aggregator + lifecycle ops (disconnect). The recruiter view
 * is a joined snapshot: profile + latest signals + top repos.
 */

import * as profilesRepo from "../repositories/githubProfiles.repository";
import * as reposRepo from "../repositories/githubRepos.repository";
import * as signalsRepo from "../repositories/githubSignals.repository";
import { githubSignalsService } from "./githubSignals.service";
import { logPii } from "../../compliance";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import {
  EngineeringSignals,
  GithubProfileDTO,
  GithubProfileNotFoundError,
  GithubRepoDTO,
  RequesterContext,
  TenantScope,
} from "../types";

function toProfileDTO(row: any): GithubProfileDTO {
  return {
    id: row.id,
    candidateId: row.candidateId,
    githubUserId: Number(row.githubUserId),
    handle: row.handle,
    name: row.name ?? null,
    bio: row.bio ?? null,
    avatarUrl: row.avatarUrl ?? null,
    company: row.company ?? null,
    location: row.location ?? null,
    followers: row.followers ?? null,
    following: row.following ?? null,
    publicRepos: row.publicRepos ?? null,
    createdOnGithubAt: row.createdOnGithubAt ?? null,
    installationId: row.installationId != null ? Number(row.installationId) : null,
    lastSyncedAt: row.lastSyncedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRepoDTO(row: any): GithubRepoDTO {
  return {
    id: row.id,
    profileId: row.profileId,
    githubRepoId: Number(row.githubRepoId),
    name: row.name,
    fullName: row.fullName,
    description: row.description ?? null,
    isFork: Number(row.isFork ?? 0) === 1,
    primaryLanguage: row.primaryLanguage ?? null,
    languages: (row.languages as Record<string, number>) ?? {},
    stars: Number(row.stars ?? 0),
    forks: Number(row.forks ?? 0),
    openIssues: Number(row.openIssues ?? 0),
    lastPushAt: row.lastPushAt ?? null,
    topics: (row.topics as string[]) ?? [],
    homepage: row.homepage ?? null,
    commitCount30d: row.commitCount30d ?? null,
    commitCountTotal: row.commitCountTotal ?? null,
    isArchived: Number(row.isArchived ?? 0) === 1,
  };
}

export interface CandidateGithubView {
  profile: GithubProfileDTO;
  topRepos: GithubRepoDTO[];
  signals: EngineeringSignals;
}

export class GithubProfileService {
  async getForCandidate(
    scope: TenantScope,
    candidateId: number,
    requester: RequesterContext,
  ): Promise<CandidateGithubView | null> {
    assertTenantSupported(scope);
    const candidateTenant = await profilesRepo.getCandidateTenantId(candidateId);
    if (candidateTenant === undefined) return null;
    assertTenantScope(candidateTenant ?? null, scope, "getForCandidate");

    const profile = await profilesRepo.findByCandidateId(candidateId);
    if (!profile) return null;

    const [repos, signals] = await Promise.all([
      reposRepo.listForProfile(profile.id, { limit: 10, orderBy: "stars" }),
      githubSignalsService.getLatestSnapshot(profile.id),
    ]);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "github_profile",
      subjectId: profile.id,
      action: "read",
      ipAddress: undefined,
    });

    return {
      profile: toProfileDTO(profile),
      topRepos: repos.map(toRepoDTO),
      signals,
    };
  }

  /**
   * Lightweight raw lookup for cross-module callers (matching/scoring).
   * Returns the profile row (or null) without recruiter gating — callers
   * are expected to be system-level pipelines, not end users.
   */
  async findByCandidateId(candidateId: number) {
    return profilesRepo.findByCandidateId(candidateId);
  }

  /**
   * Recent signal rows for a profile (any signal type). Used by the
   * scoring service to derive a normalized github score.
   */
  async listRecentSignals(profileId: number, limit = 20) {
    return signalsRepo.recent(profileId, limit);
  }

  async disconnect(
    scope: TenantScope,
    candidateId: number,
    requester: RequesterContext,
  ): Promise<{ success: true }> {
    assertTenantSupported(scope);
    const candidateTenant = await profilesRepo.getCandidateTenantId(candidateId);
    if (candidateTenant === undefined) {
      throw new GithubProfileNotFoundError(`candidate:${candidateId}`);
    }
    assertTenantScope(candidateTenant ?? null, scope, "disconnect");

    const profile = await profilesRepo.findByCandidateId(candidateId);
    if (!profile) throw new GithubProfileNotFoundError(`candidate:${candidateId}`);

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "github_profile",
      subjectId: profile.id,
      action: "delete",
      ipAddress: undefined,
    });

    // Cascade: signals → repos → profile.
    await signalsRepo.deleteForProfile(profile.id);
    await reposRepo.deleteForProfile(profile.id);
    await profilesRepo.deleteById(profile.id);
    return { success: true };
  }
}

export const githubProfileService = new GithubProfileService();
