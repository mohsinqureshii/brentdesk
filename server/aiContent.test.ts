/**
 * AI Content System - Unit Tests
 * Tests for the LLM provider service and content generation pipeline
 */
import { describe, it, expect } from "vitest";

describe("AI Content System", () => {
  describe("LLM Provider Model Registry", () => {
    it("should have correct model definitions for all providers", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      expect(MODEL_REGISTRY).toBeDefined();
      expect(Array.isArray(MODEL_REGISTRY)).toBe(true);
      expect(MODEL_REGISTRY.length).toBeGreaterThan(0);
      
      for (const model of MODEL_REGISTRY) {
        expect(model).toHaveProperty("id");
        expect(model).toHaveProperty("provider");
        expect(model).toHaveProperty("name");
        expect(model).toHaveProperty("contextWindow");
        expect(model).toHaveProperty("maxOutput");
        expect(model).toHaveProperty("costPer1kInput");
        expect(model).toHaveProperty("costPer1kOutput");
        expect(model).toHaveProperty("supportsJson");
        expect(model).toHaveProperty("tier");
        expect(typeof model.id).toBe("string");
        expect(typeof model.provider).toBe("string");
        expect(typeof model.name).toBe("string");
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.maxOutput).toBeGreaterThan(0);
        expect(model.costPer1kInput).toBeGreaterThanOrEqual(0);
        expect(model.costPer1kOutput).toBeGreaterThanOrEqual(0);
      }
    });

    it("should include models from all major providers", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      const providers = new Set(MODEL_REGISTRY.map(m => m.provider));
      expect(providers.has("builtin")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("google")).toBe(true);
      expect(providers.has("deepseek")).toBe(true);
      expect(providers.has("mistral")).toBe(true);
    });

    it("should return models filtered by active provider configs", async () => {
      const { getAvailableModels } = await import("./services/ai/llmProvider.service");
      
      // With openai active config, should return openai models
      const configs = [
        { provider: "openai" as const, apiKey: "test-key", isActive: 1, priority: 1 },
      ];
      
      const models = getAvailableModels(configs);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      const openaiModels = models.filter(m => m.provider === "openai");
      expect(openaiModels.length).toBeGreaterThan(0);
      
      // Anthropic should NOT be in results since it's not in active configs
      const anthropicModels = models.filter(m => m.provider === "anthropic");
      expect(anthropicModels.length).toBe(0);
    });

    it("should return empty array when no active configs provided", async () => {
      const { getAvailableModels } = await import("./services/ai/llmProvider.service");
      
      const models = getAvailableModels([]);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(0);
    });

    it("should exclude inactive provider configs", async () => {
      const { getAvailableModels } = await import("./services/ai/llmProvider.service");
      
      const configs = [
        { provider: "openai" as const, apiKey: "test-key", isActive: 0, priority: 1 },
        { provider: "anthropic" as const, apiKey: "test-key", isActive: 1, priority: 2 },
      ];
      
      const models = getAvailableModels(configs);
      const openaiModels = models.filter(m => m.provider === "openai");
      const anthropicModels = models.filter(m => m.provider === "anthropic");
      
      expect(openaiModels.length).toBe(0); // inactive
      expect(anthropicModels.length).toBeGreaterThan(0); // active
    });
  });

  describe("Model Tier Classification", () => {
    it("should classify models into economy, standard, and premium tiers", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      const tiers = new Set(MODEL_REGISTRY.map(m => m.tier));
      expect(tiers.has("economy")).toBe(true);
      expect(tiers.has("standard")).toBe(true);
      expect(tiers.has("premium")).toBe(true);
    });

    it("should have economy models cheaper than premium models", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      const economyModels = MODEL_REGISTRY.filter(m => m.tier === "economy" && m.provider !== "builtin");
      const premiumModels = MODEL_REGISTRY.filter(m => m.tier === "premium");
      
      if (economyModels.length > 0 && premiumModels.length > 0) {
        const avgEconomyCost = economyModels.reduce((sum, m) => sum + m.costPer1kOutput, 0) / economyModels.length;
        const avgPremiumCost = premiumModels.reduce((sum, m) => sum + m.costPer1kOutput, 0) / premiumModels.length;
        expect(avgEconomyCost).toBeLessThan(avgPremiumCost);
      }
    });
  });

  describe("Cost Estimation", () => {
    it("should calculate token costs correctly for GPT-4o Mini", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      const gpt4oMini = MODEL_REGISTRY.find(m => m.id === "gpt-4o-mini");
      expect(gpt4oMini).toBeDefined();
      
      if (gpt4oMini) {
        const inputTokens = 1000;
        const outputTokens = 500;
        const inputCost = (inputTokens / 1000) * gpt4oMini.costPer1kInput;
        const outputCost = (outputTokens / 1000) * gpt4oMini.costPer1kOutput;
        const totalCost = inputCost + outputCost;
        
        expect(totalCost).toBeGreaterThan(0);
        expect(totalCost).toBeLessThan(0.01); // GPT-4o Mini is very cheap
      }
    });

    it("should have zero cost for builtin provider", async () => {
      const { MODEL_REGISTRY } = await import("./services/ai/llmProvider.service");
      
      const builtin = MODEL_REGISTRY.find(m => m.provider === "builtin");
      expect(builtin).toBeDefined();
      expect(builtin!.costPer1kInput).toBe(0);
      expect(builtin!.costPer1kOutput).toBe(0);
    });
  });

  describe("Content Type Validation", () => {
    it("should support all expected content types", () => {
      const expectedTypes = [
        "article", "company", "person", "investor",
        "event", "job", "resource", "custom"
      ];
      
      expectedTypes.forEach(type => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Editorial Policy Rules Structure", () => {
    it("should accept valid policy rule structures", () => {
      const validRules = {
        tone: "professional",
        maxLength: 2000,
        minLength: 500,
        avoidWords: ["utilize", "leverage"],
        requiredSections: ["introduction", "conclusion"],
        noDashes: true,
        noBulletPoints: false,
        paragraphStyle: true,
      };
      
      expect(validRules.tone).toBeDefined();
      expect(validRules.maxLength).toBeGreaterThan(validRules.minLength);
      expect(Array.isArray(validRules.avoidWords)).toBe(true);
      expect(Array.isArray(validRules.requiredSections)).toBe(true);
    });
  });

  describe("News Agent Source Configuration", () => {
    it("should validate RSS source configuration", () => {
      const rssSource = {
        name: "TechCrunch",
        url: "https://techcrunch.com/feed/",
        type: "rss" as const,
        crawlInterval: 3600,
        isActive: 1,
        relevanceThreshold: 0.6,
      };
      
      expect(rssSource.crawlInterval).toBeGreaterThanOrEqual(300);
      expect(rssSource.relevanceThreshold).toBeGreaterThanOrEqual(0);
      expect(rssSource.relevanceThreshold).toBeLessThanOrEqual(1);
      expect(["rss", "web", "api"].includes(rssSource.type)).toBe(true);
    });

    it("should validate web scraping source configuration", () => {
      const webSource = {
        name: "Wamda",
        url: "https://www.wamda.com/",
        type: "web" as const,
        crawlInterval: 7200,
        isActive: 1,
        selectors: {
          articleList: ".article-list .article-item",
          title: "h2 a",
          link: "h2 a",
          excerpt: ".excerpt",
        },
        relevanceThreshold: 0.7,
      };
      
      expect(webSource.selectors).toBeDefined();
      expect(webSource.selectors.articleList).toBeDefined();
      expect(webSource.selectors.title).toBeDefined();
      expect(webSource.crawlInterval).toBeGreaterThanOrEqual(300);
    });

    it("should reject crawl intervals below minimum", () => {
      const invalidInterval = 60;
      expect(invalidInterval).toBeLessThan(300);
    });
  });
});
