/**
 * AI Extended Features Service
 * Implements: Streaming, Batch Generation, Content Comparison, Tone Analysis,
 * Plagiarism Check, SEO Optimization, Social Media, Newsletter, Podcast/Video Scripts,
 * Entity Relationship Linking, Image Generation, Webhook Notifications
 */
import { publication } from "../../../shared/publication";
import { EDITORIAL_SHORT, HOUSE_STYLE } from "../../config/editorial";
import { getDb } from "../../db";
import { invokeLLM, resolveEndpoint, resolveModel } from "../../_core/llm";
import { generateImage } from "../../_core/imageGeneration";
import { storagePut } from "../../storage";
import { ENV } from "../../_core/env";
import {
  aiGenerationSessions, aiContentVersions, aiToneAnalysis, aiPlagiarismChecks,
  aiBatchJobs, aiSocialPosts, aiWebhookConfigs, aiWebhookLogs,
  aiLlmUsageLogs, articles,
  articleCompanies, articlePeople, articleInvestors, articleEvents, articleAccelerators,
} from "../../../drizzle/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { generateContent, type ContentGenerationInput } from "./contentGenerator.service";
import { toDbDate } from "../../_core/dbValues";
// LLM provider imported from core

// ============================================================
// STREAMING GENERATION
// ============================================================

