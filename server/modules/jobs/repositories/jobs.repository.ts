/**
 * Jobs Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for the `jobs` table and its taxonomy join tables
 * (`jobCategories`, `jobRegions`, `jobSectors`). No business logic, no
 * slug generation, no workflow transitions, no tenant scope checks —
 * those belong in the service layer.
 *
 * Conventions:
 *   - Methods take whatever shape is convenient for the caller and
 *     return raw rows / inserted ids / counts. Callers map to DTOs.
 *   - All queries that filter by tenant accept `tenantId: number | null`
 *     parameters. Until migration 0044 lands the column, the tenantId
 *     argument is accepted but not yet applied (the column doesn't
 *     exist) — search the codebase for `PHASE_1_TODO_TENANT_FILTER` to
 *     find the places to flip when the migration deploys.
 *
 * If you need to add a new query, prefer building it here over inlining
 * Drizzle calls in a service or router. That's the boundary that makes
 * this module microservice-extractable.
 */

import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  jobs,
  jobCategories,
  jobRegions,
  jobSectors,
  workflowStatuses,
  countries,
  cities,
  regions,
  companies,
} from "../../../../drizzle/schema";
import { editionOrderBias } from "../../../services/editionOrder";
import type { TenantScope } from "../types";
import { toDbDate } from "../../../_core/dbValues";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

/**
 * Build a tenant scope filter for the `jobs` table.
 *   - `null` scope → only legacy public rows (tenantId IS NULL)
 *   - concrete scope → only that tenant's rows
 *
 * Used everywhere reads or counts run. Writes encode the tenantId on
 * the row, which is enforced via `assertTenantScope` after reads.
 */
function scopeFilter(scope: TenantScope) {
  return scope === null ? isNull(jobs.tenantId) : eq(jobs.tenantId, scope);
}

// ------------------------------------------------------------
// CRUD on the `jobs` row
// ------------------------------------------------------------

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findBySlug(slug: string) {
  const d = await db();
  const rows = await d.select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/**
 * The slug detail query used by the public job page — joins city,
 * country, region, company so the page can render the JobPosting
 * structured data with proper PostalAddress and a fallback companyLogo.
 */
export async function findBySlugWithLocationJoins(slug: string) {
  const d = await db();
  const rows = await d
    .select({
      id: jobs.id,
      title: jobs.title,
      slug: jobs.slug,
      description: jobs.description,
      requirements: jobs.requirements,
      benefits: jobs.benefits,
      companyId: jobs.companyId,
      companyName: jobs.companyName,
      companyLogo: sql<string>`COALESCE(${jobs.companyLogo}, ${companies.logo})`.as("companyLogo"),
      companyWebsite: jobs.companyWebsite,
      location: jobs.location,
      countryId: jobs.countryId,
      cityId: jobs.cityId,
      cityName: sql<string | null>`${cities.name}`.as("cityName"),
      countryName: sql<string | null>`${countries.name}`.as("countryName"),
      countryIso2: sql<string | null>`${countries.iso2}`.as("countryIso2"),
      regionName: sql<string | null>`${regions.name}`.as("regionName"),
      isRemote: jobs.isRemote,
      remoteType: jobs.remoteType,
      roleType: jobs.roleType,
      seniority: jobs.seniority,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      salaryPeriod: jobs.salaryPeriod,
      applyUrl: jobs.applyUrl,
      applyEmail: jobs.applyEmail,
      expiresAt: jobs.expiresAt,
      skills: jobs.skills,
      department: jobs.department,
      statusId: jobs.statusId,
      viewCount: jobs.viewCount,
      publishedAt: jobs.publishedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      applicationCount: jobs.applicationCount,
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .leftJoin(cities, eq(jobs.cityId, cities.id))
    .leftJoin(countries, eq(jobs.countryId, countries.id))
    .leftJoin(regions, eq(jobs.geoRegionId, regions.id))
    .where(eq(jobs.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(jobs).values(values as any);
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(jobs).set(values as any).where(eq(jobs.id, id));
}

export async function setSlug(id: number, slug: string): Promise<void> {
  const d = await db();
  await d.update(jobs).set({ slug } as any).where(eq(jobs.id, id));
}

export async function deleteById(id: number): Promise<void> {
  const d = await db();
  await d.delete(jobs).where(eq(jobs.id, id));
}

export async function deleteByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  await d.delete(jobs).where(inArray(jobs.id, ids));
}

export async function bulkSetStatus(ids: number[], statusId: number): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  await d.update(jobs).set({ statusId } as any).where(inArray(jobs.id, ids));
}

export async function incrementViewCount(id: number, currentCount: number | null): Promise<void> {
  const d = await db();
  await d.update(jobs).set({ viewCount: (currentCount ?? 0) + 1 } as any).where(eq(jobs.id, id));
}

export async function incrementViewCountSql(id: number): Promise<void> {
  const d = await db();
  await d.update(jobs).set({ viewCount: sql`${jobs.viewCount} + 1` } as any).where(eq(jobs.id, id));
}

export async function incrementApplicationCount(id: number, currentCount: number | null): Promise<void> {
  const d = await db();
  await d.update(jobs).set({ applicationCount: (currentCount ?? 0) + 1 } as any).where(eq(jobs.id, id));
}

export async function incrementApplicationCountSql(id: number): Promise<void> {
  const d = await db();
  await d.update(jobs).set({ applicationCount: sql`${jobs.applicationCount} + 1` } as any).where(eq(jobs.id, id));
}

export async function getApplicationCount(id: number): Promise<number | null> {
  const d = await db();
  const rows = await d
    .select({ applicationCount: jobs.applicationCount })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);
  return rows[0]?.applicationCount ?? null;
}

export async function getViewCount(id: number): Promise<number | null> {
  const d = await db();
  const rows = await d.select({ viewCount: jobs.viewCount }).from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0]?.viewCount ?? null;
}

export async function getApplyUrl(id: number): Promise<string | null> {
  const d = await db();
  const rows = await d.select({ applyUrl: jobs.applyUrl }).from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0]?.applyUrl ?? null;
}

