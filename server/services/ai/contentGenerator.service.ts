/**
 * AI Content Generation Engine
 * Core service for generating articles, entity profiles, resources, and any content type
 * Handles editorial policy enforcement, entity extraction, image search, and cross-table population
 */
import { publication } from "../../../shared/publication";
import { EDITORIAL_IDENTITY, HOUSE_STYLE } from "../../config/editorial";
import { invokeLLMProvider, type LLMProvider, type LLMResponse } from "./llmProvider.service";
import { getDb } from "../../db";
import {
  aiGenerationSessions,
  aiEditorialPolicies,
  aiContentTemplates,
  aiEntityExtractions,
  aiLlmUsageLogs,
  articles,
  companies,
  people,
  investors,
  fundingRounds,
  fundingRoundInvestors,
  accelerators,
  events,
  tags,
  articleCompanies,
  articlePeople,
  articleInvestors,
  articleAccelerators,
  articleEvents,
  articleTags,
  articleCategories,
  media,
  settings,
} from "../../../drizzle/schema";
import { eq, like, and, desc, sql, inArray } from "drizzle-orm";
import { storagePut } from "../../storage";
import type { Message } from "../../_core/llm";
import { toDbDate } from "../../_core/dbValues";

// ============================================================
// TYPES
// ============================================================

export interface ContentGenerationInput {
  contentType: "article" | "company" | "person" | "investor" | "event" | "accelerator" | "job" | "resource" | "custom";
  sessionType?: "manual" | "agent" | "rewrite" | "enhance";
  title?: string;
  url?: string;
  rawText?: string;
  additionalContext?: string;
  templateId?: number;
  policyId?: number;
  provider?: LLMProvider;
  model?: string;
  articleType?: string;
  categoryIds?: number[];
  tagIds?: number[];
  userId?: number;
  agentSourceId?: number;
}

export interface GeneratedContent {
  sessionId: number;
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  articleType: string;
  imageUrl?: string;
  imageAlt?: string;
  entities: ExtractedEntity[];
  suggestedTags: string[];
  suggestedCategory?: string;
  generationTimeMs: number;
  tokenCount: number;
  estimatedCost: string;
  provider: string;
  model: string;
}

export interface ExtractedEntity {
  type: "company" | "person" | "investor" | "funding_round" | "accelerator" | "event" | "tag";
  name: string;
  data: Record<string, any>;
  confidence: "high" | "medium" | "low";
  matchStatus: "new" | "existing" | "possible_match";
  existingId?: number;
  mentionType: "primary" | "mentioned" | "investor_in_round" | "partner" | "organizer";
}

export interface EditorialPolicy {
  id: number;
  name: string;
  rules: EditorialRules;
}

export interface EditorialRules {
  tone: string;
  style: string;
  avoidPatterns: string[] | string;
  requiredElements: string[] | string;
  paragraphStyle: string;
  headingStyle: string;
  wordCountMin: number;
  wordCountMax: number;
  customInstructions: string;
}

// ============================================================
// EDITORIAL POLICY
// ============================================================

export async function getEditorialPolicy(policyId?: number, contentType?: string): Promise<EditorialPolicy | null> {
  const db = await getDb();
  if (!db) return null;

  if (policyId) {
    const [policy] = await db.select().from(aiEditorialPolicies).where(eq(aiEditorialPolicies.id, policyId));
    if (policy) return { id: policy.id, name: policy.name, rules: policy.rules as EditorialRules };
  }

  // Get default policy for content type
  if (contentType) {
    const [policy] = await db.select().from(aiEditorialPolicies)
      .where(and(eq(aiEditorialPolicies.contentType, contentType), eq(aiEditorialPolicies.isDefault, 1)));
    if (policy) return { id: policy.id, name: policy.name, rules: policy.rules as EditorialRules };
  }

  return null;
}

export async function getContentTemplate(templateId?: number, contentType?: string, articleType?: string): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  if (templateId) {
    const [template] = await db.select().from(aiContentTemplates).where(eq(aiContentTemplates.id, templateId));
    return template;
  }

  // Find matching template
  if (contentType) {
    const conditions = [eq(aiContentTemplates.contentType, contentType), eq(aiContentTemplates.isActive, 1)];
    if (articleType) conditions.push(eq(aiContentTemplates.articleType, articleType));
    const [template] = await db.select().from(aiContentTemplates).where(and(...conditions));
    return template;
  }

  return null;
}

// ============================================================
// SYSTEM PROMPT BUILDER
// ============================================================

