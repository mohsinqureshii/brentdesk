/**
 * Technical SEO Intelligence Service
 *
 * Implements the 5-stage pipeline:
 * 1. DETECT  – Crawl sitemap, check HTTP status, detect non-indexed pages
 * 2. ANALYZE – Identify WHY pages aren't indexed (canonical, schema, redirect chains, hreflang, soft-404, meta-robots)
 * 3. FIX     – Auto-fix 90% of issues (canonical tags, schema markup, meta robots, redirect chains)
 * 4. SUBMIT  – Request (re-)indexing via Google Indexing API
 * 5. REPORT  – Generate weekly/daily summaries with AI narrative
 */

import { publication, getBaseUrl } from "../../shared/publication";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { notifySearchEngines } from "./indexingNotification.service";
import {
  articles,
  jobs,
  people,
  companies,
  investors,
  events,
  accelerators,
  resources,
  seoMeta,
  redirects,
} from "../../drizzle/schema";
import { eq, and, or, isNull, lt, gte, sql, desc, inArray } from "drizzle-orm";

const BASE_URL = getBaseUrl();

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoverageStatus = "indexed" | "not_indexed" | "excluded" | "error" | "unknown";

export interface PageCoverageResult {
  url: string;
  pageType: string;
  entityType?: string;
  entityId?: number;
  coverageStatus: CoverageStatus;
  gscReason?: string;
  httpStatus?: number;
  canonicalUrl?: string;
  canonicalMismatch: boolean;
  robotsMeta?: string;
  hasSchema: boolean;
  redirectChainLength: number;
  finalUrl?: string;
  hasHreflang: boolean;
  issues: DetectedIssue[];
}

export interface DetectedIssue {
  issueCategory: string;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  autoFixable: boolean;
  suggestedFix: string;
  fixPayload?: Record<string, unknown>;
}

export interface CrawlSessionResult {
  sessionId: number;
  totalUrls: number;
  urlsCrawled: number;
  issuesFound: number;
  notIndexed: number;
  autoFixable: number;
  issuesResolved: number;
  status: "completed" | "partial" | "failed";
  durationMs: number;
}

// ─── URL Builders ─────────────────────────────────────────────────────────────

async function buildUrlList(): Promise<Array<{ url: string; pageType: string; entityType: string; entityId: number }>> {
  const db = await getDb();
  if (!db) return [];

  const urls: Array<{ url: string; pageType: string; entityType: string; entityId: number }> = [];

  // Articles – use category/slug pattern
  try {
    const arts = await db
      .select({ id: articles.id, slug: articles.slug, primaryCategoryId: articles.primaryCategoryId, statusId: articles.statusId })
      .from(articles)
      .where(eq(articles.statusId, 3)); // published

    // Get category slugs
    const { categories } = await import("../../drizzle/schema");
    const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
    const catMap = new Map(cats.map((c) => [c.id, c.slug]));

    for (const a of arts) {
      const catSlug = a.primaryCategoryId ? catMap.get(a.primaryCategoryId) || "news" : "news";
      urls.push({ url: `${BASE_URL}/${catSlug}/${a.slug}`, pageType: "article", entityType: "article", entityId: a.id });
    }
  } catch (e) {
    console?.error("[TechSEO] Error building article URLs:", e);
  }

  // Jobs
  try {
    const jbs = await db.select({ id: jobs.id, slug: jobs.slug }).from(jobs).where(eq(jobs.statusId, 3));
    for (const j of jbs) urls.push({ url: `${BASE_URL}/jobs/${j.slug}`, pageType: "job", entityType: "job", entityId: j.id });
  } catch (e) { /* skip */ }

  // People
  try {
    const ppl = await db.select({ id: people.id, slug: people.slug }).from(people).where(eq(people.statusId, 3));
    for (const p of ppl) urls.push({ url: `${BASE_URL}/people/${p.slug}`, pageType: "person", entityType: "person", entityId: p.id });
  } catch (e) { /* skip */ }

  // Companies
  try {
    const cos = await db.select({ id: companies.id, slug: companies.slug }).from(companies).where(eq(companies.statusId, 3));
    for (const c of cos) urls.push({ url: `${BASE_URL}/companies/${c.slug}`, pageType: "company", entityType: "company", entityId: c.id });
  } catch (e) { /* skip */ }

  // Investors
  try {
    const invs = await db.select({ id: investors.id, slug: investors.slug }).from(investors).where(eq(investors.statusId, 3));
    for (const i of invs) urls.push({ url: `${BASE_URL}/investors/${i.slug}`, pageType: "investor", entityType: "investor", entityId: i.id });
  } catch (e) { /* skip */ }

  // Events
  try {
    const evts = await db.select({ id: events.id, slug: events.slug }).from(events).where(eq(events.statusId, 3));
    for (const e of evts) urls.push({ url: `${BASE_URL}/events/${e.slug}`, pageType: "event", entityType: "event", entityId: e.id });
  } catch (e) { /* skip */ }

  // Accelerators
  try {
    const accs = await db.select({ id: accelerators.id, slug: accelerators.slug }).from(accelerators);
    for (const a of accs) urls.push({ url: `${BASE_URL}/accelerators/${a.slug}`, pageType: "accelerator", entityType: "accelerator", entityId: a.id });
  } catch (e) { /* skip */ }

  // Resources
  try {
    const ress = await db.select({ id: resources.id, slug: resources.slug }).from(resources).where(eq(resources.statusId, 3));
    for (const r of ress) urls.push({ url: `${BASE_URL}/resources/${r.slug}`, pageType: "resource", entityType: "resource", entityId: r.id });
  } catch (e) { /* skip */ }

  return urls;
}

