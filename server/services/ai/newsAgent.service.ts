/**
 * News Agent Service
 * Autonomous crawler that monitors configured news sources,
 * discovers new articles, scores relevance with multi-signal AI,
 * and optionally auto-generates content for approval.
 *
 * SCORING SIGNALS (all 0–1, blended into final 0–100 score):
 *  1. Keyword relevance   – MENA/tech/startup keyword density in title+summary
 *  2. LLM semantic score  – the LLM rates topical fit for the publication editorial focus
 *  3. Recency boost       – articles < 6h get +0.10, < 24h +0.05
 *  4. Title quality       – penalise clickbait/listicle patterns
 *  5. Content depth       – reward articles with substantial body text
 *  6. Entity signal       – bonus for named MENA countries/cities/companies
 *  7. Novelty             – penalise topics already covered in last 7 days
 */

import { publication } from "../../../shared/publication";
import { EDITORIAL_IDENTITY, SCORING_RUBRIC } from "../../config/editorial";
import { getDb } from "../../db";
import {
  aiAgentSources, aiAgentCrawlLog, aiAgentDiscoveredArticles,
  settings, articles as articlesTable,
} from "../../../drizzle/schema";
import { eq, and, gte, desc, sql, or, like } from "drizzle-orm";
import { invokeLLMProvider, type LLMProvider } from "./llmProvider.service";
import { batchScoreArticles, invalidateScoringCache } from "./scoringEngine.service";
import { toDbDate } from "../../_core/dbValues";

// ============================================================
// TYPES
// ============================================================

export interface CrawlResult {
  sourceId: number;
  sourceName: string;
  articlesFound: number;
  articlesNew: number;
  articlesDuplicate: number;
  articlesAboveThreshold: number;
  errors: string[];
  durationMs: number;
}

interface DiscoveredItem {
  title: string;
  sourceUrl: string;
  summary?: string;
  rawContent?: string;
  publishedAt?: Date;
  author?: string;
  imageUrl?: string;
  tags?: string[];
}

interface ScoredItem extends DiscoveredItem {
  relevanceScore: number;      // 0–1 final blended score
  scoreBreakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  keyword: number;
  llm: number;
  recency: number;
  titleQuality: number;
  contentDepth: number;
  entitySignal: number;
  novelty: number;
}

interface AgentSettings {
  enabled: boolean;
  crawlIntervalMinutes: number;
  maxArticlesPerCrawl: number;
  /** 0–1 decimal threshold (e.g. 0.5 = 50%) */
  relevanceThreshold: number;
  /** 0–1 decimal threshold for auto-generating content */
  autoGenerateAboveThreshold: number;
  defaultProvider: string;
  defaultModel?: string;
  defaultPolicyId?: number;
  defaultTemplateId?: number;
  notifyOnNewArticles: boolean;
}

// ============================================================
// AGENT SETTINGS
// ============================================================

async function getAgentSettings(): Promise<AgentSettings> {
  const db = await getDb();
  if (!db) return getDefaultSettings();
  const [row] = await db.select().from(settings).where(eq(settings.key, "ai_agent_settings"));
  if (!row?.value) return getDefaultSettings();
  const s = row.value as any;
  // Normalise thresholds: if stored as integer (0-100) convert to decimal (0-1)
  return {
    ...getDefaultSettings(),
    ...s,
    relevanceThreshold: normaliseThreshold(s.relevanceThreshold ?? 0.5),
    autoGenerateAboveThreshold: normaliseThreshold(s.autoGenerateAboveThreshold ?? 0.85),
  };
}

/** Accept both 0-1 and 0-100 threshold representations and return 0-1 */
export function normaliseThreshold(v: number): number {
  if (v > 1) return Math.min(v / 100, 1);
  return Math.min(Math.max(v, 0), 1);
}

function getDefaultSettings(): AgentSettings {
  return {
    enabled: true,
    crawlIntervalMinutes: 120,
    maxArticlesPerCrawl: 20,
    relevanceThreshold: 0.40,
    autoGenerateAboveThreshold: 0.80,
    defaultProvider: "builtin",
    defaultModel: undefined,
    defaultPolicyId: undefined,
    defaultTemplateId: undefined,
    notifyOnNewArticles: true,
  };
}

// ============================================================
// RSS CRAWLER
// ============================================================