function buildSystemPrompt(policy: EditorialPolicy | null, template: any | null, contentType: string): string {
  let prompt = `You are ${publication.name}'s AI Content Engine — a world-class editorial assistant for a professional industry publication. You produce publication-ready content that matches ${publication.name}'s editorial voice and standards.

PLATFORM CONTEXT:
${EDITORIAL_IDENTITY}

HOUSE STYLE:
${HOUSE_STYLE}

OUTPUT FORMAT:
- Return valid JSON matching the requested schema
- All content must be original, factual, and publication-ready
- Never fabricate quotes, statistics, or funding amounts
- If information is uncertain, flag it clearly

`;

  if (policy) {
    const rules = policy.rules as any;
    const tone = rules.toneGuidelines || rules.tone || "Professional, authoritative";
    const style = rules.structureRules || rules.style || "Clean, concise paragraphs";
    const paragraphStyle = rules.paragraphStyle || "Full flowing paragraphs, 3-5 sentences";
    const headingStyle = rules.headingStyle || "H2 for major sections, H3 for subsections";
    const forbidden = rules.forbiddenPatterns || rules.avoidPatterns || "";
    const required = rules.requiredElements || "";
    prompt += `EDITORIAL POLICY — "${policy.name}":
- Tone: ${tone}
- Style: ${style}
- Paragraph style: ${paragraphStyle}
- Heading style: ${headingStyle}
- Word count: ${rules.wordCountMin || 500}–${rules.wordCountMax || 1500} words
`;
    if (forbidden) {
      const avoidStr = Array.isArray(forbidden) ? forbidden.join(", ") : String(forbidden);
      prompt += `- AVOID: ${avoidStr}\n`;
    }
    if (required) {
      const reqStr = Array.isArray(required) ? required.join(", ") : String(required);
      prompt += `- MUST INCLUDE: ${reqStr}\n`;
    }
    if (rules.customInstructions || rules.description) {
      prompt += `- ADDITIONAL CONTEXT: ${rules.customInstructions || rules.description}\n`;
    }
  } else {
    // Default editorial style
    prompt += `DEFAULT EDITORIAL POLICY:
- Tone: Professional, authoritative, informative — a serious business newsroom covering industry and infrastructure
- Style: Clean, concise paragraphs. No bullet points in article body. No dashes (—) in running text.
- Paragraph style: Full flowing paragraphs, 3-5 sentences each. No single-sentence paragraphs.
- Heading style: Use H2 for major sections, H3 for subsections. Title case.
- Word count: 600–1200 words for news, 1500–3000 for reports/interviews
- AVOID: Dashes in text, bullet lists in articles, exclamation marks, clickbait, speculation, "breaking" unless truly breaking, marketing vocabulary ("revolutionizing", "game-changing", "cutting-edge")
- MUST INCLUDE: Deal/project values, timelines and locations when known; company background; key people involved; why the story matters to the region's industrial economy
`;
  }

  if (template?.templatePrompt) {
    prompt += `\nTEMPLATE INSTRUCTIONS:\n${template.templatePrompt}\n`;
  }

  return prompt;
}

// ============================================================
// CONTENT GENERATION
// ============================================================

export async function generateContent(input: ContentGenerationInput): Promise<GeneratedContent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();

  // Create session record
  const [sessionResult] = await db.insert(aiGenerationSessions).values({
    sessionType: input.sessionType || "manual",
    contentType: input.contentType,
    status: "generating",
    inputTitle: input.title || null,
    inputUrl: input.url || null,
    inputText: input.rawText || null,
    inputData: input.additionalContext ? { additionalContext: input.additionalContext, articleType: input.articleType } : null,
    templateId: input.templateId || null,
    policyId: input.policyId || null,
    llmProvider: input.provider || "builtin",
    llmModel: input.model || null,
    agentSourceId: input.agentSourceId || null,
    createdBy: input.userId || null,
  } as any);
  const sessionId = sessionResult.insertId;

  try {
    // Load policy and template
    const policy = await getEditorialPolicy(input.policyId, input.contentType);
    const template = await getContentTemplate(input.templateId, input.contentType, input.articleType);

    // Build the generation prompt
    const systemPrompt = buildSystemPrompt(policy, template, input.contentType);
    const userPrompt = buildUserPrompt(input);

    // Call LLM for content generation
    const contentResponse = await invokeLLMProvider({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      provider: input.provider,
      model: input.model,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "generated_content",
          strict: true,
          schema: getContentSchema(input.contentType),
        },
      },
      sessionId,
      operation: "content_generation",
    });

    // Parse generated content
    let parsed: any;
    try {
      parsed = JSON.parse(contentResponse.content);
    } catch {
      // If JSON parse fails, try to extract JSON from the response
      const jsonMatch = contentResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse LLM response as JSON");
      }
    }

    // Extract entities from the generated content
    const entities = await extractAndMatchEntities(
      parsed.content || parsed.description || "",
      parsed.title || input.title || "",
      parsed.entities || [],
      sessionId
    );

    // Search for a relevant image
    let imageUrl: string | undefined;
    let imageAlt: string | undefined;
    try {
      const imageResult = await searchArticleImage(parsed.title || input.title || "", input.contentType);
      if (imageResult) {
        imageUrl = imageResult.url;
        imageAlt = imageResult.alt;
      }
    } catch (err) {
      console.error("[AI] Image search failed:", err);
    }

    const generationTimeMs = Date.now() - startTime;

    // Update session with results
    await db.update(aiGenerationSessions).set({
      status: "completed",
      generatedContent: parsed.content || parsed.description || "",
      generatedTitle: parsed.title || input.title || "",
      generatedExcerpt: parsed.excerpt || "",
      generatedSeoTitle: parsed.seoTitle || parsed.title || "",
      generatedSeoDescription: parsed.seoDescription || parsed.excerpt || "",
      generatedImageUrl: imageUrl || null,
      generatedImageAlt: imageAlt || null,
      generatedData: parsed,
      generationTimeMs,
      tokenCount: contentResponse.totalTokens,
      estimatedCost: contentResponse.estimatedCostUsd,
      llmProvider: contentResponse.provider,
      llmModel: contentResponse.model,
      approvalStatus: "pending",
    } as any).where(eq(aiGenerationSessions.id, sessionId));

    return {
      sessionId,
      title: parsed.title || input.title || "",
      content: parsed.content || parsed.description || "",
      excerpt: parsed.excerpt || "",
      seoTitle: parsed.seoTitle || parsed.title || "",
      seoDescription: parsed.seoDescription || parsed.excerpt || "",
      articleType: parsed.articleType || input.articleType || "news",
      imageUrl,
      imageAlt,
      entities,
      suggestedTags: parsed.suggestedTags || [],
      suggestedCategory: parsed.suggestedCategory,
      generationTimeMs,
      tokenCount: contentResponse.totalTokens,
      estimatedCost: contentResponse.estimatedCostUsd,
      provider: contentResponse.provider,
      model: contentResponse.model,
    };
  } catch (err: any) {
    // Update session with error
    await db.update(aiGenerationSessions).set({
      status: "failed",
      generatedData: { error: err.message },
    } as any).where(eq(aiGenerationSessions.id, sessionId));

    throw err;
  }
}

