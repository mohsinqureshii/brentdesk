/**
 * Jobs Service
 * ----------------------------------------------------------------------
 * Business logic for job listings — create, update, delete, status
 * transitions, slug generation, taxonomy sync, publish-hook side
 * effects. All tenant-scoped: every public method takes a TenantScope
 * and the guard rejects cross-tenant access.
 *
 * Phase 0.5: tenant guard is stubbed (PHASE_1_GUARD_STUB) — callers
 * pass `tenantId: null` (legacy public job board) and the stub no-ops.
 * Phase 1 will lift the stub once the tenantId column lands on `jobs`.
 */

import * as jobsRepo from "../repositories/jobs.repository";
import { slugService } from "../../../services/slug.service";
import { seoService } from "../../../services/seo.service";
import { workflowService } from "../../../services/workflow.service";
import { assertTenantSupported } from "../tenant.guard";
import { toDbDate } from "../../../_core/dbValues";
import {
  CreateJobInput,
  UpdateJobInput,
  TenantScope,
  RequesterContext,
  JobNotFoundError,
  UnauthorizedError,
} from "../types";

// ------------------------------------------------------------
// Role gate (current single-tenant model). Phase 1 replaces this
// with the tenant-scoped RBAC check inside `requirePermission()`.
// ------------------------------------------------------------

const EDIT_ROLES = new Set(["admin", "editor", "senior_editor"]);
const DELETE_ROLES = new Set(["admin", "senior_editor"]);

function gateEdit(role: string) {
  if (!EDIT_ROLES.has(role)) throw new UnauthorizedError("Unauthorized");
}
function gateDelete(role: string) {
  if (!DELETE_ROLES.has(role)) throw new UnauthorizedError("Unauthorized");
}

// ------------------------------------------------------------
// Slug builder — title + city + company + id
// ------------------------------------------------------------

async function buildJobSlug(
  title: string,
  cityId: number | null | undefined,
  companyName: string | null | undefined,
  jobId: number,
): Promise<string> {
  const parts: string[] = [slugService.generateSlug(title)];
  if (cityId) {
    const name = await jobsRepo.cityName(cityId);
    if (name) parts.push(slugService.generateSlug(name));
  }
  if (companyName) parts.push(slugService.generateSlug(companyName));
  parts.push(String(jobId));
  return parts.filter(Boolean).join("-");
}

// ------------------------------------------------------------
// Publish-hook fire-and-forget (no behavior change from legacy)
// ------------------------------------------------------------

async function firePublishHooks(opts: {
  jobId: number;
  slug: string;
  title: string;
  triggeredBy: number;
  trigger: "publish" | "transition";
}) {
  try {
    const { onEntityPublished, buildEntityUrl } = await import(
      "../../../services/publishHooks.service"
    );
    onEntityPublished({
      entityType: "job",
      entityId: opts.jobId,
      url: buildEntityUrl("job", opts.slug),
      title: opts.title,
      slug: opts.slug,
      triggeredBy: opts.triggeredBy,
      trigger: opts.trigger,
    });
  } catch (err) {
    console.error("[Jobs] publishHooks failed:", err);
  }
}

// ------------------------------------------------------------
// Service
// ------------------------------------------------------------

export class JobsService {
  /**
   * Public detail page — slug → full job + categories/regions/sectors +
   * SEO meta + view-count bump. Returns null when the slug is unknown.
   */
  async getPublicBySlug(scope: TenantScope, slug: string) {
    assertTenantSupported(scope);
    const job = await jobsRepo.findBySlugWithLocationJoins(slug);
    if (!job) return null;

    // Best-effort view bump — same behavior as the legacy router.
    await jobsRepo.incrementViewCount(job.id, job.viewCount ?? 0);

    const [categories, regions, sectors, seo] = await Promise.all([
      jobsRepo.getCategoriesWithNames(job.id),
      jobsRepo.getRegionsWithNames(job.id),
      jobsRepo.getSectorsWithNames(job.id),
      seoService.getSeoMeta("job", job.id, job as Record<string, unknown>),
    ]);

    return { ...job, categories, regions, sectors, seo };
  }