async function crawlRSS(url: string): Promise<DiscoveredItem[]> {
  const items: DiscoveredItem[] = [];

  // Auto-detect common RSS feed paths if the URL looks like a homepage
  const feedUrl = await resolveRSSFeedUrl(url);

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": publication.bots.newsAgent,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} from ${feedUrl}`);
    const xml = await response.text();

    if (!xml.trim().startsWith("<") && !xml.includes("<?xml")) {
      throw new Error(`Response does not look like XML (got: ${xml.slice(0, 100)})`);
    }

    // Parse RSS <item> or Atom <entry> elements
    const itemMatches =
      xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ||
      xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ||
      [];

    for (const itemXml of itemMatches) {
      const title = extractXmlTag(itemXml, "title");
      const link =
        extractXmlTag(itemXml, "link") ||
        extractXmlAttr(itemXml, "link", "href");
      const description =
        extractXmlTag(itemXml, "description") ||
        extractXmlTag(itemXml, "summary") ||
        extractXmlTag(itemXml, "content:encoded") ||
        extractXmlTag(itemXml, "content");
      const pubDate =
        extractXmlTag(itemXml, "pubDate") ||
        extractXmlTag(itemXml, "published") ||
        extractXmlTag(itemXml, "updated") ||
        extractXmlTag(itemXml, "dc:date");
      const author =
        extractXmlTag(itemXml, "author") ||
        extractXmlTag(itemXml, "dc:creator");
      const imageUrl =
        extractXmlAttr(itemXml, "media:content", "url") ||
        extractXmlAttr(itemXml, "media:thumbnail", "url") ||
        extractXmlAttr(itemXml, "enclosure", "url") ||
        extractImageFromHtml(description || "");

      if (title && link) {
        items.push({
          title: decodeHtmlEntities(title),
          sourceUrl: link.trim(),
          summary: description
            ? stripHtml(decodeHtmlEntities(description)).slice(0, 1500)
            : undefined,
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          author: author ? decodeHtmlEntities(stripHtml(author)).slice(0, 200) : undefined,
          imageUrl,
        });
      }
    }

    if (items.length === 0) {
      console.warn(`[NewsAgent] RSS parsed 0 items from ${feedUrl} (${itemMatches.length} raw matches)`);
    }
  } catch (err: any) {
    console.error(`[NewsAgent] RSS crawl failed for ${feedUrl}:`, err.message);
    throw err;
  }

  return items;
}

/**
 * Resolve the actual RSS feed URL from a homepage URL.
 * Tries common feed paths if the URL doesn't already look like a feed.
 */
async function resolveRSSFeedUrl(url: string): Promise<string> {
  // Already looks like a feed URL
  if (/\/(feed|rss|atom|rss\.xml|feed\.xml|atom\.xml)(\/|$|\?)/i.test(url)) return url;
  if (url.endsWith(".xml") || url.endsWith(".rss")) return url;

  const base = url.replace(/\/$/, "");
  const candidates = [
    `${base}/feed/`,
    `${base}/feed`,
    `${base}/rss/`,
    `${base}/rss`,
    `${base}/atom.xml`,
    `${base}/rss.xml`,
    `${base}/feed.xml`,
    `${base}/?feed=rss2`,
  ];

  for (const candidate of candidates) {
    try {
      const resp = await fetch(candidate, {
        method: "HEAD",
        headers: { "User-Agent": publication.bots.newsAgent },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("xml") || ct.includes("rss") || ct.includes("atom")) {
          console.log(`[NewsAgent] Resolved feed URL: ${url} → ${candidate}`);
          return candidate;
        }
      }
    } catch { /* try next */ }
  }

  // Fall back to original URL and let the caller handle the error
  return url;
}

// ============================================================
// WEB SCRAPER
// ============================================================

async function crawlWebPage(url: string, selectors: any): Promise<DiscoveredItem[]> {
  const items: DiscoveredItem[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": publication.bots.newsAgent,
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const linkPattern = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set<string>();

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const linkText = stripHtml(match[2]).trim();

      if (linkText.length < 15 || linkText.length > 400) continue;
      if (seen.has(href)) continue;

      const isArticleUrl =
        /\/(article|post|news|story|blog|20\d{2})\//i.test(href) ||
        /\/\d{4}\/\d{2}\//i.test(href) ||
        /\.(html|htm|php)$/i.test(href);

      if (!isArticleUrl && !selectors?.includeAllLinks) continue;

      const absoluteUrl = href.startsWith("http") ? href : new URL(href, url).toString();
      seen.add(absoluteUrl);

      items.push({ title: linkText, sourceUrl: absoluteUrl });
    }

    if (selectors?.fetchContent && items.length > 0) {
      const limit = Math.min(items.length, selectors?.maxFetch || 5);
      for (let i = 0; i < limit; i++) {
        try {
          const articleResp = await fetch(items[i].sourceUrl, {
            headers: { "User-Agent": publication.bots.newsAgent },
            signal: AbortSignal.timeout(15000),
          });
          if (articleResp.ok) {
            const articleHtml = await articleResp.text();
            items[i].rawContent = extractArticleContent(articleHtml).slice(0, 5000);
          }
        } catch { /* skip */ }
      }
    }
  } catch (err: any) {
    console.error(`[NewsAgent] Web scrape failed for ${url}:`, err.message);
    throw err;
  }

  return items;
}

// ============================================================
// API CRAWLER
// ============================================================

async function crawlAPI(url: string, selectors: any): Promise<DiscoveredItem[]> {
  const items: DiscoveredItem[] = [];

  try {
    const headers: Record<string, string> = {
      "User-Agent": publication.bots.newsAgent,
      "Accept": "application/json",
    };
    if (selectors?.headers) Object.assign(headers, selectors.headers);

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    let articles = data;
    if (selectors?.dataPath) {
      for (const key of selectors.dataPath.split(".")) articles = articles?.[key];
    }
    if (!Array.isArray(articles)) {
      console.warn("[NewsAgent] API response is not an array at configured path");
      return items;
    }

    const titleField = selectors?.titleField || "title";
    const urlField = selectors?.urlField || "url";
    const summaryField = selectors?.summaryField || "summary";
    const contentField = selectors?.contentField || "content";
    const dateField = selectors?.dateField || "publishedAt";
    const authorField = selectors?.authorField || "author";

    for (const article of articles) {
      const title = article[titleField];
      const articleUrl = article[urlField];
      if (!title || !articleUrl) continue;
      items.push({
        title,
        sourceUrl: articleUrl,
        summary: article[summaryField] || undefined,
        rawContent: article[contentField] || undefined,
        publishedAt: article[dateField] ? new Date(article[dateField]) : undefined,
        author: article[authorField] || undefined,
        imageUrl: article.imageUrl || article.image || article.thumbnail || undefined,
      });
    }
  } catch (err: any) {
    console.error(`[NewsAgent] API crawl failed for ${url}:`, err.message);
    throw err;
  }

  return items;
}

