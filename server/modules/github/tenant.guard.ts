/**
 * GitHub Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * GitHub profiles attach to a candidate; tenant scoping flows through
 * `candidates.tenantId`. The guard reads the candidate row's tenantId
 * and rejects access from a mismatched scope.
 *
 * Mirrors `server/modules/jobs/tenant.guard.ts` post-Phase 1.
 */

import { TenantScope, TenantScopeViolationError } from "./types";

/**
 * Throws if the row's tenantId doesn't match the requested scope.
 * Used by service methods after reading a row to confirm it belongs
 * to the caller's tenant.
 */
export function assertTenantScope(
  rowTenantId: number | null,
  requestedScope: TenantScope,
  context: string,
): void {
  if (rowTenantId !== requestedScope) {
    throw new TenantScopeViolationError(
      `${context}: row tenant ${rowTenantId} != requested scope ${requestedScope}`,
    );
  }
}

export function assertTenantSupported(_scope: TenantScope): void {
  // Both null (legacy) and concrete (tenant) scopes are supported.
}
