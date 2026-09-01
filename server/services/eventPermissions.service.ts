/**
 * Event permissions service
 *
 * Centralises the live-blog write permission check used by the
 * composer mutations (postLiveUpdate / editLiveUpdate / deleteLiveUpdate
 * / togglePinLiveUpdate) and the canPostLiveCheck guard query.
 *
 * A user may post to an event's live blog if ANY of the following holds:
 *
 *   1. They have the global staff role admin / editor / senior_editor.
 *      Staff have implicit access to every event.
 *
 *   2. They are assigned as a correspondent on this event via the
 *      event_correspondents table. Per-event scope — they have no
 *      access to other events.
 *
 *   3. They are the event tenant: events.claimedByUserId points at
 *      their user id. Tenants are typically the organiser who has
 *      claimed the event listing (user.role = 'event_tenant').
 *
 * Returns false for any other case (anonymous, regular user, wrong
 * event, soft-deleted assignment, etc.). The mutations call this
 * and throw a single "Unauthorized" if it returns false — we don't
 * leak which of the three branches failed.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { users, events, eventCorrespondents } from "../../drizzle/schema";

const STAFF_ROLES = new Set(["admin", "editor", "senior_editor"]);

export async function canPostLive(userId: number, eventId: number): Promise<boolean> {
  if (!userId || !eventId) return false;

  const db = await getDb();
  if (!db) return false;

  // 1. Staff bypass — single row lookup on the users table.
  const userRow = await (db as any).select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!userRow.length) return false;
  const role = (userRow[0] as any).role as string | null | undefined;
  if (role && STAFF_ROLES.has(role)) return true;

  // 2. Per-event correspondent assignment.
  const corr = await (db as any).select({ id: eventCorrespondents.id })
    .from(eventCorrespondents)
    .where(and(
      eq(eventCorrespondents.eventId, eventId),
      eq(eventCorrespondents.userId, userId),
    ))
    .limit(1);
  if (corr.length > 0) return true;

  // 3. Event tenant — the event's claimedByUserId points at this user.
  const eventRow = await (db as any).select({
    id: events.id,
    claimedByUserId: (events as any).claimedByUserId,
  })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!eventRow.length) return false;
  if ((eventRow[0] as any).claimedByUserId === userId) return true;

  return false;
}

/**
 * Same check but with a human-readable reason for the UI. Used by the
 * canPostLiveCheck query so the composer can show "you're not assigned
 * as a correspondent on this event" instead of a generic block.
 */
export async function canPostLiveWithReason(
  userId: number,
  eventId: number,
): Promise<{ canPost: boolean; reason?: string }> {
  const ok = await canPostLive(userId, eventId);
  if (ok) return { canPost: true };
  return {
    canPost: false,
    reason:
      "You do not have permission to post live updates on this event. " +
      "Ask an admin to add you as a correspondent or assign you as the event tenant.",
  };
}
