/**
 * News Agent v2.0 — Three-Stage Scoring Engine
 *
 * Stage 1: DB-driven keyword scoring (MENA entities, geography, funding signals)
 * Stage 2: LLM semantic scoring with structured JSON response
 * Stage 3: Editorial pattern adjustment (self-learning from feedback)
 */

import { publication } from "../../../shared/publication";
import { EDITORIAL_IDENTITY, SCORING_RUBRIC } from "../../config/editorial";
import { getDb } from "../../db";
import { invokeLLM } from "../../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleInput {
  id: number;
  title: string;
  excerpt: string;
  sourceId: number;
  sourceName: string;
  externalUrl: string;
  externalPublishedAt?: Date | null;
}

export interface ScoringResult {
  stage1Score: number;         // 0-100: keyword/entity match score
  stage2Score: number;         // 0-100: LLM semantic relevance
  stage3Adjustment: number;    // -20 to +20: editorial pattern adjustment
  finalScore: number;          // 0-100: blended final score
  editorialTier: number | null; // 1, 2, or 3
  category: string | null;
  menaEntities: string[];
  fundingSignal: Record<string, unknown> | null;
  llmReasoning: string | null;
  suggestedAngle: string | null;
  contentLanguage: string;
  llmProvider: string | null;
}

// ─── Keyword Cache (refreshed every 5 min) ───────────────────────────────────

let keywordCache: Array<{ keyword: string; weight: number; keyword_type: string; language: string }> = [];
let entityCache: Array<{ name: string; aliases: string[]; tier: number; type: string; country: string }> = [];
let taxonomyCache: Array<{ id: number; tier: number; name: string; signal_keywords_en: string[]; signal_keywords_ar: string[] }> = [];
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadCache() {
  const now = Date.now();
  if (now - cacheLoadedAt < CACHE_TTL_MS) return;

  try {
    const db = await getDb();
    if (!db) return;

    const [keywords] = await db.execute(
      "SELECT keyword, weight, keyword_type, language FROM ai_agent_keywords WHERE is_active = 1"
    ) as unknown as [Array<{ keyword: string; weight: number; keyword_type: string; language: string }>, unknown];
    keywordCache = keywords;

    const [entities] = await db.execute(
      "SELECT name, aliases, tier, type, country FROM ai_agent_entities WHERE is_active = 1"
    ) as unknown as [Array<{ name: string; aliases: string; tier: number; type: string; country: string }>, unknown];
    entityCache = entities.map(e => ({
      ...e,
      aliases: (() => {
        try { return JSON.parse(e.aliases || "[]"); } catch { return []; }
      })(),
    }));

    const [taxonomy] = await db.execute(
      "SELECT id, tier, name, signal_keywords_en, signal_keywords_ar FROM ai_agent_taxonomy WHERE is_active = 1 ORDER BY sort_order"
    ) as unknown as [Array<{ id: number; tier: number; name: string; signal_keywords_en: string; signal_keywords_ar: string }>, unknown];
    taxonomyCache = taxonomy.map(t => ({
      ...t,
      signal_keywords_en: (() => { try { return JSON.parse(t.signal_keywords_en || "[]"); } catch { return []; } })(),
      signal_keywords_ar: (() => { try { return JSON.parse(t.signal_keywords_ar || "[]"); } catch { return []; } })(),
    }));

    cacheLoadedAt = now;
  } catch (err) {
    console.error("[ScoringEngine] Cache load error:", err);
  }
}

// ─── Stage 1: Keyword & Entity Scoring ───────────────────────────────────────

