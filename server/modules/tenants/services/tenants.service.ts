/**
 * Tenants Service
 * ----------------------------------------------------------------------
 * CRUD on tenants + membership management. The tenant bootstrapping
 * path: super_admin → createTenant() → owner membership created
 * automatically → owner can invite the rest of the team.
 */

import { invalidateTenantCache } from "../../../middleware/tenant.middleware";
import * as repo from "../repositories/tenants.repository";
import {
  CreateTenantInput,
  InviteMemberInput,
  isValidSlug,
  TenantDTO,
  TenantMemberRole,
  TenantMembershipDTO,
  TenantMembershipNotFoundError,
  TenantNotFoundError,
  TenantSlugTakenError,
  TenantUnauthorizedError,
  UpdateTenantInput,
} from "../types";

function toDTO(row: any): TenantDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    customDomain: row.customDomain ?? null,
    plan: row.plan,
    status: row.status,
    dataResidency: row.dataResidency,
    brandingLogoUrl: row.brandingLogoUrl ?? null,
    brandingPrimaryColor: row.brandingPrimaryColor ?? null,
    trialEndsAt: row.trialEndsAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function membershipToDTO(row: any): TenantMembershipDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    role: row.role,
    status: row.status,
    invitedById: row.invitedById ?? null,
    joinedAt: row.joinedAt ?? null,
    lastActiveAt: row.lastActiveAt ?? null,
  };
}

export class TenantsService {
  /**
   * Create a tenant + seed the owner membership. Super_admin only.
   * The tenant becomes addressable at `<slug>.<platform domain>` after the
   * tenant cache TTL or on the next request that doesn't hit cache.
   */
  async createTenant(input: CreateTenantInput, requesterRole: string): Promise<TenantDTO> {
    if (requesterRole !== "admin") {
      throw new TenantUnauthorizedError("Only super_admin/admin can create tenants");
    }
    if (!isValidSlug(input.slug)) {
      throw new Error(`Invalid slug: must be 2–64 lowercase alphanumerics/hyphens, not reserved`);
    }
    const existing = await repo.findBySlug(input.slug);
    if (existing) throw new TenantSlugTakenError(input.slug);
    if (input.customDomain) {
      const dup = await repo.findByCustomDomain(input.customDomain);
      if (dup) throw new Error(`Custom domain already in use: ${input.customDomain}`);
    }

    const trialEndsAt = input.trialDays
      ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await repo.insertTenant({
      slug: input.slug,
      name: input.name,
      customDomain: input.customDomain ?? null,
      plan: input.plan ?? "free",
      status: trialEndsAt ? "trial" : "active",
      dataResidency: input.dataResidency ?? "us",
      brandingLogoUrl: input.brandingLogoUrl ?? null,
      brandingPrimaryColor: input.brandingPrimaryColor ?? null,
      trialEndsAt,
    });

    const created = await repo.findBySlug(input.slug);
    if (!created) throw new Error("Tenant insert produced no row");

    // Seed the owner membership so the calling super_admin's chosen
    // owner can sign in immediately on the subdomain.
    await repo.insertMembership({
      tenantId: created.id,
      userId: input.ownerUserId,
      role: "owner",
      status: "active",
      invitedById: null,
      joinedAt: new Date().toISOString(),
    });

    await repo.logAudit({
      tenantId: created.id,
      action: "tenant_created",
      resourceType: "tenant",
      resourceId: created.id,
      changes: { slug: created.slug, plan: created.plan, ownerUserId: input.ownerUserId },
    });

    // Drop the tenant lookup cache so the new subdomain resolves
    // immediately on the next request rather than waiting 60s.
    invalidateTenantCache();

    return toDTO(created);
  }

  async updateTenant(input: UpdateTenantInput, requesterRole: string): Promise<TenantDTO> {
    if (requesterRole !== "admin") {
      throw new TenantUnauthorizedError("Only super_admin/admin can update tenants");
    }
    const existing = await repo.findById(input.id);
    if (!existing) throw new TenantNotFoundError(input.id);

    await repo.updateTenant(input.id, {
      name: input.name,
      customDomain: input.customDomain,
      plan: input.plan,
      status: input.status,
      dataResidency: input.dataResidency,
      brandingLogoUrl: input.brandingLogoUrl,
      brandingPrimaryColor: input.brandingPrimaryColor,
      settings: input.settings,
    });

    await repo.logAudit({
      tenantId: input.id,
      action: "tenant_updated",
      resourceType: "tenant",
      resourceId: input.id,
      changes: input as any,
    });

    invalidateTenantCache();

    const refreshed = await repo.findById(input.id);
    return toDTO(refreshed!);
  }

