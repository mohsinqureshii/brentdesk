/**
 * Jobs Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * Every service method that touches data takes a TenantScope. NULL is
 * the public job board (legacy techscoop.io jobs). A concrete tenantId
 * is a SaaS tenant's private board.
 *
 * Phase 1: the PHASE_0.5 stub that blocked non-null scope is gone —
 * the `jobs.tenant_id` and `job_applications.tenant_id` columns landed
 * in migration 0044_tenants.sql, so callers can pass real ids now.
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

/**
 * No-op kept on purpose so the Phase 0.5 call sites compile. Once
 * every service method clearly handles both null and concrete scopes,
 * delete this helper and the matching imports.
 */
export function assertTenantSupported(_scope: TenantScope): void {
  // Both null (legacy) and concrete (tenant) scopes are supported.
}
