/**
 * Candidates Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * Every service method that touches data takes a TenantScope. NULL is
 * the global/legacy candidate pool. A concrete tenantId is a SaaS
 * tenant's private candidate database.
 *
 * Phase 2: the `candidates.tenant_id`, `candidate_tenant_visibility`,
 * and related columns already exist (migration 0045_talent_platform.sql),
 * so callers can pass real ids now. Mirrors the jobs module guard.
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
 * No-op kept on purpose so the Phase 2 call sites compile. Once
 * every service method clearly handles both null and concrete scopes,
 * delete this helper and the matching imports.
 */
export function assertTenantSupported(_scope: TenantScope): void {
  // Both null (legacy) and concrete (tenant) scopes are supported.
}
