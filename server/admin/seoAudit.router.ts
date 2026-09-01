import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as cheerio from 'cheerio';
import {
  runSeoAudit,
  generateAiFix,
  applyFix,
  bulkApplyQuickFixes,
  getIssuesByType,
  getIssuesBySeverity,
  getIssuesByEntityType,
  SeoIssue,
  SeoAuditResult
} from "../services/seoAudit.service";
import { getDb } from "../db";
import { seoAuditHistory, seoAuditSchedule, seoAuditIgnoredIssues, seo404Monitor, redirects } from "../../drizzle/schema";
import { desc, eq, inArray, count } from "drizzle-orm";

// Store audit results in memory for quick access
let lastAuditResult: SeoAuditResult | null = null;

// Helper: get ignored issue IDs from DB
async function getIgnoredIssueIds(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db.select({ issueId: seoAuditIgnoredIssues.issueId }).from(seoAuditIgnoredIssues);
  return new Set(rows.map(r => r.issueId));
}

// Helper: filter out ignored issues and recalculate counts
function filterIgnoredIssues(result: SeoAuditResult, ignoredIds: Set<string>): SeoAuditResult & { ignoredCount: number } {
  const filteredIssues = result.issues.filter(i => !ignoredIds.has(i.id));
  const ignoredCount = result.issues.length - filteredIssues.length;
  return {
    ...result,
    issues: filteredIssues,
    totalIssues: filteredIssues.length,
    criticalCount: filteredIssues.filter(i => i.severity === 'critical').length,
    warningCount: filteredIssues.filter(i => i.severity === 'warning').length,
    infoCount: filteredIssues.filter(i => i.severity === 'info').length,
    ignoredCount
  };
}

