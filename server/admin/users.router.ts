/**
 * Users Admin Router
 * Manage user accounts and roles
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, like, or, desc, asc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as bcrypt from "bcryptjs";

// Role enum matching the schema
const roleEnum = z.enum(["user", "admin", "editor", "senior_editor", "author", "moderator"]);

export const usersAdminRouter = router({
  // List all users with filtering and pagination
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      role: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Only admins can view user list
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { page, limit, search, role } = input;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];
      if (search) {
        conditions.push(
          or(
            sql`LOWER(${users.name}) LIKE LOWER(${`%${search}%`})`,
            sql`LOWER(${users.email}) LIKE LOWER(${`%${search}%`})`
          )
        );
      }
      if (role && role !== "all") {
        conditions.push(eq(users.role, role as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users
      const usersList = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          role: users.role,
          avatar: users.avatar,
          bio: users.bio,
          username: users.username,
          nickname: users.nickname,
          publicName: users.publicName,
          jobTitle: users.jobTitle,
          authorBio: users.authorBio,
          twitterHandle: users.twitterHandle,
          linkedinUrl: users.linkedinUrl,
          company: users.company,
          location: users.location,
          website: users.website,
          interests: users.interests,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      const total = countResult?.count || 0;

      return {
        users: usersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  // Update user role
  updateRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: roleEnum,
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Prevent self-demotion
      if (ctx.user?.id === input.userId && input.role !== "admin") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot change your own admin role" 
        });
      }

      await db
        .update(users)
        .set({ role: input.role } as any)
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  // Invite new user (create placeholder) with optional password
  invite: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      role: roleEnum.default("user"),
      password: z.string().min(6).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Check if email already exists
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "A user with this email already exists" 
        });
      }

      // Create a placeholder user with a temporary openId
      // They will get a real openId when they sign in via OAuth
      const tempOpenId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (input.password) {
        hashedPassword = await bcrypt.hash(input.password, 10);
      }

      const [result] = await db
        .insert(users)
        .values({
          openId: tempOpenId,
          email: input.email,
          name: input.name,
          role: input.role,
          password: hashedPassword,
          loginMethod: input.password ? 'password' : undefined,
        } as any);

      return { 
        success: true, 
        userId: result.insertId,
        message: input.password 
          ? "User created with password. They can now sign in." 
          : "User invited. They can now sign in with their email." 
      };
    }),

  // Admin change password for any user
  adminChangePassword: protectedProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if user exists
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!existingUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          loginMethod: 'password',
        } as any)
        .where(eq(users.id, input.userId));

      return { success: true, message: "Password updated successfully" };
    }),

  // User change own password
  changeOwnPassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get current user with password
      const [currentUser] = await db
        .select({ id: users.id, password: users.password })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!currentUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Verify current password
      if (!currentUser.password) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "No password set. Please contact admin to set a password." 
        });
      }

      const isValidPassword = await bcrypt.compare(input.currentPassword, currentUser.password);
      if (!isValidPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await db
        .update(users)
        .set({ password: hashedPassword } as any)
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "Password changed successfully" };
    }),

  // Get current user profile
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        bio: users.bio,
        username: users.username,
        nickname: users.nickname,
        publicName: users.publicName,
        jobTitle: users.jobTitle,
        authorBio: users.authorBio,
        twitterHandle: users.twitterHandle,
        linkedinUrl: users.linkedinUrl,
        loginMethod: users.loginMethod,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  // Update own profile
  updateMyProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      avatar: z.string().optional(),
      bio: z.string().optional(),
      username: z.string().max(64).optional(),
      nickname: z.string().max(128).optional(),
      publicName: z.string().max(255).optional(),
      jobTitle: z.string().max(128).optional(),
      authorBio: z.string().optional(),
      twitterHandle: z.string().max(64).optional(),
      linkedinUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check username uniqueness if provided
      if (input.username) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.username, input.username),
            sql`${users.id} != ${ctx.user.id}`
          ))
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already taken"
          });
        }
      }

      // Build update object
      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.avatar !== undefined) updateData.avatar = input.avatar || null;
      if (input.bio !== undefined) updateData.bio = input.bio || null;
      if (input.username !== undefined) updateData.username = input.username || null;
      if (input.nickname !== undefined) updateData.nickname = input.nickname || null;
      if (input.publicName !== undefined) updateData.publicName = input.publicName || null;
      if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle || null;
      if (input.authorBio !== undefined) updateData.authorBio = input.authorBio || null;
      if (input.twitterHandle !== undefined) updateData.twitterHandle = input.twitterHandle || null;
      if (input.linkedinUrl !== undefined) updateData.linkedinUrl = input.linkedinUrl || null;

      await db
        .update(users)
        .set(updateData as any)
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Delete user
  delete: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      // Prevent self-deletion
      if (ctx.user?.id === input.userId) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot delete your own account" 
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(users).where(eq(users.id, input.userId));

      return { success: true };
    }),

  // Update user profile
  update: protectedProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      role: roleEnum.optional(),
      username: z.string().max(64).optional(),
      nickname: z.string().max(128).optional(),
      publicName: z.string().max(255).optional(),
      jobTitle: z.string().max(128).optional(),
      authorBio: z.string().optional(),
      twitterHandle: z.string().max(64).optional(),
      linkedinUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Prevent role self-demotion
      if (ctx.user?.id === input.userId && input.role && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own admin role"
        });
      }

      // Check username uniqueness if provided
      if (input.username) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.username, input.username),
            sql`${users.id} != ${input.userId}`
          ))
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already taken"
          });
        }
      }

      // Build update object
      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.username !== undefined) updateData.username = input.username || null;
      if (input.nickname !== undefined) updateData.nickname = input.nickname || null;
      if (input.publicName !== undefined) updateData.publicName = input.publicName || null;
      if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle || null;
      if (input.authorBio !== undefined) updateData.authorBio = input.authorBio || null;
      if (input.twitterHandle !== undefined) updateData.twitterHandle = input.twitterHandle || null;
      if (input.linkedinUrl !== undefined) updateData.linkedinUrl = input.linkedinUrl || null;

      await db
        .update(users)
        .set(updateData as any)
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  // List all users for author selection (editors and above)
  listAuthors: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || !['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get all users who can be authors (editors, senior_editors, authors, admins)
    const authorsList = await db
      .select({
        id: users.id,
        name: users.name,
        publicName: users.publicName,
        username: users.username,
        avatar: users.avatar,
        role: users.role,
      })
      .from(users)
      .where(
        or(
          eq(users.role, 'admin'),
          eq(users.role, 'editor'),
          eq(users.role, 'senior_editor'),
          eq(users.role, 'author')
        )
      )
      .orderBy(asc(users.name));

    return authorsList;
  }),

  // Get user stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [adminResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "admin"));

    const [editorResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(or(eq(users.role, "editor"), eq(users.role, "senior_editor")));

    const [authorResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "author"));

    const [userResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "user"));

    return {
      total: totalResult?.count || 0,
      admins: adminResult?.count || 0,
      editors: editorResult?.count || 0,
      authors: authorResult?.count || 0,
      users: userResult?.count || 0,
    };
  }),
});
