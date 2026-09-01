/**
 * Job Applications Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `jobApplications` and `jobClicks` plus the
 * ownership-check joins (`claimedProfiles`, `entityTeamMembers`). No
 * business logic, no tenant scope checks, no role gating — services
 * handle those.
 */

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  jobApplications,
  jobClicks,
  jobs,
  claimedProfiles,
  entityTeamMembers,
} from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ------------------------------------------------------------
// jobApplications: CRUD
// ------------------------------------------------------------

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(jobApplications).where(eq(jobApplications.id, id));
  return rows[0] ?? null;
}

export async function findByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const d = await db();
  return d.select().from(jobApplications).where(inArray(jobApplications.id, ids));
}

export async function findByJobAndUser(
  jobId: number,
  userId: number,
  applicationMethod?: "internal" | "external",
) {
  const d = await db();
  const conditions: any[] = [
    eq(jobApplications.jobId, jobId),
    eq(jobApplications.userId, userId),
  ];
  if (applicationMethod) {
    conditions.push(eq(jobApplications.applicationMethod, applicationMethod));
  }
  const rows = await d.select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(...conditions));
  return rows[0] ?? null;
}

export async function findByJobAndUserDetailed(jobId: number, userId: number) {
  const d = await db();
  const rows = await d
    .select({
      id: jobApplications.id,
      status: jobApplications.status,
      applicationMethod: jobApplications.applicationMethod,
      createdAt: jobApplications.createdAt,
    })
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, userId)));
  return rows[0] ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(jobApplications).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(jobApplications).set(values as any).where(eq(jobApplications.id, id));
}

export async function bulkUpdate(ids: number[], values: Record<string, unknown>): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  await d.update(jobApplications).set(values as any).where(inArray(jobApplications.id, ids));
}

// ------------------------------------------------------------
// Applicant view: my applications
// ------------------------------------------------------------

export async function findByUser(
  userId: number,
  statusFilter: string,
  limit: number,
  offset: number,
) {
  const d = await db();
  const conditions: any[] = [eq(jobApplications.userId, userId)];
  if (statusFilter !== "all") {
    conditions.push(eq(jobApplications.status, statusFilter as any));
  }

  return d
    .select({
      id: jobApplications.id,
      jobId: jobApplications.jobId,
      status: jobApplications.status,
      applicationMethod: jobApplications.applicationMethod,
      createdAt: jobApplications.createdAt,
      jobTitle: jobs.title,
      jobSlug: jobs.slug,
      companyName: jobs.companyName,
      companyLogo: jobs.companyLogo,
      location: jobs.location,
    })
    .from(jobApplications)
    .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(jobApplications.createdAt))
    .limit(limit)
    .offset(offset);
}

// ------------------------------------------------------------
// Recruiter view: applications for a job
// ------------------------------------------------------------

export async function findByJob(
  jobId: number,
  statusFilter: string,
  limit: number,
  offset: number,
) {
  const d = await db();
  const conditions: any[] = [eq(jobApplications.jobId, jobId)];
  if (statusFilter !== "all") {
    conditions.push(eq(jobApplications.status, statusFilter as any));
  }

  const [items, [countRow]] = await Promise.all([
    d
      .select()
      .from(jobApplications)
      .where(and(...conditions))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit)
      .offset(offset),
    d
      .select({ total: sql<number>`COUNT(*)` })
      .from(jobApplications)
      .where(and(...conditions)),
  ]);

  return { items, total: Number(countRow?.total || 0) };
}

export async function findByJobAll(jobId: number, statusFilter: string) {
  const d = await db();
  const conditions: any[] = [eq(jobApplications.jobId, jobId)];
  if (statusFilter !== "all") {
    conditions.push(eq(jobApplications.status, statusFilter as any));
  }
  return d
    .select()
    .from(jobApplications)
    .where(and(...conditions))
    .orderBy(desc(jobApplications.createdAt));
}

export async function markViewed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  await d
    .update(jobApplications)
    .set({ isViewed: true, viewedAt: new Date() } as any)
    .where(inArray(jobApplications.id, ids));
}

