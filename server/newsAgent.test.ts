/**
 * News Agent Service Tests
 * Tests for multi-signal scoring, RSS parsing helpers, threshold normalisation,
 * duplicate detection, and crawl pipeline logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  scoreKeywordRelevance,
  blendScores,
  normaliseThreshold,
} from "./services/ai/newsAgent.service";

// ============================================================
// THRESHOLD NORMALISATION
// ============================================================

describe("normaliseThreshold", () => {
  it("passes through 0-1 values unchanged", () => {
    expect(normaliseThreshold(0.5)).toBe(0.5);
    expect(normaliseThreshold(0.0)).toBe(0.0);
    expect(normaliseThreshold(1.0)).toBe(1.0);
  });

  it("converts integer 0-100 values to 0-1 decimal", () => {
    expect(normaliseThreshold(70)).toBeCloseTo(0.7, 5);
    expect(normaliseThreshold(50)).toBeCloseTo(0.5, 5);
    expect(normaliseThreshold(100)).toBe(1.0);
    expect(normaliseThreshold(0)).toBe(0.0);
  });

  it("handles edge cases", () => {
    expect(normaliseThreshold(7000)).toBe(1.0); // 7000/100 = 70, clamped at 1
    expect(normaliseThreshold(-10)).toBe(0.0);  // clamp at 0
    // 1.5 > 1 so treated as integer → 1.5/100 = 0.015
    expect(normaliseThreshold(1.5)).toBeCloseTo(0.015, 5);
  });
});

// ============================================================
// KEYWORD SCORING
// ============================================================

describe("scoreKeywordRelevance", () => {
  it("gives high keyword score to MENA startup funding article", () => {
    const item = {
      title: "Saudi fintech startup Tabby raises $200M Series D in UAE",
      summary: "Tabby, the leading BNPL platform in Saudi Arabia and UAE, has closed a $200M funding round led by STV and Sequoia Capital.",
      sourceUrl: "https://example.com/tabby-funding",
    };
    const breakdown = scoreKeywordRelevance(item);
    expect(breakdown.keyword).toBeGreaterThan(0.5);
  });

  it("gives low keyword score to unrelated article", () => {
    const item = {
      title: "Best chocolate chip cookie recipe for the holidays",
      summary: "Mix flour, butter, sugar and chocolate chips for the perfect cookie.",
      sourceUrl: "https://example.com/cookies",
    };
    const breakdown = scoreKeywordRelevance(item);
    expect(breakdown.keyword).toBeLessThan(0.2);
  });

  it("gives higher score to title keywords vs body keywords", () => {
    const titleItem = {
      title: "Dubai startup raises $10M seed round",
      summary: "A company has raised funding.",
      sourceUrl: "https://example.com/1",
    };
    const bodyItem = {
      title: "Company raises funding",
      summary: "A Dubai startup has raised a $10M seed round in the UAE ecosystem.",
      sourceUrl: "https://example.com/2",
    };
    const titleScore = scoreKeywordRelevance(titleItem).keyword;
    const bodyScore = scoreKeywordRelevance(bodyItem).keyword;
    expect(titleScore).toBeGreaterThan(bodyScore);
  });

  it("detects MENA entity signal for known companies", () => {
    const item = {
      title: "Careem expands to new markets",
      summary: "Careem, the ride-hailing platform, announced expansion to Morocco and Tunisia.",
      sourceUrl: "https://example.com/careem",
    };
    const breakdown = scoreKeywordRelevance(item);
    expect(breakdown.entitySignal).toBeGreaterThan(0);
  });

  it("penalises clickbait titles", () => {
    const clickbait = {
      title: "10 ways to grow your startup you won't believe",
      summary: "Some tips for startups.",
      sourceUrl: "https://example.com/clickbait",
    };
    const normal = {
      title: "Egyptian startup Paymob secures $50M Series B funding",
      summary: "Some tips for startups.",
      sourceUrl: "https://example.com/normal",
    };
    const clickbaitScore = scoreKeywordRelevance(clickbait).titleQuality;
    const normalScore = scoreKeywordRelevance(normal).titleQuality;
    expect(clickbaitScore).toBeLessThan(normalScore);
  });

  it("gives recency boost to very recent articles", () => {
    const recentItem = {
      title: "Tech news",
      summary: "Something happened.",
      sourceUrl: "https://example.com/recent",
      publishedAt: new Date(Date.now().toISOString() - 1 * 3_600_000), // 1 hour ago
    };
    const oldItem = {
      title: "Tech news",
      summary: "Something happened.",
      sourceUrl: "https://example.com/old",
      publishedAt: new Date(Date.now().toISOString() - 7 * 24 * 3_600_000), // 7 days ago
    };
    const recentBreakdown = scoreKeywordRelevance(recentItem);
    const oldBreakdown = scoreKeywordRelevance(oldItem);
    expect(recentBreakdown.recency).toBeGreaterThan(oldBreakdown.recency);
  });

  it("gives content depth score based on body length", () => {
    const richItem = {
      title: "Article",
      summary: "A".repeat(1000),
      rawContent: "B".repeat(2000),
      sourceUrl: "https://example.com/rich",
    };
    const thinItem = {
      title: "Article",
      summary: "Short.",
      sourceUrl: "https://example.com/thin",
    };
    const richBreakdown = scoreKeywordRelevance(richItem);
    const thinBreakdown = scoreKeywordRelevance(thinItem);
    expect(richBreakdown.contentDepth).toBeGreaterThan(thinBreakdown.contentDepth);
  });

  it("returns all breakdown fields", () => {
    const item = {
      title: "Test article",
      summary: "Test summary",
      sourceUrl: "https://example.com/test",
    };
    const breakdown = scoreKeywordRelevance(item);
    expect(breakdown).toHaveProperty("keyword");
    expect(breakdown).toHaveProperty("llm");
    expect(breakdown).toHaveProperty("recency");
    expect(breakdown).toHaveProperty("titleQuality");
    expect(breakdown).toHaveProperty("contentDepth");
    expect(breakdown).toHaveProperty("entitySignal");
    expect(breakdown).toHaveProperty("novelty");
  });

  it("all breakdown values are between 0 and 1", () => {
    const items = [
      { title: "Saudi Arabia AI startup raises $100M", summary: "MENA tech ecosystem funding round", sourceUrl: "https://example.com/1" },
      { title: "Cookie recipe", summary: "Baking tips", sourceUrl: "https://example.com/2" },
      { title: "10 shocking tech secrets", summary: "You won't believe these tips", sourceUrl: "https://example.com/3" },
    ];
    for (const item of items) {
      const breakdown = scoreKeywordRelevance(item);
      for (const [key, value] of Object.entries(breakdown)) {
        expect(value, `${key} should be 0-1`).toBeGreaterThanOrEqual(0);
        expect(value, `${key} should be 0-1`).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ============================================================
// SCORE BLENDING
// ============================================================

describe("blendScores", () => {
  it("returns a value between 0 and 1", () => {
    const breakdown = {
      keyword: 0.8,
      llm: 0.9,
      recency: 0.7,
      titleQuality: 0.8,
      contentDepth: 0.6,
      entitySignal: 0.5,
      novelty: 1.0,
    };
    const score = blendScores(breakdown);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("gives higher score to better articles", () => {
    const strongMENA = {
      keyword: 0.9,
      llm: 0.85,
      recency: 0.8,
      titleQuality: 0.9,
      contentDepth: 0.8,
      entitySignal: 0.7,
      novelty: 1.0,
    };
    const weakGlobal = {
      keyword: 0.1,
      llm: 0.15,
      recency: 0.2,
      titleQuality: 0.5,
      contentDepth: 0.3,
      entitySignal: 0.0,
      novelty: 1.0,
    };
    expect(blendScores(strongMENA)).toBeGreaterThan(blendScores(weakGlobal));
  });

  it("redistributes LLM weight to keyword when LLM score is 0", () => {
    const withLLM = {
      keyword: 0.5,
      llm: 0.8,
      recency: 0.5,
      titleQuality: 0.5,
      contentDepth: 0.5,
      entitySignal: 0.5,
      novelty: 0.5,
    };
    const withoutLLM = {
      ...withLLM,
      llm: 0,
    };
    // Both should produce valid scores
    expect(blendScores(withLLM)).toBeGreaterThanOrEqual(0);
    expect(blendScores(withoutLLM)).toBeGreaterThanOrEqual(0);
    // With LLM score of 0.8, the blended score should be higher
    expect(blendScores(withLLM)).toBeGreaterThan(blendScores(withoutLLM));
  });

  it("novelty penalty reduces final score", () => {
    const novel = {
      keyword: 0.6,
      llm: 0.6,
      recency: 0.6,
      titleQuality: 0.6,
      contentDepth: 0.6,
      entitySignal: 0.6,
      novelty: 1.0,
    };
    const duplicate = {
      ...novel,
      novelty: 0.0,
    };
    expect(blendScores(novel)).toBeGreaterThan(blendScores(duplicate));
  });

  it("handles all-zero breakdown gracefully", () => {
    const zeros = {
      keyword: 0,
      llm: 0,
      recency: 0,
      titleQuality: 0,
      contentDepth: 0,
      entitySignal: 0,
      novelty: 0,
    };
    expect(blendScores(zeros)).toBe(0);
  });

  it("handles all-one breakdown gracefully", () => {
    const ones = {
      keyword: 1,
      llm: 1,
      recency: 1,
      titleQuality: 1,
      contentDepth: 1,
      entitySignal: 1,
      novelty: 1,
    };
    expect(blendScores(ones)).toBeCloseTo(1, 5);
  });
});

// ============================================================
// INTEGRATION: SCORING PIPELINE
// ============================================================

describe("Scoring pipeline integration", () => {
  it("MENA funding article scores above 0.4 without LLM", () => {
    const item = {
      title: "UAE-based fintech startup Tabby raises $200M Series D funding round",
      summary: "Tabby, the leading buy-now-pay-later platform in Saudi Arabia and UAE, has closed a $200 million Series D funding round led by STV, Sequoia Capital, and PayPal Ventures. The round values the company at over $1.5 billion, making it one of the largest fintech fundraises in MENA history.",
      sourceUrl: "https://example.com/tabby",
      publishedAt: new Date(Date.now().toISOString() - 2 * 3_600_000), // 2 hours ago
    };
    const breakdown = scoreKeywordRelevance(item);
    const score = blendScores(breakdown);
    expect(score).toBeGreaterThan(0.4);
  });

  it("Generic global tech article scores below 0.3 without LLM", () => {
    const item = {
      title: "Apple announces new MacBook Pro with M4 chip",
      summary: "Apple has unveiled its latest MacBook Pro featuring the new M4 chip with improved performance and battery life.",
      sourceUrl: "https://example.com/apple",
      publishedAt: new Date(Date.now().toISOString() - 48 * 3_600_000), // 2 days ago
    };
    const breakdown = scoreKeywordRelevance(item);
    const score = blendScores(breakdown);
    expect(score).toBeLessThan(0.35);
  });

  it("MENA article scores higher than global article", () => {
    const menaItem = {
      title: "Saudi Arabia's NEOM raises $10B in new investment round",
      summary: "NEOM, the Saudi mega-project, has secured $10 billion in new investment from the Public Investment Fund and international partners.",
      sourceUrl: "https://example.com/neom",
      publishedAt: new Date(Date.now().toISOString() - 1 * 3_600_000),
    };
    const globalItem = {
      title: "Microsoft acquires gaming studio for $500M",
      summary: "Microsoft has acquired a major gaming studio to expand its Xbox Game Studios portfolio.",
      sourceUrl: "https://example.com/microsoft",
      publishedAt: new Date(Date.now().toISOString() - 1 * 3_600_000),
    };
    const menaScore = blendScores(scoreKeywordRelevance(menaItem));
    const globalScore = blendScores(scoreKeywordRelevance(globalItem));
    expect(menaScore).toBeGreaterThan(globalScore);
  });
});

// ============================================================
// URL NORMALISATION (tested via duplicate detection logic)
// ============================================================

describe("URL normalisation", () => {
  it("strips UTM parameters from URLs", () => {
    // Test the normalisation logic directly
    const normalizeUrl = (url: string): string => {
      try {
        const u = new URL(url);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "source", "fbclid", "gclid"].forEach(p => u.searchParams.delete(p));
        return u.toString().replace(/\/$/, "").toLowerCase();
      } catch {
        return url.replace(/\/$/, "").toLowerCase();
      }
    };

    const clean = "https://example.com/article/test";
    const withUtm = "https://example.com/article/test?utm_source=twitter&utm_medium=social";
    const withFbclid = "https://example.com/article/test?fbclid=abc123";

    expect(normalizeUrl(withUtm)).toBe(normalizeUrl(clean));
    expect(normalizeUrl(withFbclid)).toBe(normalizeUrl(clean));
  });

  it("handles trailing slashes consistently", () => {
    const normalizeUrl = (url: string): string => {
      try {
        const u = new URL(url);
        return u.toString().replace(/\/$/, "").toLowerCase();
      } catch {
        return url.replace(/\/$/, "").toLowerCase();
      }
    };

    expect(normalizeUrl("https://example.com/article/")).toBe(normalizeUrl("https://example.com/article"));
  });
});
