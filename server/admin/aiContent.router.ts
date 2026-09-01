/**
 * AI Content Router
 * Comprehensive tRPC router for the AI Content Generation system
 * Handles: content generation, entity management, policies, templates, settings, analytics, agent
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  aiEditorialPolicies, aiContentTemplates, aiGenerationSessions,
  aiEntityExtractions, aiLlmUsageLogs, aiAgentSources,
  aiAgentCrawlLog, aiAgentDiscoveredArticles, aiEntityAliases,
  settings, articles,
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, gte, lte, count, sum, avg } from "drizzle-orm";

// ============================================================
// ADMIN-ONLY MIDDLEWARE
// ============================================================

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ============================================================
// ROUTER
// ============================================================

export const aiContentRouter = router({

  // ============================================================
  // CONTENT GENERATION
  // ============================================================

  /** Generate content using AI */
  generate: adminProcedure
    .input(z.object({
      contentType: z.enum(["article", "company", "person", "investor", "event", "accelerator", "job", "resource", "custom"]),
      title: z.string().optional(),
      url: z.string().optional(),
      rawText: z.string().optional(),
      additionalContext: z.string().optional(),
      templateId: z.number().optional(),
      policyId: z.number().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
      articleType: z.string().optional(),
      categoryIds: z.array(z.number()).optional(),
      tagIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateContent } = await import("../services/ai/contentGenerator.service");
      return generateContent({
        ...input,
        provider: input.provider as any,
        userId: ctx.user!.id,
      });
    }),

  /** Rewrite existing content */
  rewrite: adminProcedure
    .input(z.object({
      content: z.string(),
      title: z.string(),
      instructions: z.string(),
      provider: z.string().optional(),
      model: z.string().optional(),
      policyId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { rewriteContent } = await import("../services/ai/contentGenerator.service");
      return rewriteContent(
        input.content,
        input.title,
        input.instructions,
        input.provider as any,
        input.model,
        input.policyId,
        ctx.user!.id,
      );
    }),

  /** Enhance existing content */
  enhance: adminProcedure
    .input(z.object({
      content: z.string(),
      title: z.string(),
      enhanceType: z.enum(["seo", "readability", "expand", "shorten", "tone"]),
      provider: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { enhanceContent } = await import("../services/ai/contentGenerator.service");
      return enhanceContent(
        input.content,
        input.title,
        input.enhanceType,
        input.provider as any,
        input.model,
        ctx.user!.id,
      );
    }),

  /** Publish generated content (create article/entity from session) */
  publish: adminProcedure
    .input(z.object({
      sessionId: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      featuredImageId: z.number().optional(),
      categoryIds: z.array(z.number()).optional(),
      tagIds: z.array(z.number()).optional(),
      articleType: z.string().optional(),
      seoKeywords: z.string().optional(),
      focusKeywordId: z.number().optional(),
      primaryCategoryId: z.number().optional(),
      createEntities: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { publishGeneratedContent } = await import("../services/ai/contentGenerator.service");
      return publishGeneratedContent(input.sessionId, ctx.user!.id, input);
    }),

  // ============================================================
  // IMAGE SEARCH
  // ============================================================

  /** Search for images */
  searchImages: adminProcedure
    .input(z.object({
      query: z.string(),
      count: z.number().optional(),
      page: z.number().optional(),
      aspectRatio: z.enum(["wide", "square", "tall"]).optional(),
    }))
    .query(async ({ input }) => {
      const { searchImages } = await import("../services/ai/imageSearch.service");
      return searchImages(input);
    }),

  /** Download and store an image */
  storeImage: adminProcedure
    .input(z.object({
      imageUrl: z.string(),
      articleSlug: z.string(),
      title: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { downloadAndStoreImage } = await import("../services/ai/imageSearch.service");
      return downloadAndStoreImage(input.imageUrl, input.articleSlug, input.title);
    }),

  /** Generate an AI image from a text prompt */
  generateAIImage: adminProcedure
    .input(z.object({
      prompt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { generateAIImage } = await import("../services/ai/imageSearch.service");
      return generateAIImage(input.prompt);
    }),

  // ============================================================
  // PDF GENERATION
  // ============================================================

  /** Generate a branded PDF resource */
  generatePDF: adminProcedure
    .input(z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      content: z.string(),
      author: z.string().optional(),
      date: z.string().optional(),
      category: z.string().optional(),
      coverImageUrl: z.string().optional(),
      includeTableOfContents: z.boolean().optional(),
      includeDisclaimer: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { generatePDF } = await import("../services/ai/pdfGenerator.service");
      return generatePDF(input);
    }),

  /** Preview PDF HTML */
  previewPDF: adminProcedure
    .input(z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      content: z.string(),
      author: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { generatePDFPreview } = await import("../services/ai/pdfGenerator.service");
      return generatePDFPreview(input);
    }),

  // ============================================================
  // ENTITY MANAGEMENT
  // ============================================================

  /** Populate entities from a generation session */
  populateEntities: adminProcedure
    .input(z.object({
      sessionId: z.number(),
      articleId: z.number().optional(),
      createNew: z.boolean().default(true),
      updateExisting: z.boolean().default(true),
      autoApprove: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { populateEntities } = await import("../services/ai/entityPopulator.service");
      return populateEntities(input.sessionId, {
        ...input,
        linkToArticle: !!input.articleId,
        userId: ctx.user!.id,
      });
    }),

  /** Get entity extractions for a session */
  getSessionEntities: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aiEntityExtractions)
        .where(eq(aiEntityExtractions.sessionId, input.sessionId))
        .orderBy(desc(aiEntityExtractions.confidence));
    }),

  /** Update entity extraction match */
  updateEntityMatch: adminProcedure
    .input(z.object({
      extractionId: z.number(),
      matchedEntityId: z.number().nullable(),
      matchStatus: z.enum(["new", "existing", "possible_match", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(aiEntityExtractions).set({
        matchedEntityId: input.matchedEntityId,
        matchStatus: input.matchStatus,
      } as any).where(eq(aiEntityExtractions.id, input.extractionId));
      return { success: true };
    }),

  // ============================================================
  // SESSIONS
  // ============================================================

  /** List generation sessions */
  listSessions: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      contentType: z.string().optional(),
      status: z.string().optional(),
      sessionType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sessions: [], total: 0 };

      const conditions = [];
      if (input.contentType) conditions.push(eq(aiGenerationSessions.contentType, input.contentType as any));
      if (input.status) conditions.push(eq(aiGenerationSessions.status, input.status as any));
      if (input.sessionType) conditions.push(eq(aiGenerationSessions.sessionType, input.sessionType as any));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;

      const [sessions, [totalResult]] = await Promise.all([
        db.select().from(aiGenerationSessions)
          .where(where)
          .orderBy(desc(aiGenerationSessions.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: count() }).from(aiGenerationSessions).where(where),
      ]);

      return { sessions, total: totalResult?.count || 0 };
    }),

  /** Get a single session with full details */
  getSession: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [session] = await db.select().from(aiGenerationSessions)
        .where(eq(aiGenerationSessions.id, input.id));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const entities = await db.select().from(aiEntityExtractions)
        .where(eq(aiEntityExtractions.sessionId, input.id));

      return { ...session, entities };
    }),

  /** Delete a session */
  deleteSession: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiEntityExtractions).where(eq(aiEntityExtractions.sessionId, input.id));
      await db.delete(aiGenerationSessions).where(eq(aiGenerationSessions.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // EDITORIAL POLICIES
  // ============================================================

  /** List editorial policies */
  listPolicies: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiEditorialPolicies).orderBy(desc(aiEditorialPolicies.isDefault));
  }),

  /** Get a single policy */
  getPolicy: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [policy] = await db.select().from(aiEditorialPolicies)
        .where(eq(aiEditorialPolicies.id, input.id));
      if (!policy) throw new TRPCError({ code: "NOT_FOUND" });
      return policy;
    }),

  /** Create editorial policy */
  createPolicy: adminProcedure
    .input(z.object({
      name: z.string(),
      contentType: z.string().default("article"),
      rules: z.any(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // If setting as default, unset other defaults for this content type
      if (input.isDefault) {
        await db.update(aiEditorialPolicies).set({ isDefault: 0 } as any)
          .where(eq(aiEditorialPolicies.contentType, input.contentType));
      }

      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [result] = await db.insert(aiEditorialPolicies).values({
        name: input.name,
        slug,
        contentType: input.contentType,
        rules: input.rules,
        isDefault: input.isDefault ? 1 : 0,
      } as any);
      return { id: result.insertId };
    }),

  /** Update editorial policy */
  updatePolicy: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      rules: z.any().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.rules !== undefined) updates.rules = input.rules;
      if (input.isDefault !== undefined) {
        updates.isDefault = input.isDefault ? 1 : 0;
        if (input.isDefault) {
          const [policy] = await db.select().from(aiEditorialPolicies).where(eq(aiEditorialPolicies.id, input.id));
          if (policy) {
            await db.update(aiEditorialPolicies).set({ isDefault: 0 } as any)
              .where(eq(aiEditorialPolicies.contentType, policy.contentType));
          }
        }
      }

      await db.update(aiEditorialPolicies).set(updates as any)
        .where(eq(aiEditorialPolicies.id, input.id));
      return { success: true };
    }),

  /** Delete editorial policy */
  deletePolicy: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiEditorialPolicies).where(eq(aiEditorialPolicies.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // CONTENT TEMPLATES
  // ============================================================

  /** List content templates */
  listTemplates: adminProcedure
    .input(z.object({
      contentType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.contentType) conditions.push(eq(aiContentTemplates.contentType, input.contentType));
      return db.select().from(aiContentTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiContentTemplates.isActive));
    }),

  /** Create content template */
  createTemplate: adminProcedure
    .input(z.object({
      name: z.string(),
      contentType: z.string(),
      articleType: z.string().optional(),
      structure: z.any(),
      promptTemplate: z.string().optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.isDefault) {
        await db.update(aiContentTemplates).set({ isActive: 0 } as any)
          .where(eq(aiContentTemplates.contentType, input.contentType));
      }

      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [result] = await db.insert(aiContentTemplates).values({
        name: input.name,
        slug,
        contentType: input.contentType,
        articleType: input.articleType || null,
        outputSchema: input.structure,
        templatePrompt: input.promptTemplate || 'Default template prompt',
        isActive: input.isDefault ? 1 : 0,
      } as any);
      return { id: result.insertId };
    }),

  /** Update content template */
  updateTemplate: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      structure: z.any().optional(),
      promptTemplate: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.structure !== undefined) updates.outputSchema = input.structure;
      if (input.promptTemplate !== undefined) updates.templatePrompt = input.promptTemplate;
      if (input.isDefault !== undefined) updates.isActive = input.isDefault ? 1 : 0;

      await db.update(aiContentTemplates).set(updates as any)
        .where(eq(aiContentTemplates.id, input.id));
      return { success: true };
    }),

  /** Delete content template */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiContentTemplates).where(eq(aiContentTemplates.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // LLM SETTINGS
  // ============================================================

  /** Get LLM provider configurations */
  getProviderSettings: adminProcedure.query(async () => {
    const { getLLMProviderConfigs, getAvailableModels } = await import("../services/ai/llmProvider.service");
    const configs = await getLLMProviderConfigs();
    const models = getAvailableModels(configs);
    return { configs, models };
  }),

  /** Save LLM provider configurations */
  saveProviderSettings: adminProcedure
    .input(z.array(z.object({
      provider: z.string(),
      apiKey: z.string(),
      baseUrl: z.string().optional(),
      isActive: z.boolean(),
      priority: z.number(),
    })))
    .mutation(async ({ input }) => {
      const { saveLLMProviderConfigs } = await import("../services/ai/llmProvider.service");
      await saveLLMProviderConfigs(input as any);
      return { success: true };
    }),

  /** Get all available models */
  getModels: adminProcedure.query(async () => {
    const { MODEL_REGISTRY } = await import("../services/ai/llmProvider.service");
    return MODEL_REGISTRY;
  }),

  /** Test an LLM provider */
  testProvider: adminProcedure
    .input(z.object({
      provider: z.string(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLMProvider } = await import("../services/ai/llmProvider.service");
      try {
        const response = await invokeLLMProvider({
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say 'Hello from TechScoop AI!' in one sentence." },
          ],
          provider: input.provider as any,
          model: input.model,
          operation: "test",
        });
        return { success: true, response: response.content, latencyMs: response.latencyMs, model: response.model };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  // ============================================================
  // ANALYTICS
  // ============================================================

  /** Get AI usage analytics */
  getAnalytics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      period: z.enum(["day", "week", "month"]).default("week"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalSessions: 0, totalTokens: 0, totalCost: "0.00", byProvider: [], byContentType: [], recentSessions: [] };

      const conditions = [];
      if (input.startDate) conditions.push(gte(aiLlmUsageLogs.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(aiLlmUsageLogs.createdAt, input.endDate));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totals] = await db.select({
        totalSessions: count(),
        totalTokens: sum(aiLlmUsageLogs.totalTokens),
        totalCost: sql<string>`COALESCE(SUM(CAST(${aiLlmUsageLogs.estimatedCostUsd} AS DECIMAL(10,6))), 0)`,
      }).from(aiLlmUsageLogs).where(where);

      const byProvider = await db.select({
        provider: aiLlmUsageLogs.provider,
        count: count(),
        tokens: sum(aiLlmUsageLogs.totalTokens),
        cost: sql<string>`COALESCE(SUM(CAST(${aiLlmUsageLogs.estimatedCostUsd} AS DECIMAL(10,6))), 0)`,
        avgLatency: avg(aiLlmUsageLogs.latencyMs),
      }).from(aiLlmUsageLogs).where(where).groupBy(aiLlmUsageLogs.provider);

      const byOperation = await db.select({
        operation: aiLlmUsageLogs.operation,
        count: count(),
        tokens: sum(aiLlmUsageLogs.totalTokens),
        cost: sql<string>`COALESCE(SUM(CAST(${aiLlmUsageLogs.estimatedCostUsd} AS DECIMAL(10,6))), 0)`,
      }).from(aiLlmUsageLogs).where(where).groupBy(aiLlmUsageLogs.operation);

      const sessionConditions = [];
      if (input.startDate) sessionConditions.push(gte(aiGenerationSessions.createdAt, input.startDate));
      if (input.endDate) sessionConditions.push(lte(aiGenerationSessions.createdAt, input.endDate));
      const sessionWhere = sessionConditions.length > 0 ? and(...sessionConditions) : undefined;

      const byContentType = await db.select({
        contentType: aiGenerationSessions.contentType,
        count: count(),
      }).from(aiGenerationSessions).where(sessionWhere).groupBy(aiGenerationSessions.contentType);

      const recentSessions = await db.select({
        id: aiGenerationSessions.id,
        contentType: aiGenerationSessions.contentType,
        sessionType: aiGenerationSessions.sessionType,
        status: aiGenerationSessions.status,
        generatedTitle: aiGenerationSessions.generatedTitle,
        provider: aiGenerationSessions.llmProvider,
        model: aiGenerationSessions.llmModel,
        tokenCount: aiGenerationSessions.tokenCount,
        estimatedCost: aiGenerationSessions.estimatedCost,
        createdAt: aiGenerationSessions.createdAt,
      }).from(aiGenerationSessions)
        .orderBy(desc(aiGenerationSessions.createdAt))
        .limit(20);

      return {
        totalSessions: totals?.totalSessions || 0,
        totalTokens: Number(totals?.totalTokens || 0),
        totalCost: String(totals?.totalCost || "0.00"),
        byProvider,
        byOperation,
        byContentType,
        recentSessions,
      };
    }),

  // ============================================================
  // NEWS AGENT - SOURCES
  // ============================================================

  /** List agent sources */
  listSources: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(aiAgentSources).orderBy(desc(aiAgentSources.isActive));
  }),

  /** Create agent source */
  createSource: adminProcedure
    .input(z.object({
      name: z.string(),
      url: z.string(),
      sourceType: z.enum(["rss", "web_scrape", "api", "twitter"]),
      crawlFrequencyMinutes: z.number().default(120),
      selectors: z.any().optional(),
      relevanceKeywords: z.any().optional(),
      autoPublish: z.boolean().default(false),
      priority: z.number().default(5),
      // Accept 0-1 decimal or 0-100 integer; stored as 0-100 integer in DB
      relevanceThreshold: z.number().min(0).max(100).default(60),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Normalise to 0-100 integer for DB storage
      const threshold = input.relevanceThreshold <= 1
        ? Math.round(input.relevanceThreshold * 100)
        : Math.round(input.relevanceThreshold);
      const [result] = await db.insert(aiAgentSources).values({
        name: input.name,
        url: input.url,
        feedType: input.sourceType,
        crawlIntervalMinutes: input.crawlFrequencyMinutes,
        scrapingConfig: input.selectors || null,
        autoPublish: input.autoPublish ? 1 : 0,
        priority: input.priority,
        relevanceThreshold: threshold,
        isActive: 1,
      } as any);
      return { id: result.insertId };
    }),

  /** Update agent source */
  updateSource: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().optional(),
      sourceType: z.enum(["rss", "web_scrape", "api", "twitter"]).optional(),
      crawlFrequencyMinutes: z.number().optional(),
      selectors: z.any().optional(),
      relevanceKeywords: z.any().optional(),
      autoPublish: z.boolean().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
      relevanceThreshold: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      const mapped: any = { ...updates };
      if (updates.autoPublish !== undefined) mapped.autoPublish = updates.autoPublish ? 1 : 0;
      if (updates.isActive !== undefined) mapped.isActive = updates.isActive ? 1 : 0;
      if (updates.relevanceThreshold !== undefined) {
        mapped.relevanceThreshold = updates.relevanceThreshold <= 1
          ? Math.round(updates.relevanceThreshold * 100)
          : Math.round(updates.relevanceThreshold);
      }
      await db.update(aiAgentSources).set(mapped as any).where(eq(aiAgentSources.id, id));
      return { success: true };
    }),

  /** Delete agent source */
  deleteSource: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiAgentSources).where(eq(aiAgentSources.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // NEWS AGENT - CRAWL MANAGEMENT
  // ============================================================

  /** Get crawl history */
  getCrawlHistory: adminProcedure
    .input(z.object({
      sourceId: z.number().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];
      if (input.sourceId) conditions.push(eq(aiAgentCrawlLog.sourceId, input.sourceId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rawLogs, [totalResult], sources] = await Promise.all([
        db.select().from(aiAgentCrawlLog)
          .where(where)
          .orderBy(desc(aiAgentCrawlLog.createdAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        db.select({ count: count() }).from(aiAgentCrawlLog).where(where),
        db.select({ id: aiAgentSources.id, name: aiAgentSources.name }).from(aiAgentSources),
      ]);

      const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]));
      const logs = rawLogs.map(log => ({
        ...log,
        sourceName: sourceMap[log.sourceId] || `Source #${log.sourceId}`,
        startedAt: log.createdAt,
        articlesSkipped: (log.articlesFound || 0) - (log.articlesNew || 0),
      }));

      return { logs, total: totalResult?.count || 0 };
    }),

  /** Get discovered articles */
  getDiscoveredArticles: adminProcedure
    .input(z.object({
      sourceId: z.number().optional(),
      status: z.enum(["discovered", "generating", "generated", "approved", "published", "rejected", "duplicate", "irrelevant"]).optional(),
      minScore: z.number().optional(),
      maxScore: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      pubDateFrom: z.string().optional(),
      pubDateTo: z.string().optional(),
      sortBy: z.enum(["crawledAt", "publishedAt", "score"]).default("crawledAt"),
      page: z.number().default(1),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { articles: [], total: 0 };

      const conditions = [];
      if (input.sourceId) conditions.push(eq(aiAgentDiscoveredArticles.sourceId, input.sourceId));
      if (input.status) conditions.push(eq(aiAgentDiscoveredArticles.status, input.status));
      if (input.minScore != null) conditions.push(gte(aiAgentDiscoveredArticles.relevanceScore, input.minScore));
      if (input.maxScore != null) conditions.push(lte(aiAgentDiscoveredArticles.relevanceScore, input.maxScore));
      if (input.dateFrom) conditions.push(gte(aiAgentDiscoveredArticles.createdAt, new Date(input.dateFrom).toISOString()));
      if (input.dateTo) conditions.push(lte(aiAgentDiscoveredArticles.createdAt, new Date(input.dateTo).toISOString()));
      if (input.pubDateFrom) conditions.push(gte(aiAgentDiscoveredArticles.externalPublishedAt, new Date(input.pubDateFrom) as any));
      if (input.pubDateTo) conditions.push(lte(aiAgentDiscoveredArticles.externalPublishedAt, new Date(input.pubDateTo) as any));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const orderCol = input.sortBy === 'score'
        ? desc(aiAgentDiscoveredArticles.relevanceScore)
        : input.sortBy === 'publishedAt'
        ? desc(aiAgentDiscoveredArticles.externalPublishedAt)
        : desc(aiAgentDiscoveredArticles.createdAt);

      const [rawArticles, [totalResult], sources] = await Promise.all([
        db.select().from(aiAgentDiscoveredArticles)
          .where(where)
          .orderBy(orderCol)
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        db.select({ count: count() }).from(aiAgentDiscoveredArticles).where(where),
        db.select({ id: aiAgentSources.id, name: aiAgentSources.name }).from(aiAgentSources),
      ]);

      const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]));
      const articles = rawArticles.map(a => ({
        ...a,
        // Normalize field names for UI compatibility
        title: a.externalTitle || 'Untitled',
        summary: a.externalExcerpt || '',
        sourceUrl: a.externalUrl,
        author: a.externalAuthor || null,
        discoveredAt: a.createdAt,
        originalPublishedAt: a.externalPublishedAt || null,
        sourceName: sourceMap[a.sourceId] || `Source #${a.sourceId}`,
        // Normalize status: 'discovered' -> 'pending' for UI display
        status: a.status === 'discovered' ? 'pending' : a.status,
      }));

      return { articles, total: totalResult?.count || 0 };
    }),

  /** Approve a discovered article for generation */
  approveDiscovered: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(aiAgentDiscoveredArticles).set({
        status: "approved",
      } as any).where(eq(aiAgentDiscoveredArticles.id, input.id));
      return { success: true };
    }),

  /** Reject a discovered article */
  rejectDiscovered: adminProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(aiAgentDiscoveredArticles).set({
        status: "rejected",
      } as any).where(eq(aiAgentDiscoveredArticles.id, input.id));
      return { success: true };
    }),

  /** Generate article from discovered item */
  generateFromDiscovered: adminProcedure
    .input(z.object({
      discoveredId: z.number(),
      provider: z.string().optional(),
      model: z.string().optional(),
      policyId: z.number().optional(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [discovered] = await db.select().from(aiAgentDiscoveredArticles)
        .where(eq(aiAgentDiscoveredArticles.id, input.discoveredId));
      if (!discovered) throw new TRPCError({ code: "NOT_FOUND" });

      // Update status to generating
      await db.update(aiAgentDiscoveredArticles).set({ status: "generating" } as any)
        .where(eq(aiAgentDiscoveredArticles.id, input.discoveredId));

      try {
        const { generateContent, publishGeneratedContent } = await import("../services/ai/contentGenerator.service");
        const result = await generateContent({
          contentType: "article",
          sessionType: "agent",
          title: discovered.externalTitle || undefined,
          url: discovered.externalUrl,
          rawText: discovered.externalContent || undefined,
          additionalContext: discovered.externalExcerpt || undefined,
          provider: input.provider as any,
          model: input.model,
          policyId: input.policyId,
          templateId: input.templateId,
          agentSourceId: discovered.sourceId,
          userId: ctx.user!.id,
        });

        // Auto-create a Draft article so it appears in the editorial queue
        let articleId: number | undefined;
        try {
          const published = await publishGeneratedContent(result.sessionId, ctx.user!.id);
          articleId = published.articleId;
          // Force status to Draft (id=1) so editors review before it enters approval
          // Also mark as auto-generated and link back to the discovered article
          if (articleId) {
            await db.update(articles).set({
              statusId: 1,
              autoGenerated: 1,
              discoveredArticleId: input.discoveredId,
            } as any).where(eq(articles.id, articleId));
          }
        } catch (pubErr: any) {
          console.warn("[NewsAgent] Auto-draft creation failed:", pubErr.message);
        }

        // Update discovered article with session and article references
        await db.update(aiAgentDiscoveredArticles).set({
          status: "generated",
          generationSessionId: result.sessionId,
        } as any).where(eq(aiAgentDiscoveredArticles.id, input.discoveredId));

        return { ...result, articleId };
      } catch (err: any) {
        await db.update(aiAgentDiscoveredArticles).set({ status: "discovered" } as any)
          .where(eq(aiAgentDiscoveredArticles.id, input.discoveredId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** Trigger manual crawl for a source */
  triggerCrawl: adminProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ input }) => {
      const { crawlSource } = await import("../services/ai/newsAgent.service");
      return crawlSource(input.sourceId);
    }),

  /** Trigger crawl for all active sources */
  triggerCrawlAll: adminProcedure.mutation(async () => {
    const { crawlAllSources } = await import("../services/ai/newsAgent.service");
    return crawlAllSources();
  }),

  // ============================================================
  // ENTITY ALIASES
  // ============================================================

  /** List entity aliases */
  listAliases: adminProcedure
    .input(z.object({
      entityType: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { aliases: [], total: 0 };

      const conditions = [];
      if (input.entityType) conditions.push(eq(aiEntityAliases.entityType, input.entityType));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [aliases, [totalResult]] = await Promise.all([
        db.select().from(aiEntityAliases)
          .where(where)
          .orderBy(desc(aiEntityAliases.createdAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        db.select({ count: count() }).from(aiEntityAliases).where(where),
      ]);

      return { aliases, total: totalResult?.count || 0 };
    }),

  /** Create entity alias */
  createAlias: adminProcedure
    .input(z.object({
      entityType: z.string(),
      alias: z.string(),
      canonicalEntityId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(aiEntityAliases).values({
        entityType: input.entityType,
        alias: input.alias.trim().toLowerCase(),
        entityId: input.canonicalEntityId,
      } as any);
      return { id: result.insertId };
    }),

  /** Delete entity alias */
  deleteAlias: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiEntityAliases).where(eq(aiEntityAliases.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // AGENT STATS
  // ============================================================

  /** Get aggregated agent statistics */
  getAgentStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalSources: 0, activeSources: 0, totalCrawls: 0, articlesDiscovered: 0, articlesPublished: 0, lastCrawlAt: null };
    const [[totalSourcesResult], [activeSourcesResult], [crawlResult], [discoveredResult], [publishedResult], lastCrawlRows] = await Promise.all([
      db.select({ total: count() }).from(aiAgentSources),
      db.select({ total: count() }).from(aiAgentSources).where(eq(aiAgentSources.isActive, 1)),
      db.select({ total: count() }).from(aiAgentCrawlLog),
      db.select({ total: count() }).from(aiAgentDiscoveredArticles),
      db.select({ total: count() }).from(aiAgentDiscoveredArticles).where(eq(aiAgentDiscoveredArticles.status, 'generated')),
      db.select({ lastCrawlAt: aiAgentCrawlLog.createdAt }).from(aiAgentCrawlLog).orderBy(desc(aiAgentCrawlLog.createdAt)).limit(1),
    ]);
    return {
      totalSources: totalSourcesResult?.total || 0,
      activeSources: activeSourcesResult?.total || 0,
      totalCrawls: crawlResult?.total || 0,
      articlesDiscovered: discoveredResult?.total || 0,
      articlesPublished: publishedResult?.total || 0,
      lastCrawlAt: lastCrawlRows[0]?.lastCrawlAt || null,
    };
  }),

  // ============================================================
  // AGENT SETTINGS
  // ============================================================

  /** Get agent settings */
  getAgentSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return getDefaultAgentSettings();

    const [row] = await db.select().from(settings).where(eq(settings.key, "ai_agent_settings"));
    if (!row?.value) return getDefaultAgentSettings();
    return row.value as any;
  }),

  /** Save agent settings */
  saveAgentSettings: adminProcedure
    .input(z.object({
      enabled: z.boolean(),
      crawlIntervalMinutes: z.number().min(30),
      maxArticlesPerCrawl: z.number().min(1).max(100),
      relevanceThreshold: z.number().min(0).max(1),
      autoGenerateAboveThreshold: z.number().min(0).max(1),
      defaultProvider: z.string(),
      defaultModel: z.string().optional(),
      defaultPolicyId: z.number().optional(),
      defaultTemplateId: z.number().optional(),
      notifyOnNewArticles: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(settings).where(eq(settings.key, "ai_agent_settings"));
      if (existing) {
        await db.update(settings).set({ value: input as any } as any).where(eq(settings.key, "ai_agent_settings"));
      } else {
        await db.insert(settings).values({
          key: "ai_agent_settings",
          value: input as any,
          type: "json",
          group: "ai",
          label: "News Agent Settings",
          description: "Configuration for the autonomous news agent",
          isPublic: 0,
        } as any);
      }
      return { success: true };
    }),

  // ─── v2.0: KEYWORD MANAGEMENT ─────────────────────────────────────────────
  getKeywords: adminProcedure
    .input(z.object({
      category: z.string().optional(),
      tier: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().default(200),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await (db as any).$client.execute(
        `SELECT * FROM ai_agent_keywords WHERE is_active = 1 ${input?.category ? 'AND category = ?' : ''} ${input?.tier ? 'AND tier = ?' : ''} ${input?.search ? 'AND (keyword LIKE ? OR category LIKE ?)' : ''} ORDER BY tier ASC, weight DESC LIMIT ${input?.limit || 200}`,
        [...(input?.category ? [input.category] : []), ...(input?.tier ? [input.tier] : []), ...(input?.search ? [`%${input.search}%`, `%${input.search}%`] : [])]
      );
      return rows as any[];
    }),

  addKeyword: adminProcedure
    .input(z.object({
      keyword: z.string().min(1),
      category: z.string().default('general'),
      tier: z.number().min(1).max(3).default(2),
      weight: z.number().min(0).max(5).default(1),
      language: z.string().default('en'),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await (db as any).$client.execute(
        'INSERT INTO ai_agent_keywords (keyword, category, tier, weight, language, is_active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE weight = VALUES(weight), is_active = VALUES(is_active)',
        [input.keyword, input.category, input.tier, input.weight, input.language, input.isActive ? 1 : 0]
      );
      return { success: true };
    }),

  updateKeyword: adminProcedure
    .input(z.object({
      id: z.number(),
      keyword: z.string().optional(),
      category: z.string().optional(),
      tier: z.number().min(1).max(3).optional(),
      weight: z.number().min(0).max(5).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      const sets: string[] = [];
      const vals: any[] = [];
      if (fields.keyword !== undefined) { sets.push('keyword = ?'); vals.push(fields.keyword); }
      if (fields.category !== undefined) { sets.push('category = ?'); vals.push(fields.category); }
      if (fields.tier !== undefined) { sets.push('tier = ?'); vals.push(fields.tier); }
      if (fields.weight !== undefined) { sets.push('weight = ?'); vals.push(fields.weight); }
      if (fields.isActive !== undefined) { sets.push('is_active = ?'); vals.push(fields.isActive ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      vals.push(id);
      await (db as any).$client.execute(`UPDATE ai_agent_keywords SET ${sets.join(', ')} WHERE id = ?`, vals);
      return { success: true };
    }),

  deleteKeyword: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await (db as any).$client.execute('DELETE FROM ai_agent_keywords WHERE id = ?', [input.id]);
      return { success: true };
    }),

  bulkImportKeywords: adminProcedure
    .input(z.object({
      keywords: z.array(z.object({
        keyword: z.string(),
        category: z.string().default('general'),
        tier: z.number().min(1).max(3).default(2),
        weight: z.number().min(0).max(5).default(1),
        language: z.string().default('en'),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let added = 0;
      for (const kw of input.keywords) {
        await (db as any).$client.execute(
          'INSERT IGNORE INTO ai_agent_keywords (keyword, category, tier, weight, language, is_active) VALUES (?, ?, ?, ?, ?, 1)',
          [kw.keyword, kw.category, kw.tier, kw.weight, kw.language]
        );
        added++;
      }
      return { success: true, added };
    }),

  // ─── v2.0: TAXONOMY MANAGEMENT ─────────────────────────────────────────────
  getTaxonomy: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [rows] = await (db as any).$client.execute(
      'SELECT * FROM ai_agent_taxonomy WHERE is_active = 1 ORDER BY tier ASC, name ASC'
    );
    return rows as any[];
  }),

  updateTaxonomyCategory: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      tier: z.number().min(1).max(3).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      const sets: string[] = [];
      const vals: any[] = [];
      if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name); }
      if (fields.tier !== undefined) { sets.push('tier = ?'); vals.push(fields.tier); }
      if (fields.description !== undefined) { sets.push('description = ?'); vals.push(fields.description); }
      if (fields.isActive !== undefined) { sets.push('is_active = ?'); vals.push(fields.isActive ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      vals.push(id);
      await (db as any).$client.execute(`UPDATE ai_agent_taxonomy SET ${sets.join(', ')} WHERE id = ?`, vals);
      return { success: true };
    }),

  addTaxonomyCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      tier: z.number().min(1).max(3).default(2),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await (db as any).$client.execute(
        'INSERT INTO ai_agent_taxonomy (name, tier, description, is_active) VALUES (?, ?, ?, 1)',
        [input.name, input.tier, input.description || null]
      );
      return { success: true };
    }),

  // ─── v2.0: MENA ENTITY MANAGEMENT ──────────────────────────────────────────
  getEntities: adminProcedure
    .input(z.object({
      type: z.string().optional(),
      country: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: string[] = ['is_active = 1'];
      const vals: any[] = [];
      if (input?.type) { conditions.push('entity_type = ?'); vals.push(input.type); }
      if (input?.country) { conditions.push('country = ?'); vals.push(input.country); }
      if (input?.search) { conditions.push('(name LIKE ? OR aliases LIKE ?)'); vals.push(`%${input.search}%`, `%${input.search}%`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [rows] = await (db as any).$client.execute(
        `SELECT * FROM ai_agent_entities ${where} ORDER BY name ASC LIMIT ${input?.limit || 100} OFFSET ${input?.offset || 0}`,
        vals
      );
      const [[{ total }]] = await (db as any).$client.execute(
        `SELECT COUNT(*) as total FROM ai_agent_entities ${where}`, vals
      );
      return { entities: rows as any[], total: Number(total) };
    }),

  addEntity: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      entityType: z.enum(['company', 'fund', 'person', 'city', 'country', 'government', 'accelerator', 'university', 'event']),
      country: z.string().optional(),
      aliases: z.array(z.string()).optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      tier: z.number().min(1).max(3).default(2),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await (db as any).$client.execute(
        'INSERT INTO ai_agent_entities (name, entity_type, country, aliases, website, description, tier, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [input.name, input.entityType, input.country || null, input.aliases ? JSON.stringify(input.aliases) : null, input.website || null, input.description || null, input.tier]
      );
      return { success: true };
    }),

  updateEntity: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      entityType: z.string().optional(),
      country: z.string().optional(),
      aliases: z.array(z.string()).optional(),
      tier: z.number().min(1).max(3).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      const sets: string[] = [];
      const vals: any[] = [];
      if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name); }
      if (fields.entityType !== undefined) { sets.push('entity_type = ?'); vals.push(fields.entityType); }
      if (fields.country !== undefined) { sets.push('country = ?'); vals.push(fields.country); }
      if (fields.aliases !== undefined) { sets.push('aliases = ?'); vals.push(JSON.stringify(fields.aliases)); }
      if (fields.tier !== undefined) { sets.push('tier = ?'); vals.push(fields.tier); }
      if (fields.isActive !== undefined) { sets.push('is_active = ?'); vals.push(fields.isActive ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      vals.push(id);
      await (db as any).$client.execute(`UPDATE ai_agent_entities SET ${sets.join(', ')} WHERE id = ?`, vals);
      return { success: true };
    }),

  // ─── v2.0: BULK ACTIONS ─────────────────────────────────────────────────────
  bulkDismissArticles: adminProcedure
    .input(z.object({
      ids: z.array(z.number()).optional(),
      belowScore: z.number().optional(),
      olderThanDays: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let dismissed = 0;
      if (input.ids?.length) {
        const placeholders = input.ids.map(() => '?').join(',');
        const [r] = await (db as any).$client.execute(
          `UPDATE ai_agent_discovered_articles SET status = 'dismissed' WHERE id IN (${placeholders}) AND status IN ('discovered', 'pending')`,
          input.ids
        );
        dismissed += (r as any).affectedRows || 0;
      }
      if (input.belowScore !== undefined) {
        const [r] = await (db as any).$client.execute(
          `UPDATE ai_agent_discovered_articles SET status = 'dismissed' WHERE relevance_score < ? AND status IN ('discovered', 'pending')`,
          [input.belowScore]
        );
        dismissed += (r as any).affectedRows || 0;
      }
      if (input.olderThanDays !== undefined) {
        const cutoff = new Date(Date.now() - input.olderThanDays * 86400000).toISOString().slice(0, 19).replace('T', ' ');
        const [r] = await (db as any).$client.execute(
          `UPDATE ai_agent_discovered_articles SET status = 'dismissed' WHERE created_at < ? AND status IN ('discovered', 'pending')`,
          [cutoff]
        );
        dismissed += (r as any).affectedRows || 0;
      }
      return { success: true, dismissed };
    }),

  bulkGenerateArticles: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      // Queue up to 5 articles for generation
      const toProcess = input.ids.slice(0, 5);
      const results: { id: number; success: boolean; error?: string }[] = [];
      for (const id of toProcess) {
        try {
          
          results.push({ id, success: true });
        } catch (err: any) {
          results.push({ id, success: false, error: err.message });
        }
      }
      return { success: true, results };
    }),

  // ─── v2.0: AGENT ANALYTICS ──────────────────────────────────────────────────
  getAgentAnalytics: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const days = input?.days || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');

      // Daily crawl activity
      const [dailyCrawls] = await (db as any).$client.execute(
        `SELECT DATE(created_at) as date, COUNT(*) as crawls, SUM(articles_found) as found, SUM(articles_new) as new_articles
         FROM ai_agent_crawl_log WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date ASC`,
        [since]
      );

      // Score distribution
      const [scoreDistribution] = await (db as any).$client.execute(
        `SELECT
          SUM(CASE WHEN relevance_score >= 70 THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN relevance_score >= 40 AND relevance_score < 70 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN relevance_score < 40 THEN 1 ELSE 0 END) as low,
          AVG(relevance_score) as avg_score,
          MAX(relevance_score) as max_score
         FROM ai_agent_discovered_articles WHERE created_at >= ?`,
        [since]
      );

      // Top sources by article count
      const [topSources] = await (db as any).$client.execute(
        `SELECT s.name, COUNT(a.id) as count, AVG(a.relevance_score) as avg_score
         FROM ai_agent_discovered_articles a
         JOIN ai_agent_sources s ON a.source_id = s.id
         WHERE a.created_at >= ?
         GROUP BY s.id, s.name ORDER BY count DESC LIMIT 10`,
        [since]
      );

      // Status breakdown
      const [statusBreakdown] = await (db as any).$client.execute(
        `SELECT status, COUNT(*) as count FROM ai_agent_discovered_articles WHERE created_at >= ? GROUP BY status`,
        [since]
      );

      // Category distribution (from taxonomy)
      const [categoryBreakdown] = await (db as any).$client.execute(
        `SELECT category, COUNT(*) as count, AVG(relevance_score) as avg_score
         FROM ai_agent_discovered_articles
         WHERE created_at >= ? AND category IS NOT NULL
         GROUP BY category ORDER BY count DESC LIMIT 10`,
        [since]
      );

      // LLM usage stats
      const [llmStats] = await (db as any).$client.execute(
        `SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens, SUM(estimated_cost_usd) as cost
         FROM ai_llm_usage_logs WHERE created_at >= ? GROUP BY provider`,
        [since]
      );

      return {
        dailyCrawls: dailyCrawls as any[],
        scoreDistribution: (scoreDistribution as any[])[0] || { high: 0, medium: 0, low: 0, avg_score: 0, max_score: 0 },
        topSources: topSources as any[],
        statusBreakdown: statusBreakdown as any[],
        categoryBreakdown: categoryBreakdown as any[],
        llmStats: llmStats as any[],
      };
    }),

  // ─── v2.0: UPDATE SOURCE (extended with new fields) ─────────────────────────
  updateSourceV2: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().optional(),
      feedUrl: z.string().optional(),
      feedType: z.string().optional(),
      relevanceThreshold: z.number().min(0).max(100).optional(),
      crawlIntervalMinutes: z.number().min(30).optional(),
      maxAgeHours: z.number().min(1).optional().nullable(),
      editorialBrief: z.string().optional().nullable(),
      mustWatchKeywords: z.array(z.string()).optional(),
      ignoreKeywords: z.array(z.string()).optional(),
      authorityScore: z.number().min(0).max(100).optional(),
      autoGenerateEnabled: z.boolean().optional(),
      language: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, mustWatchKeywords, ignoreKeywords, ...rest } = input;
      const sets: string[] = [];
      const vals: any[] = [];
      const fieldMap: Record<string, string> = {
        name: 'name', url: 'url', feedUrl: 'feed_url', feedType: 'feed_type',
        relevanceThreshold: 'relevance_threshold', crawlIntervalMinutes: 'crawl_interval_minutes',
        maxAgeHours: 'max_age_hours', editorialBrief: 'editorial_brief',
        authorityScore: 'authority_score', autoGenerateEnabled: 'auto_generate_enabled',
        language: 'language', isActive: 'is_active',
      };
      for (const [key, col] of Object.entries(fieldMap)) {
        if ((rest as any)[key] !== undefined) {
          sets.push(`${col} = ?`);
          const val = (rest as any)[key];
          vals.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
      }
      if (mustWatchKeywords !== undefined) { sets.push('must_watch_keywords = ?'); vals.push(JSON.stringify(mustWatchKeywords)); }
      if (ignoreKeywords !== undefined) { sets.push('ignore_keywords = ?'); vals.push(JSON.stringify(ignoreKeywords)); }
      if (sets.length === 0) return { success: true };
      vals.push(id);
      await (db as any).$client.execute(`UPDATE ai_agent_sources SET ${sets.join(', ')} WHERE id = ?`, vals);
      return { success: true };
    }),

  // ─── v2.0: EDITORIAL FEEDBACK ───────────────────────────────────────────────
  submitEditorialFeedback: adminProcedure
    .input(z.object({
      discoveredArticleId: z.number().optional(),
      articleId: z.number().optional(),
      action: z.enum(['approve', 'reject', 'edit', 'publish', 'request_revision']),
      feedbackNotes: z.string().optional(),
      editDistance: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await (db as any).$client.execute(
        `INSERT INTO ai_editorial_feedback (discovered_article_id, article_id, editor_id, action, feedback_notes, edit_distance)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [input.discoveredArticleId || null, input.articleId || null, ctx.user.id, input.action, input.feedbackNotes || null, input.editDistance || null]
      );
      // Update Stage 3 score for the source based on feedback
      if (input.discoveredArticleId) {
        const adjustment = input.action === 'publish' ? 5 : input.action === 'reject' ? -5 : 0;
        if (adjustment !== 0) {
          await (db as any).$client.execute(
            `UPDATE ai_agent_discovered_articles SET stage3_adjustment = COALESCE(stage3_adjustment, 0) + ? WHERE id = ?`,
            [adjustment, input.discoveredArticleId]
          );
        }
      }
      return { success: true };
    }),

  getEditorialFeedback: adminProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await (db as any).$client.execute(
        `SELECT f.*, u.name as editor_name FROM ai_editorial_feedback f
         LEFT JOIN users u ON f.editor_id = u.id
         ORDER BY f.created_at DESC LIMIT ?`,
        [input?.limit || 50]
      );
      return rows as any[];
    }),

  // ─── v2.0: SCORE BREAKDOWN FOR ARTICLE ──────────────────────────────────────
  getArticleScoreBreakdown: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await (db as any).$client.execute(
        `SELECT a.*, s.name as source_name, s.editorial_brief, s.authority_score
         FROM ai_agent_discovered_articles a
         JOIN ai_agent_sources s ON a.source_id = s.id
         WHERE a.id = ?`,
        [input.id]
      );
      if (!(rows as any[]).length) throw new TRPCError({ code: 'NOT_FOUND' });
      const article = (rows as any[])[0];
      return {
        ...article,
        menaEntities: article.mena_entities ? JSON.parse(article.mena_entities) : [],
        stage1Score: article.stage1_score,
        stage2Score: article.stage2_score,
        stage3Adjustment: article.stage3_adjustment,
        editorialTier: article.editorial_tier,
        llmReasoning: article.llm_reasoning,
        suggestedAngle: article.suggested_angle,
        contentLanguage: article.content_language,
        llmConfidence: article.llm_confidence,
      };
    }),

  // ========================================================
  // PHASE 2B SCAFFOLD — INLINE EDITOR SEO ASSISTANCE
  // ========================================================
  // These three procedures are the backend the article editor will call
  // for live AI suggestions while writers compose. The editor UI hookup
  // is a follow-up commit; shipping the API surface now so it's reviewable
  // and the UI work is decoupled.
  //
  // Each procedure is small + cheap + cacheable on the client. The editor
  // will debounce calls (~800ms after typing stops) so an article generates
  // ~3-5 LLM calls during composition, not one per keystroke.

  /**
   * Suggest a meta title given the article's working title + body.
   * Returns 3 alternatives with confidence scores so the writer picks one.
   */
  suggestMetaTitle: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      content: z.string().max(50_000).optional(),
      focusKeyword: z.string().max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You write SEO meta titles for tech-news articles. Return ONLY valid JSON: " +
              '{"suggestions":[{"title":"...","reasoning":"..."},{...},{...}]}. ' +
              "Three suggestions, each 50-60 characters, including the focus keyword if given. " +
              "Front-load the keyword. No clickbait, no ALL CAPS, no emoji.",
          },
          {
            role: "user",
            content:
              `Article title: ${input.title}\n` +
              (input.focusKeyword ? `Focus keyword: ${input.focusKeyword}\n` : "") +
              (input.content ? `Body excerpt: ${input.content.slice(0, 1000)}\n` : ""),
          },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("empty LLM response");
      const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(cleaned);
        return { suggestions: parsed.suggestions ?? [] };
      } catch {
        return { suggestions: [], rawResponse: raw };
      }
    }),

  /**
   * Suggest a meta description given the article body.
   */
  suggestMetaDescription: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1).max(50_000),
      focusKeyword: z.string().max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You write SEO meta descriptions for tech-news articles. Return ONLY valid JSON: " +
              '{"suggestions":[{"description":"...","reasoning":"..."},{...}]}. ' +
              "Two suggestions, each 140-160 characters, including the focus keyword if given. " +
              "Active voice. End with implicit value (\"how\", \"why\", \"$Xm raised\"). " +
              "No clickbait, no \"learn more\", no \"in this article\".",
          },
          {
            role: "user",
            content:
              `Title: ${input.title}\n` +
              (input.focusKeyword ? `Focus keyword: ${input.focusKeyword}\n` : "") +
              `Body: ${input.content.slice(0, 2000)}`,
          },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("empty LLM response");
      const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(cleaned);
        return { suggestions: parsed.suggestions ?? [] };
      } catch {
        return { suggestions: [], rawResponse: raw };
      }
    }),

  /**
   * Real-time SEO score for the article being composed. No LLM call —
   * pure heuristics so the editor can show this on every keystroke.
   * Returns 0-100 score + ordered list of issues to address.
   */
  scoreArticleSeo: adminProcedure
    .input(z.object({
      title: z.string().max(500),
      seoTitle: z.string().max(500).optional(),
      seoDescription: z.string().max(500).optional(),
      content: z.string().max(100_000).optional(),
      focusKeyword: z.string().max(100).optional(),
      hasFeaturedImage: z.boolean().optional(),
      hasAuthor: z.boolean().optional(),
    }))
    .query(({ input }) => {
      const issues: Array<{ field: string; severity: "critical" | "warning" | "info"; message: string }> = [];
      const effectiveTitle = input.seoTitle || input.title;
      const stripped = (input.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const wordCount = stripped ? stripped.split(/\s+/).length : 0;
      const fk = (input.focusKeyword || "").toLowerCase().trim();

      if (!effectiveTitle) issues.push({ field: "seoTitle", severity: "critical", message: "Missing title" });
      else if (effectiveTitle.length > 60) issues.push({ field: "seoTitle", severity: "warning", message: `Title is ${effectiveTitle.length} chars — may be truncated` });
      else if (effectiveTitle.length < 30) issues.push({ field: "seoTitle", severity: "info", message: "Title is very short" });

      if (!input.seoDescription) issues.push({ field: "seoDescription", severity: "critical", message: "Missing meta description" });
      else if (input.seoDescription.length > 160) issues.push({ field: "seoDescription", severity: "warning", message: `Description is ${input.seoDescription.length} chars — will be truncated` });
      else if (input.seoDescription.length < 120) issues.push({ field: "seoDescription", severity: "info", message: "Description is short — aim for 140-160" });

      if (fk && effectiveTitle && !effectiveTitle.toLowerCase().includes(fk)) issues.push({ field: "seoTitle", severity: "warning", message: "Focus keyword missing from title" });
      if (fk && input.seoDescription && !input.seoDescription.toLowerCase().includes(fk)) issues.push({ field: "seoDescription", severity: "info", message: "Focus keyword missing from description" });
      if (fk && stripped && !stripped.toLowerCase().includes(fk)) issues.push({ field: "content", severity: "warning", message: "Focus keyword not found in body" });

      if (wordCount > 0 && wordCount < 300) issues.push({ field: "content", severity: "info", message: `Body is ${wordCount} words — 300+ ranks better` });
      if (input.hasFeaturedImage === false) issues.push({ field: "featuredImage", severity: "warning", message: "No featured image" });
      if (input.hasAuthor === false) issues.push({ field: "author", severity: "info", message: "No author byline" });

      // Score: -10 critical, -5 warning, -2 info, capped at 0
      const penalty = issues.reduce((acc, i) =>
        acc + (i.severity === "critical" ? 10 : i.severity === "warning" ? 5 : 2), 0);
      const score = Math.max(0, Math.min(100, 100 - penalty));

      return {
        score,
        issues,
        wordCount,
      };
    }),

  /**
   * AI Compose — single-shot article generation from a brief.
   *
   * Takes a topic / brief / source URL and returns a fully-populated
   * draft: title + slug + excerpt + body (HTML) + suggested SEO title +
   * suggested meta description + suggested tags + suggested categories.
   *
   * Designed for the "write with AI" workflow on the article editor:
   * writer pastes a brief or paragraph of source material, clicks
   * Generate, every field on the editor populates with editable
   * suggestions. Writer reviews and publishes.
   *
   * The single LLM call returns everything in one JSON shape so we
   * avoid 6 round-trips. Cost ≈ one 3-5k-token completion.
   */
  composeArticle: adminProcedure
    .input(z.object({
      brief: z.string().min(20).max(8000),
      sourceUrl: z.string().url().optional(),
      // Optional steering — author can pre-set tone or focus
      tone: z.enum(["news", "analysis", "feature", "interview", "explainer"]).optional(),
      targetWordCount: z.number().int().min(200).max(3000).optional(),
      focusKeyword: z.string().max(100).optional(),
      policyId: z.number().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const wordTarget = input.targetWordCount || 700;
      const tone = input.tone || "news";

      const sys =
        "You are an editorial assistant for TechScoop, a MENA tech publication. Given a writer's brief, " +
        "produce a complete article draft with metadata, entities, location, and funding details. " +
        "Return ONLY valid JSON matching this exact shape (no commentary, no Markdown code fences):\n" +
        "{\n" +
        '  "title": "Headline 8–14 words, no clickbait",\n' +
        '  "slug": "lowercase-hyphenated-slug",\n' +
        '  "excerpt": "2–3 sentence summary, ≤300 chars",\n' +
        '  "bodyHtml": "Full article body as clean HTML (<p>, <h2>, <ul>, <a>). 600–900 words.",\n' +
        '  "seoTitle": "Front-load the focus keyword, 50–60 chars",\n' +
        '  "metaDescription": "140–160 chars, includes focus keyword once",\n' +
        '  "suggestedTags": ["3–5 lowercase tag slugs"],\n' +
        '  "primaryCategory": "one of: news, fintech, ai, cybersecurity, startups, funding, jobs, events, marketing",\n' +
        '  "secondaryCategories": ["0-2 additional categories from the same list"],\n' +
        '  "focusKeyword": "primary keyword phrase (2–4 words)",\n' +
        '  "entities": {"companies": ["Company 1", "Company 2"], "people": ["Person 1", "Person 2"]},\n' +
        '  "location": {"city": "Riyadh", "country": "Saudi Arabia", "region": "MENA"},\n' +
        '  "funding": {"isFundingArticle": false, "company": "", "amount": "", "stage": "", "investors": []}\n' +
        "}\n" +
        `Editorial style: ${tone}. Target ~${wordTarget} words for the body. ` +
        "Active voice, no fluff. Cite specific numbers / names / dates from the brief verbatim. " +
        "Do not invent facts the brief doesn't support. " +
        "If the brief mentions company names, use them in the body. " +
        "Respect MENA context where relevant (Saudi Arabia, UAE, Egypt, regional currencies).";

      const userMsg =
        `Brief:\n${input.brief}\n\n` +
        (input.sourceUrl ? `Source URL: ${input.sourceUrl}\n\n` : "") +
        (input.focusKeyword ? `Focus keyword: ${input.focusKeyword}\n` : "");

      const resp = await invokeLLM({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
      });

      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") {
        throw new Error("AI returned no content");
      }

      const cleaned = raw.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        // Fallback: try to extract the first {...} block from the response
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch {}
        }
        if (!parsed) {
          throw new Error("AI response was not valid JSON: " + cleaned.slice(0, 200));
        }
      }

      // Light validation + safe defaults so the client never crashes
      // on a malformed key
      return {
        title:               String(parsed.title || "").slice(0, 300),
        slug:                String(parsed.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 100),
        excerpt:             String(parsed.excerpt || "").slice(0, 500),
        bodyHtml:            String(parsed.bodyHtml || ""),
        seoTitle:            String(parsed.seoTitle || "").slice(0, 70),
        metaDescription:     String(parsed.metaDescription || "").slice(0, 200),
        suggestedTags:       Array.isArray(parsed.suggestedTags)       ? parsed.suggestedTags.map(String).slice(0, 5) : [],
        primaryCategory:     String(parsed.primaryCategory || ""),
        secondaryCategories: Array.isArray(parsed.secondaryCategories) ? parsed.secondaryCategories.map(String).slice(0, 2) : [],
        focusKeyword:        String(parsed.focusKeyword || ""),
        entities: {
          companies: Array.isArray(parsed.entities?.companies) ? parsed.entities.companies.map(String).slice(0, 20) : [],
          people:    Array.isArray(parsed.entities?.people)    ? parsed.entities.people.map(String).slice(0, 20)    : [],
        },
        location: parsed.location ? {
          city:       String(parsed.location.city || ""),
          country:    String(parsed.location.country || ""),
          region:     String(parsed.location.region || ""),
        } : null,
        funding: parsed.funding ? {
          isFundingArticle: Boolean(parsed.funding.isFundingArticle),
          company:    String(parsed.funding.company || ""),
          amount:     String(parsed.funding.amount || ""),
          stage:      String(parsed.funding.stage || ""),
          investors:  Array.isArray(parsed.funding.investors) ? parsed.funding.investors.map(String).slice(0, 20) : [],
        } : { isFundingArticle: false },
      };
    }),

  /**
   * Extract entities (companies, people) from article content. Used by
   * the Entities tab "Suggest from content" button on the article editor.
   */
  extractEntitiesFromContent: adminProcedure
    .input(z.object({
      title: z.string().max(500),
      content: z.string().min(50).max(50_000),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const stripped = input.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12_000);
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Extract every named company AND named person from the article. Return ONLY JSON: " +
              '{"companies":["Co1","Co2"],"people":["Person 1","Person 2"]}. ' +
              "Use the names exactly as they appear. Skip generic terms like 'the company' or 'the founder'. " +
              "Skip places (cities/countries). Max 20 of each.",
          },
          { role: "user", content: `Title: ${input.title}\n\nBody:\n${stripped}` },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") return { companies: [], people: [] };
      try {
        const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        const parsed = JSON.parse(cleaned);
        return {
          companies: Array.isArray(parsed.companies) ? parsed.companies.map(String).slice(0, 20) : [],
          people:    Array.isArray(parsed.people)    ? parsed.people.map(String).slice(0, 20)    : [],
        };
      } catch {
        return { companies: [], people: [] };
      }
    }),

  /**
   * Detect location (city / country) from article content for the
   * Location tab "Suggest from content" button.
   */
  extractLocationFromContent: adminProcedure
    .input(z.object({
      title: z.string().max(500),
      content: z.string().min(50).max(50_000),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const stripped = input.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8_000);
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Extract the primary geographic location relevant to the article. Return ONLY JSON: " +
              '{"city":"Riyadh","country":"Saudi Arabia","region":"MENA","confidence":0-100,"reasoning":"…"}. ' +
              "Confidence 0-100 — use < 60 when uncertain or when multiple cities are mentioned equally. " +
              "Region: one of MENA, GCC, Levant, North Africa, Europe, North America, Asia-Pacific, Other.",
          },
          { role: "user", content: `Title: ${input.title}\n\nBody:\n${stripped}` },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") return null;
      try {
        const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        const parsed = JSON.parse(cleaned);
        return {
          city:       String(parsed.city || ""),
          country:    String(parsed.country || ""),
          region:     String(parsed.region || ""),
          confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
          reasoning:  String(parsed.reasoning || "").slice(0, 200),
        };
      } catch {
        return null;
      }
    }),

  /**
   * Detect funding-round details from article content for the Funding
   * tab "Suggest from content" button.
   */
  extractFundingFromContent: adminProcedure
    .input(z.object({
      title: z.string().max(500),
      content: z.string().min(50).max(50_000),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const stripped = input.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8_000);
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Extract funding-round details if the article describes one. Return ONLY JSON: " +
              '{"isFundingArticle":true|false,"company":"…","amount":"…","currency":"USD","stage":"seed|series_a|…","investors":["Investor 1"],"announcedAt":"YYYY-MM-DD","valuation":"…","confidence":0-100}. ' +
              "If the article is NOT about a funding round, return {\"isFundingArticle\":false}.",
          },
          { role: "user", content: `Title: ${input.title}\n\nBody:\n${stripped}` },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      if (typeof raw !== "string") return { isFundingArticle: false };
      try {
        const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        const parsed = JSON.parse(cleaned);
        if (!parsed.isFundingArticle) return { isFundingArticle: false };
        return {
          isFundingArticle: true,
          company:    String(parsed.company || ""),
          amount:     String(parsed.amount || ""),
          currency:   String(parsed.currency || "USD"),
          stage:      String(parsed.stage || ""),
          investors:  Array.isArray(parsed.investors) ? parsed.investors.map(String).slice(0, 20) : [],
          announcedAt: String(parsed.announcedAt || ""),
          valuation:  String(parsed.valuation || ""),
          confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
        };
      } catch {
        return { isFundingArticle: false };
      }
    }),
});
// ============================================================
// HELPERS
// ============================================================
function getDefaultAgentSettings() {
  return {
    enabled: false,
    crawlIntervalMinutes: 120,
    maxArticlesPerCrawl: 10,
    relevanceThreshold: 0.7,
    autoGenerateAboveThreshold: 0.9,
    defaultProvider: "builtin",
    defaultModel: null,
    defaultPolicyId: null,
    defaultTemplateId: null,
    notifyOnNewArticles: true,
  };
}
