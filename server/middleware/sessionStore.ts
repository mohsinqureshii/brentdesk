/**
 * Session Store
 * ----------------------------------------------------------------------
 * Pluggable backing store for the session middleware. Production uses
 * Redis; dev / no-Redis-configured environments fall back to an
 * in-process Map so the dev loop works without `docker run redis`.
 *
 * Surface:
 *   getSession / setSession / deleteSession / listUserSessions /
 *   addUserSession / removeUserSession / recordFailedLogin /
 *   getFailedLoginCount / clearFailedLogins
 *
 * The Redis backend uses three key namespaces:
 *   ts:sess:<sessionId>     → SessionInfo JSON, EX = 24h sliding
 *   ts:user-sess:<userId>   → SET of sessionIds for that user
 *   ts:failed:<ipAddress>   → INTEGER counter, EX = 1h
 *
 * Configuration source: env var REDIS_URL. Missing var = in-memory mode
 * (the existing behavior — no change for the dev loop).
 */

export interface SessionInfo {
  userId: number;
  sessionId: string;
  tenantId: number | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string; // ISO
  lastActiveAt: string;
  isActive: boolean;
}

export interface SessionStore {
  getSession(sessionId: string): Promise<SessionInfo | null>;
  setSession(sessionId: string, info: SessionInfo, ttlSeconds: number): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;

  addUserSession(userId: number, sessionId: string): Promise<void>;
  listUserSessions(userId: number): Promise<string[]>;
  removeUserSession(userId: number, sessionId: string): Promise<void>;

  recordFailedLogin(ipAddress: string, ttlSeconds: number): Promise<number>;
  getFailedLoginCount(ipAddress: string): Promise<number>;
  clearFailedLogins(ipAddress: string): Promise<void>;

  /** Diagnostic — used by /admin/system-health */
  stats(): Promise<{ totalSessions: number; backend: "redis" | "memory" }>;
}

// ============================================================
// In-memory backend (default in dev, fallback when REDIS_URL missing)
// ============================================================

class MemoryStore implements SessionStore {
  private sessions = new Map<string, { info: SessionInfo; expiresAt: number }>();
  private userIndex = new Map<number, Set<string>>();
  private failed = new Map<string, { count: number; expiresAt: number }>();

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const hit = this.sessions.get(sessionId);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return hit.info;
  }

  async setSession(sessionId: string, info: SessionInfo, ttlSeconds: number): Promise<void> {
    this.sessions.set(sessionId, {
      info,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async addUserSession(userId: number, sessionId: string): Promise<void> {
    if (!this.userIndex.has(userId)) this.userIndex.set(userId, new Set());
    this.userIndex.get(userId)!.add(sessionId);
  }

  async listUserSessions(userId: number): Promise<string[]> {
    return Array.from(this.userIndex.get(userId) || []);
  }

  async removeUserSession(userId: number, sessionId: string): Promise<void> {
    this.userIndex.get(userId)?.delete(sessionId);
  }

  async recordFailedLogin(ipAddress: string, ttlSeconds: number): Promise<number> {
    const existing = this.failed.get(ipAddress);
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      existing.count += 1;
      existing.expiresAt = now + ttlSeconds * 1000;
      return existing.count;
    }
    this.failed.set(ipAddress, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }

  async getFailedLoginCount(ipAddress: string): Promise<number> {
    const hit = this.failed.get(ipAddress);
    if (!hit) return 0;
    if (hit.expiresAt < Date.now()) {
      this.failed.delete(ipAddress);
      return 0;
    }
    return hit.count;
  }

  async clearFailedLogins(ipAddress: string): Promise<void> {
    this.failed.delete(ipAddress);
  }

  async stats() {
    return { totalSessions: this.sessions.size, backend: "memory" as const };
  }
}

// ============================================================
// Redis backend (lazy-loaded — `ioredis` is an optional dep)
// ============================================================

class RedisStore implements SessionStore {
  constructor(private redis: any) {}

  private sessionKey(id: string) {
    return `ts:sess:${id}`;
  }
  private userKey(userId: number) {
    return `ts:user-sess:${userId}`;
  }
  private failedKey(ip: string) {
    return `ts:failed:${ip}`;
  }

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const raw = await this.redis.get(this.sessionKey(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionInfo;
    } catch {
      return null;
    }
  }

  async setSession(sessionId: string, info: SessionInfo, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.sessionKey(sessionId), JSON.stringify(info), "EX", ttlSeconds);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionId));
  }

  async addUserSession(userId: number, sessionId: string): Promise<void> {
    await this.redis.sadd(this.userKey(userId), sessionId);
    // Match session TTL so the user index doesn't accumulate dead refs.
    await this.redis.expire(this.userKey(userId), 60 * 60 * 24 * 30); // 30d
  }

  async listUserSessions(userId: number): Promise<string[]> {
    return (await this.redis.smembers(this.userKey(userId))) as string[];
  }

  async removeUserSession(userId: number, sessionId: string): Promise<void> {
    await this.redis.srem(this.userKey(userId), sessionId);
  }

  async recordFailedLogin(ipAddress: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(this.failedKey(ipAddress));
    if (count === 1) await this.redis.expire(this.failedKey(ipAddress), ttlSeconds);
    return count;
  }

  async getFailedLoginCount(ipAddress: string): Promise<number> {
    const raw = await this.redis.get(this.failedKey(ipAddress));
    return raw ? parseInt(raw, 10) : 0;
  }

  async clearFailedLogins(ipAddress: string): Promise<void> {
    await this.redis.del(this.failedKey(ipAddress));
  }

  async stats() {
    // SCAN is preferred over KEYS at scale; for diagnostic count this
    // is fine. If session counts grow huge we move to a maintained
    // counter, but at SaaS-tenant scale this query is cheap enough.
    const sample = await this.redis.keys("ts:sess:*");
    return { totalSessions: sample.length, backend: "redis" as const };
  }
}

// ============================================================
// Resolution — singleton, lazy
// ============================================================

let cachedStore: SessionStore | null = null;
let resolutionPromise: Promise<SessionStore> | null = null;

async function buildStore(): Promise<SessionStore> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[SessionStore] REDIS_URL not set — using in-memory store");
    return new MemoryStore();
  }
  try {
    const mod: any = await import("ioredis").catch(() => null);
    if (!mod) {
      console.warn("[SessionStore] ioredis not installed — falling back to memory store");
      return new MemoryStore();
    }
    const Redis = mod.default || mod;
    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    redis.on("error", (err: Error) => {
      console.error("[SessionStore] Redis error:", err.message);
    });
    console.log("[SessionStore] connected to Redis");
    return new RedisStore(redis);
  } catch (err) {
    console.error("[SessionStore] Redis init failed, falling back to memory:", err);
    return new MemoryStore();
  }
}

export async function getSessionStore(): Promise<SessionStore> {
  if (cachedStore) return cachedStore;
  if (resolutionPromise) return resolutionPromise;
  resolutionPromise = buildStore().then((s) => {
    cachedStore = s;
    return s;
  });
  return resolutionPromise;
}
