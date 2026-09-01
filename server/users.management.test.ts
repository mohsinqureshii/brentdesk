/**
 * User Management Tests
 * Tests for user profile fields, author selection, and public author pages
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";

describe("User Management", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
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

      const editorEmails = [
        "emily@techscoop.io",
        "noura@techscoop.io",
        "omar@techscoop.io",
        "james@techscoop.io",
        "rizwan@mithu.com",
      ];

      const editors = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          username: users.username,
        })
        .from(users)
        .where(
          or(
            eq(users.email, editorEmails[0]),
            eq(users.email, editorEmails[1]),
            eq(users.email, editorEmails[2]),
            eq(users.email, editorEmails[3]),
            eq(users.email, editorEmails[4])
          )
        );

      expect(editors.length).toBe(5);
      
      // Verify all are editors
      editors.forEach((editor) => {
        expect(editor.role).toBe("editor");
      });

      // Verify usernames are set (stored lowercase)
      const usernames = editors.map((e) => e.username?.toLowerCase());
      expect(usernames).toContain("emilycarter");
      expect(usernames).toContain("nourakhalid");
      expect(usernames).toContain("omarrahman");
      expect(usernames).toContain("jameswhitemore");
      expect(usernames).toContain("riz");
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
        .where(eq(users.username, "emilycarter"))
        .limit(1);

      expect(editor).toBeDefined();
      expect(editor.username).toBe("emilycarter");
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
        .where(eq(users.username, "emilycarter"))
        .limit(1);

      // Display name should be publicName > nickname > name
      const displayName = user?.publicName || user?.nickname || user?.name;
      expect(displayName).toBeTruthy();
    });
  });
});
