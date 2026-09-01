/**
 * ATS Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * Every ATS service method takes a TenantScope. NULL is the legacy
 * public path (no real ATS rows should exist there long-term — the
 * Phase 3 product is tenant-only — but the guard mirrors the jobs
 * module's so the wiring stays uniform).
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
 * No-op kept on purpose so call sites compile uniformly. Both null
 * (legacy) and concrete (tenant) scopes are supported.
 */
export function assertTenantSupported(_scope: TenantScope): void {
  // Both null (legacy) and concrete (tenant) scopes are supported.
}
