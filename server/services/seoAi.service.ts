import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { keywords, tags } from "../../drizzle/schema";
import { eq, like, or, and, desc, sql, inArray } from "drizzle-orm";

export interface SeoSuggestions {
  seoTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  additionalKeywords: string[];
}

export interface KeywordSuggestion {
  id: number;
  name: string;
  slug: string;
  keywordType: "primary" | "secondary";
  category: string | null;
  isFromDatabase: boolean;
}

export interface TagSuggestion {
  id: number;
  name: string;
  slug: string;
  tagType: string;
  isFromDatabase: boolean;
}

export interface AiSeoSuggestions {
  focusKeyword: KeywordSuggestion | null;
  additionalKeywords: KeywordSuggestion[];
  googleNewsKeywords: string[];
  tags: TagSuggestion[];
  seoTitle: string;
  metaDescription: string;
}

/**
 * Search keywords from database by term
 */
export async function searchKeywords(
  term: string,
  type?: "primary" | "secondary",
  limit: number = 20
): Promise<KeywordSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(keywords.isActive, 1),
    like(keywords.name, `%${term}%`)
  ];
  
  if (type) {
    conditions.push(eq(keywords.keywordType, type));
  }
  
  const results = await db
    .select({
      id: keywords.id,
      name: keywords.name,
      slug: keywords.slug,
      keywordType: keywords.keywordType,
      category: keywords.category,
      usageCount: keywords.usageCount,
    })
    .from(keywords)
    .where(and(...conditions))
    .orderBy(desc(keywords.usageCount))
    .limit(limit);
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug || "",
    keywordType: r.keywordType as "primary" | "secondary",
    category: r.category,
    isFromDatabase: true,
  }));
}

/**
 * Search tags from database by term
 */
export async function searchTags(
  term: string,
  tagType?: string,
  limit: number = 20
): Promise<TagSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(tags.isActive, 1),
    like(tags.name, `%${term}%`)
  ];
  
  if (tagType) {
    conditions.push(eq(tags.tagType, tagType as any));
  }
  
  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      tagType: tags.tagType,
    })
    .from(tags)
    .where(and(...conditions))
    .orderBy(tags.sortOrder)
    .limit(limit);
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    tagType: r.tagType || "general",
    isFromDatabase: true,
  }));
}

/**
 * Get all primary keywords for dropdown
 */
export async function getPrimaryKeywords(limit: number = 100): Promise<KeywordSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      id: keywords.id,
      name: keywords.name,
      slug: keywords.slug,
      keywordType: keywords.keywordType,
      category: keywords.category,
      usageCount: keywords.usageCount,
    })
    .from(keywords)
    .where(and(
      eq(keywords.isActive, 1),
      eq(keywords.keywordType, "primary")
    ))
    .orderBy(desc(keywords.usageCount))
    .limit(limit);
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug || "",
    keywordType: "primary" as const,
    category: r.category,
    isFromDatabase: true,
  }));
}

/**
 * Get all secondary keywords for dropdown
 */
export async function getSecondaryKeywords(limit: number = 200): Promise<KeywordSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      id: keywords.id,
      name: keywords.name,
      slug: keywords.slug,
      keywordType: keywords.keywordType,
      category: keywords.category,
      usageCount: keywords.usageCount,
    })
    .from(keywords)
    .where(and(
      eq(keywords.isActive, 1),
      eq(keywords.keywordType, "secondary")
    ))
    .orderBy(desc(keywords.usageCount))
    .limit(limit);
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug || "",
    keywordType: "secondary" as const,
    category: r.category,
    isFromDatabase: true,
  }));
}

/**
 * Get all tags grouped by type
 */
export async function getAllTags(): Promise<{ [key: string]: TagSuggestion[] }> {
  const db = await getDb();
  if (!db) return {};
  
  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      tagType: tags.tagType,
    })
    .from(tags)
    .where(eq(tags.isActive, 1))
    .orderBy(tags.sortOrder);
  
  const grouped: { [key: string]: TagSuggestion[] } = {};
  
  for (const tag of results) {
    const type = tag.tagType || "general";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      tagType: type,
      isFromDatabase: true,
    });
  }
  
  return grouped;
}

/**
 * AI-powered SEO suggestions that match against database keywords and tags
 */