export async function stage1KeywordScore(article: ArticleInput): Promise<{
  score: number;
  matchedEntities: string[];
  fundingSignal: Record<string, unknown> | null;
  detectedLanguage: string;
}> {
  await loadCache();

  const text = `${article.title} ${article.excerpt}`.toLowerCase();
  const textOriginal = `${article.title} ${article.excerpt}`;

  let totalWeight = 0;
  let maxPossibleWeight = 0;
  const matchedEntities: string[] = [];
  const fundingSignal: Record<string, unknown> = {};
  let detectedLanguage = "en";

  // Arabic detection
  const arabicPattern = /[\u0600-\u06FF]/;
  if (arabicPattern.test(textOriginal)) {
    detectedLanguage = "ar";
  }

  // Entity matching (higher priority)
  for (const entity of entityCache) {
    const allNames = [entity.name, ...entity.aliases].map(n => n.toLowerCase());
    const matched = allNames.some(n => n.length > 2 && text.includes(n));
    if (matched) {
      const entityWeight = entity.tier === 1 ? 5 : entity.tier === 2 ? 3 : 2;
      totalWeight += entityWeight;
      matchedEntities.push(entity.name);
    }
  }
  maxPossibleWeight += 20; // cap entity contribution

  // Keyword matching
  for (const kw of keywordCache) {
    if (kw.weight <= 0) continue; // suppress keywords handled separately
    const kwLower = kw.keyword.toLowerCase();
    if (text.includes(kwLower)) {
      totalWeight += kw.weight;
      if (kw.keyword_type === "funding_signal") {
        fundingSignal[kw.keyword] = true;
      }
    }
    maxPossibleWeight += kw.weight;
  }

  // Suppress keywords
  for (const kw of keywordCache) {
    if (kw.weight < 0) {
      const kwLower = kw.keyword.toLowerCase();
      if (text.includes(kwLower)) {
        totalWeight += kw.weight; // negative
      }
    }
  }

  // Normalize to 0-100
  const rawScore = maxPossibleWeight > 0 ? (totalWeight / Math.min(maxPossibleWeight, 50)) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    matchedEntities: Array.from(new Set(matchedEntities)),
    fundingSignal: Object.keys(fundingSignal).length > 0 ? fundingSignal : null,
    detectedLanguage,
  };
}

// ─── Stage 2: LLM Semantic Scoring ───────────────────────────────────────────

export async function stage2LLMScore(
  article: ArticleInput,
  stage1Result: { matchedEntities: string[]; detectedLanguage: string },
  editorialBrief?: string | null
): Promise<{
  score: number;
  editorialTier: number | null;
  category: string | null;
  reasoning: string | null;
  suggestedAngle: string | null;
  provider: string | null;
}> {
  await loadCache();

  const taxonomyList = taxonomyCache
    .map(t => `  Tier ${t.tier}: ${t.name}`)
    .join("\n");

  const systemPrompt = `You are an expert editorial AI for ${publication.name}. ${EDITORIAL_IDENTITY}

Your task is to evaluate whether a news article is relevant and valuable for ${publication.name}'s editorial mission.

EDITORIAL TAXONOMY:
${taxonomyList}

SCORING CRITERIA:
${SCORING_RUBRIC}

${editorialBrief ? `SOURCE EDITORIAL BRIEF:\n${editorialBrief}\n` : ""}

Respond ONLY with valid JSON matching this exact schema:
{
  "score": <integer 0-100>,
  "tier": <1, 2, 3, or null>,
  "category": <string matching taxonomy name, or null>,
  "reasoning": <string, max 100 words explaining the score>,
  "suggested_angle": <string, max 50 words — how ${publication.name} should cover this if relevant, or null>,
  "mena_entities_detected": <array of regional company/person/place names found in the article>
}`;

  const userPrompt = `Evaluate this article for ${publication.name}:

TITLE: ${article.title}
EXCERPT: ${article.excerpt}
SOURCE: ${article.sourceName}
${stage1Result.matchedEntities.length > 0 ? `DETECTED MENA ENTITIES: ${stage1Result.matchedEntities.join(", ")}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article_relevance_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "integer", description: "Relevance score 0-100" },
              tier: { type: ["integer", "null"], description: "Editorial tier 1, 2, 3, or null" },
              category: { type: ["string", "null"], description: "Taxonomy category name" },
              reasoning: { type: "string", description: "Brief reasoning for the score" },
              suggested_angle: { type: ["string", "null"], description: "How the publication should cover this" },
              mena_entities_detected: { type: "array", items: { type: "string" }, description: "MENA entities found" },
            },
            required: ["score", "tier", "category", "reasoning", "suggested_angle", "mena_entities_detected"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      editorialTier: parsed.tier || null,
      category: parsed.category || null,
      reasoning: parsed.reasoning || null,
      suggestedAngle: parsed.suggested_angle || null,
      provider: "built-in",
    };
  } catch (err) {
    console.error("[ScoringEngine] LLM scoring error:", err);
    return { score: 0, editorialTier: null, category: null, reasoning: null, suggestedAngle: null, provider: null };
  }
}

