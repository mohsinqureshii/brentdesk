/**
 * Tenants Module — Public Boundary
 * Cross-module callers should import only from here.
 */

export { tenantsRouter } from "./tenants.router";
export { tenantsService } from "./services/tenants.service";
export type {
  TenantDTO,
  TenantMembershipDTO,
  TenantPlan,
  TenantStatus,
  TenantMemberRole,
  CreateTenantInput,
  UpdateTenantInput,
} from "./types";
export {
  TenantNotFoundError,
  TenantSlugTakenError,
  TenantUnauthorizedError,
} from "./types";