export async function getCompanyId(id: number): Promise<number | null> {
  const d = await db();
  const rows = await d.select({ companyId: jobs.companyId }).from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0]?.companyId ?? null;
}

export async function getCurrentPublishedAt(id: number): Promise<string | null> {
  const d = await db();
  const rows = await d.select({ publishedAt: jobs.publishedAt }).from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0]?.publishedAt ?? null;
}

export async function getSlugAndTitle(id: number): Promise<{ slug: string; title: string } | null> {
  const d = await db();
  const rows = await d.select({ slug: jobs.slug, title: jobs.title }).from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}

// ------------------------------------------------------------
// Taxonomy joins (jobCategories / jobRegions / jobSectors)
// ------------------------------------------------------------

export async function getCategoryIds(jobId: number): Promise<number[]> {
  const d = await db();
  const rows = await d
    .select({ categoryId: jobCategories.categoryId })
    .from(jobCategories)
    .where(eq(jobCategories.jobId, jobId));
  return rows.map((r) => r.categoryId);
}

export async function getRegionIds(jobId: number): Promise<number[]> {
  const d = await db();
  const rows = await d
    .select({ regionId: jobRegions.regionId })
    .from(jobRegions)
    .where(eq(jobRegions.jobId, jobId));
  return rows.map((r) => r.regionId);
}

export async function getSectorIds(jobId: number): Promise<number[]> {
  const d = await db();
  const rows = await d
    .select({ sectorId: jobSectors.sectorId })
    .from(jobSectors)
    .where(eq(jobSectors.jobId, jobId));
  return rows.map((r) => r.sectorId);
}

export async function getCategoriesWithNames(jobId: number) {
  const d = await db();
  // categories table imported via the dependency on the schema barrel
  const { categories } = await import("../../../../drizzle/schema");
  return d
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(jobCategories)
    .innerJoin(categories, eq(jobCategories.categoryId, categories.id))
    .where(eq(jobCategories.jobId, jobId));
}

export async function getRegionsWithNames(jobId: number) {
  const d = await db();
  return d
    .select({ id: regions.id, name: regions.name, slug: regions.slug })
    .from(jobRegions)
    .innerJoin(regions, eq(jobRegions.regionId, regions.id))
    .where(eq(jobRegions.jobId, jobId));
}