export async function generateAiSeoSuggestions(
  title: string,
  content: string,
  excerpt?: string,
  categoryName?: string
): Promise<AiSeoSuggestions> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 3000);
  
  // Get available keywords and tags from database for context
  const [primaryKws, secondaryKws, allTags] = await Promise.all([
    db.select({ name: keywords.name }).from(keywords)
      .where(and(eq(keywords.isActive, 1), eq(keywords.keywordType, "primary")))
      .limit(100),
    db.select({ name: keywords.name }).from(keywords)
      .where(and(eq(keywords.isActive, 1), eq(keywords.keywordType, "secondary")))
      .limit(200),
    db.select({ name: tags.name, tagType: tags.tagType }).from(tags)
      .where(eq(tags.isActive, 1))
      .limit(200),
  ]);
  
  const primaryKeywordList = primaryKws.map(k => k.name).join(", ");
  const secondaryKeywordList = secondaryKws.map(k => k.name).join(", ");
  const tagList = allTags.map(t => `${t.name} (${t.tagType})`).join(", ");
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an SEO expert for TechScoop, a tech news publication focused on MENA region (Saudi Arabia, UAE, Egypt, Pakistan, Turkey, Qatar, Bahrain, etc.) startups, funding, and technology.

Your task is to analyze article content and suggest SEO elements that match our keyword and tag database.

IMPORTANT RULES:
1. Focus Keyword: Select exactly 1 primary keyword from our database that best matches the article
2. Additional Keywords: Select 2-5 secondary keywords from our database (max 5)
3. Google News Keywords: Suggest up to 5 comma-separated keywords for Google News classification (max 5)
4. Tags: Select 2-5 tags from our database (max 5)
5. SEO Title: 50-60 characters, include primary keyword
6. Meta Description: 150-160 characters, include call-to-action

AVAILABLE PRIMARY KEYWORDS (choose 1):
${primaryKeywordList}

AVAILABLE SECONDARY KEYWORDS (choose 2-5):
${secondaryKeywordList}

AVAILABLE TAGS (choose 2-5):
${tagList}

If no exact match exists in our database, suggest the closest match or return the most relevant option.`
      },
      {
        role: "user",
        content: `Analyze this article and provide SEO suggestions:

Title: ${title}
${categoryName ? `Category: ${categoryName}` : ''}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Content:
${plainContent}

Return suggestions in JSON format with exact matches from our database where possible.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_seo_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            focusKeyword: {
              type: "string",
              description: "Exactly 1 primary keyword from database"
            },
            additionalKeywords: {
              type: "array",
              items: { type: "string" },
              description: "2-5 secondary keywords from database"
            },
            googleNewsKeywords: {
              type: "array",
              items: { type: "string" },
              description: "Up to 5 Google News keywords (max 5)"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "2-5 tags from database"
            },
            seoTitle: {
              type: "string",
              description: "Optimized SEO title (50-60 characters)"
            },
            metaDescription: {
              type: "string",
              description: "Meta description (150-160 characters)"
            }
          },
          required: ["focusKeyword", "additionalKeywords", "googleNewsKeywords", "tags", "seoTitle", "metaDescription"],
          additionalProperties: false
        }
      }
    }
  });

  const contentResponse = response.choices[0]?.message?.content;
  if (!contentResponse || typeof contentResponse !== 'string') {
    throw new Error("No response from LLM");
  }

  const aiSuggestions = JSON.parse(contentResponse);
  
  // Match AI suggestions to database records
  const focusKeywordMatch = await db
    .select({
      id: keywords.id,
      name: keywords.name,
      slug: keywords.slug,
      keywordType: keywords.keywordType,
      category: keywords.category,
    })
    .from(keywords)
    .where(and(
      eq(keywords.isActive, 1),
      eq(keywords.keywordType, "primary"),
      like(keywords.name, `%${aiSuggestions.focusKeyword}%`)
    ))
    .limit(1);
  
  const additionalKeywordMatches = await Promise.all(
    aiSuggestions.additionalKeywords.slice(0, 5).map(async (kw: string) => {
      const match = await db
        .select({
          id: keywords.id,
          name: keywords.name,
          slug: keywords.slug,
          keywordType: keywords.keywordType,
          category: keywords.category,
        })
        .from(keywords)
        .where(and(
          eq(keywords.isActive, 1),
          like(keywords.name, `%${kw}%`)
        ))
        .limit(1);
      
      if (match.length > 0) {
        return {
          id: match[0].id,
          name: match[0].name,
          slug: match[0].slug || "",
          keywordType: match[0].keywordType as "primary" | "secondary",
          category: match[0].category,
          isFromDatabase: true,
        };
      }
      return null;
    })
  );
  
  const tagMatches = await Promise.all(
    aiSuggestions.tags.slice(0, 5).map(async (tagName: string) => {
      const match = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          tagType: tags.tagType,
        })
        .from(tags)
        .where(and(
          eq(tags.isActive, 1),
          like(tags.name, `%${tagName}%`)
        ))
        .limit(1);
      
      if (match.length > 0) {
        return {
          id: match[0].id,
          name: match[0].name,
          slug: match[0].slug,
          tagType: match[0].tagType || "general",
          isFromDatabase: true,
        };
      }
      return null;
    })
  );
  
  return {
    focusKeyword: focusKeywordMatch.length > 0 ? {
      id: focusKeywordMatch[0].id,
      name: focusKeywordMatch[0].name,
      slug: focusKeywordMatch[0].slug || "",
      keywordType: focusKeywordMatch[0].keywordType as "primary" | "secondary",
      category: focusKeywordMatch[0].category,
      isFromDatabase: true,
    } : null,
    additionalKeywords: additionalKeywordMatches.filter((k): k is KeywordSuggestion => k !== null),
    googleNewsKeywords: aiSuggestions.googleNewsKeywords.slice(0, 10),
    tags: tagMatches.filter((t): t is TagSuggestion => t !== null),
    seoTitle: aiSuggestions.seoTitle,
    metaDescription: aiSuggestions.metaDescription,
  };
}

