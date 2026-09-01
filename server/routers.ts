/**
 * Main Router
 * Wires all module routers together
 */

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as db from "./db";
import { sdk } from "./_core/sdk";

// Module routers
import { newsRouter } from "./modules/news/news.router";
import { publicEditionsRouter } from "./modules/editions.router";
import { submissionsRouter } from "./modules/submissions/submissions.router";
import { newslettersRouter } from "./modules/newsletters/newsletters.router";
import { jobsRouter } from "./modules/jobs";
import { assessmentsRouter } from "./modules/assessments";
import { atsRouter } from "./modules/ats";
import { candidatesRouter } from "./modules/candidates";
import { githubRouter } from "./modules/github";
import { matchingRouter } from "./modules/matching";
import { tenantsRouter } from "./modules/tenants";
import { complianceRouter } from "./modules/compliance";
import { peopleRouter } from "./modules/people/people.router";
import { investorsRouter } from "./modules/investors/investors.router";
import { eventsRouter } from "./modules/events/events.router";
import { resourcesRouter } from "./modules/resources/resources.router";
import { 
  calculatorsRouter, 
  vendorsRouter, 
  regulationsRouter, 
  founderDealsRouter, 
  starterPacksRouter,
  resourceReviewsRouter,
  gatedContentRouter,
  affiliateTrackingRouter
} from "./modules/resources/resourcesEnhanced.router";
import { acceleratorsRouter } from "./modules/accelerators/accelerators.router";
import { companiesRouter } from "./modules/companies/companies.router";
import { stocksRouter } from "./modules/stocks/stocks.router";
import { authorsRouter } from "./modules/authors/authors.router";

// Admin routers
import { taxonomyRouter } from "./admin/taxonomy.router";
import { rbacRouter } from "./admin/rbac.router";
import { partnersRouter } from "./admin/partners.router";
import { newsletterRouter } from "./admin/newsletter.router";
import { writersRouter } from "./admin/writers.router";
import { advertisingRouter } from "./admin/advertising.router";