export async function getStats(jobId: number) {
  const d = await db();
  const [stats] = await d
    .select({
      total: sql<number>`COUNT(*)`,
      newCount: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'new' THEN 1 ELSE 0 END)`,
      reviewed: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'reviewed' THEN 1 ELSE 0 END)`,
      shortlisted: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'shortlisted' THEN 1 ELSE 0 END)`,
      interview: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'interview' THEN 1 ELSE 0 END)`,
      offered: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'offered' THEN 1 ELSE 0 END)`,
      hired: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'hired' THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'rejected' THEN 1 ELSE 0 END)`,
      avgRating: sql<number>`AVG(CASE WHEN ${jobApplications.rating} IS NOT NULL THEN ${jobApplications.rating} END)`,
    })
    .from(jobApplications)
    .where(eq(jobApplications.jobId, jobId));
  return stats;
}

export async function getMethodAndStatusStats(jobId: number) {
  const d = await db();
  const [appStats] = await d
    .select({
      total: sql<number>`COUNT(*)`,
      internal: sql<number>`SUM(CASE WHEN ${jobApplications.applicationMethod} = 'internal' THEN 1 ELSE 0 END)`,
      external: sql<number>`SUM(CASE WHEN ${jobApplications.applicationMethod} = 'external' THEN 1 ELSE 0 END)`,
      newCount: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'new' THEN 1 ELSE 0 END)`,
      shortlisted: sql<number>`SUM(CASE WHEN ${jobApplications.status} = 'shortlisted' THEN 1 ELSE 0 END)`,
    })
    .from(jobApplications)
    .where(eq(jobApplications.jobId, jobId));
  return appStats;
}

// ------------------------------------------------------------
// jobClicks: tracking
// ------------------------------------------------------------

export async function insertClick(values: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(jobClicks).values(values as any);
}

export async function getClickStatsByType(jobId: number, since: Date) {
  const d = await db();
  return d
    .select({
      clickType: jobClicks.clickType,
      count: sql<number>`COUNT(*)`,
    })
    .from(jobClicks)
    .where(and(eq(jobClicks.jobId, jobId), gte(jobClicks.createdAt, since as any)))
    .groupBy(jobClicks.clickType);
}

export async function getInterestedUsers(jobId: number, since: Date, limit = 50) {
  const d = await db();
  return d
    .select({
      userId: jobClicks.userId,
      userName: jobClicks.userName,
      userAvatar: jobClicks.userAvatar,
      userTitle: jobClicks.userTitle,
      userCompany: jobClicks.userCompany,
      clickType: jobClicks.clickType,
      createdAt: jobClicks.createdAt,
    })
    .from(jobClicks)
    .where(
      and(
        eq(jobClicks.jobId, jobId),
        sql`${jobClicks.userId} IS NOT NULL`,
        gte(jobClicks.createdAt, since as any),
      ),
    )
    .orderBy(desc(jobClicks.createdAt))
    .limit(limit);
}

// ------------------------------------------------------------
// Ownership checks (claimedProfiles + entityTeamMembers)
// ------------------------------------------------------------

export async function isCompanyClaimedBy(userId: number, companyId: number): Promise<boolean> {
  const d = await db();
  const rows = await d
    .select({ id: claimedProfiles.id })
    .from(claimedProfiles)
    .where(
      and(
        eq(claimedProfiles.userId, userId),
        eq(claimedProfiles.entityType, "company"),
        eq(claimedProfiles.entityId, companyId),
        eq(claimedProfiles.status, "approved"),
      ),
    );
  return rows.length > 0;
}

export async function isCompanyTeamMember(userId: number, companyId: number): Promise<boolean> {
  const d = await db();
  const rows = await d
    .select({ id: entityTeamMembers.id })
    .from(entityTeamMembers)
    .where(
      and(
        eq(entityTeamMembers.userId, userId),
        eq(entityTeamMembers.entityType, "company"),
        eq(entityTeamMembers.entityId, companyId),
        eq(entityTeamMembers.status, "accepted"),
      ),
    );
  return rows.length > 0;
}
