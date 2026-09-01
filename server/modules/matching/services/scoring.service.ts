/**
 * Scoring Service
 * ----------------------------------------------------------------------
 * Composes a 0..100 candidate score from four sub-scores:
 *
 *   resume     — years of experience + skill overlap
 *   github     — recent engineering signal density
 *   assessment — averaged recent assessment scores
 *   match      — cosine similarity between candidate and job vectors
 *
 * Missing sub-scores don't drag the composite to zero — the weighted
 * mean is taken over the available components only. Persisted to
 * `candidate_scores`; the LLM explanation is filled in by a separate
 * `explain` call so we don't pay for the LLM on every recompute.
 */

import { candidatesQueryService } from "../../candidates";
import { githubProfileService } from "../../github";
import { assessmentAttemptsService } from "../../assessments";
import { invokeLLMProvider } from "../../../services/ai/llmProvider.service";
import * as scoresRepo from "../repositories/scores.repository";
import { matchingService } from "./matching.service";
import { assertTenantScope } from "../tenant.guard";
import {
  CandidateScoreDTO,
  DEFAULT_WEIGHTS,
  RequesterContext,
  ScoreNotComputedError,
  ScoringWeights,
  TenantScope,
} from "../types";

const BULK_LIMIT = 200;

// ----------------------------------------------------------------
// Sub-score computations
// ----------------------------------------------------------------

/**
 * Resume score 0..100:
 *   - up to 60 pts from yearsExperience (capped at 10 yrs)
 *   - up to 40 pts from skill overlap with jobSkills, OR a 20 pt
 *     baseline if we have parsed resume JSON but no job skill list
 */
export function computeResumeScore(
  candidate: any,
  jobSkills?: string[] | null,
): number | null {
  if (!candidate) return null;
  const years = Number(candidate.yearsExperience ?? 0);
  const yearsPts = Math.max(0, Math.min(1, years / 10)) * 60;

  const parsed = candidate.parsedResumeJson as any;
  let skillPts = 0;
  if (parsed && Array.isArray(parsed.skills) && jobSkills && jobSkills.length > 0) {
    const norm = (s: string) => String(s || "").trim().toLowerCase();
    const candidateSkills = new Set(parsed.skills.map(norm));
    const overlap = jobSkills.filter((s) => candidateSkills.has(norm(s))).length;
    skillPts = (overlap / jobSkills.length) * 40;
  } else if (parsed) {
    skillPts = 20;
  }

  const total = Math.min(100, yearsPts + skillPts);
  return Math.round(total * 100) / 100;
}

/**
 * GitHub score 0..100 from recent signal density. Returns null when
 * the candidate has no profile or no signals (the composite then
 * skips the github component instead of slamming it to zero).
 */
export async function computeGithubScore(candidateId: number): Promise<number | null> {
  const profile = await githubProfileService.findByCandidateId(candidateId);
  if (!profile) return null;
  const signals = await githubProfileService.listRecentSignals(profile.id, 20);
  if (!signals.length) return null;
  let sum = 0;
  let count = 0;
  for (const s of signals as any[]) {
    if (s.score !== null && s.score !== undefined) {
      sum += Number(s.score);
      count++;
    }
  }
  if (count === 0) return null;
  // Empirical normalization: a typical mature profile sums to ~500
  // across recent signals. Cap at 100.
  const normalized = Math.min(100, (sum / 500) * 100);
  return Math.round(normalized * 100) / 100;
}

/**
 * Average of the candidate's last N graded/submitted assessment scores.
 * Returns null when no attempts have a numeric score yet.
 */
export async function computeAssessmentScore(
  _scope: TenantScope,
  candidateId: number,
): Promise<number | null> {
  const scores = await assessmentAttemptsService.recentScoresForCandidate(candidateId, 3);
  if (!scores.length) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(Math.min(100, avg) * 100) / 100;
}

/**
 * Match score 0..100. Delegates to the matching service, which embeds
 * both sides and computes cosine in-JS. Returns null on any failure
 * (e.g. Qdrant unavailable) so the composite degrades gracefully.
 */
export async function computeMatchScore(
  scope: TenantScope,
  candidateId: number,
  jobId: number,
): Promise<number | null> {
  return matchingService.cosineMatchScore(scope, candidateId, jobId);
}

// ----------------------------------------------------------------
// Composition + persistence
// ----------------------------------------------------------------

function weightedComposite(
  parts: Array<{ score: number | null; weight: number }>,
): number | null {
  let num = 0;
  let den = 0;
  for (const { score, weight } of parts) {
    if (score === null || Number.isNaN(score)) continue;
    num += score * weight;
    den += weight;
  }
  if (den === 0) return null;
  return Math.round((num / den) * 100) / 100;
}

function toDTO(row: any): CandidateScoreDTO {
  const weights = (row.weights as ScoringWeights) || DEFAULT_WEIGHTS;
  const num = (v: any): number | null =>
    v === null || v === undefined ? null : Number(v);
  return {
    id: row.id,
    tenantId: row.tenantId,
    candidateId: row.candidateId,
    jobId: row.jobId ?? null,
    compositeScore: num(row.compositeScore),
    resumeScore: num(row.resumeScore),
    githubScore: num(row.githubScore),
    assessmentScore: num(row.assessmentScore),
    matchScore: num(row.matchScore),
    weights,
    explanation: row.explanation ?? null,
    computedAt: row.computedAt,
  };
}

