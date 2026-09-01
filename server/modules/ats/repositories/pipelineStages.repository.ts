/**
 * Pipeline Stages Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `pipeline_stages`. No business logic, no
 * tenant scope checks beyond filter composition — those belong in the
 * service layer.
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { pipelineStages } from "../../../../drizzle/schema";
import type { TenantScope } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function scopeFilter(scope: TenantScope) {
  return scope === null
    ? isNull(pipelineStages.tenantId)
    : eq(pipelineStages.tenantId, scope);
}

/**
 * Self-heal hook for the null-scope (legacy public board) seeding
 * flow. Migration 0046 makes `pipeline_stages.tenant_id` nullable,
 * but in environments where the migration hasn't run yet (code merged,
 * `drizzle-kit migrate` skipped), the seed would fail with a constraint
 * violation. This helper checks the current column state and runs the
 * one-line ALTER inline if needed.
 *
 * Idempotent. Safe to call on every seed attempt. No-op when the
 * column is already nullable.
 *
 * Why inline here vs. blocking on migration: the seed is a one-click
 * admin action that should Just Work. Surfacing a "run migration 0046
 * first" error to the UI is correct but unhelpful when the fix is one
 * MODIFY COLUMN away.
 */
export async function ensureTenantIdNullable(): Promise<{ altered: boolean }> {
  const d = await db();
  try {
    const rows: any = await d.execute(sql`
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pipeline_stages'
        AND COLUMN_NAME = 'tenant_id'
    `);
    // mysql2 returns [rows, fields]; drizzle exposes either shape.
    const data = Array.isArray(rows) ? rows[0] : (rows.rows ?? rows);
    const first = Array.isArray(data) ? data[0] : data;
    const isNullable = first?.IS_NULLABLE ?? first?.is_nullable;

    if (isNullable === "YES") return { altered: false };

    await d.execute(sql`ALTER TABLE pipeline_stages MODIFY COLUMN tenant_id int NULL`);
    return { altered: true };
  } catch (err) {
    // If pipeline_stages doesn't exist at all, we want a clearer error
    // than the raw MySQL one — the user should know migrations 0044/0045
    // haven't run yet.
    const msg = (err as Error).message ?? "";
    if (msg.includes("doesn't exist") || msg.includes("Unknown table")) {
      throw new Error(
        "pipeline_stages table missing. Run `npx drizzle-kit migrate` " +
          "on the production database before seeding.",
      );
    }
    throw err;
  }
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * List stages for a tenant. If `jobId` is provided, returns the
 * per-job override stages; otherwise returns tenant-default stages
 * (jobId IS NULL).
 */
export async function listForTenant(scope: TenantScope, jobId?: number | null) {
  const d = await db();
  const conditions: any[] = [scopeFilter(scope)];
  if (jobId === undefined || jobId === null) {
    conditions.push(isNull(pipelineStages.jobId));
  } else {
    conditions.push(eq(pipelineStages.jobId, jobId));
  }
  return d
    .select()
    .from(pipelineStages)
    .where(and(...conditions))
    .orderBy(asc(pipelineStages.position));
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(pipelineStages).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(pipelineStages).set(values as any).where(eq(pipelineStages.id, id));
}

export async function deleteById(id: number): Promise<void> {
  const d = await db();
  await d.delete(pipelineStages).where(eq(pipelineStages.id, id));
}

/**
 * Apply a new position to many stages in one round-trip per row.
 * Caller is responsible for tenant + ownership checks first.
 */
export async function reorder(stageIdToPosition: Map<number, number>): Promise<void> {
  if (stageIdToPosition.size === 0) return;
  const d = await db();
  for (const [id, position] of Array.from(stageIdToPosition.entries())) {
    await d.update(pipelineStages).set({ position } as any).where(eq(pipelineStages.id, id));
  }
}

/**
 * Seed the default 7-stage pipeline for a tenant (or a specific job).
 * No-op if any stages already exist for the same (tenant, job) slot —
 * the service layer guards that to avoid duplicate seeds.
 */
export async function seedDefaultStages(
  scope: TenantScope,
  jobId: number | null = null,
): Promise<void> {
  // Both null scope (legacy public board) and concrete tenants get
  // the same 7-stage default after migration 0046 made tenant_id
  // nullable on pipeline_stages.
  const d = await db();
  const defaults = [
    { name: "Sourced",   slug: "sourced",   position: 1, category: "sourcing"     as const, isTerminal: 0, color: "#94a3b8" },
    { name: "Screening", slug: "screening", position: 2, category: "screening"    as const, isTerminal: 0, color: "#60a5fa" },
    { name: "Phone",     slug: "phone",     position: 3, category: "interviewing" as const, isTerminal: 0, color: "#818cf8" },
    { name: "Onsite",    slug: "onsite",    position: 4, category: "interviewing" as const, isTerminal: 0, color: "#a78bfa" },
    { name: "Offer",     slug: "offer",     position: 5, category: "offer"        as const, isTerminal: 0, color: "#facc15" },
    { name: "Hired",     slug: "hired",     position: 6, category: "hired"        as const, isTerminal: 1, color: "#22c55e" },
    { name: "Rejected",  slug: "rejected",  position: 7, category: "rejected"     as const, isTerminal: 1, color: "#ef4444" },
  ];
  for (const s of defaults) {
    await d.insert(pipelineStages).values({
      tenantId: scope,
      jobId,
      name: s.name,
      slug: s.slug,
      position: s.position,
      color: s.color,
      category: s.category,
      isTerminal: s.isTerminal,
      isDefault: 1,
    } as any);
  }
}

export async function countForScope(scope: TenantScope, jobId: number | null = null): Promise<number> {
  const d = await db();
  const conditions: any[] = [scopeFilter(scope)];
  if (jobId === null) {
    conditions.push(isNull(pipelineStages.jobId));
  } else {
    conditions.push(eq(pipelineStages.jobId, jobId));
  }
  const [row] = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(pipelineStages)
    .where(and(...conditions));
  return Number(row?.count || 0);
}
