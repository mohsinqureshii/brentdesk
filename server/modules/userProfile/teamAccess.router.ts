/**
 * Team Access Management Router
 * Allows claimed profile owners to invite team members to manage their entities.
 * Team members can be given admin, editor, or viewer roles.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  entityTeamMembers,
  claimedProfiles,
  users,
  companies,
  people,
  investors,
  events,
  accelerators,
} from "../../../drizzle/schema";
import { eq, and, desc, sql, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const entityTypeEnum = z.enum(["person", "company", "accelerator", "event", "investor"]);

// Helper: Check if user is owner/admin of an entity via claimed profiles
async function verifyEntityOwnership(database: any, userId: number, entityType: string, entityId: number) {
  const [claim] = await database.select()
    .from(claimedProfiles)
    .where(and(
      eq(claimedProfiles.userId, userId),
      eq(claimedProfiles.entityType, entityType as any),
      eq(claimedProfiles.entityId, entityId),
      eq(claimedProfiles.status, "approved"),
      or(
        eq(claimedProfiles.role, "owner"),
        eq(claimedProfiles.role, "admin"),
      ),
    ));
  return !!claim;
}

// Helper: Check if user has any access to an entity (owner, team admin, or team member)
export async function hasEntityAccess(database: any, userId: number, entityType: string, entityId: number, minRole: "viewer" | "editor" | "admin" = "viewer") {
  // Check claimed profile ownership first
  const [claim] = await database.select()
    .from(claimedProfiles)
    .where(and(
      eq(claimedProfiles.userId, userId),
      eq(claimedProfiles.entityType, entityType as any),
      eq(claimedProfiles.entityId, entityId),
      eq(claimedProfiles.status, "approved"),
    ));

  if (claim) return { hasAccess: true, role: claim.role, source: "claim" as const };

  // Check team membership
  const roleHierarchy: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };
  const minRoleLevel = roleHierarchy[minRole] || 1;

  const [teamMember] = await database.select()
    .from(entityTeamMembers)
    .where(and(
      eq(entityTeamMembers.userId, userId),
      eq(entityTeamMembers.entityType, entityType as any),
      eq(entityTeamMembers.entityId, entityId),
      eq(entityTeamMembers.status, "accepted"),
    ));

  if (teamMember) {
    const memberRoleLevel = roleHierarchy[teamMember.role] || 1;
    if (memberRoleLevel >= minRoleLevel) {
      return { hasAccess: true, role: teamMember.role, source: "team" as const };
    }
  }

  return { hasAccess: false, role: null, source: null };
}

// Helper: Get entity name for caching
async function getEntityName(database: any, entityType: string, entityId: number): Promise<string> {
  const tableMap: Record<string, any> = {
    company: companies,
    person: people,
    investor: investors,
    event: events,
    accelerator: accelerators,
  };
  const table = tableMap[entityType];
  if (!table) return "Unknown";

  const nameField = entityType === "event" ? "title" : "name";
  const [entity] = await database.select({ name: table[nameField] })
    .from(table)
    .where(eq(table.id, entityId));

  return entity?.name || "Unknown";
}

export const teamAccessRouter = router({
  // List team members for an entity
  listTeamMembers: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Must be owner/admin of the entity or admin user
      const isOwner = await verifyEntityOwnership(database, ctx.user.id, input.entityType, input.entityId);
      const isAdmin = ctx.user.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only entity owners can manage team members" });
      }

      const members = await database.select({
        id: entityTeamMembers.id,
        entityType: entityTeamMembers.entityType,
        entityId: entityTeamMembers.entityId,
        entityName: entityTeamMembers.entityName,
        userId: entityTeamMembers.userId,
        invitedEmail: entityTeamMembers.invitedEmail,
        invitedByName: entityTeamMembers.invitedByName,
        role: entityTeamMembers.role,
        status: entityTeamMembers.status,
        acceptedAt: entityTeamMembers.acceptedAt,
        createdAt: entityTeamMembers.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
        .from(entityTeamMembers)
        .leftJoin(users, eq(entityTeamMembers.userId, users.id))
        .where(and(
          eq(entityTeamMembers.entityType, input.entityType),
          eq(entityTeamMembers.entityId, input.entityId),
          sql`${entityTeamMembers.status} != 'revoked'`,
        ))
        .orderBy(desc(entityTeamMembers.createdAt));

      // Get entity name for display
      const entityName = await getEntityName(database, input.entityType, input.entityId);

      return { members, isOwner, entityName };
    }),

  // Invite a team member
  inviteTeamMember: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.number(),
      email: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]).default("editor"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Must be owner/admin of the entity
      const isOwner = await verifyEntityOwnership(database, ctx.user.id, input.entityType, input.entityId);
      const isAdmin = ctx.user.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only entity owners can invite team members" });
      }

      // Check if already invited
      const [existing] = await database.select()
        .from(entityTeamMembers)
        .where(and(
          eq(entityTeamMembers.entityType, input.entityType),
          eq(entityTeamMembers.entityId, input.entityId),
          eq(entityTeamMembers.invitedEmail, input.email.toLowerCase()),
          sql`${entityTeamMembers.status} IN ('pending', 'accepted')`,
        ));

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This person has already been invited" });
      }

      // Check if the invited user exists in the system
      const [invitedUser] = await database.select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()));

      const entityName = await getEntityName(database, input.entityType, input.entityId);

      const [result] = await database.insert(entityTeamMembers).values({
        entityType: input.entityType,
        entityId: input.entityId,
        entityName,
        userId: invitedUser?.id || null,
        invitedEmail: input.email.toLowerCase(),
        invitedByUserId: ctx.user.id,
        invitedByName: ctx.user.name || "Unknown",
        role: input.role,
        status: invitedUser ? "accepted" : "pending", // Auto-accept if user exists
        acceptedAt: invitedUser ? new Date() : null,
      } as any);

      return { success: true, id: result.insertId, autoAccepted: !!invitedUser };
    }),

  // Update team member role
  updateTeamMemberRole: protectedProcedure
    .input(z.object({
      memberId: z.number(),
      role: z.enum(["admin", "editor", "viewer"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await database.select()
        .from(entityTeamMembers)
        .where(eq(entityTeamMembers.id, input.memberId));

      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Must be owner/admin of the entity
      const isOwner = await verifyEntityOwnership(database, ctx.user.id, member.entityType, member.entityId);
      const isAdmin = ctx.user.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await database.update(entityTeamMembers)
        .set({ role: input.role } as any)
        .where(eq(entityTeamMembers.id, input.memberId));

      return { success: true };
    }),

  // Remove (revoke) a team member
  removeTeamMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await database.select()
        .from(entityTeamMembers)
        .where(eq(entityTeamMembers.id, input.memberId));

      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Must be owner/admin of the entity
      const isOwner = await verifyEntityOwnership(database, ctx.user.id, member.entityType, member.entityId);
      const isAdmin = ctx.user.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await database.update(entityTeamMembers)
        .set({ status: "revoked" } as any)
        .where(eq(entityTeamMembers.id, input.memberId));

      return { success: true };
    }),

  // Get my team invitations (entities I've been invited to manage)
  myTeamAccess: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find by userId or by email
      const members = await database.select({
        id: entityTeamMembers.id,
        entityType: entityTeamMembers.entityType,
        entityId: entityTeamMembers.entityId,
        entityName: entityTeamMembers.entityName,
        role: entityTeamMembers.role,
        status: entityTeamMembers.status,
        invitedByName: entityTeamMembers.invitedByName,
        createdAt: entityTeamMembers.createdAt,
      })
        .from(entityTeamMembers)
        .where(and(
          or(
            eq(entityTeamMembers.userId, ctx.user.id),
            eq(entityTeamMembers.invitedEmail, ctx.user.email || ""),
          ),
          sql`${entityTeamMembers.status} IN ('pending', 'accepted')`,
        ))
        .orderBy(desc(entityTeamMembers.createdAt));

      return members;
    }),

  // Accept a team invitation
  acceptInvitation: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await database.select()
        .from(entityTeamMembers)
        .where(and(
          eq(entityTeamMembers.id, input.memberId),
          eq(entityTeamMembers.status, "pending"),
          or(
            eq(entityTeamMembers.userId, ctx.user.id),
            eq(entityTeamMembers.invitedEmail, ctx.user.email || ""),
          ),
        ));

      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });

      await database.update(entityTeamMembers)
        .set({
          status: "accepted",
          userId: ctx.user.id,
          acceptedAt: new Date(),
        } as any)
        .where(eq(entityTeamMembers.id, input.memberId));

      return { success: true };
    }),

  // Decline a team invitation
  declineInvitation: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await database.select()
        .from(entityTeamMembers)
        .where(and(
          eq(entityTeamMembers.id, input.memberId),
          eq(entityTeamMembers.status, "pending"),
          or(
            eq(entityTeamMembers.userId, ctx.user.id),
            eq(entityTeamMembers.invitedEmail, ctx.user.email || ""),
          ),
        ));

      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      await database.update(entityTeamMembers)
        .set({ status: "declined" } as any)
        .where(eq(entityTeamMembers.id, input.memberId));

      return { success: true };
    }),
});
