/**
 * Funding Tracker Admin Router
 * Manage funding rounds, link investors, and track startup funding
 */

import { z } from "zod";
import { adminProcedure, router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  fundingRounds, fundingRoundInvestors,
  companies, investors, sectors, countries
} from "../../drizzle/schema";
import { eq, and, like, desc, sql, inArray } from "drizzle-orm";
import { toDbDate } from "../_core/dbValues";

const roundTypeSchema = z.enum([
  "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus",
  "bridge", "strategic", "venture_debt", "grant", "undisclosed"
]);

const statusSchema = z.enum(["confirmed", "pending", "disputed"]);

export const fundingRouter = router({
  // ============================================================
  // PUBLIC ENDPOINTS
  // ============================================================

  // Filter options for the funding page dropdowns
  filterOptions: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { sectors: [], countries: [], investors: [], industries: [] };

      const [sectorList, countryList, investorList, industryList] = await Promise.all([
        db.select({ id: sectors.id, name: sectors.name }).from(sectors).orderBy(sectors.name),
        db.select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
          .from(countries).where(eq(countries.isActive, 1)).orderBy(countries.name),
        db.select({ id: investors.id, name: investors.name })
          .from(investors).orderBy(investors.name),
        db.selectDistinct({ industry: companies.industry })
          .from(companies)
          .innerJoin(fundingRounds, eq(fundingRounds.companyId, companies.id))
          .where(and(sql`${companies.industry} IS NOT NULL`, eq(fundingRounds.status, "confirmed")))
          .orderBy(companies.industry),
      ]);

      return {
        sectors: sectorList,
        countries: countryList,
        investors: investorList,
        industries: industryList.filter(i => i.industry).map(i => i.industry as string),
      };
    }),

  publicList: publicProcedure
    .input(z.object({
      roundType: roundTypeSchema.optional(),
      year: z.number().optional(),
      sectorId: z.number().optional(),
      countryId: z.number().optional(),
      investorId: z.number().optional(),
      industry: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rounds: [], total: 0 };

      const filters: any[] = [eq(fundingRounds.status, "confirmed")];
      if (input?.roundType) filters.push(eq(fundingRounds.roundType, input.roundType));
      if (input?.year) filters.push(sql`YEAR(${fundingRounds.fundingDate}) = ${input.year}`);
      if (input?.sectorId) filters.push(eq(companies.sectorId, input.sectorId));
      if (input?.countryId) filters.push(eq(fundingRounds.countryId, input.countryId));
      if (input?.industry) filters.push(eq(companies.industry, input.industry));
      if (input?.search) filters.push(sql`LOWER(${companies.name}) LIKE LOWER(${`%${input.search}%`})`);

      // If filtering by investor, join the junction table
      let investorJoinNeeded = false;
      if (input?.investorId) {
        investorJoinNeeded = true;
      }

      const whereClause = and(...filters);

      let query = db
        .select({
          id: fundingRounds.id,
          companyId: fundingRounds.companyId,
          roundType: fundingRounds.roundType,
          amountRaised: fundingRounds.amountRaised,
          currency: fundingRounds.currency,
          valuationPost: fundingRounds.valuationPost,
          fundingDate: fundingRounds.fundingDate,
          isUndisclosed: fundingRounds.isUndisclosed,
          status: fundingRounds.status,
          leadInvestorId: fundingRounds.leadInvestorId,
          countryId: fundingRounds.countryId,
          company: {
            id: companies.id,
            name: companies.name,
            slug: companies.slug,
            logo: companies.logo,
            industry: companies.industry,
            sectorId: companies.sectorId,
          }
        })
        .from(fundingRounds)
        .leftJoin(companies, eq(fundingRounds.companyId, companies.id));

      if (investorJoinNeeded) {
        query = (query as any).innerJoin(
          fundingRoundInvestors,
          and(
            eq(fundingRoundInvestors.fundingRoundId, fundingRounds.id),
            eq(fundingRoundInvestors.investorId, input!.investorId!)
          )
        );
      }

      const rounds = await (query as any)
        .where(whereClause)
        .orderBy(desc(fundingRounds.fundingDate))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      let countQuery = db
        .select({ count: sql<number>`COUNT(DISTINCT ${fundingRounds.id})` })
        .from(fundingRounds)
        .leftJoin(companies, eq(fundingRounds.companyId, companies.id));
      if (investorJoinNeeded) {
        countQuery = (countQuery as any).innerJoin(
          fundingRoundInvestors,
          and(
            eq(fundingRoundInvestors.fundingRoundId, fundingRounds.id),
            eq(fundingRoundInvestors.investorId, input!.investorId!)
          )
        );
      }
      const countResult = await (countQuery as any).where(whereClause);

      // Get lead investor names
      const leadInvestorIds = rounds.filter((r: any) => r.leadInvestorId).map((r: any) => r.leadInvestorId!);
      let investorMap: Record<number, { name: string; logo: string | null }> = {};
      if (leadInvestorIds.length > 0) {
        const invResults = await db
          .select({ id: investors.id, name: investors.name, logo: investors.logo })
          .from(investors)
          .where(inArray(investors.id, leadInvestorIds));
        investorMap = Object.fromEntries(invResults.map(i => [i.id, { name: i.name, logo: i.logo }]));
      }

      // Get country names
      const countryIds: number[] = rounds.filter((r: any) => r.countryId).map((r: any) => r.countryId!);
      let countryMap: Record<number, string> = {};
      if (countryIds.length > 0) {
        const countryResults = await db
          .select({ id: countries.id, name: countries.name })
          .from(countries)
          .where(inArray(countries.id, Array.from(new Set(countryIds))));
        countryMap = Object.fromEntries(countryResults.map(c => [c.id, c.name]));
      }

      const roundsWithInvestors = rounds.map((r: any) => ({
        ...r,
        leadInvestor: r.leadInvestorId ? investorMap[r.leadInvestorId] || null : null,
        countryName: r.countryId ? countryMap[r.countryId] || null : null,
      }));

      // Stats
      const statsResult = await db
        .select({
          totalRounds: sql<number>`COUNT(*)`,
          totalRaised: sql<number>`COALESCE(SUM(${fundingRounds.amountRaised}), 0)`,
        })
        .from(fundingRounds)
        .where(eq(fundingRounds.status, "confirmed"));

      return {
        rounds: roundsWithInvestors,
        total: Number(countResult[0]?.count || 0),
        stats: {
          totalRounds: Number(statsResult[0]?.totalRounds || 0),
          totalRaised: Number(statsResult[0]?.totalRaised || 0),
        },
      };
    }),

  // ============================================================
  // FUNDING ROUNDS CRUD (ADMIN)
  // ============================================================
  
  list: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      roundType: roundTypeSchema.optional(),
      status: statusSchema.optional(),
      year: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rounds: [], total: 0 };
      
      const filters: any[] = [];
      
      if (input?.companyId) {
        filters.push(eq(fundingRounds.companyId, input.companyId));
      }
      if (input?.roundType) {
        filters.push(eq(fundingRounds.roundType, input.roundType));
      }
      if (input?.status) {
        filters.push(eq(fundingRounds.status, input.status));
      }
      if (input?.year) {
        filters.push(sql`YEAR(${fundingRounds.fundingDate}) = ${input.year}`);
      }
      
      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      
      const rounds = await db
        .select({
          id: fundingRounds.id,
          companyId: fundingRounds.companyId,
          roundType: fundingRounds.roundType,
          amountRaised: fundingRounds.amountRaised,
          currency: fundingRounds.currency,
          valuationPost: fundingRounds.valuationPost,
          fundingDate: fundingRounds.fundingDate,
          isUndisclosed: fundingRounds.isUndisclosed,
          status: fundingRounds.status,
          notes: fundingRounds.notes,
          articleId: fundingRounds.articleId,
          leadInvestorId: fundingRounds.leadInvestorId,
          company: {
            id: companies.id,
            name: companies.name,
            logo: companies.logo,
            industry: companies.industry,
          }
        })
        .from(fundingRounds)
        .leftJoin(companies, eq(fundingRounds.companyId, companies.id))
        .where(whereClause)
        .orderBy(desc(fundingRounds.fundingDate))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);
      
      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(fundingRounds)
        .where(whereClause);
      
      return { 
        rounds, 
        total: Number(countResult[0]?.count || 0) 
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [round] = await db
        .select({
          id: fundingRounds.id,
          companyId: fundingRounds.companyId,
          roundType: fundingRounds.roundType,
          amountRaised: fundingRounds.amountRaised,
          currency: fundingRounds.currency,
          valuationPre: fundingRounds.valuationPre,
          valuationPost: fundingRounds.valuationPost,
          valuationCurrency: fundingRounds.valuationCurrency,
          isValuationUndisclosed: fundingRounds.isValuationUndisclosed,
          fundingDate: fundingRounds.fundingDate,
          isUndisclosed: fundingRounds.isUndisclosed,
          status: fundingRounds.status,
          notes: fundingRounds.notes,
          articleId: fundingRounds.articleId,
          leadInvestorId: fundingRounds.leadInvestorId,
          sourceUrls: fundingRounds.sourceUrls,
          company: {
            id: companies.id,
            name: companies.name,
            logo: companies.logo,
          }
        })
        .from(fundingRounds)
        .leftJoin(companies, eq(fundingRounds.companyId, companies.id))
        .where(eq(fundingRounds.id, input.id))
        .limit(1);
      
      if (!round) return null;
      
      // Get investors for this round
      const roundInvestors = await db
        .select({
          id: fundingRoundInvestors.id,
          investorId: fundingRoundInvestors.investorId,
          role: fundingRoundInvestors.role,
          investmentAmount: fundingRoundInvestors.investmentAmount,
          investmentCurrency: fundingRoundInvestors.investmentCurrency,
          investor: {
            id: investors.id,
            name: investors.name,
            logo: investors.logo,
            type: investors.type,
          }
        })
        .from(fundingRoundInvestors)
        .leftJoin(investors, eq(fundingRoundInvestors.investorId, investors.id))
        .where(eq(fundingRoundInvestors.fundingRoundId, input.id));
      
      // Check if lead investor is in the list
      const leadInvestor = round.leadInvestorId 
        ? roundInvestors.find(inv => inv.investorId === round.leadInvestorId)
        : null;
      
      return { ...round, investors: roundInvestors, leadInvestor };
    }),

  create: adminProcedure
    .input(z.object({
      companyId: z.number(),
      roundType: roundTypeSchema,
      amountRaised: z.string().optional(), // Decimal as string
      currency: z.string().default("USD"),
      valuationPre: z.string().optional(),
      valuationPost: z.string().optional(),
      valuationCurrency: z.string().default("USD"),
      isValuationUndisclosed: z.boolean().default(true),
      fundingDate: z.string(),
      isUndisclosed: z.boolean().default(false),
      status: statusSchema.default("pending"),
      notes: z.string().optional(),
      articleId: z.number().optional(),
      leadInvestorId: z.number().optional(),
      sourceUrls: z.array(z.string()).optional(),
      investorIds: z.array(z.object({
        investorId: z.number(),
        role: z.enum(["lead", "participant"]).default("participant"),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const { investorIds, ...roundData } = input;
      
      // Create funding round
      const [result] = await db.insert(fundingRounds).values({
        ...roundData,
        fundingDate: new Date(roundData.fundingDate),
        sourceUrls: roundData.sourceUrls ? JSON.stringify(roundData.sourceUrls) : null,
        createdById: ctx.user?.id,
      } as any);
      
      const roundId = (result as any).insertId;
      
      // Link investors
      if (investorIds && investorIds.length > 0) {
        await db.insert(fundingRoundInvestors).values(
          investorIds.map(inv => ({
            fundingRoundId: roundId,
            investorId: inv.investorId,
            role: inv.role,
          }))
        );
      }
      
      return { success: true, id: roundId };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      companyId: z.number().optional(),
      roundType: roundTypeSchema.optional(),
      amountRaised: z.string().optional(),
      currency: z.string().optional(),
      valuationPre: z.string().optional(),
      valuationPost: z.string().optional(),
      valuationCurrency: z.string().optional(),
      isValuationUndisclosed: z.boolean().optional(),
      fundingDate: z.string().optional(),
      isUndisclosed: z.boolean().optional(),
      status: statusSchema.optional(),
      notes: z.string().optional(),
      articleId: z.number().optional(),
      leadInvestorId: z.number().optional(),
      sourceUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const { id, fundingDate, sourceUrls, ...updateData } = input;
      
      await db
        .update(fundingRounds)
        .set({
          ...updateData,
          fundingDate: fundingDate ? new Date(fundingDate) : undefined,
          sourceUrls: sourceUrls ? JSON.stringify(sourceUrls) : undefined,
          updatedAt: toDbDate(new Date()),
        } as any)
        .where(eq(fundingRounds.id, id));
      
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      // Delete investor links first
      await db.delete(fundingRoundInvestors).where(eq(fundingRoundInvestors.fundingRoundId, input.id));
      
      // Delete funding round
      await db.delete(fundingRounds).where(eq(fundingRounds.id, input.id));
      
      return { success: true };
    }),

  // ============================================================
  // INVESTOR MANAGEMENT FOR ROUNDS
  // ============================================================
  
  addInvestor: adminProcedure
    .input(z.object({
      fundingRoundId: z.number(),
      investorId: z.number(),
      role: z.enum(["lead", "participant"]).default("participant"),
      investmentAmount: z.string().optional(),
      investmentCurrency: z.string().default("USD"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      // Check if already linked
      const existing = await db
        .select()
        .from(fundingRoundInvestors)
        .where(and(
          eq(fundingRoundInvestors.fundingRoundId, input.fundingRoundId),
          eq(fundingRoundInvestors.investorId, input.investorId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // Update investment amount and role
        await db
          .update(fundingRoundInvestors)
          .set({ 
            role: input.role,
            investmentAmount: input.investmentAmount,
            investmentCurrency: input.investmentCurrency,
          } as any)
          .where(eq(fundingRoundInvestors.id, existing[0].id));
        return { success: true, updated: true };
      }
      
      await db.insert(fundingRoundInvestors).values({
        fundingRoundId: input.fundingRoundId,
        investorId: input.investorId,
        role: input.role,
        investmentAmount: input.investmentAmount,
        investmentCurrency: input.investmentCurrency,
      } as any);
      
      return { success: true, created: true };
    }),

  updateInvestorAmount: adminProcedure
    .input(z.object({
      id: z.number(),
      investmentAmount: z.string().optional(),
      investmentCurrency: z.string().default("USD"),
      role: z.enum(["lead", "participant"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const updateData: any = {};
      if (input.investmentAmount !== undefined) {
        updateData.investmentAmount = input.investmentAmount;
      }
      if (input.investmentCurrency) {
        updateData.investmentCurrency = input.investmentCurrency;
      }
      if (input.role) {
        updateData.role = input.role;
      }
      
      await db
        .update(fundingRoundInvestors)
        .set(updateData as any)
        .where(eq(fundingRoundInvestors.id, input.id));
      
      return { success: true };
    }),

  removeInvestor: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db.delete(fundingRoundInvestors).where(eq(fundingRoundInvestors.id, input.id));
      return { success: true };
    }),

  setLeadInvestor: adminProcedure
    .input(z.object({
      fundingRoundId: z.number(),
      investorId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db
        .update(fundingRounds)
        .set({ leadInvestorId: input.investorId } as any)
        .where(eq(fundingRounds.id, input.fundingRoundId));
      
      return { success: true };
    }),

  // ============================================================
  // STATISTICS & ANALYTICS
  // ============================================================
  
  getStats: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const filters: any[] = [];
      if (input?.year) {
        filters.push(sql`YEAR(${fundingRounds.fundingDate}) = ${input.year}`);
      }
      
      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      
      // Total funding
      const [totalResult] = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${fundingRounds.amountRaised} AS DECIMAL(15,2))), 0)`,
          totalRounds: sql<number>`COUNT(*)`,
          avgDealSize: sql<number>`COALESCE(AVG(CAST(${fundingRounds.amountRaised} AS DECIMAL(15,2))), 0)`,
        })
        .from(fundingRounds)
        .where(whereClause);
      
      // By round type
      const byRoundType = await db
        .select({
          roundType: fundingRounds.roundType,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${fundingRounds.amountRaised} AS DECIMAL(15,2))), 0)`,
        })
        .from(fundingRounds)
        .where(whereClause)
        .groupBy(fundingRounds.roundType)
        .orderBy(desc(sql`SUM(CAST(${fundingRounds.amountRaised} AS DECIMAL(15,2)))`));
      
      // Monthly trend (last 12 months)
      const monthlyTrend = await db
        .select({
          month: sql<string>`DATE_FORMAT(${fundingRounds.fundingDate}, '%Y-%m')`,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${fundingRounds.amountRaised} AS DECIMAL(15,2))), 0)`,
        })
        .from(fundingRounds)
        .where(sql`${fundingRounds.fundingDate} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`)
        .groupBy(sql`DATE_FORMAT(${fundingRounds.fundingDate}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${fundingRounds.fundingDate}, '%Y-%m')`);
      
      // Top investors by deal count
      const topInvestors = await db
        .select({
          investorId: fundingRoundInvestors.investorId,
          investorName: investors.name,
          investorLogo: investors.logo,
          dealCount: sql<number>`COUNT(*)`,
        })
        .from(fundingRoundInvestors)
        .leftJoin(investors, eq(fundingRoundInvestors.investorId, investors.id))
        .groupBy(fundingRoundInvestors.investorId, investors.name, investors.logo)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);
      
      return {
        total: {
          amount: Number(totalResult?.totalAmount || 0),
          rounds: Number(totalResult?.totalRounds || 0),
          avgDealSize: Number(totalResult?.avgDealSize || 0),
        },
        byRoundType,
        monthlyTrend,
        topInvestors,
      };
    }),

  // ============================================================
  // ARTICLE FUNDING ROUNDS
  // ============================================================

  getArticleFundingRounds: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const rounds = await db
        .select({
          id: fundingRounds.id,
          companyId: fundingRounds.companyId,
          roundType: fundingRounds.roundType,
          amountRaised: fundingRounds.amountRaised,
          currency: fundingRounds.currency,
          fundingDate: fundingRounds.fundingDate,
          isUndisclosed: fundingRounds.isUndisclosed,
          status: fundingRounds.status,
          company: {
            id: companies.id,
            name: companies.name,
            logo: companies.logo,
          }
        })
        .from(fundingRounds)
        .leftJoin(companies, eq(fundingRounds.companyId, companies.id))
        .where(eq(fundingRounds.articleId, input.articleId))
        .orderBy(desc(fundingRounds.fundingDate));
      
      return rounds.map(r => ({
        ...r,
        amount: r.amountRaised,
        announcedDate: r.fundingDate,
      }));
    }),

  unlinkFromArticle: adminProcedure
    .input(z.object({ fundingRoundId: z.number(), articleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      // Remove the articleId from the funding round
      await db
        .update(fundingRounds)
        .set({ articleId: null } as any)
        .where(and(
          eq(fundingRounds.id, input.fundingRoundId),
          eq(fundingRounds.articleId, input.articleId)
        ));
      
      return { success: true };
    }),

  // ============================================================
  // COMPANY FUNDING HISTORY
  // ============================================================
  
  getCompanyFunding: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rounds: [], totalRaised: 0 };
      
      const rounds = await db
        .select({
          id: fundingRounds.id,
          roundType: fundingRounds.roundType,
          amountRaised: fundingRounds.amountRaised,
          currency: fundingRounds.currency,
          valuationPost: fundingRounds.valuationPost,
          fundingDate: fundingRounds.fundingDate,
          isUndisclosed: fundingRounds.isUndisclosed,
          status: fundingRounds.status,
          leadInvestorId: fundingRounds.leadInvestorId,
        })
        .from(fundingRounds)
        .where(eq(fundingRounds.companyId, input.companyId))
        .orderBy(desc(fundingRounds.fundingDate));
      
      // Get investors for each round
      const roundIds = rounds.map(r => r.id);
      let investorsByRound: Record<number, any[]> = {};
      
      if (roundIds.length > 0) {
        const allInvestors = await db
          .select({
            fundingRoundId: fundingRoundInvestors.fundingRoundId,
            investorId: fundingRoundInvestors.investorId,
            role: fundingRoundInvestors.role,
            investorName: investors.name,
            investorLogo: investors.logo,
          })
          .from(fundingRoundInvestors)
          .leftJoin(investors, eq(fundingRoundInvestors.investorId, investors.id))
          .where(inArray(fundingRoundInvestors.fundingRoundId, roundIds));
        
        allInvestors.forEach(inv => {
          if (!investorsByRound[inv.fundingRoundId]) {
            investorsByRound[inv.fundingRoundId] = [];
          }
          investorsByRound[inv.fundingRoundId].push(inv);
        });
      }
      
      const roundsWithInvestors = rounds.map(round => ({
        ...round,
        investors: investorsByRound[round.id] || [],
      }));
      
      const totalRaised = rounds.reduce((sum, r) => sum + Number(r.amountRaised || 0), 0);
      
      return { rounds: roundsWithInvestors, totalRaised };
    }),

  // ============================================================
  // SEARCH
  // ============================================================
  
  searchCompanies: protectedProcedure
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

  searchInvestors: protectedProcedure
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
});