export async function getSectorsWithNames(jobId: number) {
  const d = await db();
  const { sectors } = await import("../../../../drizzle/schema");
  return d
    .select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
    .from(jobSectors)
    .innerJoin(sectors, eq(jobSectors.sectorId, sectors.id))
    .where(eq(jobSectors.jobId, jobId));
}

export async function setCategories(jobId: number, categoryIds: number[]): Promise<void> {
  const d = await db();
  await d.delete(jobCategories).where(eq(jobCategories.jobId, jobId));
  for (const categoryId of categoryIds) {
    await d.insert(jobCategories).values({ jobId, categoryId } as any);
  }
}

export async function setRegions(jobId: number, regionIds: number[]): Promise<void> {
  const d = await db();
  await d.delete(jobRegions).where(eq(jobRegions.jobId, jobId));
  for (const regionId of regionIds) {
    await d.insert(jobRegions).values({ jobId, regionId } as any);
  }
}

export async function setSectors(jobId: number, sectorIds: number[]): Promise<void> {
  const d = await db();
  await d.delete(jobSectors).where(eq(jobSectors.jobId, jobId));
  for (const sectorId of sectorIds) {
    await d.insert(jobSectors).values({ jobId, sectorId } as any);
  }
}

export async function deleteAllJoins(jobId: number): Promise<void> {
  const d = await db();
  await d.delete(jobCategories).where(eq(jobCategories.jobId, jobId));
  await d.delete(jobRegions).where(eq(jobRegions.jobId, jobId));
  await d.delete(jobSectors).where(eq(jobSectors.jobId, jobId));
}

export async function deleteAllJoinsForIds(jobIds: number[]): Promise<void> {
  if (jobIds.length === 0) return;
  for (const id of jobIds) {
    await deleteAllJoins(id);
  }
}

// ------------------------------------------------------------
// Listing / search queries
// ------------------------------------------------------------

export interface PublicListFilters {
  search?: string;
  status?: string;
  roleType?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  seniority?: "entry" | "mid" | "senior" | "lead" | "executive";
  isRemote?: boolean;
  location?: string;
  countryId?: number;
  cityId?: number;
  department?: string;
  companyId?: number;
  salaryMin?: number;
  salaryMax?: number;
  datePosted?: "past_24h" | "past_week" | "past_month" | "any";
  editionCountryId?: number;
  sortBy: "createdAt" | "publishedAt" | "title" | "salaryMax" | "companyName" | "status" | "viewCount";
  sortOrder: "asc" | "desc";
}