export async function generateContentStreaming(
  input: ContentGenerationInput,
  onChunk: (chunk: string) => void
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create session first
  const [session] = (await db.insert(aiGenerationSessions).values({
    contentType: input.contentType || "article",
    inputTitle: input.title || "",
    inputUrl: input.url || null,
    inputText: input.rawText || null,
    inputData: input.additionalContext ? { instructions: input.additionalContext } : null,
    llmProvider: input.provider || "builtin",
    llmModel: input.model || null,
    sessionType: input.sessionType || "manual",
    policyId: input.policyId || null,
    templateId: input.templateId || null,
    status: "generating",
    createdBy: input.userId || null,
  } as any).$returningId()) as unknown as ({id: number})[];

  const sessionId = (session as any)[0]?.id;

  try {
    // Build the prompt (same logic as contentGenerator but we stream the response)
    const systemPrompt = buildStreamingSystemPrompt(input);
    const userPrompt = buildStreamingUserPrompt(input);

    // Use the shared LLM endpoint (forge or Gemini) with fetch for
    // streaming — both speak the OpenAI SSE streaming format.
    const endpoint = resolveEndpoint();

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        model: resolveModel(endpoint.viaGemini),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 32768,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM streaming failed: ${response.status}`);
    }

    let fullContent = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l: string) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    }

    // Parse the full content for structured data
    let parsedResult: any = { content: fullContent, title: input.title };
    try {
      // Try to extract JSON from the response
      const jsonMatch = fullContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsedResult = { ...parsedResult, ...JSON.parse(jsonMatch[1]) };
      }
    } catch { /* use raw content */ }

    // Update session
    await db.update(aiGenerationSessions)
      .set({
        status: "completed",
        generatedTitle: parsedResult.title || input.title,
        generatedContent: fullContent,
        generatedData: parsedResult.entities ? { entities: parsedResult.entities } : null,
      } as any)
      .where(eq(aiGenerationSessions.id, sessionId));

    // Save version
    await db.insert(aiContentVersions).values({
      sessionId,
      versionNumber: 1,
      title: parsedResult.title || input.title,
      content: fullContent,
      source: "ai_generated",
      modelUsed: input.model || "gemini-2.5-flash",
      createdById: input.userId || null,
    } as any);

    return { sessionId, content: fullContent, parsed: parsedResult };
  } catch (err: any) {
    await db.update(aiGenerationSessions)
      .set({ status: "failed", inputData: { error: err.message } } as any)
      .where(eq(aiGenerationSessions.id, sessionId));
    throw err;
  }
}

function buildStreamingSystemPrompt(input: ContentGenerationInput): string {
  return `You are ${publication.name}'s AI content writer. You write for ${EDITORIAL_SHORT}. ${HOUSE_STYLE}

Rules:
- Write in complete paragraphs, no bullet points or dashes
- Use professional journalistic tone
- Include relevant context and background
- Mention specific people, companies, investors, and funding amounts when available
- Do not use markdown headers excessively
- Content should be publication-ready
- Content type: ${input.contentType || "article"}`;
}

function buildStreamingUserPrompt(input: ContentGenerationInput): string {
  let prompt = `Write a comprehensive ${input.contentType || "article"} about: ${input.title}\n\n`;
  if (input.url) prompt += `Reference source: ${input.url}\n`;
  if (input.rawText) prompt += `Source material:\n${input.rawText}\n\n`;
  if (input.additionalContext) prompt += `Additional instructions: ${input.additionalContext}\n`;
  return prompt;
}

// ============================================================
// BATCH GENERATION
// ============================================================

export async function createBatchJob(input: {
  name: string;
  items: Array<{ title: string; sourceUrl?: string; sourceText?: string; contentType?: string }>;
  provider?: string;
  model?: string;
  policyId?: number;
  templateId?: number;
  userId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const itemsWithStatus = input.items.map(item => ({
    ...item,
    status: "pending" as string,
    contentType: item.contentType || "article",
  }));

  const [job] = (await db.insert(aiBatchJobs).values({
    name: input.name,
    status: "pending",
    totalItems: input.items.length,
    completedItems: 0,
    failedItems: 0,
    provider: input.provider || null,
    model: input.model || null,
    policyId: input.policyId || null,
    templateId: input.templateId || null,
    items: itemsWithStatus,
    createdById: input.userId || null,
  } as any).$returningId()) as unknown as ({id: number})[];
  return (job as any)[0]?.id;
}

export async function runBatchJob(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [job] = await db.select().from(aiBatchJobs).where(eq(aiBatchJobs.id, jobId));
  if (!job) throw new Error("Batch job not found");

  await db.update(aiBatchJobs)
    .set({ status: "running", startedAt: toDbDate(new Date()) } as any)
    .where(eq(aiBatchJobs.id, jobId));

  const items = (job.items as any[]) || [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const result = await generateContent({
        title: item.title,
        url: item.sourceUrl,
        rawText: item.sourceText,
        contentType: (item.contentType || "article") as any,
        provider: (job.provider || undefined) as any,
        model: job.model || undefined,
        policyId: job.policyId || undefined,
        templateId: job.templateId || undefined,
      });

      items[i] = { ...item, status: "completed", sessionId: result.sessionId };
      completed++;
    } catch (err: any) {
      items[i] = { ...item, status: "failed", error: err.message };
      failed++;
    }

    // Update progress
    await db.update(aiBatchJobs)
      .set({ completedItems: completed, failedItems: failed, items } as any)
      .where(eq(aiBatchJobs.id, jobId));
  }

  await db.update(aiBatchJobs)
    .set({
      status: failed === items.length ? "failed" : "completed",
      completedItems: completed,
      failedItems: failed,
      items,
      completedAt: toDbDate(new Date()),
    } as any)
    .where(eq(aiBatchJobs.id, jobId));
}

// ============================================================
// CONTENT COMPARISON / VERSIONING
// ============================================================

export async function saveContentVersion(input: {
  sessionId?: number;
  articleId?: number;
  title?: string;
  content: string;
  source: "ai_generated" | "ai_rewritten" | "ai_enhanced" | "human_edited" | "published";
  modelUsed?: string;
  userId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the latest version number
  const existing = await db.select({ maxVer: sql<number>`MAX(version_number)` })
    .from(aiContentVersions)
    .where(
      input.sessionId
        ? eq(aiContentVersions.sessionId, input.sessionId)
        : input.articleId
          ? eq(aiContentVersions.articleId, input.articleId)
          : sql`1=0`
    );

  const nextVersion = (existing[0]?.maxVer || 0) + 1;

  const [version] = (await db.insert(aiContentVersions).values({
    sessionId: input.sessionId || null,
    articleId: input.articleId || null,
    versionNumber: nextVersion,
    title: input.title || null,
    content: input.content,
    source: input.source,
    modelUsed: input.modelUsed || null,
    createdById: input.userId || null,
  } as any).$returningId()) as unknown as ({id: number})[];
  return (version as any)[0]?.id;
}

export async function getContentVersions(sessionId?: number, articleId?: number) {
  const db = await getDb();
  if (!db) return [];

  const condition = sessionId
    ? eq(aiContentVersions.sessionId, sessionId)
    : articleId
      ? eq(aiContentVersions.articleId, articleId)
      : sql`1=0`;

  return db.select().from(aiContentVersions)
    .where(condition)
    .orderBy(desc(aiContentVersions.versionNumber));
}

export function computeDiff(oldText: string, newText: string): Array<{ type: "added" | "removed" | "unchanged"; text: string }> {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const diff: Array<{ type: "added" | "removed" | "unchanged"; text: string }> = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      diff.push({ type: "unchanged", text: oldLine || "" });
    } else {
      if (oldLine !== undefined) {
        diff.push({ type: "removed", text: oldLine });
      }
      if (newLine !== undefined) {
        diff.push({ type: "added", text: newLine });
      }
    }
  }

  return diff;
}

// ============================================================
// TONE ANALYSIS
// ============================================================

export async function analyzeTone(input: {
  content: string;
  sessionId?: number;
  articleId?: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content analysis expert. Analyze the given text and return a JSON object with these fields:
- overallTone: string (e.g., "professional", "casual", "academic", "conversational")
- readabilityScore: number 0-100 (higher = easier to read)
- fleschKincaid: number (grade level)
- sentimentScore: number -1 to 1 (negative to positive)
- sentimentLabel: string ("negative", "neutral", "positive")
- wordCount: number
- avgSentenceLength: number
- passiveVoicePercent: number 0-100
- toneBreakdown: object with tone categories and their percentages (e.g., {"informative": 60, "analytical": 25, "persuasive": 15})
- suggestions: array of strings with improvement suggestions

Return ONLY valid JSON, no markdown.`
      },
      { role: "user", content: input.content }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tone_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overallTone: { type: "string" },
            readabilityScore: { type: "number" },
            fleschKincaid: { type: "number" },
            sentimentScore: { type: "number" },
            sentimentLabel: { type: "string" },
            wordCount: { type: "integer" },
            avgSentenceLength: { type: "number" },
            passiveVoicePercent: { type: "number" },
            toneBreakdown: { type: "object", additionalProperties: { type: "number" } },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["overallTone", "readabilityScore", "fleschKincaid", "sentimentScore", "sentimentLabel", "wordCount", "avgSentenceLength", "passiveVoicePercent", "toneBreakdown", "suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0].message.content;
  const analysis = JSON.parse(typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) || "{}");

  const [record] = (await db.insert(aiToneAnalysis).values({
    sessionId: input.sessionId || null,
    articleId: input.articleId || null,
    overallTone: analysis.overallTone,
    readabilityScore: analysis.readabilityScore,
    fleschKincaid: analysis.fleschKincaid,
    sentimentScore: analysis.sentimentScore,
    sentimentLabel: analysis.sentimentLabel,
    wordCount: analysis.wordCount,
    avgSentenceLength: analysis.avgSentenceLength,
    passiveVoicePercent: analysis.passiveVoicePercent,
    toneBreakdown: analysis.toneBreakdown,
    suggestions: analysis.suggestions,
  } as any).$returningId()) as unknown as ({id: number})[];

  return { id: record.id, ...analysis };
}