  /**
   * Admin detail page — full row + taxonomy ids + workflow transitions
   * available to the requester's role.
   */
  async getAdmin(scope: TenantScope, id: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateEdit(requester.role);

    const job = await jobsRepo.findById(id);
    if (!job) return null;

    const [categoryIds, regionIds, sectorIds, availableTransitions] = await Promise.all([
      jobsRepo.getCategoryIds(job.id),
      jobsRepo.getRegionIds(job.id),
      jobsRepo.getSectorIds(job.id),
      workflowService.getAvailableTransitions(job.statusId, requester.role),
    ]);

    return { ...job, categoryIds, regionIds, sectorIds, availableTransitions };
  }

  async create(scope: TenantScope, input: CreateJobInput, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateEdit(requester.role);

    const { categoryIds, regionIds, sectorIds, salaryMin, salaryMax, skills, ...jobData } = input;

    const initialStatus = await workflowService.getInitialStatus("editorial");
    if (!initialStatus) throw new Error("Workflow not initialized");

    // If the create payload sets the status to 'published' directly,
    // capture publishedAt now so the JobPosting feed and search index
    // hooks have something to anchor on.
    let publishedAtValue: Date | undefined;
    if (jobData.statusId) {
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (publishedStatus && jobData.statusId === publishedStatus.id) {
        publishedAtValue = new Date();
      }
    }

    // Two-phase insert: temp slug → insert → look up insertId → final slug.
    // Mirrors the legacy router; required because the final slug embeds
    // the row id.
    const tempSlug = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await jobsRepo.insert({
      tenantId: scope,
      title: jobData.title,
      slug: tempSlug,
      description: jobData.description,
      requirements: jobData.requirements,
      benefits: jobData.benefits,
      companyId: jobData.companyId,
      companyName: jobData.companyName,
      companyLogo: jobData.companyLogo,
      companyWebsite: jobData.companyWebsite,
      location: jobData.location,
      countryId: jobData.countryId,
      cityId: jobData.cityId,
      isRemote: jobData.isRemote,
      remoteType: jobData.remoteType,
      roleType: jobData.roleType,
      seniority: jobData.seniority,
      salaryMin: salaryMin !== undefined ? String(salaryMin) : undefined,
      salaryMax: salaryMax !== undefined ? String(salaryMax) : undefined,
      salaryCurrency: jobData.salaryCurrency,
      salaryPeriod: jobData.salaryPeriod,
      applyUrl: jobData.applyUrl,
      applyEmail: jobData.applyEmail,
      expiresAt: jobData.expiresAt,
      skills: skills || [],
      department: jobData.department,
      statusId: jobData.statusId || initialStatus.id,
      publishedAt: publishedAtValue,
      postedById: requester.userId,
    });

    const inserted = await jobsRepo.findBySlug(tempSlug);
    if (!inserted) throw new Error("Insert produced no row");
    const jobId = inserted.id;

    const slug =
      input.slug ?? (await buildJobSlug(input.title, jobData.cityId, jobData.companyName, jobId));
    await jobsRepo.setSlug(jobId, slug);

    if (categoryIds?.length) await jobsRepo.setCategories(jobId, categoryIds);
    if (regionIds?.length) await jobsRepo.setRegions(jobId, regionIds);
    if (sectorIds?.length) await jobsRepo.setSectors(jobId, sectorIds);

    if (publishedAtValue) {
      await firePublishHooks({
        jobId,
        slug,
        title: jobData.title,
        triggeredBy: requester.userId,
        trigger: "publish",
      });
    }

    return { id: jobId, slug };
  }

  async update(scope: TenantScope, input: UpdateJobInput, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateEdit(requester.role);

    const { id, categoryIds, regionIds, sectorIds, salaryMin, salaryMax, skills, ...updateData } =
      input;

    // Auto-set publishedAt the first time a status transitions to published
    // via direct update (not via the workflow.transition procedure).
    let updatePublishedAt: Date | undefined;
    if (updateData.statusId) {
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (publishedStatus && updateData.statusId === publishedStatus.id) {
        const currentPublishedAt = await jobsRepo.getCurrentPublishedAt(id);
        if (!currentPublishedAt) updatePublishedAt = new Date();
      }
    }

    const updateValues: Record<string, unknown> = { ...updateData };
    if (salaryMin !== undefined) updateValues.salaryMin = String(salaryMin);
    if (salaryMax !== undefined) updateValues.salaryMax = String(salaryMax);
    if (skills !== undefined) updateValues.skills = skills;
    if (updatePublishedAt) updateValues.publishedAt = updatePublishedAt;

    await jobsRepo.update(id, updateValues);

    // Slug regenerates if title, city, or company changes — matches
    // legacy router behavior so internal links continue to resolve.
    if (updateData.title || updateData.cityId !== undefined || updateData.companyName) {
      const current = await jobsRepo.findById(id);
      if (current) {
        const newSlug = await buildJobSlug(
          updateData.title || current.title,
          updateData.cityId !== undefined ? updateData.cityId : current.cityId,
          updateData.companyName || current.companyName,
          id,
        );
        await jobsRepo.setSlug(id, newSlug);
      }
    }

    if (categoryIds !== undefined) await jobsRepo.setCategories(id, categoryIds);
    if (regionIds !== undefined) await jobsRepo.setRegions(id, regionIds);
    if (sectorIds !== undefined) await jobsRepo.setSectors(id, sectorIds);

    if (updatePublishedAt) {
      const info = await jobsRepo.getSlugAndTitle(id);
      if (info) {
        await firePublishHooks({
          jobId: id,
          slug: info.slug,
          title: info.title,
          triggeredBy: requester.userId,
          trigger: "publish",
        });
      }
    }

    return { success: true as const };
  }