export class ScoringService {
  async getCurrent(
    scope: TenantScope,
    candidateId: number,
    jobId: number | null,
  ): Promise<CandidateScoreDTO | null> {
    const candidate = await candidatesQueryService.findById(candidateId);
    if (!candidate) return null;
    assertTenantScope(candidate.tenantId ?? null, scope, "scoring.getCurrent");
    const row = await scoresRepo.findCurrent(candidateId, jobId);
    return row ? toDTO(row) : null;
  }

  async computeForCandidate(
    scope: TenantScope,
    candidateId: number,
    jobId: number | null,
    _requester: RequesterContext,
  ): Promise<CandidateScoreDTO> {
    const candidate = await candidatesQueryService.findById(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    assertTenantScope(candidate.tenantId ?? null, scope, "scoring.computeForCandidate");

    // Reuse previously-stored weights if any; otherwise defaults.
    const existing = await scoresRepo.findCurrent(candidateId, jobId);
    const weights: ScoringWeights =
      (existing?.weights as ScoringWeights) || DEFAULT_WEIGHTS;

    // Job context — used for the match component + resume skill overlap.
    let jobSkills: string[] | null = null;
    if (jobId !== null) {
      const { getDb } = await import("../../../db");
      const { jobs } = await import("../../../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const d = await getDb();
      if (d) {
        const rows = await d
          .select({ skills: jobs.skills, tenantId: jobs.tenantId })
          .from(jobs)
          .where(eq(jobs.id, jobId))
          .limit(1);
        const job = rows[0];
        if (job) {
          assertTenantScope(
            job.tenantId ?? null,
            scope,
            "scoring.computeForCandidate(job)",
          );
          if (Array.isArray(job.skills)) jobSkills = job.skills as string[];
        }
      }
    }

    const resumeScore = computeResumeScore(candidate, jobSkills);
    const githubScore = await computeGithubScore(candidateId);
    const assessmentScore = await computeAssessmentScore(scope, candidateId);
    const matchScore =
      jobId !== null ? await computeMatchScore(scope, candidateId, jobId) : null;

    const composite = weightedComposite([
      { score: resumeScore, weight: weights.resume },
      { score: githubScore, weight: weights.github },
      { score: assessmentScore, weight: weights.assessment },
      { score: matchScore, weight: weights.match },
    ]);

    await scoresRepo.upsert({
      tenantId: (candidate.tenantId as number) ?? 0,
      candidateId,
      jobId,
      compositeScore: composite,
      resumeScore,
      githubScore,
      assessmentScore,
      matchScore,
      weights,
    });

    const updated = await scoresRepo.findCurrent(candidateId, jobId);
    if (!updated) throw new Error("Score upsert produced no row");
    return toDTO(updated);
  }

  async bulkRecompute(
    scope: TenantScope,
    jobId: number | null,
    requester: RequesterContext,
  ): Promise<{ processed: number; errors: number }> {
    const list = await candidatesQueryService.findActiveForTenant(scope, BULK_LIMIT);
    let processed = 0;
    let errors = 0;
    for (const c of list) {
      try {
        await this.computeForCandidate(scope, c.id, jobId, requester);
        processed++;
      } catch (err) {
        console.error(`[scoring/bulkRecompute] candidate ${c.id} failed:`, err);
        errors++;
      }
    }
    return { processed, errors };
  }

  async explain(
    scope: TenantScope,
    candidateId: number,
    jobId: number,
    _requester: RequesterContext,
  ): Promise<CandidateScoreDTO> {
    const candidate = await candidatesQueryService.findById(candidateId);
    if (!candidate) throw new ScoreNotComputedError(candidateId);
    assertTenantScope(candidate.tenantId ?? null, scope, "scoring.explain");

    const current = await scoresRepo.findCurrent(candidateId, jobId);
    if (!current) throw new ScoreNotComputedError(candidateId);

    const dto = toDTO(current);
    const prompt = [
      "You are an expert recruiter assistant. Given this candidate score breakdown,",
      "write a concise 2-3 sentence explanation of why this candidate is or isn't a strong fit for the job.",
      "",
      `Resume score:     ${dto.resumeScore ?? "n/a"}`,
      `GitHub score:     ${dto.githubScore ?? "n/a"}`,
      `Assessment score: ${dto.assessmentScore ?? "n/a"}`,
      `Match score:      ${dto.matchScore ?? "n/a"}`,
      `Composite:        ${dto.compositeScore ?? "n/a"}`,
      "",
      `Candidate headline: ${(candidate as any).headline || "(none)"}`,
      `Candidate title:    ${(candidate as any).currentTitle || "(none)"}`,
    ].join("\n");

    let explanation = "";
    try {
      const res = await invokeLLMProvider({
        messages: [{ role: "user", content: prompt }],
        operation: "matching.explain",
        temperature: 0.4,
        maxTokens: 256,
      });
      explanation = res.content?.trim() || "";
    } catch (err) {
      console.error("[scoring/explain] LLM failed:", err);
      explanation = `Composite ${dto.compositeScore ?? "n/a"} — components: resume ${dto.resumeScore ?? "n/a"}, github ${dto.githubScore ?? "n/a"}, assessment ${dto.assessmentScore ?? "n/a"}, match ${dto.matchScore ?? "n/a"}.`;
    }

    await scoresRepo.updateExplanation(current.id, explanation);

    const updated = await scoresRepo.findCurrent(candidateId, jobId);
    return toDTO(updated || current);
  }
}

export const scoringService = new ScoringService();
