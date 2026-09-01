import { getBaseUrl } from "../../shared/publication";
/**
 * Indexing Notification Service v2.0.0
 * 
 * Notifies search engines when new content is published or updated.
 * Three complementary approaches for maximum crawl speed:
 * 
 * 1. **Google Sitemap Ping** – Pings Google's sitemap endpoint (no credentials needed)
 * 2. **IndexNow** – Instant URL submission to Bing, Yandex, and other IndexNow-compatible engines
 * 3. **Google Indexing API** – Direct URL submission to Google (requires service account JSON)
 * 
 * All methods are fire-and-forget with error logging. A failure in one method
 * does not block the others or the article publish flow.
 * 
 * v2.0.0: Results are now persisted to the indexing_logs database table.
 */

const BASE_URL = process.env.BASE_URL && process.env.BASE_URL.startsWith("http")
  ? process.env.BASE_URL
  : getBaseUrl();

// IndexNow API key – must also be served as a static file at /{key}.txt
export const INDEXNOW_KEY = "71c6f0fcfb86471b9a5e325252176962";

// ============================================================
// TYPES
// ============================================================

export interface IndexingResult {
  method: "sitemap_ping" | "indexnow" | "google_indexing_api";
  success: boolean;
  statusCode?: number;
  message: string;
  url: string;
  timestamp: string;
}

export interface NotifyOptions {
  /** Full URL of the published page (e.g. <base url>/news/my-article) */
  url: string;
  /** "URL_UPDATED" or "URL_DELETED" – used by Google Indexing API */
  type?: "URL_UPDATED" | "URL_DELETED";
  /** Article metadata for logging */
  articleId?: number;
  articleTitle?: string;
  articleSlug?: string;
  /** What triggered this notification */
  trigger?: "publish" | "transition" | "bulk_publish" | "scheduled" | "manual";
  /** User ID who triggered the notification */
  triggeredBy?: number;
}

// ============================================================
// DATABASE LOGGING
// ============================================================

async function saveIndexingLog(
  result: IndexingResult,
  options: NotifyOptions
): Promise<void> {
  try {
    const { getDb } = await import("../db");
    const { indexingLogs } = await import("../../drizzle/schema");
    const db = await getDb();
    if (!db) return;

    await db.insert(indexingLogs).values({
      articleId: options.articleId || null,
      articleTitle: options.articleTitle || null,
      articleSlug: options.articleSlug || null,
      url: result.url,
      method: result.method,
      success: result.success ? 1 : 0,
      statusCode: result.statusCode || null,
      message: result.message,
      trigger: options.trigger || "publish",
      triggeredBy: options.triggeredBy || null,
    } as any);
  } catch (err) {
    // Never let logging failures affect the main flow
    console.error("[IndexingNotification] Failed to save log:", err instanceof Error ? err.message : err);
  }
}

// ============================================================
// 1. GOOGLE SITEMAP PING
// ============================================================

/**
 * Ping Google to re-crawl the sitemap index.
 * Google deprecated the individual URL ping but still honours the sitemap ping:
 *   https://www.google.com/ping?sitemap=<sitemap_url>
 */
