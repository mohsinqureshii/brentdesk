/**
 * Tenants Module — Public Types
 * ----------------------------------------------------------------------
 * Surface for tenant CRUD + membership management. Owned by super_admin
 * for tenant creation/suspension; tenant owners can manage their own
 * memberships (invite, change role, remove).
 */

export type TenantPlan = "free" | "starter" | "growth" | "enterprise";
export type TenantStatus = "trial" | "active" | "suspended" | "cancelled";
export type DataResidency = "us" | "eu" | "ksa";
export type TenantMemberRole = "owner" | "recruiter" | "hiring_manager" | "interviewer" | "viewer";
export type TenantMemberStatus = "invited" | "active" | "suspended" | "left";

export interface TenantDTO {
  id: number;
  slug: string;
  name: string;
  customDomain: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  dataResidency: DataResidency;
  brandingLogoUrl: string | null;
  brandingPrimaryColor: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembershipDTO {
  id: number;
  tenantId: number;
  userId: number;
  role: TenantMemberRole;
  status: TenantMemberStatus;
  invitedById: number | null;
  joinedAt: string | null;
  lastActiveAt: string | null;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  customDomain?: string;
  plan?: TenantPlan;
  dataResidency?: DataResidency;
  brandingLogoUrl?: string;
  brandingPrimaryColor?: string;
  trialDays?: number;
  ownerUserId: number;
}

export interface UpdateTenantInput {
  id: number;
  name?: string;
  customDomain?: string | null;
  plan?: TenantPlan;
  status?: TenantStatus;
  dataResidency?: DataResidency;
  brandingLogoUrl?: string | null;
  brandingPrimaryColor?: string | null;
  settings?: Record<string, unknown>;
}

export interface InviteMemberInput {
  tenantId: number;
  userId: number;
  role: TenantMemberRole;
}

export class TenantNotFoundError extends Error {
  constructor(id: number | string) {
    super(`Tenant not found: ${id}`);
    this.name = "TenantNotFoundError";
  }
}

export class TenantSlugTakenError extends Error {
  constructor(slug: string) {
    super(`Tenant slug already taken: ${slug}`);
    this.name = "TenantSlugTakenError";
  }
}

export class TenantUnauthorizedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "TenantUnauthorizedError";
  }
}

export class TenantMembershipNotFoundError extends Error {
  constructor(tenantId: number, userId: number) {
    super(`Membership not found for tenant=${tenantId} user=${userId}`);
    this.name = "TenantMembershipNotFoundError";
  }
}

// Reserved slugs that conflict with platform infrastructure subdomains.
// Keep in sync with `RESERVED_SUBDOMAINS` in tenant.middleware.ts.
export const RESERVED_SLUGS = new Set([
  "www", "api", "admin", "app", "static", "cdn", "mail", "smtp", "ftp",
  "blog", "docs", "status", "support", "help", "auth", "id",
]);

export function isValidSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 64) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}
