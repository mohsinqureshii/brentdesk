/**
 * Reports Service
 * ----------------------------------------------------------------------
 * Read-only analytics aggregations for the recruiter reports dashboard.
 * Pulls counts and conversion metrics across applications, interviews,
 * offers, and stage history — all tenant-scoped.
 *
 * Range buckets:
 *   - '7d'  → daily series
 *   - '30d' → daily series
 *   - '90d' → weekly series
 *   - '1y'  → weekly series
 *
 * The service is deliberately query-heavy here (rather than in the
 * router) so individual aggregations can be reused by other consumers
 * (CSV export, scheduled email digests) without re-wiring tRPC.
 */

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  jobApplications,
  jobs,
  interviews,
  offers,
  candidateStageHistory,
  pipelineStages,
} from "../../../../drizzle/schema";
import { ForbiddenError, RequesterContext, TenantScope } from "../types";
import { assertTenantSupported } from "../tenant.guard";

const RECRUITER_PLUS = new Set(["admin", "recruiter", "hiring_manager", "owner"]);

function gateRecruiter(requester: RequesterContext) {
  if (!RECRUITER_PLUS.has(requester.role)) {
    throw new ForbiddenError("Recruiter role required");
  }
}

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ------------------------------------------------------------
// Range parsing
// ------------------------------------------------------------

export type ReportRange = "7d" | "30d" | "90d" | "1y";

export interface RangeWindow {
  start: Date;
  end: Date;
  /** Start of the prior window of equal length (for delta comparison). */
  priorStart: Date;
  /** End of the prior window — equal to `start`. */
  priorEnd: Date;
  /** Bucket size for time-series — 'day' or 'week'. */
  bucket: "day" | "week";
}

export function resolveRange(range: ReportRange, now: Date = new Date()): RangeWindow {
  const end = new Date(now);
  const start = new Date(now);
  let bucket: "day" | "week" = "day";

  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 7);
      bucket = "day";
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      bucket = "day";
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      bucket = "week";
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      bucket = "week";
      break;
  }

  const span = end.getTime() - start.getTime();
  const priorEnd = new Date(start);
  const priorStart = new Date(start.getTime() - span);

  return { start, end, priorStart, priorEnd, bucket };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) {
    if (curr === 0) return 0;
    return null; // no baseline to compare against
  }
  const raw = ((curr - prev) / prev) * 100;
  return Math.round(raw * 10) / 10;
}

function tenantFilter<T extends { tenantId: any }>(table: T, scope: TenantScope) {
  // ATS rows always have a tenantId (NOT NULL in schema). For NULL scope
  // we have no rows to report on.
  if (scope === null) return sql`1=0`;
  return eq(table.tenantId, scope);
}

// jobApplications.tenantId IS nullable — match legacy null scope when needed.
function appsTenantFilter(scope: TenantScope) {
  if (scope === null) {
    return sql`${jobApplications.tenantId} IS NULL`;
  }
  return eq(jobApplications.tenantId, scope);
}

