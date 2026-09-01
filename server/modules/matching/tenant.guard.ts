/**
 * Matching Module — Tenant Scope Guard
 * ----------------------------------------------------------------------
 * Every service method that touches scoring/embedding data takes a
 * TenantScope. NULL = legacy public board, concrete = SaaS tenant.
 * `assertTenantScope` is called after any cross-module read (candidates,
 * jobs) to confirm the row belongs to the caller's tenant.
 */

import { TenantScope, TenantScopeViolationError } from "./types";

/**
 * Throws if the row's tenantId doesn't match the requested scope.
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
 * No-op accepted-scope sentinel. Both null (legacy) and concrete
 * (tenant) scopes are supported by this module.
 */
export function assertTenantSupported(_scope: TenantScope): void {
  // Both null (legacy) and concrete (tenant) scopes are supported.
}
