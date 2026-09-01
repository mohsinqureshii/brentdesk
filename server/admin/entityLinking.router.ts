import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { suggestEntities, suggestLocations, suggestFunding, suggestTags } from "../services/entityAi.service";
import { 
  articlePeople, articleCompanies, articleInvestors, 
  articleAccelerators, articleEvents, articleLocations,
  people, companies, investors, accelerators, events
} from "../../drizzle/schema";
import { eq, and, like, sql } from "drizzle-orm";

const mentionTypeSchema = z.enum([
  "primary", "mentioned", "interview", "investor_in_round", 
  "partner", "speaker", "sponsor"
]);

export const entityLinkingRouter = router({
  // ============================================================
  // PEOPLE LINKING
  // ============================================================
  
  getArticlePeople: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const links = await db
        .select({
          id: articlePeople.id,
          articleId: articlePeople.articleId,
          personId: articlePeople.personId,
          mentionType: articlePeople.mentionType,
          person: {
            id: people.id,
            name: people.name,
            title: people.title,
            avatar: people.avatar,
          }
        })
        .from(articlePeople)
        .leftJoin(people, eq(articlePeople.personId, people.id))
        .where(eq(articlePeople.articleId, input.articleId));
      return links;
    }),

  linkPerson: adminProcedure
    .input(z.object({
      articleId: z.number(),
      personId: z.number(),
      mentionType: mentionTypeSchema.default("mentioned"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db
        .select()
        .from(articlePeople)
        .where(and(
          eq(articlePeople.articleId, input.articleId),
          eq(articlePeople.personId, input.personId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(articlePeople)
          .set({ mentionType: input.mentionType } as any)
          .where(eq(articlePeople.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(articlePeople).values({
        articleId: input.articleId,
        personId: input.personId,
        mentionType: input.mentionType,
        createdById: ctx.user?.id,
      } as any);
      return { success: true, created: true };
    }),

  unlinkPerson: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articlePeople).where(eq(articlePeople.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // COMPANIES LINKING
  // ============================================================
  
  getArticleCompanies: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const links = await db
        .select({
          id: articleCompanies.id,
          articleId: articleCompanies.articleId,
          companyId: articleCompanies.companyId,
          mentionType: articleCompanies.mentionType,
          company: {
            id: companies.id,
            name: companies.name,
            logo: companies.logo,
            industry: companies.industry,
          }
        })
        .from(articleCompanies)
        .leftJoin(companies, eq(articleCompanies.companyId, companies.id))
        .where(eq(articleCompanies.articleId, input.articleId));
      return links;
    }),

  linkCompany: adminProcedure
    .input(z.object({
      articleId: z.number(),
      companyId: z.number(),
      mentionType: mentionTypeSchema.default("mentioned"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db
        .select()
        .from(articleCompanies)
        .where(and(
          eq(articleCompanies.articleId, input.articleId),
          eq(articleCompanies.companyId, input.companyId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(articleCompanies)
          .set({ mentionType: input.mentionType } as any)
          .where(eq(articleCompanies.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(articleCompanies).values({
        articleId: input.articleId,
        companyId: input.companyId,
        mentionType: input.mentionType,
        createdById: ctx.user?.id,
      } as any);
      return { success: true, created: true };
    }),

  unlinkCompany: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articleCompanies).where(eq(articleCompanies.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // INVESTORS LINKING
  // ============================================================
  
  getArticleInvestors: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const links = await db
        .select({
          id: articleInvestors.id,
          articleId: articleInvestors.articleId,
          investorId: articleInvestors.investorId,
          mentionType: articleInvestors.mentionType,
          investor: {
            id: investors.id,
            name: investors.name,
            logo: investors.logo,
            type: investors.type,
          }
        })
        .from(articleInvestors)
        .leftJoin(investors, eq(articleInvestors.investorId, investors.id))
        .where(eq(articleInvestors.articleId, input.articleId));
      return links;
    }),

  linkInvestor: adminProcedure
    .input(z.object({
      articleId: z.number(),
      investorId: z.number(),
      mentionType: mentionTypeSchema.default("mentioned"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db
        .select()
        .from(articleInvestors)
        .where(and(
          eq(articleInvestors.articleId, input.articleId),
          eq(articleInvestors.investorId, input.investorId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(articleInvestors)
          .set({ mentionType: input.mentionType } as any)
          .where(eq(articleInvestors.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(articleInvestors).values({
        articleId: input.articleId,
        investorId: input.investorId,
        mentionType: input.mentionType,
        createdById: ctx.user?.id,
      } as any);
      return { success: true, created: true };
    }),

  unlinkInvestor: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articleInvestors).where(eq(articleInvestors.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // ACCELERATORS LINKING
  // ============================================================
  
  getArticleAccelerators: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const links = await db
        .select({
          id: articleAccelerators.id,
          articleId: articleAccelerators.articleId,
          acceleratorId: articleAccelerators.acceleratorId,
          mentionType: articleAccelerators.mentionType,
          accelerator: {
            id: accelerators.id,
            name: accelerators.name,
            logo: accelerators.logo,
          }
        })
        .from(articleAccelerators)
        .leftJoin(accelerators, eq(articleAccelerators.acceleratorId, accelerators.id))
        .where(eq(articleAccelerators.articleId, input.articleId));
      return links;
    }),

  linkAccelerator: adminProcedure
    .input(z.object({
      articleId: z.number(),
      acceleratorId: z.number(),
      mentionType: mentionTypeSchema.default("mentioned"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db
        .select()
        .from(articleAccelerators)
        .where(and(
          eq(articleAccelerators.articleId, input.articleId),
          eq(articleAccelerators.acceleratorId, input.acceleratorId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(articleAccelerators)
          .set({ mentionType: input.mentionType } as any)
          .where(eq(articleAccelerators.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(articleAccelerators).values({
        articleId: input.articleId,
        acceleratorId: input.acceleratorId,
        mentionType: input.mentionType,
        createdById: ctx.user?.id,
      } as any);
      return { success: true, created: true };
    }),

  unlinkAccelerator: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articleAccelerators).where(eq(articleAccelerators.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // EVENTS LINKING
  // ============================================================
  
  getArticleEvents: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const links = await db
        .select({
          id: articleEvents.id,
          articleId: articleEvents.articleId,
          eventId: articleEvents.eventId,
          mentionType: articleEvents.mentionType,
          event: {
            id: events.id,
            title: events.title,
            type: events.type,
            startDate: events.startDate,
          }
        })
        .from(articleEvents)
        .leftJoin(events, eq(articleEvents.eventId, events.id))
        .where(eq(articleEvents.articleId, input.articleId));
      return links;
    }),

  linkEvent: adminProcedure
    .input(z.object({
      articleId: z.number(),
      eventId: z.number(),
      mentionType: mentionTypeSchema.default("mentioned"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db
        .select()
        .from(articleEvents)
        .where(and(
          eq(articleEvents.articleId, input.articleId),
          eq(articleEvents.eventId, input.eventId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(articleEvents)
          .set({ mentionType: input.mentionType } as any)
          .where(eq(articleEvents.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(articleEvents).values({
        articleId: input.articleId,
        eventId: input.eventId,
        mentionType: input.mentionType,
        createdById: ctx.user?.id,
      } as any);
      return { success: true, created: true };
    }),

  unlinkEvent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articleEvents).where(eq(articleEvents.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // SEARCH ENDPOINTS FOR ENTITY SELECTION
  // ============================================================
  
  searchPeople: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: people.id,
          name: people.name,
          title: people.title,
          avatar: people.avatar,
        })
        .from(people)
        .where(sql`LOWER(${people.name}) LIKE LOWER(${`%${input.query}%`})`)
        .limit(10);
      return results;
    }),

  searchCompanies: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: companies.id,
          name: companies.name,
          logo: companies.logo,
          industry: companies.industry,
        })
        .from(companies)
        .where(sql`LOWER(${companies.name}) LIKE LOWER(${`%${input.query}%`})`)
        .limit(10);
      return results;
    }),

  searchInvestors: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: investors.id,
          name: investors.name,
          logo: investors.logo,
          type: investors.type,
        })
        .from(investors)
        .where(sql`LOWER(${investors.name}) LIKE LOWER(${`%${input.query}%`})`)
        .limit(10);
      return results;
    }),

  searchAccelerators: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: accelerators.id,
          name: accelerators.name,
          logo: accelerators.logo,
        })
        .from(accelerators)
        .where(sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${input.query}%`})`)
        .limit(10);
      return results;
    }),

  searchEvents: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: events.id,
          title: events.title,
          type: events.type,
          startDate: events.startDate,
        })
        .from(events)
        .where(sql`LOWER(${events.title}) LIKE LOWER(${`%${input.query}%`})`)
        .limit(10);
      return results;
    }),

  // ============================================================
  // ARTICLE LOCATIONS - Global Location System
  // ============================================================

  getArticleLocations: adminProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const locations = await db
        .select()
        .from(articleLocations)
        .where(eq(articleLocations.articleId, input.articleId));
      return locations;
    }),

  addArticleLocation: adminProcedure
    .input(z.object({
      articleId: z.number(),
      country: z.string().length(2),
      region: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      // Check if this exact location already exists
      const existing = await db
        .select()
        .from(articleLocations)
        .where(and(
          eq(articleLocations.articleId, input.articleId),
          eq(articleLocations.country, input.country),
          input.region ? eq(articleLocations.region, input.region) : undefined,
          input.city ? eq(articleLocations.city, input.city) : undefined
        ) as any)
        .limit(1);
      
      if (existing.length > 0) {
        return { success: false, error: "Location already added" };
      }
      
      await db.insert(articleLocations).values({
        articleId: input.articleId,
        country: input.country,
        region: input.region,
        city: input.city,
        createdById: ctx.user?.id,
      } as any);
      return { success: true };
    }),

  removeArticleLocation: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(articleLocations).where(eq(articleLocations.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // AI SUGGESTION ENDPOINTS
  // ============================================================

  suggestEntities: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return suggestEntities(input.title, input.content, input.excerpt);
    }),

  suggestLocations: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return suggestLocations(input.title, input.content, input.excerpt);
    }),

  suggestFunding: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return suggestFunding(input.title, input.content, input.excerpt);
    }),

  suggestTags: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return suggestTags(input.title, input.content, input.excerpt);
    }),
});