// ─── Stage 3: Editorial Pattern Adjustment ───────────────────────────────────

export async function stage3EditorialAdjustment(
  article: ArticleInput,
  stage1Score: number,
  stage2Score: number
): Promise<number> {
  try {
    // Query recent feedback for similar articles from the same source
    const db = await getDb();
    if (!db) return 0;
    const [rows] = await (db.execute as any)(
      `SELECT action, relevance_score
       FROM ai_agent_editorial_feedback
       WHERE source_id = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY created_at DESC
       LIMIT 50`,
      [article.sourceId]
    ) as unknown as [Array<{ action: string; relevance_score: number }>, unknown];

    if (rows.length < 5) return 0; // Not enough data

    const accepted = rows.filter(r => r.action === "published" || r.action === "published_edited");
    const rejected = rows.filter(r => r.action === "rejected" || r.action === "dismissed");

    const acceptanceRate = accepted.length / rows.length;
    const avgAcceptedScore = accepted.length > 0
      ? accepted.reduce((s, r) => s + (r.relevance_score || 0), 0) / accepted.length
      : 50;

    // If source has high acceptance rate, boost articles from it
    if (acceptanceRate > 0.6) return +5;
    // If source has low acceptance rate, penalize
    if (acceptanceRate < 0.2) return -10;
    // If article score is above the avg accepted score for this source, small boost
    const blendedScore = (stage1Score * 0.3 + stage2Score * 0.7);
    if (blendedScore > avgAcceptedScore + 10) return +5;
    if (blendedScore < avgAcceptedScore - 20) return -5;

    return 0;
  } catch {
    return 0;
  }
}

// ─── Blend Scores ─────────────────────────────────────────────────────────────