export const seoAuditRouter = router({
  // Run a full SEO audit
  runAudit: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await runSeoAudit();
      lastAuditResult = result;
      
      // Persist to database
      const db = await getDb();
      if (db) {
        await db.insert(seoAuditHistory).values({
          auditId: result.id,
          score: result.score,
          totalIssues: result.totalIssues,
          criticalCount: result.criticalCount,
          warningCount: result.warningCount,
          infoCount: result.infoCount,
          issuesSnapshot: result.issues,
          triggeredBy: 'manual',
          runById: ctx.user?.id
        } as any);
      }
      
      // Return filtered results (excluding ignored)
      const ignoredIds = await getIgnoredIssueIds();
      return filterIgnoredIssues(result, ignoredIds);
    }),

  // Get the last audit result (filtered)
  getLastAudit: protectedProcedure
    .query(async () => {
      let result = lastAuditResult;
      
      if (!result || result === null) {
        // Fetch from database
        const db = await getDb();
        if (!db) return null;
        
        const [latest] = await db.select()
          .from(seoAuditHistory)
          .orderBy(desc(seoAuditHistory.createdAt))
          .limit(1);
        
        if (latest) {
          result = {
            id: latest.auditId,
            timestamp: new Date(latest.createdAt),
            totalIssues: latest.totalIssues,
            criticalCount: latest.criticalCount,
            warningCount: latest.warningCount,
            infoCount: latest.infoCount,
            issues: (latest.issuesSnapshot as SeoIssue[]) || [],
            score: latest.score
          };
          lastAuditResult = result;
        }
      }
      
      if (!result || result === null) return null;
      
      const ignoredIds = await getIgnoredIssueIds();
      return filterIgnoredIssues(result, ignoredIds);
    }),

  // Get audit history
  getAuditHistory: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      const history = await db.select()
        .from(seoAuditHistory)
        .orderBy(desc(seoAuditHistory.createdAt))
        .limit(20);
      
      return history.map(h => ({
        id: h.auditId,
        timestamp: h.createdAt,
        totalIssues: h.totalIssues,
        criticalCount: h.criticalCount,
        warningCount: h.warningCount,
        infoCount: h.infoCount,
        score: h.score,
        triggeredBy: h.triggeredBy
      }));
    }),

  // Get issues grouped by type
  getIssuesByType: protectedProcedure
    .query(async () => {
      if (!lastAuditResult) return null;
      const ignoredIds = await getIgnoredIssueIds();
      const filtered = lastAuditResult.issues.filter(i => !ignoredIds.has(i.id));
      return getIssuesByType(filtered);
    }),

  // Get issues grouped by severity
  getIssuesBySeverity: protectedProcedure
    .query(async () => {
      if (!lastAuditResult) return null;
      const ignoredIds = await getIgnoredIssueIds();
      const filtered = lastAuditResult.issues.filter(i => !ignoredIds.has(i.id));
      return getIssuesBySeverity(filtered);
    }),

  // Get issues grouped by entity type
  getIssuesByEntityType: protectedProcedure
    .query(async () => {
      if (!lastAuditResult) return null;
      const ignoredIds = await getIgnoredIssueIds();
      const filtered = lastAuditResult.issues.filter(i => !ignoredIds.has(i.id));
      return getIssuesByEntityType(filtered);
    }),

  // Ignore an issue
  ignoreIssue: protectedProcedure
    .input(z.object({
      issueId: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Find the issue in the last audit to get metadata
      let issueType = '';
      let entityType = '';
      let entityId = 0;
      let entityTitle = '';
      
      if (lastAuditResult) {
        const issue = lastAuditResult.issues.find(i => i.id === input.issueId);
        if (issue) {
          issueType = issue.type;
          entityType = issue.entityType;
          entityId = issue.entityId;
          entityTitle = issue.entityTitle;
        }
      }
      
      // Parse from issueId if not found in memory: format is type_entityType_entityId
      if (!issueType) {
        const parts = input.issueId.split('_');
        if (parts.length >= 3) {
          entityId = parseInt(parts[parts.length - 1]) || 0;
          entityType = parts[parts.length - 2] || '';
          issueType = parts.slice(0, parts.length - 2).join('_');
        }
      }
      
      // Check if already ignored
      const [existing] = await db.select()
        .from(seoAuditIgnoredIssues)
        .where(eq(seoAuditIgnoredIssues.issueId, input.issueId))
        .limit(1);
      
      if (existing) {
        return { success: true, alreadyIgnored: true };
      }
      
      await db.insert(seoAuditIgnoredIssues).values({
        issueId: input.issueId,
        issueType,
        entityType,
        entityId,
        entityTitle,
        reason: input.reason || null,
        ignoredById: ctx.user?.id || null
      } as any);
      
      return { success: true, alreadyIgnored: false };
    }),

  // Bulk ignore issues
  bulkIgnoreIssues: protectedProcedure
    .input(z.object({
      issueIds: z.array(z.string()),
      reason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Get already ignored
      const existingRows = await db.select({ issueId: seoAuditIgnoredIssues.issueId })
        .from(seoAuditIgnoredIssues);
      const existingSet = new Set(existingRows.map(r => r.issueId));
      
      const newIds = input.issueIds.filter(id => !existingSet.has(id));
      
      if (newIds.length > 0) {
        const values = newIds.map(issueId => {
          let issueType = '';
          let entityType = '';
          let entityId = 0;
          let entityTitle = '';
          
          if (lastAuditResult) {
            const issue = lastAuditResult.issues.find(i => i.id === issueId);
            if (issue) {
              issueType = issue.type;
              entityType = issue.entityType;
              entityId = issue.entityId;
              entityTitle = issue.entityTitle;
            }
          }
          
          if (!issueType) {
            const parts = issueId.split('_');
            if (parts.length >= 3) {
              entityId = parseInt(parts[parts.length - 1]) || 0;
              entityType = parts[parts.length - 2] || '';
              issueType = parts.slice(0, parts.length - 2).join('_');
            }
          }
          
          return {
            issueId,
            issueType,
            entityType,
            entityId,
            entityTitle,
            reason: input.reason || null,
            ignoredById: ctx.user?.id || null
          };
        });
        
        await db.insert(seoAuditIgnoredIssues).values(values as any);
      }
      
      return { success: true, ignoredCount: newIds.length, alreadyIgnoredCount: input.issueIds.length - newIds.length };
    }),

  // Unignore an issue
  unignoreIssue: protectedProcedure
    .input(z.object({
      issueId: z.string()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.delete(seoAuditIgnoredIssues)
        .where(eq(seoAuditIgnoredIssues.issueId, input.issueId));
      
      return { success: true };
    }),

  // Get all ignored issues
  getIgnoredIssues: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      const rows = await db.select()
        .from(seoAuditIgnoredIssues)
        .orderBy(desc(seoAuditIgnoredIssues.createdAt));
      
      return rows;
    }),

  // Generate AI fix for a specific issue
  generateFix: protectedProcedure
    .input(z.object({
      issueId: z.string()
    }))
    .mutation(async ({ input }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }

      const issue = lastAuditResult.issues.find(i => i.id === input.issueId);
      if (!issue) {
        throw new Error("Issue not found");
      }

      const suggestedFix = await generateAiFix(issue);
      return {
        issue,
        suggestedFix
      };
    }),

  // Bulk generate AI fixes without applying (for approval workflow)
  bulkGenerateFixes: protectedProcedure
    .input(z.object({
      issueIds: z.array(z.string())
    }))
    .mutation(async ({ input }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }

      const results: { issueId: string; issue: SeoIssue | null; suggestedFix: string | null; error?: string }[] = [];

      for (const issueId of input.issueIds) {
        const issue = lastAuditResult.issues.find(i => i.id === issueId);
        if (!issue) {
          results.push({ issueId, issue: null, suggestedFix: null, error: "Issue not found" });
          continue;
        }

        try {
          const suggestedFix = await generateAiFix(issue);
          results.push({ issueId, issue, suggestedFix });
        } catch (error) {
          results.push({ issueId, issue, suggestedFix: null, error: String(error) });
        }
      }

      return {
        results,
        totalRequested: input.issueIds.length,
        generatedCount: results.filter(r => r.suggestedFix).length,
        failedCount: results.filter(r => !r.suggestedFix).length
      };
    }),

  // Search Google Images for a keyword (for image-related issues)
  searchImages: protectedProcedure
    .input(z.object({
      query: z.string(),
      imageUrl: z.string().optional() // Direct image URL to use instead of searching
    }))
    .mutation(async ({ input }) => {
      // If a direct image URL is provided, return it as the only result
      if (input.imageUrl && input.imageUrl.trim()) {
        const url = input.imageUrl.trim();
        return {
          results: [{
            url,
            thumbnail: url,
            title: input.query,
            source: url,
            width: 800,
            height: 600
          }],
          query: input.query
        };
      }

      // Use LLM to generate keywords + AI image generation
      try {
        // Step 1: Get keyword suggestions and metadata from LLM
        const metaResponse = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are an SEO image assistant. Given a search query, return a JSON object with: keywords (array of 4 short image search keyword phrases, max 5 words each), altText (SEO-friendly alt text for the main image), description (1-sentence image description), filename (suggested filename like "keyword-topic.jpg"), imagePrompt (a detailed prompt for AI image generation, professional editorial style, no text in image). Return ONLY valid JSON, no other text.' },
            { role: 'user', content: `Query: "${input.query}"` }
          ]
        });
        const metaContent = metaResponse.choices?.[0]?.message?.content;
        let keywords: string[] = [input.query];
        let altText = input.query;
        let description = '';
        let filename = 'featured-image.jpg';
        let imagePrompt = `Professional editorial photo for: ${input.query}, no text, clean background`;
        if (typeof metaContent === 'string') {
          try {
            const cleaned = metaContent.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
            const meta = JSON.parse(cleaned);
            keywords = Array.isArray(meta.keywords) ? meta.keywords : keywords;
            altText = meta.altText || altText;
            description = meta.description || '';
            filename = meta.filename || filename;
            imagePrompt = meta.imagePrompt || imagePrompt;
          } catch {}
        }
        // Step 2: Generate 1 AI image
        const { generateImage } = await import('../_core/imageGeneration');
        let generatedUrl: string | undefined;
        try {
          const generated = await generateImage({ prompt: imagePrompt });
          generatedUrl = generated.url;
        } catch (imgErr) {
          console.error('Image generation failed:', imgErr);
        }
        // Build results: AI-generated image first, then Google Images search links
        const results: Array<{
          url: string; thumbnail: string; title: string; source: string;
          altText: string; description: string; filename: string; isGenerated?: boolean; isSearchLink?: boolean; searchKeyword?: string;
        }> = [];
        if (generatedUrl) {
          results.push({
            url: generatedUrl,
            thumbnail: generatedUrl,
            title: `AI Generated: ${altText}`,
            source: 'AI Generated',
            altText,
            description,
            filename: filename.replace('.jpg', '-ai.jpg'),
            isGenerated: true
          });
        }
        // Add Google Images search links for each keyword
        for (const kw of keywords.slice(0, 4)) {
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(kw)}&tbm=isch`;
          results.push({
            url: googleUrl,
            thumbnail: '',
            title: kw,
            source: 'Google Images',
            altText: kw,
            description: `Search Google Images for: ${kw}`,
            filename: kw.toLowerCase().replace(/\s+/g, '-') + '.jpg',
            isSearchLink: true,
            searchKeyword: kw
          });
        }
        return { results, query: input.query };
      } catch (err) {
        console.error('Image search error:', err);
      }

      return { results: [], query: input.query };
    }),

  // Regenerate fix with additional context URL
  regenerateFixWithContext: protectedProcedure
    .input(z.object({
      issueId: z.string(),
      contextUrl: z.string().optional(),
      contextText: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }

      const issue = lastAuditResult.issues.find(i => i.id === input.issueId);
      if (!issue) {
        throw new Error("Issue not found");
      }

      // Fetch and scrape URL content if provided
      let scrapedContent = '';
      if (input.contextUrl) {
        try {
          const urlToFetch = input.contextUrl.startsWith('http') ? input.contextUrl : `https://${input.contextUrl}`;
          const res = await fetch(urlToFetch, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5'
            },
            signal: AbortSignal.timeout(8000)
          });
          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            // Remove non-content elements
            $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu, .cookie, .popup, .modal, .ad, .advertisement, [class*="cookie"], [class*="popup"], [id*="cookie"]').remove();
            // Extract structured data
            const title = $('title').text().trim();
            const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const h1 = $('h1').first().text().trim();
            const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5).join(' | ');
            // Try to find bio/about/profile sections
            const bioSection = $('[class*="bio"], [class*="about"], [class*="profile"], [class*="summary"], [id*="bio"], [id*="about"], [id*="profile"], .description, .intro, .overview').first().text();
            // Get main content
            const mainContent = $('main, article, [role="main"], .content, .main-content').first().text();
            const bodyText = bioSection || mainContent || $('body').text();
            const cleanText = bodyText.replace(/\s+/g, ' ').replace(/[^\x20-\x7E\n]/g, ' ').trim().slice(0, 3000);
            scrapedContent = `
REAL DATA SCRAPED FROM ${input.contextUrl}:
Page Title: ${title || ogTitle}
Meta Description: ${metaDesc}
Main Heading: ${h1}
Subheadings: ${h2s}
Content: ${cleanText}

IMPORTANT: Use the above REAL scraped data to generate an accurate, specific description. Do NOT use generic placeholder text.`;
          } else {
            scrapedContent = `\nContext URL: ${input.contextUrl} (HTTP ${res.status} - could not fetch)`;
          }
        } catch (e) {
          scrapedContent = `\nContext URL provided: ${input.contextUrl} (could not fetch: ${String(e).slice(0, 100)})`;
        }
      }
      if (input.contextText) {
        scrapedContent += `\nAdditional context from user: ${input.contextText}`;
      }

      // Build enhanced issue with scraped context
      const enhancedIssue = {
        ...issue,
        recommendation: (issue.recommendation || '') + scrapedContent
      };

      const suggestedFix = await generateAiFix(enhancedIssue);
      return { suggestedFix, issue };
    }),

  // Apply a fix to an issue
  applyFix: protectedProcedure
    .input(z.object({
      issueId: z.string(),
      newValue: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }

      const issue = lastAuditResult.issues.find(i => i.id === input.issueId);
      if (!issue) {
        throw new Error("Issue not found");
      }

      const success = await applyFix(issue, input.newValue);
      
      if (success) {
        // Remove the fixed issue from the results
        lastAuditResult.issues = lastAuditResult.issues.filter(i => i.id !== input.issueId);
        lastAuditResult.totalIssues--;
        
        // Update counts based on severity
        switch (issue.severity) {
          case 'critical':
            lastAuditResult.criticalCount--;
            break;
          case 'warning':
            lastAuditResult.warningCount--;
            break;
          case 'info':
            lastAuditResult.infoCount--;
            break;
        }

        // Auto-add to ignored list so it doesn't reappear on re-scan
        const db = await getDb();
        if (db) {
          const [existing] = await db.select()
            .from(seoAuditIgnoredIssues)
            .where(eq(seoAuditIgnoredIssues.issueId, input.issueId))
            .limit(1);
          if (!existing) {
            await db.insert(seoAuditIgnoredIssues).values({
              issueId: input.issueId,
              issueType: issue.type,
              entityType: issue.entityType,
              entityId: issue.entityId,
              entityTitle: issue.entityTitle,
              reason: 'Auto-fixed by AI',
              ignoredById: ctx.user?.id || null
            } as any);
          }
        }
      }

      return { success, issue };
    }),

  /**
   * Bulk apply DETERMINISTIC default fixes (no LLM).
   *
   * Walks every issue in the latest audit and applies a sensible default
   * for the types where one exists (article.title → seoTitle,
   * article.excerpt → seoDescription, truncate long titles, etc.).
   *
   * Returns counts so the operator sees what cleared and what still
   * needs human/AI attention. Issues without a deterministic default
   * (duplicate_meta_title, missing_focus_keyword, missing_featured_image,
   * broken_internal_link, etc.) are reported in `remaining`.
   *
   * This is the "Apply Quick Fixes" button on the SEO Manager dashboard.
   */
  bulkQuickFix: protectedProcedure
    .input(z.object({
      onlyTypes: z.array(z.string()).optional(),
      maxIssues: z.number().int().min(1).max(5000).default(2000),
    }).optional())
    .mutation(async ({ input }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }
      let issues = lastAuditResult.issues;
      if (input?.onlyTypes && input.onlyTypes.length > 0) {
        const set = new Set(input.onlyTypes);
        issues = issues.filter(i => set.has(i.type));
      }
      // Apply ignored filter so we don't re-fix dismissed issues
      const ignored = await getIgnoredIssueIds();
      issues = issues.filter(i => !ignored.has(i.id));
      if (issues.length > (input?.maxIssues ?? 2000)) {
        issues = issues.slice(0, input?.maxIssues ?? 2000);
      }
      const result = await bulkApplyQuickFixes(issues);
      return result;
    }),

  // Bulk apply AI fixes
  bulkApplyFixes: protectedProcedure
    .input(z.object({
      issueIds: z.array(z.string())
    }))
    .mutation(async ({ input, ctx }) => {
      if (!lastAuditResult) {
        throw new Error("No audit results available. Run an audit first.");
      }

      const results: { issueId: string; success: boolean; error?: string }[] = [];

      // Collect successfully fixed issue IDs for bulk ignore
      const fixedIssues: { issueId: string; issue: SeoIssue }[] = [];

      for (const issueId of input.issueIds) {
        const issue = lastAuditResult.issues.find(i => i.id === issueId);
        if (!issue) {
          results.push({ issueId, success: false, error: "Issue not found" });
          continue;
        }

        if (!issue.autoFixAvailable) {
          results.push({ issueId, success: false, error: "Auto-fix not available" });
          continue;
        }

        try {
          const suggestedFix = await generateAiFix(issue);
          if (!suggestedFix) {
            results.push({ issueId, success: false, error: "Could not generate fix" });
            continue;
          }

          const success = await applyFix(issue, suggestedFix);
          if (success) {
            // Remove the fixed issue from results
            lastAuditResult.issues = lastAuditResult.issues.filter(i => i.id !== issueId);
            lastAuditResult.totalIssues--;
            
            switch (issue.severity) {
              case 'critical':
                lastAuditResult.criticalCount--;
                break;
              case 'warning':
                lastAuditResult.warningCount--;
                break;
              case 'info':
                lastAuditResult.infoCount--;
                break;
            }
            fixedIssues.push({ issueId, issue });
          }
          results.push({ issueId, success });
        } catch (error) {
          results.push({ issueId, success: false, error: String(error) });
        }
      }

      // Auto-add all successfully fixed issues to ignored list
      if (fixedIssues.length > 0) {
        const db = await getDb();
        if (db) {
          const existingRows = await db.select({ issueId: seoAuditIgnoredIssues.issueId })
            .from(seoAuditIgnoredIssues);
          const existingSet = new Set(existingRows.map(r => r.issueId));
          
          const newIgnores = fixedIssues
            .filter(f => !existingSet.has(f.issueId))
            .map(f => ({
              issueId: f.issueId,
              issueType: f.issue.type,
              entityType: f.issue.entityType,
              entityId: f.issue.entityId,
              entityTitle: f.issue.entityTitle,
              reason: 'Auto-fixed by AI',
              ignoredById: ctx.user?.id || null
            }));
          
          if (newIgnores.length > 0) {
            await db.insert(seoAuditIgnoredIssues).values(newIgnores as any);
          }
        }
      }

      return {
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      };
    }),

  // Get summary statistics (filtered by ignored)
  getSummary: protectedProcedure
    .query(async () => {
      let result = lastAuditResult;
      
      if (!result || result === null) {
        const db = await getDb();
        if (!db) {
         return {
            hasAudit: false,
            score: 0,
            totalIssues: 0,
            criticalCount: 0,
            warningCount: 0,
            infoCount: 0,
            autoFixableCount: 0,
            ignoredCount: 0,
            lastAuditTime: null
          };
        }
        
        const [latest] = await db.select()
          .from(seoAuditHistory)
          .orderBy(desc(seoAuditHistory.createdAt))
          .limit(1);
        
        if (!latest) {
          return {
            hasAudit: false,
            score: 0,
            totalIssues: 0,
            criticalCount: 0,
            warningCount: 0,
            infoCount: 0,
            autoFixableCount: 0,
            ignoredCount: 0,
            lastAuditTime: null
          };
        }

        result = {
          id: latest.auditId,
          timestamp: new Date(latest.createdAt),
          totalIssues: latest.totalIssues,
          criticalCount: latest.criticalCount,
          warningCount: latest.warningCount,
          infoCount: latest.infoCount,
          issues: (latest.issuesSnapshot as SeoIssue[]) || [],
          score: latest.score
        };
        lastAuditResult = result;
      }

      const ignoredIds = await getIgnoredIssueIds();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "No audit data found" });
      const filtered = filterIgnoredIssues(result, ignoredIds);

      const autoFixableCount = filtered.issues.filter(i => i.autoFixAvailable).length;

      // Dashboard counters previously living on the deprecated seo.health.getSummary:
      // unresolved 404s and redirect-chain count. Folded into the audit summary so
      // the UI only needs one query.
      let total404 = 0;
      let redirectChains = 0;
      let redirectLoops = 0;
      try {
        const db = await getDb();
        if (db) {
          const [{ c: t404 }] = await db
            .select({ c: count() })
            .from(seo404Monitor)
            .where(eq(seo404Monitor.isResolved, 0)) as any;
          total404 = Number(t404) || 0;

          const allRedirects = await db.select().from(redirects);
          const chains = new Set<string>();
          for (const r of allRedirects) {
            const target = allRedirects.find(x => x.fromPath === r.toPath);
            if (target) {
              chains.add(r.fromPath);
              const visited = new Set([r.fromPath]);
              let cur: typeof target | undefined = target;
              while (cur) {
                if (visited.has(cur.toPath)) { redirectLoops++; break; }
                visited.add(cur.fromPath);
                cur = allRedirects.find(x => x.fromPath === cur!.toPath);
              }
            }
          }
          redirectChains = chains.size;
        }
      } catch (err) {
        console.error("[seoAudit.getSummary] dashboard counters failed:", err);
      }

      return {
        hasAudit: true,
        score: filtered.score,
        totalIssues: filtered.totalIssues,
        criticalCount: filtered.criticalCount,
        warningCount: filtered.warningCount,
        infoCount: filtered.infoCount,
        autoFixableCount,
        ignoredCount: filtered.ignoredCount,
        lastAuditTime: result.timestamp,
        total404,
        redirectChains,
        redirectLoops,
      };
    }),

  // Get schedule settings
  getSchedule: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;
      
      const [schedule] = await db.select().from(seoAuditSchedule).limit(1);
      return schedule || null;
    }),

  // Update schedule settings
  updateSchedule: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      notifyOnCritical: z.boolean().optional(),
      notifyEmail: z.string().email().optional().nullable()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Check if schedule exists
      const [existing] = await db.select().from(seoAuditSchedule).limit(1);
      
      // Calculate next run time based on frequency
      const now = new Date();
      let nextRunAt = new Date();
      
      if (input.isEnabled) {
        const [hours, minutes] = (input.timeOfDay || '09:00').split(':').map(Number);
        nextRunAt.setHours(hours, minutes, 0, 0);
        
        if (input.frequency === 'daily') {
          if (nextRunAt <= now) {
            nextRunAt.setDate(nextRunAt.getDate() + 1);
          }
        } else if (input.frequency === 'weekly') {
          const dayOfWeek = input.dayOfWeek ?? 1;
          const currentDay = nextRunAt.getDay();
          const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7;
          nextRunAt.setDate(nextRunAt.getDate() + daysUntilNext);
        } else if (input.frequency === 'monthly') {
          nextRunAt.setMonth(nextRunAt.getMonth() + 1);
          nextRunAt.setDate(1);
        }
      }
      
      if (existing) {
        await db.update(seoAuditSchedule)
          .set({
            isEnabled: (input.isEnabled ? 1 : 0),
            frequency: input.frequency,
            dayOfWeek: input.dayOfWeek ?? 1,
            timeOfDay: input.timeOfDay ?? '09:00',
            notifyOnCritical: input.notifyOnCritical ? 1 : 0,
            notifyEmail: input.notifyEmail ?? null,
            nextRunAt: input.isEnabled ? nextRunAt : null
          } as any)
          .where(eq(seoAuditSchedule.id, existing.id));
      } else {
        await db.insert(seoAuditSchedule).values({
          isEnabled: (input.isEnabled ? 1 : 0),
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek ?? 1,
          timeOfDay: input.timeOfDay ?? '09:00',
          notifyOnCritical: input.notifyOnCritical ? 1 : 0,
          notifyEmail: input.notifyEmail ?? null,
          nextRunAt: input.isEnabled ? nextRunAt : null
        } as any);
      }
      
      return { success: true };
    })
});