export async function listPublic(filters: PublicListFilters, scope: TenantScope = null) {
  const d = await db();

  // Show all jobs (regardless of status) as long as they haven't expired.
  // This matches the legacy behavior from jobs.router.ts list procedure.
  const conditions: any[] = [
    scopeFilter(scope),
    // isNull, NOT eq(col, null): `expires_at = NULL` is never true in
    // SQL, which silently hid every job without an expiry date.
    or(isNull(jobs.expiresAt), gte(jobs.expiresAt, toDbDate(new Date()))),
  ];

  if (filters.status) conditions.push(eq(jobs.statusId, filters.status as any));
  if (filters.search) {
    conditions.push(
      or(
        sql`LOWER(${jobs.title}) LIKE LOWER(${`%${filters.search}%`})`,
        sql`LOWER(${jobs.companyName}) LIKE LOWER(${`%${filters.search}%`})`,
      ) as any,
    );
  }
  if (filters.roleType) conditions.push(eq(jobs.roleType, filters.roleType));
  if (filters.seniority) conditions.push(eq(jobs.seniority, filters.seniority));
  if (filters.isRemote !== undefined) conditions.push(eq(jobs.isRemote, filters.isRemote ? 1 : 0));
  if (filters.location) {
    conditions.push(sql`LOWER(${jobs.location}) LIKE LOWER(${`%${filters.location}%`})`);
  }
  if (filters.countryId) conditions.push(eq(jobs.countryId, filters.countryId));
  if (filters.cityId) conditions.push(eq(jobs.cityId, filters.cityId));
  if (filters.department) {
    conditions.push(sql`LOWER(${jobs.department}) LIKE LOWER(${`%${filters.department}%`})`);
  }
  if (filters.companyId) conditions.push(eq(jobs.companyId, filters.companyId));
  if (filters.salaryMin) conditions.push(gte(jobs.salaryMax, filters.salaryMin as any));
  if (filters.salaryMax) conditions.push(lte(jobs.salaryMin, filters.salaryMax as any));
  if (filters.datePosted && filters.datePosted !== "any") {
    const now = new Date();
    let since: Date;
    switch (filters.datePosted) {
      case "past_24h":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "past_week":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "past_month":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(0);
    }
    conditions.push(gte(jobs.publishedAt, toDbDate(since)));
  }

  // Use COALESCE(publishedAt, createdAt) for date-based sorts so jobs
  // created directly as 'published' (with NULL publishedAt) still sort
  // correctly. This matches the legacy router behavior.
  const sortColumn =
    filters.sortBy === "publishedAt" || filters.sortBy === "createdAt"
      ? sql`COALESCE(${jobs.publishedAt}, ${jobs.createdAt})`
      : ({
          title: jobs.title,
          salaryMax: jobs.salaryMax,
          companyName: jobs.companyName,
          status: jobs.statusId,
          viewCount: jobs.viewCount,
        } as any)[filters.sortBy] || sql`COALESCE(${jobs.publishedAt}, ${jobs.createdAt})`;

  return d
    .select({
      id: jobs.id,
      title: jobs.title,
      slug: jobs.slug,
      companyName: jobs.companyName,
      companyLogo: sql`COALESCE(${jobs.companyLogo}, ${companies.logo})`.as("companyLogo"),
      companyWebsite: jobs.companyWebsite,
      location: jobs.location,
      isRemote: jobs.isRemote,
      remoteType: jobs.remoteType,
      roleType: jobs.roleType,
      seniority: jobs.seniority,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      salaryPeriod: jobs.salaryPeriod,
      publishedAt: jobs.publishedAt,
      createdAt: jobs.createdAt,
      expiresAt: jobs.expiresAt,
      description: jobs.description,
      requirements: jobs.requirements,
      benefits: jobs.benefits,
      skills: jobs.skills,
      applyUrl: jobs.applyUrl,
      applyEmail: jobs.applyEmail,
      department: jobs.department,
      viewCount: jobs.viewCount,
      applicationCount: jobs.applicationCount,
      companyId: jobs.companyId,
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(...conditions))
    .orderBy(
      ...editionOrderBias(jobs.countryId, filters.editionCountryId),
      filters.sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn),
    );
}

export interface AdminListFilters {
  search?: string;
  status?: string;
  employmentType?: string;
  roleType?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  seniority?: "entry" | "mid" | "senior" | "lead" | "executive";
  isRemote?: boolean;
  sortBy: "createdAt" | "publishedAt" | "title" | "salaryMax" | "companyName" | "status" | "viewCount";
  sortOrder: "asc" | "desc";
}

function buildAdminConditions(filters: AdminListFilters) {
  const conditions: any[] = [];
  if (filters.search) {
    const t = `%${filters.search}%`;
    conditions.push(
      sql`(LOWER(${jobs.title}) LIKE LOWER(${t}) OR LOWER(${jobs.companyName}) LIKE LOWER(${t}) OR LOWER(${jobs.location}) LIKE LOWER(${t}))`,
    );
  }
  if (filters.status) conditions.push(eq(jobs.statusId, parseInt(filters.status)));
  if (filters.employmentType) {
    conditions.push(eq(jobs.roleType, filters.employmentType as any));
  }
  if (filters.roleType) conditions.push(eq(jobs.roleType, filters.roleType));
  if (filters.seniority) conditions.push(eq(jobs.seniority, filters.seniority));
  if (filters.isRemote !== undefined) conditions.push(eq(jobs.isRemote, filters.isRemote as any));
  return conditions;
}

