/**
 * Assessment Attempts Service (read-only aggregation)
 * ----------------------------------------------------------------------
 * Cross-module aggregation surface for the scoring/matching pipeline.
 * Wraps the attempts repository with the small helpers the matching
 * module needs (latest scored attempts for a candidate).
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentAttempts } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export class AssessmentAttemptsService {
  /**
   * Most recent scored attempts for a candidate. Only `graded` or
   * `submitted` attempts that have a non-null totalScore count. Returns
   * a plain `number[]` so callers can average / weight as they wish.
   */
  async recentScoresForCandidate(candidateId: number, limit = 3): Promise<number[]> {
    const d = await db();
    const rows = await d
      .select({ totalScore: assessmentAttempts.totalScore })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.candidateId, candidateId),
          inArray(assessmentAttempts.status, ["graded", "submitted"]),
          sql`${assessmentAttempts.totalScore} IS NOT NULL`,
        ),
      )
      .orderBy(desc(assessmentAttempts.createdAt))
      .limit(limit);
    return rows
      .map((r) => (r.totalScore == null ? null : Number(r.totalScore)))
      .filter((v): v is number => v !== null && !Number.isNaN(v));
  }
}

export const assessmentAttemptsService = new AssessmentAttemptsService();