// ============================================================
// USER PROMPT BUILDER
// ============================================================

function buildUserPrompt(input: ContentGenerationInput): string {
  let prompt = "";

  switch (input.contentType) {
    case "article":
      prompt = `Generate a complete article for ${publication.name}.

`;
      if (input.title) prompt += `TITLE/TOPIC: ${input.title}\n`;
      if (input.url) prompt += `SOURCE URL: ${input.url}\n`;
      if (input.rawText) prompt += `SOURCE TEXT/NOTES:\n${input.rawText}\n`;
      if (input.articleType) prompt += `ARTICLE TYPE: ${input.articleType}\n`;
      if (input.additionalContext) prompt += `ADDITIONAL CONTEXT: ${input.additionalContext}\n`;

      prompt += `
Return JSON with this structure:
{
  "title": "Article headline",
  "content": "Full HTML article body with <h2>, <h3>, <p> tags. No bullet lists. Full paragraphs.",
  "excerpt": "2-3 sentence summary for article cards",
  "seoTitle": "SEO-optimized title (max 60 chars)",
  "seoDescription": "SEO meta description (max 160 chars)",
  "articleType": "news|opinion|press_release|report|interview",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "category name",
  "entities": {
    "companies": [{"name": "Company Name", "role": "primary|mentioned", "description": "Brief description", "website": "url", "industry": "sector", "location": "city, country", "foundedYear": 2020, "stage": "seed|series_a|etc"}],
    "people": [{"name": "Full Name", "role": "primary|mentioned|quoted", "title": "Job Title", "company": "Company Name", "linkedIn": "url"}],
    "investors": [{"name": "Investor Name", "type": "vc|angel|corporate_vc|family_office", "role": "lead|participant", "description": "Brief description"}],
    "fundingRounds": [{"companyName": "Company", "roundType": "seed|series_a|etc", "amount": "5000000", "currency": "USD", "date": "2026-01-15", "leadInvestor": "Investor Name", "participants": ["Investor 1", "Investor 2"]}],
    "accelerators": [{"name": "Accelerator Name", "description": "Brief description", "location": "city, country"}],
    "events": [{"name": "Event Name", "type": "conference|summit|etc", "date": "2026-03-15", "location": "city, country"}]
  }
}`;
      break;

    case "company":
      prompt = `Generate a comprehensive company profile for ${publication.name}.

`;
      if (input.title) prompt += `COMPANY NAME: ${input.title}\n`;
      if (input.rawText) prompt += `KNOWN DETAILS:\n${input.rawText}\n`;
      if (input.additionalContext) prompt += `ADDITIONAL CONTEXT: ${input.additionalContext}\n`;

      prompt += `
Return JSON with:
{
  "name": "Company Name",
  "tagline": "One-line description",
  "description": "Full company profile (3-5 paragraphs, HTML)",
  "shortDescription": "1-2 sentence summary",
  "website": "url",
  "linkedIn": "url",
  "twitter": "url",
  "industry": "sector",
  "location": "city, country",
  "foundedYear": 2020,
  "stage": "pre_seed|seed|series_a|series_b|series_c|series_d_plus|public|acquired",
  "employeeCount": "11-50",
  "mission": "Company mission statement",
  "entities": {
    "people": [{"name": "Full Name", "title": "CEO", "linkedIn": "url"}],
    "investors": [{"name": "Investor Name", "type": "vc"}],
    "fundingRounds": [{"roundType": "seed", "amount": "1000000", "currency": "USD", "date": "2025-06-01"}]
  }
}`;
      break;

    case "person":
      prompt = `Generate a comprehensive person profile for ${publication.name}.

`;
      if (input.title) prompt += `PERSON NAME: ${input.title}\n`;
      if (input.rawText) prompt += `KNOWN DETAILS:\n${input.rawText}\n`;
      if (input.additionalContext) prompt += `ADDITIONAL CONTEXT: ${input.additionalContext}\n`;

      prompt += `
Return JSON with:
{
  "name": "Full Name",
  "title": "Current Job Title",
  "company": "Current Company",
  "bio": "Full bio (3-4 paragraphs, HTML)",
  "shortBio": "1-2 sentence summary",
  "linkedIn": "url",
  "twitter": "url",
  "website": "url",
  "location": "city, country",
  "entities": {
    "companies": [{"name": "Company Name", "role": "founder|employee|advisor"}]
  }
}`;
      break;

    case "investor":
      prompt = `Generate a comprehensive investor profile for ${publication.name}.

`;
      if (input.title) prompt += `INVESTOR NAME: ${input.title}\n`;
      if (input.rawText) prompt += `KNOWN DETAILS:\n${input.rawText}\n`;
      prompt += `
Return JSON with:
{
  "name": "Investor Name",
  "type": "vc|angel|corporate_vc|family_office|accelerator|other",
  "description": "Full profile (3-4 paragraphs, HTML)",
  "shortDescription": "1-2 sentence summary",
  "website": "url",
  "linkedIn": "url",
  "headquarters": "city, country",
  "foundedYear": 2015,
  "investmentFocus": "sectors and stages",
  "entities": {
    "people": [{"name": "Partner Name", "title": "Managing Partner"}],
    "companies": [{"name": "Portfolio Company", "role": "investment"}]
  }
}`;
      break;

    case "event":
      prompt = `Generate a comprehensive event listing for ${publication.name}.

`;
      if (input.title) prompt += `EVENT NAME: ${input.title}\n`;
      if (input.rawText) prompt += `KNOWN DETAILS:\n${input.rawText}\n`;
      prompt += `
Return JSON with:
{
  "title": "Event Name",
  "description": "Full event description (HTML)",
  "shortDescription": "1-2 sentence summary",
  "type": "conference|webinar|meetup|workshop|hackathon|summit|other",
  "format": "in_person|virtual|hybrid",
  "startDate": "2026-03-15",
  "endDate": "2026-03-17",
  "venue": "Venue Name",
  "city": "City",
  "country": "Country",
  "entities": {
    "companies": [{"name": "Organizer", "role": "organizer"}],
    "people": [{"name": "Speaker Name", "title": "Title", "role": "speaker"}]
  }
}`;
      break;

    case "resource":
      prompt = `Generate a comprehensive resource/report for ${publication.name}.

`;
      if (input.title) prompt += `RESOURCE TITLE: ${input.title}\n`;
      if (input.rawText) prompt += `KNOWN DETAILS:\n${input.rawText}\n`;
      if (input.additionalContext) prompt += `ADDITIONAL CONTEXT: ${input.additionalContext}\n`;
      prompt += `
Return JSON with:
{
  "title": "Resource Title",
  "description": "Full resource description (HTML, comprehensive)",
  "shortDescription": "1-2 sentence summary",
  "type": "template|toolkit|perk|regulation|tool|playbook|program|grant|other",
  "content": "Full resource content (HTML, detailed, can be very long)",
  "provider": "Provider/Author Name",
  "suggestedTags": ["tag1", "tag2"],
  "entities": {
    "companies": [{"name": "Related Company"}],
    "people": [{"name": "Author Name", "title": "Title"}]
  }
}`;
      break;

    default:
      // Generic / custom content type
      prompt = `Generate content for ${publication.name}.

`;
      if (input.title) prompt += `TITLE/TOPIC: ${input.title}\n`;
      if (input.rawText) prompt += `SOURCE TEXT:\n${input.rawText}\n`;
      if (input.additionalContext) prompt += `CONTEXT: ${input.additionalContext}\n`;
      prompt += `
Return JSON with:
{
  "title": "Content Title",
  "content": "Full content (HTML)",
  "excerpt": "Brief summary",
  "seoTitle": "SEO title",
  "seoDescription": "SEO description",
  "suggestedTags": ["tag1", "tag2"],
  "entities": {
    "companies": [],
    "people": [],
    "investors": [],
    "fundingRounds": [],
    "accelerators": [],
    "events": []
  }
}`;
  }

  return prompt;
}

