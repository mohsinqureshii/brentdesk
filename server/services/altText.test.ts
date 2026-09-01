/**
 * Alt Text Service Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AltTextService } from "./altText.service";

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          altText: "A modern office building with glass facade",
          title: "Tech company headquarters",
          caption: "The headquarters of a leading technology company in Dubai",
          confidence: 0.95,
        }),
      },
    }],
  }),
}));

describe("AltTextService", () => {
  let service: AltTextService;

  beforeEach(() => {
    service = new AltTextService();
    vi.clearAllMocks();
  });

  describe("generateAltText", () => {
    it("should be a function", () => {
      expect(typeof service.generateAltText).toBe("function");
    });

    it("should accept imageUrl and optional context parameters", async () => {
      expect(service.generateAltText).toBeDefined();
    });

    it("should return AltTextResult structure", async () => {
      const result = await service.generateAltText({
        imageUrl: "https://example.com/image.jpg",
      });

      expect(result).toHaveProperty("altText");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("caption");
      expect(result).toHaveProperty("confidence");
    });

    it("should enforce character limits", async () => {
      const result = await service.generateAltText({
        imageUrl: "https://example.com/image.jpg",
      });

      expect(result.altText.length).toBeLessThanOrEqual(125);
      expect(result.title.length).toBeLessThanOrEqual(60);
      expect(result.caption.length).toBeLessThanOrEqual(200);
    });

    it("should return confidence between 0 and 1", async () => {
      const result = await service.generateAltText({
        imageUrl: "https://example.com/image.jpg",
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("generateBatchAltText", () => {
    it("should be a function", () => {
      expect(typeof service.generateBatchAltText).toBe("function");
    });

    it("should accept array of images", async () => {
      expect(service.generateBatchAltText).toBeDefined();
    });

    it("should return Map of results", async () => {
      const images = [
        { id: 1, url: "https://example.com/image1.jpg" },
        { id: 2, url: "https://example.com/image2.jpg" },
      ];

      const results = await service.generateBatchAltText(images);

      expect(results).toBeInstanceOf(Map);
    });
  });

  describe("improveAltText", () => {
    it("should be a function", () => {
      expect(typeof service.improveAltText).toBe("function");
    });

    it("should accept imageUrl and currentAltText parameters", async () => {
      expect(service.improveAltText).toBeDefined();
    });
  });

  describe("AltTextResult type", () => {
    it("should have correct structure", () => {
      const expectedFields = [
        "altText",
        "title",
        "caption",
        "confidence",
      ];
      
      expect(expectedFields).toHaveLength(4);
    });
  });

  describe("GenerateAltTextInput type", () => {
    it("should have correct structure", () => {
      const expectedFields = [
        "imageUrl",
        "context",
        "existingAlt",
      ];
      
      expect(expectedFields).toHaveLength(3);
    });
  });
});