// ============================================================
// PLAGIARISM CHECK
// ============================================================

export async function checkPlagiarism(input: {
  content: string;
  sessionId?: number;
  articleId?: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [check] = (await db.insert(aiPlagiarismChecks).values({
    sessionId: input.sessionId || null,
    articleId: input.articleId || null,
    status: "checking",
  } as any).$returningId()) as unknown as ({id: number})[];

  try {
    // Use LLM to analyze content originality
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a plagiarism detection expert. Analyze the given text for originality.
Return a JSON object with:
- originalityScore: number 0-100 (100 = fully original)
- totalSentences: number of sentences analyzed
- flaggedSentences: number of potentially non-original sentences
- matches: array of objects with { sentence: string, matchUrl: string (likely source URL or "common knowledge"), similarity: number 0-1 }
- assessment: string summary of originality

Focus on identifying:
1. Common phrases that might be copied
2. Technical descriptions that seem templated
3. Quotes without attribution
4. Overly generic passages

Return ONLY valid JSON.`
        },
        { role: "user", content: input.content }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "plagiarism_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              originalityScore: { type: "number" },
              totalSentences: { type: "integer" },
              flaggedSentences: { type: "integer" },
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sentence: { type: "string" },
                    matchUrl: { type: "string" },
                    similarity: { type: "number" },
                  },
                  required: ["sentence", "matchUrl", "similarity"],
                  additionalProperties: false,
                },
              },
              assessment: { type: "string" },
            },
            required: ["originalityScore", "totalSentences", "flaggedSentences", "matches", "assessment"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawPlagContent = response.choices[0].message.content;
    const result = JSON.parse(typeof rawPlagContent === 'string' ? rawPlagContent : JSON.stringify(rawPlagContent) || "{}");

    await db.update(aiPlagiarismChecks)
      .set({
        originalityScore: result.originalityScore,
        totalSentences: result.totalSentences,
        flaggedSentences: result.flaggedSentences,
        matches: result.matches,
        status: result.flaggedSentences > 0 ? "flagged" : "clean",
        checkedAt: toDbDate(new Date()),
      } as any)
      .where(eq(aiPlagiarismChecks.id, check.id));

    return { id: check.id, ...result };
  } catch (err: any) {
    await db.update(aiPlagiarismChecks)
      .set({ status: "error" } as any)
      .where(eq(aiPlagiarismChecks.id, check.id));
    throw err;
  }
}

// ============================================================
// SEO OPTIMIZATION
// ============================================================

export async function generateSEO(input: {
  title: string;
  content: string;
  contentType?: string;
}): Promise<{
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  focusKeywords: string[];
  secondaryKeywords: string[];
  schemaMarkup: any;
  suggestions: string[];
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an SEO expert specializing in tech media content. Generate comprehensive SEO metadata for the given article.

Return a JSON object with:
- metaTitle: string (max 60 chars, include primary keyword)
- metaDescription: string (max 160 chars, compelling with CTA)
- ogTitle: string (optimized for social sharing)
- ogDescription: string (max 200 chars)
- focusKeywords: array of 3-5 primary keywords
- secondaryKeywords: array of 5-10 secondary/long-tail keywords
- schemaMarkup: NewsArticle JSON-LD schema object
- suggestions: array of SEO improvement suggestions

Focus on MENA tech ecosystem keywords and search intent.
Return ONLY valid JSON.`
      },
      { role: "user", content: `Title: ${input.title}\n\nContent:\n${input.content.substring(0, 3000)}` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_optimization",
        strict: true,
        schema: {
          type: "object",
          properties: {
            metaTitle: { type: "string" },
            metaDescription: { type: "string" },
            ogTitle: { type: "string" },
            ogDescription: { type: "string" },
            focusKeywords: { type: "array", items: { type: "string" } },
            secondaryKeywords: { type: "array", items: { type: "string" } },
            schemaMarkup: { type: "object", additionalProperties: true },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["metaTitle", "metaDescription", "ogTitle", "ogDescription", "focusKeywords", "secondaryKeywords", "schemaMarkup", "suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawSeoContent = response.choices[0].message.content;
  return JSON.parse(typeof rawSeoContent === 'string' ? rawSeoContent : JSON.stringify(rawSeoContent) || "{}");
}

// ============================================================
// SOCIAL MEDIA GENERATION
// ============================================================

export async function generateSocialPosts(input: {
  articleId?: number;
  sessionId?: number;
  title: string;
  content: string;
  platforms: Array<"twitter" | "linkedin" | "facebook" | "instagram" | "threads">;
  userId?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a social media expert for ${EDITORIAL_SHORT}.
Generate engaging social media posts for each requested platform.

For each platform, return an object with:
- platform: string
- content: string (platform-appropriate length and tone)
- hashtags: array of relevant hashtags (without #)

Platform guidelines:
- twitter: Max 280 chars, punchy, include 3-5 hashtags
- linkedin: Professional tone, 1-3 paragraphs, industry insights, 3-5 hashtags
- facebook: Conversational, engaging question or hook, 1-2 paragraphs
- instagram: Visual-focused caption, storytelling, 10-15 hashtags
- threads: Casual, conversational, thread-friendly, 3-5 hashtags

Return a JSON array of post objects.`
      },
      {
        role: "user",
        content: `Generate posts for platforms: ${input.platforms.join(", ")}\n\nArticle Title: ${input.title}\n\nArticle Content:\n${input.content.substring(0, 2000)}`
      }
    ],
  });

  let posts: any[] = [];
  try {
    const rawSocialContent = response.choices[0].message.content;
    const socialStr = typeof rawSocialContent === 'string' ? rawSocialContent : JSON.stringify(rawSocialContent) || "[]";
    const jsonMatch = socialStr.match(/\[[\s\S]*\]/);
    posts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    posts = input.platforms.map(p => ({
      platform: p,
      content: `Check out our latest article: ${input.title}`,
      hashtags: [publication.name, "Infrastructure", "SaudiArabia"],
    }));
  }

  const savedPosts: any[] = [];
  for (const post of posts) {
    if (!input.platforms.includes(post.platform)) continue;
    const [saved] = (await db.insert(aiSocialPosts).values({
      sessionId: input.sessionId || null,
      articleId: input.articleId || null,
      platform: post.platform,
      content: post.content,
      hashtags: post.hashtags || [],
      status: "draft",
      createdById: input.userId || null,
    } as any).$returningId()) as unknown as ({id: number})[];
    savedPosts.push({ id: (saved as any)[0]?.id, ...post });
  }

  return savedPosts;
}

// ============================================================
// NEWSLETTER GENERATION
// ============================================================

export async function generateNewsletter(input: {
  title?: string;
  articleIds?: number[];
  timeRange?: { from: string; to: string };
  style?: "daily" | "weekly" | "monthly";
  customInstructions?: string;
}): Promise<{ subject: string; preheader: string; htmlContent: string; textContent: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch articles for the newsletter
  let articleData: any[] = [];
  if (input.articleIds && input.articleIds.length > 0) {
    articleData = await db.select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      slug: articles.slug,
    }).from(articles).where(inArray(articles.id, input.articleIds));
  }

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are ${publication.name}'s newsletter editor. You write for ${EDITORIAL_SHORT}. Create a compelling ${input.style || "weekly"} newsletter.

Return a JSON object with:
- subject: string (email subject line, max 60 chars)
- preheader: string (preview text, max 100 chars)
- htmlContent: string (full HTML email with inline styles, ${publication.name} branding, dark header, clean layout)
- textContent: string (plain text version)

Use ${publication.name}'s brand colors: dark background (#0b0d12), accent blue (#2563eb).
Include proper email HTML structure with tables for layout.
Return ONLY valid JSON.`
      },
      {
        role: "user",
        content: `Newsletter title: ${input.title || `${publication.newsletter.name} Digest`}\n\nArticles to include:\n${articleData.map(a => `- ${a.title} (${a.excerpt || ""})`).join("\n")}\n\n${input.customInstructions || ""}`
      }
    ],
  });

  let result: any;
  try {
    const rawNewsContent = response.choices[0].message.content;
    const newsStr = typeof rawNewsContent === 'string' ? rawNewsContent : JSON.stringify(rawNewsContent) || "{}";
    const jsonMatch = newsStr.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    result = {
      subject: input.title || `${publication.newsletter.name} Digest`,
      preheader: "Latest from MENA's tech ecosystem",
      htmlContent: "<p>Newsletter content generation failed. Please try again.</p>",
      textContent: "Newsletter content generation failed. Please try again.",
    };
  }

  return result;
}

// ============================================================
// PODCAST / VIDEO SCRIPT GENERATION
// ============================================================

export async function generateScript(input: {
  type: "podcast" | "video";
  title: string;
  content: string;
  duration?: number; // minutes
  style?: string;
  instructions?: string;
}): Promise<{ script: string; outline: string[]; estimatedDuration: number; speakerNotes: string[] }> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a ${input.type} script writer for ${EDITORIAL_SHORT}.

Create a professional ${input.type} script based on the provided article content.

Return a JSON object with:
- script: string (full ${input.type} script with speaker directions, transitions, ${input.type === "video" ? "scene descriptions, B-roll suggestions" : "intro/outro music cues"})
- outline: array of section titles/timestamps
- estimatedDuration: number (minutes)
- speakerNotes: array of key talking points and pronunciation guides

Target duration: ${input.duration || 10} minutes.
${input.style ? `Style: ${input.style}` : ""}
${input.instructions ? `Additional instructions: ${input.instructions}` : ""}

Return ONLY valid JSON.`
      },
      {
        role: "user",
        content: `Title: ${input.title}\n\nSource Content:\n${input.content.substring(0, 4000)}`
      }
    ],
  });

  let result: any;
  try {
    const rawScriptContent = response.choices[0].message.content;
    const scriptStr = typeof rawScriptContent === 'string' ? rawScriptContent : JSON.stringify(rawScriptContent) || "{}";
    const jsonMatch = scriptStr.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    result = {
      script: "Script generation failed. Please try again.",
      outline: [],
      estimatedDuration: input.duration || 10,
      speakerNotes: [],
    };
  }

  return result;
}

// ============================================================
// ENTITY RELATIONSHIP LINKING
// ============================================================

export async function linkEntitiesToArticle(input: {
  articleId: number;
  entities: Array<{
    type: string;
    entityId: number;
    mentionType?: string;
  }>;
  userId?: number;
}): Promise<{ linked: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let linked = 0;
  const errors: string[] = [];

  for (const entity of input.entities) {
    try {
      const mentionType = (entity.mentionType || "mentioned") as any;

      switch (entity.type) {
        case "company":
          await db.insert(articleCompanies).values({
            articleId: input.articleId,
            companyId: entity.entityId,
            mentionType,
            createdById: input.userId || null,
          } as any).onDuplicateKeyUpdate({ set: { mentionType } });
          linked++;
          break;

        case "person":
          await db.insert(articlePeople).values({
            articleId: input.articleId,
            personId: entity.entityId,
            mentionType,
            createdById: input.userId || null,
          } as any).onDuplicateKeyUpdate({ set: { mentionType } });
          linked++;
          break;

        case "investor":
          await db.insert(articleInvestors).values({
            articleId: input.articleId,
            investorId: entity.entityId,
            mentionType,
            createdById: input.userId || null,
          } as any).onDuplicateKeyUpdate({ set: { mentionType } });
          linked++;
          break;

        case "event":
          await db.insert(articleEvents).values({
            articleId: input.articleId,
            eventId: entity.entityId,
            mentionType,
            createdById: input.userId || null,
          } as any).onDuplicateKeyUpdate({ set: { mentionType } });
          linked++;
          break;

        case "accelerator":
          await db.insert(articleAccelerators).values({
            articleId: input.articleId,
            acceleratorId: entity.entityId,
            mentionType,
            createdById: input.userId || null,
          } as any).onDuplicateKeyUpdate({ set: { mentionType } });
          linked++;
          break;

        default:
          errors.push(`Unknown entity type: ${entity.type}`);
      }
    } catch (err: any) {
      errors.push(`Failed to link ${entity.type} ${entity.entityId}: ${err.message}`);
    }
  }

  return { linked, errors };
}

// ============================================================
// AI IMAGE GENERATION (Hero Images)
// ============================================================

export async function generateArticleImage(input: {
  title: string;
  content?: string;
  style?: string;
}): Promise<{ url: string; prompt: string }> {
  const imagePrompt: string = `Professional editorial illustration for a tech news article titled "${input.title}". ${input.style || "Modern, clean, minimalist design with subtle tech elements. Use a professional color palette suitable for a business publication. No text in the image."}`;

  const result = await generateImage({ prompt: imagePrompt });

  return {
    url: (result as any).url as string || "",
    prompt: imagePrompt,
  };
}

// ============================================================
// WEBHOOK NOTIFICATIONS
// ============================================================

export async function triggerWebhooks(event: string, payload: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const configs = await db.select().from(aiWebhookConfigs)
    .where(and(eq(aiWebhookConfigs.isActive, 1)));

  for (const config of configs) {
    const events = (config.events as string[]) || [];
    if (!events.includes(event) && !events.includes("*")) continue;

    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(config.headers as Record<string, string> || {}),
      };

      if (config.secret) {
        // Simple HMAC-like signature
        headers["X-Webhook-Signature"] = config.secret;
      }

      const response = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });

      const durationMs = Date.now() - startTime;

      await db.insert(aiWebhookLogs).values({
        webhookId: config.id,
        event,
        payload,
        responseStatus: response.status,
        success: response.ok ? 1 : 0,
        durationMs,
      } as any);

      if (response.ok) {
        await db.update(aiWebhookConfigs)
          .set({ lastTriggeredAt: toDbDate(new Date()), failureCount: 0 } as any)
          .where(eq(aiWebhookConfigs.id, config.id));
      } else {
        await db.update(aiWebhookConfigs)
          .set({ failureCount: sql`failure_count + 1` } as any)
          .where(eq(aiWebhookConfigs.id, config.id));
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await db.insert(aiWebhookLogs).values({
        webhookId: config.id,
        event,
        payload,
        responseStatus: 0,
        responseBody: err.message,
        success: 0,
        durationMs,
      } as any);
      await db.update(aiWebhookConfigs)
        .set({ failureCount: sql`failure_count + 1` } as any)
        .where(eq(aiWebhookConfigs.id, config.id));
    }
  }
}

// ============================================================
// COMPETITIVE INTELLIGENCE
// ============================================================

export async function analyzeCompetitorArticle(input: {
  title: string;
  url: string;
  content?: string;
  sourceId: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Analyze this competitor article and extract:
- summary: brief 2-3 sentence summary
- topics: array of topic tags
- entities: array of company/person/investor names mentioned
- relevanceScore: 0-1 how relevant to MENA tech ecosystem
- coverageGap: boolean - does ${publication.name} likely NOT have coverage of this topic?

Return ONLY valid JSON.`
      },
      {
        role: "user",
        content: `Title: ${input.title}\nURL: ${input.url}\n${input.content ? `Content: ${input.content.substring(0, 2000)}` : ""}`
      }
    ],
  });

  let analysis: any;
  try {
    const rawCompContent = response.choices[0].message.content;
    const compStr = typeof rawCompContent === 'string' ? rawCompContent : JSON.stringify(rawCompContent) || "{}";
    const jsonMatch = compStr.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    analysis = { summary: "", topics: [], entities: [], relevanceScore: 0.5, coverageGap: false };
  }

  return analysis;
}