// ============================================================
// CONTENT SCHEMA FOR JSON MODE
// ============================================================

function getContentSchema(contentType: string): any {
  // Base schema that works across content types
  return {
    type: "object",
    properties: {
      title: { type: "string", description: "Content title" },
      content: { type: "string", description: "Full HTML content body" },
      description: { type: "string", description: "Full description if applicable" },
      excerpt: { type: "string", description: "Brief summary" },
      seoTitle: { type: "string", description: "SEO-optimized title" },
      seoDescription: { type: "string", description: "SEO meta description" },
      articleType: { type: "string", description: "Type of article" },
      suggestedTags: { type: "array", items: { type: "string" }, description: "Suggested tags" },
      suggestedCategory: { type: "string", description: "Suggested category" },
      entities: {
        type: "object",
        properties: {
          companies: { type: "array", items: { type: "object", additionalProperties: true } },
          people: { type: "array", items: { type: "object", additionalProperties: true } },
          investors: { type: "array", items: { type: "object", additionalProperties: true } },
          fundingRounds: { type: "array", items: { type: "object", additionalProperties: true } },
          accelerators: { type: "array", items: { type: "object", additionalProperties: true } },
          events: { type: "array", items: { type: "object", additionalProperties: true } },
        },
        additionalProperties: true,
      },
      // Extra fields for specific content types
      name: { type: "string" },
      tagline: { type: "string" },
      shortDescription: { type: "string" },
      shortBio: { type: "string" },
      bio: { type: "string" },
      website: { type: "string" },
      linkedIn: { type: "string" },
      twitter: { type: "string" },
      type: { type: "string" },
      format: { type: "string" },
      location: { type: "string" },
      industry: { type: "string" },
      foundedYear: { type: "number" },
      stage: { type: "string" },
      employeeCount: { type: "string" },
      mission: { type: "string" },
      company: { type: "string" },
      headquarters: { type: "string" },
      investmentFocus: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      venue: { type: "string" },
      city: { type: "string" },
      country: { type: "string" },
      provider: { type: "string" },
    },
    required: ["title"],
    additionalProperties: true,
  };
}