// ─── HTTP Check ───────────────────────────────────────────────────────────────

async function checkUrl(url: string): Promise<{
  httpStatus: number;
  finalUrl: string;
  redirectChainLength: number;
  canonicalUrl?: string;
  robotsMeta?: string;
  hasSchema: boolean;
  hasHreflang: boolean;
}> {
  try {
    let currentUrl = url;
    let redirectCount = 0;
    let finalUrl = url;
    let httpStatus = 0;

    // Follow redirects manually (max 5)
    while (redirectCount <= 5) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": publication.bots.seoAudit },
        });
        clearTimeout(timeout);
        httpStatus = res.status;

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (location) {
            currentUrl = location.startsWith("http") ? location : `${BASE_URL}${location}`;
            redirectCount++;
            finalUrl = currentUrl;
            continue;
          }
        }
        finalUrl = currentUrl;

        // Parse HTML for canonical, robots meta, schema, hreflang
        let canonicalUrl: string | undefined;
        let robotsMeta: string | undefined;
        let hasSchema = false;
        let hasHreflang = false;

        if (res.status === 200) {
          const html = await res.text();
          // Canonical
          const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
            || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
          if (canonicalMatch) canonicalUrl = canonicalMatch[1];

          // Robots meta
          const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
          if (robotsMatch) robotsMeta = robotsMatch[1];

          // JSON-LD schema
          hasSchema = html.includes('"@type"') && html.includes('application/ld+json');

          // Hreflang
          hasHreflang = html.includes('rel="alternate"') && html.includes('hreflang=');
        }

        return { httpStatus, finalUrl, redirectChainLength: redirectCount, canonicalUrl, robotsMeta, hasSchema, hasHreflang };
      } catch (err) {
        clearTimeout(timeout);
        if (redirectCount > 0) break;
        return { httpStatus: 0, finalUrl: url, redirectChainLength: 0, hasSchema: false, hasHreflang: false };
      }
    }

    return { httpStatus, finalUrl, redirectChainLength: redirectCount, hasSchema: false, hasHreflang: false };
  } catch {
    return { httpStatus: 0, finalUrl: url, redirectChainLength: 0, hasSchema: false, hasHreflang: false };
  }
}

// ─── Issue Detection ──────────────────────────────────────────────────────────