/**
 * Increment usage count for a keyword
 */
export async function incrementKeywordUsage(keywordId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(keywords)
    .set({ usageCount: sql`${keywords.usageCount} + 1` } as any)
    .where(eq(keywords.id, keywordId));
}

// Legacy functions for backward compatibility
export async function generateSeoSuggestions(
  title: string,
  content: string,
  excerpt?: string
): Promise<SeoSuggestions> {
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 3000);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an SEO expert for a tech news publication focused on MENA region startups, funding, and technology. 
Your task is to analyze article content and suggest optimized SEO elements.

Guidelines:
- SEO Title: 50-60 characters, include primary keyword, compelling for clicks
- Meta Description: 150-160 characters, include call-to-action, summarize value
- Focus Keywords: 3-5 primary keywords that the article should rank for
- Additional Keywords: 5-10 secondary/long-tail keywords for broader coverage

Focus on keywords relevant to: MENA tech ecosystem, Saudi Arabia, UAE, Egypt, startups, funding rounds, venture capital, fintech, AI, etc.`
      },
      {
        role: "user",
        content: `Analyze this article and provide SEO suggestions:

Title: ${title}

${excerpt ? `Excerpt: ${excerpt}\n` : ''}

Content:
${plainContent}

Provide SEO suggestions in JSON format.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            seoTitle: {
              type: "string",
              description: "Optimized SEO title (50-60 characters)"
            },
            metaDescription: {
              type: "string", 
              description: "Meta description (150-160 characters)"
            },
            focusKeywords: {
              type: "array",
              items: { type: "string" },
              description: "3-5 primary focus keywords"
            },
            additionalKeywords: {
              type: "array",
              items: { type: "string" },
              description: "5-10 secondary/long-tail keywords"
            }
          },
          required: ["seoTitle", "metaDescription", "focusKeywords", "additionalKeywords"],
          additionalProperties: false
        }
      }
    }
  });

  const content_response = response.choices[0]?.message?.content;
  if (!content_response || typeof content_response !== 'string') {
    throw new Error("No response from LLM");
  }

  return JSON.parse(content_response) as SeoSuggestions;
}

export async function suggestSeoTitle(title: string, content: string): Promise<string> {
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 2000);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an SEO expert. Generate an optimized SEO title (50-60 characters) for a tech news article. Include primary keyword, make it compelling for clicks. Return only the title text, nothing else."
      },
      {
        role: "user",
        content: `Original Title: ${title}\n\nContent Preview: ${plainContent.slice(0, 500)}`
      }
    ]
  });

  const result = response.choices[0]?.message?.content;
  return typeof result === 'string' ? result.trim() : title;
}

export async function suggestMetaDescription(title: string, content: string, excerpt?: string): Promise<string> {
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 2000);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an SEO expert. Generate an optimized meta description (150-160 characters) for a tech news article. Include a call-to-action and summarize the value. Return only the description text, nothing else."
      },
      {
        role: "user",
        content: `Title: ${title}\n\n${excerpt ? `Excerpt: ${excerpt}\n\n` : ''}Content Preview: ${plainContent.slice(0, 500)}`
      }
    ]
  });

  const result = response.choices[0]?.message?.content;
  return typeof result === 'string' ? result.trim() : (excerpt || '');
}

export async function suggestKeywords(title: string, content: string): Promise<{ focus: string[]; additional: string[] }> {
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 2000);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an SEO expert for MENA tech news. Suggest keywords for the article.
Return JSON with two arrays: "focus" (3-5 primary keywords) and "additional" (5-10 secondary keywords).
Focus on: MENA startups, Saudi Arabia tech, UAE innovation, funding rounds, venture capital, fintech, AI, etc.`
      },
      {
        role: "user",
        content: `Title: ${title}\n\nContent: ${plainContent}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "keyword_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            focus: {
              type: "array",
              items: { type: "string" }
            },
            additional: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["focus", "additional"],
          additionalProperties: false
        }
      }
    }
  });

  const content_response = response.choices[0]?.message?.content;
  if (!content_response || typeof content_response !== 'string') {
    return { focus: [], additional: [] };
  }

  return JSON.parse(content_response);
}
