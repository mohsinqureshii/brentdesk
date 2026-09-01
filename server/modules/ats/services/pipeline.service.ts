/**
 * Pipeline Service
 * ----------------------------------------------------------------------
 * Pipeline stages CRUD + the candidate-stage-transition flow. Writes
 * a history row on every move, then delegates the application update
 * to the jobs module's public surface so the boundary stays clean.
 *
 * Tenant-default vs per-job stages:
 *   - When no per-job stages exist for a job, the service falls back
 *     to the tenant defaults (jobId IS NULL). That lets recruiters
 *     start using a job immediately and customize the pipeline later.
 */

import * as stagesRepo from "../repositories/pipelineStages.repository";
import * as historyRepo from "../repositories/stageHistory.repository";
import { jobApplicationsService, jobsService } from "../../jobs";
import { logPii } from "../../compliance";
import { notifyStageChange } from "../../../services/slackIntegration.service";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import {
  CreateStageInput,
  ForbiddenError,
  PipelineStageDTO,
  PipelineStageCategory,
  RequesterContext,
  StageNotFoundError,
  TenantScope,
  UpdateStageInput,
} from "../types";

const RECRUITER_PLUS = new Set(["admin", "recruiter", "hiring_manager", "owner"]);

function gateRecruiter(requester: RequesterContext) {
  if (!RECRUITER_PLUS.has(requester.role)) {
    throw new ForbiddenError("Recruiter role required");
  }
}

