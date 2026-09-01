/**
 * Workflow Admin Router
 * Manage editorial approval workflows, statuses, and transitions
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  workflowStatuses, 
  workflowTransitions,
  workflowAuditLog,
  users
} from "../../drizzle/schema";
import { workflowService } from "../services/workflow.service";

// ============================================================
// WORKFLOW ADMIN ROUTER
// ============================================================

export const workflowAdminRouter = router({
  /**
   * Get all workflow statuses
   */
  getStatuses: protectedProcedure
    .input(z.object({
      workflowType: z.enum(["editorial", "moderation"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input?.workflowType) {
        return db.select()
          .from(workflowStatuses)
          .where(eq(workflowStatuses.workflowType, input.workflowType))
          .orderBy(workflowStatuses.sortOrder);
      }

      return db.select()
        .from(workflowStatuses)
        .orderBy(workflowStatuses.sortOrder);
    }),

  /**
   * Get all workflow transitions
   */
  getTransitions: protectedProcedure
    .input(z.object({
      workflowType: z.enum(["editorial", "moderation"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allTransitions = await db.select().from(workflowTransitions);
      
      if (input?.workflowType) {
        // Filter by workflow type through status lookup
        const statuses = await db.select()
          .from(workflowStatuses)
          .where(eq(workflowStatuses.workflowType, input.workflowType));
        
        const statusIds = statuses.map(s => s.id);
        return allTransitions.filter(t => statusIds.includes(t.fromStatusId));
      }

      return allTransitions;
    }),

  /**
   * Create a new workflow status
   */
  createStatus: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      slug: z.string().min(1).max(64),
      workflowType: z.enum(["editorial", "moderation"]),
      color: z.string().optional(),
      description: z.string().optional(),
      isInitial: z.boolean().optional(),
      isFinal: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can manage workflows");
      }

      await db.insert(workflowStatuses).values({
        name: input.name,
        slug: input.slug,
        workflowType: input.workflowType,
        color: input.color,
        description: input.description,
        isInitial: input.isInitial ?? false,
        isFinal: input.isFinal ?? false,
        sortOrder: input.sortOrder ?? 0,
      } as any);

      const inserted = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.slug, input.slug))
        .limit(1);

      return inserted[0];
    }),

  /**
   * Update a workflow status
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can manage workflows");
      }

      const { id, ...updateData } = input;
      await db.update(workflowStatuses)
        .set(updateData as any)
        .where(eq(workflowStatuses.id, id));

      return { success: true };
    }),

  /**
   * Create a workflow transition
   */
  createTransition: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      workflowType: z.enum(["editorial", "moderation"]),
      fromStatusId: z.number(),
      toStatusId: z.number(),
      allowedRoles: z.array(z.string()),
      requiresComment: z.boolean().optional(),
      notifyRoles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can manage workflows");
      }

      await db.insert(workflowTransitions).values({
        name: input.name,
        workflowType: input.workflowType,
        fromStatusId: input.fromStatusId,
        toStatusId: input.toStatusId,
        allowedRoles: input.allowedRoles,
        requiresComment: input.requiresComment ?? false,
        notifyRoles: input.notifyRoles,
      } as any);

      return { success: true };
    }),

  /**
   * Delete a workflow transition
   */
  deleteTransition: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can manage workflows");
      }

      await db.delete(workflowTransitions).where(eq(workflowTransitions.id, input.id));
      return { success: true };
    }),

  /**
   * Get audit log for an entity
   */
  getAuditLog: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const logs = await db.select({
        id: workflowAuditLog.id,
        fromStatusId: workflowAuditLog.fromStatusId,
        toStatusId: workflowAuditLog.toStatusId,
        userId: workflowAuditLog.userId,
        comment: workflowAuditLog.comment,
        createdAt: workflowAuditLog.createdAt,
      })
        .from(workflowAuditLog)
        .where(and(
          eq(workflowAuditLog.entityType, input.entityType),
          eq(workflowAuditLog.entityId, input.entityId)
        ))
        .orderBy(desc(workflowAuditLog.createdAt));

      // Get status names and user info
      const statuses = await db.select().from(workflowStatuses);
      const statusMap = new Map(statuses.map(s => [s.id, s]));

      const userIds = Array.from(new Set(logs.map(l => l.userId).filter((id): id is number => id !== null)));
      const usersData = userIds.length > 0 
        ? await db.select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, userIds[0])) // Simplified for now
        : [];
      const userMap = new Map(usersData.map(u => [u.id, u]));

      return logs.map(log => ({
        ...log,
        fromStatus: log.fromStatusId ? statusMap.get(log.fromStatusId) : null,
        toStatus: log.toStatusId ? statusMap.get(log.toStatusId) : null,
        user: log.userId ? userMap.get(log.userId) : null,
      }));
    }),

  /**
   * Get editorial queue - articles and events pending review
   */
  getQueue: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      contentType: z.enum(["all", "article", "event"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Import tables
      const { articles, events } = await import("../../drizzle/schema");

      // Get all editorial statuses
      const statuses = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.workflowType, "editorial"));

      const draftStatus = statuses.find(s => s.slug === "draft");
      const publishedStatus = statuses.find(s => s.slug === "published");
      const rejectedStatus = statuses.find(s => s.slug === "rejected");

      // Get status IDs to exclude (draft, published, rejected)
      const excludeStatusIds = [
        draftStatus?.id,
        publishedStatus?.id,
        rejectedStatus?.id
      ].filter((id): id is number => id !== undefined);

      const statusMap = new Map(statuses.map(s => [s.id, s]));
      let result: Array<{
        id: number;
        title: string;
        slug: string;
        type: "article" | "event";
        status: string;
        statusName: string;
        statusColor: string;
        author: { id: number; name: string | null; avatar: string | null } | null;
        submittedAt: Date;
        updatedAt: Date;
        priority: "normal";
      }> = [];

      // Get articles if not filtered to events only
      if (!input?.contentType || input.contentType === "all" || input.contentType === "article") {
        const allArticles = await db.select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          statusId: articles.statusId,
          authorId: articles.authorId,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
        }).from(articles);

        let filteredArticles = allArticles;
        
        // Filter by specific status or exclude draft/published/rejected
        if (input?.status && input.status !== "all") {
          const statusObj = statuses.find(s => s.slug === input.status);
          if (statusObj) {
            filteredArticles = allArticles.filter(a => a.statusId === statusObj.id);
          }
        } else {
          filteredArticles = allArticles.filter(a => !excludeStatusIds.includes(a.statusId));
        }

        // Get author info
        const authorIds = Array.from(new Set(filteredArticles.map(a => a.authorId).filter((id): id is number => id !== null)));
        const authorsData = authorIds.length > 0
          ? await db.select({ id: users.id, name: users.name, avatar: users.avatar })
              .from(users)
          : [];
        const authorMap = new Map(authorsData.map(u => [u.id, u]));

        const articleItems = filteredArticles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          type: "article" as const,
          status: statusMap.get(article.statusId)?.slug || "unknown",
          statusName: statusMap.get(article.statusId)?.name || "Unknown",
          statusColor: statusMap.get(article.statusId)?.color || "#6B7280",
          author: article.authorId ? authorMap.get(article.authorId) || null : null,
          submittedAt: article.createdAt,
          updatedAt: article.updatedAt,
          priority: "normal" as const,
        }));

        result = [...result, ...articleItems as any];
      }

      // Get events if not filtered to articles only
      if (!input?.contentType || input.contentType === "all" || input.contentType === "event") {
        const allEvents = await db.select({
          id: events.id,
          title: events.title,
          slug: events.slug,
          statusId: events.statusId,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
        }).from(events);

        let filteredEvents = allEvents;
        
        // Filter by specific status or exclude draft/published/rejected
        if (input?.status && input.status !== "all") {
          const statusObj = statuses.find(s => s.slug === input.status);
          if (statusObj) {
            filteredEvents = allEvents.filter(e => e.statusId === statusObj.id);
          }
        } else {
          filteredEvents = allEvents.filter(e => !excludeStatusIds.includes(e.statusId));
        }

        const eventItems = filteredEvents.map(event => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          type: "event" as const,
          status: statusMap.get(event.statusId)?.slug || "unknown",
          statusName: statusMap.get(event.statusId)?.name || "Unknown",
          statusColor: statusMap.get(event.statusId)?.color || "#6B7280",
          author: null, // Events don't have authors
          submittedAt: event.createdAt,
          updatedAt: event.updatedAt,
          priority: "normal" as const,
        }));

        result = [...result, ...eventItems as any];
      }

      // Filter by search
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        result = result.filter(item => item.title.toLowerCase().includes(searchLower));
      }

      // Sort by updatedAt desc
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        items: result,
        counts: {
          all: result.length,
          submitted: result.filter(item => item.status === "submitted").length,
          editor_review: result.filter(item => item.status === "editor_review").length,
          senior_editor_review: result.filter(item => item.status === "senior_editor_review").length,
          approved: result.filter(item => item.status === "approved").length,
          scheduled: result.filter(item => item.status === "scheduled").length,
        }
      };
    }),

  /**
   * Get workflow statistics
   */
  getStats: protectedProcedure
    .input(z.object({
      workflowType: z.enum(["editorial", "moderation"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const statuses = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.workflowType, input.workflowType));

      // Get counts per status (simplified - would need actual entity queries)
      return {
        statuses: statuses.map(s => ({
          ...s,
          count: 0, // Would need to query actual entities
        })),
        totalTransitions: 0,
        recentActivity: [],
      };
    }),

  /**
   * Initialize default workflow statuses
   */
  initializeDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can initialize workflows");
      }

      // Initialize default statuses
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if statuses already exist
      const existing = await db.select().from(workflowStatuses).limit(1);
      if (existing.length > 0) {
        return { success: true, message: "Statuses already initialized" };
      }
      
      // Insert default editorial statuses
      const editorialStatuses = [
        { name: "Draft", slug: "draft", workflowType: "editorial" as const, isInitial: 1, sortOrder: 1, color: "#6B7280" },
        { name: "Submitted", slug: "submitted", workflowType: "editorial" as const, sortOrder: 2, color: "#3B82F6" },
        { name: "Editor Review", slug: "editor_review", workflowType: "editorial" as const, sortOrder: 3, color: "#F59E0B" },
        { name: "Senior Editor Review", slug: "senior_editor_review", workflowType: "editorial" as const, sortOrder: 4, color: "#8B5CF6" },
        { name: "Approved", slug: "approved", workflowType: "editorial" as const, sortOrder: 5, color: "#10B981" },
        { name: "Scheduled", slug: "scheduled", workflowType: "editorial" as const, sortOrder: 6, color: "#06B6D4" },
        { name: "Published", slug: "published", workflowType: "editorial" as const, isFinal: 1, sortOrder: 7, color: "#22C55E" },
        { name: "Rejected", slug: "rejected", workflowType: "editorial" as const, isFinal: 1, sortOrder: 8, color: "#EF4444" },
      ];
      
      for (const status of editorialStatuses) {
        await db.insert(workflowStatuses).values(status as any);
      }
      
      return { success: true, message: "Default statuses initialized" };
    }),
});
