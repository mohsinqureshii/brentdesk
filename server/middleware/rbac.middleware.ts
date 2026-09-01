/**
 * RBAC Middleware - Role-Based Access Control
 * Implements permission checking, scope resolution, and role hierarchy
 * Per BRD V4 Security Requirements
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { roles, permissions, rolePermissions, userRoles, auditLogs, tenantMemberships } from "../../drizzle/schema";
import { eq, and, inArray, isNull, or, gte } from "drizzle-orm";

// Permission scope types
export type PermissionScope = 'all' | 'own' | 'team';

// Tenant membership roles — Phase 1a. Mapped to the global RBAC
// resource:action grid via TENANT_ROLE_PERMISSIONS below so we don't
// need to seed dozens of rows in the rolePermissions table for every
// new tenant.
export type TenantRole = 'owner' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'viewer';

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  scope: PermissionScope;
  reason?: string;
}

// User context with roles and permissions
export interface UserRbacContext {
  userId: number;
  /** When set, the user is acting inside a tenant — tenant-scoped
   *  permissions apply on top of any global roles. */
  tenantId: number | null;
  /** Tenant membership role, if any. */
  tenantRole: TenantRole | null;
  roles: string[];
  permissions: Map<string, PermissionScope>;
  isSuperAdmin: boolean;
}

// ============================================================
// Tenant role → permissions table
// ----------------------------------------------------------------------
// Inlined rather than seeded into rolePermissions so a new tenant
// doesn't need a row dance. Edit here when adding new tenant
// resources/actions; do not mutate per-tenant.
// ============================================================

const TENANT_ROLE_PERMISSIONS: Record<TenantRole, Record<string, PermissionScope>> = {
  owner: {
    'job:create': 'all', 'job:read': 'all', 'job:update': 'all', 'job:delete': 'all',
    'application:read': 'all', 'application:update': 'all', 'application:delete': 'all',
    'candidate:read': 'all', 'candidate:update': 'all',
    'tenant:settings': 'all', 'tenant:billing': 'all', 'tenant:members': 'all',
    'assessment:create': 'all', 'assessment:read': 'all',
  },
  recruiter: {
    'job:create': 'all', 'job:read': 'all', 'job:update': 'all', 'job:delete': 'own',
    'application:read': 'all', 'application:update': 'all',
    'candidate:read': 'all', 'candidate:update': 'team',
    'assessment:create': 'all', 'assessment:read': 'all',
  },
  hiring_manager: {
    'job:read': 'all', 'job:update': 'team',
    'application:read': 'team', 'application:update': 'team',
    'candidate:read': 'team',
    'assessment:read': 'team',
  },
  interviewer: {
    'job:read': 'team',
    'application:read': 'own', 'application:update': 'own',
    'candidate:read': 'own',
    'assessment:read': 'own',
  },
  viewer: {
    'job:read': 'all',
    'application:read': 'all',
    'candidate:read': 'all',
  },
};

/**
 * Get all roles for a user (including inherited roles)
 */
export async function getUserRoles(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  // Get active user roles (not expired)
  const activeRoles = await db.select({
    roleId: userRoles.roleId,
    roleName: roles.name
  })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(
      eq(userRoles.userId, userId),
      or(
        isNull(userRoles.expiresAt),
        gte(userRoles.expiresAt, new Date().toISOString())
      )
    ));

  return activeRoles.map(r => r.roleName);
}

/**
 * Get all permissions for a set of roles
 */
export async function getRolePermissions(roleNames: string[]): Promise<Map<string, PermissionScope>> {
  const db = await getDb();
  if (!db) return new Map();

  if (roleNames.length === 0) return new Map();

  // Get role IDs
  const roleRecords = await db.select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(inArray(roles.name, roleNames));

  const roleIds = roleRecords.map(r => r.id);
  if (roleIds.length === 0) return new Map();

  // Get permissions for these roles
  const perms = await db.select({
    resource: permissions.resource,
    action: permissions.action,
    scope: permissions.scope
  })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  // Build permission map (resource:action -> scope)
  // If multiple roles grant same permission, use the broadest scope
  const permMap = new Map<string, PermissionScope>();
  const scopePriority: Record<PermissionScope, number> = { all: 3, team: 2, own: 1 };

  for (const perm of perms) {
    const key = `${perm.resource}:${perm.action}`;
    const existingScope = permMap.get(key);
    const newScope = perm.scope as PermissionScope;

    if (!existingScope || scopePriority[newScope] > scopePriority[existingScope]) {
      permMap.set(key, newScope);
    }
  }

  return permMap;
}

/**
 * Look up the user's role inside a tenant (if they have a membership).
 * Phase 1a: returns null when the user isn't a member of the tenant
 * OR the tenant id is null (legacy techscoop.io context).
 */
export async function getTenantRole(userId: number, tenantId: number | null): Promise<TenantRole | null> {
  if (!tenantId) return null;
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select({ role: tenantMemberships.role })
    .from(tenantMemberships)
    .where(and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.tenantId, tenantId),
      eq(tenantMemberships.status, 'active'),
    ))
    .limit(1);

  return (rows[0]?.role as TenantRole) ?? null;
}

