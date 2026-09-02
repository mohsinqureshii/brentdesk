import { getDb } from "../db";
import { articles } from "../../drizzle/schema";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import { workflowService } from "./workflow.service";
import { regenerateAllSitemaps } from "./publishHooks.service";
import { notifySearchEngines } from "./indexingNotification.service";
import { resolveArticleInfo } from "./indexingNotification.helper";
import { technicalSeoService } from "./technicalSeo.service";
import { processEventReminders } from "./eventReminders.service";
import { githubFetcherService } from "../modules/github";
import { processDueErasures, processRetention } from "../modules/compliance";

/**
 * Helper: retry an async function up to `maxRetries` times with a delay between attempts.
 * Useful for recovering from stale DB connections after sandbox hibernation.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 2,
  delayMs: number = 2000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`[Scheduler] ${label} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Scheduler service to handle auto-publishing of scheduled articles
 * This runs periodically to check for articles that should be published
 */
export const schedulerService = {
  /**
   * Check for scheduled articles that should be published
   * Called periodically (e.g., every minute) to publish articles whose scheduledAt time has passed
   */
  async publishScheduledArticles(): Promise<{ published: number; errors: string[] }> {
    const db = await getDb();
    if (!db) {
      return { published: 0, errors: ["Database not available"] };
    }

    const errors: string[] = [];
    let publishedCount = 0;

    try {
      // Get the scheduled and published status IDs with retry for stale connections
      const [scheduledStatus, publishedStatus] = await withRetry(
        async () => {
          const scheduled = await workflowService.getStatusBySlug("editorial", "scheduled");
          const published = await workflowService.getStatusBySlug("editorial", "published");
          return [scheduled, published] as const;
        },
        "getStatusBySlug"
      );

      if (!scheduledStatus || !publishedStatus) {
        return { published: 0, errors: ["Scheduled or Published status not found"] };
      }

      const now = new Date();

      // Find all articles that are scheduled and whose scheduledAt time has passed
      const scheduledArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          scheduledAt: articles.scheduledAt,
          publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
        })
        .from(articles)
        .where(
          and(
            eq(articles.statusId, scheduledStatus.id),
            isNotNull(articles.scheduledAt),
            lte(articles.scheduledAt, now as any)
          )
        );

      // Publish each scheduled article
      for (const article of scheduledArticles) {
        try {
          await db
            .update(articles)
            .set({
              statusId: publishedStatus.id,
              // Use the scheduledAt time as publishedAt if not already set
              publishedAt: article.publishedAt || article.scheduledAt || now,
            } as any)
            .where(eq(articles.id, article.id));

          publishedCount++;
          console.log(`[Scheduler] Published article: ${article.title} (ID: ${article.id})`);

          // Notify search engines about the newly published article (fire-and-forget)
          resolveArticleInfo(article.id).then(info => {
            if (info) notifySearchEngines({
              url: info.url,
              type: "URL_UPDATED",
              articleId: info.articleId,
              articleTitle: info.articleTitle,
              articleSlug: info.articleSlug,
              trigger: "scheduled",
            });
          }).catch(err => console.error("[Scheduler] Indexing notification failed:", err));
        } catch (err) {
          const errorMsg = `Failed to publish article ${article.id}: ${err instanceof Error ? err.message : "Unknown error"}`;
          errors.push(errorMsg);
          console.error(`[Scheduler] ${errorMsg}`);
        }
      }

      if (publishedCount > 0) {
        console.log(`[Scheduler] Published ${publishedCount} scheduled articles`);
      }
    } catch (err) {
      const errorMsg = `Scheduler error: ${err instanceof Error ? err.message : "Unknown error"}`;
      errors.push(errorMsg);
      console.error(`[Scheduler] ${errorMsg}`);
    }

    return { published: publishedCount, errors };
  },

  /**
   * Regenerate static sitemap files
   * Called on startup and periodically to keep sitemaps fresh
   */
  async regenerateSitemaps(): Promise<void> {
    try {
      const result = await withRetry(
        () => regenerateAllSitemaps(),
        "sitemapGeneration"
      );
      if (result.errors.length > 0) {
        console.error(`[Scheduler] Sitemap generation had ${result.errors.length} errors:`, result.errors);
      } else {
        console.log(`[Scheduler] Sitemaps regenerated: ${result.filesWritten.length} files written to disk`);
      }
    } catch (error) {
      console.error('[Scheduler] Sitemap regeneration failed:', error);
    }
  },

  /**
   * Start the scheduler to run periodically
   * @param intervalMs - Interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs: number = 60000): NodeJS.Timeout {
    console.log(`[Scheduler] Starting scheduler with ${intervalMs}ms interval`);
    
    // Run immediately on start (with small delay to let DB pool warm up)
    setTimeout(() => this.publishScheduledArticles(), 3000);
    
    // Regenerate sitemaps on startup (with 10s delay to let DB connect)
    setTimeout(() => this.regenerateSitemaps(), 10000);
    
    // Regenerate sitemaps every 5 minutes to keep sitemaps fresh after article uploads
    setInterval(() => this.regenerateSitemaps(), 5 * 60 * 1000);

    // Run daily Technical SEO crawl at 3am (check every hour)
    const runDailyTechSeo = () => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() < 5) {
        console.log('[Scheduler] Running daily Technical SEO detection crawl...');
        technicalSeoService.runDetectionCrawl({ maxPages: 500, forceRefresh: false } as any).catch((err: Error) => {
          console.error('[Scheduler] Technical SEO crawl failed:', err.message);
        });
      }
    };
    setInterval(runDailyTechSeo, 60 * 60 * 1000); // check every hour

    // Hourly event-reminder pipeline. Looks for events whose
    // startDate is exactly 7 days, 1 day, or 4 hours away (within
    // the hour bucket) and emails attendees who marked themselves
    // going / interested. Per-attendee re-send guard lives inside
    // eventReminders.service via lastReminderSentAt + 3h cutoff.
    const runEventReminders = () => {
      processEventReminders().catch((err: Error) => {
        console.error('[Scheduler] Event reminders failed:', err.message);
      });
    };
    // First run after 30s warmup so the DB pool is hot
    setTimeout(runEventReminders, 30_000);
    setInterval(runEventReminders, 60 * 60 * 1000); // hourly

    // Run weekly Technical SEO report on Mondays at 8am
    const runWeeklyReport = () => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 5) {
        console.log('[Scheduler] Generating weekly Technical SEO report...');
        technicalSeoService.generateReport({ type: 'weekly' } as any).catch((err: Error) => {
          console.error('[Scheduler] Weekly SEO report failed:', err.message);
        });
      }
    };
    setInterval(runWeeklyReport, 60 * 60 * 1000); // check every hour

    // ----------------------------------------------------------
    // Talent Platform background jobs
    // ----------------------------------------------------------

    // GitHub fetcher drain — every 5 minutes. Processes queued
    // GitHub sync jobs (candidate authorized → fetch repos + signals).
    const runGithubFetcherDrain = async () => {
      console.log('[TalentCron:githubFetcherDrain] start');
      try {
        const result = await githubFetcherService.drainQueue(25);
        console.log(`[TalentCron:githubFetcherDrain] end processed=${result.processed} failed=${result.failed}`);
      } catch (err) {
        console.error('[TalentCron:githubFetcherDrain]', err);
      }
    };
    setInterval(runGithubFetcherDrain, 5 * 60 * 1000);

    // Erasure executor — hourly. Hard-deletes candidates whose
    // 30-day grace period has elapsed.
    const runErasureExecutor = async () => {
      console.log('[TalentCron:erasureExecutor] start');
      try {
        await processDueErasures();
        console.log('[TalentCron:erasureExecutor] end');
      } catch (err) {
        console.error('[TalentCron:erasureExecutor]', err);
      }
    };
    setInterval(runErasureExecutor, 60 * 60 * 1000);

    // Retention sweep — daily at 03:00 UTC. Opens erasure requests
    // for candidates past their tenant's retention window.
    const runRetentionSweep = async () => {
      const now = new Date();
      if (now.getUTCHours() === 3 && now.getUTCMinutes() < 5) {
        console.log('[TalentCron:retentionSweep] start');
        try {
          await processRetention();
          console.log('[TalentCron:retentionSweep] end');
        } catch (err) {
          console.error('[TalentCron:retentionSweep]', err);
        }
      }
    };
    setInterval(runRetentionSweep, 60 * 60 * 1000); // check every hour

    // Then run article scheduler at the specified interval
    return setInterval(() => {
      this.publishScheduledArticles();
    }, intervalMs);
  },
};