  async transitionStatus(
    scope: TenantScope,
    jobId: number,
    transitionId: number,
    requester: RequesterContext,
    comment?: string,
  ) {
    assertTenantSupported(scope);

    const result = await workflowService.executeTransition(
      "job",
      jobId,
      transitionId,
      requester.userId,
      requester.role,
      comment,
    );
    if (!result.success) throw new Error(result.error);

    await jobsRepo.update(jobId, { statusId: result.newStatusId });

    const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
    if (result.newStatusId === publishedStatus?.id) {
      await jobsRepo.update(jobId, { publishedAt: toDbDate(new Date()) });
      const info = await jobsRepo.getSlugAndTitle(jobId);
      if (info) {
        await firePublishHooks({
          jobId,
          slug: info.slug,
          title: info.title,
          triggeredBy: requester.userId,
          trigger: "transition",
        });
      }
    }

    return { success: true as const, newStatusId: result.newStatusId };
  }

  async deleteOne(scope: TenantScope, id: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateDelete(requester.role);

    await jobsRepo.deleteAllJoins(id);
    await jobsRepo.deleteById(id);

    return { success: true as const };
  }

  async bulkSetStatusBySlug(
    scope: TenantScope,
    ids: number[],
    statusSlug: string,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    gateDelete(requester.role);

    const status = await workflowService.getStatusBySlug("editorial", statusSlug);
    if (!status) throw new Error("Status not found");

    await jobsRepo.bulkSetStatus(ids, status.id);
    return { success: true as const, count: ids.length };
  }

  async bulkDelete(scope: TenantScope, ids: number[], requester: RequesterContext) {
    assertTenantSupported(scope);
    gateDelete(requester.role);

    await jobsRepo.deleteAllJoinsForIds(ids);
    await jobsRepo.deleteByIds(ids);
    return { success: true as const, count: ids.length };
  }

  /**
   * Application counter bump — used by `trackApplication` (external)
   * and by `applyInternal` after a successful row insert.
   */
  async incrementApplicationCount(scope: TenantScope, jobId: number) {
    assertTenantSupported(scope);
    const current = await jobsRepo.getApplicationCount(jobId);
    if (current === null) {
      // Job missing — nothing to bump. Matches legacy router behavior.
      return { success: true as const };
    }
    await jobsRepo.incrementApplicationCount(jobId, current);
    return { success: true as const };
  }

  /**
   * Used by the company-profile owner view to list a company's jobs.
   * Authorization is performed by the caller (it owns the claim
   * lookup) — this is just the data fetch.
   */
  async listForCompany(scope: TenantScope, companyId: number, page: number, limit: number) {
    assertTenantSupported(scope);
    const offset = (page - 1) * limit;
    const { items, total } = await jobsRepo.listByCompanyId(companyId, limit, offset, scope);
    return { jobs: items, total };
  }

  /** Untyped helper for callers (e.g. ownership checks) needing the company id of a job. */
  async getCompanyIdFor(scope: TenantScope, jobId: number) {
    assertTenantSupported(scope);
    return jobsRepo.getCompanyId(jobId);
  }

  /** Used by withdraw/etc. callers. Throws JobNotFoundError if missing. */
  async requireById(scope: TenantScope, id: number) {
    assertTenantSupported(scope);
    const job = await jobsRepo.findById(id);
    if (!job) throw new JobNotFoundError(id);
    return job;
  }
}

export const jobsService = new JobsService();
