/**
 * Candidates Query Service (read-only, no PII gate)
 * ----------------------------------------------------------------------
 * Lightweight read API for cross-module callers (matching, scoring,
 * embedding pipelines) that need raw candidate rows without going
 * through the recruiter / self-only authorization checks on
 * `candidatesService.getProfile`.
 *
 * Callers are still expected to honor tenant scope — pass it through
 * to the assertTenantScope helper in their own module's guard.
 */

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidates } from "../../../../drizzle/schema";
import * as candidatesRepo from "../repositories/candidates.repository";
import type { TenantScope } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export class CandidatesQueryService {
  /** Raw row, no auth check. Callers must enforce tenant scope. */
  async findById(id: number) {
    return candidatesRepo.findById(id);
  }

  /**
   * Active (non-archived) candidates in the given scope. Used by
   * bulkRecompute / reindexAll batch passes. Hard limit to keep batch
   * sizes safe.
   */
  async findActiveForTenant(scope: TenantScope, limit = 200) {
    const d = await db();
    const where =
      scope === null
        ? and(isNull(candidates.tenantId), eq(candidates.isArchived, 0))
        : and(eq(candidates.tenantId, scope), eq(candidates.isArchived, 0));
    return d.select().from(candidates).where(where).limit(limit);
  }
}

export const candidatesQueryService = new CandidatesQueryService();
