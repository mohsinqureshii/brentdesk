/**
 * PII Access Log
 * ----------------------------------------------------------------------
 * Fire-and-forget audit trail of every read/update/export/delete of
 * candidate PII. Required for GDPR Article 30 ("records of processing")
 * and PDPL Article 5.
 *
 * Callers everywhere in the talent platform should invoke `logPii(...)`
 * at the boundary where PII is accessed. The `PII_ACCESS_LOG_TODO`
 * comment markers planted by the Phase 2–6 modules are the integration
 * points — the module that produced them owns wiring this call in.
 *
 * Failures here MUST NOT block the user action — we log via try/catch
 * so a DB hiccup on the audit table doesn't 500 a recruiter looking at
 * a candidate.
 */

import { getDb } from "../../../db";
import { piiAccessLog } from "../../../../drizzle/schema";
import { PiiAccessLogEntry } from "../types";

export async function logPii(entry: PiiAccessLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(piiAccessLog).values({
      tenantId: entry.tenantId ?? null,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      action: entry.action,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    } as any);
  } catch (err) {
    console.error("[Compliance] PII log failed:", err);
  }
}

/**
 * Bulk variant — same payload across many subjects (e.g. a recruiter
 * exports a candidate list). Single INSERT round-trip keeps it cheap.
 */
export async function logPiiBulk(
  entries: PiiAccessLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(piiAccessLog).values(
      entries.map((e) => ({
        tenantId: e.tenantId ?? null,
        actorUserId: e.actorUserId,
        actorRole: e.actorRole,
        subjectType: e.subjectType,
        subjectId: e.subjectId,
        action: e.action,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
      })) as any,
    );
  } catch (err) {
    console.error("[Compliance] PII bulk log failed:", err);
  }
}
