/**
 * AI Extended Features Router
 * Handles: Streaming, Batch Jobs, Content Versions, Tone Analysis, Plagiarism,
 * SEO, Social Media, Newsletter, Scripts, Entity Linking, Image Generation,
 * Webhooks, Competitive Intelligence, A/B Testing, Content Calendar, Revenue, API Keys
 */
import { publication } from "../../shared/publication";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: ctx as any });
});
import { getDb } from "../db";
import {
  aiContentVersions, aiToneAnalysis, aiPlagiarismChecks, aiBatchJobs,
  aiSocialPosts, aiWebhookConfigs, aiWebhookLogs, aiContentCalendar,
  aiAbTestVariants, aiCompetitorSources, aiCompetitorArticles,
  aiRevenueAttribution, aiApiKeys,
} from "../../drizzle/schema";
import { eq, desc, and, sql, between, count } from "drizzle-orm";
import { toDbDate } from "../_core/dbValues";
import {
  analyzeTone, checkPlagiarism, generateSEO, generateSocialPosts,
  generateNewsletter, generateScript, linkEntitiesToArticle,
  generateArticleImage, triggerWebhooks, analyzeCompetitorArticle,
  generateABVariants, createBatchJob, runBatchJob,
  saveContentVersion, getContentVersions, computeDiff,
} from "../services/ai/extendedFeatures.service";

