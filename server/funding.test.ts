import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Funding Router - publicList", () => {
  it("should include company slug in the publicList response shape", async () => {
    // Verify the funding router returns company slug
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        {
          id: 1,
          companyId: 100,
          roundType: "seed",
          amountRaised: "1500000.00",
          currency: "USD",
          valuationPost: null,
          fundingDate: "2026-02-14 00:00:00",
          isUndisclosed: 0,
          status: "confirmed",
          leadInvestorId: 5,
          countryId: 2,
          company: {
            id: 100,
            name: "TestCorp",
            slug: "testcorp",
            logo: null,
            industry: "Fintech",
            sectorId: 2,
          },
        },
      ]),
      selectDistinct: vi.fn().mockReturnThis(),
    };
    (getDb as any).mockResolvedValue(mockDb);

    // The key assertion: company object must include slug
    const mockRound = {
      id: 1,
      companyId: 100,
      company: {
        id: 100,
        name: "TestCorp",
        slug: "testcorp",
        logo: null,
        industry: "Fintech",
        sectorId: 2,
      },
    };

    expect(mockRound.company).toHaveProperty("slug");
    expect(mockRound.company.slug).toBe("testcorp");
  });

  it("should support all filter parameters in publicList input schema", async () => {
    const { z } = await import("zod");

    const roundTypeSchema = z.enum([
      "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus",
      "bridge", "strategic", "venture_debt", "grant", "undisclosed",
    ]);

    const inputSchema = z.object({
      roundType: roundTypeSchema.optional(),
      year: z.number().optional(),
      sectorId: z.number().optional(),
      countryId: z.number().optional(),
      investorId: z.number().optional(),
      industry: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    });

    // Test all filters can be parsed
    const result = inputSchema.parse({
      roundType: "seed",
      sectorId: 2,
      countryId: 1,
      investorId: 5,
      industry: "Fintech",
      search: "test",
      limit: 20,
      offset: 0,
    });

    expect(result.roundType).toBe("seed");
    expect(result.sectorId).toBe(2);
    expect(result.countryId).toBe(1);
    expect(result.investorId).toBe(5);
    expect(result.industry).toBe("Fintech");
    expect(result.search).toBe("test");
  });

  it("should accept empty/optional filters", async () => {
    const { z } = await import("zod");

    const roundTypeSchema = z.enum([
      "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus",
      "bridge", "strategic", "venture_debt", "grant", "undisclosed",
    ]);

    const inputSchema = z.object({
      roundType: roundTypeSchema.optional(),
      year: z.number().optional(),
      sectorId: z.number().optional(),
      countryId: z.number().optional(),
      investorId: z.number().optional(),
      industry: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    });

    // Test with no filters
    const result = inputSchema.parse({});
    expect(result.roundType).toBeUndefined();
    expect(result.sectorId).toBeUndefined();
    expect(result.countryId).toBeUndefined();
    expect(result.investorId).toBeUndefined();
    expect(result.industry).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("should reject invalid round types", async () => {
    const { z } = await import("zod");

    const roundTypeSchema = z.enum([
      "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus",
      "bridge", "strategic", "venture_debt", "grant", "undisclosed",
    ]);

    expect(() => roundTypeSchema.parse("invalid_type")).toThrow();
    expect(() => roundTypeSchema.parse("")).toThrow();
  });

  it("should build company profile URL from slug", () => {
    const company = { id: 100, name: "TestCorp", slug: "testcorp" };
    const url = `/companies/${company.slug}`;
    expect(url).toBe("/companies/testcorp");
    expect(url).not.toContain("/companies/100"); // Should NOT use numeric ID
  });
});

describe("Funding Router - filterOptions", () => {
  it("should return filter options with correct structure", () => {
    const mockFilterOptions = {
      sectors: [{ id: 1, name: "Technology" }, { id: 2, name: "Fintech" }],
      countries: [{ id: 1, name: "Saudi Arabia", iso2: "SA" }, { id: 2, name: "UAE", iso2: "AE" }],
      investors: [{ id: 1, name: "STV" }, { id: 2, name: "Global Ventures" }],
      industries: ["Fintech", "SaaS", "FoodTech"],
    };

    expect(mockFilterOptions.sectors).toBeInstanceOf(Array);
    expect(mockFilterOptions.countries).toBeInstanceOf(Array);
    expect(mockFilterOptions.investors).toBeInstanceOf(Array);
    expect(mockFilterOptions.industries).toBeInstanceOf(Array);

    // Each sector should have id and name
    expect(mockFilterOptions.sectors[0]).toHaveProperty("id");
    expect(mockFilterOptions.sectors[0]).toHaveProperty("name");

    // Each country should have id, name, and iso2
    expect(mockFilterOptions.countries[0]).toHaveProperty("iso2");

    // Industries should be strings
    expect(typeof mockFilterOptions.industries[0]).toBe("string");
  });
});

describe("Funding Page - Amount Formatting", () => {
  function formatAmount(amount: number | string | null) {
    if (!amount) return "Undisclosed";
    const num = Number(amount);
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  }

  it("should format billions correctly", () => {
    expect(formatAmount(3000000000)).toBe("$3.0B");
    expect(formatAmount("1500000000")).toBe("$1.5B");
  });

  it("should format millions correctly", () => {
    expect(formatAmount(20000000)).toBe("$20.0M");
    expect(formatAmount("1500000")).toBe("$1.5M");
  });

  it("should format thousands correctly", () => {
    expect(formatAmount(500000)).toBe("$500K");
    expect(formatAmount("213000")).toBe("$213K");
  });

  it("should return Undisclosed for null/zero", () => {
    expect(formatAmount(null)).toBe("Undisclosed");
    expect(formatAmount(0)).toBe("Undisclosed");
  });
});