// ============================================================
// ENTITY EXTRACTION & MATCHING
// ============================================================

async function extractAndMatchEntities(
  content: string,
  title: string,
  rawEntities: any,
  sessionId: number
): Promise<ExtractedEntity[]> {
  const db = await getDb();
  if (!db) return [];

  const results: ExtractedEntity[] = [];
  const entityGroups = rawEntities || {};

  // Process companies
  for (const comp of entityGroups.companies || []) {
    const match = await matchEntity("company", comp.name, db);
    const entity: ExtractedEntity = {
      type: "company",
      name: comp.name,
      data: comp,
      confidence: match ? "high" : "medium",
      matchStatus: match ? "existing" : "new",
      existingId: match?.id,
      mentionType: comp.role || "mentioned",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "company",
      extractedName: comp.name,
      extractedData: comp,
      confidence: entity.confidence,
      matchStatus: entity.matchStatus,
      matchedEntityId: match?.id || null,
      mentionType: entity.mentionType,
    } as any);
  }

  // Process people
  for (const person of entityGroups.people || []) {
    const match = await matchEntity("person", person.name, db);
    const entity: ExtractedEntity = {
      type: "person",
      name: person.name,
      data: person,
      confidence: match ? "high" : "medium",
      matchStatus: match ? "existing" : "new",
      existingId: match?.id,
      mentionType: person.role || "mentioned",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "person",
      extractedName: person.name,
      extractedData: person,
      confidence: entity.confidence,
      matchStatus: entity.matchStatus,
      matchedEntityId: match?.id || null,
      mentionType: entity.mentionType,
    } as any);
  }

  // Process investors
  for (const inv of entityGroups.investors || []) {
    const match = await matchEntity("investor", inv.name, db);
    const entity: ExtractedEntity = {
      type: "investor",
      name: inv.name,
      data: inv,
      confidence: match ? "high" : "medium",
      matchStatus: match ? "existing" : "new",
      existingId: match?.id,
      mentionType: inv.role || "mentioned",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "investor",
      extractedName: inv.name,
      extractedData: inv,
      confidence: entity.confidence,
      matchStatus: entity.matchStatus,
      matchedEntityId: match?.id || null,
      mentionType: entity.mentionType,
    } as any);
  }

  // Process funding rounds
  for (const round of entityGroups.fundingRounds || []) {
    const entity: ExtractedEntity = {
      type: "funding_round",
      name: `${round.companyName || "Unknown"} - ${round.roundType || "Unknown"} Round`,
      data: round,
      confidence: round.amount ? "high" : "medium",
      matchStatus: "new",
      mentionType: "primary",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "funding_round",
      extractedName: entity.name,
      extractedData: round,
      confidence: entity.confidence,
      matchStatus: "new",
      mentionType: "primary",
    } as any);
  }

  // Process accelerators
  for (const acc of entityGroups.accelerators || []) {
    const match = await matchEntity("accelerator", acc.name, db);
    const entity: ExtractedEntity = {
      type: "accelerator",
      name: acc.name,
      data: acc,
      confidence: match ? "high" : "medium",
      matchStatus: match ? "existing" : "new",
      existingId: match?.id,
      mentionType: "mentioned",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "accelerator",
      extractedName: acc.name,
      extractedData: acc,
      confidence: entity.confidence,
      matchStatus: entity.matchStatus,
      matchedEntityId: match?.id || null,
      mentionType: "mentioned",
    } as any);
  }

  // Process events
  for (const evt of entityGroups.events || []) {
    const match = await matchEntity("event", evt.name, db);
    const entity: ExtractedEntity = {
      type: "event",
      name: evt.name,
      data: evt,
      confidence: match ? "high" : "medium",
      matchStatus: match ? "existing" : "new",
      existingId: match?.id,
      mentionType: "mentioned",
    };
    results.push(entity);

    await db.insert(aiEntityExtractions).values({
      sessionId,
      entityType: "event",
      extractedName: evt.name,
      extractedData: evt,
      confidence: entity.confidence,
      matchStatus: entity.matchStatus,
      matchedEntityId: match?.id || null,
      mentionType: "mentioned",
    } as any);
  }

  return results;
}

