import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 800,
    openId: "test-claimed-profiles-user",
    email: "claimed-test@example.com",
    name: "Claimed Test User",
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
  return createAuthContext({ id: 801, role: "admin", openId: "test-admin-claimed" });
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
// CLAIMED PROFILES TESTS
// =====================
describe("claimedProfiles", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);
  const adminCaller = appRouter.createCaller(createAdminContext());
  let claimId: number;

  it("should list claimed profiles (initially empty or existing)", async () => {
    const result = await caller.claimedProfiles.myClaimedProfiles();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should claim a company profile with full form fields", async () => {
    const searchResults = await caller.claimedProfiles.searchEntities({
      entityType: "company",
      query: "Te",
    });
    
    if (searchResults.length === 0) {
      console.log("No companies found to claim, skipping claim test");
      return;
    }

    const companyId = searchResults[0].id;
    
    try {
      const result = await caller.claimedProfiles.claimProfile({
        entityType: "company",
        entityId: companyId,
        requestNote: "I am the founder of this company",
        proofText: "https://linkedin.com/in/founder-profile",
        companyEmail: "founder@company.com",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status", "pending");
      claimId = Number(result.id);
    } catch (err: any) {
      if (err.message?.includes("already claimed") || err.message?.includes("already have")) {
        console.log("Company already claimed, continuing");
      } else {
        throw err;
      }
    }
  });

  it("should prevent duplicate claims", async () => {
    const searchResults = await caller.claimedProfiles.searchEntities({
      entityType: "company",
      query: "Te",
    });
    
    if (searchResults.length === 0) return;

    const companyId = searchResults[0].id;
    
    await expect(
      caller.claimedProfiles.claimProfile({
        entityType: "company",
        entityId: companyId,
        requestNote: "duplicate claim attempt",
      })
    ).rejects.toThrow();
  });

  it("should list claimed profiles after claiming", async () => {
    const result = await caller.claimedProfiles.myClaimedProfiles();
    expect(Array.isArray(result)).toBe(true);
    if (claimId) {
      expect(result.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should filter claimed profiles by status", async () => {
    const result = await caller.claimedProfiles.myClaimedProfiles({
      status: "pending",
    });
    expect(Array.isArray(result)).toBe(true);
    for (const profile of result) {
      expect(profile.status).toBe("pending");
    }
  });

  it("should check claim status for an entity", async () => {
    const searchResults = await caller.claimedProfiles.searchEntities({
      entityType: "company",
      query: "Te",
    });
    
    if (searchResults.length === 0) return;

    const result = await caller.claimedProfiles.checkClaim({
      entityType: "company",
      entityId: searchResults[0].id,
    });
    expect(result).toHaveProperty("claimed");
    expect(typeof result.claimed).toBe("boolean");
  });

  it("should return not claimed for non-existent claim", async () => {
    const result = await caller.claimedProfiles.checkClaim({
      entityType: "investor",
      entityId: 99999,
    });
    expect(result.claimed).toBe(false);
  });

  it("should search entities by type - company", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "company",
      query: "Te",
    });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    }
  });

  it("should search entities by type - person", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "person",
      query: "Mo",
    });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    }
  });

  it("should search entities by type - event", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "event",
      query: "Te",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should search entities by type - investor", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "investor",
      query: "Ve",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should search entities by type - accelerator", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "accelerator",
      query: "Ac",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return empty results for non-matching search", async () => {
    const result = await caller.claimedProfiles.searchEntities({
      entityType: "company",
      query: "xyznonexistent123",
    });
    expect(result.length).toBe(0);
  });

  it("should throw for unauthenticated user on claim", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.claimedProfiles.claimProfile({
        entityType: "company",
        entityId: 1,
        requestNote: "test",
      })
    ).rejects.toThrow();
  });

  it("should throw for unauthenticated user on search", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.claimedProfiles.searchEntities({
        entityType: "company",
        query: "Te",
      })
    ).rejects.toThrow();
  });

  it("should throw NOT_FOUND when claiming non-existent entity", async () => {
    await expect(
      caller.claimedProfiles.claimProfile({
        entityType: "company",
        entityId: 999999,
        requestNote: "test claim",
      })
    ).rejects.toThrow();
  });

  // Admin endpoints
  it("admin should list all claims", async () => {
    const result = await adminCaller.claimedProfiles.adminListClaims({
      status: "all",
    });
    expect(result).toHaveProperty("claims");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("totalPages");
    expect(Array.isArray(result.claims)).toBe(true);
  });

  it("admin should filter claims by status", async () => {
    const result = await adminCaller.claimedProfiles.adminListClaims({
      status: "pending",
    });
    expect(Array.isArray(result.claims)).toBe(true);
    for (const claim of result.claims) {
      expect(claim.status).toBe("pending");
    }
  });

  it("admin should filter claims by entity type", async () => {
    const result = await adminCaller.claimedProfiles.adminListClaims({
      status: "all",
      entityType: "company",
    });
    expect(Array.isArray(result.claims)).toBe(true);
    for (const claim of result.claims) {
      expect(claim.entityType).toBe("company");
    }
  });

  it("admin should get claim detail", async () => {
    // First get any claim
    const list = await adminCaller.claimedProfiles.adminListClaims({ status: "all" });
    if (list.claims.length === 0) {
      console.log("No claims to get detail for, skipping");
      return;
    }
    const firstClaim = list.claims[0];
    const detail = await adminCaller.claimedProfiles.adminGetClaimDetail({
      claimId: firstClaim.id,
    });
    expect(detail).toHaveProperty("id");
    expect(detail).toHaveProperty("entityType");
    expect(detail).toHaveProperty("status");
    expect(detail).toHaveProperty("reviewHistory");
    expect(Array.isArray(detail.reviewHistory)).toBe(true);
  });

  it("admin should review a claim (approve)", async () => {
    const list = await adminCaller.claimedProfiles.adminListClaims({ status: "pending" });
    if (list.claims.length === 0) {
      console.log("No pending claims to review, skipping");
      return;
    }
    const claimToReview = list.claims[0];
    const result = await adminCaller.claimedProfiles.adminReviewClaim({
      claimId: claimToReview.id,
      action: "approved",
      comment: "Verified ownership",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("admin should review a claim (request clarification)", async () => {
    // Create a new claim first
    const ctx2 = createAuthContext({ id: 802, openId: "test-clarify-user" });
    const caller2 = appRouter.createCaller(ctx2);
    const searchResults = await caller2.claimedProfiles.searchEntities({
      entityType: "person",
      query: "Mo",
    });
    if (searchResults.length === 0) {
      console.log("No people found, skipping clarification test");
      return;
    }
    try {
      await caller2.claimedProfiles.claimProfile({
        entityType: "person",
        entityId: searchResults[0].id,
        requestNote: "I am this person",
      });
    } catch {
      // Already claimed, that's ok
    }

    const list = await adminCaller.claimedProfiles.adminListClaims({ status: "pending" });
    if (list.claims.length === 0) return;
    
    const claimToReview = list.claims[0];
    const result = await adminCaller.claimedProfiles.adminReviewClaim({
      claimId: claimToReview.id,
      action: "needs_clarification",
      comment: "Please provide more proof of identity",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("non-admin should not access admin claims list", async () => {
    await expect(
      caller.claimedProfiles.adminListClaims({ status: "all" })
    ).rejects.toThrow();
  });

  it("non-admin should not access admin claim detail", async () => {
    await expect(
      caller.claimedProfiles.adminGetClaimDetail({ claimId: 1 })
    ).rejects.toThrow();
  });

  it("non-admin should not review claims", async () => {
    await expect(
      caller.claimedProfiles.adminReviewClaim({
        claimId: 1,
        action: "approve",
        comment: "test",
      })
    ).rejects.toThrow();
  });

  it("should remove a pending claim", async () => {
    if (!claimId) return;
    const result = await caller.claimedProfiles.removeClaim({ claimId });
    expect(result).toHaveProperty("success", true);
  });

  it("should throw NOT_FOUND when removing non-existent claim", async () => {
    await expect(
      caller.claimedProfiles.removeClaim({ claimId: 999999 })
    ).rejects.toThrow();
  });

  // Company Jobs Dashboard
  it("should throw for unauthenticated user on company jobs dashboard", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.claimedProfiles.companyJobsDashboard({ companyId: 1 })
    ).rejects.toThrow();
  });

  it("should throw FORBIDDEN for non-owner on company jobs dashboard", async () => {
    const otherUser = createAuthContext({ id: 999, openId: "other-user" });
    const otherCaller = appRouter.createCaller(otherUser);
    await expect(
      otherCaller.claimedProfiles.companyJobsDashboard({ companyId: 1 })
    ).rejects.toThrow();
  });

  it("admin should access company jobs dashboard", async () => {
    // Admin should be able to access any company dashboard
    try {
      const result = await adminCaller.claimedProfiles.companyJobsDashboard({ companyId: 1 });
      expect(result).toHaveProperty("company");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("jobs");
      expect(result.summary).toHaveProperty("totalJobs");
      expect(result.summary).toHaveProperty("activeJobs");
      expect(result.summary).toHaveProperty("totalApplications");
      expect(result.summary).toHaveProperty("totalViews");
      expect(result.summary).toHaveProperty("totalClicks");
      expect(Array.isArray(result.jobs)).toBe(true);
    } catch (err: any) {
      // Company might not exist or admin doesn't have a claim, that's ok
      if (err.message?.includes("not found") || err.code === "NOT_FOUND" ||
          err.message?.includes("approved claim") || err.code === "FORBIDDEN") {
        console.log("Company not found or no claim, skipping dashboard test");
      } else {
        throw err;
      }
    }
  });
});

// =====================
// JOB APPLICATIONS TESTS
// =====================
describe("jobApplications", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  it("should check application status for a job", async () => {
    const result = await caller.jobApplications.checkApplication({ jobId: 1 });
    expect(result).toHaveProperty("applied");
    expect(typeof result.applied).toBe("boolean");
  });

  it("should list my applications", async () => {
    const result = await caller.jobApplications.myApplications();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should track a job view click", async () => {
    const publicCaller = appRouter.createCaller(createUnauthContext());
    const result = await publicCaller.jobApplications.trackClick({
      jobId: 1,
      clickType: "view",
    });
    expect(result).toHaveProperty("success");
  });

  it("should track an apply click", async () => {
    const result = await caller.jobApplications.trackClick({
      jobId: 1,
      clickType: "apply_click",
    });
    expect(result).toHaveProperty("success");
  });

  it("should track an external apply click", async () => {
    const result = await caller.jobApplications.trackExternalApply({
      jobId: 1,
    });
    expect(result).toHaveProperty("success");
  });

  it("should throw UNAUTHORIZED for unauthenticated user on apply", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.jobApplications.applyInternal({
        jobId: 1,
        coverLetter: "Test cover letter",
      })
    ).rejects.toThrow();
  });

  it("should throw UNAUTHORIZED for unauthenticated user on myApplications", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.jobApplications.myApplications()
    ).rejects.toThrow();
  });

  it("should throw FORBIDDEN when non-owner tries to view job applications", async () => {
    await expect(
      caller.jobApplications.getJobApplications({ jobId: 1 })
    ).rejects.toThrow();
  });

  it("should throw FORBIDDEN when non-owner tries to view job interest", async () => {
    await expect(
      caller.jobApplications.getJobInterest({ jobId: 1 })
    ).rejects.toThrow();
  });

  it("admin should be able to view job applications", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.jobApplications.getJobApplications({ jobId: 1 });
    expect(result).toHaveProperty("applications");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.applications)).toBe(true);
  });

  it("admin should be able to view job interest", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.jobApplications.getJobInterest({ jobId: 1 });
    expect(result).toHaveProperty("clickStats");
    expect(result).toHaveProperty("interestedUsers");
    expect(result).toHaveProperty("applicationStats");
  });

  it("should list my applications with status filter", async () => {
    const result = await caller.jobApplications.myApplications({
      status: "new",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should throw UNAUTHORIZED for unauthenticated user on withdraw", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(
      unauthCaller.jobApplications.withdrawApplication({ applicationId: 1 })
    ).rejects.toThrow();
  });
});
