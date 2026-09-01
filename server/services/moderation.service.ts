/**
 * Moderation Service
 * Handles profile claims, suggested updates, and version history (Crunchbase-style)
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { 
  profileClaims, 
  suggestedUpdates, 
  entityVersions,
  emailNotifications,
  people,
  investors,
  users
} from "../../drizzle/schema";

// ============================================================
// TYPES
// ============================================================

export interface ClaimProfileInput {
  entityType: "person" | "investor";
  entityId: number;
  claimantUserId?: number;
  claimantName: string;
  claimantEmail: string;
  claimantRole?: string;
  proofLinks?: string[];
  proofDocumentId?: number;
}

export interface SuggestUpdateInput {
  entityType: string;
  entityId: number;
  submitterUserId?: number;
  submitterName?: string;
  submitterEmail?: string;
  proposedChanges: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  evidenceLinks?: string[];
  evidenceDocumentId?: number;
}

export interface ModerationDecision {
  status: "approved" | "rejected";
  moderatorId: number;
  moderatorNotes?: string;
}

export interface ModerationQueueFilters {
  entityType?: string;
  status?: "pending" | "approved" | "rejected";
  type?: "claim" | "update";
  page?: number;
  limit?: number;
}

export interface ModerationQueueItem {
  id: number;
  type: "claim" | "update";
  entityType: string;
  entityId: number;
  entityName: string;
  submitterName: string | null;
  submitterEmail: string | null;
  status: string;
  createdAt: string;
  proposedChanges?: Record<string, unknown>;
  proofLinks?: string[];
}

// ============================================================
// MODERATION SERVICE CLASS
// ============================================================

export class ModerationService {
  /**
   * Submit a profile claim request
   */
  async submitClaim(input: ClaimProfileInput): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if there's already a pending claim for this entity
    const existingClaim = await db.select()
      .from(profileClaims)
      .where(and(
        eq(profileClaims.entityType, input.entityType),
        eq(profileClaims.entityId, input.entityId),
        eq(profileClaims.status, "pending")
      ))
      .limit(1);

    if (existingClaim.length > 0) {
      throw new Error("A pending claim already exists for this profile");
    }

    await db.insert(profileClaims).values({
      entityType: input.entityType,
      entityId: input.entityId,
      claimantUserId: input.claimantUserId,
      claimantName: input.claimantName,
      claimantEmail: input.claimantEmail,
      claimantRole: input.claimantRole,
      proofLinks: input.proofLinks || [],
      proofDocumentId: input.proofDocumentId,
      status: "pending"
    } as any);

    // Queue notification to moderators
    await this.notifyModerators("New profile claim submitted", input.entityType, input.entityId);

    // Get the inserted claim ID
    const inserted = await db.select()
      .from(profileClaims)
      .where(and(
        eq(profileClaims.entityType, input.entityType),
        eq(profileClaims.entityId, input.entityId),
        eq(profileClaims.claimantEmail, input.claimantEmail)
      ))
      .orderBy(desc(profileClaims.createdAt))
      .limit(1);

    return inserted[0]?.id || 0;
  }

  /**
   * Submit a suggested update
   */
  async submitUpdate(input: SuggestUpdateInput): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(suggestedUpdates).values({
      entityType: input.entityType,
      entityId: input.entityId,
      submitterUserId: input.submitterUserId,
      submitterName: input.submitterName,
      submitterEmail: input.submitterEmail,
      proposedChanges: input.proposedChanges,
      reason: input.reason,
      evidenceLinks: input.evidenceLinks || [],
      evidenceDocumentId: input.evidenceDocumentId,
      status: "pending"
    } as any);

    // Queue notification to moderators
    await this.notifyModerators("New update suggestion submitted", input.entityType, input.entityId);

    // Get the inserted update ID
    const inserted = await db.select()
      .from(suggestedUpdates)
      .where(and(
        eq(suggestedUpdates.entityType, input.entityType),
        eq(suggestedUpdates.entityId, input.entityId)
      ))
      .orderBy(desc(suggestedUpdates.createdAt))
      .limit(1);

    return inserted[0]?.id || 0;
  }

  /**
   * Review a profile claim
   */
  async reviewClaim(claimId: number, decision: ModerationDecision): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const claim = await db.select()
      .from(profileClaims)
      .where(eq(profileClaims.id, claimId))
      .limit(1);

    if (!claim[0]) {
      throw new Error("Claim not found");
    }

    // Update claim status
    await db.update(profileClaims)
      .set({
        status: decision.status,
        moderatorId: decision.moderatorId,
        moderatorNotes: decision.moderatorNotes,
        reviewedAt: new Date()
      } as any)
      .where(eq(profileClaims.id, claimId));

    // If approved, update the entity's claimedByUserId
    if (decision.status === "approved" && claim[0].claimantUserId) {
      if (claim[0].entityType === "person") {
        await db.update(people)
          .set({
            claimedByUserId: claim[0].claimantUserId,
            isVerified: 1
          } as any)
          .where(eq(people.id, claim[0].entityId));
      } else if (claim[0].entityType === "investor") {
        await db.update(investors)
          .set({
            claimedByUserId: claim[0].claimantUserId,
            isVerified: 1
          } as any)
          .where(eq(investors.id, claim[0].entityId));
      }
    }

    // Notify claimant
    await this.notifyClaimant(claim[0].claimantEmail, decision.status, claim[0].entityType);
  }

  /**
   * Review a suggested update
   */
  async reviewUpdate(updateId: number, decision: ModerationDecision): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const update = await db.select()
      .from(suggestedUpdates)
      .where(eq(suggestedUpdates.id, updateId))
      .limit(1);

    if (!update[0]) {
      throw new Error("Update suggestion not found");
    }

    // Update suggestion status
    await db.update(suggestedUpdates)
      .set({
        status: decision.status,
        moderatorId: decision.moderatorId,
        moderatorNotes: decision.moderatorNotes,
        reviewedAt: new Date()
      } as any)
      .where(eq(suggestedUpdates.id, updateId));

    // If approved, apply the changes and create version history
    if (decision.status === "approved") {
      await this.applyChanges(
        update[0].entityType,
        update[0].entityId,
        update[0].proposedChanges as Record<string, { old: unknown; new: unknown }>,
        decision.moderatorId,
        updateId
      );
    }

    // Notify submitter if email provided
    if (update[0].submitterEmail) {
      await this.notifySubmitter(update[0].submitterEmail, decision.status, update[0].entityType);
    }
  }

  /**
   * Apply approved changes to an entity
   */
  private async applyChanges(
    entityType: string,
    entityId: number,
    changes: Record<string, { old: unknown; new: unknown }>,
    moderatorId: number,
    suggestedUpdateId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Get current entity data for version history
    let currentData: Record<string, unknown> = {};
    let table: any;

    if (entityType === "person") {
      const result = await db.select().from(people).where(eq(people.id, entityId)).limit(1);
      currentData = result[0] as Record<string, unknown> || {};
      table = people;
    } else if (entityType === "investor") {
      const result = await db.select().from(investors).where(eq(investors.id, entityId)).limit(1);
      currentData = result[0] as Record<string, unknown> || {};
      table = investors;
    }

    // Get current version number
    const versions = await db.select()
      .from(entityVersions)
      .where(and(
        eq(entityVersions.entityType, entityType),
        eq(entityVersions.entityId, entityId)
      ))
      .orderBy(desc(entityVersions.version))
      .limit(1);

    const newVersion = (versions[0]?.version || 0) + 1;

    // Create version history entry
    await db.insert(entityVersions).values({
      entityType,
      entityId,
      version: newVersion,
      data: currentData,
      changedFields: Object.keys(changes),
      changedByUserId: moderatorId,
      changeReason: "Approved suggested update",
      suggestedUpdateId
    } as any);

    // Apply the changes
    const updateData: Record<string, unknown> = {};
    for (const [field, change] of Object.entries(changes)) {
      updateData[field] = change.new;
    }

    if (table && Object.keys(updateData).length > 0) {
      await db.update(table)
        .set(updateData as any)
        .where(eq(table.id, entityId));
    }
  }

  /**
   * Get moderation queue with filters
   */
  async getQueue(filters: ModerationQueueFilters): Promise<{
    items: ModerationQueueItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const items: ModerationQueueItem[] = [];

    // Get claims if not filtered to updates only
    if (!filters.type || filters.type === "claim") {
      let claimsQuery = db.select().from(profileClaims);
      
      if (filters.entityType) {
        claimsQuery = claimsQuery.where(eq(profileClaims.entityType, filters.entityType)) as typeof claimsQuery;
      }
      if (filters.status) {
        claimsQuery = claimsQuery.where(eq(profileClaims.status, filters.status)) as typeof claimsQuery;
      }

      const claims = await claimsQuery.orderBy(desc(profileClaims.createdAt));

      for (const claim of claims) {
        const entityName = await this.getEntityName(claim.entityType, claim.entityId);
        items.push({
          id: claim.id,
          type: "claim",
          entityType: claim.entityType,
          entityId: claim.entityId,
          entityName,
          submitterName: claim.claimantName,
          submitterEmail: claim.claimantEmail,
          status: claim.status,
          createdAt: claim.createdAt,
          proofLinks: claim.proofLinks as string[] | undefined
        });
      }
    }

    // Get updates if not filtered to claims only
    if (!filters.type || filters.type === "update") {
      let updatesQuery = db.select().from(suggestedUpdates);
      
      if (filters.entityType) {
        updatesQuery = updatesQuery.where(eq(suggestedUpdates.entityType, filters.entityType)) as typeof updatesQuery;
      }
      if (filters.status) {
        updatesQuery = updatesQuery.where(eq(suggestedUpdates.status, filters.status)) as typeof updatesQuery;
      }

      const updates = await updatesQuery.orderBy(desc(suggestedUpdates.createdAt));

      for (const update of updates) {
        const entityName = await this.getEntityName(update.entityType, update.entityId);
        items.push({
          id: update.id,
          type: "update",
          entityType: update.entityType,
          entityId: update.entityId,
          entityName,
          submitterName: update.submitterName,
          submitterEmail: update.submitterEmail,
          status: update.status,
          createdAt: update.createdAt,
          proposedChanges: update.proposedChanges as Record<string, unknown>
        });
      }
    }

    // Sort by createdAt descending
    items.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get version history for an entity
   */
  async getVersionHistory(entityType: string, entityId: number): Promise<Array<{
    version: number;
    changedFields: string[];
    changedByName: string | null;
    changeReason: string | null;
    createdAt: string;
  }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const versions = await db.select()
      .from(entityVersions)
      .where(and(
        eq(entityVersions.entityType, entityType),
        eq(entityVersions.entityId, entityId)
      ))
      .orderBy(desc(entityVersions.version));

    const enriched = [];
    for (const v of versions) {
      let changedByName = null;
      if (v.changedByUserId) {
        const user = await db.select()
          .from(users)
          .where(eq(users.id, v.changedByUserId))
          .limit(1);
        changedByName = user[0]?.name || null;
      }

      enriched.push({
        version: v.version,
        changedFields: v.changedFields as string[] || [],
        changedByName,
        changeReason: v.changeReason,
        createdAt: v.createdAt
      });
    }

    return enriched;
  }

  /**
   * Get a specific version of an entity
   */
  async getVersion(entityType: string, entityId: number, version: number): Promise<Record<string, unknown> | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(entityVersions)
      .where(and(
        eq(entityVersions.entityType, entityType),
        eq(entityVersions.entityId, entityId),
        eq(entityVersions.version, version)
      ))
      .limit(1);

    return result[0]?.data as Record<string, unknown> || null;
  }

  /**
   * Get claim details
   */
  async getClaim(claimId: number): Promise<typeof profileClaims.$inferSelect | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(profileClaims)
      .where(eq(profileClaims.id, claimId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get update suggestion details
   */
  async getUpdate(updateId: number): Promise<typeof suggestedUpdates.$inferSelect | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(suggestedUpdates)
      .where(eq(suggestedUpdates.id, updateId))
      .limit(1);

    return result[0] || null;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async getEntityName(entityType: string, entityId: number): Promise<string> {
    const db = await getDb();
    if (!db) return "Unknown";

    if (entityType === "person") {
      const result = await db.select({ name: people.name })
        .from(people)
        .where(eq(people.id, entityId))
        .limit(1);
      return result[0]?.name || "Unknown Person";
    } else if (entityType === "investor") {
      const result = await db.select({ name: investors.name })
        .from(investors)
        .where(eq(investors.id, entityId))
        .limit(1);
      return result[0]?.name || "Unknown Investor";
    }

    return "Unknown";
  }

  private async notifyModerators(subject: string, entityType: string, entityId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const moderators = await db.select()
      .from(users)
      .where(eq(users.role, "moderator"));

    for (const mod of moderators) {
      if (mod.email) {
        await db.insert(emailNotifications).values({
          recipientEmail: mod.email,
          recipientUserId: mod.id,
          subject: `[TechScoop] ${subject}`,
          body: `A new moderation item requires your attention.\n\nEntity Type: ${entityType}\nEntity ID: ${entityId}`,
          type: "moderation_new",
          entityType,
          entityId,
          status: "pending"
        } as any);
      }
    }
  }

  private async notifyClaimant(email: string, status: string, entityType: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const statusText = status === "approved" 
      ? "Your profile claim has been approved! You are now the verified manager of this profile."
      : "Your profile claim has been rejected. Please contact support if you believe this is an error.";

    await db.insert(emailNotifications).values({
      recipientEmail: email,
      subject: `[TechScoop] Profile Claim ${status === "approved" ? "Approved" : "Rejected"}`,
      body: statusText,
      type: "claim_decision",
      entityType,
      status: "pending"
    } as any);
  }

  private async notifySubmitter(email: string, status: string, entityType: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const statusText = status === "approved"
      ? "Your suggested update has been approved and applied to the profile."
      : "Your suggested update has been rejected. Please contact support if you have questions.";

    await db.insert(emailNotifications).values({
      recipientEmail: email,
      subject: `[TechScoop] Update Suggestion ${status === "approved" ? "Approved" : "Rejected"}`,
      body: statusText,
      type: "update_decision",
      entityType,
      status: "pending"
    } as any);
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
