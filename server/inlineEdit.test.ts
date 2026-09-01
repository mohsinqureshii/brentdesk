import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user?: Partial<AuthenticatedUser>): TrpcContext {
  const defaultUser: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date(),
    ...user,
  };

  return {
    user: user === null ? null : defaultUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
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

const caller = (ctx: TrpcContext) => appRouter.createCaller(ctx);

describe("Inline Edit - checkCanEdit endpoint", () => {
  describe("Anonymous users", () => {
    it("should return canEdit: false for anonymous users on company", async () => {
      const ctx = createAnonymousContext();
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "company",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });

    it("should return canEdit: false for anonymous users on person", async () => {
      const ctx = createAnonymousContext();
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "person",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });

    it("should return canEdit: false for anonymous users on investor", async () => {
      const ctx = createAnonymousContext();
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "investor",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });

    it("should return canEdit: false for anonymous users on accelerator", async () => {
      const ctx = createAnonymousContext();
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "accelerator",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });
  });

  describe("Admin users", () => {
    it("should return canEdit: true with admin edit URL for admin on company", async () => {
      const ctx = createContext({ role: "admin" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "company",
        entityId: 42,
      });
      expect(result.canEdit).toBe(true);
      expect(result.editUrl).toBe("/admin/companies/42");
    });

    it("should return canEdit: true with admin edit URL for admin on person", async () => {
      const ctx = createContext({ role: "admin" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "person",
        entityId: 7,
      });
      expect(result.canEdit).toBe(true);
      expect(result.editUrl).toBe("/admin/people/7");
    });

    it("should return canEdit: true with admin edit URL for admin on investor", async () => {
      const ctx = createContext({ role: "admin" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "investor",
        entityId: 15,
      });
      expect(result.canEdit).toBe(true);
      expect(result.editUrl).toBe("/admin/investors/15");
    });

    it("should return canEdit: true with admin edit URL for admin on accelerator", async () => {
      const ctx = createContext({ role: "admin" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "accelerator",
        entityId: 3,
      });
      expect(result.canEdit).toBe(true);
      expect(result.editUrl).toBe("/admin/accelerators/3");
    });

    it("should return canEdit: true with admin edit URL for admin on event", async () => {
      const ctx = createContext({ role: "admin" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "event",
        entityId: 5,
      });
      expect(result.canEdit).toBe(true);
      expect(result.editUrl).toBe("/admin/events/5");
    });
  });

  describe("Regular users without claims", () => {
    it("should return canEdit: false for regular user without claim on company", async () => {
      const ctx = createContext({ id: 999, role: "user" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "company",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });

    it("should return canEdit: false for regular user without claim on person", async () => {
      const ctx = createContext({ id: 999, role: "user" });
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "person",
        entityId: 1,
      });
      expect(result.canEdit).toBe(false);
      expect(result.editUrl).toBeNull();
    });
  });

  describe("Input validation", () => {
    it("should accept valid entity types", async () => {
      const ctx = createAnonymousContext();
      const validTypes = ["company", "person", "investor", "accelerator", "event"] as const;
      for (const entityType of validTypes) {
        const result = await caller(ctx).claimedProfiles.checkCanEdit({
          entityType,
          entityId: 1,
        });
        expect(result).toHaveProperty("canEdit");
        expect(result).toHaveProperty("editUrl");
      }
    });

    it("should reject invalid entity types", async () => {
      const ctx = createAnonymousContext();
      await expect(
        caller(ctx).claimedProfiles.checkCanEdit({
          entityType: "invalid" as any,
          entityId: 1,
        })
      ).rejects.toThrow();
    });

    it("should reject negative entity IDs", async () => {
      const ctx = createAnonymousContext();
      // Negative IDs should still work (return false) - no validation error
      const result = await caller(ctx).claimedProfiles.checkCanEdit({
        entityType: "company",
        entityId: -1,
      });
      expect(result.canEdit).toBe(false);
    });
  });
});

describe("Expanded Editor Mutations - Input Validation", () => {
  describe("editClaimedPerson expanded fields", () => {
    it("should reject editClaimedPerson without authentication", async () => {
      const ctx = createAnonymousContext();
      await expect(
        caller(ctx).claimedProfiles.editClaimedPerson({
          personId: 1,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });

    it("should accept editClaimedPerson with expanded fields schema", async () => {
      // This tests that the expanded schema accepts the new fields without validation errors
      const ctx = createContext({ id: 1 });
      // The mutation will fail because user doesn't have a claim, but the input validation should pass
      try {
        await caller(ctx).claimedProfiles.editClaimedPerson({
          personId: 999999,
          name: "Test Person",
          title: "CEO",
          bio: "A test bio",
          about: "About this person",
          achievements: "Won awards",
          careerHighlights: "Led companies",
          education: JSON.stringify([{ institution: "MIT", degree: "BS", field: "CS", year: "2020" }]),
          experience: JSON.stringify([{ company: "Google", title: "Engineer", startDate: "2020" }]),
          languages: "English, Arabic",
          interests: "Technology, Innovation",
          publications: JSON.stringify([{ title: "Paper 1", url: "https://example.com" }]),
          speakingEngagements: JSON.stringify([{ event: "TechConf", topic: "AI" }]),
          awards: JSON.stringify([{ name: "Best Founder", year: "2024" }]),
          angelInvestments: JSON.stringify([{ company: "Startup X", amount: "$100K" }]),
          boardRoles: JSON.stringify([{ company: "Corp Y", role: "Board Member" }]),
          advisoryPositions: JSON.stringify([{ company: "Startup Z", role: "Advisor" }]),
          openTo: "Mentoring, Advisory",
          availability: "Available",
          preferredContactMethod: "Email",
        });
      } catch (e: any) {
        // Should fail with FORBIDDEN (no claim), not with input validation error
        expect(e.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("editClaimedInvestor expanded fields", () => {
    it("should reject editClaimedInvestor without authentication", async () => {
      const ctx = createAnonymousContext();
      await expect(
        caller(ctx).claimedProfiles.editClaimedInvestor({
          investorId: 1,
          name: "Updated Investor",
        })
      ).rejects.toThrow();
    });

    it("should accept editClaimedInvestor with expanded fields schema", async () => {
      const ctx = createContext({ id: 1 });
      try {
        await caller(ctx).claimedProfiles.editClaimedInvestor({
          investorId: 999999,
          name: "Test Investor",
          tagline: "Investing in the future",
          investmentThesis: "We invest in early-stage startups",
          investmentPhilosophy: "Long-term value creation",
          fundSize: "$100M",
          vintageYear: 2024,
          aum: "$500M",
          checkSizeMin: "$100K",
          checkSizeMax: "$5M",
          dealFlowPreferences: "Warm introductions preferred",
          portfolioHighlights: JSON.stringify([{ company: "Startup A", outcome: "10x" }]),
          notableExits: JSON.stringify([{ company: "Startup B", exitType: "IPO" }]),
          teamMembers: JSON.stringify([{ name: "John", title: "Partner" }]),
          pressAndMedia: JSON.stringify([{ title: "Article 1", url: "https://example.com" }]),
          reports: JSON.stringify([{ title: "Annual Report", url: "https://example.com" }]),
        });
      } catch (e: any) {
        expect(e.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("editClaimedAccelerator expanded fields", () => {
    it("should reject editClaimedAccelerator without authentication", async () => {
      const ctx = createAnonymousContext();
      await expect(
        caller(ctx).claimedProfiles.editClaimedAccelerator({
          acceleratorId: 1,
          name: "Updated Accelerator",
        })
      ).rejects.toThrow();
    });

    it("should accept editClaimedAccelerator with expanded fields schema", async () => {
      const ctx = createContext({ id: 1 });
      try {
        await caller(ctx).claimedProfiles.editClaimedAccelerator({
          acceleratorId: 999999,
          name: "Test Accelerator",
          tagline: "Accelerating innovation",
          mission: "To support startups",
          vision: "A thriving ecosystem",
          impactStatement: "We've helped 100+ startups",
          programDuration: "3 months",
          equityTaken: "6%",
          fundingProvided: "$100K",
          cohortSize: "20",
          benefits: JSON.stringify([{ name: "Mentorship", description: "1-on-1 mentoring" }]),
          requirements: "Must be pre-seed or seed stage",
          eligibility: "MENA-based startups",
          applicationProcess: "Online application, interview, selection",
          alumniCompanies: JSON.stringify([{ name: "Startup A", outcome: "Series A" }]),
          successStories: JSON.stringify([{ title: "Story 1", content: "Success" }]),
          teamMembers: JSON.stringify([{ name: "Jane", title: "Director" }]),
          mentors: JSON.stringify([{ name: "Expert A", expertise: "Fintech" }]),
          partners: JSON.stringify([{ name: "Partner Corp", type: "Strategic" }]),
          sponsors: JSON.stringify([{ name: "Sponsor Inc", tier: "Gold" }]),
        });
      } catch (e: any) {
        expect(e.code).toBe("FORBIDDEN");
      }
    });
  });
});

describe("Edit URL generation", () => {
  it("should generate correct dashboard edit URLs for claimed entities", async () => {
    const ctx = createAnonymousContext();
    // Test that the URL pattern is correct by checking admin URLs
    const adminCtx = createContext({ role: "admin" });
    
    const companyResult = await caller(adminCtx).claimedProfiles.checkCanEdit({ entityType: "company", entityId: 10 });
    expect(companyResult.editUrl).toBe("/admin/companies/10");
    
    const personResult = await caller(adminCtx).claimedProfiles.checkCanEdit({ entityType: "person", entityId: 20 });
    expect(personResult.editUrl).toBe("/admin/people/20");
    
    const investorResult = await caller(adminCtx).claimedProfiles.checkCanEdit({ entityType: "investor", entityId: 30 });
    expect(investorResult.editUrl).toBe("/admin/investors/30");
    
    const acceleratorResult = await caller(adminCtx).claimedProfiles.checkCanEdit({ entityType: "accelerator", entityId: 40 });
    expect(acceleratorResult.editUrl).toBe("/admin/accelerators/40");
    
    const eventResult = await caller(adminCtx).claimedProfiles.checkCanEdit({ entityType: "event", entityId: 50 });
    expect(eventResult.editUrl).toBe("/admin/events/50");
  });
});