function detectIssues(
  url: string,
  checkResult: Awaited<ReturnType<typeof checkUrl>>,
  entityType: string
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Soft 404
  if (checkResult.httpStatus === 200) {
    // Canonical mismatch
    if (checkResult.canonicalUrl && checkResult.canonicalUrl !== url) {
      const isRelativeMatch = checkResult.canonicalUrl === url.replace(BASE_URL, "");
      if (!isRelativeMatch) {
        issues.push({
          issueCategory: "canonical",
          issueType: "canonical_mismatch",
          severity: "critical",
          description: `Canonical URL (${checkResult.canonicalUrl}) does not match the page URL (${url}). Google may index the canonical URL instead, causing this page to be excluded as a duplicate.`,
          autoFixable: true,
          suggestedFix: `Set canonical URL to self-referencing: ${url}`,
          fixPayload: { url, correctCanonical: url, entityType },
        });
      }
    }

    // Missing canonical
    if (!checkResult.canonicalUrl) {
      issues.push({
        issueCategory: "canonical",
        issueType: "missing_canonical",
        severity: "high",
        description: `Page at ${url} has no canonical tag. Without a canonical, Google may treat similar URLs as duplicates.`,
        autoFixable: true,
        suggestedFix: `Add self-referencing canonical tag: <link rel="canonical" href="${url}">`,
        fixPayload: { url, correctCanonical: url, entityType },
      });
    }

    // Missing schema
    if (!checkResult.hasSchema) {
      issues.push({
        issueCategory: "schema_markup",
        issueType: "missing_json_ld_schema",
        severity: "medium",
        description: `Page at ${url} has no JSON-LD structured data. Schema markup helps Google understand the page content and can improve rich results eligibility.`,
        autoFixable: true,
        suggestedFix: `Add appropriate JSON-LD schema markup for ${entityType} entity type.`,
        fixPayload: { url, entityType },
      });
    }

    // Noindex in robots meta
    if (checkResult.robotsMeta && (checkResult.robotsMeta.includes("noindex") || checkResult.robotsMeta.includes("none"))) {
      issues.push({
        issueCategory: "meta_robots",
        issueType: "noindex_directive",
        severity: "critical",
        description: `Page has robots meta tag set to "${checkResult.robotsMeta}". This explicitly tells Google not to index this page.`,
        autoFixable: true,
        suggestedFix: `Change robots meta to "index, follow" or remove the noindex directive.`,
        fixPayload: { url, entityType, currentRobots: checkResult.robotsMeta },
      });
    }
  }

  // Redirect chain
  if (checkResult.redirectChainLength >= 2) {
    issues.push({
      issueCategory: "redirect_chain",
      issueType: "redirect_chain_detected",
      severity: checkResult.redirectChainLength >= 3 ? "high" : "medium",
      description: `URL goes through ${checkResult.redirectChainLength} redirects before reaching the final destination (${checkResult.finalUrl}). Redirect chains waste crawl budget and dilute PageRank.`,
      autoFixable: true,
      suggestedFix: `Update the URL to point directly to ${checkResult.finalUrl}, eliminating the redirect chain.`,
      fixPayload: { url, finalUrl: checkResult.finalUrl, chainLength: checkResult.redirectChainLength },
    });
  }

  // 404 / error
  if (checkResult.httpStatus === 404 || checkResult.httpStatus === 410) {
    issues.push({
      issueCategory: "soft_404",
      issueType: checkResult.httpStatus === 410 ? "gone_410" : "not_found_404",
      severity: "critical",
      description: `Page returns HTTP ${checkResult.httpStatus}. Google will de-index this URL and may flag it as a crawl error in Search Console.`,
      autoFixable: false,
      suggestedFix: checkResult.httpStatus === 410
        ? "Remove this URL from the sitemap and add a redirect if the content moved."
        : "Restore the page content or add a 301 redirect to the correct URL.",
      fixPayload: { url, httpStatus: checkResult.httpStatus },
    });
  }

  // Soft 404 (200 but likely empty/thin content)
  if (checkResult.httpStatus === 200 && checkResult.finalUrl !== url && checkResult.finalUrl.includes("404")) {
    issues.push({
      issueCategory: "soft_404",
      issueType: "soft_404_redirect",
      severity: "high",
      description: `URL redirects to a 404 page while returning HTTP 200. This is a soft 404 — Google detects these and may de-index the URL.`,
      autoFixable: false,
      suggestedFix: "Fix the redirect to point to the correct content, or return a proper 404/410 status code.",
      fixPayload: { url, finalUrl: checkResult.finalUrl },
    });
  }

  return issues;
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export const technicalSeoService = {
  /**
   * STAGE 1 + 2: DETECT & ANALYZE
   * Crawl all published pages, check HTTP status, detect issues.
   * Stores results in gsc_indexing_coverage and technical_seo_issues.
   * Runs in batches to avoid overwhelming the server.
   */
  async runDetectionCrawl(options: {
    triggeredById?: number;
    sessionType?: "scheduled" | "manual";
    maxUrls?: number;
    batchSize?: number;
  } = {}): Promise<CrawlSessionResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { triggeredById, sessionType = "manual", maxUrls = 500, batchSize = 10 } = options;
    const startTime = Date.now();

    // Create crawl session
    const [sessionRow] = await db.execute(
      sql`INSERT INTO crawl_sessions (session_type, status, triggered_by_id) VALUES (${sessionType}, 'running', ${triggeredById ?? null})`
    );
    const sessionId = (sessionRow as unknown as { insertId: number }).insertId;

    let totalUrls = 0;
    let crawledUrls = 0;
    let newIssuesFound = 0;
    let issuesResolved = 0;

    try {
      const urlList = await buildUrlList();
      const limitedUrls = urlList.slice(0, maxUrls);
      totalUrls = limitedUrls.length;

      // Update session with total
      await db.execute(sql`UPDATE crawl_sessions SET total_urls = ${totalUrls} WHERE id = ${sessionId}`);

      // Process in batches
      for (let i = 0; i < limitedUrls.length; i += batchSize) {
        const batch = limitedUrls.slice(i, i + batchSize);

        await Promise.all(batch.map(async (item) => {
          try {
            const checkResult = await checkUrl(item.url);
            const issues = detectIssues(item.url, checkResult, item.entityType);

            // Determine coverage status
            let coverageStatus: CoverageStatus = "unknown";
            if (checkResult.httpStatus === 200) coverageStatus = "indexed";
            else if (checkResult.httpStatus === 404 || checkResult.httpStatus === 410) coverageStatus = "not_indexed";
            else if (checkResult.httpStatus === 0) coverageStatus = "error";
            else if (checkResult.httpStatus >= 300 && checkResult.httpStatus < 400) coverageStatus = "excluded";

            // Check if noindex
            if (checkResult.robotsMeta?.includes("noindex")) coverageStatus = "excluded";

             // Upsert coverage record (URL is TEXT, no unique index, so use SELECT + INSERT/UPDATE)
            const [existingCovRows] = await db.execute(sql`SELECT id FROM gsc_indexing_coverage WHERE url = ${item.url} LIMIT 1`);
            const existingCovId = (existingCovRows as unknown as Array<{ id: number }>)[0]?.id;
            let coverageId: number | undefined;
            if (existingCovId) {
              // Update existing record
              await db.execute(sql`
                UPDATE gsc_indexing_coverage SET
                  coverage_status = ${coverageStatus},
                  http_status = ${checkResult.httpStatus},
                  canonical_url = ${checkResult.canonicalUrl ?? null},
                  canonical_mismatch = ${checkResult.canonicalUrl && checkResult.canonicalUrl !== item.url ? 1 : 0},
                  robots_meta = ${checkResult.robotsMeta ?? null},
                  has_schema = ${checkResult.hasSchema ? 1 : 0},
                  redirect_chain_length = ${checkResult.redirectChainLength},
                  final_url = ${checkResult.finalUrl},
                  has_hreflang = ${checkResult.hasHreflang ? 1 : 0},
                  last_crawled_at = NOW(),
                  updated_at = NOW()
                WHERE id = ${existingCovId}
              `);
              coverageId = existingCovId;
            } else {
              // Insert new record
              const [insertResult] = await db.execute(sql`
                INSERT INTO gsc_indexing_coverage 
                  (url, page_type, coverage_status, http_status, canonical_url, canonical_mismatch, robots_meta, has_schema, redirect_chain_length, final_url, has_hreflang, last_crawled_at)
                VALUES 
                  (${item.url}, ${item.pageType}, ${coverageStatus}, ${checkResult.httpStatus}, ${checkResult.canonicalUrl ?? null}, ${checkResult.canonicalUrl && checkResult.canonicalUrl !== item.url ? 1 : 0}, ${checkResult.robotsMeta ?? null}, ${checkResult.hasSchema ? 1 : 0}, ${checkResult.redirectChainLength}, ${checkResult.finalUrl}, ${checkResult.hasHreflang ? 1 : 0}, NOW())
              `);
              coverageId = (insertResult as unknown as { insertId: number }).insertId;
            }

            // Mark existing issues as resolved if no longer detected
            if (coverageId) {
              const existingIssueTypes = issues.map((i) => i.issueType);
              if (existingIssueTypes.length > 0) {
                // Keep existing unresolved issues that are still detected
              } else {
                // Resolve all pending issues for this URL
                const resolved = await db.execute(sql`
                  UPDATE technical_seo_issues 
                  SET is_resolved = 1, resolved_at = NOW(), fix_status = 'auto_fixed'
                  WHERE coverage_id = ${coverageId} AND is_resolved = 0
                `);
                issuesResolved += (resolved as unknown as { affectedRows?: number }).affectedRows ?? 0;
              }

              // Insert new issues
              for (const issue of issues) {
                // Check if issue already exists (use URL+issue_type to prevent duplicates across scans)
                const [existing] = await db.execute(sql`
                  SELECT id FROM technical_seo_issues 
                  WHERE url = ${item.url} AND issue_type = ${issue.issueType} AND is_resolved = 0
                  LIMIT 1
                `);
                if ((existing as unknown as unknown[]).length === 0) {
                  await db.execute(sql`
                    INSERT INTO technical_seo_issues 
                      (coverage_id, url, page_type, entity_type, entity_id, issue_category, issue_type, severity, description, auto_fixable, suggested_fix, fix_payload, fix_status)
                    VALUES 
                      (${coverageId}, ${item.url}, ${item.pageType}, ${item.entityType}, ${item.entityId}, ${issue.issueCategory}, ${issue.issueType}, ${issue.severity}, ${issue.description}, ${issue.autoFixable ? 1 : 0}, ${issue.suggestedFix}, ${issue.fixPayload ? JSON.stringify(issue.fixPayload) : null}, 'pending')
                  `);
                  newIssuesFound++;
                }
              }
            }

            crawledUrls++;
          } catch (err) {
            console?.error(`[TechSEO] Error crawling ${item.url}:`, err);
          }
        }));

        // Update progress
        await db.execute(sql`UPDATE crawl_sessions SET crawled_urls = ${crawledUrls} WHERE id = ${sessionId}`);
      }

      // Complete session
      await db.execute(sql`
        UPDATE crawl_sessions 
        SET status = 'completed', completed_at = NOW(), new_issues_found = ${newIssuesFound}, issues_resolved = ${issuesResolved}
        WHERE id = ${sessionId}
      `);

      // Count not-indexed and auto-fixable for the frontend summary
      const [notIndexedRows] = await db.execute(sql`SELECT COUNT(*) as cnt FROM gsc_indexing_coverage WHERE coverage_status = 'not_indexed'`);
      const notIndexed = (notIndexedRows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0;
      const [autoFixRows] = await db.execute(sql`SELECT COUNT(*) as cnt FROM technical_seo_issues WHERE auto_fixable = 1 AND is_resolved = 0`);
      const autoFixable = (autoFixRows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0;
      return {
        sessionId,
        totalUrls,
        urlsCrawled: crawledUrls,
        issuesFound: newIssuesFound,
        notIndexed,
        autoFixable,
        issuesResolved,
        status: "completed",
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      await db.execute(sql`
        UPDATE crawl_sessions 
        SET status = 'failed', completed_at = NOW(), error_message = ${String(err)}
        WHERE id = ${sessionId}
      `);
      throw err;
    }
  },

  /**
   * STAGE 3: AUTO-FIX
   * Apply auto-fixes for fixable issues (canonical, schema, meta robots, redirect chains).
   * Returns count of issues fixed.
   */
  async applyAutoFixes(options: {
    issueIds?: number[];
    issueCategory?: string;
    fixedById?: number;
    dryRun?: boolean;
  } = {}): Promise<{ fixed: number; skipped: number; errors: string[] }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { issueIds, issueCategory, fixedById, dryRun = false } = options;
    let fixed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Build query for pending auto-fixable issues
    let query = `
      SELECT id, url, page_type, entity_type, entity_id, issue_category, issue_type, fix_payload
      FROM technical_seo_issues
      WHERE auto_fixable = 1 AND is_resolved = 0 AND fix_status = 'pending'
    `;
    if (issueIds?.length) query += ` AND id IN (${issueIds.join(",")})`;
    if (issueCategory) query += ` AND issue_category = '${issueCategory}'`;
    query += " LIMIT 200";

    const [issueRows] = await db.execute(sql.raw(query));
    const issues = issueRows as unknown as Array<{
      id: number; url: string; page_type: string; entity_type: string; entity_id: number;
      issue_category: string; issue_type: string; fix_payload: string;
    }>;

    for (const issue of issues) {
      try {
        const payload = issue.fix_payload ? JSON.parse(issue.fix_payload) : {};

        if (issue.issue_category === "canonical" || issue.issue_type === "missing_canonical" || issue.issue_type === "canonical_mismatch") {
          // Fix: update seoMeta canonical URL for this entity
          if (!dryRun && issue.entity_type && issue.entity_id) {
            const correctCanonical = payload.correctCanonical || issue.url;
            // Upsert seoMeta canonical
            await db.execute(sql`
              INSERT INTO seo_meta (entity_type, entity_id, canonical_url, updated_at)
              VALUES (${issue.entity_type}, ${issue.entity_id}, ${correctCanonical}, NOW())
              ON DUPLICATE KEY UPDATE canonical_url = ${correctCanonical}, updated_at = NOW()
            `);
          }
          if (!dryRun) {
            await db.execute(sql`
              UPDATE technical_seo_issues 
              SET fix_status = 'auto_fixed', fixed_at = NOW(), fixed_by_id = ${fixedById ?? null}, is_resolved = 1, resolved_at = NOW()
              WHERE id = ${issue.id}
            `);
          }
          fixed++;
        } else if (issue.issue_category === "meta_robots" && issue.issue_type === "noindex_directive") {
          // Fix: update article robotsIndexing to 'index'
          if (!dryRun && issue.entity_type === "article" && issue.entity_id) {
            await db.update(articles)
              .set({ robotsIndexing: "index" } as any)
              .where(eq(articles.id, issue.entity_id));
          }
          if (!dryRun) {
            await db.execute(sql`
              UPDATE technical_seo_issues 
              SET fix_status = 'auto_fixed', fixed_at = NOW(), fixed_by_id = ${fixedById ?? null}, is_resolved = 1, resolved_at = NOW()
              WHERE id = ${issue.id}
            `);
          }
          fixed++;
        } else if (issue.issue_category === "redirect_chain") {
          // Fix: update redirect to point directly to final URL
          if (!dryRun && payload.finalUrl) {
            // Update any redirect rules that point to this URL
            await db.execute(sql`
              UPDATE redirects SET to_url = ${payload.finalUrl}, updated_at = NOW()
              WHERE from_url = ${issue.url} AND is_active = 1
            `);
          }
          if (!dryRun) {
            await db.execute(sql`
              UPDATE technical_seo_issues 
              SET fix_status = 'auto_fixed', fixed_at = NOW(), fixed_by_id = ${fixedById ?? null}, is_resolved = 1, resolved_at = NOW()
              WHERE id = ${issue.id}
            `);
          }
          fixed++;
        } else if (issue.issue_category === "schema_markup") {
          // Schema is rendered server-side; mark as flagged for review since it requires template changes
          if (!dryRun) {
            await db.execute(sql`
              UPDATE technical_seo_issues 
              SET fix_status = 'needs_review', flagged_for_review = 1
              WHERE id = ${issue.id}
            `);
          }
          skipped++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`Issue ${issue.id}: ${String(err)}`);
        skipped++;
      }
    }

    return { fixed, skipped, errors };
  },

  /**
   * STAGE 4: SUBMIT
   * Submit non-indexed pages to Google Indexing API.
   * Returns submission results.
   */
  async submitForIndexing(options: {
    urls?: string[];
    coverageStatus?: CoverageStatus;
    submittedById?: number;
    maxSubmissions?: number;
  } = {}): Promise<{ submitted: number; succeeded: number; failed: number; errors: string[] }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { urls, coverageStatus = "not_indexed", submittedById, maxSubmissions = 50 } = options;

    let query = `
      SELECT id, url FROM gsc_indexing_coverage
      WHERE submitted_for_indexing = 0 OR submitted_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    if (coverageStatus) query += ` AND coverage_status = '${coverageStatus}'`;
    if (urls?.length) query += ` AND url IN (${urls.map((u) => `'${u.replace(/'/g, "''")}'`).join(",")})`;
    query += ` LIMIT ${maxSubmissions}`;

    const [rows] = await db.execute(sql.raw(query));
    const pages = rows as unknown as Array<{ id: number; url: string }>;

    let submitted = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const page of pages) {
      try {
        const results = await notifySearchEngines({ url: page.url, type: "URL_UPDATED" });
        submitted++;
        const success = results.some(r => r.success);
        const errorMsg = (results.find(r => !r.success) as any)?.error || null;

        if (success) {
          succeeded++;
          await db.execute(sql`
            UPDATE gsc_indexing_coverage 
            SET submitted_for_indexing = 1, submitted_at = NOW(), indexing_request_status = 'submitted'
            WHERE id = ${page.id}
          `);
        } else {
          failed++;
          errors.push(`${page.url}: ${errorMsg || "Unknown error"}`);
          await db.execute(sql`
            UPDATE gsc_indexing_coverage 
            SET indexing_request_status = 'failed'
            WHERE id = ${page.id}
          `);
        }

        // Record submission
        const firstResult = results[0];
        await db.execute(sql`
          INSERT INTO indexing_submissions (url, coverage_id, submission_type, success, status_code, error_message, submitted_by_id)
          VALUES (${page.url}, ${page.id}, 'URL_UPDATED', ${success ? 1 : 0}, ${firstResult?.statusCode ?? null}, ${errorMsg ?? null}, ${submittedById ?? null})
        `);
      } catch (err) {
        failed++;
        errors.push(`${page.url}: ${String(err)}`);
      }
    }

    return { submitted, succeeded, failed, errors };
  },

  /**
   * STAGE 5: REPORT
   * Generate a weekly/daily report summarizing indexing coverage and technical SEO health.
   */
  async generateReport(options: {
    reportType?: "weekly" | "daily" | "manual";
    generatedById?: number;
  } = {}): Promise<{
    reportId: number;
    summary: {
      totalPages: number;
      indexedPages: number;
      notIndexedPages: number;
      newlyIndexedPages: number;
      newIssuesFound: number;
      issuesAutoFixed: number;
      issuesFlaggedForReview: number;
      submissionsCount: number;
      submissionsSucceeded: number;
    };
    narrative: string;
    issueBreakdown: Record<string, number>;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { reportType = "weekly", generatedById } = options;
    const reportDate = new Date().toISOString().split("T")[0];

    // Gather stats
    const [coverageStats] = await db.execute(sql`
      SELECT 
        COUNT(*) as total_pages,
        SUM(CASE WHEN coverage_status = 'indexed' THEN 1 ELSE 0 END) as indexed_pages,
        SUM(CASE WHEN coverage_status = 'not_indexed' THEN 1 ELSE 0 END) as not_indexed_pages
      FROM gsc_indexing_coverage
    `);
    const stats = (coverageStats as unknown as Array<{ total_pages: number; indexed_pages: number; not_indexed_pages: number }>)[0] || { total_pages: 0, indexed_pages: 0, not_indexed_pages: 0 };

    // Issues breakdown
    const [issueBreakdownRows] = await db.execute(sql`
      SELECT issue_category, COUNT(*) as count
      FROM technical_seo_issues
      WHERE is_resolved = 0
      GROUP BY issue_category
    `);
    const issueBreakdown: Record<string, number> = {};
    for (const row of issueBreakdownRows as unknown as Array<{ issue_category: string; count: number }>) {
      issueBreakdown[row.issue_category] = row.count;
    }

    // Recent fixes
    const [fixStats] = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN fix_status = 'auto_fixed' AND fixed_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as auto_fixed,
        SUM(CASE WHEN flagged_for_review = 1 AND is_resolved = 0 THEN 1 ELSE 0 END) as flagged
      FROM technical_seo_issues
    `);
    const fixes = (fixStats as unknown as Array<{ auto_fixed: number; flagged: number }>)[0] || { auto_fixed: 0, flagged: 0 };

    // Submission stats (last 7 days)
    const [subStats] = await db.execute(sql`
      SELECT COUNT(*) as total, SUM(success) as succeeded
      FROM indexing_submissions
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const subs = (subStats as unknown as Array<{ total: number; succeeded: number }>)[0] || { total: 0, succeeded: 0 };

    // Newly indexed (submitted and now indexed)
    const [newlyIndexed] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM gsc_indexing_coverage
      WHERE submitted_for_indexing = 1 AND coverage_status = 'indexed' AND submitted_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const newlyIndexedCount = (newlyIndexed as unknown as Array<{ count: number }>)[0]?.count || 0;

    // Pages flagged for manual review
    const [manualReviewRows] = await db.execute(sql`
      SELECT url FROM technical_seo_issues WHERE flagged_for_review = 1 AND is_resolved = 0 LIMIT 20
    `);
    const manualReviewUrls = (manualReviewRows as unknown as Array<{ url: string }>).map((r) => r.url);

    // Persistent issues (submitted but still not indexed)
    const [persistentRows] = await db.execute(sql`
      SELECT url FROM gsc_indexing_coverage 
      WHERE submitted_for_indexing = 1 AND coverage_status = 'not_indexed' AND submitted_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
      LIMIT 20
    `);
    const persistentUrls = (persistentRows as unknown as Array<{ url: string }>).map((r) => r.url);

    // Generate AI narrative
    const narrativePrompt = `You are a senior SEO analyst. Write a concise, professional weekly Technical SEO report narrative (3-4 paragraphs) based on these stats:

- Total pages crawled: ${stats.total_pages}
- Indexed pages: ${stats.indexed_pages}
- Not indexed pages: ${stats.not_indexed_pages}
- Newly indexed this week: ${newlyIndexedCount}
- New issues found: ${Object.values(issueBreakdown as any).reduce((a: number, b: any) => a + b, 0)}
- Issues auto-fixed: ${fixes.auto_fixed}
- Issues flagged for manual review: ${fixes.flagged}
- Indexing submissions: ${subs.total} (${subs.succeeded} succeeded)
- Issue breakdown: ${JSON.stringify(issueBreakdown)}
- Pages needing manual review: ${manualReviewUrls.slice(0, 5).join(", ")}
- Persistent non-indexed pages: ${persistentUrls.slice(0, 5).join(", ")}

Write a clear, actionable narrative that:
1. Summarizes the current indexing health
2. Highlights the most critical issues and their impact
3. Describes what was auto-fixed this week
4. Provides specific recommendations for the remaining issues
Keep it professional and data-driven.`;

    let narrative = "";
    try {
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are a senior SEO analyst writing technical SEO reports." },
          { role: "user", content: narrativePrompt },
        ],
      });
      narrative = (llmResponse?.choices?.[0]?.message?.content as string) || "";
    } catch {
      narrative = `Technical SEO Report for ${reportDate}: ${stats.indexed_pages} of ${stats.total_pages} pages are indexed (${Math.round((stats.indexed_pages / Math.max(stats.total_pages, 1)) * 100)}%). ${Object.values(issueBreakdown as any).reduce((a: number, b: any) => a + b, 0)} active issues detected. ${fixes.auto_fixed} issues auto-fixed this week. ${fixes.flagged} pages flagged for manual review.`;
    }

    const summary = {
      totalPages: stats.total_pages,
      indexedPages: stats.indexed_pages,
      notIndexedPages: stats.not_indexed_pages,
      newlyIndexedPages: newlyIndexedCount,
      newIssuesFound: Number(Object.values(issueBreakdown as any).reduce((a: number, b: unknown) => a + Number(b), 0)),
      issuesAutoFixed: fixes.auto_fixed,
      issuesFlaggedForReview: fixes.flagged,
      submissionsCount: subs.total,
      submissionsSucceeded: subs.succeeded,
    };

    // Save report
    const [reportRow] = await db.execute(sql`
      INSERT INTO technical_seo_reports 
        (report_type, report_date, total_pages, indexed_pages, not_indexed_pages, newly_indexed_pages, new_issues_found, issues_auto_fixed, issues_flagged_for_review, submissions_count, submissions_succeeded, issue_breakdown, manual_review_urls, persistent_issue_urls, report_narrative, generated_by_id)
      VALUES 
        (${reportType}, ${reportDate}, ${summary.totalPages}, ${summary.indexedPages}, ${summary.notIndexedPages}, ${summary.newlyIndexedPages}, ${summary.newIssuesFound}, ${summary.issuesAutoFixed}, ${summary.issuesFlaggedForReview}, ${summary.submissionsCount}, ${summary.submissionsSucceeded}, ${JSON.stringify(issueBreakdown)}, ${JSON.stringify(manualReviewUrls)}, ${JSON.stringify(persistentUrls)}, ${narrative}, ${generatedById ?? null})
    `);
    const reportId = (reportRow as unknown as { insertId: number }).insertId;

    return { reportId, summary, narrative, issueBreakdown };
  },

  /**
   * Get dashboard stats for the Technical SEO module
   */
  async getDashboardStats(): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [coverageStats] = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN coverage_status = 'indexed' THEN 1 ELSE 0 END) as indexed,
        SUM(CASE WHEN coverage_status = 'not_indexed' THEN 1 ELSE 0 END) as not_indexed,
        SUM(CASE WHEN coverage_status = 'excluded' THEN 1 ELSE 0 END) as excluded,
        SUM(CASE WHEN coverage_status = 'error' THEN 1 ELSE 0 END) as errors,
        MAX(last_crawled_at) as last_crawl_at
      FROM gsc_indexing_coverage
    `);
    const cs = (coverageStats as unknown as Array<{ total: number; indexed: number; not_indexed: number; excluded: number; errors: number; last_crawl_at: string | null }>)[0] || { total: 0, indexed: 0, not_indexed: 0, excluded: 0, errors: 0, last_crawl_at: null };

    const [issueStats] = await db.execute(sql`
      SELECT 
        COUNT(*) as open_issues,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN auto_fixable = 1 THEN 1 ELSE 0 END) as auto_fixable
      FROM technical_seo_issues
      WHERE is_resolved = 0
    `);
    const is_ = (issueStats as unknown as Array<{ open_issues: number; critical: number; auto_fixable: number }>)[0] || { open_issues: 0, critical: 0, auto_fixable: 0 };

    const [subStats] = await db.execute(sql`
      SELECT COUNT(*) as count FROM indexing_submissions WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const recentSubmissions = (subStats as unknown as Array<{ count: number }>)[0]?.count || 0;

    const [issueCatRows] = await db.execute(sql`
      SELECT issue_category, COUNT(*) as count FROM technical_seo_issues WHERE is_resolved = 0 GROUP BY issue_category
    `);
    const issuesByCategory: Record<string, number> = {};
    for (const row of issueCatRows as unknown as Array<{ issue_category: string; count: number }>) {
      issuesByCategory[row.issue_category] = row.count;
    }

    const [pageTypeRows] = await db.execute(sql`
      SELECT page_type, 
        SUM(CASE WHEN coverage_status = 'indexed' THEN 1 ELSE 0 END) as indexed,
        COUNT(*) as total
      FROM gsc_indexing_coverage
      GROUP BY page_type
    `);
    const coverageByPageType: Record<string, { indexed: number; total: number }> = {};
    for (const row of pageTypeRows as unknown as Array<{ page_type: string; indexed: number; total: number }>) {
      coverageByPageType[row.page_type] = { indexed: row.indexed, total: row.total };
    }

    // Fetch recent activity timestamps
    const [lastAutoFixRow] = await db.execute(sql`SELECT MAX(fixed_at) as ts FROM technical_seo_issues WHERE fix_status = 'auto_fixed'`);
    const lastAutoFix = (lastAutoFixRow as unknown as Array<{ ts: string | null }>)[0]?.ts ?? null;
    const [lastSubmissionRow] = await db.execute(sql`SELECT MAX(created_at) as ts FROM indexing_submissions`);
    const lastSubmission = (lastSubmissionRow as unknown as Array<{ ts: string | null }>)[0]?.ts ?? null;
    const [lastReportRow] = await db.execute(sql`SELECT MAX(created_at) as ts FROM technical_seo_reports`);
    const lastReport = (lastReportRow as unknown as Array<{ ts: string | null }>)[0]?.ts ?? null;

    return {
      // Structured for frontend consumption
      coverageStats: {
        indexed: cs.indexed,
        not_indexed: cs.not_indexed,
        excluded: cs.excluded,
        error: cs?.errors,
      },
      issueStats: {
        total: is_.open_issues,
        critical: is_.critical,
        autoFixable: is_.auto_fixable,
        flaggedForReview: 0, // computed below if needed
        byCategory: issuesByCategory,
      },
      recentActivity: {
        lastCrawl: cs.last_crawl_at,
        lastAutoFix,
        lastSubmission,
        lastReport,
      },
      // Also expose flat for backward compat
      totalCrawled: cs.total,
      indexed: cs.indexed,
      notIndexed: cs.not_indexed,
      excluded: cs.excluded,
      errors: cs?.errors,
      openIssues: is_.open_issues,
      criticalIssues: is_.critical,
      autoFixableIssues: is_.auto_fixable,
      recentSubmissions,
      lastCrawlAt: cs.last_crawl_at,
      issuesByCategory,
      coverageByPageType,
    };
  },

  /**
   * Get paginated list of coverage records with filters
   */
  async getCoverageList(options: {
    status?: CoverageStatus;
    pageType?: string;
    page?: number;
    limit?: number;
    hasIssues?: boolean;
  } = {}): Promise<{ items: unknown[]; total: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { status, pageType, page = 1, limit = 50, hasIssues } = options;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    if (status) whereClause += ` AND g.coverage_status = '${status}'`;
    if (pageType) whereClause += ` AND g.page_type = '${pageType}'`;
    if (hasIssues) whereClause += ` AND EXISTS (SELECT 1 FROM technical_seo_issues t WHERE t.coverage_id = g.id AND t.is_resolved = 0)`;

    const [rows] = await db.execute(sql.raw(`
      SELECT 
        g.id, g.url,
        g.page_type AS pageType,
        g.coverage_status AS coverageStatus,
        g.gsc_reason AS gscReason,
        g.http_status AS httpStatus,
        g.canonical_url AS canonicalUrl,
        g.canonical_mismatch AS canonicalMismatch,
        g.robots_meta AS robotsMeta,
        g.has_schema AS hasSchema,
        g.redirect_chain_length AS redirectChainLength,
        g.final_url AS finalUrl,
        g.has_hreflang AS hasHreflang,
        g.submitted_for_indexing AS submittedForIndexing,
        g.submitted_at AS submittedAt,
        g.indexing_request_status AS indexingRequestStatus,
        g.last_crawled_at AS lastCheckedAt,
        (SELECT COUNT(*) FROM technical_seo_issues t WHERE t.coverage_id = g.id AND t.is_resolved = 0) as issueCount
      FROM gsc_indexing_coverage g
      ${whereClause}
      ORDER BY g.last_crawled_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `));

    const [countRow] = await db.execute(sql.raw(`
      SELECT COUNT(*) as total FROM gsc_indexing_coverage g ${whereClause}
    `));
    const total = (countRow as unknown as Array<{ total: number }>)[0]?.total || 0;

    return { items: rows as unknown as unknown[], total };
  },

  /**
   * Get paginated list of technical SEO issues with filters
   */
  async getIssuesList(options: {
    category?: string;
    severity?: string;
    fixStatus?: string;
    flaggedForReview?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: unknown[]; total: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { category, severity, fixStatus, flaggedForReview, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE is_resolved = 0";
    if (category) whereClause += ` AND issue_category = '${category}'`;
    if (severity) whereClause += ` AND severity = '${severity}'`;
    if (fixStatus) whereClause += ` AND fix_status = '${fixStatus}'`;
    if (flaggedForReview) whereClause += ` AND flagged_for_review = 1`;

    const [rows] = await db.execute(sql.raw(`
      SELECT 
        id, url,
        page_type AS pageType,
        entity_type AS entityType,
        entity_id AS entityId,
        issue_category AS issueCategory,
        issue_type AS issueType,
        severity,
        description,
        auto_fixable AS autoFixable,
        suggested_fix AS suggestedFix,
        fix_payload AS fixPayload,
        fix_status AS fixStatus,
        fixed_at AS fixedAt,
        fixed_by_id AS fixedById,
        is_resolved AS isResolved,
        resolved_at AS resolvedAt,
        flagged_for_review AS flaggedForReview,
        review_notes AS reviewNotes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM technical_seo_issues ${whereClause}
      ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low'), created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `));

    const [countRow] = await db.execute(sql.raw(`
      SELECT COUNT(*) as total FROM technical_seo_issues ${whereClause}
    `));
    const total = (countRow as unknown as Array<{ total: number }>)[0]?.total || 0;

    return { items: rows as unknown as unknown[], total };
  },

  /**
   * Get list of reports
   */
   async getReports(options: { limit?: number } = {}): Promise<unknown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { limit = 20 } = options;
    const [rows] = await db.execute(sql.raw(`
      SELECT 
        id,
        report_type AS reportType,
        report_date AS reportDate,
        total_pages AS totalPages,
        indexed_pages AS indexedPages,
        not_indexed_pages AS notIndexedPages,
        newly_indexed_pages AS newlyIndexedPages,
        new_issues_found AS newIssuesFound,
        issues_auto_fixed AS issuesAutoFixed,
        issues_flagged_for_review AS issuesFlaggedForReview,
        submissions_count AS submissionsCount,
        submissions_succeeded AS submissionsSucceeded,
        issue_breakdown AS issueBreakdownJson,
        manual_review_urls AS manualReviewUrlsJson,
        persistent_issue_urls AS persistentIssueUrlsJson,
        report_narrative AS aiNarrative,
        generated_by_id AS generatedById,
        created_at AS generatedAt
      FROM technical_seo_reports ORDER BY created_at DESC LIMIT ${limit}
    `));
    // Parse JSON fields and build summary object for frontend
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      issueBreakdown: r.issueBreakdownJson ? JSON.parse(r.issueBreakdownJson as string) : {},
      manualReviewUrls: r.manualReviewUrlsJson ? JSON.parse(r.manualReviewUrlsJson as string) : [],
      persistentIssueUrls: r.persistentIssueUrlsJson ? JSON.parse(r.persistentIssueUrlsJson as string) : [],
      summary: {
        totalPages: r.totalPages,
        indexedPages: r.indexedPages,
        notIndexedPages: r.notIndexedPages,
        newlyIndexedPages: r.newlyIndexedPages,
        newIssuesFound: r.newIssuesFound,
        issuesFixed: r.issuesAutoFixed,
        issuesFlaggedForReview: r.issuesFlaggedForReview,
        urlsSubmitted: r.submissionsCount,
        flaggedForReview: r.issuesFlaggedForReview,
        indexRate: r.totalPages ? Math.round(((r.indexedPages as number) / (r.totalPages as number)) * 100) : 0,
      },
    }));
  },

  /**
   * Get crawl session history
   */
  async getCrawlSessions(options: { limit?: number } = {}): Promise<unknown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { limit = 20 } = options;
    const [rows] = await db.execute(sql.raw(`
      SELECT 
        id,
        session_type AS sessionType,
        status,
        total_urls AS totalUrls,
        crawled_urls AS urlsCrawled,
        new_issues_found AS issuesFound,
        issues_resolved AS issuesResolved,
        error_message AS errorMessage,
        started_at AS startedAt,
        completed_at AS completedAt,
        triggered_by_id AS triggeredById
      FROM crawl_sessions ORDER BY started_at DESC LIMIT ${limit}
    `));
    return rows as unknown as unknown[];
  },
};