/// ============================================================
// NEW SOURCE ADAPTERS (v2.0)
// ============================================================

/**
 * LinkedIn Company/Person feed adapter (stub)
 * Requires LinkedIn API credentials stored in source.scrapingConfig.credentials
 * Currently returns empty array — full implementation requires LinkedIn Partner API access.
 */
async function crawlLinkedIn(url: string, config: any): Promise<DiscoveredItem[]> {
  console.warn(`[NewsAgent] LinkedIn adapter: stub mode. Configure LinkedIn API credentials in source settings to enable. URL: ${url}`);
  // Full implementation:
  // 1. Use config.credentials.accessToken to call LinkedIn API
  // 2. GET /v2/shares?q=owners&owners=urn:li:organization:{orgId}&count=20
  // 3. Map response to DiscoveredItem[]
  // Requires: LinkedIn Partner API access (apply at developer.linkedin.com)
  return [];
}

/**
 * WhatsApp Business channel adapter (stub)
 * Monitors a WhatsApp channel for news tips and press releases.
 * Requires WhatsApp Business API credentials in source.scrapingConfig.credentials
 */
async function crawlWhatsApp(config: any): Promise<DiscoveredItem[]> {
  console.warn(`[NewsAgent] WhatsApp adapter: stub mode. Configure WhatsApp Business API credentials in source settings to enable.`);
  // Full implementation:
  // 1. Use config.credentials.phoneNumberId + accessToken
  // 2. GET /v17.0/{phone-number-id}/messages?status=received
  // 3. Filter messages with URLs or structured press release format
  // 4. Map to DiscoveredItem[]
  // Requires: Meta WhatsApp Business API access
  return [];
}

/**
 * X (Twitter) search/list adapter (stub)
 * Monitors X lists, hashtags, or accounts for MENA tech news.
 * Requires X API v2 Bearer Token in source.scrapingConfig.credentials
 */
async function crawlTwitter(query: string, config: any): Promise<DiscoveredItem[]> {
  console.warn(`[NewsAgent] X/Twitter adapter: stub mode. Configure X API Bearer Token in source settings to enable. Query: ${query}`);
  // Full implementation:
  // 1. Use config.credentials.bearerToken
  // 2. GET https://api.twitter.com/2/tweets/search/recent?query={query}&max_results=50
  // 3. Filter tweets with URLs, extract article metadata
  // 4. Map to DiscoveredItem[]
  // Requires: X API v2 Basic or Pro access (developer.twitter.com)
  return [];
}

/**
 * Email IMAP adapter (stub)
 * Monitors an email inbox (e.g. the media@ mailbox) for press releases and news tips.
 * Requires IMAP credentials in source.scrapingConfig.credentials
 */
async function crawlEmailIMAP(config: any): Promise<DiscoveredItem[]> {
  console.warn(`[NewsAgent] Email IMAP adapter: stub mode. Configure IMAP credentials in source settings to enable.`);
  // Full implementation:
  // 1. Connect to IMAP server using config.credentials.{host, port, user, password}
  // 2. Fetch unseen emails from inbox
  // 3. Parse subject + body for press release format
  // 4. Extract URLs, company names, funding amounts
  // 5. Map to DiscoveredItem[]
  // Requires: imap npm package + email account credentials
  return [];
}

// ============================================================
// MULTI-SIGNAL RELEVANCE SCORING
// ============================================================
// Industrial-economy keyword sets with weights (BrentDesk editorial focus)
const HIGH_VALUE_KEYWORDS = [
  "saudi arabia", "riyadh", "jeddah", "neom", "jubail", "yanbu", "dammam",
  "uae", "dubai", "abu dhabi", "qatar", "bahrain", "kuwait", "oman", "gcc",
  "mena", "middle east", "construction", "contract award", "epc", "tender",
  "infrastructure", "megaproject", "giga-project", "oil", "gas", "lng",
  "refinery", "petrochemical", "power plant", "renewable", "solar", "wind",
  "hydrogen", "desalination", "utility", "grid", "pipeline", "manufacturing",
  "factory", "industrial city", "localization", "mining", "metals", "steel",
  "aluminium", "cement", "logistics", "port", "airport", "rail", "metro",
  "road", "warehouse", "supply chain", "real estate development", "master plan",
  "data center", "smart city", "asset management", "facilities management",
  "heavy equipment", "machinery", "automation", "robotics", "industrial ai",
];

const MEDIUM_VALUE_KEYWORDS = [
  "investment", "investor", "project", "joint venture", "partnership",
  "acquisition", "merger", "contract", "award", "expansion", "capacity",
  "production", "commissioning", "feasibility", "engineering", "procurement",
  "maintenance", "operations", "energy", "industrial", "transport",
  "chairman", "ceo", "managing director", "appointment", "billion", "million",
  "sar", "aed", "capex", "financing", "project finance", "ipo",
];

