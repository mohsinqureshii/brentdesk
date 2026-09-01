/**
 * RBAC Router - Role-Based Access Control Management
 * Handles roles, permissions, and user role assignments
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { roles, permissions, rolePermissions, userRoles, users, auditLogs } from "../../drizzle/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Helper to check if user has permission
async function checkPermission(userId: number, resource: string, action: string): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  // Get user's roles
  const userRolesList = await database
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(
      eq(userRoles.userId, userId),
      sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`
    ));

  if (userRolesList.length === 0) return false;

  const roleIds = userRolesList.map(ur => ur.roleId);

  // Check if any role has the required permission
  const hasPermission = await database
    .select({ id: permissions.id })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(
      inArray(rolePermissions.roleId, roleIds),
      eq(permissions.resource, resource),
      eq(permissions.action, action),
      eq(permissions.isActive, 1)
    ))
    .limit(1);

  return hasPermission.length > 0;
}

// Helper to log audit events
async function logAudit(
  userId: number | undefined,
  userEmail: string | undefined,
  action: string,
  resourceType: string,
  resourceId: number | undefined,
  changes: Record<string, unknown> | undefined,
  metadata?: Record<string, unknown>
) {
  const database = await getDb();
  if (!database) return;

  await database.insert(auditLogs).values({
    userId: userId ?? null,
    userEmail: userEmail ?? null,
    action,
    resourceType,
    resourceId: resourceId ?? null,
    changes: changes ? JSON.stringify(changes) : null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  } as any);
}

export const rbacRouter = router({
  // ============================================================
  // ROLES MANAGEMENT
  // ============================================================
  
  listRoles: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return [];

    const rolesList = await database
      .select()
      .from(roles)
      .orderBy(roles.roleType, roles.name);

    return rolesList;
  }),

  getRole: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return null;

      const [role] = await database
        .select()
        .from(roles)
        .where(eq(roles.id, input.id));

      if (!role) return null;

      // Get role's permissions
      const rolePerms = await database
        .select({
          permission: permissions,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, input.id));

      return {
        ...role,
        permissions: rolePerms.map(rp => rp.permission),
      };
    }),

  createRole: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      displayName: z.string().min(1).max(128),
      description: z.string().optional(),
      roleType: z.enum(["system", "external"]).default("system"),
      parentRoleId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(roles).values({
        name: input.name.toLowerCase().replace(/\s+/g, "_"),
        displayName: input.displayName,
        description: input.description ?? null,
        roleType: input.roleType,
        parentRoleId: input.parentRoleId ?? null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "create", "roles", result.insertId, input);

      return { success: true, id: result.insertId };
    }),

  updateRole: protectedProcedure
    .input(z.object({
      id: z.number(),
      displayName: z.string().min(1).max(128).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = {};
      if (input.displayName !== undefined) updateData.displayName = input.displayName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await database.update(roles).set(updateData as any).where(eq(roles.id, input.id));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "update", "roles", input.id, updateData);

      return { success: true };
    }),

  // ============================================================
  // PERMISSIONS MANAGEMENT
  // ============================================================

  listPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const database = await getDb();
    if (!database) return [];

    const permissionsList = await database
      .select()
      .from(permissions)
      .where(eq(permissions.isActive, 1))
      .orderBy(permissions.resource, permissions.action);

    // Group by resource
    const grouped: Record<string, typeof permissionsList> = {};
    for (const perm of permissionsList) {
      if (!grouped[perm.resource]) grouped[perm.resource] = [];
      grouped[perm.resource].push(perm);
    }

    return { permissions: permissionsList, grouped };
  }),

  // ============================================================
  // ROLE-PERMISSION ASSIGNMENTS
  // ============================================================

  assignPermissionToRole: protectedProcedure
    .input(z.object({
      roleId: z.number(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if already assigned
      const existing = await database
        .select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, input.roleId),
          eq(rolePermissions.permissionId, input.permissionId)
        ));

      if (existing.length > 0) {
        return { success: true, message: "Already assigned" };
      }

      await database.insert(rolePermissions).values({
        roleId: input.roleId,
        permissionId: input.permissionId,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "assign_permission", "role_permissions", input.roleId, input);

      return { success: true };
    }),

  removePermissionFromRole: protectedProcedure
    .input(z.object({
      roleId: z.number(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database
        .delete(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, input.roleId),
          eq(rolePermissions.permissionId, input.permissionId)
        ));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "remove_permission", "role_permissions", input.roleId, input);

      return { success: true };
    }),

  // ============================================================
  // USER-ROLE ASSIGNMENTS
  // ============================================================

  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return [];

      const userRolesList = await database
        .select({
          userRole: userRoles,
          role: roles,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, input.userId));

      return userRolesList;
    }),

  assignRoleToUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      roleId: z.number(),
      expiresAt: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if already assigned
      const existing = await database
        .select()
        .from(userRoles)
        .where(and(
          eq(userRoles.userId, input.userId),
          eq(userRoles.roleId, input.roleId)
        ));

      if (existing.length > 0) {
        // Update expiration if provided
        if (input.expiresAt) {
          await database
            .update(userRoles)
            .set({ expiresAt: new Date(input.expiresAt).toISOString() } as any)
            .where(and(
              eq(userRoles.userId, input.userId),
              eq(userRoles.roleId, input.roleId)
            ));
        }
        return { success: true, message: "Role updated" };
      }

      await database.insert(userRoles).values({
        userId: input.userId,
        roleId: input.roleId,
        assignedById: ctx.user?.id ?? null,
        expiresAt: input.expiresAt ? (typeof input.expiresAt === 'string' ? new Date(input.expiresAt).toISOString() : (input.expiresAt as any)?.toISOString?.()) : null,
      } as any);

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "assign_role", "user_roles", input.userId, input);

      return { success: true };
    }),

  removeRoleFromUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      roleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await database
        .delete(userRoles)
        .where(and(
          eq(userRoles.userId, input.userId),
          eq(userRoles.roleId, input.roleId)
        ));

      await logAudit(ctx.user?.id, ctx.user?.email ?? undefined, "remove_role", "user_roles", input.userId, input);

      return { success: true };
    }),

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  getAuditLogs: protectedProcedure
    .input(z.object({
      resourceType: z.string().optional(),
      resourceId: z.number().optional(),
      userId: z.number().optional(),
      action: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const database = await getDb();
      if (!database) return { logs: [], total: 0 };

      let query = database.select().from(auditLogs);
      
      const conditions = [];
      if (input.resourceType) conditions.push(eq(auditLogs.resourceType, input.resourceType));
      if (input.resourceId) conditions.push(eq(auditLogs.resourceId, input.resourceId));
      if (input.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input.action) conditions.push(eq(auditLogs.action, input.action));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const logs = await query
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(auditLogs);

      return {
        logs,
        total: countResult?.count ?? 0,
      };
    }),
});

export { checkPermission, logAudit };
