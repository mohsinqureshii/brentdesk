/**
 * Plagiarism Detection Service
 * ----------------------------------------------------------------------
 * Compares a candidate's submitted code/text against other recent
 * submissions for the same question (same tenant). The default method
 * is token-shingle similarity — k-gram overlap with k=5, expressed as
 * the Jaccard index of the two shingle sets.
 *
 * Thresholds (configurable via the service constants below):
 *   > 0.85 → high-confidence plagiarism, recommend manual review
 *   > 0.60 → flag for review (likely substantial overlap)
 *   ≤ 0.60 → not persisted
 *
 * No external libs — token shingling is a few lines of native JS.
 */

import { and, eq, ne, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
} from "../../../../drizzle/schema";
import * as plagRepo from "../repositories/plagiarism.repository";
import * as answersRepo from "../repositories/answers.repository";
import * as attemptsRepo from "../repositories/attempts.repository";
import { PlagiarismReportDTO } from "../types";

const SHINGLE_K = 5;
const HIGH_CONFIDENCE = 0.85;
const FLAG_THRESHOLD = 0.6;

function tokenize(text: string): string[] {
  // Lowercase + strip non-alphanumeric, split on whitespace. Good
  // enough for both prose and source code; punctuation noise gets
  // collapsed into the surrounding tokens.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(tokens: string[], k = SHINGLE_K): Set<string> {
  const out = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) out.add(tokens.join(" "));
    return out;
  }
  for (let i = 0; i <= tokens.length - k; i++) {
    out.add(tokens.slice(i, i + k).join(" "));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  const smaller = a.size < b.size ? a : b;
  const larger = a.size < b.size ? b : a;
  smaller.forEach((s) => { if (larger.has(s)) intersect += 1; });
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function answerContent(row: any): string {
  return [row.answerText, row.answerCode].filter(Boolean).join("\n");
}

export class PlagiarismService {
  /**
   * Compute similarity for the given answer against every other recent
   * answer for the same question in the same tenant. Persists a report
   * for the highest match when it crosses `FLAG_THRESHOLD`.
   */
  async checkAnswer(answerId: number): Promise<PlagiarismReportDTO | null> {
    const answer = await answersRepo.findById(answerId);
    if (!answer) return null;
    const attempt = await attemptsRepo.findById(answer.attemptId);
    if (!attempt) return null;

    const myContent = answerContent(answer);
    if (myContent.trim().length === 0) return null;
    const myShingles = shingles(tokenize(myContent));

    const db = await getDb();
    if (!db) return null;

    // Pull every other answer to the same question, scoped to the same
    // tenant via the attempt join. Excludes the candidate's own
    // attempts so multiple drafts don't self-flag.
    const rows = await db
      .select({
        id: assessmentAttemptAnswers.id,
        attemptId: assessmentAttemptAnswers.attemptId,
        answerText: assessmentAttemptAnswers.answerText,
        answerCode: assessmentAttemptAnswers.answerCode,
        candidateId: assessmentAttempts.candidateId,
      })
      .from(assessmentAttemptAnswers)
      .innerJoin(assessmentAttempts, eq(assessmentAttemptAnswers.attemptId, assessmentAttempts.id))
      .where(
        and(
          eq(assessmentAttemptAnswers.questionId, answer.questionId),
          ne(assessmentAttemptAnswers.id, answerId),
          attempt.tenantId === null
            ? isNull(assessmentAttempts.tenantId)
            : eq(assessmentAttempts.tenantId, attempt.tenantId),
          ne(assessmentAttempts.candidateId, attempt.candidateId),
        ),
      );

    let best: { score: number; otherAnswerId: number; otherAttemptId: number } | null = null;
    for (const other of rows) {
      const otherContent = answerContent(other);
      if (otherContent.trim().length === 0) continue;
      const score = jaccard(myShingles, shingles(tokenize(otherContent)));
      if (!best || score > best.score) {
        best = { score, otherAnswerId: other.id, otherAttemptId: other.attemptId };
      }
    }

    if (!best || best.score <= FLAG_THRESHOLD) return null;

    const reportId = await plagRepo.insert({
      attemptId: answer.attemptId,
      answerId,
      method: "token_shingle",
      similarityScore: best.score.toFixed(4),
      matchedSource: `answer:${best.otherAnswerId}`,
      details: {
        k: SHINGLE_K,
        confidence: best.score >= HIGH_CONFIDENCE ? "high" : "flag",
        otherAttemptId: best.otherAttemptId,
        otherAnswerId: best.otherAnswerId,
      },
    });

    return {
      id: reportId,
      attemptId: answer.attemptId,
      answerId,
      method: "token_shingle",
      similarityScore: best.score,
      matchedSource: `answer:${best.otherAnswerId}`,
      details: {
        k: SHINGLE_K,
        confidence: best.score >= HIGH_CONFIDENCE ? "high" : "flag",
        otherAttemptId: best.otherAttemptId,
        otherAnswerId: best.otherAnswerId,
      },
      createdAt: new Date().toISOString(),
    };
  }

  async listForAttempt(attemptId: number): Promise<PlagiarismReportDTO[]> {
    const rows = await plagRepo.listForAttempt(attemptId);
    return rows.map((r: any) => ({
      id: r.id,
      attemptId: r.attemptId,
      answerId: r.answerId,
      method: r.method,
      similarityScore: r.similarityScore ? parseFloat(r.similarityScore) : 0,
      matchedSource: r.matchedSource,
      details: (r.details as any) ?? null,
      createdAt: r.createdAt,
    }));
  }
}

export const plagiarismService = new PlagiarismService();
