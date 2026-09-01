/**
 * AI Router - Provides AI-powered suggestions for entity creation
 */

import { publication } from "../../shared/publication";
import { EDITORIAL_SHORT } from "../config/editorial";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

import { getDb } from "../db";
import { companies, people, investors, jobs, events, accelerators, resources } from "../../drizzle/schema";
import { sql, eq } from "drizzle-orm";

// Helper function to safely parse LLM response
function parseLLMResponse(result: any): Record<string, any> {
  try {
    if (!result) {
      console.error("AI suggestion: No result from LLM");
      return {};
    }
    
    if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
      console.error("AI suggestion: No choices in LLM response", JSON.stringify(result).slice(0, 500));
      return {};
    }
    
    const choice = result.choices[0];
    if (!choice || !choice.message) {
      console.error("AI suggestion: No message in choice", JSON.stringify(choice).slice(0, 500));
      return {};
    }
    
    const content = choice.message.content;
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error("AI suggestion: JSON parse error", parseError, content.slice(0, 500));
        return {};
      }
    }
    
    // Handle array content (multimodal response)
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "text" && typeof part.text === "string") {
          try {
            return JSON.parse(part.text);
          } catch (parseError) {
            console.error("AI suggestion: JSON parse error from array content", parseError);
          }
        }
      }
    }
    
    console.error("AI suggestion: Unexpected content type", typeof content);
    return {};
  } catch (error) {
    console.error("AI suggestion: Error parsing response", error);
    return {};
  }
}