async function pingSitemap(): Promise<IndexingResult> {
  const sitemapUrl = `${BASE_URL}/api/sitemap.xml`;
  // Google deprecated the sitemap ping endpoint in 2023.
  // We now ping both Google and Bing sitemap endpoints.
  // Google returns 404 (expected), Bing may still accept.
  const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const timestamp = new Date().toISOString();

  try {
    // Try Bing first (still supported)
    const [bingRes, googleRes] = await Promise.allSettled([
      fetch(bingPingUrl, { method: "GET", signal: AbortSignal.timeout(10000) }),
      fetch(googlePingUrl, { method: "GET", signal: AbortSignal.timeout(10000) }),
    ]);

    const bingOk = bingRes.status === "fulfilled" && bingRes.value.status >= 200 && bingRes.value.status < 300;
    const googleStatus = googleRes.status === "fulfilled" ? googleRes.value.status : 0;
    
    // Consider success if Bing accepted, or if Google returned 200
    // Google 404 is expected (deprecated) - not a failure
    const success = bingOk || (googleStatus >= 200 && googleStatus < 300);
    const statusCode = bingOk 
      ? (bingRes.status === "fulfilled" ? bingRes.value.status : 0)
      : googleStatus;

    let message = "";
    if (bingOk) {
      message = "Sitemap ping accepted by Bing";
    } else if (googleStatus === 404) {
      message = "Google sitemap ping deprecated (404 expected). Use IndexNow or Google Indexing API instead.";
      // Mark as success since this is expected behavior
      return {
        method: "sitemap_ping",
        success: true,
        statusCode: 404,
        message,
        url: sitemapUrl,
        timestamp,
      };
    } else {
      message = `Sitemap ping returned ${statusCode}`;
    }

    console.log(`[IndexingNotification] Sitemap ping: Bing=${bingOk ? "OK" : "FAIL"}, Google=${googleStatus} → ${sitemapUrl}`);

    return {
      method: "sitemap_ping",
      success,
      statusCode,
      message,
      url: sitemapUrl,
      timestamp,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[IndexingNotification] Sitemap ping error: ${msg}`);
    return {
      method: "sitemap_ping",
      success: false,
      message: `Sitemap ping failed: ${msg}`,
      url: sitemapUrl,
      timestamp,
    };
  }
}

// ============================================================
// 2. INDEXNOW (Bing, Yandex, Seznam, Naver, etc.)
// ============================================================

/**
 * Submit one or more URLs via the IndexNow protocol.
 * Sends to Bing's endpoint; other engines pick it up through the shared IndexNow network.
 * Spec: https://www.indexnow.org/documentation
 */
async function submitIndexNow(urls: string[]): Promise<IndexingResult> {
  const timestamp = new Date().toISOString();
  const endpoint = "https://api.indexnow.org/indexnow";

  const body = {
    host: new URL(BASE_URL).hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    // IndexNow returns 200 (OK), 202 (Accepted), or 200 with key already submitted
    const success = res.status >= 200 && res.status < 300;
    console.log(`[IndexingNotification] IndexNow ${success ? "OK" : "FAILED"} (${res.status}) → ${urls.length} URL(s)`);

    return {
      method: "indexnow",
      success,
      statusCode: res.status,
      message: success
        ? `IndexNow accepted ${urls.length} URL(s)`
        : `IndexNow returned ${res.status}`,
      url: urls[0],
      timestamp,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[IndexingNotification] IndexNow error: ${msg}`);
    return {
      method: "indexnow",
      success: false,
      message: `IndexNow failed: ${msg}`,
      url: urls[0],
      timestamp,
    };
  }
}

// ============================================================
// 3. GOOGLE INDEXING API (requires service account)
// ============================================================

/**
 * Submit a URL to Google's Indexing API.
 * Requires GOOGLE_INDEXING_SERVICE_ACCOUNT env var with the service account JSON.
 * If the env var is not set, this method is silently skipped.
 * 
 * Docs: https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */
