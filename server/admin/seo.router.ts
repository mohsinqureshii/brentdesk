/**
 * SEO Admin Router
 * Manage meta fields, sitemaps, redirects, RSS feeds, indexing rules, hreflang, and SEO health
 */

import { z } from "zod";
import { eq, desc, like, and, sql, or, count, isNull, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  seoMeta, 
  redirects, 
  seoIndexingRules,
  seo404Monitor,
  seoSettings,
  articles,
  companies,
  investors,
  people,
  events,
  jobs,
  resources,
  accelerators
} from "../../drizzle/schema";
import { seoService } from "../services/seo.service";
import { technicalSeoService } from "../services/technicalSeo.service";
import { slugService } from "../services/slug.service";
import { regenerateAllSitemaps } from "../services/publishHooks.service";
import { invokeLLM } from "../_core/llm";
import { categories as categoriesTbl, companies as companiesTbl, people as peopleTbl, jobs as jobsTbl, events as eventsTbl } from "../../drizzle/schema";

// ============================================================
// SEO ADMIN ROUTER
// ============================================================

export const seoAdminRouter = router({
  // --------------------------------------------------------
  // SEO META
  // --------------------------------------------------------
  meta: router({
    /**
     * Get SEO meta for an entity
     */
    get: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const meta = await db.select()
          .from(seoMeta)
          .where(and(
            eq(seoMeta.entityType, input.entityType),
            eq(seoMeta.entityId, input.entityId)
          ))
          .limit(1);

        return meta[0] || null;
      }),

    /**
     * Update SEO meta for an entity
     */
    update: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        ogTitle: z.string().optional(),
        ogDescription: z.string().optional(),
        ogImage: z.string().optional(),
        twitterTitle: z.string().optional(),
        twitterDescription: z.string().optional(),
        twitterImage: z.string().optional(),
        canonicalUrl: z.string().optional(),
        noIndex: z.boolean().optional(),
        noFollow: z.boolean().optional(),
        structuredData: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { entityType, entityId, ...metaData } = input;

        // Check if meta exists
        const existing = await db.select()
          .from(seoMeta)
          .where(and(
            eq(seoMeta.entityType, entityType),
            eq(seoMeta.entityId, entityId)
          ))
          .limit(1);

        if (existing[0]) {
          await db.update(seoMeta)
            .set(metaData as any)
            .where(eq(seoMeta.id, existing[0].id));
        } else {
          await db.insert(seoMeta).values({
            entityType,
            entityId,
            ...metaData,
          } as any);
        }

        return { success: true };
      }),

    // meta.preview was deleted — the per-entity SEO editor uses meta.get
    // and renders its own preview client-side via the same data.
  }),

  // --------------------------------------------------------
  // INDEXING RULES
  // --------------------------------------------------------
  indexingRules: router({
    /**
     * List all indexing rules
     */
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const rules = await db.select()
          .from(seoIndexingRules)
          .orderBy(desc(seoIndexingRules.priority), seoIndexingRules.module);

        return rules;
      }),

    /**
     * Create an indexing rule
     */
    create: protectedProcedure
      .input(z.object({
        module: z.string(),
        pageType: z.string(),
        indexingRule: z.string().default("index, follow"),
        canonicalRule: z.string().default("self"),
        customCanonicalPattern: z.string().optional(),
        isEnabled: z.boolean().default(true),
        priority: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const [result] = await db.insert(seoIndexingRules).values({ ...input, ...(input.isEnabled !== undefined ? { isEnabled: (input.isEnabled ? 1 : 0) ? 1 : 0 } : {}) } as any);
        return { success: true, id: result.insertId };
      }),

    /**
     * Update an indexing rule
     */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        module: z.string().optional(),
        pageType: z.string().optional(),
        indexingRule: z.string().optional(),
        canonicalRule: z.string().optional(),
        customCanonicalPattern: z.string().optional(),
        isEnabled: z.boolean().optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { id, isEnabled: isEnabledRaw, ...restUpdateData } = input;
        const updateData = { ...restUpdateData, ...(isEnabledRaw !== undefined ? { isEnabled: isEnabledRaw ? 1 : 0 } : {}) };
        await db.update(seoIndexingRules)
          .set(updateData as any)
          .where(eq(seoIndexingRules.id, id));

        return { success: true };
      }),

    /**
     * Delete an indexing rule
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(seoIndexingRules).where(eq(seoIndexingRules.id, input.id));
        return { success: true };
      }),

    /**
     * Reset to default rules
     */
    resetToDefaults: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        // Delete all existing rules
        await db.delete(seoIndexingRules);

        // Insert default rules
        const defaultRules = [
          { module: 'articles', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'articles', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'articles', pageType: 'preview', indexingRule: 'noindex, nofollow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'companies', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'companies', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'investors', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'investors', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'people', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'people', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'events', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'events', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'jobs', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'jobs', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'accelerators', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'accelerators', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'resources', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'resources', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          // BRD V4 Resource Types
          { module: 'perks', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'perks', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'templates', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'templates', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'playbooks', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'playbooks', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'regulations', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'regulations', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          { module: 'calculators', pageType: 'detail', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'calculators', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 90 },
          // Dashboard and Partner pages - noindex per BRD V4
          { module: 'dashboard', pageType: 'all', indexingRule: 'noindex, nofollow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'partner', pageType: 'all', indexingRule: 'noindex, nofollow', canonicalRule: 'self', isEnabled: 1, priority: 100 },
          { module: 'tags', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 80 },
          { module: 'categories', pageType: 'listing', indexingRule: 'index, follow', canonicalRule: 'self', isEnabled: 1, priority: 85 },
          { module: 'search', pageType: 'listing', indexingRule: 'noindex, nofollow', canonicalRule: 'self', isEnabled: 1, priority: 70 },
          { module: 'pagination', pageType: 'listing', indexingRule: 'noindex, follow', canonicalRule: 'parent', isEnabled: 1, priority: 60 },
          { module: 'author', pageType: 'listing', indexingRule: 'noindex, follow', canonicalRule: 'self', isEnabled: 1, priority: 75 },
        ];

        for (const rule of defaultRules) {
          await db.insert(seoIndexingRules).values(rule as any);
        }

        return { success: true, count: defaultRules.length };
      }),
  }),

  // --------------------------------------------------------
  // HREFLANG / LANGUAGES
  // --------------------------------------------------------
  hreflang: router({
    /**
     * Get hreflang settings
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const settings = await db.select()
          .from(seoSettings)
          .where(eq(seoSettings.settingGroup, 'hreflang'));

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

    /**
     * Update hreflang settings
     */
    updateSettings: protectedProcedure
      .input(z.object({
        hreflang_enabled: z.boolean().optional(),
        default_language: z.string().optional(),
        secondary_language: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await db.update(seoSettings)
              .set({ settingValue: JSON.stringify(value) } as any)
              .where(eq(seoSettings.settingKey, key));
          }
        }

        return { success: true };
      }),

    // hreflang.listMappings/createMapping/deleteMapping deleted — the
    // platform is English-only; only getSettings/updateSettings remain so
    // the toggle stays available for future language launches.
  }),


  // --------------------------------------------------------
  // 404 MONITOR
  // --------------------------------------------------------
  monitor404: router({
    /**
     * List 404 errors
     */
    list: protectedProcedure
      .input(z.object({
        isResolved: z.boolean().default(false),
        page: z.number().default(1),
        limit: z.number().default(50),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { page, limit, isResolved } = input;
        const offset = (page - 1) * limit;

        const errors = await db.select()
          .from(seo404Monitor)
          .where(eq(seo404Monitor.isResolved, isResolved ? 1 : 0))
          .orderBy(desc(seo404Monitor.hitCount), desc(seo404Monitor.lastHitAt))
          .limit(limit)
          .offset(offset);

        const [{ total }] = await db.select({ total: count() })
          .from(seo404Monitor)
          .where(eq(seo404Monitor.isResolved, isResolved ? 1 : 0));

        return {
          items: errors,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    /**
     * Bulk-import 404 URLs from an external source (e.g. GSC export
     * or a paste-textarea). The 404 monitor only logs URLs hit by
     * live traffic, so when GSC reports historical 404s that the
     * server hasn't seen recently, the operator needs a way to
     * seed them into the table before AI Suggest can run.
     *
     * Strips https://techscoop.io / http(s):// prefixes so operators
     * can paste either full URLs or bare paths. Skips URLs that
     * already exist (idempotent) and ignores blank lines.
     */
    bulkImportUrls: protectedProcedure
      .input(z.object({
        urls: z.array(z.string()).min(1).max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Normalize: strip protocol+host, drop blanks, dedupe
        const normalized = Array.from(new Set(
          input.urls
            .map((u) => u.trim())
            .filter(Boolean)
            .map((u) => {
              try {
                const url = new URL(u, "https://techscoop.io");
                return url.pathname + (url.search || "");
              } catch {
                return u.startsWith("/") ? u : `/${u}`;
              }
            }),
        ));

        if (normalized.length === 0) {
          return { imported: 0, skipped: 0, ids: [] };
        }

        // Skip URLs that already exist
        const existing = await db.select({
          id: seo404Monitor.id,
          requestedUrl: seo404Monitor.requestedUrl,
        })
          .from(seo404Monitor)
          .where(inArray(seo404Monitor.requestedUrl, normalized));
        const existingSet = new Set(existing.map((e) => e.requestedUrl));
        const toInsert = normalized.filter((u) => !existingSet.has(u));

        // Insert one at a time so we can collect each generated id
        const newIds: number[] = [];
        for (const url of toInsert) {
          const result: any = await db.insert(seo404Monitor).values({
            requestedUrl: url,
            hitCount: 0,
            referrer: "gsc-import",
            userAgent: "manual-import",
          } as any);
          const insertId = result?.insertId ?? result?.[0]?.insertId;
          if (insertId) newIds.push(Number(insertId));
        }

        return {
          imported: toInsert.length,
          skipped: existing.length,
          ids: [...existing.map((e) => e.id), ...newIds],
        };
      }),

    /**
     * Create redirect from 404
     */
    createRedirect: protectedProcedure
      .input(z.object({
        monitorId: z.number(),
        toPath: z.string(),
        statusCode: z.number().default(301),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        // Get the 404 entry
        const [entry] = await db.select()
          .from(seo404Monitor)
          .where(eq(seo404Monitor.id, input.monitorId));

        if (!entry) throw new Error("404 entry not found");

        // Create redirect
        const [result] = await db.insert(redirects).values({
          fromPath: entry.requestedUrl,
          toPath: input.toPath,
          statusCode: input.statusCode,
          isActive: 1,
        } as any);

        // Mark as resolved
        await db.update(seo404Monitor)
          .set({
            isResolved: 1,
            resolvedRedirectId: result.insertId,
          } as any)
          .where(eq(seo404Monitor.id, input.monitorId));

        return { success: true, redirectId: result.insertId };
      }),

    /**
     * Dismiss 404 error
     */
    dismiss: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.update(seo404Monitor)
          .set({ isResolved: 1 } as any)
          .where(eq(seo404Monitor.id, input.id));

        return { success: true };
      }),

    /**
     * Log a 404 error (public endpoint for tracking)
     */
    log: publicProcedure
      .input(z.object({
        url: z.string(),
        referrer: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };

        // Check if URL already exists
        const [existing] = await db.select()
          .from(seo404Monitor)
          .where(eq(seo404Monitor.requestedUrl, input.url));

        if (existing) {
          // Update hit count
          await db.update(seo404Monitor)
            .set({
              hitCount: existing.hitCount + 1,
              lastHitAt: new Date().toISOString(),
            } as any)
            .where(eq(seo404Monitor.id, existing.id));
        } else {
          // Create new entry with suggested redirect
          let suggestedUrl: string | null = null;
          let confidence = 0;

          // Try to find similar URLs
          const allRedirects = await db.select().from(redirects);
          const urlParts = input.url.split('/').filter(Boolean);
          const lastPart = urlParts[urlParts.length - 1];

          if (lastPart) {
            // Check for similar slugs in articles
            const similarArticles = await db.select({ slug: articles.slug })
              .from(articles)
              .where(like(articles.slug, `%${lastPart.substring(0, 10)}%`))
              .limit(1);

            if (similarArticles[0]) {
              suggestedUrl = `/news/${similarArticles[0].slug}`;
              confidence = 60;
            }
          }

          await db.insert(seo404Monitor).values({
            requestedUrl: input.url,
            referrer: input.referrer,
            userAgent: input.userAgent,
            suggestedRedirectUrl: suggestedUrl,
            suggestedConfidence: confidence,
          } as any);
        }

        return { success: true };
      }),

    /**
     * AI-powered redirect suggestion for one or many unresolved 404s.
     *
     * Given a broken URL, builds a candidate set from every live entity
     * slug on the platform (articles, categories, companies, people,
     * events, jobs) and asks the LLM which is the best canonical match.
     * Returns suggested target URL + confidence + reasoning.
     *
     * Bulk mode (`monitorIds.length > 1`) deduplicates the candidate fetch
     * so 50 404s = 1 candidate-list build + 50 LLM calls (parallel).
     *
     * NOTE: this proposes — it does NOT auto-apply. The operator reviews
     * each suggestion and clicks "Create redirect" to commit. Auto-apply
     * is intentionally a separate gated mutation to avoid 301-loops or
     * accidentally redirecting unrelated traffic to a wrong target.
     */
    aiSuggestRedirect: protectedProcedure
      .input(z.object({
        monitorIds: z.array(z.number()).min(1).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const monitors = await db.select()
          .from(seo404Monitor)
          .where(inArray(seo404Monitor.id, input.monitorIds));
        if (monitors.length === 0) return { suggestions: [] };

        // Build candidate URL pool ONCE for the whole batch.
        const [articleRows, categoryRows, companyRows, personRows, eventRows, jobRows] = await Promise.all([
          db.select({ slug: articles.slug, title: articles.title }).from(articles).limit(2000),
          db.select({ slug: categoriesTbl.slug, name: categoriesTbl.name }).from(categoriesTbl).limit(500),
          db.select({ slug: companiesTbl.slug, name: companiesTbl.name }).from(companiesTbl).limit(2000),
          db.select({ slug: peopleTbl.slug, name: peopleTbl.name }).from(peopleTbl).limit(2000),
          db.select({ slug: eventsTbl.slug, title: eventsTbl.title }).from(eventsTbl).limit(1000),
          db.select({ slug: jobsTbl.slug, title: jobsTbl.title }).from(jobsTbl).limit(1000),
        ]);

        const candidates: Array<{ url: string; label: string }> = [
          ...articleRows.map((r: any) => ({ url: `/news/${r.slug}`, label: r.title })),
          ...categoryRows.map((r: any) => ({ url: `/${r.slug}`, label: r.name })),
          ...companyRows.map((r: any) => ({ url: `/companies/${r.slug}`, label: r.name })),
          ...personRows.map((r: any) => ({ url: `/people/${r.slug}`, label: r.name })),
          ...eventRows.map((r: any) => ({ url: `/events/${r.slug}`, label: r.title })),
          ...jobRows.map((r: any) => ({ url: `/jobs/${r.slug}`, label: r.title })),
        ];

        // For each broken URL, prefilter candidates by token overlap so the
        // LLM only sees the top-50 nearest matches (token Jaccard score).
        // Without this, the prompt is too long and the LLM mostly picks at random.
        function tokenize(s: string): Set<string> {
          return new Set(
            s.toLowerCase()
              .split(/[^a-z0-9]+/i)
              .filter(t => t.length >= 3)
          );
        }

        const suggestions = await Promise.all(monitors.map(async (m: any) => {
          const brokenTokens = tokenize(m.requestedUrl);
          const scored = candidates.map(c => {
            const ct = tokenize(c.url + " " + c.label);
            let intersect = 0;
            brokenTokens.forEach(t => { if (ct.has(t)) intersect++; });
            return { ...c, score: intersect };
          }).sort((a, b) => b.score - a.score).slice(0, 50);

          // Skip the LLM if we have ZERO token overlap with anything —
          // means the URL is so broken there's no plausible target.
          if (scored.length === 0 || scored[0].score === 0) {
            return {
              monitorId: m.id,
              brokenUrl: m.requestedUrl,
              hitCount: m.hitCount,
              suggested: null as null | { url: string; confidence: number; reasoning: string },
              candidatesConsidered: 0,
            };
          }

          const candList = scored
            .map((c, i) => `${i + 1}. ${c.url}  —  ${c.label}`)
            .join("\n");

          try {
            const resp = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "You are an SEO redirect assistant for techscoop.io. Given a broken URL and a list of live URLs, " +
                    "pick the single best 301 target. Reply ONLY with valid JSON: " +
                    '{"url": "/path", "confidence": 0-100, "reasoning": "<one short sentence>"}. ' +
                    'If no candidate is a good match, return {"url": null, "confidence": 0, "reasoning": "..."} ' +
                    "Use confidence < 60 when uncertain — operators will only auto-apply >= 80.",
                },
                {
                  role: "user",
                  content: `Broken URL: ${m.requestedUrl}\n\nCandidate live URLs (most token-overlap first):\n${candList}\n\nPick the best 301 target.`,
                },
              ],
            });
            const raw = resp.choices?.[0]?.message?.content;
            if (typeof raw !== "string") throw new Error("empty LLM response");
            const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
            const parsed = JSON.parse(cleaned);
            return {
              monitorId: m.id,
              brokenUrl: m.requestedUrl,
              hitCount: m.hitCount,
              suggested: parsed.url
                ? {
                    url: String(parsed.url),
                    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
                    reasoning: String(parsed.reasoning || "").slice(0, 200),
                  }
                : null,
              candidatesConsidered: scored.length,
            };
          } catch (err) {
            console.error("[aiSuggestRedirect] LLM error for monitor", m.id, err);
            return {
              monitorId: m.id,
              brokenUrl: m.requestedUrl,
              hitCount: m.hitCount,
              suggested: null,
              candidatesConsidered: scored.length,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }));

        return { suggestions };
      }),

    /**
     * Apply one or more AI suggestions as actual 301 redirects.
     * Only applies suggestions where confidence >= minConfidence (default 80).
     * Below threshold, the suggestion is left in place for manual review.
     */
    applyAiSuggestions: protectedProcedure
      .input(z.object({
        suggestions: z.array(z.object({
          monitorId: z.number(),
          targetUrl: z.string().min(1),
          confidence: z.number().min(0).max(100),
        })),
        minConfidence: z.number().min(0).max(100).default(80),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let applied = 0;
        let skipped = 0;
        for (const s of input.suggestions) {
          if (s.confidence < input.minConfidence) { skipped++; continue; }
          const [m] = await db.select().from(seo404Monitor).where(eq(seo404Monitor.id, s.monitorId));
          if (!m) { skipped++; continue; }
          // Don't create a redirect that already exists
          const [existing] = await db.select().from(redirects).where(eq(redirects.fromPath, m.requestedUrl));
          if (existing) { skipped++; continue; }
          const [r] = await db.insert(redirects).values({
            fromPath: m.requestedUrl,
            toPath: s.targetUrl,
            statusCode: 301,
            isActive: 1,
          } as any);
          await db.update(seo404Monitor)
            .set({ isResolved: 1, resolvedRedirectId: (r as any).insertId } as any)
            .where(eq(seo404Monitor.id, s.monitorId));
          applied++;
        }
        return { applied, skipped };
      }),
  }),

  // --------------------------------------------------------
  // REDIRECTS (Enhanced)
  // --------------------------------------------------------
  redirects: router({
    /**
     * List all redirects with chain/loop detection
     */
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        type: z.enum(["301", "302"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { page, limit, ...filters } = input;
        const offset = (page - 1) * limit;

        const conditions = [];
        if (filters.search) {
          conditions.push(or(
            like(redirects.fromPath, `%${filters.search}%`),
            like(redirects.toPath, `%${filters.search}%`)
          ));
        }
        if (filters.type) {
          conditions.push(eq(redirects.statusCode, parseInt(filters.type)));
        }

        const allRedirects = await db.select()
          .from(redirects)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(redirects.createdAt));

        const total = allRedirects.length;
        const paginatedRedirects = allRedirects.slice(offset, offset + limit);

        // Detect chains and loops
        const allRedirectsMap = new Map(allRedirects.map(r => [r.fromPath, r]));
        const enrichedRedirects = paginatedRedirects.map(redirect => {
          let hasChain = false;
          let hasLoop = false;
          let chainLength = 0;

          // Check for chain
          let current = allRedirectsMap.get(redirect.toPath);
          const visited = new Set([redirect.fromPath]);

          while (current) {
            chainLength++;
            hasChain = true;

            if (visited.has(current.toPath)) {
              hasLoop = true;
              break;
            }
            visited.add(current.fromPath);
            current = allRedirectsMap.get(current.toPath);
          }

          return {
            ...redirect,
            hasChain,
            hasLoop,
            chainLength,
            isHighHits: (redirect.hitCount || 0) > 100,
          };
        });

        return {
          items: enrichedRedirects,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    /**
     * Create a redirect
     */
    create: protectedProcedure
      .input(z.object({
        fromPath: z.string().min(1),
        toPath: z.string().min(1),
        type: z.enum(["301", "302"]).default("301"),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.insert(redirects).values({
          fromPath: input.fromPath,
          toPath: input.toPath,
          statusCode: parseInt(input.type),
          isActive: (input.isActive ? 1 : 0) ? 1 : 0,
        } as any);

        return { success: true };
      }),

    /**
     * Update a redirect
     */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fromPath: z.string().optional(),
        toPath: z.string().optional(),
        type: z.enum(["301", "302"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const { id, type, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (type) {
          updateData.statusCode = parseInt(type);
        }
        await db.update(redirects)
          .set(updateData as any)
          .where(eq(redirects.id, id));

        return { success: true };
      }),

    /**
     * Delete a redirect
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        await db.delete(redirects).where(eq(redirects.id, input.id));
        return { success: true };
      }),

    /**
     * Bulk import redirects
     */
    bulkImport: protectedProcedure
      .input(z.object({
        redirects: z.array(z.object({
          fromPath: z.string(),
          toPath: z.string(),
          type: z.enum(["301", "302"]).default("301"),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        let imported = 0;
        let skipped = 0;

        for (const redirect of input.redirects) {
          // Check if redirect already exists
          const existing = await db.select()
            .from(redirects)
            .where(eq(redirects.fromPath, redirect.fromPath))
            .limit(1);

          if (existing[0]) {
            skipped++;
            continue;
          }

          await db.insert(redirects).values({
            fromPath: redirect.fromPath,
            toPath: redirect.toPath,
            statusCode: parseInt(redirect.type),
            isActive: 1,
          } as any);
          imported++;
        }

        return { imported, skipped };
      }),

    /**
     * Export all redirects
     */
    export: protectedProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        return slugService.exportRedirects();
      }),
  }),

  // --------------------------------------------------------
  // SITEMAPS (Enhanced)
  // --------------------------------------------------------
  sitemaps: router({
    /**
     * Get sitemap settings
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const settings = await db.select()
          .from(seoSettings)
          .where(eq(seoSettings.settingGroup, 'sitemap'));

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

    /**
     * Update sitemap settings
     */
    updateSettings: protectedProcedure
      .input(z.object({
        sitemap_include_images: z.boolean().optional(),
        sitemap_exclude_drafts: z.boolean().optional(),
        sitemap_exclude_search: z.boolean().optional(),
        sitemap_exclude_tags: z.boolean().optional(),
        sitemap_exclude_pagination: z.boolean().optional(),
        news_sitemap_enabled: z.boolean().optional(),
        news_publication_name: z.string().optional(),
        news_publication_language: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await db.update(seoSettings)
              .set({ settingValue: JSON.stringify(value) } as any)
              .where(eq(seoSettings.settingKey, key));
          }
        }

        return { success: true };
      }),

    /**
     * Generate sitemap for a module
     */
    generate: protectedProcedure
      .input(z.object({
        module: z.enum(["news", "jobs", "people", "investors", "events", "resources", "accelerators", "companies"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const sitemap = await seoService.generateSitemap(input.module);
        return { sitemap };
      }),

    /**
     * Get sitemap index
     */
    getIndex: publicProcedure
      .query(async () => {
        const modules = ["news", "jobs", "people", "investors", "events", "resources", "accelerators", "companies"] as const;
        const sitemaps = modules.map(module => ({
          module,
          url: `/sitemap-${module}.xml`,
          lastModified: new Date().toISOString(),
        }));

        return sitemaps;
      }),

    /**
     * Get sitemap stats with URL counts
     */
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        return await seoService.getSitemapStats();
      }),

    /**
     * Regenerate all sitemaps
     */
    regenerateAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }
        // Real regen: writes every sub-sitemap + index + robots.txt to disk
        // (the prior implementation only generated XML in memory and discarded it).
        const result = await regenerateAllSitemaps();
        return {
          success: result.errors.length === 0,
          filesWritten: result.filesWritten,
          errors: result.errors,
          regeneratedAt: new Date().toISOString(),
        };
      }),
  }),

  // --------------------------------------------------------
  // SCHEMA SETTINGS
  // --------------------------------------------------------
  schema: router({
    /**
     * Get schema settings
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const settings = await db.select()
          .from(seoSettings)
          .where(eq(seoSettings.settingGroup, 'schema'));

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

    /**
     * Update schema settings
     */
    updateSettings: protectedProcedure
      .input(z.object({
        schema_breadcrumb_enabled: z.boolean().optional(),
        schema_website_enabled: z.boolean().optional(),
        schema_organization_enabled: z.boolean().optional(),
        organization_name: z.string().optional(),
        organization_logo: z.string().optional(),
        search_url_template: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await db.update(seoSettings)
              .set({ settingValue: JSON.stringify(value) } as any)
              .where(eq(seoSettings.settingKey, key));
          }
        }

        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // RSS FEEDS
  // --------------------------------------------------------
  rss: router({
    /**
     * Generate RSS feed for a module
     */
    generate: publicProcedure
      .input(z.object({
        module: z.enum(["news", "jobs"]),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        if (input.module === "news") {
          return seoService.generateNewsFeed();
        } else {
          return seoService.generateJobsFeed();
        }
      }),
  }),

  // --------------------------------------------------------
  // ROBOTS.TXT
  // --------------------------------------------------------
  robots: router({
    /**
     * Get robots.txt content
     */
    get: publicProcedure
      .query(async () => {
        return seoService.generateRobotsTxt();
      }),
  }),

  // urlParity sub-router was deleted — only used during the WordPress migration
  // window. The redirects table now lives in admin.seo.redirects.list.

  // --------------------------------------------------------
  // SITE SETTINGS
  // --------------------------------------------------------
  site: router({
    /**
     * Get all site settings
     */
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
          throw new Error("Unauthorized");
        }

        const settings = await db.select()
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

    /**
     * Update site settings
     */
    updateSettings: protectedProcedure
      .input(z.object({
        site_title: z.string().optional(),
        site_tagline: z.string().optional(),
        site_description: z.string().optional(),
        google_analytics_id: z.string().optional(),
        site_logo: z.string().optional(),
        site_favicon: z.string().optional(),
        contact_email: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!["admin"].includes(ctx.user.role)) {
          throw new Error("Unauthorized - Admin only");
        }

        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            // Check if setting exists
            const existing = await db.select()
              .from(seoSettings)
              .where(eq(seoSettings.settingKey, key))
              .limit(1);

            if (existing.length > 0) {
              await db.update(seoSettings)
                .set({ settingValue: JSON.stringify(value) } as any)
                .where(eq(seoSettings.settingKey, key));
            } else {
              await db.insert(seoSettings)
                .values({
                  settingKey: key,
                  settingValue: JSON.stringify(value),
                  settingGroup: 'site',
                } as any);
            }
          }
        }

        return { success: true };
      }),
  }),

  // --------------------------------------------------------
  // TECHNICAL SEO INTELLIGENCE (5-Stage Pipeline)
  // --------------------------------------------------------
  technicalSeo: router({
    dashboardStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.getDashboardStats();
      }),

    runDetection: protectedProcedure
      .input(z.object({
        maxUrls: z.number().min(1).max(2000).optional().default(200),
        batchSize: z.number().min(1).max(20).optional().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.runDetectionCrawl({
          triggeredById: ctx.user.id,
          sessionType: 'manual',
          maxUrls: input.maxUrls,
          batchSize: input.batchSize,
        });
      }),

    getCoverage: protectedProcedure
      .input(z.object({
        status: z.enum(['indexed','not_indexed','excluded','error','unknown']).optional(),
        pageType: z.string().optional(),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(200).optional().default(50),
        hasIssues: z.boolean().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.getCoverageList(input);
      }),

    getIssues: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        severity: z.string().optional(),
        fixStatus: z.string().optional(),
        flaggedForReview: z.boolean().optional(),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(200).optional().default(50),
      }))
      .query(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.getIssuesList(input);
      }),

    applyAutoFixes: protectedProcedure
      .input(z.object({
        issueIds: z.array(z.number()).optional(),
        issueCategory: z.string().optional(),
        dryRun: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.applyAutoFixes({
          ...input,
          fixedById: ctx.user.id,
        });
      }),

    submitForIndexing: protectedProcedure
      .input(z.object({
        urls: z.array(z.string()).optional(),
        coverageStatus: z.enum(['indexed','not_indexed','excluded','error','unknown']).optional(),
        maxSubmissions: z.number().min(1).max(200).optional().default(50),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.submitForIndexing({
          ...input,
          submittedById: ctx.user.id,
        });
      }),

    generateReport: protectedProcedure
      .input(z.object({
        reportType: z.enum(['weekly','daily','manual']).optional().default('manual'),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.generateReport({
          reportType: input.reportType,
          generatedById: ctx.user.id,
        });
      }),

    getReports: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.getReports({ limit: input.limit });
      }),

    getCrawlSessions: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        return technicalSeoService.getCrawlSessions({ limit: input.limit });
      }),

    updateIssueStatus: protectedProcedure
      .input(z.object({
        issueId: z.number(),
        action: z.enum(['ignore','flag_review','resolve']),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin'].includes(ctx.user.role)) throw new Error('Unauthorized');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        if (input.action === 'ignore') {
          await db.execute(sql`UPDATE technical_seo_issues SET fix_status = 'ignored', is_resolved = 1, resolved_at = NOW() WHERE id = ${input.issueId}`);
        } else if (input.action === 'flag_review') {
          await db.execute(sql`UPDATE technical_seo_issues SET flagged_for_review = 1, review_notes = ${input.reviewNotes ?? null} WHERE id = ${input.issueId}`);
        } else if (input.action === 'resolve') {
          await db.execute(sql`UPDATE technical_seo_issues SET is_resolved = 1, resolved_at = NOW(), fix_status = 'manually_fixed', fixed_by_id = ${ctx.user.id} WHERE id = ${input.issueId}`);
        }
        return { success: true };
      }),
  }),

  // sitemapGenerator sub-router was deleted — its only two methods duplicated
  // sitemaps.regenerateAll/getStats and called the dead sitemapGeneratorService.
});