export const aiRouter = router({
  // Suggest company information based on name
  suggestCompanyInfo: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, website } = input;
      
      const prompt = `You are a business research assistant. Given the company name "${name}"${website ? ` and website "${website}"` : ''}, provide publicly available information about this company.

Return a JSON object with the following fields (leave empty string if unknown):
{
  "tagline": "Company's tagline or slogan",
  "description": "2-3 sentence description of what the company does",
  "industry": "Primary industry (e.g., FinTech, SaaS, E-commerce, HealthTech)",
  "linkedIn": "LinkedIn company page URL if known",
  "twitter": "Twitter/X profile URL if known",
  "foundedYear": "Year founded as number or null",
  "employeeCount": "Approximate employee count range (e.g., '11-50', '51-200')",
  "totalFunding": "Total funding raised if known (e.g., '$10M', '$50M')",
  "stage": "Funding stage: pre_seed, seed, series_a, series_b, series_c, series_d_plus, public, or acquired",
  "location": "Headquarters location (e.g., 'Dubai, UAE', 'San Francisco, CA')"
}

Only include information you are confident about. For unknown fields, use empty string or null.`;

      try {
        console.log("AI suggestion: Requesting company info for", name);
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful business research assistant that provides accurate, factual information about companies. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "company_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tagline: { type: "string", description: "Company tagline or slogan" },
                  description: { type: "string", description: "Brief company description" },
                  industry: { type: "string", description: "Primary industry" },
                  linkedIn: { type: "string", description: "LinkedIn URL" },
                  twitter: { type: "string", description: "Twitter URL" },
                  foundedYear: { type: "string", description: "Year founded or empty string if unknown" },
                  employeeCount: { type: "string", description: "Employee count range" },
                  totalFunding: { type: "string", description: "Total funding raised" },
                  stage: { type: "string", description: "Funding stage" },
                  location: { type: "string", description: "HQ location" }
                },
                required: ["tagline", "description", "industry", "linkedIn", "twitter", "foundedYear", "employeeCount", "totalFunding", "stage", "location"],
                additionalProperties: false
              }
            }
          }
        });

        const parsed = parseLLMResponse(result);
        console.log("AI suggestion: Company info parsed successfully for", name);
        return parsed;
      } catch (error) {
        console.error("AI suggestion error for company:", name, error);
        throw new Error("Failed to get AI suggestions");
      }
    }),

  // Suggest person information based on name
  suggestPersonInfo: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      company: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, company } = input;
      
      const prompt = `You are a professional research assistant. Given the person's name "${name}"${company ? ` who works at "${company}"` : ''}, provide publicly available professional information about this person.

Return a JSON object with the following fields (leave empty string if unknown):
{
  "title": "Current job title (e.g., CEO, Founder, CTO)",
  "company": "Current company name",
  "shortBio": "One-line professional bio",
  "bio": "2-3 sentence detailed biography",
  "email": "Professional email if publicly known",
  "website": "Personal website URL if known",
  "linkedIn": "LinkedIn profile URL if known",
  "twitter": "Twitter/X profile URL if known",
  "location": "Location (e.g., 'Dubai, UAE')"
}

Only include information you are confident about. For unknown fields, use empty string.`;

      try {
        console.log("AI suggestion: Requesting person info for", name);
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful professional research assistant that provides accurate, factual information about business professionals. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "person_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Job title" },
                  company: { type: "string", description: "Company name" },
                  shortBio: { type: "string", description: "One-line bio" },
                  bio: { type: "string", description: "Detailed biography" },
                  email: { type: "string", description: "Email address" },
                  website: { type: "string", description: "Personal website" },
                  linkedIn: { type: "string", description: "LinkedIn URL" },
                  twitter: { type: "string", description: "Twitter URL" },
                  location: { type: "string", description: "Location" }
                },
                required: ["title", "company", "shortBio", "bio", "email", "website", "linkedIn", "twitter", "location"],
                additionalProperties: false
              }
            }
          }
        });

        const parsed = parseLLMResponse(result);
        console.log("AI suggestion: Person info parsed successfully for", name);
        return parsed;
      } catch (error) {
        console.error("AI suggestion error for person:", name, error);
        throw new Error("Failed to get AI suggestions");
      }
    }),

  // Suggest investor information based on name
  suggestInvestorInfo: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, website } = input;
      
      const prompt = `You are a venture capital research assistant. Given the investor/fund name "${name}"${website ? ` and website "${website}"` : ''}, provide publicly available information about this investor.

Return a JSON object with the following fields (leave empty string if unknown):
{
  "type": "Investor type: vc, angel, corporate, family_office, accelerator, or government",
  "shortDescription": "One-line description",
  "description": "2-3 sentence description of the investor's focus and strategy",
  "linkedIn": "LinkedIn page URL if known",
  "twitter": "Twitter/X profile URL if known",
  "location": "Headquarters location (e.g., 'Dubai, UAE')",
  "foundedYear": "Year founded as number or null",
  "teamSize": "Team size (e.g., '10-20')",
  "aum": "Assets under management (e.g., '$500M')",
  "portfolioCount": "Number of portfolio companies as number or null",
  "checkSizeMin": "Minimum check size in USD as number or null",
  "checkSizeMax": "Maximum check size in USD as number or null",
  "investmentStages": "Array of stages: pre_seed, seed, series_a, series_b, series_c, growth, late_stage"
}

Only include information you are confident about. For unknown fields, use empty string or null.`;

      try {
        console.log("AI suggestion: Requesting investor info for", name);
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful venture capital research assistant that provides accurate, factual information about investors and funds. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "investor_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  type: { type: "string", description: "Investor type" },
                  shortDescription: { type: "string", description: "One-line description" },
                  description: { type: "string", description: "Detailed description" },
                  linkedIn: { type: "string", description: "LinkedIn URL" },
                  twitter: { type: "string", description: "Twitter URL" },
                  location: { type: "string", description: "HQ location" },
                  foundedYear: { type: "string", description: "Year founded or empty string if unknown" },
                  teamSize: { type: "string", description: "Team size" },
                  aum: { type: "string", description: "Assets under management" },
                  portfolioCount: { type: "string", description: "Portfolio count or empty string if unknown" },
                  checkSizeMin: { type: "string", description: "Min check size in USD or empty string if unknown" },
                  checkSizeMax: { type: "string", description: "Max check size in USD or empty string if unknown" },
                  investmentStages: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Investment stages" 
                  }
                },
                required: ["type", "shortDescription", "description", "linkedIn", "twitter", "location", "foundedYear", "teamSize", "aum", "portfolioCount", "checkSizeMin", "checkSizeMax", "investmentStages"],
                additionalProperties: false
              }
            }
          }
        });

        const parsed = parseLLMResponse(result);
        console.log("AI suggestion: Investor info parsed successfully for", name);
        return parsed;
      } catch (error) {
        console.error("AI suggestion error for investor:", name, error);
        throw new Error("Failed to get AI suggestions");
      }
    }),

  // Check for duplicate companies
  checkDuplicateCompany: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { duplicates: [] };

      const searchTerm = `%${input.name.toLowerCase()}%`;
      const results = await db
        .select({
          id: companies.id,
          name: companies.name,
          website: companies.website,
          industry: companies.industry,
        })
        .from(companies)
        .where(sql`LOWER(${companies.name}) LIKE LOWER(${searchTerm})`)
        .limit(5);

      return { duplicates: results };
    }),

  // Check for duplicate people
  checkDuplicatePerson: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { duplicates: [] };

      const searchTerm = `%${input.name.toLowerCase()}%`;
      const results = await db
        .select({
          id: people.id,
          name: people.name,
          title: people.title,
          company: people.company,
        })
        .from(people)
        .where(sql`LOWER(${people.name}) LIKE LOWER(${searchTerm})`)
        .limit(5);

      return { duplicates: results };
    }),

  // Suggest event information based on name
  suggestEventInfo: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, website } = input;
      
      const prompt = `You are an event research assistant. Given the event name "${name}"${website ? ` and website "${website}"` : ''}, provide publicly available information about this event.

Return a JSON object with the following fields (leave empty string if unknown):
{
  "tagline": "Event tagline or theme",
  "description": "2-3 sentence description of the event",
  "shortDescription": "One-line description",
  "eventType": "Type: conference, webinar, meetup, workshop, hackathon, summit, or other",
  "format": "Format: in_person, virtual, or hybrid",
  "organizerName": "Name of the organizing company/entity",
  "organizerWebsite": "Organizer website URL",
  "expectedAttendees": "Expected number of attendees as number or null",
  "expectedCountries": "Expected number of countries represented as number or null"
}

Only include information you are confident about. For unknown fields, use empty string or null.`;

      try {
        console.log("AI suggestion: Requesting event info for", name);
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful event research assistant that provides accurate, factual information about tech events and conferences. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "event_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tagline: { type: "string", description: "Event tagline" },
                  description: { type: "string", description: "Event description" },
                  shortDescription: { type: "string", description: "One-line description" },
                  eventType: { type: "string", description: "Event type" },
                  format: { type: "string", description: "Event format" },
                  organizerName: { type: "string", description: "Organizer name" },
                  organizerWebsite: { type: "string", description: "Organizer website" },
                  expectedAttendees: { type: "string", description: "Expected attendees or empty string" },
                  expectedCountries: { type: "string", description: "Expected countries or empty string" }
                },
                required: ["tagline", "description", "shortDescription", "eventType", "format", "organizerName", "organizerWebsite", "expectedAttendees", "expectedCountries"],
                additionalProperties: false
              }
            }
          }
        });

        const parsed = parseLLMResponse(result);
        console.log("AI suggestion: Event info parsed successfully for", name);
        return parsed;
      } catch (error) {
        console.error("AI suggestion error for event:", name, error);
        throw new Error("Failed to get AI suggestions");
      }
    }),

  // Suggest accelerator information based on name
  suggestAcceleratorInfo: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, website } = input;
      
      const prompt = `You are a startup ecosystem research assistant. Given the accelerator/incubator name "${name}"${website ? ` and website "${website}"` : ''}, provide publicly available information about this accelerator.

Return a JSON object with the following fields (leave empty string if unknown):
{
  "tagline": "Accelerator tagline or mission",
  "description": "2-3 sentence description of the accelerator",
  "shortDescription": "One-line description",
  "type": "Type: accelerator, incubator, studio, or hybrid",
  "linkedIn": "LinkedIn page URL if known",
  "twitter": "Twitter/X profile URL if known",
  "location": "Headquarters location (e.g., 'Dubai, UAE')",
  "foundedYear": "Year founded as number or null",
  "batchesPerYear": "Number of batches per year as number or null",
  "startupCount": "Total startups supported as number or null",
  "investmentAmount": "Typical investment amount (e.g., '$100K')",
  "equityTaken": "Equity percentage taken (e.g., '5-7%')",
  "programDuration": "Program duration (e.g., '3 months')",
  "focusAreas": "Array of focus areas like FinTech, HealthTech, etc."
}

Only include information you are confident about. For unknown fields, use empty string or null.`;

      try {
        console.log("AI suggestion: Requesting accelerator info for", name);
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful startup ecosystem research assistant that provides accurate, factual information about accelerators and incubators. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "accelerator_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tagline: { type: "string", description: "Accelerator tagline" },
                  description: { type: "string", description: "Accelerator description" },
                  shortDescription: { type: "string", description: "One-line description" },
                  type: { type: "string", description: "Accelerator type" },
                  linkedIn: { type: "string", description: "LinkedIn URL" },
                  twitter: { type: "string", description: "Twitter URL" },
                  location: { type: "string", description: "HQ location" },
                  foundedYear: { type: "string", description: "Year founded or empty string" },
                  batchesPerYear: { type: "string", description: "Batches per year or empty string" },
                  startupCount: { type: "string", description: "Total startups or empty string" },
                  investmentAmount: { type: "string", description: "Investment amount" },
                  equityTaken: { type: "string", description: "Equity percentage" },
                  programDuration: { type: "string", description: "Program duration" },
                  focusAreas: { type: "array", items: { type: "string" }, description: "Focus areas" }
                },
                required: ["tagline", "description", "shortDescription", "type", "linkedIn", "twitter", "location", "foundedYear", "batchesPerYear", "startupCount", "investmentAmount", "equityTaken", "programDuration", "focusAreas"],
                additionalProperties: false
              }
            }
          }
        });

        const parsed = parseLLMResponse(result);
        console.log("AI suggestion: Accelerator info parsed successfully for", name);
        return parsed;
      } catch (error) {
        console.error("AI suggestion error for accelerator:", name, error);
        throw new Error("Failed to get AI suggestions");
      }
    }),

  // Generate SEO meta for any entity type
  suggestSeoForEntity: protectedProcedure
    .input(z.object({
      entityType: z.enum(["companies", "investors", "people", "jobs", "events", "accelerators", "resources"]),
      entityId: z.number(),
      entityName: z.string(),
      entityDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { entityType, entityId, entityName, entityDescription } = input;
      let extraContext = "";
      try {
        const db = await getDb();
        if (db) {
          if (entityType === "companies") {
            const rows = await db.select({ shortDescription: companies.shortDescription, industry: companies.industry, location: companies.location }).from(companies).where(eq(companies.id, entityId)).limit(1);
            if (rows[0]) extraContext = `Industry: ${rows[0].industry || ""}, Location: ${rows[0].location || ""}, Description: ${rows[0].shortDescription || ""}`;
          } else if (entityType === "jobs") {
            const rows = await db.select({ title: jobs.title, department: jobs.department }).from(jobs).where(eq(jobs.id, entityId)).limit(1);
            if (rows[0]) extraContext = `Title: ${rows[0].title || ""}, Department: ${rows[0].department || ""}`;
          } else if (entityType === "events") {
            const rows = await db.select({ description: events.description, type: events.type, country: events.country }).from(events).where(eq(events.id, entityId)).limit(1);
            if (rows[0]) extraContext = `Type: ${rows[0].type || ""}, Country: ${rows[0].country || ""}`;
          } else if (entityType === "accelerators") {
            const rows = await db.select({ shortDescription: accelerators.shortDescription, location: accelerators.location }).from(accelerators).where(eq(accelerators.id, entityId)).limit(1);
            if (rows[0]) extraContext = `Location: ${rows[0].location || ""}, Description: ${rows[0].shortDescription || ""}`;
          } else if (entityType === "resources") {
            const rows = await db.select({ description: resources.description, type: resources.type }).from(resources).where(eq(resources.id, entityId)).limit(1);
            if (rows[0]) extraContext = `Type: ${rows[0].type || ""}`;
          }
        }
      } catch (_e) { /* ignore context fetch errors */ }

      const entityLabel = entityType.replace(/s$/, "");
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an SEO expert for ${EDITORIAL_SHORT}. Generate SEO metadata for a ${entityLabel} profile page. Return valid JSON only.`
          },
          {
            role: "user",
            content: `Generate SEO metadata for this ${entityLabel}:\nName: ${entityName}\n${extraContext ? `Context: ${extraContext}\n` : ""}${entityDescription ? `Description: ${entityDescription}` : ""}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_meta",
            strict: true,
            schema: {
              type: "object",
              properties: {
                metaTitle: { type: "string", description: `SEO title, 50-60 chars, include entity name and ${publication.name}` },
                metaDescription: { type: "string", description: "Meta description, 150-160 chars, include call-to-action" },
                keywords: { type: "string", description: "Comma-separated keywords relevant to MENA tech ecosystem" }
              },
              required: ["metaTitle", "metaDescription", "keywords"],
              additionalProperties: false
            }
          }
        }
      });
      const content = result?.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response from AI");
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      return parsed as { metaTitle: string; metaDescription: string; keywords: string };
    }),

  // Check for duplicate investors
  checkDuplicateInvestor: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { duplicates: [] };

      const searchTerm = `%${input.name.toLowerCase()}%`;
      const results = await db
        .select({
          id: investors.id,
          name: investors.name,
          type: investors.type,
          shortDescription: investors.shortDescription,
        })
        .from(investors)
        .where(sql`LOWER(${investors.name}) LIKE LOWER(${searchTerm})`)
        .limit(5);

      return { duplicates: results };
    }),
});