// User profile router
import { userProfileRouter } from "./modules/userProfile/userProfile.router";
import { browsingHistoryRouter } from "./modules/userProfile/browsingHistory.router";
import { bookmarksRouter } from "./modules/userProfile/bookmarks.router";
import { emailDigestRouter } from "./modules/userProfile/emailDigest.router";
import { claimedProfilesRouter } from "./modules/userProfile/claimedProfiles.router";
import { teamAccessRouter } from "./modules/userProfile/teamAccess.router";
import { userContentRouter } from "./modules/userProfile/userContent.router";
import { jobApplicationsRouter } from "./modules/jobs";
import { workflowAdminRouter } from "./admin/workflow.router";
import { moderationRouter } from "./admin/moderation.router";
import { seoAdminRouter } from "./admin/seo.router";
import { seoAuditRouter } from "./admin/seoAudit.router";
import { mediaRouter } from "./admin/media.router";
import { homepageRouter } from "./admin/homepage.router";
import { popupsRouter } from "./admin/popups.router";
import { wpImportRouter } from "./admin/wp-import.router";
import { dashboardRouter } from "./admin/dashboard.router";
import { integrationsRouter } from "./admin/integrations.router";
import { usersAdminRouter } from "./admin/users.router";
import { entityLinkingRouter } from "./admin/entityLinking.router";
import { entityEnrichmentRouter } from "./admin/entityEnrichment.router";
import { editionsRouter } from "./admin/editions.router";
import { fundingRouter } from "./admin/funding.router";
import { userSubmissionsRouter } from "./modules/admin/userSubmissions.router";
import { aiRouter } from "./admin/ai.router";
import { aiContentRouter } from "./admin/aiContent.router";
import { aiExtendedRouter } from "./admin/aiExtended.router";
import { indexingRouter } from "./admin/indexing.router";
import { masterDataRouter } from "./admin/masterData.router";
import { searchAnalyticsRouter } from "./admin/searchAnalytics.router";
import { systemHealthRouter } from "./admin/systemHealth.router";
import { eventSeedRouter } from "./admin/eventSeed.router";
import { seoSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

export const appRouter = router({
  // System routes
  system: systemRouter,
  
  // Auth routes
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Never ship the bcrypt hash to the client.
      const { password: _password, ...safe } = user as typeof user & { password?: string };
      return safe;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Email/password login (for all users)
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { email, password } = input;
        
        // Find user by email
        const user = await db.getUserByEmail(email);
        if (!user) {
          return { success: false, error: "Invalid email or password" };
        }
        
        // Check if user has a password set
        if (!user.password) {
          return { success: false, error: "Password not set. Please contact admin." };
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return { success: false, error: "Invalid email or password" };
        }
        
        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
        });
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return { 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      }),
    // Register new user with email/password
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(2, "Name must be at least 2 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { email, password, name } = input;
        
        // Check if email already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
          return { success: false, error: "An account with this email already exists" };
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate unique openId for the user
        const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        
        // Create user
        const userId = await db.createUser({
          openId,
          email,
          password: hashedPassword,
          name,
          loginMethod: "email",
          role: "user",
        });
        
        if (!userId) {
          return { success: false, error: "Failed to create account. Please try again." };
        }
        
        // Get the created user
        const user = await db.getUserByEmail(email);
        if (!user) {
          return { success: false, error: "Account created but login failed. Please sign in." };
        }
        
        // Create session token and log user in
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
        });
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return { 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      }),
    
    // userLogin is now an alias for login (kept for backward compatibility)
    userLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { email, password } = input;
        
        const user = await db.getUserByEmail(email);
        if (!user) {
          return { success: false, error: "Invalid email or password" };
        }
        
        if (!user.password) {
          return { success: false, error: "Password not set. Please contact admin." };
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return { success: false, error: "Invalid email or password" };
        }
        
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
        });
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return { 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      }),
    
    // Set password for a user (admin only)
    setPassword: protectedProcedure
      .input(z.object({
        userId: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can set passwords
        if (ctx.user?.role !== "admin") {
          return { success: false, error: "Admin access required" };
        }
        
        const hashedPassword = await bcrypt.hash(input.password, 10);
        await db.updateUserPassword(input.userId, hashedPassword);
        
        return { success: true };
      }),
  }),

  // ============================================================
  // PUBLIC ENDPOINTS
  // ============================================================
  public: router({
    // Public site settings (cached, no auth required)
    siteSettings: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return {};

      const settings = await database.select()
        .from(seoSettings)
        .where(eq(seoSettings.settingGroup, 'site'));

      const settingsMap: Record<string, unknown> = {};
      for (const s of settings) {
        try {
          settingsMap[s.settingKey] = JSON.parse(s.settingValue as string);
        } catch {
          settingsMap[s.settingKey] = s.settingValue;
        }
      }

      return settingsMap;
    }),
  }),

  // ============================================================
  // USER PROFILE
  // ============================================================
  userProfile: userProfileRouter,
  browsingHistory: browsingHistoryRouter,
  bookmarks: bookmarksRouter,
  emailDigest: emailDigestRouter,
  claimedProfiles: claimedProfilesRouter,
  teamAccess: teamAccessRouter,
  userContent: userContentRouter,
  jobApplications: jobApplicationsRouter,

  // ============================================================
  // PUBLIC CONTENT MODULES
  // ============================================================
  news: newsRouter,
  submissions: submissionsRouter,
  newsletters: newslettersRouter,
  stocks: stocksRouter,
  editions: publicEditionsRouter,
  jobs: jobsRouter,
  assessments: assessmentsRouter,
  ats: atsRouter,
  candidates: candidatesRouter,
  github: githubRouter,
  matching: matchingRouter,
  tenants: tenantsRouter,
  compliance: complianceRouter,
  systemHealth: systemHealthRouter,
  adminEventSeed: eventSeedRouter,
  people: peopleRouter,
  investors: investorsRouter,
  events: eventsRouter,
  resources: resourcesRouter,
  calculators: calculatorsRouter,
  vendors: vendorsRouter,
  regulations: regulationsRouter,
  founderDeals: founderDealsRouter,
  starterPacks: starterPacksRouter,
  resourceReviews: resourceReviewsRouter,
  gatedContent: gatedContentRouter,
  affiliateTracking: affiliateTrackingRouter,
  accelerators: acceleratorsRouter,
  companies: companiesRouter,
  authors: authorsRouter,
  funding: fundingRouter,

  // ============================================================
  // ADMIN MODULES
  // ============================================================
  admin: router({
    dashboard: dashboardRouter,
    taxonomy: taxonomyRouter,
    workflow: workflowAdminRouter,
    moderation: moderationRouter,
    userSubmissions: userSubmissionsRouter,
    seo: seoAdminRouter,
    seoAudit: seoAuditRouter,
    integrations: integrationsRouter,
    media: mediaRouter,
    homepage: homepageRouter,
    popups: popupsRouter,
    wpImport: wpImportRouter,
    users: usersAdminRouter,
    entityLinking: entityLinkingRouter,
    entityEnrichment: entityEnrichmentRouter,
    editions: editionsRouter,
    funding: fundingRouter,
    ai: aiRouter,
    aiContent: aiContentRouter,
    aiExtended: aiExtendedRouter,
    // New BRD V3/V4 modules
    rbac: rbacRouter,
    partners: partnersRouter,
    newsletter: newsletterRouter,
    writers: writersRouter,
    advertising: advertisingRouter,
    // Entity routers for quick create access
    companies: companiesRouter,
    people: peopleRouter,
    investors: investorsRouter,
    indexing: indexingRouter,
    masterData: masterDataRouter,
    searchAnalytics: searchAnalyticsRouter,
  }),
});

export type AppRouter = typeof appRouter;
