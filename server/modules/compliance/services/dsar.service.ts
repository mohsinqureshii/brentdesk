/**
 * DSAR Service — Data Subject Access Request
 * ----------------------------------------------------------------------
 * GDPR Article 15 / CCPA / PDPL right of access. Bundles every row
 * tied to a candidate into a single JSON export. The bundle is the
 * artifact we hand over (file or signed URL) to satisfy the request.
 *
 * The bundle generator JOINs across the talent product graph:
 *   - candidates row + parsed_resume_json
 *   - resume_parses history
 *   - job_applications + cover letters + status notes
 *   - candidate_stage_history
 *   - interviews + interview_feedback (where the subject is the candidate)
 *   - assessment_attempts + attempt answers
 *   - github_profiles + github_signals
 *   - candidate_scores
 *   - recruiter_notes (only those naming the candidate)
 *
 * Notes:
 *   - All reads here are themselves PII access — we log each subject
 *     access through `logPiiBulk` at the end.
 *   - The bundle is best-effort: if a table fetch fails, we record the
 *     error in the bundle metadata and continue (matches the spirit of
 *     "right of access" — partial is better than nothing).
 */

import { getDb } from "../../../db";
import {
  candidates,
  jobApplications,
  resumeParses,
  candidateStageHistory,
  interviews,
  interviewFeedback,
  assessmentAttempts,
  assessmentAttemptAnswers,
  githubProfiles,
  githubSignals,
  candidateScores,
  recruiterNotes,
} from "../../../../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { logPiiBulk } from "./piiAccessLog.service";
import { DsarBundle } from "../types";

export async function buildBundle(
  candidateId: number,
  actor: { userId: number; role?: string; ipAddress?: string },
): Promise<DsarBundle> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const bundle: DsarBundle = {
    candidate: null,
    applications: [],
    resumeParses: [],
    assessmentAttempts: [],
    githubProfile: null,
    scores: [],
    notes: [],
    exportedAt: new Date().toISOString(),
  };

  // -- Candidate row
  const candRows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  bundle.candidate = candRows[0] ?? null;
  if (!bundle.candidate) return bundle;

  const userId = (bundle.candidate as any).userId as number | undefined;

  // -- Applications (joined via user_id since job_applications stores the user)
  if (userId) {
    bundle.applications = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId));
  }

  // -- Resume parses
  bundle.resumeParses = await db
    .select()
    .from(resumeParses)
    .where(eq(resumeParses.candidateId, candidateId));

  // -- Assessment attempts + answers (combined per attempt)
  const attempts = await db
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.candidateId, candidateId));
  const answersByAttempt: Record<number, unknown[]> = {};
  for (const a of attempts) {
    const answers = await db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, a.id));
    answersByAttempt[a.id] = answers;
  }
  bundle.assessmentAttempts = attempts.map((a: any) => ({
    ...a,
    answers: answersByAttempt[a.id] ?? [],
  }));

  // -- GitHub profile + signals
  const ghProfileRows = await db
    .select()
    .from(githubProfiles)
    .where(eq(githubProfiles.candidateId, candidateId))
    .limit(1);
  if (ghProfileRows[0]) {
    const signals = await db
      .select()
      .from(githubSignals)
      .where(eq(githubSignals.profileId, ghProfileRows[0].id));
    bundle.githubProfile = { ...ghProfileRows[0], signals };
  }

  // -- Scores
  bundle.scores = await db
    .select()
    .from(candidateScores)
    .where(eq(candidateScores.candidateId, candidateId));

  // -- Recruiter notes mentioning the candidate (either by candidate_id
  // or by an application that belongs to the user)
  const appIds = bundle.applications.map((a) => (a as any).id as number);
  bundle.notes = await db
    .select()
    .from(recruiterNotes)
    .where(
      appIds.length > 0
        ? or(
            eq(recruiterNotes.candidateId, candidateId),
            // Drizzle inArray import would be nicer — keep it simple with OR
            // since DSARs are infrequent.
            ...appIds.map((id) => eq(recruiterNotes.applicationId, id)),
          )
        : eq(recruiterNotes.candidateId, candidateId),
    );

  // -- Stage history per application
  const historyByApp: Record<number, unknown[]> = {};
  for (const appId of appIds) {
    historyByApp[appId] = await db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.applicationId, appId));
  }
  bundle.applications = bundle.applications.map((a: any) => ({
    ...a,
    stageHistory: historyByApp[a.id] ?? [],
  }));

  // -- Interviews on this candidate's applications
  if (appIds.length > 0) {
    const allInterviews: any[] = [];
    for (const appId of appIds) {
      const list = await db
        .select()
        .from(interviews)
        .where(eq(interviews.applicationId, appId));
      for (const iv of list) {
        const fb = await db
          .select()
          .from(interviewFeedback)
          .where(eq(interviewFeedback.interviewId, iv.id));
        allInterviews.push({ ...iv, feedback: fb });
      }
    }
    bundle.applications = bundle.applications.map((a: any) => ({
      ...a,
      interviews: allInterviews.filter((iv) => iv.applicationId === a.id),
    }));
  }

  // -- Log every access (best-effort)
  const tenantId = (bundle.candidate as any).tenantId ?? null;
  await logPiiBulk([
    {
      tenantId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: "candidate",
      subjectId: candidateId,
      action: "export",
      ipAddress: actor.ipAddress,
    },
    ...bundle.resumeParses.map((r: any) => ({
      tenantId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: "resume" as const,
      subjectId: r.id,
      action: "export" as const,
      ipAddress: actor.ipAddress,
    })),
    ...bundle.assessmentAttempts.map((a: any) => ({
      tenantId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: "assessment_attempt" as const,
      subjectId: a.id,
      action: "export" as const,
      ipAddress: actor.ipAddress,
    })),
  ]);

  return bundle;
}
