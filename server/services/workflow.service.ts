/**
 * Enterprise Workflow Service
 * Handles multi-step editorial approvals with configurable statuses and transitions
 */

import { publication } from "../../shared/publication";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { 
  workflowStatuses, 
  workflowTransitions, 
  workflowAuditLog,
  emailNotifications,
  users
} from "../../drizzle/schema";

// ============================================================
// TYPES
// ============================================================

export interface WorkflowStatusInput {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  workflowType: string;
  isInitial?: number | boolean;
  isFinal?: number | boolean;
  isPublished?: number | boolean;
}

export interface WorkflowTransitionInput {
  workflowType: string;
  fromStatusId: number;
  toStatusId: number;
  name: string;
  allowedRoles: string[];
  requiresComment?: boolean | number;
  notifyRoles?: string[];
}

export interface TransitionResult {
  success: boolean;
  newStatusId?: number;
  error?: string;
  auditLogId?: number;
}

export interface AvailableTransition {
  id: number;
  name: string;
  toStatusId: number;
  toStatusName: string;
  toStatusColor: string;
  requiresComment: boolean;
}

// ============================================================
// DEFAULT WORKFLOW CONFIGURATIONS
// ============================================================

export const DEFAULT_EDITORIAL_STATUSES: WorkflowStatusInput[] = [
  { name: "Draft", slug: "draft", color: "#6B7280", sortOrder: 1, workflowType: "editorial", isInitial: 1 },
  { name: "Submitted", slug: "submitted", color: "#3B82F6", sortOrder: 2, workflowType: "editorial" },
  { name: "Editor Review", slug: "editor_review", color: "#F59E0B", sortOrder: 3, workflowType: "editorial" },
  { name: "Senior Editor Review", slug: "senior_editor_review", color: "#8B5CF6", sortOrder: 4, workflowType: "editorial" },
  { name: "Approved", slug: "approved", color: "#10B981", sortOrder: 5, workflowType: "editorial" },
  { name: "Scheduled", slug: "scheduled", color: "#06B6D4", sortOrder: 6, workflowType: "editorial" },
  { name: "Published", slug: "published", color: "#22C55E", sortOrder: 7, workflowType: "editorial", isFinal: 1, isPublished: 1 },
  { name: "Needs Changes", slug: "needs_changes", color: "#EF4444", sortOrder: 8, workflowType: "editorial" },
  { name: "Rejected", slug: "rejected", color: "#DC2626", sortOrder: 9, workflowType: "editorial", isFinal: 1 },
  { name: "Archived", slug: "archived", color: "#9CA3AF", sortOrder: 10, workflowType: "editorial", isFinal: 1 }
];

export const DEFAULT_MODERATION_STATUSES: WorkflowStatusInput[] = [
  { name: "Pending", slug: "pending", color: "#F59E0B", sortOrder: 1, workflowType: "moderation", isInitial: 1 },
  { name: "Under Review", slug: "under_review", color: "#3B82F6", sortOrder: 2, workflowType: "moderation" },
  { name: "Approved", slug: "approved", color: "#22C55E", sortOrder: 3, workflowType: "moderation", isFinal: 1 },
  { name: "Rejected", slug: "rejected", color: "#EF4444", sortOrder: 4, workflowType: "moderation", isFinal: 1 }
];

// ============================================================
// WORKFLOW SERVICE CLASS
// ============================================================

