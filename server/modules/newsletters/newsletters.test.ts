import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasDatabase } from "@test/dbAvailable";
import { getDb } from "../../db";
import { newslettersRouter } from "./newsletters.router";
import { sql } from "drizzle-orm";

describe.runIf(hasDatabase)("Newsletters Router", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    
    // Create tables if they don't exist
    if (db) {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS newsletters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'weekly',
            isActive TINYINT DEFAULT 1,
            subscriberCount INT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_newsletters_slug (slug),
            INDEX idx_newsletters_is_active (isActive)
          )
        `);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(320) NOT NULL,
            newsletterId INT NOT NULL,
            status ENUM('subscribed', 'unsubscribed', 'bounced') DEFAULT 'subscribed',
            subscribedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unsubscribedAt TIMESTAMP NULL,
            source VARCHAR(128),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_newsletter_subscriptions_email (email),
            INDEX idx_newsletter_subscriptions_newsletter_id (newsletterId),
            INDEX idx_newsletter_subscriptions_status (status),
            UNIQUE KEY unique_email_newsletter (email, newsletterId)
          )
        `);

        // Clear test data
        await db.execute(sql`DELETE FROM newsletter_subscriptions`);
        await db.execute(sql`DELETE FROM newsletters`);

        // Insert test newsletters
        await db.execute(sql`
          INSERT INTO newsletters (slug, name, description, category, frequency, isActive) VALUES
            ('daily', 'Daily News Digest', 'Get the latest tech news from MENA delivered to your inbox every morning', 'news', 'daily', 1),
            ('weekly', 'Weekly Roundup', 'Your weekly digest of the most important tech stories and updates', 'news', 'weekly', 1),
            ('funding', 'Funding & VC News', 'Track funding announcements, VC news, and investment opportunities', 'funding', 'weekly', 1),
            ('jobs', 'Tech Jobs', 'Discover the latest tech job opportunities across MENA', 'jobs', 'weekly', 1)
        `);
      } catch (error) {
        console.error("Setup error:", error);
      }
    }
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.execute(sql`DELETE FROM newsletter_subscriptions`);
        await db.execute(sql`DELETE FROM newsletters`);
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  });

  it("should list active newsletters", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    const result = await caller.listActive();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsletters)).toBe(true);
    expect(result.newsletters.length).toBeGreaterThan(0);
    expect(result.newsletters[0]).toHaveProperty("slug");
    expect(result.newsletters[0]).toHaveProperty("name");
  });

  // (Column-name and unique-key bugs in the router were fixed; see the
  // subscribe/unsubscribe raw SQL and the newsletter_subscriptions unique
  // index in drizzle/schema.ts.) Original bug note:
  // the raw SQL in `subscribe` writes `updatedAt = NOW()` (line ~85) and
  // `unsubscribe` writes `unsubscribedAt = NOW()` (line ~133), but the
  // canonical drizzle schema (drizzle/schema.ts:4358, newsletter_subscriptions)
  // maps these columns to snake_case `updated_at` / `unsubscribed_at`.
  // Against a schema-migrated database every subscribe/unsubscribe fails with
  // "Unknown column". Additionally, the baseline schema has no
  // UNIQUE(email, newsletterId) key, so the router's ON DUPLICATE KEY UPDATE
  // idempotency can never trigger. Skipped until the router (or schema) is
  // fixed — do not hack around it in tests.
  it("should subscribe to newsletters", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    const result = await caller.subscribe({
      email: "test@example.com",
      newsletterSlugs: ["daily", "weekly"],
      source: "test",
    });

    expect(result.success).toBe(true);
    expect(result.subscribedCount).toBe(2);
  });

  // Skipped: same production bug as above (camelCase columns in raw SQL vs
  // snake_case columns in the migrated newsletter_subscriptions table).
  it("should handle idempotent subscriptions", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    
    // First subscription
    const result1 = await caller.subscribe({
      email: "idempotent@example.com",
      newsletterSlugs: ["daily"],
      source: "test",
    });
    expect(result1.success).toBe(true);

    // Second subscription (should succeed without error)
    const result2 = await caller.subscribe({
      email: "idempotent@example.com",
      newsletterSlugs: ["daily"],
      source: "test",
    });
    expect(result2.success).toBe(true);
  });

  // Skipped: same production bug as above — `unsubscribe` sets
  // `unsubscribedAt = NOW()` but the migrated column is `unsubscribed_at`.
  it("should unsubscribe from newsletter", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    
    // Subscribe first
    await caller.subscribe({
      email: "unsubscribe@example.com",
      newsletterSlugs: ["daily"],
      source: "test",
    });

    // Then unsubscribe
    const result = await caller.unsubscribe({
      email: "unsubscribe@example.com",
      newsletterSlug: "daily",
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid newsletter slug", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    const result = await caller.subscribe({
      email: "test@example.com",
      newsletterSlugs: ["nonexistent"],
      source: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject unsubscribe from nonexistent newsletter", async () => {
    const caller = newslettersRouter.createCaller({ user: null, req: {} as any });
    const result = await caller.unsubscribe({
      email: "test@example.com",
      newsletterSlug: "nonexistent",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
