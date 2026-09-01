/**
 * Matching Service — Vector Search
 * ----------------------------------------------------------------------
 * Top-N candidate ↔ job matches via Qdrant cosine similarity, plus a
 * generic text→vector search across either collection.
 *
 * The service relies on the embedding service to produce vectors (and
 * to cache them by payload hash). Every search is tenant-scoped: the
 * collection name embeds the tenantId, so cross-tenant leakage is
 * structurally impossible.
 */

import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidates, jobs, users } from "../../../../drizzle/schema";
import * as scoresRepo from "../repositories/scores.repository";
import * as qdrant from "./qdrantClient.service";
import { embedText, embedCandidate, embedJob } from "./embedding.service";
import type {
  CandidateJobMatchResult,
  JobMatchResult,
  RequesterContext,
  ScoreBreakdown,
  SemanticSearchResult,
  ScoringWeights,
  TenantScope,
} from "../types";
import { DEFAULT_WEIGHTS } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ----------------------------------------------------------------
// Lookup helpers — direct Drizzle, matching-module owned. We
// deliberately don't go through candidatesService.getProfile here
// because that path enforces recruiter/self gating; the requester
// authorization happens at the router boundary.
// ----------------------------------------------------------------

async function lookupCandidateNames(
  ids: number[],
): Promise<Map<number, string | null>> {
  if (ids.length === 0) return new Map();
  const d = await db();
  const rows = await d
    .select({
      id: candidates.id,
      headline: candidates.headline,
      userId: candidates.userId,
      userName: users.name,
    })
    .from(candidates)
    .leftJoin(users, eq(candidates.userId, users.id))
    .where(inArray(candidates.id, ids));
  const map = new Map<number, string | null>();
  for (const r of rows) {
    map.set(r.id, r.userName || r.headline || null);
  }
  return map;
}

async function lookupJobs(ids: number[]): Promise<Map<number, { title: string }>> {
  if (ids.length === 0) return new Map();
  const d = await db();
  const rows = await d
    .select({ id: jobs.id, title: jobs.title })
    .from(jobs)
    .where(inArray(jobs.id, ids));
  const map = new Map<number, { title: string }>();
  for (const r of rows) map.set(r.id, { title: r.title });
  return map;
}

function toBreakdown(row: any | null): ScoreBreakdown | null {
  if (!row) return null;
  const num = (v: any): number | null =>
    v === null || v === undefined ? null : Number(v);
  const weights = (row.weights as ScoringWeights) || DEFAULT_WEIGHTS;
  return {
    resume: num(row.resumeScore),
    github: num(row.githubScore),
    assessment: num(row.assessmentScore),
    match: num(row.matchScore),
    weights,
  };
}

// ----------------------------------------------------------------
// Public service
// ----------------------------------------------------------------

export class MatchingService {
  /**
   * Top candidates similar to a given job (vector similarity only).
   * For each hit we enrich with the latest persisted score row when
   * present so the UI can show composite alongside match.
   */
  async findTopCandidatesForJob(
    scope: TenantScope,
    jobId: number,
    limit: number,
    _requester: RequesterContext,
  ): Promise<JobMatchResult[]> {
    const { vector } = await embedJob(scope, jobId);
    const collection = qdrant.collectionForCandidates(scope);
    const hits = await qdrant.searchSimilar(collection, vector, limit);

    const candidateIds = hits
      .map((h) => Number(h.id))
      .filter((n) => Number.isFinite(n));
    const names = await lookupCandidateNames(candidateIds);

    const out: JobMatchResult[] = [];
    for (const hit of hits) {
      const candidateId = Number(hit.id);
      if (!Number.isFinite(candidateId)) continue;
      const scoreRow = await scoresRepo.findCurrent(candidateId, jobId);
      out.push({
        candidateId,
        candidateName: names.get(candidateId) ?? null,
        matchScore: Math.round(hit.score * 10000) / 100,
        compositeScore:
          scoreRow?.compositeScore != null ? Number(scoreRow.compositeScore) : null,
        breakdown: toBreakdown(scoreRow),
      });
    }
    return out;
  }

