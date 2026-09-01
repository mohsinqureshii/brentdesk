/**
 * Moderation Admin Router
 * Manage profile claims and suggested updates (Crunchbase-style)
 */

import { z } from "zod";
import { eq, desc, and, or } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  profileClaims, 
  suggestedUpdates,
  entityVersions,
  people,
  investors,
  users
} from "../../drizzle/schema";
import { moderationService } from "../services/moderation.service";

// ============================================================
// MODERATION ADMIN ROUTER
// ============================================================

export const moderationRouter = router({
  // --------------------------------------------------------
  // PROFILE CLAIMS
  // --------------------------------------------------------
  claims: router({
    /**
     * List all profile claims with filters
     */
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        entityType: z.enum(["person", "investor"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { page, limit, ...filters } = input;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (filters.status) conditions.push(eq(profileClaims.status, filters.status));
        if (filters.entityType) conditions.push(eq(profileClaims.entityType, filters.entityType));

        const allClaims = await db.select()
          .from(profileClaims)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(profileClaims.createdAt));

        const total = allClaims.length;
        const paginatedClaims = allClaims.slice(offset, offset + limit);

        // Enrich with entity names
        const enrichedClaims = await Promise.all(paginatedClaims.map(async (claim) => {
          let entityName = "Unknown";
          
          if (claim.entityType === "person") {
            const person = await db.select({ name: people.name })
              .from(people)
              .where(eq(people.id, claim.entityId))
              .limit(1);
            entityName = person[0]?.name || "Unknown Person";
          } else if (claim.entityType === "investor") {
            const investor = await db.select({ name: investors.name })
              .from(investors)
              .where(eq(investors.id, claim.entityId))
              .limit(1);
            entityName = investor[0]?.name || "Unknown Investor";
          }

          return { ...claim, entityName };
        }));

        return {
          items: enrichedClaims,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    /**
     * Get single claim details
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const claim = await db.select()
          .from(profileClaims)
          .where(eq(profileClaims.id, input.id))
          .limit(1);

        if (!claim[0]) return null;

        // Get entity details
        let entity = null;
        if (claim[0].entityType === "person") {
          const person = await db.select()
            .from(people)
            .where(eq(people.id, claim[0].entityId))
            .limit(1);
          entity = person[0];
        } else if (claim[0].entityType === "investor") {
          const investor = await db.select()
            .from(investors)
            .where(eq(investors.id, claim[0].entityId))
            .limit(1);
          entity = investor[0];
        }

        return { ...claim[0], entity };
      }),

    /**
     * Approve a profile claim
     */
    approve: protectedProcedure
      .input(z.object({
        claimId: z.number(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await moderationService.reviewClaim(
          input.claimId,
          {
            status: "approved",
            moderatorId: ctx.user.id,
            moderatorNotes: input.comment
          }
        );

        return { success: true };
      }),

    /**
     * Reject a profile claim
     */
    reject: protectedProcedure
      .input(z.object({
        claimId: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await moderationService.reviewClaim(
          input.claimId,
          {
            status: "rejected",
            moderatorId: ctx.user.id,
            moderatorNotes: input.reason
          }
        );

        return { success: true };
      }),

    /**
     * Request more information
     */
    requestMoreInfo: protectedProcedure
      .input(z.object({
        claimId: z.number(),
        questions: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        // For more info needed, we mark as rejected with notes
        await moderationService.reviewClaim(
          input.claimId,
          {
            status: "rejected",
            moderatorId: ctx.user.id,
            moderatorNotes: `More information needed: ${input.questions}`
          }
        );

        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // SUGGESTED UPDATES
  // --------------------------------------------------------
  updates: router({
    /**
     * List all suggested updates with filters
     */
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        entityType: z.enum(["person", "investor"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { page, limit, ...filters } = input;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (filters.status) conditions.push(eq(suggestedUpdates.status, filters.status));
        if (filters.entityType) conditions.push(eq(suggestedUpdates.entityType, filters.entityType));

        const allUpdates = await db.select()
          .from(suggestedUpdates)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(suggestedUpdates.createdAt));

        const total = allUpdates.length;
        const paginatedUpdates = allUpdates.slice(offset, offset + limit);

        // Enrich with entity names
        const enrichedUpdates = await Promise.all(paginatedUpdates.map(async (update) => {
          let entityName = "Unknown";
          
          if (update.entityType === "person") {
            const person = await db.select({ name: people.name })
              .from(people)
              .where(eq(people.id, update.entityId))
              .limit(1);
            entityName = person[0]?.name || "Unknown Person";
          } else if (update.entityType === "investor") {
            const investor = await db.select({ name: investors.name })
              .from(investors)
              .where(eq(investors.id, update.entityId))
              .limit(1);
            entityName = investor[0]?.name || "Unknown Investor";
          }

          return { ...update, entityName };
        }));

        return {
          items: enrichedUpdates,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    /**
     * Get single update with diff view
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const update = await db.select()
          .from(suggestedUpdates)
          .where(eq(suggestedUpdates.id, input.id))
          .limit(1);

        if (!update[0]) return null;

        // Get current entity data for comparison
        let currentData = null;
        if (update[0].entityType === "person") {
          const person = await db.select()
            .from(people)
            .where(eq(people.id, update[0].entityId))
            .limit(1);
          currentData = person[0];
        } else if (update[0].entityType === "investor") {
          const investor = await db.select()
            .from(investors)
            .where(eq(investors.id, update[0].entityId))
            .limit(1);
          currentData = investor[0];
        }

        return {
          ...update[0],
          currentData,
        };
      }),

    /**
     * Approve a suggested update
     */
    approve: protectedProcedure
      .input(z.object({
        updateId: z.number(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await moderationService.reviewUpdate(
          input.updateId,
          {
            status: "approved",
            moderatorId: ctx.user.id,
            moderatorNotes: input.comment
          }
        );

        return { success: true };
      }),

    /**
     * Reject a suggested update
     */
    reject: protectedProcedure
      .input(z.object({
        updateId: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await moderationService.reviewUpdate(
          input.updateId,
          {
            status: "rejected",
            moderatorId: ctx.user.id,
            moderatorNotes: input.reason
          }
        );

        return { success: true };
      }),

    /**
     * Partially approve (select specific fields)
     */
    partialApprove: protectedProcedure
      .input(z.object({
        updateId: z.number(),
        approvedFields: z.array(z.string()),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "moderator"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        // For partial approval, we'd need to extend the service
        // For now, treat as approved
        await moderationService.reviewUpdate(
          input.updateId,
          {
            status: "approved",
            moderatorId: ctx.user.id,
            moderatorNotes: `Partial approval: ${input.approvedFields.join(", ")}. ${input.comment || ""}`
          }
        );

        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // VERSION HISTORY
  // --------------------------------------------------------
  history: router({
    /**
     * Get version history for an entity
     */
    get: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return moderationService.getVersionHistory(input.entityType, input.entityId);
      }),

    /**
     * Compare two versions
     */
    compare: protectedProcedure
      .input(z.object({
        versionId1: z.number(),
        versionId2: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const versions = await db.select()
          .from(entityVersions)
          .where(or(
            eq(entityVersions.id, input.versionId1),
            eq(entityVersions.id, input.versionId2)
          ));

        if (versions.length !== 2) {
          throw new Error("One or both versions not found");
        }

        const v1 = versions.find(v => v.id === input.versionId1);
        const v2 = versions.find(v => v.id === input.versionId2);

        // Generate diff
        const diff: Record<string, { old: unknown; new: unknown }> = {};
        const data1 = v1?.data as Record<string, unknown> || {};
        const data2 = v2?.data as Record<string, unknown> || {};

        const allKeys = Array.from(new Set([...Object.keys(data1), ...Object.keys(data2)]));
        
        for (const key of allKeys) {
          if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
            diff[key] = { old: data1[key], new: data2[key] };
          }
        }

        return {
          version1: v1,
          version2: v2,
          diff,
        };
      }),
  }),

  // --------------------------------------------------------
  // MODERATION STATS
  // --------------------------------------------------------
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { gte } = await import("drizzle-orm");

      if (!["admin", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Get pending counts
      const pendingClaims = await db.select()
        .from(profileClaims)
        .where(eq(profileClaims.status, "pending"));

      const pendingUpdates = await db.select()
        .from(suggestedUpdates)
        .where(eq(suggestedUpdates.status, "pending"));

      // Get today's start timestamp
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's approved/rejected counts
      const allClaims = await db.select().from(profileClaims);
      const allUpdates = await db.select().from(suggestedUpdates);

      const approvedToday = allClaims.filter(c => 
        c.status === "approved" && c.reviewedAt && new Date(c.reviewedAt) >= today
      ).length + allUpdates.filter(u => 
        u.status === "approved" && u.reviewedAt && new Date(u.reviewedAt) >= today
      ).length;

      const rejectedToday = allClaims.filter(c => 
        c.status === "rejected" && c.reviewedAt && new Date(c.reviewedAt) >= today
      ).length + allUpdates.filter(u => 
        u.status === "rejected" && u.reviewedAt && new Date(u.reviewedAt) >= today
      ).length;

      // Get recent activity
      const recentClaims = await db.select()
        .from(profileClaims)
        .orderBy(desc(profileClaims.createdAt))
        .limit(5);

      const recentUpdates = await db.select()
        .from(suggestedUpdates)
        .orderBy(desc(suggestedUpdates.createdAt))
        .limit(5);

      return {
        pendingClaims: pendingClaims.length,
        pendingUpdates: pendingUpdates.length,
        approvedToday,
        rejectedToday,
        recentClaims,
        recentUpdates,
      };
    }),
});
