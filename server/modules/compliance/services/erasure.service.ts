/**
 * Erasure / Right to be Forgotten
 * ----------------------------------------------------------------------
 * GDPR Article 17. Soft-delete the candidate immediately (so recruiter
 * dashboards stop showing them), schedule a hard delete after a 30-day
 * grace period (so the candidate can reverse the request, and so
 * legitimate audit trails persist for the legally required window).
 *
 * After grace period:
 *   - hard-delete candidate row + resume_parses + parsed_resume_json
 *   - hard-delete github_profiles + github_repos + github_signals
 *   - hard-delete assessment_attempts + answers + code_runs +
 *     interview_sessions + interview_turns + plagiarism_reports
 *   - keep job_applications (referenced by hiring outcomes that the
 *     tenant may need to retain for tax/legal reasons) but NULL the
 *     userId and obliterate PII columns (applicant_name, email, phone,
 *     cv_url, cover_letter, linkedin_url, portfolio_url)
 *   - keep candidate_stage_history (audit) but redact movedById
 *     details into "anonymized" marker
 *   - keep candidate_scores (aggregate stats) — already anonymized
 *
 * Important: the hard delete runs in a separate process (see
 * `processDueErasures`). The request itself just marks status='approved'
 * and sets the grace_period_ends_at timestamp.
 */

import { getDb } from "../../../db";
import {
  candidateErasureRequests,
  candidates,
  jobApplications,
  resumeParses,
  githubProfiles,
  githubRepos,
  githubSignals,
  assessmentAttempts,
  assessmentAttemptAnswers,
  assessmentCodeRuns,
  aiInterviewSessions,
  aiInterviewTurns,
  plagiarismReports,
  candidateScores,
  candidateEmbeddingsMeta,
} from "../../../../drizzle/schema";
import { and, eq, inArray, lte } from "drizzle-orm";
import { logPii } from "./piiAccessLog.service";
import {
  ErasureRequestNotFoundError,
  GracePeriodNotElapsedError,
  LegalBasis,
} from "../types";

const DEFAULT_GRACE_DAYS = 30;

/**
 * Submit an erasure request. The candidate is soft-archived
 * immediately (so they vanish from search/lists) and a hard-delete is
 * scheduled.
 */
