/**
 * AI-powered Entity Suggestion Service
 * Analyzes article content to suggest companies, people, locations, funding, and tags
 */

import { EDITORIAL_SHORT } from "../config/editorial";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { companies, people, investors, accelerators, events, countries, geoRegions, cities, tags } from "../../drizzle/schema";
import { eq, like, and, desc, sql } from "drizzle-orm";

// ============================================================
// TYPES
// ============================================================

export interface EntitySuggestion {
  name: string;
  mentionType: "primary" | "mentioned" | "interview" | "investor_in_round" | "partner";
  confidence: "high" | "medium" | "low";
  reason: string;
  existingId?: number;
}

export interface LocationSuggestion {
  country: string;
  countryName: string;
  region?: string;
  regionName?: string;
  city?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface FundingSuggestion {
  companyName: string;
  roundType: string;
  amount?: string;
  currency?: string;
  date?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  existingCompanyId?: number;
}

export interface TagSuggestion {
  name: string;
  tagType: string;
  confidence: "high" | "medium" | "low";
  existingId?: number;
}

export interface EntityAiSuggestions {
  companies: EntitySuggestion[];
  people: EntitySuggestion[];
  investors: EntitySuggestion[];
  accelerators: EntitySuggestion[];
  events: EntitySuggestion[];
}

export interface LocationAiSuggestions {
  locations: LocationSuggestion[];
}

export interface FundingAiSuggestions {
  fundingRounds: FundingSuggestion[];
}

export interface TagAiSuggestions {
  tags: TagSuggestion[];
}

// ============================================================
// ENTITY SUGGESTIONS
// ============================================================

/**
 * AI-powered entity suggestions from article content
 */
// Helper function for fuzzy name matching
function fuzzyMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Remove common suffixes and compare
  const suffixes = [' inc', ' inc.', ' llc', ' ltd', ' limited', ' corp', ' corporation', ' co', ' company', ' group', ' holdings', ' capital', ' ventures', ' partners', ' fund'];
  let clean1 = n1;
  let clean2 = n2;
  for (const suffix of suffixes) {
    clean1 = clean1.replace(new RegExp(suffix + '$', 'i'), '');
    clean2 = clean2.replace(new RegExp(suffix + '$', 'i'), '');
  }
  if (clean1 === clean2) return true;
  
  return false;
}

export async function suggestEntities(
  title: string,
  content: string,
  excerpt?: string
): Promise<EntityAiSuggestions> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 5000);
  
  // Get existing entities from database for context (more entities for better matching)
  const [existingCompanies, existingPeople, existingInvestors, existingAccelerators, existingEvents] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).limit(500),
    db.select({ id: people.id, name: people.name, title: people.title }).from(people).limit(500),
    db.select({ id: investors.id, name: investors.name }).from(investors).limit(500),
    db.select({ id: accelerators.id, name: accelerators.name }).from(accelerators).limit(200),
    db.select({ id: events.id, name: events.title }).from(events).limit(300),
  ]);
  
  const companyList = existingCompanies.map(c => c.name).join(", ");
  const peopleList = existingPeople.map(p => p.name).join(", ");
  const investorList = existingInvestors.map(i => i.name).join(", ");
  const acceleratorList = existingAccelerators.map(a => a.name).join(", ");
  const eventList = existingEvents.map(e => e.name).join(", ");
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an entity extraction expert for ${EDITORIAL_SHORT}.

Your task is to identify and extract entities mentioned in article content:
1. Companies - Startups, tech companies, corporations mentioned
2. People - Founders, executives, investors, experts quoted or mentioned. ALWAYS look for and extract people even if the article focuses on funding news. Check for:
   - Founders/Co-founders of the main company
   - CEO, CTO, COO and other executives
   - Managing Partners or Partners at investor firms
   - Anyone quoted in the article
   - Anyone whose name appears in the article
   PRIORITIZE founders and CEOs - they should be listed first with "primary" mentionType.
3. Investors - VCs, angel investors, investment firms mentioned
4. Accelerators - Startup programs, incubators mentioned
5. Events - Conferences, summits, tech events mentioned

IMPORTANT: Even if no specific people are named in the article, try to identify the likely founders/executives of the main company if they can be inferred.

For each entity, determine:
- mentionType: "primary" (main subject), "mentioned" (referenced), "interview" (quoted), "investor_in_round" (participated in funding), "partner" (partnership)
- confidence: "high" (clearly mentioned), "medium" (likely mentioned), "low" (possibly mentioned)
- reason: Brief explanation of why this entity was identified. For people, include their role (e.g., "CEO of X", "Founder of Y", "Partner at Z")

IMPORTANT: For people, always prioritize founders and executives of the main company in the article. List them first with "primary" mentionType.

EXISTING COMPANIES IN DATABASE (use exact name if match found):
${companyList}

