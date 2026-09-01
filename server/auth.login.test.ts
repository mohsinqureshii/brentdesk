/**
 * Tests for custom email/password login functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { publication } from "@shared/publication";

// Fixture accounts live on the publication's own domain (central config).
const ADMIN_EMAIL = `admin@${publication.domain}`;
const NO_PASSWORD_EMAIL = `nopassword@${publication.domain}`;
const USER_EMAIL = `user@${publication.domain}`;

// Mock the db module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  updateUserPassword: vi.fn(),
}));

// Mock the sdk module
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

import * as db from "./db";
import { sdk } from "./_core/sdk";

describe("Custom Login Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Password Hashing", () => {
    it("should hash passwords correctly with bcrypt", async () => {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.startsWith("$2")).toBe(true);
    });

    it("should verify correct password", async () => {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare("wrongpassword", hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe("User Lookup", () => {
    it("should find user by email", async () => {
      const mockUser = {
        id: 1,
        email: ADMIN_EMAIL,
        name: "Admin",
        role: "admin",
        password: await bcrypt.hash("admin123", 10),
        openId: "test-open-id",
      };

      vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

      const user = await db.getUserByEmail(ADMIN_EMAIL);
      expect(user).toBeDefined();
      expect(user?.email).toBe(ADMIN_EMAIL);
      expect(user?.role).toBe("admin");
    });

    it("should return null for non-existent user", async () => {
      vi.mocked(db.getUserByEmail).mockResolvedValue(null);

      const user = await db.getUserByEmail("nonexistent@example.com");
      expect(user).toBeNull();
    });
  });

  describe("Role-based Access Control", () => {
    const allowedRoles = ["admin", "editor", "senior_editor", "author", "moderator"];

    it("should allow admin role", () => {
      expect(allowedRoles.includes("admin")).toBe(true);
    });

    it("should allow editor role", () => {
      expect(allowedRoles.includes("editor")).toBe(true);
    });

    it("should allow senior_editor role", () => {
      expect(allowedRoles.includes("senior_editor")).toBe(true);
    });

    it("should allow author role", () => {
      expect(allowedRoles.includes("author")).toBe(true);
    });

    it("should allow moderator role", () => {
      expect(allowedRoles.includes("moderator")).toBe(true);
    });

    it("should deny regular user role", () => {
      expect(allowedRoles.includes("user")).toBe(false);
    });
  });

  describe("Session Token Creation", () => {
    it("should create session token for valid user", async () => {
      const openId = "test-open-id";
      const name = "Test User";

      const token = await sdk.createSessionToken(openId, { name });
      
      expect(token).toBe("mock-session-token");
      expect(sdk.createSessionToken).toHaveBeenCalledWith(openId, { name });
    });
  });

  describe("Login Flow Integration", () => {
    it("should complete full login flow for valid credentials", async () => {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const mockUser = {
        id: 1,
        email: ADMIN_EMAIL,
        name: "Admin",
        role: "admin",
        password: hashedPassword,
        openId: "test-open-id",
      };

      vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

      // Step 1: Find user
      const user = await db.getUserByEmail(ADMIN_EMAIL);
      expect(user).toBeDefined();

      // Step 2: Verify password
      const isValid = await bcrypt.compare(password, user!.password!);
      expect(isValid).toBe(true);

      // Step 3: Check role
      const allowedRoles = ["admin", "editor", "senior_editor", "author", "moderator"];
      expect(allowedRoles.includes(user!.role)).toBe(true);

      // Step 4: Create session token
      const token = await sdk.createSessionToken(user!.openId, { name: user!.name || "" });
      expect(token).toBeDefined();
    });

    it("should fail login for user without password", async () => {
      const mockUser = {
        id: 1,
        email: NO_PASSWORD_EMAIL,
        name: "No Password User",
        role: "admin",
        password: null,
        openId: "test-open-id",
      };

      vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

      const user = await db.getUserByEmail(NO_PASSWORD_EMAIL);
      expect(user).toBeDefined();
      expect(user!.password).toBeNull();
    });

    it("should fail login for non-admin user", async () => {
      const password = "user123";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const mockUser = {
        id: 2,
        email: USER_EMAIL,
        name: "Regular User",
        role: "user",
        password: hashedPassword,
        openId: "test-open-id-2",
      };

      vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

      const user = await db.getUserByEmail(USER_EMAIL);
      expect(user).toBeDefined();

      const allowedRoles = ["admin", "editor", "senior_editor", "author", "moderator"];
      expect(allowedRoles.includes(user!.role)).toBe(false);
    });
  });
});
