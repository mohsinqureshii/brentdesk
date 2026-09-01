/**
 * AI Content Router Tests
 * -------------------------------------------------------
 * Integration tests for the composeArticle procedure. These exercise the
 * live LLM pipeline, so the suite only runs when an LLM key is configured
 * (GEMINI_API_KEY or OPENAI_API_KEY) AND a database is reachable —
 * otherwise it is skipped, not failed.
 *
 * NOTE: the previous version of this file was corrupted (escaped newlines
 * flattened onto one line) and imported a router module that never
 * existed, so it had never actually run.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";

const hasLlm = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
const hasDb = Boolean(process.env.DATABASE_URL);

const adminCtx = {
  user: { id: 1, email: "test@example.com", role: "admin", openId: "test-open-id" },
  req: {} as never,
  res: {} as never,
  edition: null,
  tenantId: null,
  tenant: null,
  tenantResolvedVia: "apex",
} as never;

describe.runIf(hasLlm && hasDb)("AI Content Router (live LLM)", () => {
  const caller = appRouter.createCaller(adminCtx);

  it("should return a composed article with all required fields", async () => {
    const result = await caller.admin.aiContent.composeArticle({
      brief:
        "NEOM awarded a $2.1B EPC contract to a joint venture of regional contractors for the first phase of a desalination and water-transmission program on the kingdom's west coast, with commissioning targeted for 2029.",
      tone: "news",
      targetWordCount: 700,
      focusKeyword: "Saudi water infrastructure",
    });

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("slug");
    expect(result).toHaveProperty("excerpt");
    expect(result).toHaveProperty("bodyHtml");
    expect(result).toHaveProperty("seoTitle");
    expect(result).toHaveProperty("metaDescription");
    expect(result).toHaveProperty("suggestedTags");
    expect(result).toHaveProperty("primaryCategory");
    expect(result).toHaveProperty("entities");

    expect(typeof result.title).toBe("string");
    expect(typeof result.bodyHtml).toBe("string");
    expect(Array.isArray(result.suggestedTags)).toBe(true);
    expect(Array.isArray(result.entities.companies)).toBe(true);
    expect(Array.isArray(result.entities.people)).toBe(true);
  }, 120_000);

  it("should validate minimum brief length", async () => {
    await expect(
      caller.admin.aiContent.composeArticle({ brief: "Short" }),
    ).rejects.toThrow();
  });
});

describe.runIf(!(hasLlm && hasDb))("AI Content Router", () => {
  it.skip("skipped: requires an LLM API key and DATABASE_URL", () => {
    expect(true).toBe(true);
  });
});
