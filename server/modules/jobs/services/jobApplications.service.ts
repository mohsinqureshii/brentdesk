/**
 * Job Applications Service
 * ----------------------------------------------------------------------
 * Applicant flow (apply, withdraw, check, my-applications) +
 * recruiter flow (review, status updates, notes, ratings, bulk
 * actions, CSV export). All tenant-scoped via the guard stub until
 * Phase 1.
 *
 * Authorization model (single-tenant):
 *   - Applicant flow: must be the same user as the application.
 *   - Recruiter flow: company owner (claimedProfiles), team member
 *     (entityTeamMembers), or admin role.
 *
 * Phase 1 will reroute this through tenant-scoped RBAC: the company
 * ownership check becomes "is requester a recruiter on this tenant?"
 * and the company-claim lookup becomes a fallback for legacy public
 * jobs (tenantId IS NULL).
 */

import * as appRepo from "../repositories/jobApplications.repository";
import * as jobsRepo from "../repositories/jobs.repository";
import { jobsService } from "./jobs.service";
import { verifyCompanyOwnership } from "./jobAnalytics.service";
import { assertTenantSupported } from "../tenant.guard";
import { notifyNewApplication } from "../../../services/slackIntegration.service";
import {
  AlreadyAppliedError,
  ForbiddenError,
  JobApplicantContext,
  JobApplicationInput,
  JobApplicationNotFoundError,
  JobApplicationStatus,
  JobApplicationStatusFilter,
  JobNotFoundError,
  RequesterContext,
  TenantScope,
} from "../types";

async function gateOwnerOrAdmin(jobId: number, requester: RequesterContext) {
  if (requester.role === "admin") return;
  const { ownsJob } = await verifyCompanyOwnership(requester.userId, jobId);
  if (!ownsJob) throw new ForbiddenError("Not authorized for this job");
}

async function requireApplication(id: number) {
  const app = await appRepo.findById(id);
  if (!app) throw new JobApplicationNotFoundError(id);
  return app;
}

export class JobApplicationsService {
  // ----------------------------------------------------------------
  // Applicant flow
  // ----------------------------------------------------------------

  async applyInternal(
    scope: TenantScope,
    input: JobApplicationInput,
    applicant: JobApplicantContext,
  ) {
    assertTenantSupported(scope);

    const job = await jobsRepo.findById(input.jobId);
    if (!job) throw new JobNotFoundError(input.jobId);

    const existing = await appRepo.findByJobAndUser(input.jobId, applicant.userId, "internal");
    if (existing) throw new AlreadyAppliedError();

    const result = await appRepo.insert({
      tenantId: scope,
      jobId: input.jobId,
      userId: applicant.userId,
      applicantName: applicant.name || "Unknown",
      applicantEmail: applicant.email || "",
      cvUrl: input.cvUrl || applicant.cvUrl,
      coverLetter: input.coverLetter,
      linkedinUrl: input.linkedinUrl,
      portfolioUrl: input.portfolioUrl,
      currentCompany: input.currentCompany || applicant.company,
      currentTitle: input.currentTitle || applicant.jobTitle,
      yearsOfExperience: input.yearsOfExperience,
      expectedSalary: input.expectedSalary !== undefined ? String(input.expectedSalary) : undefined,
      expectedSalaryCurrency: input.expectedSalaryCurrency,
      noticePeriod: input.noticePeriod,
      applicationMethod: "internal",
      status: "new",
    });

    await jobsRepo.incrementApplicationCountSql(input.jobId);

    // Fire-and-forget Slack notification. Failures must not block the
    // application response. `notifyNewApplication` already no-ops when
    // Slack isn't configured.
    notifyNewApplication(scope, {
      jobTitle: (job as any).title || "Untitled job",
      jobUrl: `/admin/talent/jobs/${input.jobId}`,
      applicantName: applicant.name || "Unknown",
      applicantEmail: applicant.email || "",
    }).catch((err) => {
      console.error("[Slack][newApplication] notify failed:", err);
    });

    return { success: true as const, applicationId: result?.insertId };
  }

  async checkApplication(scope: TenantScope, jobId: number, userId: number) {
    assertTenantSupported(scope);
    const app = await appRepo.findByJobAndUserDetailed(jobId, userId);
    return { applied: !!app, application: app || null };
  }

  async listForUser(
    scope: TenantScope,
    userId: number,
    statusFilter: JobApplicationStatusFilter,
    page: number,
    limit: number,
  ) {
    assertTenantSupported(scope);
    const offset = (page - 1) * limit;
    return appRepo.findByUser(userId, statusFilter, limit, offset);
  }

  async withdraw(scope: TenantScope, applicationId: number, userId: number) {
    assertTenantSupported(scope);

    const app = await appRepo.findById(applicationId);
    if (!app) throw new JobApplicationNotFoundError(applicationId);
    if (app.userId !== userId) throw new ForbiddenError("Not your application");

    await appRepo.update(applicationId, { status: "withdrawn" });
    return { success: true as const };
  }

  // ----------------------------------------------------------------
  // Recruiter flow
  // ----------------------------------------------------------------