export async function listAdmin(
  filters: AdminListFilters,
  limit: number,
  offset: number,
  scope: TenantScope = null,
) {
  const d = await db();
  const conditions = [scopeFilter(scope), ...buildAdminConditions(filters)];
  const whereClause = and(...conditions);

  const sortFn = filters.sortOrder === "asc" ? asc : desc;
  const sortColumn =
    ({
      createdAt: jobs.createdAt,
      publishedAt: jobs.publishedAt,
      title: jobs.title,
      salaryMax: jobs.salaryMax,
      companyName: jobs.companyName,
      status: jobs.statusId,
      viewCount: jobs.viewCount,
    } as any)[filters.sortBy] || jobs.createdAt;

  const [items, [countRow]] = await Promise.all([
    d
      .select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        description: jobs.description,
        companyName: jobs.companyName,
        companyLogo: jobs.companyLogo,
        location: jobs.location,
        isRemote: jobs.isRemote,
        remoteType: jobs.remoteType,
        roleType: jobs.roleType,
        seniority: jobs.seniority,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        salaryPeriod: jobs.salaryPeriod,
        applyUrl: jobs.applyUrl,
        statusId: jobs.statusId,
        statusSlug: workflowStatuses.slug,
        statusName: workflowStatuses.name,
        statusColor: workflowStatuses.color,
        expiresAt: jobs.expiresAt,
        publishedAt: jobs.publishedAt,
        viewCount: jobs.viewCount,
        applicationCount: jobs.applicationCount,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        companyId: jobs.companyId,
        department: jobs.department,
        deadline: jobs.deadline,
      })
      .from(jobs)
      .leftJoin(workflowStatuses, eq(jobs.statusId, workflowStatuses.id))
      .where(whereClause)
      .orderBy(sortFn(sortColumn))
      .limit(limit)
      .offset(offset),
    d.select({ count: sql<number>`COUNT(*)` }).from(jobs).where(whereClause),
  ]);

  return { items, total: Number(countRow?.count || 0) };
}

export async function exportAll(
  filters: AdminListFilters,
  hardCap = 10000,
  scope: TenantScope = null,
) {
  const d = await db();
  const conditions = [scopeFilter(scope), ...buildAdminConditions(filters)];
  return d.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt)).limit(hardCap);
}

export async function listByCompanyId(
  companyId: number,
  limit: number,
  offset: number,
  scope: TenantScope = null,
) {
  const d = await db();
  const where = and(scopeFilter(scope), eq(jobs.companyId, companyId));
  const [items, [countRow]] = await Promise.all([
    d
      .select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        location: jobs.location,
        roleType: jobs.roleType,
        statusId: jobs.statusId,
        viewCount: jobs.viewCount,
        applicationCount: jobs.applicationCount,
        publishedAt: jobs.publishedAt,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(where)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset),
    d.select({ count: sql<number>`COUNT(*)` }).from(jobs).where(where),
  ]);
  return { items, total: Number(countRow?.count || 0) };
}

// ------------------------------------------------------------
// Suggestion helpers
// ------------------------------------------------------------

export async function distinctTitlesMatching(query: string, limit = 10): Promise<string[]> {
  const d = await db();
  const rows = await d
    .selectDistinct({ title: jobs.title })
    .from(jobs)
    .where(sql`LOWER(${jobs.title}) LIKE LOWER(${`%${query}%`})`)
    .orderBy(jobs.title)
    .limit(limit);
  return rows.map((r) => r.title);
}

export async function allSkillsSample(sampleSize = 5000): Promise<unknown[]> {
  const d = await db();
  return d.select({ skills: jobs.skills }).from(jobs).limit(sampleSize);
}

// ------------------------------------------------------------
// Dropdown helpers — countries / cities for location selectors
// ------------------------------------------------------------

export async function activeCountries() {
  const d = await db();
  return d
    .select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
    .from(countries)
    .where(eq(countries.isActive, 1))
    .orderBy(asc(countries.name));
}

export async function activeCitiesByCountry(countryId: number) {
  const d = await db();
  return d
    .select({ id: cities.id, name: cities.name })
    .from(cities)
    .where(and(eq(cities.countryId, countryId), eq(cities.isActive, 1)))
    .orderBy(asc(cities.name));
}

export async function cityName(cityId: number): Promise<string | null> {
  const d = await db();
  const rows = await d.select({ name: cities.name }).from(cities).where(eq(cities.id, cityId)).limit(1);
  return rows[0]?.name ?? null;
}
