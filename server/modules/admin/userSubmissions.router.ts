/**
 * Admin User Submissions Moderation Router
 * Unified queue for reviewing user-submitted entities (companies, jobs, people, accelerators, investors, events)
 * Supports approve, reject (mandatory comment), and request-changes (mandatory comment) actions
 * Tracks full moderation history via workflowAuditLog
 */

import { z } from "zod";
import { eq, and, desc, sql, or, like, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import {
  companies,
  jobs,
  people,
  investors,
  events,
  accelerators,
  users,
  workflowStatuses,
  workflowAuditLog,
} from "../../../drizzle/schema";
import { workflowService } from "../../services/workflow.service";
import { toDbDate } from "../../_core/dbValues";

// ============================================================
// TYPES & HELPERS
// ============================================================

type EntityType = "company" | "job" | "person" | "investor" | "event" | "accelerator";

const entityTypeLabels: Record<EntityType, string> = {
  company: "Company",
  job: "Job",
  person: "Person",
  investor: "Investor",
  event: "Event",
  accelerator: "Accelerator",
};

function requireAdmin(ctx: { user: { role: string } }) {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

async function getStatusIdBySlug(slug: string): Promise<number | null> {
  const status = await workflowService.getStatusBySlug("editorial", slug);
  return status?.id ?? null;
}

async function getAllStatusMap(): Promise<Map<number, { name: string; slug: string; color: string }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const statuses = await db.select().from(workflowStatuses);
  return new Map(statuses.map(s => [s.id, { name: s.name, slug: s.slug ?? "", color: s.color ?? "#6B7280" }]));
}

// ============================================================
// ROUTER
// ============================================================

export const userSubmissionsRouter = router({
  // ============================================================
  // LIST ALL SUBMISSIONS (unified queue across all entity types)
  // ============================================================
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["submitted", "needs_changes", "rejected", "published", "all"]).default("submitted"),
        entityType: z.enum(["all", "company", "job", "person", "investor", "event", "accelerator"]).default("all"),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { status = "submitted", entityType = "all", search, page = 1, limit = 50 } = input ?? {};
      const offset = (page - 1) * limit;
      const statusMap = await getAllStatusMap();

      // Get target status IDs
      let targetStatusIds: number[] = [];
      if (status === "all") {
        targetStatusIds = Array.from(statusMap.keys());
      } else {
        const sid = await getStatusIdBySlug(status);
        if (sid) targetStatusIds = [sid];
      }

      // Query each entity type and unify results
      type SubmissionItem = {
        id: number;
        entityType: EntityType;
        name: string;
        slug: string;
        description: string | null;
        logoUrl: string | null;
        statusId: number;
        statusName: string;
        statusSlug: string;
        statusColor: string;
        createdByUserId: number | null;
        createdByName: string | null;
        createdByEmail: string | null;
        createdAt: string | null;
        updatedAt: string | null;
      };

      const items: SubmissionItem[] = [];

      // Helper to enrich with user info
      async function enrichWithUser(userId: number | null): Promise<{ name: string | null; email: string | null }> {
        if (!userId) return { name: null, email: null };
        const [user] = await db!.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
        return user ?? { name: null, email: null };
      }

      // Query companies
      if (entityType === "all" || entityType === "company") {
        const companyRows = await db
          .select({
            id: companies.id,
            name: companies.name,
            slug: companies.slug,
            description: companies.description,
            logoUrl: companies.logo,
            statusId: companies.statusId,
            createdByUserId: companies.createdByUserId,
            createdAt: companies.createdAt,
            updatedAt: companies.updatedAt,
          })
          .from(companies)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(companies.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${companies.name}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(companies.createdAt));

        for (const row of companyRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId);
          items.push({
            id: row.id,
            entityType: "company",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Query jobs
      if (entityType === "all" || entityType === "job") {
        const jobRows = await db
          .select({
            id: jobs.id,
            name: jobs.title,
            slug: jobs.slug,
            description: jobs.description,
            logoUrl: jobs.companyLogo,
            statusId: jobs.statusId,
            createdByUserId: jobs.postedById,
            createdAt: jobs.createdAt,
            updatedAt: jobs.updatedAt,
          })
          .from(jobs)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(jobs.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${jobs.title}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(jobs.createdAt));

        for (const row of jobRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId);
          items.push({
            id: row.id,
            entityType: "job",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Query people
      if (entityType === "all" || entityType === "person") {
        const personRows = await db
          .select({
            id: people.id,
            name: people.name,
            slug: people.slug,
            description: people.bio,
            logoUrl: people.avatar,
            statusId: people.statusId,
            createdByUserId: people.createdByUserId,
            createdAt: people.createdAt,
            updatedAt: people.updatedAt,
          })
          .from(people)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(people.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${people.name}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(people.createdAt));

        for (const row of personRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId);
          items.push({
            id: row.id,
            entityType: "person",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Query investors
      if (entityType === "all" || entityType === "investor") {
        const investorRows = await db
          .select({
            id: investors.id,
            name: investors.name,
            slug: investors.slug,
            description: investors.description,
            logoUrl: investors.logo,
            statusId: investors.statusId,
            createdByUserId: investors.createdByUserId,
            createdAt: investors.createdAt,
            updatedAt: investors.updatedAt,
          })
          .from(investors)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(investors.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${investors.name}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(investors.createdAt));

        for (const row of investorRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId);
          items.push({
            id: row.id,
            entityType: "investor",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Query events
      if (entityType === "all" || entityType === "event") {
        const eventRows = await db
          .select({
            id: events.id,
            name: events.title,
            slug: events.slug,
            description: events.description,
            logoUrl: events.featuredImage,
            statusId: events.statusId,
            createdByUserId: events.createdByUserId,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
          })
          .from(events)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(events.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${events.title}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(events.createdAt));

        for (const row of eventRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId);
          items.push({
            id: row.id,
            entityType: "event",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Query accelerators
      if (entityType === "all" || entityType === "accelerator") {
        const accelRows = await db
          .select({
            id: accelerators.id,
            name: accelerators.name,
            slug: accelerators.slug,
            description: accelerators.description,
            logoUrl: accelerators.logo,
            statusId: accelerators.statusId,
            createdByUserId: accelerators.createdById,
            createdAt: accelerators.createdAt,
            updatedAt: accelerators.updatedAt,
          })
          .from(accelerators)
          .where(
            and(
              targetStatusIds.length > 0 ? inArray(accelerators.statusId, targetStatusIds) : undefined,
              search ? sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${search}%`})` : undefined
            )
          )
          .orderBy(desc(accelerators.createdAt));

        for (const row of accelRows) {
          const user = await enrichWithUser(row.createdByUserId);
          const st = statusMap.get(row.statusId ?? 1);
          items.push({
            id: row.id,
            entityType: "accelerator",
            name: row.name,
            slug: row.slug,
            description: row.description,
            logoUrl: row.logoUrl,
            statusId: row.statusId ?? 1,
            statusName: st?.name ?? "Unknown",
            statusSlug: st?.slug ?? "unknown",
            statusColor: st?.color ?? "#6B7280",
            createdByUserId: row.createdByUserId,
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      }

      // Sort by createdAt desc
      items.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      // Filter only user-submitted items (createdByUserId is not null)
      const userSubmitted = items.filter(i => i.createdByUserId !== null);

      const total = userSubmitted.length;
      const paged = userSubmitted.slice(offset, offset + limit);

      return {
        items: paged,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // ============================================================
  // GET SUBMISSION DETAIL
  // ============================================================
  getDetail: protectedProcedure
    .input(
      z.object({
        entityType: z.enum(["company", "job", "person", "investor", "event", "accelerator"]),
        entityId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { entityType, entityId } = input;
      const statusMap = await getAllStatusMap();

      let entity: any = null;

      switch (entityType) {
        case "company": {
          const [row] = await db.select().from(companies).where(eq(companies.id, entityId)).limit(1);
          entity = row;
          break;
        }
        case "job": {
          const [row] = await db.select().from(jobs).where(eq(jobs.id, entityId)).limit(1);
          entity = row;
          break;
        }
        case "person": {
          const [row] = await db.select().from(people).where(eq(people.id, entityId)).limit(1);
          entity = row;
          break;
        }
        case "investor": {
          const [row] = await db.select().from(investors).where(eq(investors.id, entityId)).limit(1);
          entity = row;
          break;
        }
        case "event": {
          const [row] = await db.select().from(events).where(eq(events.id, entityId)).limit(1);
          entity = row;
          break;
        }
        case "accelerator": {
          const [row] = await db.select().from(accelerators).where(eq(accelerators.id, entityId)).limit(1);
          entity = row;
          break;
        }
      }

      if (!entity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }

      // Get submitter info
      const submitterUserId =
        entityType === "job" ? entity.postedById :
        entityType === "accelerator" ? entity.createdById :
        entity.createdByUserId;

      let submitter = null;
      if (submitterUserId) {
        const [user] = await db
          .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatar, role: users.role })
          .from(users)
          .where(eq(users.id, submitterUserId))
          .limit(1);
        submitter = user ?? null;
      }

      // Get moderation history from workflowAuditLog
      const history = await db
        .select({
          id: workflowAuditLog.id,
          fromStatusId: workflowAuditLog.fromStatusId,
          toStatusId: workflowAuditLog.toStatusId,
          userId: workflowAuditLog.userId,
          comment: workflowAuditLog.comment,
          metadata: workflowAuditLog.metadata,
          createdAt: workflowAuditLog.createdAt,
        })
        .from(workflowAuditLog)
        .where(
          and(
            eq(workflowAuditLog.entityType, entityType),
            eq(workflowAuditLog.entityId, entityId)
          )
        )
        .orderBy(desc(workflowAuditLog.createdAt));

      // Enrich history with user names and status names
      const enrichedHistory = await Promise.all(
        history.map(async (h) => {
          const [reviewer] = await db!
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, h.userId))
            .limit(1);

          const fromStatus = h.fromStatusId ? statusMap.get(h.fromStatusId) : null;
          const toStatus = statusMap.get(h.toStatusId);

          return {
            ...h,
            reviewerName: reviewer?.name ?? "System",
            fromStatusName: fromStatus?.name ?? null,
            fromStatusColor: fromStatus?.color ?? null,
            toStatusName: toStatus?.name ?? "Unknown",
            toStatusColor: toStatus?.color ?? "#6B7280",
          };
        })
      );

      // Get current status info
      const currentStatus = statusMap.get(entity.statusId);

      return {
        entity,
        entityType,
        submitter,
        currentStatus: currentStatus ?? { name: "Unknown", slug: "unknown", color: "#6B7280" },
        history: enrichedHistory,
      };
    }),

  // ============================================================
  // MODERATE SUBMISSION (approve, reject, request_changes)
  // ============================================================
  moderate: protectedProcedure
    .input(
      z.object({
        entityType: z.enum(["company", "job", "person", "investor", "event", "accelerator"]),
        entityId: z.number(),
        action: z.enum(["approve", "reject", "request_changes"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { entityType, entityId, action, comment } = input;

      // Validate mandatory comments for reject and request_changes
      if ((action === "reject" || action === "request_changes") && (!comment || comment.trim().length === 0)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Comment is required when ${action === "reject" ? "rejecting" : "requesting changes"}`,
        });
      }

      // Determine target status slug
      let targetSlug: string;
      switch (action) {
        case "approve":
          targetSlug = "published";
          break;
        case "reject":
          targetSlug = "rejected";
          break;
        case "request_changes":
          targetSlug = "needs_changes";
          break;
      }

      const targetStatus = await workflowService.getStatusBySlug("editorial", targetSlug);
      if (!targetStatus) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Status '${targetSlug}' not found` });
      }

      // Get current entity to find current statusId
      let currentStatusId: number;
      switch (entityType) {
        case "company": {
          const [row] = await db.select({ statusId: companies.statusId }).from(companies).where(eq(companies.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId;
          await db.update(companies).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(companies.id, entityId));
          break;
        }
        case "job": {
          const [row] = await db.select({ statusId: jobs.statusId }).from(jobs).where(eq(jobs.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId;
          await db.update(jobs).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(jobs.id, entityId));
          break;
        }
        case "person": {
          const [row] = await db.select({ statusId: people.statusId }).from(people).where(eq(people.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId;
          await db.update(people).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(people.id, entityId));
          break;
        }
        case "investor": {
          const [row] = await db.select({ statusId: investors.statusId }).from(investors).where(eq(investors.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId;
          await db.update(investors).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(investors.id, entityId));
          break;
        }
        case "event": {
          const [row] = await db.select({ statusId: events.statusId }).from(events).where(eq(events.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId;
          await db.update(events).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(events.id, entityId));
          break;
        }
        case "accelerator": {
          const [row] = await db.select({ statusId: accelerators.statusId }).from(accelerators).where(eq(accelerators.id, entityId)).limit(1);
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          currentStatusId = row.statusId ?? 1;
          await db.update(accelerators).set({ statusId: targetStatus.id, updatedAt: toDbDate(new Date()) } as any).where(eq(accelerators.id, entityId));
          break;
        }
      }

      // Log to audit trail
      await db.insert(workflowAuditLog).values({
        entityType,
        entityId,
        fromStatusId: currentStatusId!,
        toStatusId: targetStatus.id,
        userId: ctx.user.id,
        comment: comment?.trim() || null,
        metadata: JSON.stringify({ action, moderatedAt: new Date().toISOString() }),
      } as any);

      return {
        success: true,
        action,
        newStatus: targetStatus.name,
      };
    }),

  // ============================================================
  // GET MODERATION STATS (counts by status)
  // ============================================================
  stats: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const submittedId = await getStatusIdBySlug("submitted");
    const needsChangesId = await getStatusIdBySlug("needs_changes");
    const rejectedId = await getStatusIdBySlug("rejected");
    const publishedId = await getStatusIdBySlug("published");

    async function countByStatus(statusId: number | null): Promise<number> {
      if (!statusId) return 0;
      let total = 0;

      const [c1] = await db!.select({ c: sql<number>`COUNT(*)` }).from(companies).where(and(eq(companies.statusId, statusId), sql`${companies.createdByUserId} IS NOT NULL`));
      total += c1?.c ?? 0;

      const [c2] = await db!.select({ c: sql<number>`COUNT(*)` }).from(jobs).where(and(eq(jobs.statusId, statusId), sql`${jobs.postedById} IS NOT NULL`));
      total += c2?.c ?? 0;

      const [c3] = await db!.select({ c: sql<number>`COUNT(*)` }).from(people).where(and(eq(people.statusId, statusId), sql`${people.createdByUserId} IS NOT NULL`));
      total += c3?.c ?? 0;

      const [c4] = await db!.select({ c: sql<number>`COUNT(*)` }).from(investors).where(and(eq(investors.statusId, statusId), sql`${investors.createdByUserId} IS NOT NULL`));
      total += c4?.c ?? 0;

      const [c5] = await db!.select({ c: sql<number>`COUNT(*)` }).from(events).where(and(eq(events.statusId, statusId), sql`${events.createdByUserId} IS NOT NULL`));
      total += c5?.c ?? 0;

      const [c6] = await db!.select({ c: sql<number>`COUNT(*)` }).from(accelerators).where(and(eq(accelerators.statusId, statusId), sql`${accelerators.createdById} IS NOT NULL`));
      total += c6?.c ?? 0;

      return total;
    }

    return {
      submitted: await countByStatus(submittedId),
      needsChanges: await countByStatus(needsChangesId),
      rejected: await countByStatus(rejectedId),
      published: await countByStatus(publishedId),
    };
  }),

  // ============================================================
  // EXPORT SUBMISSIONS AS CSV
  // ============================================================
  exportCsv: protectedProcedure
    .input(
      z.object({
        status: z.enum(["submitted", "needs_changes", "rejected", "published", "all"]).default("all"),
        entityType: z.enum(["all", "company", "job", "person", "investor", "event", "accelerator"]).default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { status = "all", entityType = "all" } = input ?? {};
      const statusMap = await getAllStatusMap();

      let targetStatusIds: number[] = [];
      if (status === "all") {
        targetStatusIds = Array.from(statusMap.keys());
      } else {
        const sid = await getStatusIdBySlug(status);
        if (sid) targetStatusIds = [sid];
      }

      const rows: string[] = [];
      rows.push("Type,Name,Status,Submitted By,Email,Created At");

      async function getUserInfo(userId: number | null) {
        if (!userId) return { name: "N/A", email: "N/A" };
        const [u] = await db!.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
        return u ?? { name: "N/A", email: "N/A" };
      }

      function escapeCsv(val: string | null | undefined): string {
        if (!val) return "";
        return `"${val.replace(/"/g, '""')}"`;
      }

      if (entityType === "all" || entityType === "company") {
        const companyRows = await db.select().from(companies).where(
          and(targetStatusIds.length > 0 ? inArray(companies.statusId, targetStatusIds) : undefined, sql`${companies.createdByUserId} IS NOT NULL`)
        );
        for (const r of companyRows) {
          const u = await getUserInfo(r.createdByUserId);
          const st = statusMap.get(r.statusId);
          rows.push(`Company,${escapeCsv(r.name)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      if (entityType === "all" || entityType === "job") {
        const jobRows = await db.select().from(jobs).where(
          and(targetStatusIds.length > 0 ? inArray(jobs.statusId, targetStatusIds) : undefined, sql`${jobs.postedById} IS NOT NULL`)
        );
        for (const r of jobRows) {
          const u = await getUserInfo(r.postedById);
          const st = statusMap.get(r.statusId);
          rows.push(`Job,${escapeCsv(r.title)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      if (entityType === "all" || entityType === "person") {
        const personRows = await db.select().from(people).where(
          and(targetStatusIds.length > 0 ? inArray(people.statusId, targetStatusIds) : undefined, sql`${people.createdByUserId} IS NOT NULL`)
        );
        for (const r of personRows) {
          const u = await getUserInfo(r.createdByUserId);
          const st = statusMap.get(r.statusId);
          rows.push(`Person,${escapeCsv(r.name)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      if (entityType === "all" || entityType === "investor") {
        const investorRows = await db.select().from(investors).where(
          and(targetStatusIds.length > 0 ? inArray(investors.statusId, targetStatusIds) : undefined, sql`${investors.createdByUserId} IS NOT NULL`)
        );
        for (const r of investorRows) {
          const u = await getUserInfo(r.createdByUserId);
          const st = statusMap.get(r.statusId);
          rows.push(`Investor,${escapeCsv(r.name)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      if (entityType === "all" || entityType === "event") {
        const eventRows = await db.select().from(events).where(
          and(targetStatusIds.length > 0 ? inArray(events.statusId, targetStatusIds) : undefined, sql`${events.createdByUserId} IS NOT NULL`)
        );
        for (const r of eventRows) {
          const u = await getUserInfo(r.createdByUserId);
          const st = statusMap.get(r.statusId);
          rows.push(`Event,${escapeCsv(r.title)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      if (entityType === "all" || entityType === "accelerator") {
        const accelRows = await db.select().from(accelerators).where(
          and(targetStatusIds.length > 0 ? inArray(accelerators.statusId, targetStatusIds) : undefined, sql`${accelerators.createdById} IS NOT NULL`)
        );
        for (const r of accelRows) {
          const u = await getUserInfo(r.createdById);
          const st = statusMap.get(r.statusId ?? 1);
          rows.push(`Accelerator,${escapeCsv(r.name)},${st?.name ?? "Unknown"},${escapeCsv(u.name)},${escapeCsv(u.email)},${String(r.createdAt ?? "")}`);
        }
      }

      return rows.join("\n");
    }),
});
