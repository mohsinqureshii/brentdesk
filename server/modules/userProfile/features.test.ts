import { describe, expect, it } from "vitest";
import { hasDatabase } from "@test/dbAvailable";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-user-features",
    email: "features-test@example.com",
    name: "Features Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createAuthContext({ id: 998, role: "admin", openId: "test-admin-features" });
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// =====================
// BOOKMARKS TESTS
// =====================
describe.runIf(hasDatabase)("bookmarks", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  it("should add a bookmark", async () => {
    const result = await caller.bookmarks.add({
      contentType: "article",
      contentId: 1,
      contentTitle: "Test Article",
      contentSlug: "test-article",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("bookmarkId");
  });

  it("should return alreadyExists when adding duplicate bookmark", async () => {
    const result = await caller.bookmarks.add({
      contentType: "article",
      contentId: 1,
      contentTitle: "Test Article",
      contentSlug: "test-article",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("alreadyExists", true);
  });

  it("should check if an item is bookmarked", async () => {
    const result = await caller.bookmarks.check({
      contentType: "article",
      contentId: 1,
    });
    expect(result).toHaveProperty("bookmarked", true);
  });

  it("should check non-bookmarked item returns false", async () => {
    const result = await caller.bookmarks.check({
      contentType: "job",
      contentId: 99999,
    });
    expect(result).toHaveProperty("bookmarked", false);
  });

  it("should list bookmarks with counts", async () => {
    // Add a job bookmark too
    await caller.bookmarks.add({
      contentType: "job",
      contentId: 2,
      contentTitle: "Test Job",
    });

    const result = await caller.bookmarks.list({ contentType: "all" });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("counts");
    expect(result.counts).toHaveProperty("all");
    expect(result.counts).toHaveProperty("article");
    expect(result.counts).toHaveProperty("job");
    expect(result.counts).toHaveProperty("event");
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it("should filter bookmarks by content type", async () => {
    const result = await caller.bookmarks.list({ contentType: "article" });
    expect(result.items.every((item: any) => item.contentType === "article")).toBe(true);
  });

  it("should toggle bookmark (remove if exists)", async () => {
    const result = await caller.bookmarks.toggle({
      contentType: "article",
      contentId: 1,
    });
    expect(result).toHaveProperty("bookmarked", false);
  });

  it("should toggle bookmark (add if not exists)", async () => {
    const result = await caller.bookmarks.toggle({
      contentType: "event",
      contentId: 5,
      contentTitle: "Test Event",
    });
    expect(result).toHaveProperty("bookmarked", true);
  });

  it("should remove a bookmark", async () => {
    const result = await caller.bookmarks.remove({
      contentType: "event",
      contentId: 5,
    });
    expect(result).toHaveProperty("success", true);
  });

  it("should throw UNAUTHORIZED for unauthenticated user on check", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.bookmarks.check({
        contentType: "article",
        contentId: 1,
      })
    ).rejects.toThrow();
  });
});

// =====================
// EMAIL DIGEST TESTS
// =====================
describe.runIf(hasDatabase)("emailDigest", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  it("should return default preferences for new user", async () => {
    const result = await caller.emailDigest.getPreferences();
    expect(result).toHaveProperty("frequency");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("includeJobs");
    expect(result).toHaveProperty("includeEvents");
    expect(result).toHaveProperty("includeNews");
    expect(result).toHaveProperty("includeRecommendations");
  });

  it("should update digest preferences", async () => {
    const result = await caller.emailDigest.updatePreferences({
      frequency: "weekly",
      categories: ["funding-vc", "startups"],
      includeJobs: true,
      includeEvents: true,
      includeNews: true,
      includeRecommendations: false,
    });
    expect(result).toHaveProperty("success", true);
  });

  it("should return updated preferences after save", async () => {
    const result = await caller.emailDigest.getPreferences();
    expect(result.frequency).toBe("weekly");
    expect(result.categories).toContain("funding-vc");
    expect(result.categories).toContain("startups");
    expect(result.includeRecommendations).toBeFalsy();
  });

  it("should update existing preferences (upsert)", async () => {
    const result = await caller.emailDigest.updatePreferences({
      frequency: "daily",
      categories: ["ai-tech"],
      includeJobs: false,
    });
    expect(result).toHaveProperty("success", true);

    const updated = await caller.emailDigest.getPreferences();
    expect(updated.frequency).toBe("daily");
    expect(updated.includeJobs).toBeFalsy();
  });

  it("should get available categories", async () => {
    const result = await caller.emailDigest.getAvailableCategories();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("slug");
    }
  });

  it("should preview digest content", async () => {
    const result = await caller.emailDigest.previewDigest();
    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("jobs");
    expect(result).toHaveProperty("events");
    expect(result).toHaveProperty("topCategories");
    expect(Array.isArray(result.articles)).toBe(true);
    expect(Array.isArray(result.jobs)).toBe(true);
    expect(Array.isArray(result.events)).toBe(true);
  });

  // triggerDigest calls notifyOwner, which requires the external notification
  // proxy (BUILT_IN_FORGE_API_URL/KEY). Skip cleanly when it is not configured.
  it.skipIf(!process.env.BUILT_IN_FORGE_API_URL || !process.env.BUILT_IN_FORGE_API_KEY)(
    "should allow admin to trigger digest", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.emailDigest.triggerDigest({
      frequency: "weekly",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("subscriberCount");
    expect(typeof result.subscriberCount).toBe("number");
  });
});

// =====================
// EDITOR'S PICK (NEWS ROUTER) TESTS
// =====================
describe.runIf(hasDatabase)("news.getEditorPicks", () => {
  it("should return editor picks articles", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const result = await caller.news.getEditorPicks({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("slug");
    }
  });

  it("should respect limit parameter", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const result = await caller.news.getEditorPicks({ limit: 3 });
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