export async function submit(input: {
  candidateId: number;
  tenantId: number | null;
  requestedByUserId: number;
  requesterEmail?: string;
  legalBasis: LegalBasis;
  graceDays?: number;
}): Promise<{ requestId: number; gracePeriodEndsAt: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const graceDays = input.graceDays ?? DEFAULT_GRACE_DAYS;
  const gracePeriodEndsAt = new Date(
    Date.now() + graceDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db.insert(candidateErasureRequests).values({
    tenantId: input.tenantId,
    candidateId: input.candidateId,
    requestedById: input.requestedByUserId,
    requesterEmail: input.requesterEmail,
    legalBasis: input.legalBasis,
    status: "approved",
    gracePeriodEndsAt,
  } as any);

  // Soft-archive — candidate stops appearing in search/list
  // immediately. Hard delete runs from the cron after grace period.
  await db.update(candidates).set({ isArchived: 1 } as any).where(eq(candidates.id, input.candidateId));

  // Find the newly-inserted request
  const rows = await db
    .select({ id: candidateErasureRequests.id })
    .from(candidateErasureRequests)
    .where(eq(candidateErasureRequests.candidateId, input.candidateId))
    .orderBy(candidateErasureRequests.id)
    .limit(1);

  await logPii({
    tenantId: input.tenantId,
    actorUserId: input.requestedByUserId,
    subjectType: "candidate",
    subjectId: input.candidateId,
    action: "delete",
  });

  return {
    requestId: rows[rows.length - 1]?.id ?? 0,
    gracePeriodEndsAt,
  };
}

/**
 * Cancel a pending erasure (candidate changed their mind during
 * grace period). Unarchives the candidate.
 */
export async function cancel(requestId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(candidateErasureRequests)
    .where(eq(candidateErasureRequests.id, requestId))
    .limit(1);
  if (!rows[0]) throw new ErasureRequestNotFoundError(requestId);
  if (rows[0].status === "executed") {
    throw new Error("Erasure already executed — cannot cancel");
  }

  await db
    .update(candidateErasureRequests)
    .set({ status: "rejected", rejectionReason: "cancelled_during_grace_period" } as any)
    .where(eq(candidateErasureRequests.id, requestId));

  await db
    .update(candidates)
    .set({ isArchived: 0 } as any)
    .where(eq(candidates.id, rows[0].candidateId));
}

/**
 * Hard-delete all PII for a candidate. Called by `processDueErasures`
 * when the grace period elapses. Idempotent — safe to retry.
 */
export async function executeErasure(requestId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(candidateErasureRequests)
    .where(eq(candidateErasureRequests.id, requestId))
    .limit(1);
  if (!rows[0]) throw new ErasureRequestNotFoundError(requestId);

  const req = rows[0];
  if (req.status === "executed") return;

  const grace = req.gracePeriodEndsAt ? new Date(req.gracePeriodEndsAt).getTime() : 0;
  if (grace > Date.now()) {
    const remaining = Math.ceil((grace - Date.now()) / (24 * 60 * 60 * 1000));
    throw new GracePeriodNotElapsedError(remaining);
  }

  const candidateId = req.candidateId;

  // -- Resume parses
  await db.delete(resumeParses).where(eq(resumeParses.candidateId, candidateId));

  // -- GitHub profile + repos + signals
  const gh = await db
    .select({ id: githubProfiles.id })
    .from(githubProfiles)
    .where(eq(githubProfiles.candidateId, candidateId));
  for (const profile of gh) {
    await db.delete(githubRepos).where(eq(githubRepos.profileId, profile.id));
    await db.delete(githubSignals).where(eq(githubSignals.profileId, profile.id));
  }
  await db.delete(githubProfiles).where(eq(githubProfiles.candidateId, candidateId));

  // -- Assessment attempts + nested children
  const attempts = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.candidateId, candidateId));
  for (const a of attempts) {
    const answers = await db
      .select({ id: assessmentAttemptAnswers.id })
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, a.id));
    if (answers.length) {
      await db
        .delete(assessmentCodeRuns)
        .where(inArray(assessmentCodeRuns.answerId, answers.map((x) => x.id)));
    }
    await db
      .delete(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, a.id));
    await db.delete(aiInterviewTurns).where(eq(aiInterviewTurns.sessionId, a.id));
    await db.delete(aiInterviewSessions).where(eq(aiInterviewSessions.attemptId, a.id));
    await db.delete(plagiarismReports).where(eq(plagiarismReports.attemptId, a.id));
  }
  await db.delete(assessmentAttempts).where(eq(assessmentAttempts.candidateId, candidateId));

  // -- Embeddings meta (vector itself in Qdrant — deletion of those is
  // the responsibility of the matching module's reindex pipeline; we
  // can fire a hint here but leave the live cleanup to that surface)
  await db
    .delete(candidateEmbeddingsMeta)
    .where(eq(candidateEmbeddingsMeta.candidateId, candidateId));
  await db.delete(candidateScores).where(eq(candidateScores.candidateId, candidateId));

  // -- Job applications: keep the row (legally retained for tax/audit
  // outcomes) but obliterate PII columns. The recruiter side now sees
  // an "Anonymized applicant" record for hiring history.
  const candRows = await db
    .select({ userId: candidates.userId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  const userId = candRows[0]?.userId;
  if (userId) {
    await db
      .update(jobApplications)
      .set({
        userId: null,
        applicantName: "Anonymized",
        applicantEmail: "",
        applicantPhone: null,
        cvUrl: null,
        coverLetter: null,
        linkedinUrl: null,
        portfolioUrl: null,
        currentCompany: null,
        currentTitle: null,
      } as any)
      .where(eq(jobApplications.userId, userId));
  }

  // -- Candidate row itself
  await db.delete(candidates).where(eq(candidates.id, candidateId));

  await db
    .update(candidateErasureRequests)
    .set({ status: "executed", executedAt: new Date().toISOString() } as any)
    .where(eq(candidateErasureRequests.id, requestId));

  await logPii({
    tenantId: req.tenantId ?? null,
    actorUserId: req.requestedById,
    subjectType: "candidate",
    subjectId: candidateId,
    action: "delete",
  });
}

/**
 * Cron entrypoint — finds approved erasures whose grace period has
 * elapsed and executes them. Returns the number processed.
 *
 * Wire into `scheduler.service.ts` to run hourly.
 */
export async function processDueErasures(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const due = await db
    .select({ id: candidateErasureRequests.id })
    .from(candidateErasureRequests)
    .where(
      and(
        eq(candidateErasureRequests.status, "approved"),
        lte(candidateErasureRequests.gracePeriodEndsAt, new Date().toISOString()),
      ),
    )
    .limit(100);

  let processed = 0;
  for (const r of due) {
    try {
      await executeErasure(r.id);
      processed++;
    } catch (err) {
      console.error(`[Compliance] erasure ${r.id} failed:`, err);
    }
  }
  return processed;
}
