/**
 * Assessments Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * Mirrors `server/modules/jobs/tenant.guard.ts`. Every service method
 * that touches data takes a TenantScope; this guard rejects the call
 * (or the row) when scope doesn't match.
 *
 * Note: Phase 5 assessment tables (assessment_templates, _attempts,
 * etc.) all have NOT NULL tenant_id. Passing `null` is technically
 * allowed for symmetry with the rest of the module system but will
 * never match a row.
 */

import { TenantScope, TenantScopeViolationError } from "./types";

/**
 * Throws if the row's tenantId doesn't match the requested scope. Used
 * by service methods after reading a row to confirm it belongs to the
 * caller's tenant.
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
 * No-op kept for parity with the jobs module. Both null and concrete
 * scopes flow through service code without further validation.
 */
export function assertTenantSupported(_scope: TenantScope): void {
  // Both null and concrete scopes are accepted at the type level.
}