  async getById(id: number): Promise<TenantDTO | null> {
    const row = await repo.findById(id);
    return row ? toDTO(row) : null;
  }

  async getBySlug(slug: string): Promise<TenantDTO | null> {
    const row = await repo.findBySlug(slug);
    return row ? toDTO(row) : null;
  }

  async list(opts: { search?: string; status?: string; page?: number; limit?: number }) {
    const { items, total } = await repo.listAll({
      search: opts.search,
      status: opts.status,
      page: opts.page ?? 1,
      limit: opts.limit ?? 20,
    });
    return { items: items.map(toDTO), total };
  }

  async listForUser(userId: number) {
    return repo.listForUser(userId);
  }

  // --------------------------------------------------------------
  // Memberships
  // --------------------------------------------------------------

  async listMembers(tenantId: number, requesterUserId: number, requesterRole: string) {
    await this.assertCanManageMembers(tenantId, requesterUserId, requesterRole);
    const rows = await repo.listMemberships(tenantId);
    return rows.map(membershipToDTO);
  }

  async invite(input: InviteMemberInput, requesterUserId: number, requesterRole: string) {
    await this.assertCanManageMembers(input.tenantId, requesterUserId, requesterRole);
    const existing = await repo.findMembership(input.tenantId, input.userId);
    if (existing) {
      // Reactivate if previously left/suspended; keep role from caller.
      await repo.updateMembership(existing.id, {
        role: input.role,
        status: "invited",
        invitedById: requesterUserId,
      });
      return;
    }
    await repo.insertMembership({
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      status: "invited",
      invitedById: requesterUserId,
    });
    await repo.logAudit({
      tenantId: input.tenantId,
      userId: requesterUserId,
      action: "member_invited",
      resourceType: "tenant_membership",
      changes: { invitedUserId: input.userId, role: input.role },
    });
  }

  async acceptInvite(tenantId: number, userId: number) {
    const m = await repo.findMembership(tenantId, userId);
    if (!m) throw new TenantMembershipNotFoundError(tenantId, userId);
    if (m.status !== "invited") return;
    await repo.updateMembership(m.id, { status: "active", joinedAt: new Date().toISOString() });
    await repo.logAudit({
      tenantId,
      userId,
      action: "invite_accepted",
      resourceType: "tenant_membership",
    });
  }

  async changeRole(
    tenantId: number,
    userId: number,
    newRole: TenantMemberRole,
    requesterUserId: number,
    requesterRole: string,
  ) {
    await this.assertCanManageMembers(tenantId, requesterUserId, requesterRole);
    const m = await repo.findMembership(tenantId, userId);
    if (!m) throw new TenantMembershipNotFoundError(tenantId, userId);
    await repo.updateMembership(m.id, { role: newRole });
    await repo.logAudit({
      tenantId,
      userId: requesterUserId,
      action: "role_changed",
      resourceType: "tenant_membership",
      changes: { userId, from: m.role, to: newRole },
    });
  }

  async removeMember(
    tenantId: number,
    userId: number,
    requesterUserId: number,
    requesterRole: string,
  ) {
    await this.assertCanManageMembers(tenantId, requesterUserId, requesterRole);
    const m = await repo.findMembership(tenantId, userId);
    if (!m) throw new TenantMembershipNotFoundError(tenantId, userId);
    await repo.updateMembership(m.id, { status: "left" });
    await repo.logAudit({
      tenantId,
      userId: requesterUserId,
      action: "member_removed",
      resourceType: "tenant_membership",
      changes: { userId },
    });
  }

  // --------------------------------------------------------------
  // Authorization helpers
  // --------------------------------------------------------------

  private async assertCanManageMembers(
    tenantId: number,
    requesterUserId: number,
    requesterRole: string,
  ) {
    if (requesterRole === "admin") return;
    const m = await repo.findMembership(tenantId, requesterUserId);
    if (!m || m.status !== "active") {
      throw new TenantUnauthorizedError("Not a tenant member");
    }
    if (m.role !== "owner") {
      throw new TenantUnauthorizedError("Only tenant owners can manage memberships");
    }
  }
}

export const tenantsService = new TenantsService();