export class WorkflowService {
  /**
   * Initialize default workflow statuses and transitions
   */
  async initializeWorkflows(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if already initialized
    const existing = await db.select().from(workflowStatuses).limit(1);
    if (existing.length > 0) return;

    // Insert editorial statuses
    for (const status of DEFAULT_EDITORIAL_STATUSES) {
      await db.insert(workflowStatuses).values({ ...status, isInitial: status.isInitial ? 1 : 0, isFinal: status.isFinal ? 1 : 0, isPublished: status.isPublished ? 1 : 0 } as any);
    }

    // Insert moderation statuses
    for (const status of DEFAULT_MODERATION_STATUSES) {
      await db.insert(workflowStatuses).values({ ...status, isInitial: status.isInitial ? 1 : 0, isFinal: status.isFinal ? 1 : 0, isPublished: status.isPublished ? 1 : 0 } as any);
    }

    // Get inserted statuses for transitions
    const allStatuses = await db.select().from(workflowStatuses);
    const statusMap = new Map(allStatuses.map(s => [s.slug, s.id]));

    // Define editorial transitions
    interface TransitionDef {
      from: string;
      to: string;
      name: string;
      workflowType: string;
      allowedRoles: string[];
      requiresComment?: boolean | number;
      notifyRoles?: string[];
    }
    const editorialTransitions: TransitionDef[] = [
      { from: "draft", to: "submitted", name: "Submit for Review", workflowType: "editorial", allowedRoles: ["author", "editor", "admin"], notifyRoles: ["editor"] },
      { from: "submitted", to: "editor_review", name: "Start Editor Review", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"] },
      { from: "submitted", to: "needs_changes", name: "Request Changes", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"], requiresComment: true, notifyRoles: ["author"] },
      { from: "editor_review", to: "senior_editor_review", name: "Escalate to Senior Editor", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"], notifyRoles: ["senior_editor"] },
      { from: "editor_review", to: "approved", name: "Approve", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"], notifyRoles: ["author"] },
      { from: "editor_review", to: "needs_changes", name: "Request Changes", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"], requiresComment: true, notifyRoles: ["author"] },
      { from: "senior_editor_review", to: "approved", name: "Approve", workflowType: "editorial", allowedRoles: ["senior_editor", "admin"], notifyRoles: ["author", "editor"] },
      { from: "senior_editor_review", to: "needs_changes", name: "Request Changes", workflowType: "editorial", allowedRoles: ["senior_editor", "admin"], requiresComment: true, notifyRoles: ["author"] },
      { from: "senior_editor_review", to: "rejected", name: "Reject", workflowType: "editorial", allowedRoles: ["senior_editor", "admin"], requiresComment: true, notifyRoles: ["author", "editor"] },
      { from: "approved", to: "scheduled", name: "Schedule Publication", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"] },
      { from: "approved", to: "published", name: "Publish Now", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"] },
      { from: "scheduled", to: "published", name: "Publish", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin", "system"] },
      { from: "needs_changes", to: "submitted", name: "Resubmit", workflowType: "editorial", allowedRoles: ["author", "editor", "admin"], notifyRoles: ["editor"] },
      { from: "needs_changes", to: "draft", name: "Return to Draft", workflowType: "editorial", allowedRoles: ["author", "editor", "admin"] },
      { from: "published", to: "archived", name: "Archive", workflowType: "editorial", allowedRoles: ["editor", "senior_editor", "admin"] },
      { from: "rejected", to: "draft", name: "Revise and Restart", workflowType: "editorial", allowedRoles: ["author", "editor", "admin"] }
    ];

    // Insert editorial transitions
    for (const t of editorialTransitions) {
      const fromId = statusMap.get(t.from);
      const toId = statusMap.get(t.to);
      if (fromId && toId) {
        await db.insert(workflowTransitions).values({
          workflowType: t.workflowType,
          fromStatusId: fromId,
          toStatusId: toId,
          name: t.name,
          allowedRoles: t.allowedRoles,
          requiresComment: t.requiresComment ? 1 : 0,
          notifyRoles: t.notifyRoles || []
        } as any);
      }
    }

    // Define moderation transitions
    const moderationTransitions: TransitionDef[] = [
      { from: "pending", to: "under_review", name: "Start Review", workflowType: "moderation", allowedRoles: ["moderator", "admin"] },
      { from: "under_review", to: "approved", name: "Approve", workflowType: "moderation", allowedRoles: ["moderator", "admin"] },
      { from: "under_review", to: "rejected", name: "Reject", workflowType: "moderation", allowedRoles: ["moderator", "admin"], requiresComment: true },
      { from: "pending", to: "approved", name: "Quick Approve", workflowType: "moderation", allowedRoles: ["moderator", "admin"] },
      { from: "pending", to: "rejected", name: "Quick Reject", workflowType: "moderation", allowedRoles: ["moderator", "admin"], requiresComment: true }
    ];

    // Insert moderation transitions
    for (const t of moderationTransitions) {
      const fromId = statusMap.get(t.from);
      const toId = statusMap.get(t.to);
      if (fromId && toId) {
        await db.insert(workflowTransitions).values({
          workflowType: t.workflowType,
          fromStatusId: fromId,
          toStatusId: toId,
          name: t.name,
          allowedRoles: t.allowedRoles,
          requiresComment: t.requiresComment ? 1 : 0,
          notifyRoles: t.notifyRoles || []
        } as any);
      }
    }
  }

  /**
   * Get all statuses for a workflow type
   */
  async getStatuses(workflowType: string): Promise<typeof workflowStatuses.$inferSelect[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.workflowType, workflowType))
      .orderBy(workflowStatuses.sortOrder);
  }

  /**
   * Get initial status for a workflow type
   */
  async getInitialStatus(workflowType: string): Promise<typeof workflowStatuses.$inferSelect | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(workflowStatuses)
      .where(and(
        eq(workflowStatuses.workflowType, workflowType),
        eq(workflowStatuses.isInitial, 1)
      ))
      .limit(1);

    return result[0];
  }

  /**
   * Get available transitions for current status and user role
   */
  async getAvailableTransitions(
    currentStatusId: number,
    userRole: string
  ): Promise<AvailableTransition[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const transitions = await db.select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.fromStatusId, currentStatusId));

    // Filter by role and get target status details
    const available: AvailableTransition[] = [];
    
    for (const t of transitions) {
      const roles = t.allowedRoles as string[];
      if (roles.includes(userRole) || roles.includes("admin")) {
        const toStatus = await db.select()
          .from(workflowStatuses)
          .where(eq(workflowStatuses.id, t.toStatusId))
          .limit(1);
        
        if (toStatus[0]) {
          available.push({
            id: t.id,
            name: t.name,
            toStatusId: t.toStatusId,
            toStatusName: toStatus[0].name,
            toStatusColor: toStatus[0].color || "#6B7280",
            requiresComment: !!t.requiresComment
          });
        }
      }
    }

    return available;
  }

  /**
   * Execute a workflow transition
   */
  async executeTransition(
    entityType: string,
    entityId: number,
    transitionId: number,
    userId: number,
    userRole: string,
    comment?: string
  ): Promise<TransitionResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get transition details
    const transition = await db.select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.id, transitionId))
      .limit(1);

    if (!transition[0]) {
      return { success: false, error: "Transition not found" };
    }

    const t = transition[0];
    const roles = t.allowedRoles as string[];

    // Check role permission
    if (!roles.includes(userRole) && userRole !== "admin") {
      return { success: false, error: "Not authorized for this transition" };
    }

    // Check if comment is required
    if (t.requiresComment && !comment) {
      return { success: false, error: "Comment is required for this transition" };
    }

    // Create audit log entry
    await db.insert(workflowAuditLog).values({
      entityType,
      entityId,
      fromStatusId: t.fromStatusId,
      toStatusId: t.toStatusId,
      userId,
      comment,
      metadata: { transitionName: t.name }
    } as any);

    // Queue email notifications if configured
    const notifyRoles = t.notifyRoles as string[] | null;
    if (notifyRoles && notifyRoles.length > 0) {
      await this.queueNotifications(entityType, entityId, t.name, notifyRoles, comment);
    }

    // SEO publish hooks: fire when transitioning into a `published` status,
    // for any entity type we expose publicly. This is the central catch — the
    // per-router publish hooks only cover direct create/update flows.
    try {
      const targetStatus = await db.select({ slug: workflowStatuses.slug, isPublished: workflowStatuses.isPublished })
        .from(workflowStatuses)
        .where(eq(workflowStatuses.id, t.toStatusId))
        .limit(1);
      if (targetStatus[0]?.isPublished) {
        const { firePublishHookForEntity } = await import("./publishHooks.workflow");
        // Fire-and-forget — must never block the transition
        firePublishHookForEntity(entityType, entityId, userId).catch(err => {
          console.error("[Workflow] publishHooks.workflow failed:", err);
        });
      }
    } catch (err) {
      console.error("[Workflow] publish-hook resolution error:", err);
    }

    return {
      success: true,
      newStatusId: t.toStatusId
    };
  }