function toDTO(row: any): PipelineStageDTO {
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    jobId: row.jobId ?? null,
    name: row.name,
    slug: row.slug,
    position: row.position,
    color: row.color ?? null,
    category: row.category as PipelineStageCategory,
    isTerminal: !!row.isTerminal,
    isDefault: !!row.isDefault,
    autoEmailTemplateId: row.autoEmailTemplateId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireStage(id: number, scope: TenantScope) {
  const row = await stagesRepo.findById(id);
  if (!row) throw new StageNotFoundError(id);
  assertTenantScope(row.tenantId ?? null, scope, "pipelineStages.findById");
  return row;
}

export class PipelineService {
  /**
   * List stages for a scope. If `jobId` is provided and that job has
   * its own stages, returns them; otherwise falls back to the
   * tenant-default set (jobId IS NULL).
   */
  async listStages(
    scope: TenantScope,
    jobId: number | null,
    requester: RequesterContext,
  ): Promise<PipelineStageDTO[]> {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    if (jobId !== null) {
      const perJob = await stagesRepo.listForTenant(scope, jobId);
      if (perJob.length > 0) return perJob.map(toDTO);
    }
    const defaults = await stagesRepo.listForTenant(scope, null);
    return defaults.map(toDTO);
  }

  async createStage(
    scope: TenantScope,
    input: CreateStageInput,
    requester: RequesterContext,
  ): Promise<PipelineStageDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    if (scope === null) {
      throw new ForbiddenError("Tenant required to create stages");
    }

    const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const result = await stagesRepo.insert({
      tenantId: scope,
      jobId: input.jobId ?? null,
      name: input.name,
      slug,
      position: input.position,
      color: input.color ?? null,
      category: input.category ?? "screening",
      isTerminal: input.isTerminal ? 1 : 0,
      isDefault: input.isDefault ? 1 : 0,
      autoEmailTemplateId: input.autoEmailTemplateId ?? null,
    });
    const inserted = await stagesRepo.findById(result.insertId);
    return toDTO(inserted);
  }

  async updateStage(
    scope: TenantScope,
    id: number,
    input: UpdateStageInput,
    requester: RequesterContext,
  ): Promise<PipelineStageDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    await requireStage(id, scope);

    const values: Record<string, unknown> = {};
    if (input.name !== undefined) values.name = input.name;
    if (input.slug !== undefined) values.slug = input.slug;
    if (input.position !== undefined) values.position = input.position;
    if (input.color !== undefined) values.color = input.color;
    if (input.category !== undefined) values.category = input.category;
    if (input.isTerminal !== undefined) values.isTerminal = input.isTerminal ? 1 : 0;
    if (input.isDefault !== undefined) values.isDefault = input.isDefault ? 1 : 0;
    if (input.autoEmailTemplateId !== undefined) values.autoEmailTemplateId = input.autoEmailTemplateId;

    await stagesRepo.update(id, values);
    const row = await stagesRepo.findById(id);
    return toDTO(row);
  }

  async deleteStage(scope: TenantScope, id: number, requester: RequesterContext) {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    await requireStage(id, scope);
    await stagesRepo.deleteById(id);
    return { success: true as const };
  }

  /**
   * Apply a new ordering to a batch of stages. The caller passes the
   * desired final positions; the service verifies every stage belongs
   * to the requested scope first.
   */
  async reorderStages(
    scope: TenantScope,
    stageIdToPosition: Map<number, number>,
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    for (const id of Array.from(stageIdToPosition.keys())) {
      await requireStage(id, scope);
    }
    await stagesRepo.reorder(stageIdToPosition);
    return { success: true as const, updated: stageIdToPosition.size };
  }

  /**
   * Move an application to a new pipeline stage. Writes the history
   * row, then delegates the application update through the jobs
   * module's public surface (`jobApplicationsService.setCurrentStage`)
   * to stay on the right side of the module boundary.
   */
  async moveApplicationToStage(
    scope: TenantScope,
    applicationId: number,
    toStageId: number,
    requester: RequesterContext,
    reason?: string,
  ) {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    const stage = await requireStage(toStageId, scope);

    const app = await jobApplicationsService.findById(scope, applicationId);
    if (!app) throw new ForbiddenError("Application not found in tenant scope");
    const fromStageId = (app as any).currentStageId ?? null;

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "application",
      subjectId: applicationId,
      action: "update",
      ipAddress: undefined,
    });

    await historyRepo.insert({
      tenantId: scope,
      applicationId,
      fromStageId,
      toStageId: stage.id,
      movedById: requester.userId,
      reason: reason ?? null,
    });

    const result = await jobApplicationsService.setCurrentStage(scope, applicationId, stage.id);

    // Fire-and-forget Slack notification. Failures must not block the
    // stage-move response. `notifyStageChange` no-ops when Slack isn't
    // configured for this tenant.
    (async () => {
      try {
        const [fromStageRow, job] = await Promise.all([
          fromStageId ? stagesRepo.findById(fromStageId) : Promise.resolve(null),
          jobsService.requireById(scope, result.jobId).catch(() => null),
        ]);
        await notifyStageChange(scope, {
          candidateName: (app as any).applicantName || "Candidate",
          candidateUrl: `/admin/talent/candidates/${(app as any).userId ?? applicationId}`,
          jobTitle: (job as any)?.title || "Untitled job",
          fromStage: fromStageRow?.name || "(none)",
          toStage: stage.name,
          movedBy: `User #${requester.userId}`,
        });
      } catch (err) {
        console.error("[Slack][stageChange] notify failed:", err);
      }
    })();

    return {
      application: { id: result.applicationId, jobId: result.jobId },
      fromStageId,
      toStageId: stage.id,
    };
  }

  async bulkMove(
    scope: TenantScope,
    applicationIds: number[],
    toStageId: number,
    requester: RequesterContext,
    reason?: string,
  ) {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    if (applicationIds.length === 0) return { moved: 0 };

    const results: Array<{ applicationId: number; fromStageId: number | null }> = [];
    for (const id of applicationIds) {
      const r = await this.moveApplicationToStage(scope, id, toStageId, requester, reason);
      results.push({ applicationId: r.application.id, fromStageId: r.fromStageId });
    }
    return { moved: results.length, results };
  }

  /**
   * Seed the tenant-default 7-stage pipeline if the tenant has none.
   * Idempotent — call on tenant creation OR on first load of the
   * legacy public-board pipeline (scope = null) so the public board's own
   * recruiters can move applicants through stages without needing a
   * tenant. The repo accepts null tenantId on the seeded rows; the
   * scope filter (`isNull(tenantId)`) makes them visible to the apex
   * admin only.
   *
   * Self-heals when migration 0046 hasn't been applied yet — it'll
   * MODIFY COLUMN inline so the click-to-seed action just works.
   */
  async seedDefaultsIfMissing(scope: TenantScope) {
    assertTenantSupported(scope);

    // Make sure tenant_id is nullable before we try to insert NULL.
    // No-op when migration 0046 has already run.
    if (scope === null) {
      try {
        await stagesRepo.ensureTenantIdNullable();
      } catch (err) {
        throw new Error(
          `Pipeline schema not ready: ${(err as Error).message}`,
        );
      }
    }

    const existing = await stagesRepo.countForScope(scope, null);
    if (existing > 0) return { seeded: false };
    await stagesRepo.seedDefaultStages(scope, null);
    return { seeded: true };
  }
}

export const pipelineService = new PipelineService();