export const aiExtendedRouter = router({

  // ============================================================
  // BATCH GENERATION
  // ============================================================

  createBatchJob: adminProcedure
    .input(z.object({
      name: z.string(),
      items: z.array(z.object({
        title: z.string(),
        sourceUrl: z.string().optional(),
        sourceText: z.string().optional(),
        contentType: z.string().optional(),
      })),
      provider: z.string().optional(),
      model: z.string().optional(),
      policyId: z.number().optional(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const jobId = await createBatchJob({ ...input, userId: ctx.user.id });
      // Run in background
      runBatchJob(jobId).catch(console.error);
      return { jobId };
    }),

  getBatchJobs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiBatchJobs).orderBy(desc(aiBatchJobs.createdAt)).limit(50);
  }),

  getBatchJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [job] = await db.select().from(aiBatchJobs).where(eq(aiBatchJobs.id, input.id));
      return job || null;
    }),

  cancelBatchJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(aiBatchJobs)
        .set({ status: "cancelled" } as any)
        .where(eq(aiBatchJobs.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // CONTENT VERSIONS / COMPARISON
  // ============================================================

  saveVersion: adminProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
      title: z.string().optional(),
      content: z.string(),
      source: z.enum(["ai_generated", "ai_rewritten", "ai_enhanced", "human_edited", "published"]),
      modelUsed: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await saveContentVersion({ ...input, userId: ctx.user.id });
      return { id };
    }),

  getVersions: adminProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getContentVersions(input.sessionId, input.articleId);
    }),

  compareVersions: adminProcedure
    .input(z.object({
      versionAId: z.number(),
      versionBId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [vA] = await db.select().from(aiContentVersions).where(eq(aiContentVersions.id, input.versionAId));
      const [vB] = await db.select().from(aiContentVersions).where(eq(aiContentVersions.id, input.versionBId));
      if (!vA || !vB) return null;
      const diff = computeDiff(vA.content || "", vB.content || "");
      return { versionA: vA, versionB: vB, diff };
    }),

  // ============================================================
  // TONE ANALYSIS
  // ============================================================

  analyzeTone: adminProcedure
    .input(z.object({
      content: z.string(),
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return analyzeTone(input);
    }),

  getToneHistory: adminProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const condition = input.sessionId
        ? eq(aiToneAnalysis.sessionId, input.sessionId)
        : input.articleId
          ? eq(aiToneAnalysis.articleId, input.articleId)
          : sql`1=1`;
      return db.select().from(aiToneAnalysis).where(condition).orderBy(desc(aiToneAnalysis.createdAt)).limit(20);
    }),

  // ============================================================
  // PLAGIARISM CHECK
  // ============================================================

  checkPlagiarism: adminProcedure
    .input(z.object({
      content: z.string(),
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return checkPlagiarism(input);
    }),

  getPlagiarismHistory: adminProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const condition = input.sessionId
        ? eq(aiPlagiarismChecks.sessionId, input.sessionId)
        : input.articleId
          ? eq(aiPlagiarismChecks.articleId, input.articleId)
          : sql`1=1`;
      return db.select().from(aiPlagiarismChecks).where(condition).orderBy(desc(aiPlagiarismChecks.createdAt)).limit(20);
    }),

  // ============================================================
  // SEO OPTIMIZATION
  // ============================================================

  generateSEO: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      contentType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateSEO(input);
    }),

  // ============================================================
  // SOCIAL MEDIA
  // ============================================================

  generateSocialPosts: adminProcedure
    .input(z.object({
      articleId: z.number().optional(),
      sessionId: z.number().optional(),
      title: z.string(),
      content: z.string(),
      platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "threads"])),
    }))
    .mutation(async ({ input, ctx }) => {
      return generateSocialPosts({ ...input, userId: ctx.user.id });
    }),

  getSocialPosts: adminProcedure
    .input(z.object({
      articleId: z.number().optional(),
      sessionId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const condition = input.articleId
        ? eq(aiSocialPosts.articleId, input.articleId)
        : input.sessionId
          ? eq(aiSocialPosts.sessionId, input.sessionId)
          : sql`1=1`;
      return db.select().from(aiSocialPosts).where(condition).orderBy(desc(aiSocialPosts.createdAt));
    }),

  updateSocialPost: adminProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const { id, ...data } = input;
      await db.update(aiSocialPosts).set(data as any).where(eq(aiSocialPosts.id, id));
      return { success: true };
    }),

  deleteSocialPost: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(aiSocialPosts).where(eq(aiSocialPosts.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // NEWSLETTER
  // ============================================================

  generateNewsletter: adminProcedure
    .input(z.object({
      title: z.string().optional(),
      articleIds: z.array(z.number()).optional(),
      style: z.enum(["daily", "weekly", "monthly"]).optional(),
      customInstructions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateNewsletter(input);
    }),

  // ============================================================
  // PODCAST / VIDEO SCRIPTS
  // ============================================================

  generateScript: adminProcedure
    .input(z.object({
      type: z.enum(["podcast", "video"]),
      title: z.string(),
      content: z.string(),
      duration: z.number().optional(),
      style: z.string().optional(),
      instructions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateScript(input);
    }),

  // ============================================================
  // ENTITY LINKING
  // ============================================================

  linkEntities: adminProcedure
    .input(z.object({
      articleId: z.number(),
      entities: z.array(z.object({
        type: z.string(),
        entityId: z.number(),
        mentionType: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      return linkEntitiesToArticle({ ...input, userId: ctx.user.id });
    }),

  // ============================================================
  // AI IMAGE GENERATION
  // ============================================================

  generateImage: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string().optional(),
      style: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateArticleImage(input);
    }),

  // ============================================================
  // CONTENT CALENDAR
  // ============================================================

  getCalendarItems: adminProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(aiContentCalendar).orderBy(desc(aiContentCalendar.scheduledDate));
      return query.limit(100);
    }),

  createCalendarItem: adminProcedure
    .input(z.object({
      title: z.string(),
      contentType: z.string().optional(),
      scheduledDate: z.string(),
      scheduledTime: z.string().optional(),
      notes: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      tags: z.array(z.string()).optional(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [item] = (await db.insert(aiContentCalendar).values({
        title: input.title,
        contentType: input.contentType || "article",
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime || null,
        notes: input.notes || null,
        priority: (input.priority || "medium") as any,
        tags: input.tags || null,
        assignedTo: input.assignedTo || null,
        createdById: ctx.user.id,
        status: "planned",
      } as any).$returningId()) as unknown as ({id: number})[];
      return { id: item?.id };
    }),

  updateCalendarItem: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
      priority: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const { id, ...data } = input;
      await db.update(aiContentCalendar).set(data as any).where(eq(aiContentCalendar.id, id));
      return { success: true };
    }),

  deleteCalendarItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(aiContentCalendar).where(eq(aiContentCalendar.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // A/B TESTING
  // ============================================================

  generateABVariants: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      variantCount: z.number().optional(),
      testName: z.string(),
      sessionId: z.number().optional(),
      articleId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateABVariants(input);
    }),

  getABTests: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiAbTestVariants).orderBy(desc(aiAbTestVariants.createdAt)).limit(100);
  }),

  updateABVariant: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "active", "winner", "loser", "archived"]).optional(),
      title: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const { id, ...data } = input;
      await db.update(aiAbTestVariants).set(data as any).where(eq(aiAbTestVariants.id, id));
      return { success: true };
    }),

  // ============================================================
  // WEBHOOKS
  // ============================================================

  getWebhooks: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiWebhookConfigs).orderBy(desc(aiWebhookConfigs.createdAt));
  }),

  createWebhook: adminProcedure
    .input(z.object({
      name: z.string(),
      url: z.string().url(),
      secret: z.string().optional(),
      events: z.array(z.string()),
      headers: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [wh] = (await db.insert(aiWebhookConfigs).values({
        name: input.name,
        url: input.url,
        secret: input.secret || null,
        events: input.events,
        headers: (input.headers || null) as Record<string, string> | null,
        isActive: 1,
      } as any).$returningId()) as unknown as ({id: number})[];
      return { id: wh?.id };
    }),

  updateWebhook: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const { id, isActive, ...data } = input;
      const updateData: any = { ...data };
      if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;
      await db.update(aiWebhookConfigs).set(updateData as any).where(eq(aiWebhookConfigs.id, id));
      return { success: true };
    }),

  deleteWebhook: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(aiWebhookConfigs).where(eq(aiWebhookConfigs.id, input.id));
      return { success: true };
    }),

  getWebhookLogs: adminProcedure
    .input(z.object({ webhookId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const condition = input.webhookId
        ? eq(aiWebhookLogs.webhookId, input.webhookId)
        : sql`1=1`;
      return db.select().from(aiWebhookLogs).where(condition).orderBy(desc(aiWebhookLogs.createdAt)).limit(50);
    }),

  testWebhook: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await triggerWebhooks("test", { message: `Test webhook from ${publication.name} AI`, webhookId: input.id });
      return { success: true };
    }),

  // ============================================================
  // COMPETITIVE INTELLIGENCE
  // ============================================================

  getCompetitorSources: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiCompetitorSources).orderBy(desc(aiCompetitorSources.createdAt));
  }),

  createCompetitorSource: adminProcedure
    .input(z.object({
      name: z.string(),
      url: z.string(),
      feedUrl: z.string().optional(),
      sourceType: z.enum(["rss", "web", "api"]).optional(),
      crawlIntervalMinutes: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [source] = (await db.insert(aiCompetitorSources).values({
        name: input.name,
        url: input.url,
        feedUrl: input.feedUrl || null,
        sourceType: (input.sourceType || "rss") as any,
        crawlIntervalMinutes: input.crawlIntervalMinutes || 120,
        isActive: 1,
      } as any).$returningId()) as unknown as ({id: number})[];
      return { id: source?.id };
    }),

  deleteCompetitorSource: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(aiCompetitorSources).where(eq(aiCompetitorSources.id, input.id));
      return { success: true };
    }),

  getCompetitorArticles: adminProcedure
    .input(z.object({
      sourceId: z.number().optional(),
      coverageGap: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let conditions = [];
      if (input.sourceId) conditions.push(eq(aiCompetitorArticles.sourceId, input.sourceId));
      if (input.coverageGap) conditions.push(eq(aiCompetitorArticles.coverageGap, 1));
      const where = conditions.length > 0 ? and(...conditions) : sql`1=1`;
      return db.select().from(aiCompetitorArticles).where(where!).orderBy(desc(aiCompetitorArticles.createdAt)).limit(100);
    }),

  // ============================================================
  // REVENUE ATTRIBUTION
  // ============================================================

  getRevenueData: adminProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      articleId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], totals: { revenue: 0, cost: 0, roi: 0 } };

      const items = await db.select().from(aiRevenueAttribution)
        .orderBy(desc(aiRevenueAttribution.date))
        .limit(100);

      const totals = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(total_revenue), 0)`,
        totalCost: sql<number>`COALESCE(SUM(cost_to_generate), 0)`,
        totalViews: sql<number>`COALESCE(SUM(page_views), 0)`,
      }).from(aiRevenueAttribution);

      const revenue = Number(totals[0]?.totalRevenue || 0);
      const cost = Number(totals[0]?.totalCost || 0);

      return {
        items,
        totals: {
          revenue,
          cost,
          roi: cost > 0 ? ((revenue - cost) / cost) * 100 : 0,
          views: Number(totals[0]?.totalViews || 0),
        },
      };
    }),

  // ============================================================
  // API KEYS
  // ============================================================

  getApiKeys: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: aiApiKeys.id,
      name: aiApiKeys.name,
      keyPrefix: aiApiKeys.keyPrefix,
      permissions: aiApiKeys.permissions,
      rateLimit: aiApiKeys.rateLimit,
      isActive: aiApiKeys.isActive,
      lastUsedAt: aiApiKeys.lastUsedAt,
      expiresAt: aiApiKeys.expiresAt,
      totalRequests: aiApiKeys.totalRequests,
      createdAt: aiApiKeys.createdAt,
    }).from(aiApiKeys).orderBy(desc(aiApiKeys.createdAt));
  }),

  createApiKey: adminProcedure
    .input(z.object({
      name: z.string(),
      permissions: z.array(z.string()).optional(),
      rateLimit: z.number().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      // Generate a random API key
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let key = "ts_ai_";
      for (let i = 0; i < 40; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const prefix = key.substring(0, 12);

      // Simple hash (in production, use bcrypt)
      const encoder = new TextEncoder();
      const data = encoder.encode(key);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const [apiKey] = (await db.insert(aiApiKeys).values({
        name: input.name,
        keyHash,
        keyPrefix: prefix,
        permissions: input.permissions || ["read", "generate"],
        rateLimit: input.rateLimit || 100,
        isActive: 1,
        expiresAt: (input.expiresAt as any) instanceof Date ? toDbDate(new Date(input.expiresAt!)) : input.expiresAt || null,
        createdById: ctx.user.id,
      } as any).$returningId()) as unknown as ({id: number})[];

      return { id: apiKey?.id, key, prefix }; // Return the full key only on creation
    }),

  revokeApiKey: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(aiApiKeys).set({ isActive: 0 } as any).where(eq(aiApiKeys.id, input.id));
      return { success: true };
    }),
});
