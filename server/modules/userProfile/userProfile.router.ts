/**
 * User Profile Router - Public User Authentication and Profile Management
 * Handles user signup, profile management, and preferences
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { users, subscribers, subscriberLists, subscriptionLists } from "../../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../../_core/cookies";
import { sdk } from "../../_core/sdk";
import crypto from "crypto";
import { toDbDate } from "../../_core/dbValues";

// Generate a unique openId for new users
function generateOpenId(): string {
  return `user_${crypto.randomBytes(16).toString("hex")}`;
}

export const userProfileRouter = router({
  // ============================================================
  // USER REGISTRATION & PROFILE
  // ============================================================

  // Get current user's full profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const database = await getDb();
    if (!database) return null;

    const [user] = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        bio: users.bio,
        username: users.username,
        nickname: users.nickname,
        publicName: users.publicName,
        jobTitle: users.jobTitle,
        twitterHandle: users.twitterHandle,
        linkedinUrl: users.linkedinUrl,
        company: users.company,
        location: users.location,
        website: users.website,
        interests: users.interests,
        preferredLocations: users.preferredLocations,
        salaryMin: users.salaryMin,
        salaryMax: users.salaryMax,
        cvUrl: users.cvUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    if (!user) return null;

    // Get user's newsletter subscriptions
    const [subscriber] = await database
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, user.email ?? ""));

    let newsletterLists: { id: number; name: string; slug: string }[] = [];
    if (subscriber) {
      const lists = await database
        .select({
          id: subscriptionLists.id,
          name: subscriptionLists.name,
          slug: subscriptionLists.slug,
        })
        .from(subscriberLists)
        .innerJoin(subscriptionLists, eq(subscriberLists.listId, subscriptionLists.id))
        .where(and(
          eq(subscriberLists.subscriberId, subscriber.id),
          sql`${subscriberLists.unsubscribedAt} IS NULL`
        ));
      newsletterLists = lists;
    }

    return {
      ...user,
      newsletterSubscriptions: newsletterLists,
    };
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255).optional(),
      nickname: z.string().max(128).optional(),
      bio: z.string().max(1000).optional(),
      jobTitle: z.string().max(128).optional(),
      twitterHandle: z.string().max(64).optional(),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      avatar: z.string().url().optional(),
      company: z.string().max(255).optional(),
      location: z.string().max(255).optional(),
      website: z.string().url().optional().or(z.literal("")),
      interests: z.array(z.string()).optional(),
      preferredLocations: z.array(z.string()).optional(),
      salaryMin: z.number().min(0).optional().nullable(),
      salaryMax: z.number().min(0).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.nickname !== undefined) updateData.nickname = input.nickname || null;
      if (input.bio !== undefined) updateData.bio = input.bio || null;
      if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle || null;
      if (input.twitterHandle !== undefined) {
        updateData.twitterHandle = input.twitterHandle?.replace(/^@/, "") || null;
      }
      if (input.linkedinUrl !== undefined) updateData.linkedinUrl = input.linkedinUrl || null;
      if (input.avatar !== undefined) updateData.avatar = input.avatar || null;
      if (input.company !== undefined) updateData.company = input.company || null;
      if (input.location !== undefined) updateData.location = input.location || null;
      if (input.website !== undefined) updateData.website = input.website || null;
      if (input.interests !== undefined) updateData.interests = input.interests;
      if (input.preferredLocations !== undefined) updateData.preferredLocations = input.preferredLocations;
      if (input.salaryMin !== undefined) updateData.salaryMin = input.salaryMin;
      if (input.salaryMax !== undefined) updateData.salaryMax = input.salaryMax;

      await database.update(users).set(updateData as any).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Update username (URL-friendly identifier)
  updateUsername: protectedProcedure
    .input(z.object({
      username: z.string()
        .min(3)
        .max(64)
        .regex(/^[a-z0-9_-]+$/, "Username can only contain lowercase letters, numbers, underscores, and hyphens"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if username is already taken
      const [existing] = await database
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.username, input.username.toLowerCase()),
          sql`${users.id} != ${ctx.user.id}`
        ));

      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "This username is already taken" 
        });
      }

      await database
        .update(users)
        .set({ username: input.username.toLowerCase() } as any)
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // ============================================================
  // NEWSLETTER PREFERENCES
  // ============================================================

  // Get user's newsletter subscriptions
  getNewsletterSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id || !ctx.user?.email) {
      return [];
    }

    const database = await getDb();
    if (!database) return [];

    const [subscriber] = await database
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, ctx.user.email));

    if (!subscriber) return [];

    const lists = await database
      .select({
        id: subscriberLists.id,
        listId: subscriptionLists.id,
        name: subscriptionLists.name,
        slug: subscriptionLists.slug,
      })
      .from(subscriberLists)
      .innerJoin(subscriptionLists, eq(subscriberLists.listId, subscriptionLists.id))
      .where(and(
        eq(subscriberLists.subscriberId, subscriber.id),
        sql`${subscriberLists.unsubscribedAt} IS NULL`
      ));

    return lists;
  }),

  // Update single newsletter subscription
  updateNewsletterSubscription: protectedProcedure
    .input(z.object({
      listId: z.number(),
      subscribed: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id || !ctx.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get or create subscriber
      let [subscriber] = await database
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, ctx.user.email));

      if (!subscriber) {
        const [result] = await database.insert(subscribers).values({
          email: ctx.user.email,
          userId: ctx.user.id,
          firstName: ctx.user.name?.split(" ")[0] ?? null,
          lastName: ctx.user.name?.split(" ").slice(1).join(" ") ?? null,
          source: "profile",
          isVerified: 1,
          verifiedAt: toDbDate(new Date()),
        } as any);
        
        [subscriber] = await database
          .select()
          .from(subscribers)
          .where(eq(subscribers.id, result.insertId));
      }

      // Check if subscription exists
      const [existingSub] = await database
        .select()
        .from(subscriberLists)
        .where(and(
          eq(subscriberLists.subscriberId, subscriber.id),
          eq(subscriberLists.listId, input.listId)
        ));

      if (input.subscribed) {
        if (!existingSub) {
          // Create new subscription
          await database.insert(subscriberLists).values({
            subscriberId: subscriber.id,
            listId: input.listId,
          } as any);
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`${subscriptionLists.subscriberCount} + 1` } as any)
            .where(eq(subscriptionLists.id, input.listId));
        } else if (existingSub.unsubscribedAt) {
          // Resubscribe
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: null, subscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscriberLists.id, existingSub.id));
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`${subscriptionLists.subscriberCount} + 1` } as any)
            .where(eq(subscriptionLists.id, input.listId));
        }
      } else {
        if (existingSub && !existingSub.unsubscribedAt) {
          // Unsubscribe
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscriberLists.id, existingSub.id));
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`GREATEST(${subscriptionLists.subscriberCount} - 1, 0)` } as any)
            .where(eq(subscriptionLists.id, input.listId));
        }
      }

      return { success: true };
    }),

  // Update newsletter subscriptions (bulk)
  updateNewsletterPreferences: protectedProcedure
    .input(z.object({
      listSlugs: z.array(z.string()), // List of slugs to subscribe to
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id || !ctx.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get or create subscriber
      let [subscriber] = await database
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, ctx.user.email));

      if (!subscriber) {
        const [result] = await database.insert(subscribers).values({
          email: ctx.user.email,
          userId: ctx.user.id,
          firstName: ctx.user.name?.split(" ")[0] ?? null,
          lastName: ctx.user.name?.split(" ").slice(1).join(" ") ?? null,
          source: "profile",
          isVerified: 1,
          verifiedAt: toDbDate(new Date()),
        } as any);
        
        [subscriber] = await database
          .select()
          .from(subscribers)
          .where(eq(subscribers.id, result.insertId));
      }

      // Get all public lists
      const allLists = await database
        .select()
        .from(subscriptionLists)
        .where(eq(subscriptionLists.isPublic, 1));

      // Get current subscriptions
      const currentSubs = await database
        .select()
        .from(subscriberLists)
        .where(eq(subscriberLists.subscriberId, subscriber.id));

      const currentSubMap = new Map(currentSubs.map(s => [s.listId, s]));
      const targetListIds = new Set(
        allLists
          .filter(l => input.listSlugs.includes(l.slug))
          .map(l => l.id)
      );

      // Subscribe to new lists
      for (const list of allLists) {
        const isTargeted = targetListIds.has(list.id);
        const currentSub = currentSubMap.get(list.id);

        if (isTargeted && !currentSub) {
          // New subscription
          await database.insert(subscriberLists).values({
            subscriberId: subscriber.id,
            listId: list.id,
          } as any);
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`${subscriptionLists.subscriberCount} + 1` } as any)
            .where(eq(subscriptionLists.id, list.id));
        } else if (isTargeted && currentSub?.unsubscribedAt) {
          // Resubscribe
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: null, subscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscriberLists.id, currentSub.id));
        } else if (!isTargeted && currentSub && !currentSub.unsubscribedAt) {
          // Unsubscribe
          await database
            .update(subscriberLists)
            .set({ unsubscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscriberLists.id, currentSub.id));
          await database
            .update(subscriptionLists)
            .set({ subscriberCount: sql`GREATEST(${subscriptionLists.subscriberCount} - 1, 0)` } as any)
            .where(eq(subscriptionLists.id, list.id));
        }
      }

      return { success: true };
    }),

  // ============================================================
  // PUBLIC USER PAGES
  // ============================================================

  // Get public user profile by username
  getPublicProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const [user] = await database
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          nickname: users.nickname,
          publicName: users.publicName,
          avatar: users.avatar,
          bio: users.bio,
          authorBio: users.authorBio,
          jobTitle: users.jobTitle,
          twitterHandle: users.twitterHandle,
          linkedinUrl: users.linkedinUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.username, input.username.toLowerCase()));

      return user;
    }),

  // Check if username is available
  checkUsernameAvailability: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return { available: false };

      const [existing] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, input.username.toLowerCase()));

      return { available: !existing };
    }),

  // ============================================================
  // ACCOUNT MANAGEMENT
  // ============================================================

  // Delete account (soft delete - anonymize data)
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmation: z.literal("DELETE MY ACCOUNT"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Anonymize user data instead of hard delete
      await database
        .update(users)
        .set({
          name: "Deleted User",
          email: `deleted_${ctx.user.id}@deleted.local`,
          avatar: null,
          bio: null,
          username: `deleted_${ctx.user.id}`,
          nickname: null,
          publicName: null,
          authorBio: null,
          jobTitle: null,
          twitterHandle: null,
          linkedinUrl: null,
        } as any)
        .where(eq(users.id, ctx.user.id));

      // Unsubscribe from all newsletters
      if (ctx.user.email) {
        const [subscriber] = await database
          .select()
          .from(subscribers)
          .where(eq(subscribers.email, ctx.user.email));

        if (subscriber) {
          await database
            .update(subscribers)
            .set({ status: "unsubscribed", unsubscribedAt: toDbDate(new Date()) } as any)
            .where(eq(subscribers.id, subscriber.id));
        }
      }

      // Clear session
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return { success: true };
    }),
});
