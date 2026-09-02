/**
 * Candidates Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for the `candidates` table and the
 * `candidate_tenant_visibility` join table. No business logic, no
 * consent rules, no resume parsing, no tenant scope checks — those
 * belong in the service layer.
 *
 * Conventions:
 *   - Methods take whatever shape is convenient for the caller and
 *     return raw rows / inserted ids / counts. Callers map to DTOs.
 *   - All queries that filter by tenant accept a `TenantScope` and use
 *     `scopeFilter()` — `null` → `IS NULL`, concrete → `= scope`.
 *   - Writes encode the tenantId on the row; the service layer calls
 *     `assertTenantScope` after reads to confirm.
 */

import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { toDbDate } from "../../../_core/dbValues";
import {
  candidates,
  candidateTenantVisibility,
} from "../../../../drizzle/schema";
import type {
  TenantScope,
  CandidateListFilters,
  CandidateVisibilitySource,
} from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

/**
 * Build a tenant scope filter for the `candidates` table.
 *   - `null` scope → only legacy / global rows (tenantId IS NULL)
 *   - concrete scope → only that tenant's rows
 */
function scopeFilter(scope: TenantScope) {
  return scope === null ? isNull(candidates.tenantId) : eq(candidates.tenantId, scope);
}

// ------------------------------------------------------------
// CRUD on the `candidates` row
// ------------------------------------------------------------

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * The user → candidate lookup ignoring tenant scope. Used for cross-
 * tenant idempotency checks (a user can have one candidate row per
 * tenant). Returns ALL of a user's candidate rows.
 */
export async function findByUserId(userId: number, _scope?: TenantScope) {
  const d = await db();
  return d.select().from(candidates).where(eq(candidates.userId, userId));
}

/**
 * The scoped lookup: one candidate row per (tenantId, userId). Returns
 * the row if it exists in this tenant, null otherwise.
 */
