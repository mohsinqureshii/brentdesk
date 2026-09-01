/**
 * Retention Policy Service
 * ----------------------------------------------------------------------
 * Per-tenant retention windows for candidates / applications /
 * assessment attempts / interviews. When a subject has been inactive
 * past the window, an erasure request is automatically opened (which
 * runs through the normal grace period before hard delete).
 *
 * Default policy (when a tenant hasn't configured one): 730 days
 * (24 months) after_last_activity for candidates, 365 days for
 * applications, 180 days for assessment attempts.
 *
 * The cron driver iterates active tenants, reads each tenant's policy
 * rows, evaluates due subjects, and enqueues erasures via the erasure
 * service. Keep it gentle: cap to a few hundred per tick so a backlog
 * doesn't hammer the DB.
 */

import { getDb } from "../../../db";
import {
  retentionPolicies,
  candidates,
  jobApplications,
  assessmentAttempts,
  tenants,
} from "../../../../drizzle/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { submit as submitErasure } from "./erasure.service";

interface PolicyRow {
  subjectType: "candidate" | "application" | "assessment_attempt" | "interview";
  retentionDays: number;
  appliesWhen: "after_last_activity" | "after_status_terminal" | "after_creation";
}

const DEFAULT_POLICIES: PolicyRow[] = [
  { subjectType: "candidate", retentionDays: 730, appliesWhen: "after_last_activity" },
  { subjectType: "application", retentionDays: 365, appliesWhen: "after_status_terminal" },
  { subjectType: "assessment_attempt", retentionDays: 180, appliesWhen: "after_status_terminal" },
];

async function getPoliciesForTenant(tenantId: number): Promise<PolicyRow[]> {
  const db = await getDb();
  if (!db) return DEFAULT_POLICIES;
  const rows = await db
    .select()
    .from(retentionPolicies)
    .where(and(eq(retentionPolicies.tenantId, tenantId), eq(retentionPolicies.isActive, 1)));
  if (rows.length === 0) return DEFAULT_POLICIES;
  return rows.map((r: any) => ({
    subjectType: r.subjectType,
    retentionDays: r.retentionDays,
    appliesWhen: r.appliesWhen,
  }));
}

async function findDueCandidates(tenantId: number, days: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.tenantId, tenantId),
        eq(candidates.isArchived, 0),
        lte(sql`COALESCE(${candidates.lastActiveAt}, ${candidates.updatedAt})`, cutoff),
      ),
    )
    .limit(limit);
}

/**
 * Cron entrypoint. Returns the count of erasures opened.
 */
export async function processRetention(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const activeTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.status, "active"));

  let openedCount = 0;

  for (const t of activeTenants) {
    const policies = await getPoliciesForTenant(t.id);
    const candidatePolicy = policies.find((p) => p.subjectType === "candidate");
    if (!candidatePolicy) continue;

    const due = await findDueCandidates(t.id, candidatePolicy.retentionDays, 100);
    for (const c of due) {
      try {
        await submitErasure({
          candidateId: c.id,
          tenantId: t.id,
          requestedByUserId: 0, // system-initiated
          legalBasis: "tenant_request",
          graceDays: 30,
        });
        openedCount++;
      } catch (err) {
        console.error(`[Retention] failed to open erasure for candidate ${c.id}:`, err);
      }
    }

    // Application + assessment retention extends the same shape but
    // applies different filters; left as a follow-up so the first
    // production pass doesn't risk over-deleting hiring-history data.
    // PHASE_8_FOLLOWUP: implement application/assessment retention
  }

  return openedCount;
}