  /**
   * Top jobs similar to a given candidate. Mirrors
   * findTopCandidatesForJob in the opposite direction.
   */
  async findTopJobsForCandidate(
    scope: TenantScope,
    candidateId: number,
    limit: number,
    _requester: RequesterContext,
  ): Promise<CandidateJobMatchResult[]> {
    const { vector } = await embedCandidate(scope, candidateId);
    const collection = qdrant.collectionForJobs(scope);
    const hits = await qdrant.searchSimilar(collection, vector, limit);

    const jobIds = hits.map((h) => Number(h.id)).filter((n) => Number.isFinite(n));
    const jobMap = await lookupJobs(jobIds);

    const out: CandidateJobMatchResult[] = [];
    for (const hit of hits) {
      const jobId = Number(hit.id);
      if (!Number.isFinite(jobId)) continue;
      const meta = jobMap.get(jobId);
      const scoreRow = await scoresRepo.findCurrent(candidateId, jobId);
      out.push({
        jobId,
        jobTitle: meta?.title ?? `Job #${jobId}`,
        matchScore: Math.round(hit.score * 10000) / 100,
        compositeScore:
          scoreRow?.compositeScore != null ? Number(scoreRow.compositeScore) : null,
      });
    }
    return out;
  }

  /**
   * Semantic search by free-text query. Embeds the query and searches
   * the chosen collection. Used by the recruiter "find someone who
   * knows X" search box.
   */
  async searchByQuery(
    scope: TenantScope,
    query: string,
    type: "candidates" | "jobs",
    limit: number,
    _requester: RequesterContext,
  ): Promise<SemanticSearchResult[]> {
    const { vector } = await embedText(query);
    const collection =
      type === "candidates"
        ? qdrant.collectionForCandidates(scope)
        : qdrant.collectionForJobs(scope);
    const hits = await qdrant.searchSimilar(collection, vector, limit);

    const ids = hits.map((h) => Number(h.id)).filter((n) => Number.isFinite(n));
    let names: Map<number, string | null>;
    if (type === "candidates") {
      names = await lookupCandidateNames(ids);
    } else {
      const jm = await lookupJobs(ids);
      names = new Map();
      for (const [id, v] of Array.from(jm.entries())) names.set(id, v.title);
    }

    const out: SemanticSearchResult[] = [];
    for (const hit of hits) {
      const id = Number(hit.id);
      if (!Number.isFinite(id)) continue;
      out.push({
        id,
        type: type === "candidates" ? "candidate" : "job",
        name: names.get(id) || `${type === "candidates" ? "Candidate" : "Job"} #${id}`,
        score: Math.round(hit.score * 10000) / 100,
      });
    }
    return out;
  }

  /**
   * Cosine similarity between a candidate vector and a job vector,
   * scaled to 0..100. Used by scoring.service to derive `matchScore`
   * for the persisted composite. Returns null if either embed call
   * fails (composite still computes from the remaining components).
   */
  async cosineMatchScore(
    scope: TenantScope,
    candidateId: number,
    jobId: number,
  ): Promise<number | null> {
    try {
      const [c, j] = await Promise.all([
        embedCandidate(scope, candidateId),
        embedJob(scope, jobId),
      ]);
      const sim = cosineSimilarity(c.vector, j.vector);
      const clamped = Math.max(0, Math.min(1, sim));
      return Math.round(clamped * 10000) / 100;
    } catch (err) {
      console.error("[matching/cosineMatchScore] failed:", err);
      return null;
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export const matchingService = new MatchingService();

// Backwards-compatible named exports for callers that consumed the
// pre-class shape (matching.router.ts, matching/index.ts public
// boundary). New code should use `matchingService.*`.
export const findTopCandidatesForJob = matchingService.findTopCandidatesForJob.bind(matchingService);
export const findTopJobsForCandidate = matchingService.findTopJobsForCandidate.bind(matchingService);
export const searchByQuery = matchingService.searchByQuery.bind(matchingService);
export const cosineMatchScore = matchingService.cosineMatchScore.bind(matchingService);