const MENA_ENTITIES = [
  "saudi", "emirati", "qatari", "bahraini", "kuwaiti", "omani", "egyptian",
  "aramco", "sabic", "maaden", "neom", "red sea global", "roshn", "diriyah",
  "qiddiya", "pif", "acwa power", "sec", "swcc", "stc", "salik", "adnoc",
  "taqa", "masdar", "emaar", "aldar", "dp world", "ad ports", "qatarenergy",
  "kahramaa", "koc", "knpc", "pdo", "omran", "almarai", "agility", "aramex",
  "alstom", "siemens", "ge", "abb", "schneider", "bechtel", "jacobs", "aecom",
  "parsons", "worleyparsons", "technip", "saipem", "petrofac", "larsen",
  "hyundai e&c", "samsung c&t", "china state construction", "sinopec",
];

const CLICKBAIT_PATTERNS = [
  /^\d+ (ways|things|tips|tricks|reasons|facts|secrets)/i,
  /you won't believe/i,
  /shocking/i,
  /mind-blowing/i,
  /this one (trick|hack|tip)/i,
  /what happens next/i,
];

/**
 * Stage 1: Fast multi-signal keyword scoring (no LLM calls)
 */
export function scoreKeywordRelevance(item: DiscoveredItem): ScoreBreakdown {
  const titleLower = item.title.toLowerCase();
  const bodyLower = `${item.summary || ""} ${item.rawContent || ""}`.toLowerCase();
  const fullText = `${titleLower} ${bodyLower}`;

  // --- Signal 1: Keyword relevance ---
  let kwScore = 0;
  for (const kw of HIGH_VALUE_KEYWORDS) {
    const inTitle = titleLower.includes(kw);
    const inBody = bodyLower.includes(kw);
    if (inTitle) kwScore += 0.12;
    else if (inBody) kwScore += 0.04;
  }
  for (const kw of MEDIUM_VALUE_KEYWORDS) {
    const inTitle = titleLower.includes(kw);
    const inBody = bodyLower.includes(kw);
    if (inTitle) kwScore += 0.06;
    else if (inBody) kwScore += 0.02;
  }
  kwScore = Math.min(kwScore, 1);

  // --- Signal 2: LLM score (placeholder, filled in stage 2) ---
  const llm = 0;

  // --- Signal 3: Recency ---
  let recency = 0;
  if (item.publishedAt) {
    const hoursAgo = (Date.now() - item.publishedAt.getTime()) / 3_600_000;
    if (hoursAgo < 2) recency = 1.0;
    else if (hoursAgo < 6) recency = 0.8;
    else if (hoursAgo < 24) recency = 0.5;
    else if (hoursAgo < 72) recency = 0.2;
    else recency = 0;
  } else {
    recency = 0.3; // unknown date — neutral
  }

  // --- Signal 4: Title quality ---
  let titleQuality = 0.5;
  const wordCount = item.title.split(/\s+/).length;
  if (wordCount >= 6 && wordCount <= 20) titleQuality += 0.3;
  if (wordCount < 4 || wordCount > 25) titleQuality -= 0.2;
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(item.title)) { titleQuality -= 0.4; break; }
  }
  titleQuality = Math.max(0, Math.min(1, titleQuality));

  // --- Signal 5: Content depth ---
  const bodyLen = (item.summary?.length || 0) + (item.rawContent?.length || 0);
  let contentDepth = 0;
  if (bodyLen > 2000) contentDepth = 1.0;
  else if (bodyLen > 800) contentDepth = 0.7;
  else if (bodyLen > 200) contentDepth = 0.4;
  else if (bodyLen > 50) contentDepth = 0.2;
  else contentDepth = 0.1;

  // --- Signal 6: MENA entity signal ---
  let entitySignal = 0;
  let entityMatches = 0;
  for (const entity of MENA_ENTITIES) {
    if (fullText.includes(entity.toLowerCase())) entityMatches++;
  }
  entitySignal = Math.min(entityMatches * 0.25, 1);

  // --- Signal 7: Novelty (placeholder, filled during crawl with DB check) ---
  const novelty = 1.0;

  return { keyword: kwScore, llm, recency, titleQuality, contentDepth, entitySignal, novelty };
}

/**
 * Blend all signals into a final 0–1 score
 */
export function blendScores(breakdown: ScoreBreakdown): number {
  const {
    keyword, llm, recency, titleQuality, contentDepth, entitySignal, novelty,
  } = breakdown;

  // Weights (must sum to 1.0)
  // LLM gets the highest weight as it provides MENA-aware semantic scoring
  const WEIGHTS = {
    keyword: 0.20,
    llm: 0.40,
    recency: 0.15,
    titleQuality: 0.08,
    contentDepth: 0.07,
    entitySignal: 0.07,
    novelty: 0.03,
  };

  // When LLM score is 0 (not yet computed), redistribute its weight to keyword
  const llmWeight = llm > 0 ? WEIGHTS.llm : 0;
  const kwWeight = llm > 0 ? WEIGHTS.keyword : WEIGHTS.keyword + WEIGHTS.llm;

  const score =
    keyword * kwWeight +
    llm * llmWeight +
    recency * WEIGHTS.recency +
    titleQuality * WEIGHTS.titleQuality +
    contentDepth * WEIGHTS.contentDepth +
    entitySignal * WEIGHTS.entitySignal +
    novelty * WEIGHTS.novelty;

  return Math.min(Math.max(score, 0), 1);
}

/**
 * Stage 1: Score all items with keyword signals (fast, no LLM)
 */