  async listForJob(
    scope: TenantScope,
    jobId: number,
    statusFilter: JobApplicationStatusFilter,
    page: number,
    limit: number,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    await gateOwnerOrAdmin(jobId, requester);

    const offset = (page - 1) * limit;
    const { items, total } = await appRepo.findByJob(jobId, statusFilter, limit, offset);

    // Mark unviewed apps as viewed — recruiter's first look at the
    // list is the "viewed" signal in the existing UI.
    const unviewedIds = items.filter((a: any) => !a.isViewed).map((a: any) => a.id);
    if (unviewedIds.length > 0) {
      await appRepo.markViewed(unviewedIds);
    }

    return {
      applications: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(
    scope: TenantScope,
    applicationId: number,
    status: Exclude<JobApplicationStatus, "new" | "withdrawn">,
    requester: RequesterContext,
    statusNote?: string,
    rating?: number,
  ) {
    assertTenantSupported(scope);

    const app = await requireApplication(applicationId);
    await gateOwnerOrAdmin(app.jobId, requester);

    const updateData: Record<string, unknown> = { status };
    if (statusNote) updateData.statusNote = statusNote;
    if (rating) updateData.rating = rating;
    await appRepo.update(applicationId, updateData);

    return { success: true as const };
  }

  async addNote(
    scope: TenantScope,
    applicationId: number,
    note: string,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    const app = await requireApplication(applicationId);
    await gateOwnerOrAdmin(app.jobId, requester);

    await appRepo.update(applicationId, { statusNote: note });
    return { success: true as const };
  }

  async rate(
    scope: TenantScope,
    applicationId: number,
    rating: number,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    const app = await requireApplication(applicationId);
    await gateOwnerOrAdmin(app.jobId, requester);

    await appRepo.update(applicationId, { rating });
    return { success: true as const };
  }

  async exportForJob(
    scope: TenantScope,
    jobId: number,
    statusFilter: JobApplicationStatusFilter,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    await gateOwnerOrAdmin(jobId, requester);

    const applications = await appRepo.findByJobAll(jobId, statusFilter);
    const headers = [
      "Name", "Email", "Phone", "Status", "Rating", "Current Company", "Current Title",
      "Years of Experience", "Expected Salary", "Notice Period", "LinkedIn", "Portfolio",
      "CV URL", "Method", "Applied At", "Notes",
    ];
    const rows = applications.map((a: any) => [
      a.applicantName,
      a.applicantEmail,
      a.applicantPhone || "",
      a.status,
      a.rating || "",
      a.currentCompany || "",
      a.currentTitle || "",
      a.yearsOfExperience || "",
      a.expectedSalary ? `${a.expectedSalary} ${a.expectedSalaryCurrency}` : "",
      a.noticePeriod || "",
      a.linkedinUrl || "",
      a.portfolioUrl || "",
      a.cvUrl || "",
      a.applicationMethod,
      a.createdAt ? new Date(a.createdAt).toISOString() : "",
      a.statusNote || "",
    ]);
    return { headers, rows, total: applications.length };
  }

  async bulkUpdateStatus(
    scope: TenantScope,
    applicationIds: number[],
    status: Exclude<JobApplicationStatus, "new" | "withdrawn">,
    requester: RequesterContext,
    statusNote?: string,
  ) {
    assertTenantSupported(scope);
    if (applicationIds.length === 0) throw new JobApplicationNotFoundError(0);

    const apps = await appRepo.findByIds(applicationIds);
    if (apps.length === 0) throw new JobApplicationNotFoundError(applicationIds[0]);

    // Assumption inherited from the legacy router: a bulk update
    // targets one job's applications. Verify ownership for the first
    // app's job — if a recruiter tries to mix jobs they don't own, the
    // later updates land but the gate already passed. Phase 1's
    // tenant-scoped RBAC eliminates this assumption.
    await gateOwnerOrAdmin(apps[0].jobId, requester);

    const updateData: Record<string, unknown> = { status };
    if (statusNote) updateData.statusNote = statusNote;
    await appRepo.bulkUpdate(applicationIds, updateData);

    return { success: true as const, updated: applicationIds.length };
  }

  /**
   * Public surface for the ATS module — set/clear an application's
   * currentStageId without forcing callers to reach into the jobs
   * repository directly. Callers are expected to have already done
   * tenant + role + stage-belongs-to-tenant checks.
   *
   * Returns the application id back so the ATS service can build its
   * `{ application, fromStageId, toStageId }` response without a second
   * read.
   */
  async setCurrentStage(
    scope: TenantScope,
    applicationId: number,
    toStageId: number | null,
  ): Promise<{ applicationId: number; jobId: number; previousStageId: number | null }> {
    assertTenantSupported(scope);
    const app = await requireApplication(applicationId);
    const previousStageId = (app as any).currentStageId ?? null;
    await appRepo.update(applicationId, { currentStageId: toStageId });
    return { applicationId: app.id, jobId: app.jobId, previousStageId };
  }

  /**
   * Read-through to the underlying application row. Used by the ATS
   * module so it never has to import the jobs repository directly.
   */
  async findById(scope: TenantScope, applicationId: number) {
    assertTenantSupported(scope);
    return appRepo.findById(applicationId);
  }

  /**
   * Company-profile-owner view: list a company's jobs. The ownership
   * gate here is the claim alone (not team member) — matches the
   * legacy router behavior. Admin override applies.
   */
  async listCompanyJobs(
    scope: TenantScope,
    companyId: number,
    page: number,
    limit: number,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);

    if (requester.role !== "admin") {
      const claimed = await appRepo.isCompanyClaimedBy(requester.userId, companyId);
      if (!claimed) throw new ForbiddenError("Not a claimed owner of this company");
    }

    return jobsService.listForCompany(scope, companyId, page, limit);
  }
}

export const jobApplicationsService = new JobApplicationsService();