export async function findByTenantUser(userId: number, scope: TenantScope) {
  const d = await db();
  const rows = await d
    .select()
    .from(candidates)
    .where(and(scopeFilter(scope), eq(candidates.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(candidates).values(values as any);
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(candidates).set(values as any).where(eq(candidates.id, id));
}

export async function deleteById(id: number): Promise<void> {
  const d = await db();
  await d.delete(candidates).where(eq(candidates.id, id));
}

export async function archive(id: number): Promise<void> {
  const d = await db();
  await d.update(candidates).set({ isArchived: 1 } as any).where(eq(candidates.id, id));
}

export async function unarchive(id: number): Promise<void> {
  const d = await db();
  await d.update(candidates).set({ isArchived: 0 } as any).where(eq(candidates.id, id));
}

/**
 * Records the resume media id + parsed JSON on the candidate row.
 * Called by the service after a successful resume parse.
 */
export async function setResumeMedia(
  id: number,
  mediaId: number,
  parsedJson: unknown,
): Promise<void> {
  const d = await db();
  await d
    .update(candidates)
    .set({
      resumeMediaId: mediaId,
      parsedResumeJson: parsedJson as any,
      parsedResumeAt: toDbDate(new Date()),
    } as any)
    .where(eq(candidates.id, id));
}

export async function countActive(tenantId: number): Promise<number> {
  const d = await db();
  const rows = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(candidates)
    .where(and(eq(candidates.tenantId, tenantId), eq(candidates.isArchived, 0)));
  return Number(rows[0]?.count || 0);
}

// ------------------------------------------------------------
// candidate_tenant_visibility — fan-out so the same global candidate
// can be visible to multiple tenants (referral, application flow, etc.)
// ------------------------------------------------------------

export async function addVisibility(
  candidateId: number,
  tenantId: number,
  source: CandidateVisibilitySource = "signup",
): Promise<void> {
  const d = await db();
  // Idempotent: dupe key on (candidate_id, tenant_id) is fine to swallow.
  try {
    await d
      .insert(candidateTenantVisibility)
      .values({ candidateId, tenantId, source } as any);
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") return;
    throw err;
  }
}

/**
 * Tenant-scoped list of candidates visible to a given tenant. This
 * joins through `candidate_tenant_visibility` so global candidates
 * surfaced into the tenant via referral/application also appear, not
 * just the tenant's own signups.
 */
export async function listVisibleTo(
  tenantId: number,
  opts: CandidateListFilters,
) {
  const d = await db();
  const conditions: any[] = [eq(candidateTenantVisibility.tenantId, tenantId)];

  if (opts.isArchived !== undefined) {
    conditions.push(eq(candidates.isArchived, opts.isArchived ? 1 : 0));
  } else {
    // Default: hide archived in tenant lists.
    conditions.push(eq(candidates.isArchived, 0));
  }
  if (opts.search) {
    const t = `%${opts.search}%`;
    conditions.push(
      sql`(LOWER(${candidates.headline}) LIKE LOWER(${t}) OR LOWER(${candidates.currentTitle}) LIKE LOWER(${t}) OR LOWER(${candidates.summary}) LIKE LOWER(${t}))`,
    );
  }
  if (opts.location) {
    conditions.push(sql`LOWER(${candidates.location}) LIKE LOWER(${`%${opts.location}%`})`);
  }
  if (opts.openToRemote !== undefined) {
    conditions.push(eq(candidates.openToRemote, opts.openToRemote ? 1 : 0));
  }
  if (opts.yearsExperienceMin !== undefined) {
    conditions.push(gte(candidates.yearsExperience, opts.yearsExperienceMin));
  }
  if (opts.yearsExperienceMax !== undefined) {
    conditions.push(lte(candidates.yearsExperience, opts.yearsExperienceMax));
  }
  if (opts.salaryMin !== undefined) {
    conditions.push(gte(candidates.salaryExpectationMax, opts.salaryMin as any));
  }
  if (opts.salaryMax !== undefined) {
    conditions.push(lte(candidates.salaryExpectationMin, opts.salaryMax as any));
  }
  if (opts.skills && opts.skills.length > 0) {
    // Skills live inside `parsedResumeJson.skills` (JSON array). MySQL
    // JSON_CONTAINS works on each candidate skill; OR them together.
    const skillConds = opts.skills.map(
      (s) =>
        sql`JSON_CONTAINS(LOWER(${candidates.parsedResumeJson}->'$.skills'), JSON_QUOTE(LOWER(${s})))`,
    );
    conditions.push(sql`(${sql.join(skillConds, sql` OR `)})`);
  }

  const sortBy = opts.sortBy || "createdAt";
  const sortOrder = opts.sortOrder || "desc";
  const sortFn = sortOrder === "asc" ? asc : desc;
  const sortColumn =
    ({
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      lastActiveAt: candidates.lastActiveAt,
      yearsExperience: candidates.yearsExperience,
    } as any)[sortBy] || candidates.createdAt;

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [items, [countRow]] = await Promise.all([
    d
      .select({
        id: candidates.id,
        tenantId: candidates.tenantId,
        userId: candidates.userId,
        headline: candidates.headline,
        currentTitle: candidates.currentTitle,
        currentCompany: candidates.currentCompany,
        yearsExperience: candidates.yearsExperience,
        location: candidates.location,
        countryId: candidates.countryId,
        cityId: candidates.cityId,
        openToRemote: candidates.openToRemote,
        openToRelocation: candidates.openToRelocation,
        salaryExpectationMin: candidates.salaryExpectationMin,
        salaryExpectationMax: candidates.salaryExpectationMax,
        salaryExpectationCurrency: candidates.salaryExpectationCurrency,
        visaStatus: candidates.visaStatus,
        noticePeriod: candidates.noticePeriod,
        githubHandle: candidates.githubHandle,
        linkedinUrl: candidates.linkedinUrl,
        portfolioUrl: candidates.portfolioUrl,
        resumeMediaId: candidates.resumeMediaId,
        parsedResumeJson: candidates.parsedResumeJson,
        parsedResumeAt: candidates.parsedResumeAt,
        summary: candidates.summary,
        consentDataProcessingAt: candidates.consentDataProcessingAt,
        consentMarketingAt: candidates.consentMarketingAt,
        consentThirdPartyAt: candidates.consentThirdPartyAt,
        isArchived: candidates.isArchived,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        lastActiveAt: candidates.lastActiveAt,
      })
      .from(candidateTenantVisibility)
      .innerJoin(candidates, eq(candidateTenantVisibility.candidateId, candidates.id))
      .where(where)
      .orderBy(sortFn(sortColumn))
      .limit(opts.limit)
      .offset(offset),
    d
      .select({ count: sql<number>`COUNT(*)` })
      .from(candidateTenantVisibility)
      .innerJoin(candidates, eq(candidateTenantVisibility.candidateId, candidates.id))
      .where(where),
  ]);

  return { items, total: Number(countRow?.count || 0) };
}

/**
 * Tenant-owned listing — only rows where `candidates.tenantId = scope`.
 * Use this when you want the strict "owned by this tenant" view (vs.
 * `listVisibleTo` which also includes referrals/applications).
 */
export async function listForTenant(scope: TenantScope, opts: CandidateListFilters) {
  const d = await db();
  const conditions: any[] = [scopeFilter(scope)];

  if (opts.isArchived !== undefined) {
    conditions.push(eq(candidates.isArchived, opts.isArchived ? 1 : 0));
  } else {
    conditions.push(eq(candidates.isArchived, 0));
  }
  if (opts.search) {
    const t = `%${opts.search}%`;
    conditions.push(
      sql`(LOWER(${candidates.headline}) LIKE LOWER(${t}) OR LOWER(${candidates.currentTitle}) LIKE LOWER(${t}) OR LOWER(${candidates.summary}) LIKE LOWER(${t}))`,
    );
  }
  if (opts.location) {
    conditions.push(sql`LOWER(${candidates.location}) LIKE LOWER(${`%${opts.location}%`})`);
  }
  if (opts.openToRemote !== undefined) {
    conditions.push(eq(candidates.openToRemote, opts.openToRemote ? 1 : 0));
  }
  if (opts.yearsExperienceMin !== undefined) {
    conditions.push(gte(candidates.yearsExperience, opts.yearsExperienceMin));
  }
  if (opts.yearsExperienceMax !== undefined) {
    conditions.push(lte(candidates.yearsExperience, opts.yearsExperienceMax));
  }
  if (opts.salaryMin !== undefined) {
    conditions.push(gte(candidates.salaryExpectationMax, opts.salaryMin as any));
  }
  if (opts.salaryMax !== undefined) {
    conditions.push(lte(candidates.salaryExpectationMin, opts.salaryMax as any));
  }
  if (opts.skills && opts.skills.length > 0) {
    const skillConds = opts.skills.map(
      (s) =>
        sql`JSON_CONTAINS(LOWER(${candidates.parsedResumeJson}->'$.skills'), JSON_QUOTE(LOWER(${s})))`,
    );
    conditions.push(sql`(${sql.join(skillConds, sql` OR `)})`);
  }

  const sortBy = opts.sortBy || "createdAt";
  const sortOrder = opts.sortOrder || "desc";
  const sortFn = sortOrder === "asc" ? asc : desc;
  const sortColumn =
    ({
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      lastActiveAt: candidates.lastActiveAt,
      yearsExperience: candidates.yearsExperience,
    } as any)[sortBy] || candidates.createdAt;

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [items, [countRow]] = await Promise.all([
    d
      .select()
      .from(candidates)
      .where(where)
      .orderBy(sortFn(sortColumn))
      .limit(opts.limit)
      .offset(offset),
    d.select({ count: sql<number>`COUNT(*)` }).from(candidates).where(where),
  ]);

  return { items, total: Number(countRow?.count || 0) };
}

export async function findByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const d = await db();
  return d.select().from(candidates).where(inArray(candidates.id, ids));
}