async function scoreAllItems(
  items: DiscoveredItem[],
  customKeywords: string[] | null,
  recentTitles: Set<string>
): Promise<ScoredItem[]> {
  return items.map(item => {
    const breakdown = scoreKeywordRelevance(item);

    // Inject custom keywords on top
    if (customKeywords && customKeywords.length > 0) {
      const titleLower = item.title.toLowerCase();
      const bodyLower = (item.summary || "").toLowerCase();
      for (const kw of customKeywords) {
        if (titleLower.includes(kw.toLowerCase())) breakdown.keyword = Math.min(breakdown.keyword + 0.15, 1);
        else if (bodyLower.includes(kw.toLowerCase())) breakdown.keyword = Math.min(breakdown.keyword + 0.05, 1);
      }
    }

    // Novelty: penalise if a very similar title was published recently
    const titleWords = item.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    let noveltyPenalty = 0;
    for (const recent of Array.from(recentTitles)) {
      const recentWords = recent.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
      const overlap = titleWords.filter((w: string) => recentWords.includes(w)).length;
      const similarity = overlap / Math.max(titleWords.length, 1);
      if (similarity > 0.6) { noveltyPenalty = 0.5; break; }
      if (similarity > 0.4) { noveltyPenalty = Math.max(noveltyPenalty, 0.25); }
    }
    breakdown.novelty = Math.max(0, 1 - noveltyPenalty);

    const relevanceScore = blendScores(breakdown);
    return { ...item, relevanceScore, scoreBreakdown: breakdown };
  });
}

/**
 * Stage 2: LLM re-scoring for top candidates (expensive, called selectively)
 */
async function llmReScoreTopCandidates(
  items: ScoredItem[],
  provider: LLMProvider = "builtin"
): Promise<ScoredItem[]> {
  // Send top 25 items (sorted by keyword score) to the LLM for semantic scoring
  // Lower filter: any article with keyword score >= 0.02 (i.e. at least 1 medium keyword hit)
  const candidates = items
    .filter(i => i.scoreBreakdown.keyword >= 0.02)
    .slice(0, 25);

  if (candidates.length === 0) return items;

  try {
    const articleList = candidates.map((item, i) =>
      `${i + 1}. TITLE: "${item.title}"\n   SUMMARY: ${item.summary?.slice(0, 250) || "N/A"}`
    ).join("\n\n");

    const response = await invokeLLMProvider({
      messages: [
        {
          role: "system",
          content: `You are the senior editor of ${publication.name}. ${EDITORIAL_IDENTITY}\n\n${SCORING_RUBRIC}\n\nScore each article 0.0–1.0 for editorial relevance (divide the 0-100 rubric score by 100). Be strict: generic global tech/startup news with no industrial angle scores < 0.3. Strong Saudi/GCC industrial, construction, energy or infrastructure news scores > 0.8.\n\nReturn ONLY a JSON array: [{"index": 1, "score": 0.85, "reason": "Saudi EPC contract award"}, ...]`,
        },
        {
          role: "user",
          content: `Score these ${candidates.length} articles for ${publication.name} editorial relevance:\n\n${articleList}`,
        },
      ],
      provider,
      operation: "relevance_scoring",
      maxTokens: 800,
    });

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scores: Array<{ index: number; score: number; reason?: string }> = JSON.parse(jsonMatch[0]);
      for (const s of scores) {
        const idx = s.index - 1;
        if (idx >= 0 && idx < candidates.length && typeof s.score === "number") {
          const llmScore = Math.min(Math.max(s.score, 0), 1);
          candidates[idx].scoreBreakdown.llm = llmScore;
          // Re-blend with LLM score now available
          candidates[idx].relevanceScore = blendScores(candidates[idx].scoreBreakdown);
        }
      }
    }
  } catch (err: any) {
    console.warn("[NewsAgent] LLM re-scoring failed, using keyword scores:", err.message);
  }

  // Merge back
  const candidateUrls = new Set(candidates.map(c => c.sourceUrl));
  const nonCandidates = items.filter(i => !candidateUrls.has(i.sourceUrl));
  return [...candidates, ...nonCandidates].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

async function filterDuplicates(
  items: DiscoveredItem[],
  sourceId: number
): Promise<{ newItems: DiscoveredItem[]; duplicateCount: number }> {
  const db = await getDb();
  if (!db) return { newItems: items, duplicateCount: 0 };

  const existing = await db
    .select({ externalUrl: aiAgentDiscoveredArticles.externalUrl })
    .from(aiAgentDiscoveredArticles)
    .where(eq(aiAgentDiscoveredArticles.sourceId, sourceId));

  const existingUrls = new Set(existing.map(e => normalizeUrl(e.externalUrl)));
  const newItems = items.filter(item => !existingUrls.has(normalizeUrl(item.sourceUrl)));
  return { newItems, duplicateCount: items.length - newItems.length };
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "source", "fbclid", "gclid"].forEach(p => u.searchParams.delete(p));
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}

/**
 * Get recent article titles from the last 7 days for novelty scoring
 */
async function getRecentTitles(): Promise<Set<string>> {
  try {
    const db = await getDb();
    if (!db) return new Set();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString().slice(0, 19).replace("T", " ");
    const recent = await db
      .select({ title: articlesTable.title })
      .from(articlesTable)
      .where(gte(articlesTable.createdAt, sevenDaysAgo))
      .limit(500);
    return new Set(recent.map(r => r.title));
  } catch {
    return new Set();
  }
}

// ============================================================
// MAIN CRAWL FUNCTIONS
// ============================================================

/**
 * Crawl a single source — full pipeline
 */