EXISTING PEOPLE IN DATABASE (use exact name if match found):
${peopleList}

EXISTING INVESTORS IN DATABASE (use exact name if match found):
${investorList}

EXISTING ACCELERATORS IN DATABASE (use exact name if match found):
${acceleratorList}

EXISTING EVENTS IN DATABASE (use exact name if match found):
${eventList}

IMPORTANT: If an entity matches one in our database, use the EXACT name from the database. Also include new entities not in our database.`
      },
      {
        role: "user",
        content: `Analyze this article and extract all entities:

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Content:
${plainContent}

Return entities in JSON format.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "entity_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            companies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Company name" },
                  mentionType: { type: "string", enum: ["primary", "mentioned", "interview", "investor_in_round", "partner"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this company was identified" }
                },
                required: ["name", "mentionType", "confidence", "reason"],
                additionalProperties: false
              }
            },
            people: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Person name" },
                  mentionType: { type: "string", enum: ["primary", "mentioned", "interview", "investor_in_round", "partner"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this person was identified" }
                },
                required: ["name", "mentionType", "confidence", "reason"],
                additionalProperties: false
              }
            },
            investors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Investor/VC name" },
                  mentionType: { type: "string", enum: ["primary", "mentioned", "interview", "investor_in_round", "partner"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this investor was identified" }
                },
                required: ["name", "mentionType", "confidence", "reason"],
                additionalProperties: false
              }
            },
            accelerators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Accelerator/incubator name" },
                  mentionType: { type: "string", enum: ["primary", "mentioned", "interview", "investor_in_round", "partner"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this accelerator was identified" }
                },
                required: ["name", "mentionType", "confidence", "reason"],
                additionalProperties: false
              }
            },
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Event name" },
                  mentionType: { type: "string", enum: ["primary", "mentioned", "interview", "investor_in_round", "partner"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this event was identified" }
                },
                required: ["name", "mentionType", "confidence", "reason"],
                additionalProperties: false
              }
            }
          },
          required: ["companies", "people", "investors", "accelerators", "events"],
          additionalProperties: false
        }
      }
    }
  });
  
  const result = JSON.parse(response.choices[0].message.content as string);
  
  // Match with existing database entries using fuzzy matching
  for (const company of result.companies) {
    const match = existingCompanies.find(c => fuzzyMatch(c.name, company.name));
    if (match) {
      company.existingId = match.id;
      company.name = match.name; // Use exact name from database
    }
  }
  
  for (const person of result.people) {
    const match = existingPeople.find(p => fuzzyMatch(p.name, person.name));
    if (match) {
      person.existingId = match.id;
      person.name = match.name; // Use exact name from database
    }
  }
  
  for (const investor of result.investors) {
    const match = existingInvestors.find(i => fuzzyMatch(i.name, investor.name));
    if (match) {
      investor.existingId = match.id;
      investor.name = match.name; // Use exact name from database
    }
  }
  
  for (const accelerator of result.accelerators) {
    const match = existingAccelerators.find(a => fuzzyMatch(a.name, accelerator.name));
    if (match) {
      accelerator.existingId = match.id;
      accelerator.name = match.name; // Use exact name from database
    }
  }
  
  // Match events with database
  for (const event of result.events) {
    const match = existingEvents.find(e => fuzzyMatch(e.name, event.name));
    if (match) {
      event.existingId = match.id;
      event.name = match.name; // Use exact name from database
    }
  }
  
  return result;
}

// ============================================================
// LOCATION SUGGESTIONS
// ============================================================

/**
 * AI-powered location suggestions from article content
 */
export async function suggestLocations(
  title: string,
  content: string,
  excerpt?: string
): Promise<LocationAiSuggestions> {
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 5000);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a geographic entity extraction expert for ${EDITORIAL_SHORT}.

Your task is to identify geographic locations mentioned in article content:
- Countries (use ISO 2-letter codes: US, UK, AE, SA, EG, IN, etc.)
- Regions/States (if mentioned)
- Cities (if mentioned)

Focus on locations that are:
1. Where companies are headquartered
2. Where events take place
3. Where funding rounds occurred
4. Markets being discussed

Common MENA country codes:
- AE: United Arab Emirates
- SA: Saudi Arabia
- EG: Egypt
- PK: Pakistan
- TR: Turkey
- QA: Qatar
- BH: Bahrain
- KW: Kuwait
- OM: Oman
- JO: Jordan
- LB: Lebanon
- MA: Morocco

For each location, determine confidence level:
- high: Explicitly mentioned as relevant location
- medium: Implied or contextually relevant
- low: Possibly related`
      },
      {
        role: "user",
        content: `Analyze this article and extract geographic locations:

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Content:
${plainContent}

