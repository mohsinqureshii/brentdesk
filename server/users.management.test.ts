/**
 * User Management Tests
 * Tests for user profile fields, author selection, and public author pages
 *
 * The scratch database only carries system data (no editorial content), so
 * these tests seed their own editor users (scoped by a test-only prefix and
 * the publication domain from shared/publication.ts) and clean them up.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasDatabase } from "@test/dbAvailable";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, or, like, inArray } from "drizzle-orm";
import { publication } from "@shared/publication";

const TEST_PREFIX = "bdtest-editor";

const TEST_EDITORS = [1, 2, 3, 4, 5].map((n) => ({
  openId: `${TEST_PREFIX}-open-${n}`,
  email: `${TEST_PREFIX}-${n}@${publication.domain}`,
  name: `Test Editor ${n}`,
  publicName: `Test Editor ${n}`,
  username: `${TEST_PREFIX}${n}`,
  role: "editor" as const,
  loginMethod: "email",
}));

describe.runIf(hasDatabase)("User Management", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean any leftovers from an aborted previous run, then seed.
    await db.delete(users).where(like(users.openId, `${TEST_PREFIX}-open-%`));
    await db.insert(users).values(TEST_EDITORS as any);
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(users).where(like(users.openId, `${TEST_PREFIX}-open-%`));
  });

  describe("User Profile Fields", () => {
    it("should have new profile fields in users table", async () => {
      if (!db) throw new Error("Database not available");

      // Get a user to check fields exist
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          nickname: users.nickname,
          publicName: users.publicName,
          jobTitle: users.jobTitle,
          authorBio: users.authorBio,
          twitterHandle: users.twitterHandle,
          linkedinUrl: users.linkedinUrl,
        })
        .from(users)
        .limit(1);

      expect(user).toBeDefined();
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("nickname");
      expect(user).toHaveProperty("publicName");
      expect(user).toHaveProperty("jobTitle");
      expect(user).toHaveProperty("authorBio");
      expect(user).toHaveProperty("twitterHandle");
      expect(user).toHaveProperty("linkedinUrl");
    });
  });

  describe("Editor Users", () => {
    it("should have 5 editor users created", async () => {
      if (!db) throw new Error("Database not available");

      const editorEmails = TEST_EDITORS.map((e) => e.email);

      const editors = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          username: users.username,
        })
        .from(users)
        .where(inArray(users.email, editorEmails));

      expect(editors.length).toBe(5);

      // Verify all are editors
      editors.forEach((editor) => {
        expect(editor.role).toBe("editor");
      });

      // Verify usernames are set (stored lowercase)
      const usernames = editors.map((e) => e.username?.toLowerCase());
      for (const seeded of TEST_EDITORS) {
        expect(usernames).toContain(seeded.username);
      }
    });

    it("each editor should have unique username", async () => {
      if (!db) throw new Error("Database not available");

      const editors = await db
        .select({
          username: users.username,
        })
        .from(users)
        .where(eq(users.role, "editor"));

      const usernames = editors.map((e) => e.username).filter(Boolean);
      const uniqueUsernames = new Set(usernames);

      expect(usernames.length).toBe(uniqueUsernames.size);
    });
  });

  describe("Author Selection", () => {
    it("should be able to query users who can be authors", async () => {
      if (!db) throw new Error("Database not available");

      const authors = await db
        .select({
          id: users.id,
          name: users.name,
          publicName: users.publicName,
          role: users.role,
        })
        .from(users)
        .where(
          or(
            eq(users.role, "admin"),
            eq(users.role, "editor"),
            eq(users.role, "senior_editor"),
            eq(users.role, "author")
          )
        );

      expect(authors.length).toBeGreaterThan(0);

      // All should have valid roles
      authors.forEach((author) => {
        expect(["admin", "editor", "senior_editor", "author"]).toContain(author.role);
      });
    });
  });

  describe("Public Author Profile", () => {
    it("should be able to query author by username", async () => {
      if (!db) throw new Error("Database not available");

      // Get an editor with username
      const [editor] = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          publicName: users.publicName,
          authorBio: users.authorBio,
        })
        .from(users)
        .where(eq(users.username, TEST_EDITORS[0].username))
        .limit(1);

      expect(editor).toBeDefined();
      expect(editor.username).toBe(TEST_EDITORS[0].username);
    });

    it("should return display name correctly", async () => {
      if (!db) throw new Error("Database not available");

      const [user] = await db
        .select({
          name: users.name,
          publicName: users.publicName,
          nickname: users.nickname,
        })
        .from(users)
        .where(eq(users.username, TEST_EDITORS[0].username))
        .limit(1);

      // Display name should be publicName > nickname > name
      const displayName = user?.publicName || user?.nickname || user?.name;
      expect(displayName).toBeTruthy();
    });
  });
});