  /**
   * Get audit history for an entity
   */
  async getAuditHistory(entityType: string, entityId: number): Promise<Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    userName: string | null;
    comment: string | null;
    createdAt: string;
  }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const logs = await db.select()
      .from(workflowAuditLog)
      .where(and(
        eq(workflowAuditLog.entityType, entityType),
        eq(workflowAuditLog.entityId, entityId)
      ))
      .orderBy(workflowAuditLog.createdAt);

    // Enrich with status names and user info
    const enriched = [];
    for (const log of logs) {
      let fromStatusName = null;
      let toStatusName = "Unknown";
      let userName = null;

      if (log.fromStatusId) {
        const fromStatus = await db.select()
          .from(workflowStatuses)
          .where(eq(workflowStatuses.id, log.fromStatusId))
          .limit(1);
        fromStatusName = fromStatus[0]?.name || null;
      }

      const toStatus = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.id, log.toStatusId))
        .limit(1);
      toStatusName = toStatus[0]?.name || "Unknown";

      const user = await db.select()
        .from(users)
        .where(eq(users.id, log.userId))
        .limit(1);
      userName = user[0]?.name || null;

      enriched.push({
        id: log.id,
        fromStatus: fromStatusName,
        toStatus: toStatusName,
        userName,
        comment: log.comment,
        createdAt: log.createdAt
      });
    }

    return enriched;
  }

  /**
   * Queue email notifications for workflow transitions
   */
  private async queueNotifications(
    entityType: string,
    entityId: number,
    transitionName: string,
    notifyRoles: string[],
    comment?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Get users with specified roles
    const usersToNotify = await db.select()
      .from(users)
      .where(inArray(users.role, notifyRoles as any));

    for (const user of usersToNotify) {
      if (user.email) {
        await db.insert(emailNotifications).values({
          recipientEmail: user.email,
          recipientUserId: user.id,
          subject: `[${publication.name}] ${entityType} workflow update: ${transitionName}`,
          body: `A ${entityType} (ID: ${entityId}) has been moved to "${transitionName}".${comment ? `\n\nComment: ${comment}` : ""}`,
          type: "workflow_transition",
          entityType,
          entityId,
          status: "pending"
        } as any);
      }
    }
  }

  /**
   * Add a custom status to a workflow
   */
  async addStatus(input: WorkflowStatusInput): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(workflowStatuses).values({
      ...input,
      isInitial: input.isInitial ? 1 : 0,
      isFinal: input.isFinal ? 1 : 0,
      isPublished: (input.isPublished ? 1 : 0) ? 1 : 0,
    } as any);
    const inserted = await db.select().from(workflowStatuses).where(eq(workflowStatuses.slug, input.slug)).limit(1);
    return inserted[0]?.id || 0;
  }

  /**
   * Add a custom transition
   */
  async addTransition(input: WorkflowTransitionInput): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(workflowTransitions).values({ ...input, requiresComment: input.requiresComment ? 1 : 0 } as any);
    return 0; // Return 0 as we don't need the ID for transitions
  }

  /**
   * Get status by slug
   */
  async getStatusBySlug(workflowType: string, slug: string): Promise<typeof workflowStatuses.$inferSelect | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(workflowStatuses)
      .where(and(
        eq(workflowStatuses.workflowType, workflowType),
        eq(workflowStatuses.slug, slug)
      ))
      .limit(1);

    return result[0];
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