Return locations in JSON format with ISO country codes.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "location_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            locations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  country: { type: "string", description: "ISO 2-letter country code" },
                  countryName: { type: "string", description: "Full country name" },
                  region: { type: "string", description: "Region/state code if applicable" },
                  regionName: { type: "string", description: "Full region name if applicable" },
                  city: { type: "string", description: "City name if applicable" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this location was identified" }
                },
                required: ["country", "countryName", "confidence", "reason"],
                additionalProperties: false
              }
            }
          },
          required: ["locations"],
          additionalProperties: false
        }
      }
    }
  });
  
  return JSON.parse(response.choices[0].message.content as string);
}

// ============================================================
// FUNDING SUGGESTIONS
// ============================================================

/**
 * AI-powered funding round suggestions from article content
 */
export async function suggestFunding(
  title: string,
  content: string,
  excerpt?: string
): Promise<FundingAiSuggestions> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 5000);
  
  // Get existing companies for matching
  const existingCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies).limit(200);
  const companyList = existingCompanies.map(c => c.name).join(", ");
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an investment and deal extraction expert for ${EDITORIAL_SHORT}. Deals include project finance, EPC contract values, corporate investment, M&A and funding rounds.

Your task is to identify funding rounds mentioned in article content:
- Company that raised funding
- Round type: pre_seed, seed, series_a, series_b, series_c, series_d_plus, bridge, strategic, venture_debt, grant, undisclosed
- Amount raised (if mentioned)
- Currency (USD, EUR, AED, SAR, etc.)
- Date (if mentioned)

EXISTING COMPANIES IN DATABASE:
${companyList}

For each funding round, determine confidence level:
- high: Explicit funding announcement with details
- medium: Funding mentioned but some details unclear
- low: Funding implied or referenced indirectly`
      },
      {
        role: "user",
        content: `Analyze this article and extract funding round information:

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Content:
${plainContent}

Return funding rounds in JSON format.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "funding_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            fundingRounds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  companyName: { type: "string", description: "Company that raised funding" },
                  roundType: { type: "string", enum: ["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "bridge", "strategic", "venture_debt", "grant", "undisclosed"] },
                  amount: { type: "string", description: "Amount raised (numeric string)" },
                  currency: { type: "string", description: "Currency code (USD, EUR, etc.)" },
                  date: { type: "string", description: "Funding date in YYYY-MM-DD format if known" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "Why this funding round was identified" }
                },
                required: ["companyName", "roundType", "confidence", "reason"],
                additionalProperties: false
              }
            }
          },
          required: ["fundingRounds"],
          additionalProperties: false
        }
      }
    }
  });
  
  const result = JSON.parse(response.choices[0].message.content as string);
  
  // Match with existing companies
  for (const round of result.fundingRounds) {
    const match = existingCompanies.find(c => 
      c.name.toLowerCase() === round.companyName.toLowerCase()
    );
    if (match) round.existingCompanyId = match.id;
  }
  
  return result;
}

// ============================================================
// TAG SUGGESTIONS
// ============================================================

/**
 * AI-powered tag suggestions from article content
 */
export async function suggestTags(
  title: string,
  content: string,
  excerpt?: string
): Promise<TagAiSuggestions> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 5000);
  
  // Get existing tags from database
  const existingTags = await db.select({ 
    id: tags.id, 
    name: tags.name, 
    tagType: tags.tagType 
  }).from(tags).where(eq(tags.isActive, 1)).limit(300);
  
  const tagList = existingTags.map(t => `${t.name} (${t.tagType})`).join(", ");
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content tagging expert for ${EDITORIAL_SHORT}.

Your task is to suggest relevant tags for article content. Tags help with content discovery and categorization.

EXISTING TAGS IN DATABASE:
${tagList}

Tag types include:
- topic: General topics (AI, Blockchain, Fintech, etc.)
- technology: Specific technologies
- industry: Industry verticals
- region: Geographic regions
- event: Event-related tags
- company_stage: Startup stages (seed, growth, etc.)

Suggest 5-10 relevant tags, prioritizing existing tags from our database.
For each tag, determine confidence level:
- high: Clearly relevant to the article
- medium: Somewhat relevant
- low: Tangentially related`
      },
      {
        role: "user",
        content: `Analyze this article and suggest relevant tags:

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Content:
${plainContent}

Return tags in JSON format, prioritizing existing tags from our database.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tag_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Tag name" },
                  tagType: { type: "string", description: "Tag type (topic, technology, industry, region, event, company_stage)" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["name", "tagType", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["tags"],
          additionalProperties: false
        }
      }
    }
  });
  
  const result = JSON.parse(response.choices[0].message.content as string);
  
  // Match with existing tags
  for (const tag of result.tags) {
    const match = existingTags.find(t => 
      t.name.toLowerCase() === tag.name.toLowerCase()
    );
    if (match) tag.existingId = match.id;
  }
  
  return result;
}