export async function crawlSource(sourceId: number): Promise<CrawlResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [source] = await db.select().from(aiAgentSources).where(eq(aiAgentSources.id, sourceId));
  if (!source) throw new Error(`Source ${sourceId} not found`);

  const startTime = Date.now();
  const errors: string[] = [];
  let articlesFound = 0;
  let articlesNew = 0;
  let articlesDuplicate = 0;
  let articlesAboveThreshold = 0;

  // Create crawl log entry
  const [crawlLogResult] = await db.insert(aiAgentCrawlLog).values({
    sourceId: source.id,
    status: "running",
  } as any);
  const crawlLogId = (crawlLogResult as any).insertId;

  console.log(`[NewsAgent] Starting crawl for source ${source.id} (${source.name})`);

  try {
    // ── Step 1: Fetch raw items ──────────────────────────────
    let rawItems: DiscoveredItem[] = [];
    const sourceType = (source.feedType || "rss") as string;
    const selectors = source.scrapingConfig as any;
    const feedUrl = source.feedUrl || source.url;

    switch (sourceType) {
      case "rss":
      case "atom":
        rawItems = await crawlRSS(feedUrl);
        break;
      case "scrape":
      case "web":
      case "web_scrape":
        rawItems = await crawlWebPage(source.url, selectors);
        break;
      case "api":
        rawItems = await crawlAPI(source.url, selectors);
        break;
      case "linkedin":
        rawItems = await crawlLinkedIn(source.url, selectors);
        break;
      case "whatsapp":
        rawItems = await crawlWhatsApp(selectors);
        break;
      case "twitter":
      case "x":
        rawItems = await crawlTwitter(source.url, selectors);
        break;
      case "email":
      case "imap":
        rawItems = await crawlEmailIMAP(selectors);
        break;
      default:
        // Try RSS as fallback for unknown types
        console.warn(`[NewsAgent] Unknown source type "${sourceType}", attempting RSS`);
        rawItems = await crawlRSS(feedUrl);
    }

    articlesFound = rawItems.length;
    console.log(`[NewsAgent] ${source.name}: fetched ${articlesFound} raw items`);

    // ── Step 2: Deduplicate ──────────────────────────────────
    const { newItems, duplicateCount } = await filterDuplicates(rawItems, source.id);
    articlesDuplicate = duplicateCount;
    console.log(`[NewsAgent] ${source.name}: ${newItems.length} new, ${duplicateCount} duplicates`);

    if (newItems.length === 0) {
      await finaliseLog(db, crawlLogId, "completed", Date.now() - startTime, articlesFound, 0, articlesDuplicate, 0, null);
      await db.update(aiAgentSources).set({
        lastCrawledAt: toDbDate(new Date()),
        lastSuccessAt: toDbDate(new Date()),
      } as any).where(eq(aiAgentSources.id, source.id));
      return { sourceId: source.id, sourceName: source.name, articlesFound, articlesNew: 0, articlesDuplicate, articlesAboveThreshold: 0, errors, durationMs: Date.now() - startTime };
    }

    // ── Step 3: Get agent settings ────────────────────────────────────
    const agentSettings = await getAgentSettings();
    // Use per-source threshold if set, otherwise fall back to global agent settings threshold
    const sourceThreshold = source.relevanceThreshold != null
      ? normaliseThreshold(source.relevanceThreshold)
      : null;
    const threshold = sourceThreshold ?? agentSettings.relevanceThreshold; // 0–1

    // ── Step 4: v2.0 Three-stage scoring engine ──────────────
    const articleInputs = newItems.map((item, idx) => ({
      id: idx + 1, // temp ID for batch scoring
      title: item.title,
      excerpt: item.summary || item.rawContent?.slice(0, 500) || "",
      sourceId: source.id,
      sourceName: source.name,
      externalUrl: item.sourceUrl,
      externalPublishedAt: item.publishedAt || null,
    }));

    const editorialBrief = (source as any).editorialBrief as string | null || null;
    const maxAgeHours = (source as any).maxAgeHours as number | null || null;

    let scoringResults: Map<number, import("./scoringEngine.service").ScoringResult>;
    try {
      scoringResults = await batchScoreArticles(articleInputs, {
        editorialBrief,
        sourceMaxAgeHours: maxAgeHours,
        maxLLMBatch: 30,
      });
      console.log(`[NewsAgent] ${source.name}: v2.0 three-stage scoring completed`);
    } catch (err: any) {
      console.warn(`[NewsAgent] ${source.name}: v2.0 scoring failed, falling back to legacy:`, err.message);
      errors.push(`v2.0 scoring failed: ${err.message}`);
      // Fallback: use legacy scoring
      const customKeywords = (selectors?.relevanceKeywords as string[] | null) || null;
      const recentTitles = await getRecentTitles();
      const legacyScored = await scoreAllItems(newItems, customKeywords, recentTitles);
      scoringResults = new Map(legacyScored.map((item, idx) => [idx + 1, {
        stage1Score: Math.round(item.scoreBreakdown.keyword * 100),
        stage2Score: Math.round(item.scoreBreakdown.llm * 100),
        stage3Adjustment: 0,
        finalScore: Math.round(item.relevanceScore * 100),
        editorialTier: null, category: null, menaEntities: [], fundingSignal: null,
        llmReasoning: null, suggestedAngle: null, contentLanguage: "en", llmProvider: null,
      }]));
    }

    // ── Step 5: Apply threshold filter ──────────────────────
    const scoredPairs = articleInputs.map(a => ({
      item: newItems[a.id - 1],
      scoring: scoringResults.get(a.id)!,
    }));

    const aboveThreshold = scoredPairs.filter(p => (p.scoring.finalScore / 100) >= threshold);
    const belowThreshold = scoredPairs.filter(p => (p.scoring.finalScore / 100) < threshold);
    articlesAboveThreshold = aboveThreshold.length;
    console.log(`[NewsAgent] ${source.name}: ${articlesAboveThreshold}/${scoredPairs.length} above threshold (${(threshold * 100).toFixed(0)}%)`);

    // Store up to maxArticlesPerCrawl items (all above threshold + best below)
    const maxArticles = agentSettings.maxArticlesPerCrawl;
    const toStore = [
      ...aboveThreshold,
      ...belowThreshold.sort((a, b) => b.scoring.finalScore - a.scoring.finalScore),
    ].slice(0, maxArticles);

    articlesNew = toStore.length;

    // ── Step 6: Persist discovered articles ─────────────────
    for (const { item, scoring } of toStore) {
      try {
        const insertValues: any = {
          sourceId: source.id,
          crawlLogId: crawlLogId || null,
          externalTitle: item.title.slice(0, 500),
          externalUrl: item.sourceUrl,
          externalExcerpt: item.summary?.slice(0, 2000) || null,
          externalContent: item.rawContent?.slice(0, 10000) || null,
          relevanceScore: scoring.finalScore, // already 0-100
          stage1Score: scoring.stage1Score,
          stage2Score: scoring.stage2Score,
          stage3Adjustment: scoring.stage3Adjustment,
          editorialTier: scoring.editorialTier,
          category: scoring.category,
          menaEntities: scoring.menaEntities.length > 0 ? JSON.stringify(scoring.menaEntities) : null,
          llmReasoning: scoring.llmReasoning,
          suggestedAngle: scoring.suggestedAngle,
          contentLanguage: scoring.contentLanguage || "en",
          llmConfidence: scoring.stage2Score > 0 ? scoring.stage2Score : null,
          status: (scoring.finalScore / 100) >= agentSettings.autoGenerateAboveThreshold ? "approved" : "discovered",
        };
        if (item.publishedAt && !isNaN(item.publishedAt.getTime())) {
          insertValues.externalPublishedAt = toDbDate(item.publishedAt);
        }
        if (item.author) insertValues.externalAuthor = item.author.slice(0, 255);
        if (item.imageUrl) insertValues.externalImageUrl = item.imageUrl.slice(0, 2000);
        await db.insert(aiAgentDiscoveredArticles).values(insertValues as any);
      } catch (err: any) {
        if (!err.message?.includes("Duplicate") && !err.message?.includes("duplicate")) {
          errors.push(`Store error for "${item.title.slice(0, 50)}": ${err.message}`);
        }
      }
    }

    // ── Step 8: Update source stats ─────────────────────────
    await db.update(aiAgentSources).set({
      lastCrawledAt: toDbDate(new Date()),
      lastSuccessAt: toDbDate(new Date()),
      consecutiveFailures: 0,
      totalArticlesFound: sql`${aiAgentSources.totalArticlesFound} + ${articlesNew}`,
    } as any).where(eq(aiAgentSources.id, source.id));

    // ── Step 9: Owner notification ───────────────────────────
    if (agentSettings.notifyOnNewArticles && articlesAboveThreshold > 0) {
      try {
        const { notifyOwner } = await import("../../_core/notification");
        const topItem = aboveThreshold[0];
        await notifyOwner({
          title: `News Agent: ${articlesAboveThreshold} relevant articles from ${source.name}`,
          content: `Found ${articlesFound} articles (${articlesAboveThreshold} above ${(threshold * 100).toFixed(0)}% threshold). Top: "${topItem?.item?.title}" (${((topItem?.scoring?.finalScore ?? 0) / 100 * 100).toFixed(0)}% relevant)`,
        });
      } catch { /* non-critical */ }
    }

    // ── Step 10: Auto-generate for high-relevance articles ───
    if (agentSettings.enabled) {
      const autoGenerate = aboveThreshold.filter(
        i => (i.scoring.finalScore / 100) >= agentSettings.autoGenerateAboveThreshold
      ).slice(0, 3);

      for (const item of autoGenerate) {
        try {
          const [discovered] = await db.select().from(aiAgentDiscoveredArticles)
            .where(and(
              eq(aiAgentDiscoveredArticles.sourceId, source.id),
              eq(aiAgentDiscoveredArticles.externalUrl, item.item.sourceUrl),
            ));

          if (discovered?.status === "approved") {
            await db.update(aiAgentDiscoveredArticles).set({ status: "generating" } as any)
              .where(eq(aiAgentDiscoveredArticles.id, discovered.id));

            const { generateContent } = await import("./contentGenerator.service");
            const result = await generateContent({
              contentType: "article",
              sessionType: "agent",
              title: item.item.title,
              url: item.item.sourceUrl,
              rawText: item.item.rawContent || undefined,
              additionalContext: item.item.summary || undefined,
              provider: agentSettings.defaultProvider as any,
              model: agentSettings.defaultModel,
              policyId: agentSettings.defaultPolicyId,
              templateId: agentSettings.defaultTemplateId,
              agentSourceId: source.id,
            });

            await db.update(aiAgentDiscoveredArticles).set({
              status: "generated",
              generationSessionId: result.sessionId,
            } as any).where(eq(aiAgentDiscoveredArticles.id, discovered.id));
          }
        } catch (err: any) {
          errors.push(`Auto-generate error for "${item.item.title.slice(0, 50)}": ${err.message}`);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    await finaliseLog(db, crawlLogId, "completed", durationMs, articlesFound, articlesNew, articlesDuplicate, articlesAboveThreshold, errors.length > 0 ? errors.join("; ") : null);

    console.log(`[NewsAgent] ${source.name}: crawl complete in ${durationMs}ms — ${articlesNew} stored, ${articlesAboveThreshold} above threshold`);

    return { sourceId: source.id, sourceName: source.name, articlesFound, articlesNew, articlesDuplicate, articlesAboveThreshold, errors, durationMs };

  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    errors.push(err.message);
    console.error(`[NewsAgent] ${source.name}: crawl FAILED — ${err.message}`);

    await finaliseLog(db, crawlLogId, "failed", durationMs, articlesFound, 0, articlesDuplicate, 0, errors.join("; "));
    await db.update(aiAgentSources).set({
      lastCrawledAt: toDbDate(new Date()),
      consecutiveFailures: sql`${aiAgentSources.consecutiveFailures} + 1`,
    } as any).where(eq(aiAgentSources.id, source.id));

    return { sourceId: source.id, sourceName: source.name, articlesFound, articlesNew: 0, articlesDuplicate, articlesAboveThreshold: 0, errors, durationMs };
  }
}

async function finaliseLog(
  db: any,
  crawlLogId: number | undefined,
  status: string,
  durationMs: number,
  articlesFound: number,
  articlesNew: number,
  articlesDuplicate: number,
  articlesRelevant: number,
  errorMessage: string | null,
) {
  if (!crawlLogId) return;
  try {
    await db.update(aiAgentCrawlLog).set({
      status,
      durationMs,
      articlesFound,
      articlesNew,
      articlesDuplicate,
      articlesRelevant,
      errorMessage,
    } as any).where(eq(aiAgentCrawlLog.id, crawlLogId));
  } catch { /* non-critical */ }
}

/**
 * Crawl all active sources that are due for a crawl
 */
export async function crawlAllSources(): Promise<CrawlResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sources = await db.select().from(aiAgentSources)
    .where(eq(aiAgentSources.isActive, 1))
    .orderBy(aiAgentSources.priority);

  const results: CrawlResult[] = [];

  for (const source of sources) {
    if (source.lastCrawledAt) {
      const minutesSince = (Date.now() - new Date(source.lastCrawledAt).getTime()) / 60_000;
      if (minutesSince < (source.crawlIntervalMinutes || 120)) continue;
    }

    // Back-off: skip sources with 5+ consecutive failures
    if ((source.consecutiveFailures || 0) >= 5) {
      const hoursSince = source.lastCrawledAt
        ? (Date.now() - new Date(source.lastCrawledAt).getTime()) / 3_600_000
        : 999;
      if (hoursSince < 24) {
        console.log(`[NewsAgent] Skipping ${source.name} — ${source.consecutiveFailures} consecutive failures, backing off`);
        continue;
      }
    }

    try {
      const result = await crawlSource(source.id);
      results.push(result);
    } catch (err: any) {
      results.push({ sourceId: source.id, sourceName: source.name, articlesFound: 0, articlesNew: 0, articlesDuplicate: 0, articlesAboveThreshold: 0, errors: [err.message], durationMs: 0 });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================================
// SCHEDULER
// ============================================================

let crawlInterval: ReturnType<typeof setInterval> | null = null;

export async function startAgentScheduler(): Promise<void> {
  const agentSettings = await getAgentSettings();
  if (!agentSettings.enabled) {
    console.log("[NewsAgent] Agent disabled, scheduler not started");
    return;
  }

  const intervalMs = agentSettings.crawlIntervalMinutes * 60_000;
  console.log(`[NewsAgent] Scheduler started — crawling every ${agentSettings.crawlIntervalMinutes}min`);

  setTimeout(async () => {
    try {
      const results = await crawlAllSources();
      const totalNew = results.reduce((s, r) => s + r.articlesNew, 0);
      console.log(`[NewsAgent] Initial crawl: ${totalNew} new articles from ${results.length} sources`);
    } catch (err: any) {
      console.error("[NewsAgent] Initial crawl failed:", err.message);
    }
  }, 30_000);

  crawlInterval = setInterval(async () => {
    try {
      const results = await crawlAllSources();
      const totalNew = results.reduce((s, r) => s + r.articlesNew, 0);
      console.log(`[NewsAgent] Scheduled crawl: ${totalNew} new articles from ${results.length} sources`);
    } catch (err: any) {
      console.error("[NewsAgent] Scheduled crawl failed:", err.message);
    }
  }, intervalMs);
}

export function stopAgentScheduler(): void {
  if (crawlInterval) {
    clearInterval(crawlInterval);
    crawlInterval = null;
    console.log("[NewsAgent] Scheduler stopped");
  }
}

// ============================================================
// DATE HELPERS
// ============================================================

// ============================================================
// XML/HTML HELPERS
// ============================================================

function extractXmlTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

function extractXmlAttr(xml: string, tag: string, attr: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i");
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
}

function extractImageFromHtml(html: string): string | undefined {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : undefined;
}

function extractArticleContent(html: string): string {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = html.match(/<div[^>]*class="[^"]*(?:content|article|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const rawContent = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || "";
  return stripHtml(rawContent);
}