export function blendScores(
  stage1: number,
  stage2: number,
  stage3Adjustment: number,
  hasLLM: boolean
): number {
  let blended: number;
  if (hasLLM && stage2 > 0) {
    // LLM available: LLM dominates
    blended = stage1 * 0.20 + stage2 * 0.65 + 15; // recency bonus of 15 built in
  } else {
    // No LLM: keyword only
    blended = stage1 * 0.85 + 15;
  }
  return Math.max(0, Math.min(100, Math.round(blended + stage3Adjustment)));
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function scoreArticle(
  article: ArticleInput,
  options: {
    runLLM?: boolean;
    editorialBrief?: string | null;
    sourceMaxAgeHours?: number | null;
  } = {}
): Promise<ScoringResult> {
  const { runLLM = true, editorialBrief, sourceMaxAgeHours } = options;

  // Age filter: if article is too old, return 0
  if (sourceMaxAgeHours && article.externalPublishedAt) {
    const ageHours = (Date.now() - new Date(article.externalPublishedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > sourceMaxAgeHours) {
      return {
        stage1Score: 0, stage2Score: 0, stage3Adjustment: 0, finalScore: 0,
        editorialTier: null, category: "Too Old", menaEntities: [],
        fundingSignal: null, llmReasoning: `Article is ${Math.round(ageHours)}h old (max: ${sourceMaxAgeHours}h)`,
        suggestedAngle: null, contentLanguage: "en", llmProvider: null,
      };
    }
  }

  // Stage 1
  const s1 = await stage1KeywordScore(article);

  // Stage 2 (LLM)
  let s2 = { score: 0, editorialTier: null as number | null, category: null as string | null, reasoning: null as string | null, suggestedAngle: null as string | null, provider: null as string | null };
  if (runLLM) {
    s2 = await stage2LLMScore(article, s1, editorialBrief);
  }

  // Stage 3
  const s3Adjustment = await stage3EditorialAdjustment(article, s1.score, s2.score);

  const finalScore = blendScores(s1.score, s2.score, s3Adjustment, runLLM && s2.score > 0);

  return {
    stage1Score: s1.score,
    stage2Score: s2.score,
    stage3Adjustment: s3Adjustment,
    finalScore,
    editorialTier: s2.editorialTier,
    category: s2.category,
    menaEntities: s1.matchedEntities,
    fundingSignal: s1.fundingSignal,
    llmReasoning: s2.reasoning,
    suggestedAngle: s2.suggestedAngle,
    contentLanguage: s1.detectedLanguage,
    llmProvider: s2.provider,
  };
}

// ─── Batch Scoring ────────────────────────────────────────────────────────────

export async function batchScoreArticles(
  articles: ArticleInput[],
  options: {
    editorialBrief?: string | null;
    sourceMaxAgeHours?: number | null;
    maxLLMBatch?: number;
  } = {}
): Promise<Map<number, ScoringResult>> {
  const { editorialBrief, sourceMaxAgeHours, maxLLMBatch = 30 } = options;
  const results = new Map<number, ScoringResult>();

  // Stage 1 for all articles (fast, DB-driven)
  const s1Results = await Promise.all(
    articles.map(a => stage1KeywordScore(a))
  );

  // Sort by stage1 score, take top N for LLM
  const ranked = articles
    .map((a, i) => ({ article: a, s1: s1Results[i] }))
    .sort((a, b) => b.s1.score - a.s1.score);

  const llmCandidates = ranked.slice(0, maxLLMBatch);
  const noLLMCandidates = ranked.slice(maxLLMBatch);

  // LLM scoring for top candidates (sequential to avoid rate limits)
  for (const { article, s1 } of llmCandidates) {
    const s2 = await stage2LLMScore(article, s1, editorialBrief);
    const s3 = await stage3EditorialAdjustment(article, s1.score, s2.score);
    const finalScore = blendScores(s1.score, s2.score, s3, s2.score > 0);
    results.set(article.id, {
      stage1Score: s1.score,
      stage2Score: s2.score,
      stage3Adjustment: s3,
      finalScore,
      editorialTier: s2.editorialTier,
      category: s2.category,
      menaEntities: s1.matchedEntities,
      fundingSignal: s1.fundingSignal,
      llmReasoning: s2.reasoning,
      suggestedAngle: s2.suggestedAngle,
      contentLanguage: s1.detectedLanguage,
      llmProvider: s2.provider,
    });
  }

  // Keyword-only scoring for the rest
  for (const { article, s1 } of noLLMCandidates) {
    const s3 = await stage3EditorialAdjustment(article, s1.score, 0);
    const finalScore = blendScores(s1.score, 0, s3, false);
    results.set(article.id, {
      stage1Score: s1.score,
      stage2Score: 0,
      stage3Adjustment: s3,
      finalScore,
      editorialTier: null,
      category: null,
      menaEntities: s1.matchedEntities,
      fundingSignal: s1.fundingSignal,
      llmReasoning: null,
      suggestedAngle: null,
      contentLanguage: s1.detectedLanguage,
      llmProvider: null,
    });
  }

  return results;
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export function invalidateScoringCache() {
  cacheLoadedAt = 0;
}
