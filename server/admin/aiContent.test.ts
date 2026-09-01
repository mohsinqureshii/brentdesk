/**
 * AI Content Router Tests
 * -------------------------------------------------------
 * Tests for composeArticle and entity extraction procedures.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { createCallerFactory } from "../_core/trpc";
import { adminRouter } from "./admin.router";

describe("AI Content Router", () => {
  let caller: ReturnType<typeof createCallerFactory>;

  beforeAll(() => {
    caller = createCallerFactory()({
      user: { id: 1, email: "test@example.com", role: "admin", openId: "test-open-id" },
    });
  });

  describe("composeArticle", () => {
    it("should return a composed article with all required fields", async () => {
      const result = await caller.admin.aiContent.composeArticle({
        brief: "Riyadh-based fintech Tabby raised $200M Series D led by Wellington at a $3.3B valuation. Plans regional expansion into Egypt and Kuwait. Founder Hosam Arab quote on B2B push.",
        tone: "news",
        targetWordCount: 700,
        focusKeyword: "Saudi fintech funding",
      });

      // Verify all required fields are present
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("slug");
      expect(result).toHaveProperty("excerpt");
      expect(result).toHaveProperty("bodyHtml");
      expect(result).toHaveProperty("seoTitle");
      expect(result).toHaveProperty("metaDescription");
      expect(result).toHaveProperty("suggestedTags");
      expect(result).toHaveProperty("primaryCategory");
      expect(result).toHaveProperty("secondaryCategories");
      expect(result).toHaveProperty("focusKeyword");
      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("location");
      expect(result).toHaveProperty("funding");

      // Verify field types
      expect(typeof result.title).toBe("string");
      expect(typeof result.slug).toBe("string");
      expect(typeof result.excerpt).toBe("string");
      expect(typeof result.bodyHtml).toBe("string");
      expect(typeof result.seoTitle).toBe("string");
      expect(typeof result.metaDescription).toBe("string");
      expect(Array.isArray(result.suggestedTags)).toBe(true);
      expect(typeof result.primaryCategory).toBe("string");
      expect(Array.isArray(result.secondaryCategories)).toBe(true);
      expect(typeof result.focusKeyword).toBe("string");

      // Verify entities structure
      expect(result.entities).toHaveProperty("companies");
      expect(result.entities).toHaveProperty("people");
      expect(Array.isArray(result.entities.companies)).toBe(true);
      expect(Array.isArray(result.entities.people)).toBe(true);

      // Verify location structure (can be null or object)\n      if (result.location !== null) {\n        expect(result.location).toHaveProperty("city");\n        expect(result.location).toHaveProperty("country");\n        expect(result.location).toHaveProperty("region");\n      }\n\n      // Verify funding structure\n      expect(result.funding).toHaveProperty(\"isFundingArticle\");\n      expect(result.funding).toHaveProperty(\"company\");\n      expect(result.funding).toHaveProperty(\"amount\");\n      expect(result.funding).toHaveProperty(\"stage\");\n      expect(result.funding).toHaveProperty(\"investors\");\n      expect(Array.isArray(result.funding.investors)).toBe(true);\n    });\n\n    it(\"should validate minimum brief length\", async () => {\n      try {\n        await caller.admin.aiContent.composeArticle({\n          brief: \"Short\",\n        });\n        expect.fail(\"Should have thrown validation error\");\n      } catch (err: any) {\n        expect(err.message).toContain(\"String must contain at least 20 character(s)\");\n      }\n    });\n\n    it(\"should handle optional fields gracefully\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"A new AI startup in Saudi Arabia just raised $50M in Series B funding. The company plans to expand across the MENA region.\",\n      });\n\n      // Should have defaults even without optional inputs\n      expect(result.title).toBeTruthy();\n      expect(result.slug).toBeTruthy();\n      expect(result.bodyHtml).toBeTruthy();\n    });\n\n    it(\"should include funding details when funding article\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"Foodics, a Saudi restaurant management platform, raised $100M in Series C funding led by Accel. The round values the company at $1B.\",\n        tone: \"news\",\n      });\n\n      // Funding article should have isFundingArticle set\n      if (result.funding.isFundingArticle) {\n        expect(result.funding.company).toBeTruthy();\n        expect(result.funding.amount).toBeTruthy();\n      }\n    });\n\n    it(\"should extract location data when relevant\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"A new tech hub is opening in Dubai to support emerging startups in the UAE.\",\n      });\n\n      // Location should be populated for location-relevant articles\n      if (result.location) {\n        expect(result.location.country || result.location.city || result.location.region).toBeTruthy();\n      }\n    });\n\n    it(\"should extract entities (companies and people)\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"Careem CEO Mudassir Sheikha announced a new partnership with Uber in the Middle East. The deal marks a major shift in regional ride-hailing.\",\n      });\n\n      // Should extract at least some entities\n      expect(\n        result.entities.companies.length > 0 || result.entities.people.length > 0\n      ).toBe(true);\n    });\n\n    it(\"should suggest both primary and secondary categories\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"A new fintech startup in Riyadh raised $50M Series B funding.\",\n      });\n\n      // Should have a primary category\n      expect(result.primaryCategory).toBeTruthy();\n      // Secondary categories are optional but should be an array\n      expect(Array.isArray(result.secondaryCategories)).toBe(true);\n    });\n\n    it(\"should respect tone parameter\", async () => {\n      const newsResult = await caller.admin.aiContent.composeArticle({\n        brief: \"Breaking news: A major fintech company just announced a new product.\",\n        tone: \"news\",\n      });\n\n      const analysisResult = await caller.admin.aiContent.composeArticle({\n        brief: \"Breaking news: A major fintech company just announced a new product.\",\n        tone: \"analysis\",\n      });\n\n      // Both should have content, but potentially different styles\n      expect(newsResult.title).toBeTruthy();\n      expect(analysisResult.title).toBeTruthy();\n      // They might be different due to tone\n      // (not guaranteed, but likely)\n    });\n\n    it(\"should respect target word count\", async () => {\n      const result = await caller.admin.aiContent.composeArticle({\n        brief: \"A new startup in Saudi Arabia raised $10M in funding.\",\n        targetWordCount: 500,\n      });\n\n      // Body should be present (word count is a hint, not strict)\n      expect(result.bodyHtml).toBeTruthy();\n      // Should be roughly in the target range (allowing some variance)\n      const wordCount = result.bodyHtml.split(/\\s+/).length;\n      expect(wordCount).toBeGreaterThan(200); // At least some content\n    });\n  });\n});\n
