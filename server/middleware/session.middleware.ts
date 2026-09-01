/**
 * Session Management Middleware
 * ----------------------------------------------------------------------
 * Session tracking, concurrent-session limits, suspicious-login
 * detection. Backed by Redis in production (durable across restarts)
 * and an in-process Map in dev / when REDIS_URL is absent.
 *
 * The public surface is unchanged from before — `createSession`,
 * `validateSession`, `terminateSession`, etc. — so callers in the
 * auth router and admin tools work without edits. The map/set
 * internals are gone; everything goes through `sessionStore`.
 *
 * Tenant awareness:
 *   `createSession` now accepts an optional `tenantId`. The session
 *   payload carries it; downstream tRPC sees the tenant the user
 *   logged in to (which can be `null` for legacy techscoop.io users).
 */

import { getSessionStore, SessionInfo } from "./sessionStore";
import { logAuditEvent } from "./rbac.middleware";

const MAX_CONCURRENT_SESSIONS = 5;
const SESSION_TIMEOUT_SECONDS = 60 * 60 * 24; // 24h
const FAILED_LOGIN_TTL_SECONDS = 60 * 60; // 1h
const SUSPICIOUS_LOGIN_THRESHOLD = 5;

/**
 * Create a new session for a user. Honors the concurrent-session cap
 * by terminating the oldest session before adding the new one.
 */
export async function createSession(params: {
  userId: number;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  tenantId?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionId, ipAddress, userAgent, tenantId = null } = params;
  const store = await getSessionStore();

  // Concurrent-session cap. List all the user's session ids; reading
  // each to check `isActive` is cheaper at the cap (5) than a
  // separate counter.
  const sessionIds = await store.listUserSessions(userId);
  const active: { id: string; createdAt: string }[] = [];
  for (const sid of sessionIds) {
    const s = await store.getSession(sid);
    if (s?.isActive) active.push({ id: sid, createdAt: s.createdAt });
    else if (!s) await store.removeUserSession(userId, sid);
  }
  if (active.length >= MAX_CONCURRENT_SESSIONS) {
    active.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const oldest = active[0];
    await terminateSession(oldest.id, "session_limit_exceeded");
  }

  const now = new Date().toISOString();
  const session: SessionInfo = {
    userId,
    sessionId,
    tenantId,
    ipAddress,
    userAgent,
    createdAt: now,
    lastActiveAt: now,
    isActive: true,
  };

  await store.setSession(sessionId, session, SESSION_TIMEOUT_SECONDS);
  await store.addUserSession(userId, sessionId);

  await logAuditEvent({
    userId,
    action: "login",
    resourceType: "session",
    changes: { ipAddress, userAgent, tenantId },
  });

  await store.clearFailedLogins(ipAddress);

  return { success: true };
}

/**
 * Validate a session id and slide its TTL forward. Returns the
 * resolved userId + tenantId so callers can hydrate the request
 * context in one call.
 */
export async function validateSession(
  sessionId: string,
): Promise<{ valid: boolean; userId?: number; tenantId?: number | null }> {
  const store = await getSessionStore();
  const session = await store.getSession(sessionId);
  if (!session || !session.isActive) return { valid: false };

  // Sliding window — bump lastActiveAt + refresh TTL.
  session.lastActiveAt = new Date().toISOString();
  await store.setSession(sessionId, session, SESSION_TIMEOUT_SECONDS);

  return { valid: true, userId: session.userId, tenantId: session.tenantId };
}

export async function terminateSession(sessionId: string, reason = "logout"): Promise<void> {
  const store = await getSessionStore();
  const session = await store.getSession(sessionId);
  if (!session) return;

  // Mark inactive in the row + delete the key. Doing both keeps
  // /admin/sessions diagnostics readable even after termination,
  // since the row briefly persists in flight.
  session.isActive = false;
  await store.setSession(sessionId, session, 60); // brief grace
  await store.removeUserSession(session.userId, sessionId);

  await logAuditEvent({
    userId: session.userId,
    action: reason,
    resourceType: "session",
    changes: { sessionId },
  });
}

export async function terminateAllUserSessions(
  userId: number,
  reason = "force_logout",
): Promise<number> {
  const store = await getSessionStore();
  const sessionIds = await store.listUserSessions(userId);
  let count = 0;
  for (const sid of sessionIds) {
    const s = await store.getSession(sid);
    if (s?.isActive) {
      s.isActive = false;
      await store.setSession(sid, s, 60);
      await store.removeUserSession(userId, sid);
      count++;
    }
  }
  await logAuditEvent({
    userId,
    action: reason,
    resourceType: "session",
    changes: { terminatedCount: count },
  });
  return count;
}

export async function getUserActiveSessions(userId: number): Promise<SessionInfo[]> {
  const store = await getSessionStore();
  const sessionIds = await store.listUserSessions(userId);
  const out: SessionInfo[] = [];
  for (const sid of sessionIds) {
    const s = await store.getSession(sid);
    if (s?.isActive) out.push(s);
  }
  return out;
}

/**
 * Record a failed login. Returns whether the IP is now blocked and how
 * many attempts remain before the block kicks in.
 */
export async function recordFailedLogin(
  ipAddress: string,
): Promise<{ blocked: boolean; attemptsRemaining: number }> {
  const store = await getSessionStore();
  const count = await store.recordFailedLogin(ipAddress, FAILED_LOGIN_TTL_SECONDS);
  const blocked = count >= SUSPICIOUS_LOGIN_THRESHOLD;
  const attemptsRemaining = Math.max(0, SUSPICIOUS_LOGIN_THRESHOLD - count);
  return { blocked, attemptsRemaining };
}

export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  const store = await getSessionStore();
  const count = await store.getFailedLoginCount(ipAddress);
  return count >= SUSPICIOUS_LOGIN_THRESHOLD;
}

/**
 * Cron-callable cleanup. Redis handles TTL itself, so this is mostly a
 * no-op in production — kept for the memory backend's benefit and so
 * existing callers don't break.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  // Redis: keys self-expire. Memory: getSession() does lazy expiration.
  // Returning 0 here is a deliberate signal that no work was done.
  return 0;
}

export async function getSessionStats(): Promise<{
  totalActiveSessions: number;
  uniqueUsers: number;
  blockedIps: number;
  backend: "redis" | "memory";
}> {
  const store = await getSessionStore();
  const stats = await store.stats();
  // uniqueUsers / blockedIps are diagnostic — leaving them as 0 here
  // because computing them precisely in Redis requires extra scans we
  // don't want on a /health endpoint. Add a dedicated /metrics route
  // later if dashboarding needs them.
  return {
    totalActiveSessions: stats.totalSessions,
    uniqueUsers: 0,
    blockedIps: 0,
    backend: stats.backend,
  };
}
