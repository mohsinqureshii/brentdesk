/**
 * Tenants Repository
 * Raw Drizzle queries for the tenants + tenant_memberships tables.
 */

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { tenants, tenantMemberships, tenantAuditLog } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findBySlug(slug: string) {
  const d = await db();
  const rows = await d.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function findByCustomDomain(domain: string) {
  const d = await db();
  const rows = await d.select().from(tenants).where(eq(tenants.customDomain, domain)).limit(1);
  return rows[0] ?? null;
}

export async function insertTenant(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(tenants).values(values as any);
}

export async function updateTenant(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(tenants).set(values as any).where(eq(tenants.id, id));
}

export async function listAll(opts: { search?: string; status?: string; page: number; limit: number }) {
  const d = await db();
  const conditions: any[] = [];
  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      or(
        like(tenants.name, term),
        like(tenants.slug, term),
        like(tenants.customDomain, term),
      ) as any,
    );
  }
  if (opts.status) conditions.push(eq(tenants.status, opts.status as any));
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (opts.page - 1) * opts.limit;

  const [items, [countRow]] = await Promise.all([
    d.select().from(tenants).where(whereClause).orderBy(desc(tenants.createdAt)).limit(opts.limit).offset(offset),
    d.select({ count: sql<number>`COUNT(*)` }).from(tenants).where(whereClause),
  ]);

  return { items, total: Number(countRow?.count || 0) };
}

// ------------------------------------------------------------
// Memberships
// ------------------------------------------------------------

export async function listMemberships(tenantId: number) {
  const d = await db();
  return d
    .select()
    .from(tenantMemberships)
    .where(eq(tenantMemberships.tenantId, tenantId))
    .orderBy(asc(tenantMemberships.createdAt));
}

export async function findMembership(tenantId: number, userId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(tenantMemberships)
    .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertMembership(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(tenantMemberships).values(values as any);
}

export async function updateMembership(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(tenantMemberships).set(values as any).where(eq(tenantMemberships.id, id));
}

export async function deleteMembership(id: number): Promise<void> {
  const d = await db();
  await d.delete(tenantMemberships).where(eq(tenantMemberships.id, id));
}

export async function listForUser(userId: number) {
  const d = await db();
  return d
    .select({
      membershipId: tenantMemberships.id,
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      joinedAt: tenantMemberships.joinedAt,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.status, "active")));
}

// ------------------------------------------------------------
// Audit log (tenant-scoped)
// ------------------------------------------------------------

export async function logAudit(values: {
  tenantId: number;
  userId?: number | null;
  action: string;
  resourceType?: string;
  resourceId?: number;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const d = await db();
  try {
    await d.insert(tenantAuditLog).values({
      tenantId: values.tenantId,
      userId: values.userId ?? null,
      action: values.action,
      resourceType: values.resourceType,
      resourceId: values.resourceId,
      changes: values.changes,
      ipAddress: values.ipAddress,
    } as any);
  } catch (err) {
    console.error("[TenantAudit] log failed:", err);
  }
}
