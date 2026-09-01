/**
 * Job Analytics Service
 * ----------------------------------------------------------------------
 * Click tracking, view counters, application counters, and the
 * recruiter-side interest / applicant-stats aggregations.
 *
 * Why isolated: the write paths (insertClick + view-count bump) are
 * the natural seam to swap for event-based ingestion (BullMQ, Kafka)
 * later without touching the rest of the module. Keeping them in
 * their own service makes that swap mechanical.
 */

import * as jobsRepo from "../repositories/jobs.repository";
import * as appRepo from "../repositories/jobApplications.repository";
import { assertTenantSupported } from "../tenant.guard";
import {
  ClickActorContext,
  ClickType,
  ForbiddenError,
  RequesterContext,
  TenantScope,
} from "../types";

async function verifyCompanyOwnership(
  userId: number,
  jobId: number,
): Promise<{ ownsJob: boolean; companyId: number | null }> {
  const companyId = await jobsRepo.getCompanyId(jobId);
  if (!companyId) return { ownsJob: false, companyId: null };
  if (await appRepo.isCompanyClaimedBy(userId, companyId)) {
    return { ownsJob: true, companyId };
  }
  if (await appRepo.isCompanyTeamMember(userId, companyId)) {
    return { ownsJob: true, companyId };
  }
  return { ownsJob: false, companyId };
}

async function gateOwnerOrAdmin(jobId: number, requester: RequesterContext) {
  if (requester.role === "admin") return;
  const { ownsJob } = await verifyCompanyOwnership(requester.userId, jobId);
  if (!ownsJob) throw new ForbiddenError("Not authorized for this job");
}

export class JobAnalyticsService {
  /**
   * Public click tracking — view, apply_click, save, share,
   * external_apply. View clicks also bump the job's view counter
   * (used by the search ordering and the public detail page).
   */
  async recordClick(
    scope: TenantScope,
    jobId: number,
    clickType: ClickType,
    actor: ClickActorContext,
    referrer?: string,
  ) {
    assertTenantSupported(scope);

    await appRepo.insertClick({
      jobId,
      userId: actor.userId ?? null,
      userName: actor.name ?? null,
      userAvatar: actor.avatar ?? null,
      userTitle: actor.jobTitle ?? null,
      userCompany: actor.company ?? null,
      clickType,
      referrer,
    });

    if (clickType === "view") {
      await jobsRepo.incrementViewCountSql(jobId);
    }

    return { success: true as const };
  }

  /**
   * External apply — records a click, materializes an application row
   * (so the recruiter dashboard can still see applicants who left to
   * apply on the company's own site), and returns the apply URL so the
   * caller can do the redirect.
   */
  async recordExternalApply(
    scope: TenantScope,
    jobId: number,
    actor: ClickActorContext,
    referrer?: string,
  ) {
    assertTenantSupported(scope);

    await appRepo.insertClick({
      jobId,
      userId: actor.userId ?? null,
      userName: actor.name ?? null,
      userAvatar: actor.avatar ?? null,
      userTitle: actor.jobTitle ?? null,
      userCompany: actor.company ?? null,
      clickType: "external_apply",
      referrer,
    });

    if (actor.userId) {
      const existing = await appRepo.findByJobAndUser(jobId, actor.userId);
      if (!existing) {
        await appRepo.insert({
          tenantId: scope,
          jobId,
          userId: actor.userId,
          applicantName: actor.name || "Unknown",
          applicantEmail: "",
          applicationMethod: "external",
          status: "new",
        });
      }
    }

    const applyUrl = await jobsRepo.getApplyUrl(jobId);
    return { success: true as const, applyUrl };
  }

  /**
   * trackApplication procedure — bumps applicationCount for external
   * apply UI variants that didn't go through the full external-apply
   * flow above.
   */
  async bumpApplicationCount(scope: TenantScope, jobId: number) {
    assertTenantSupported(scope);
    const current = await jobsRepo.getApplicationCount(jobId);
    if (current === null) return { success: true as const };
    await jobsRepo.incrementApplicationCount(jobId, current);
    return { success: true as const };
  }

  /**
   * Recruiter dashboard widget — click stats by type + interested
   * users (deduped) + application stats. Authorized as company owner
   * or admin.
   */
  async getJobInterest(
    scope: TenantScope,
    jobId: number,
    days: number,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    await gateOwnerOrAdmin(jobId, requester);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [clickStatsRows, interestedRaw, appStats] = await Promise.all([
      appRepo.getClickStatsByType(jobId, since),
      appRepo.getInterestedUsers(jobId, since, 50),
      appRepo.getMethodAndStatusStats(jobId),
    ]);

    // Dedupe interested users by id, keeping the most recent interaction.
    const seen = new Map<number, (typeof interestedRaw)[number]>();
    for (const user of interestedRaw) {
      if (user.userId && !seen.has(user.userId)) seen.set(user.userId, user);
    }

    return {
      clickStats: Object.fromEntries(clickStatsRows.map((s: any) => [s.clickType, s.count])),
      interestedUsers: Array.from(seen.values()),
      applicationStats: {
        total: appStats?.total || 0,
        internal: appStats?.internal || 0,
        external: appStats?.external || 0,
        new: appStats?.newCount || 0,
        shortlisted: appStats?.shortlisted || 0,
      },
    };
  }

  /**
   * Recruiter dashboard summary — applicant counts by status, average
   * rating, plus the job header fields the dashboard renders.
   */
  async getApplicantStats(scope: TenantScope, jobId: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    await gateOwnerOrAdmin(jobId, requester);

    const stats = await appRepo.getStats(jobId);
    const job = await jobsRepo.findById(jobId);

    return {
      job: job
        ? {
            id: job.id,
            title: job.title,
            companyName: job.companyName,
            companyLogo: job.companyLogo,
            location: job.location,
            roleType: job.roleType,
            viewCount: job.viewCount,
            publishedAt: job.publishedAt,
          }
        : null,
      stats: {
        total: stats?.total || 0,
        new: stats?.newCount || 0,
        reviewed: stats?.reviewed || 0,
        shortlisted: stats?.shortlisted || 0,
        interview: stats?.interview || 0,
        offered: stats?.offered || 0,
        hired: stats?.hired || 0,
        rejected: stats?.rejected || 0,
        avgRating: stats?.avgRating ? Number(Number(stats.avgRating).toFixed(1)) : null,
      },
    };
  }
}

export const jobAnalyticsService = new JobAnalyticsService();

// Exposed so the applications service can reuse the same authorization
// logic without duplicating the claim/team-member lookup.
export { verifyCompanyOwnership };
