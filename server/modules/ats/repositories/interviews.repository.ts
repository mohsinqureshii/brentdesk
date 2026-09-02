/**
 * Interviews Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `interviews`. No tenant checks, no
 * authorization — the service layer enforces those.
 */

import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { interviews } from "../../../../drizzle/schema";
import type { TenantScope } from "../types";
import { toDbDate } from "../../../_core/dbValues";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function scopeFilter(scope: TenantScope) {
  return scope === null ? isNull(interviews.tenantId) : eq(interviews.tenantId, scope);
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(interviews).where(eq(interviews.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listForApplication(applicationId: number) {
  const d = await db();
  return d
    .select()
    .from(interviews)
    .where(eq(interviews.applicationId, applicationId))
    .orderBy(desc(interviews.scheduledAt));
}

export async function listScheduledForTenant(
  scope: TenantScope,
  fromDate: Date,
  toDate: Date,
) {
  const d = await db();
  return d
    .select()
    .from(interviews)
    .where(
      and(
        scopeFilter(scope),
        gte(interviews.scheduledAt, toDbDate(fromDate)),
        lte(interviews.scheduledAt, toDbDate(toDate)),
      ),
    )
    .orderBy(asc(interviews.scheduledAt));
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(interviews).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(interviews).set(values as any).where(eq(interviews.id, id));
}

export async function cancel(id: number, _reason?: string): Promise<void> {
  const d = await db();
  // Reason intentionally not persisted (no column on `interviews`).
  // Phase 3+ may add a cancellation_reason column; for now the cancel
  // reason flows through recruiterNotes if the caller wants a paper trail.
  await d.update(interviews).set({ status: "cancelled" } as any).where(eq(interviews.id, id));
}