// Fuzzy entity matching against existing database records
async function matchEntity(type: string, name: string, db: any): Promise<{ id: number; name: string } | null> {
  if (!name || name.length < 2) return null;

  const cleanName = name.trim();
  const searchPattern = `%${cleanName}%`;

  try {
    switch (type) {
      case "company": {
        const matches = await db.select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(like(companies.name, searchPattern))
          .limit(5);
        return findBestMatch(cleanName, matches);
      }
      case "person": {
        const matches = await db.select({ id: people.id, name: people.name })
          .from(people)
          .where(like(people.name, searchPattern))
          .limit(5);
        return findBestMatch(cleanName, matches);
      }
      case "investor": {
        const matches = await db.select({ id: investors.id, name: investors.name })
          .from(investors)
          .where(like(investors.name, searchPattern))
          .limit(5);
        return findBestMatch(cleanName, matches);
      }
      case "accelerator": {
        const matches = await db.select({ id: accelerators.id, name: accelerators.name })
          .from(accelerators)
          .where(like(accelerators.name, searchPattern))
          .limit(5);
        return findBestMatch(cleanName, matches);
      }
      case "event": {
        const matches = await db.select({ id: events.id, name: events.title })
          .from(events)
          .where(like(events.title, searchPattern))
          .limit(5);
        return findBestMatch(cleanName, matches);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function findBestMatch(searchName: string, candidates: { id: number; name: string }[]): { id: number; name: string } | null {
  if (!candidates.length) return null;

  const search = searchName.toLowerCase().trim();

  // Exact match first
  const exact = candidates.find(c => c.name.toLowerCase().trim() === search);
  if (exact) return exact;

  // Contains match
  const contains = candidates.find(c =>
    c.name.toLowerCase().includes(search) || search.includes(c.name.toLowerCase())
  );
  if (contains) return contains;

  // Clean match (remove suffixes)
  const suffixes = [" inc", " inc.", " llc", " ltd", " limited", " corp", " corporation", " co", " company", " group", " holdings", " capital", " ventures", " partners", " fund"];
  let cleanSearch = search;
  for (const suffix of suffixes) {
    cleanSearch = cleanSearch.replace(new RegExp(suffix + "$", "i"), "").trim();
  }
  const cleanMatch = candidates.find(c => {
    let cleanCandidate = c.name.toLowerCase().trim();
    for (const suffix of suffixes) {
      cleanCandidate = cleanCandidate.replace(new RegExp(suffix + "$", "i"), "").trim();
    }
    return cleanCandidate === cleanSearch;
  });
  if (cleanMatch) return cleanMatch;

  return null;
}

// ============================================================
// IMAGE SEARCH
// ============================================================

async function searchArticleImage(title: string, contentType: string): Promise<{ url: string; alt: string } | null> {
  try {
    // Use the built-in Forge API for image search
    const { ENV } = await import("../../_core/env");
    const forgeUrl = ENV.forgeApiUrl;
    const forgeKey = ENV.forgeApiKey;

    if (!forgeUrl || !forgeKey) return null;

    // Search for a relevant image using the Forge API search endpoint
    const searchQuery = `${title} ${contentType === "article" ? "industry infrastructure" : contentType}`;
    const response = await fetch(`${forgeUrl.replace(/\/+$/, "")}/v1/search/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        count: 5,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const images = data.results || data.images || [];

    if (images.length > 0) {
      const bestImage = images[0];
      return {
        url: bestImage.url || bestImage.thumbnailUrl || bestImage.contentUrl,
        alt: bestImage.name || bestImage.description || title,
      };
    }

    return null;
  } catch (err) {
    console.error("[AI] Image search error:", err);
    return null;
  }
}

// Public image search for the router
export async function searchImages(query: string, count: number = 10): Promise<Array<{ url: string; alt: string; thumbnail?: string; source?: string }>> {
  try {
    const { ENV } = await import("../../_core/env");
    const forgeUrl = ENV.forgeApiUrl;
    const forgeKey = ENV.forgeApiKey;

    if (!forgeUrl || !forgeKey) return [];

    const response = await fetch(`${forgeUrl.replace(/\/+$/, "")}/v1/search/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({ query, count }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const images = data.results || data.images || [];

    return images.map((img: any) => ({
      url: img.url || img.contentUrl || img.thumbnailUrl,
      alt: img.name || img.description || query,
      thumbnail: img.thumbnailUrl || img.thumbnail,
      source: img.hostPageUrl || img.sourceUrl,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// PUBLISH TO PLATFORM
// ============================================================

export async function publishGeneratedContent(
  sessionId: number,
  userId: number,
  overrides?: {
    title?: string;
    content?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    featuredImageId?: number;
    categoryIds?: number[];
    tagIds?: number[];
    articleType?: string;
    seoKeywords?: string;
    focusKeywordId?: number;
    primaryCategoryId?: number;
    createEntities?: boolean;
  }
): Promise<{ articleId?: number; entityId?: number; entityType?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the session
  const [session] = await db.select().from(aiGenerationSessions).where(eq(aiGenerationSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  const generatedData = session.generatedData as any;
  const contentType = session.contentType;

  if (contentType === "article") {
    // Import workflow service
    const { workflowService } = await import("../workflow.service");
    const { slugService } = await import("../slug.service");

    // Use "submitted" status for the approval flow (not "draft")
    const submittedStatus = await workflowService.getStatusBySlug("editorial", "submitted");
    const initialStatus = submittedStatus || await workflowService.getInitialStatus("editorial");
    if (!initialStatus) throw new Error("Workflow not initialized");

    const title = overrides?.title || session.generatedTitle || "Untitled";
    const slug = await slugService.generateUniqueSlug("article", slugService.generateSlug(title));

    // Create the article
    await db.insert(articles).values({
      title,
      slug,
      excerpt: overrides?.excerpt || session.generatedExcerpt || "",
      content: overrides?.content || session.generatedContent || "",
      featuredImageId: overrides?.featuredImageId || null,
      authorId: userId,
      statusId: initialStatus.id,
      articleType: (overrides?.articleType || generatedData?.articleType || "news") as any,
      seoTitle: overrides?.seoTitle || session.generatedSeoTitle || "",
      seoDescription: overrides?.seoDescription || session.generatedSeoDescription || "",
      seoKeywords: overrides?.seoKeywords || "",
      focusKeywordId: overrides?.focusKeywordId || null,
      primaryCategoryId: overrides?.primaryCategoryId || null,
      robotsIndexing: "index",
    } as any);

    const [inserted] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    const articleId = inserted.id;

    // Link entities to article
    if (overrides?.createEntities !== false) {
      await linkEntitiesToArticle(sessionId, articleId, userId, db);
    }

    // Link categories
    if (overrides?.categoryIds?.length) {
      for (const catId of overrides.categoryIds) {
        await db.insert(articleCategories).values({ articleId, categoryId: catId } as any).catch(() => {});
      }
      // Set primary category to the first one
      await db.update(articles).set({ primaryCategoryId: overrides.categoryIds[0] } as any).where(eq(articles.id, articleId));
    }
    // Link tags
    if (overrides?.tagIds?.length) {
      for (const tagId of overrides.tagIds) {
        await db.insert(articleTags).values({ articleId, tagId } as any).catch(() => {});
      }
    }

    // Update session
    await db.update(aiGenerationSessions).set({
      articleId,
      approvalStatus: "published",
      approvedBy: userId,
      approvedAt: toDbDate(new Date()),
    } as any).where(eq(aiGenerationSessions.id, sessionId));

    return { articleId };
  }

  // For other content types, return the entity data for manual creation
  return { entityType: contentType };
}

// ============================================================
// ENTITY LINKING
// ============================================================

async function linkEntitiesToArticle(sessionId: number, articleId: number, userId: number, db: any): Promise<void> {
  const extractions = await db.select().from(aiEntityExtractions)
    .where(eq(aiEntityExtractions.sessionId, sessionId));

  for (const extraction of extractions) {
    try {
      const entityType = extraction.entityType;
      const data = extraction.extractedData as any;
      let entityId = extraction.matchedEntityId;

      // Create new entity if no match found
      if (!entityId && extraction.matchStatus === "new") {
        entityId = await createEntityFromExtraction(entityType, data, userId, db);
      }

      if (!entityId) continue;

      // Link entity to article
      switch (entityType) {
        case "company":
          await db.insert(articleCompanies).values({
            articleId,
            companyId: entityId,
            mentionType: extraction.mentionType || "mentioned",
          } as any).onDuplicateKeyUpdate({ set: { mentionType: extraction.mentionType || "mentioned" } });
          break;
        case "person":
          await db.insert(articlePeople).values({
            articleId,
            personId: entityId,
            mentionType: extraction.mentionType || "mentioned",
          } as any).onDuplicateKeyUpdate({ set: { mentionType: extraction.mentionType || "mentioned" } });
          break;
        case "investor":
          await db.insert(articleInvestors).values({
            articleId,
            investorId: entityId,
            mentionType: extraction.mentionType || "mentioned",
          } as any).onDuplicateKeyUpdate({ set: { mentionType: extraction.mentionType || "mentioned" } });
          break;
        case "accelerator":
          await db.insert(articleAccelerators).values({
            articleId,
            acceleratorId: entityId,
          } as any).onDuplicateKeyUpdate({ set: { acceleratorId: entityId } });
          break;
        case "event":
          await db.insert(articleEvents).values({
            articleId,
            eventId: entityId,
          } as any).onDuplicateKeyUpdate({ set: { eventId: entityId } });
          break;
      }
    } catch (err) {
      console.error(`[AI] Failed to link entity ${extraction.extractedName}:`, err);
    }
  }
}

async function createEntityFromExtraction(type: string, data: any, userId: number, db: any): Promise<number | null> {
  try {
    const { slugService } = await import("../slug.service");
    const { workflowService } = await import("../workflow.service");

    switch (type) {
      case "company": {
        const slug = await slugService.generateUniqueSlug("company", slugService.generateSlug(data.name));
        const status = await workflowService.getInitialStatus("company");
        const [result] = await db.insert(companies).values({
          name: data.name,
          slug,
          tagline: data.tagline || data.description?.substring(0, 200) || null,
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          website: data.website || null,
          linkedIn: data.linkedIn || null,
          twitter: data.twitter || null,
          industry: data.industry || null,
          location: data.location || null,
          foundedYear: data.foundedYear || null,
          employeeCount: data.employeeCount || null,
          stage: data.stage || null,
          mission: data.mission || null,
          statusId: status?.id || 1,
          createdByUserId: userId,
        } as any);
        return result.insertId;
      }
      case "person": {
        const slug = await slugService.generateUniqueSlug("person", slugService.generateSlug(data.name));
        const status = await workflowService.getInitialStatus("person");
        const [result] = await db.insert(people).values({
          name: data.name,
          slug,
          title: data.title || null,
          company: data.company || null,
          bio: data.bio || null,
          shortBio: data.shortBio || null,
          linkedIn: data.linkedIn || null,
          twitter: data.twitter || null,
          website: data.website || null,
          location: data.location || null,
          statusId: status?.id || 1,
          createdByUserId: userId,
        } as any);
        return result.insertId;
      }
      case "investor": {
        const slug = await slugService.generateUniqueSlug("investor", slugService.generateSlug(data.name));
        const status = await workflowService.getInitialStatus("investor");
        const [result] = await db.insert(investors).values({
          name: data.name,
          slug,
          type: data.type || "vc",
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          website: data.website || null,
          linkedIn: data.linkedIn || null,
          headquarters: data.headquarters || null,
          foundedYear: data.foundedYear || null,
          statusId: status?.id || 1,
          createdByUserId: userId,
        } as any);
        return result.insertId;
      }
      default:
        return null;
    }
  } catch (err) {
    console.error(`[AI] Failed to create ${type} entity:`, err);
    return null;
  }
}

// ============================================================
// REWRITE / ENHANCE EXISTING CONTENT
// ============================================================

export async function rewriteContent(
  existingContent: string,
  existingTitle: string,
  instructions: string,
  provider?: LLMProvider,
  model?: string,
  policyId?: number,
  userId?: number
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "article",
    sessionType: "rewrite",
    title: existingTitle,
    rawText: existingContent,
    additionalContext: `REWRITE INSTRUCTIONS: ${instructions}`,
    provider,
    model,
    policyId,
    userId,
  });
}

export async function enhanceContent(
  existingContent: string,
  existingTitle: string,
  enhanceType: "seo" | "readability" | "expand" | "shorten" | "tone",
  provider?: LLMProvider,
  model?: string,
  userId?: number
): Promise<GeneratedContent> {
  const instructions: Record<string, string> = {
    seo: "Enhance this content for SEO. Improve keyword density, add relevant H2/H3 headings, optimize meta description. Keep the same facts and tone.",
    readability: "Improve readability. Break long paragraphs, simplify complex sentences, improve flow. Keep all facts intact.",
    expand: "Expand this content with more detail, context, and analysis. Add relevant background about the companies, projects and markets involved.",
    shorten: "Condense this content to be more concise while keeping all key facts and quotes. Target 60% of current length.",
    tone: "Adjust the tone to be more professional and authoritative, matching a serious business newsroom covering industry and infrastructure.",
  };

  return generateContent({
    contentType: "article",
    sessionType: "enhance",
    title: existingTitle,
    rawText: existingContent,
    additionalContext: instructions[enhanceType] || instructions.readability,
    provider,
    model,
    userId,
  });
}