async function submitGoogleIndexingApi(options: NotifyOptions): Promise<IndexingResult | null> {
  const timestamp = new Date().toISOString();
  const serviceAccountJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    console.log("[IndexingNotification] Google Indexing API skipped – no service account configured");
    return null;
  }

  try {
    // Parse service account credentials
    const creds = JSON.parse(serviceAccountJson);
    const token = await getGoogleAccessToken(creds);

    const body = {
      url: options.url,
      type: options.type || "URL_UPDATED",
    };

    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const success = res.status >= 200 && res.status < 300;
    const responseText = await res.text();
    console.log(`[IndexingNotification] Google Indexing API ${success ? "OK" : "FAILED"} (${res.status}) → ${options.url}`);
    if (!success) {
      console.error(`[IndexingNotification] Google Indexing API response: ${responseText}`);
    }

    return {
      method: "google_indexing_api",
      success,
      statusCode: res.status,
      message: success
        ? "Google Indexing API accepted"
        : `Google Indexing API returned ${res.status}: ${responseText.substring(0, 200)}`,
      url: options.url,
      timestamp,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[IndexingNotification] Google Indexing API error: ${msg}`);
    return {
      method: "google_indexing_api",
      success: false,
      message: `Google Indexing API failed: ${msg}`,
      url: options.url,
      timestamp,
    };
  }
}

/**
 * Create a signed JWT and exchange it for a Google OAuth2 access token.
 * This implements the service-account JWT flow without external libraries.
 */
async function getGoogleAccessToken(creds: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const crypto = await import("crypto");

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: creds.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  const signature = sign.sign(creds.private_key, "base64url");

  const jwt = `${signInput}.${signature}`;

  const tokenRes = await fetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(10000),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenData = (await tokenRes.json()) as unknown as { access_token: string };
  return tokenData.access_token;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Notify all configured search engines about a new or updated URL.
 * This is the main entry point – call it whenever content is published.
 * 
 * Runs all methods in parallel. Failures are logged but never thrown.
 * Results are persisted to the indexing_logs table.
 */
export async function notifySearchEngines(options: NotifyOptions): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  console.log(`[IndexingNotification] Notifying search engines about: ${options.url}`);

  // Run all three methods in parallel
  const [sitemapResult, indexNowResult, googleResult] = await Promise.allSettled([
    pingSitemap(),
    submitIndexNow([options.url]),
    submitGoogleIndexingApi(options),
  ]);

  if (sitemapResult.status === "fulfilled") results.push(sitemapResult.value);
  if (indexNowResult.status === "fulfilled") results.push(indexNowResult.value);
  if (googleResult.status === "fulfilled" && googleResult.value) results.push(googleResult.value);

  const successCount = results.filter((r) => r.success).length;
  console.log(`[IndexingNotification] Done: ${successCount}/${results.length} methods succeeded for ${options.url}`);

  // Persist all results to database (fire-and-forget)
  for (const result of results) {
    saveIndexingLog(result, options).catch(() => {});
  }

  return results;
}

/**
 * Notify search engines about multiple URLs at once.
 * Uses IndexNow batch submission and individual Google Indexing API calls.
 */
export async function notifySearchEnginesBatch(urls: string[], options?: Partial<NotifyOptions>): Promise<IndexingResult[]> {
  if (urls.length === 0) return [];

  console.log(`[IndexingNotification] Batch notifying search engines about ${urls.length} URL(s)`);

  const results: IndexingResult[] = [];

  // Sitemap ping (once for all URLs)
  const sitemapResult = await pingSitemap();
  results.push(sitemapResult);

  // IndexNow supports batch (up to 10,000 URLs)
  const indexNowResult = await submitIndexNow(urls);
  results.push(indexNowResult);

  // Google Indexing API (individual calls, max 200/day quota)
  for (const url of urls.slice(0, 10)) {
    // Limit to 10 to avoid quota exhaustion
    const googleResult = await submitGoogleIndexingApi({ url, type: "URL_UPDATED" });
    if (googleResult) results.push(googleResult);
  }

  // Persist results
  const baseOptions: NotifyOptions = {
    url: urls[0],
    trigger: options?.trigger || "bulk_publish",
    triggeredBy: options?.triggeredBy,
  };
  for (const result of results) {
    saveIndexingLog(result, baseOptions).catch(() => {});
  }

  return results;
}

/**
 * Build the full public URL for an article given its slug and primary category slug.
 */
export function buildArticleUrl(categorySlug: string, articleSlug: string): string {
  return `${BASE_URL}/${categorySlug}/${articleSlug}`;
}

export const indexingNotificationService = {
  notifySearchEngines,
  notifySearchEnginesBatch,
  buildArticleUrl,
  INDEXNOW_KEY,
  // Expose individual methods for testing
  _pingSitemap: pingSitemap,
  _submitIndexNow: submitIndexNow,
  _submitGoogleIndexingApi: submitGoogleIndexingApi,
};