/**
 * Build RBAC context for a user, optionally scoped to a tenant.
 *
 * Tenant scope merges in tenant-membership permissions on top of any
 * global roles. A user can have both: e.g. techscoop.io editor + Acme
 * recruiter — they see editor-level access on apex requests, recruiter
 * access on acme.techscoop.com requests.
 */
export async function buildRbacContext(
  userId: number,
  tenantId: number | null = null,
): Promise<UserRbacContext> {
  const [userRoleNames, tenantRole] = await Promise.all([
    getUserRoles(userId),
    getTenantRole(userId, tenantId),
  ]);

  const userPermissions = await getRolePermissions(userRoleNames);

  // Merge tenant-role permissions if applicable. The tenant grid wins
  // on conflicts because the user is acting *inside* that tenant.
  if (tenantRole && TENANT_ROLE_PERMISSIONS[tenantRole]) {
    const scopePriority: Record<PermissionScope, number> = { all: 3, team: 2, own: 1 };
    for (const [key, scope] of Object.entries(TENANT_ROLE_PERMISSIONS[tenantRole])) {
      const existing = userPermissions.get(key);
      if (!existing || scopePriority[scope] > scopePriority[existing]) {
        userPermissions.set(key, scope);
      }
    }
  }

  const isSuperAdmin = userRoleNames.includes('super_admin');

  return {
    userId,
    tenantId,
    tenantRole,
    roles: userRoleNames,
    permissions: userPermissions,
    isSuperAdmin
  };
}

/**
 * Check if user has a specific permission
 */
export function checkPermission(
  context: UserRbacContext,
  resource: string,
  action: string
): PermissionCheckResult {
  // Super admin has all permissions
  if (context.isSuperAdmin) {
    return { allowed: true, scope: 'all' };
  }

  const key = `${resource}:${action}`;
  const scope = context.permissions.get(key);

  if (!scope) {
    return { 
      allowed: false, 
      scope: 'own',
      reason: `Missing permission: ${key}`
    };
  }

  return { allowed: true, scope };
}

/**
 * RBAC middleware factory for tRPC procedures.
 *
 * Reads `ctx.tenantId` (populated by the tenant extraction middleware)
 * so permission checks happen against the right scope: a user might
 * be an editor on apex but only a viewer inside Acme's tenant.
 */
export function requirePermission(resource: string, action: string) {
  return async ({
    ctx,
    next,
  }: {
    ctx: { user?: { id: number }; tenantId?: number | null };
    next: () => Promise<unknown>;
  }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    const rbacContext = await buildRbacContext(ctx.user.id, ctx.tenantId ?? null);
    const result = checkPermission(rbacContext, resource, action);

    if (!result.allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: result.reason || 'Insufficient permissions'
      });
    }

    return next();
  };
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: {
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    } as any);
  } catch (error) {
    console.error('[Audit] Failed to log event:', error);
  }
}

/**
 * Role hierarchy - check if a role inherits from another
 */
export async function roleInheritsFrom(childRole: string, parentRole: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get role with parent
  const [role] = await db.select({
    parentId: roles.parentRoleId
  })
    .from(roles)
    .where(eq(roles.name, childRole));

  if (!role || !role.parentId) return false;

  // Get parent role name
  const [parent] = await db.select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, role.parentId));

  if (!parent) return false;

  if (parent.name === parentRole) return true;

  // Recursively check parent's parent
  return roleInheritsFrom(parent.name, parentRole);
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  userId: number,
  roleName: string,
  assignedBy: number,
  expiresAt?: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get role ID
  const [role] = await db.select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName));

  if (!role) return false;

  // Check if user already has this role
  const [existing] = await db.select({ id: userRoles.id })
    .from(userRoles)
    .where(and(
      eq(userRoles.userId, userId),
      eq(userRoles.roleId, role.id)
    ));

  if (existing) {
    // Update existing assignment
    await db.update(userRoles)
      .set({
        expiresAt: expiresAt || null,
        assignedById: assignedBy
      } as any)
      .where(eq(userRoles.id, existing.id));
  } else {
    // Create new assignment
    await db.insert(userRoles).values({
      userId,
      roleId: role.id,
      assignedById: assignedBy,
      expiresAt: expiresAt || null
    } as any);
  }

  // Log audit event
  await logAuditEvent({
    userId: assignedBy,
    action: 'role_assigned',
    resourceType: 'user',
    resourceId: userId,
    changes: { role: roleName, expiresAt }
  });

  return true;
}

/**
 * Revoke a role from a user
 */
export async function revokeRole(
  userId: number,
  roleName: string,
  revokedBy: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get role ID
  const [role] = await db.select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName));

  if (!role) return false;

  // Delete the role assignment
  await db.delete(userRoles)
    .where(and(
      eq(userRoles.userId, userId),
      eq(userRoles.roleId, role.id)
    ));

  // Log audit event
  await logAuditEvent({
    userId: revokedBy,
    action: 'role_revoked',
    resourceType: 'user',
    resourceId: userId,
    changes: { role: roleName }
  });

  return true;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(context: UserRbacContext, roleNames: string[]): boolean {
  if (context.isSuperAdmin) return true;
  return roleNames.some(role => context.roles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(context: UserRbacContext, roleNames: string[]): boolean {
  if (context.isSuperAdmin) return true;
  return roleNames.every(role => context.roles.includes(role));
}