function jobsTenantFilter(scope: TenantScope) {
  if (scope === null) {
    return sql`${jobs.tenantId} IS NULL`;
  }
  return eq(jobs.tenantId, scope);
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------

export interface ReportSummaryDTO {
  range: ReportRange;
  window: { start: string; end: string };
  applicationsCount: number;
  applicationsCountPrior: number;
  applicationsChangePct: number | null;
  applicationsByStatus: Array<{ status: string; count: number }>;
  applicationsSeries: Array<{ bucket: string; count: number }>;
  interviewsScheduled: number;
  interviewsCompleted: number;
  interviewsScheduledPrior: number;
  offersExtended: number;
  offersAccepted: number;
  offersDeclined: number;
  offersExtendedPrior: number;
  offerAcceptRatePct: number | null;
  hiresCount: number;
  hiresCountPrior: number;
  avgTimeToHireDays: number | null;
  avgTimeToHireDaysPrior: number | null;
  pipelineFunnel: Array<{
    stageId: number;
    stageName: string;
    position: number;
    candidates: number;
    conversionToNextPct: number | null;
  }>;
  topJobs: Array<{
    jobId: number;
    title: string;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
  }>;
}

// ------------------------------------------------------------
// Service
// ------------------------------------------------------------

export class ReportsService {
  async summary(
    scope: TenantScope,
    range: ReportRange,
    requester: RequesterContext,
  ): Promise<ReportSummaryDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    const window = resolveRange(range);
    const d = await db();
    const startIso = window.start.toISOString().slice(0, 19).replace("T", " ");
    const endIso = window.end.toISOString().slice(0, 19).replace("T", " ");
    const priorStartIso = window.priorStart
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const priorEndIso = window.priorEnd
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // --------------------------------------------------------
    // Applications: count + by status + series + prior window
    // --------------------------------------------------------
    const appsRows = await d
      .select({
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
      })
      .from(jobApplications)
      .where(
        and(
          appsTenantFilter(scope),
          gte(jobApplications.createdAt, startIso),
          lt(jobApplications.createdAt, endIso),
        ),
      );

    const applicationsCount = appsRows.length;
    const byStatusMap = new Map<string, number>();
    for (const r of appsRows) {
      const s = r.status ?? "new";
      byStatusMap.set(s, (byStatusMap.get(s) ?? 0) + 1);
    }
    const applicationsByStatus = Array.from(byStatusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Time-series — bucket the in-memory rows by day or week.
    const seriesMap = new Map<string, number>();
    for (const r of appsRows) {
      const key = bucketKey(new Date(r.createdAt as string), window.bucket);
      seriesMap.set(key, (seriesMap.get(key) ?? 0) + 1);
    }
    const applicationsSeries = fillSeries(window, seriesMap);

    const priorAppsRows = await d
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(
        and(
          appsTenantFilter(scope),
          gte(jobApplications.createdAt, priorStartIso),
          lt(jobApplications.createdAt, priorEndIso),
        ),
      );
    const applicationsCountPrior = priorAppsRows.length;

    // --------------------------------------------------------
    // Interviews
    // --------------------------------------------------------
    let interviewsScheduled = 0;
    let interviewsCompleted = 0;
    let interviewsScheduledPrior = 0;
    if (scope !== null) {
      const ivRows = await d
        .select({ status: interviews.status })
        .from(interviews)
        .where(
          and(
            tenantFilter(interviews, scope),
            gte(interviews.createdAt, startIso),
            lt(interviews.createdAt, endIso),
          ),
        );
      interviewsScheduled = ivRows.length;
      interviewsCompleted = ivRows.filter((r) => r.status === "completed").length;

      const priorIv = await d
        .select({ id: interviews.id })
        .from(interviews)
        .where(
          and(
            tenantFilter(interviews, scope),
            gte(interviews.createdAt, priorStartIso),
            lt(interviews.createdAt, priorEndIso),
          ),
        );
      interviewsScheduledPrior = priorIv.length;
    }

    // --------------------------------------------------------
    // Offers
    // --------------------------------------------------------
    let offersExtended = 0;
    let offersAccepted = 0;
    let offersDeclined = 0;
    let offersExtendedPrior = 0;
    if (scope !== null) {
      const offerRows = await d
        .select({ status: offers.status })
        .from(offers)
        .where(
          and(
            tenantFilter(offers, scope),
            gte(offers.createdAt, startIso),
            lt(offers.createdAt, endIso),
          ),
        );
      offersExtended = offerRows.length;
      offersAccepted = offerRows.filter((r) => r.status === "accepted").length;
      offersDeclined = offerRows.filter((r) => r.status === "declined").length;

      const priorOffer = await d
        .select({ id: offers.id })
        .from(offers)
        .where(
          and(
            tenantFilter(offers, scope),
            gte(offers.createdAt, priorStartIso),
            lt(offers.createdAt, priorEndIso),
          ),
        );
      offersExtendedPrior = priorOffer.length;
    }

    const offerAcceptRatePct =
      offersExtended === 0
        ? null
        : Math.round((offersAccepted / offersExtended) * 1000) / 10;

    // --------------------------------------------------------
    // Hires + time-to-hire
    // --------------------------------------------------------
    const hireRows = await d
      .select({
        id: jobApplications.id,
        createdAt: jobApplications.createdAt,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(
        and(
          appsTenantFilter(scope),
          eq(jobApplications.status, "hired"),
          gte(jobApplications.updatedAt, startIso),
          lt(jobApplications.updatedAt, endIso),
        ),
      );

    const hiresCount = hireRows.length;
    const avgTimeToHireDays = avgDays(hireRows);

    const priorHires = await d
      .select({
        id: jobApplications.id,
        createdAt: jobApplications.createdAt,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(
        and(
          appsTenantFilter(scope),
          eq(jobApplications.status, "hired"),
          gte(jobApplications.updatedAt, priorStartIso),
          lt(jobApplications.updatedAt, priorEndIso),
        ),
      );
    const hiresCountPrior = priorHires.length;
    const avgTimeToHireDaysPrior = avgDays(priorHires);

    // --------------------------------------------------------
    // Pipeline funnel — count of candidates per stage from
    // candidate_stage_history (last-touched in window).
    // --------------------------------------------------------
    let pipelineFunnel: ReportSummaryDTO["pipelineFunnel"] = [];
    if (scope !== null) {
      const stageRows = await d
        .select({
          id: pipelineStages.id,
          name: pipelineStages.name,
          position: pipelineStages.position,
        })
        .from(pipelineStages)
        .where(
          and(eq(pipelineStages.tenantId, scope), sql`${pipelineStages.jobId} IS NULL`),
        );

      const stagesSorted = stageRows
        .map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
        }))
        .sort((a, b) => a.position - b.position);

      const historyRows = await d
        .select({
          applicationId: candidateStageHistory.applicationId,
          toStageId: candidateStageHistory.toStageId,
        })
        .from(candidateStageHistory)
        .where(
          and(
            eq(candidateStageHistory.tenantId, scope),
            gte(candidateStageHistory.createdAt, startIso),
            lt(candidateStageHistory.createdAt, endIso),
          ),
        );

      const stageCounts = new Map<number, Set<number>>();
      for (const row of historyRows) {
        const key = row.toStageId;
        if (!stageCounts.has(key)) stageCounts.set(key, new Set());
        stageCounts.get(key)!.add(row.applicationId);
      }

      pipelineFunnel = stagesSorted.map((stage, idx) => {
        const candidates = stageCounts.get(stage.id)?.size ?? 0;
        const next = stagesSorted[idx + 1];
        const nextCount = next ? stageCounts.get(next.id)?.size ?? 0 : 0;
        const conversionToNextPct =
          next && candidates > 0
            ? Math.round((nextCount / candidates) * 1000) / 10
            : null;
        return {
          stageId: stage.id,
          stageName: stage.name,
          position: stage.position,
          candidates,
          conversionToNextPct,
        };
      });
    }

    // --------------------------------------------------------
    // Top jobs — most applications in window
    // --------------------------------------------------------
    const jobAggRows = await d
      .select({
        jobId: jobApplications.jobId,
        status: jobApplications.status,
      })
      .from(jobApplications)
      .where(
        and(
          appsTenantFilter(scope),
          gte(jobApplications.createdAt, startIso),
          lt(jobApplications.createdAt, endIso),
        ),
      );

    const perJob = new Map<
      number,
      { applications: number; interviews: number; offers: number; hires: number }
    >();
    for (const r of jobAggRows) {
      const j = perJob.get(r.jobId) ?? {
        applications: 0,
        interviews: 0,
        offers: 0,
        hires: 0,
      };
      j.applications += 1;
      if (r.status === "interview") j.interviews += 1;
      if (r.status === "offered") j.offers += 1;
      if (r.status === "hired") j.hires += 1;
      perJob.set(r.jobId, j);
    }

    const topJobIds = Array.from(perJob.entries())
      .sort((a, b) => b[1].applications - a[1].applications)
      .slice(0, 10)
      .map(([id]) => id);

    let topJobs: ReportSummaryDTO["topJobs"] = [];
    if (topJobIds.length > 0) {
      const jobRows = await d
        .select({ id: jobs.id, title: jobs.title })
        .from(jobs)
        .where(and(jobsTenantFilter(scope), sql`${jobs.id} IN (${sql.join(topJobIds, sql`, `)})`));
      const titleMap = new Map<number, string>();
      for (const j of jobRows) titleMap.set(j.id, j.title);

      topJobs = topJobIds.map((id) => {
        const agg = perJob.get(id)!;
        return {
          jobId: id,
          title: titleMap.get(id) ?? `Job #${id}`,
          applications: agg.applications,
          interviews: agg.interviews,
          offers: agg.offers,
          hires: agg.hires,
        };
      });
    }

    return {
      range,
      window: { start: window.start.toISOString(), end: window.end.toISOString() },
      applicationsCount,
      applicationsCountPrior,
      applicationsChangePct: pctChange(applicationsCount, applicationsCountPrior),
      applicationsByStatus,
      applicationsSeries,
      interviewsScheduled,
      interviewsCompleted,
      interviewsScheduledPrior,
      offersExtended,
      offersAccepted,
      offersDeclined,
      offersExtendedPrior,
      offerAcceptRatePct,
      hiresCount,
      hiresCountPrior,
      avgTimeToHireDays,
      avgTimeToHireDaysPrior,
      pipelineFunnel,
      topJobs,
    };
  }
}

// ------------------------------------------------------------
// Series bucketing helpers
// ------------------------------------------------------------

function bucketKey(date: Date, bucket: "day" | "week"): string {
  if (bucket === "day") {
    return date.toISOString().slice(0, 10);
  }
  // Week — Monday of the ISO week, returned as YYYY-MM-DD.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function fillSeries(
  window: RangeWindow,
  counts: Map<string, number>,
): Array<{ bucket: string; count: number }> {
  const out: Array<{ bucket: string; count: number }> = [];
  const cursor = new Date(window.start);
  cursor.setUTCHours(0, 0, 0, 0);
  if (window.bucket === "week") {
    // Snap cursor to the Monday of its week.
    const day = cursor.getUTCDay() || 7;
    if (day !== 1) cursor.setUTCDate(cursor.getUTCDate() - (day - 1));
  }
  const stepDays = window.bucket === "day" ? 1 : 7;
  while (cursor <= window.end) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ bucket: key, count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + stepDays);
  }
  return out;
}

function avgDays(rows: Array<{ createdAt: any; updatedAt: any }>): number | null {
  if (rows.length === 0) return null;
  let total = 0;
  let n = 0;
  for (const r of rows) {
    const start = new Date(r.createdAt as string).getTime();
    const end = new Date(r.updatedAt as string).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      total += (end - start) / (1000 * 60 * 60 * 24);
      n += 1;
    }
  }
  if (n === 0) return null;
  return Math.round((total / n) * 10) / 10;
}

export const reportsService = new ReportsService();