// ============================================================
// A/B TESTING
// ============================================================

export async function generateABVariants(input: {
  title: string;
  content: string;
  variantCount?: number;
  testName: string;
  sessionId?: number;
  articleId?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const count = input.variantCount || 3;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Generate ${count} A/B test variants for the given article. Each variant should have a different:
- Title (different angles, hooks, or framings)
- Meta description (different value propositions)
- Opening paragraph approach

Return a JSON array of objects with:
- variantLabel: string (e.g., "A", "B", "C")
- title: string
- metaDescription: string (max 160 chars)
- openingParagraph: string

Return ONLY valid JSON array.`
      },
      {
        role: "user",
        content: `Original Title: ${input.title}\n\nContent:\n${input.content.substring(0, 2000)}`
      }
    ],
  });

  let variants: any[] = [];
  try {
    const rawAbContent = response.choices[0].message.content;
    const abStr = typeof rawAbContent === 'string' ? rawAbContent : JSON.stringify(rawAbContent) || "[]";
    const jsonMatch = abStr.match(/\[[\s\S]*\]/);
    variants = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    variants = [{ variantLabel: "A", title: input.title, metaDescription: "", openingParagraph: "" }];
  }

  const saved: any[] = [];
  for (const variant of variants) {
    const [record] = await db.insert((await import("../../../drizzle/schema")).aiAbTestVariants).values({
      testName: input.testName,
      sessionId: input.sessionId || null,
      articleId: input.articleId || null,
      variantLabel: variant.variantLabel,
      title: variant.title,
      content: variant.openingParagraph || null,
      metaDescription: variant.metaDescription || null,
      status: "draft",
    } as any).$returningId();
    saved.push({ id: (record as any)[0]?.id, ...variant });
  }

  return saved;
}
