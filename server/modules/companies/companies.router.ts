/**
 * Companies Module Router
 * Full CRUD with filters, search, and workflow integration
 */

import { z } from "zod";
import { eq, and, desc, asc, like, or, sql, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  companies, 
  companyRegions,
  companySectors,
  companyProducts,
  companyAwards,
  companyUpdates,
  regions,
  sectors,
  people,
  jobs,
  articles,
  articleCompanies,
  fundingRounds,
  fundingRoundInvestors,
  investors,
  workflowStatuses,
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { editionOrderBias } from "../../services/editionOrder";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
  location: z.string().optional(),
  regionId: z.number().optional(),
  industry: z.string().optional(),
  sectorId: z.number().optional(),
  stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
  foundedYear: z.number().optional(),
  employeeCount: z.string().optional(),
  totalFunding: z.string().optional(),
  isVerified: z.boolean().optional(),
  isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
  statusId: z.number().optional(),
  // New comprehensive fields
  shortDescription: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  problemSolved: z.string().optional(),
  marketServed: z.string().optional(),
  coverImage: z.string().optional(),
  brandColor: z.string().optional(),
  activeUsersRange: z.string().optional(),
  arrRange: z.string().optional(),
  countriesServed: z.number().optional(),
  clientsCount: z.number().optional(),
  notableCustomers: z.any().optional(),
  partnerships: z.any().optional(),
  mediaKit: z.string().optional(),
  logoPack: z.string().optional(),
  boilerplate: z.string().optional(),
  prContactEmail: z.string().optional(),
  appStoreLink: z.string().optional(),
  playStoreLink: z.string().optional(),
  techStack: z.any().optional(),
  keyPeople: z.any().optional(),
  timeline: z.any().optional(),
  certifications: z.any().optional(),
  pitchDeck: z.string().optional(),
  whitepapers: z.any().optional(),
  caseStudies: z.any().optional(),
  hiringActively: z.boolean().optional(),
});

const updateCompanySchema = createCompanySchema.partial().extend({
  id: z.number(),
});

const productSchema = z.object({
  id: z.number().optional(),
  companyId: z.number(),
  name: z.string().min(1).max(255),
  category: z.string().optional(),
  description: z.string().optional(),
  screenshots: z.any().optional(),
  demoVideo: z.string().optional(),
  pricingModel: z.string().optional(),
  integrations: z.any().optional(),
  clients: z.any().optional(),
  sortOrder: z.number().optional(),
});

const awardSchema = z.object({
  id: z.number().optional(),
  companyId: z.number(),
  title: z.string().min(1).max(255),
  year: z.number().optional(),
  organization: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

const updateSchema = z.object({
  id: z.number().optional(),
  companyId: z.number(),
  type: z.enum(["text", "image", "milestone", "event", "product_launch"]).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  image: z.string().optional(),
  link: z.string().optional(),
});

const listCompaniesSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  industry: z.string().optional(),
  stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  // Edition bias — surface companies in this country first.
  editionCountryId: z.number().optional(),
  sortBy: z.enum(["createdAt", "publishedAt", "name", "foundedYear"]).default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================
// COMPANIES ROUTER
// ============================================================

export const companiesRouter = router({
  /**
   * List published companies (public)
   */
  list: publicProcedure
    .input(listCompaniesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      const conditions = [
        eq(companies.statusId, publishedStatus.id)
      ];

      if (filters.search) {
        conditions.push(or(
          sql`LOWER(${companies.name}) LIKE LOWER(${`%${filters.search}%`})`,
          sql`LOWER(${companies.tagline}) LIKE LOWER(${`%${filters.search}%`})`
        ) as any);
      }
      if (filters.industry) {
        conditions.push(eq(companies.industry, filters.industry));
      }
      if (filters.stage) {
        conditions.push(eq(companies.stage, filters.stage));
      }
      if (filters.isFeatured !== undefined) {
        conditions.push(eq(companies.isFeatured, filters.isFeatured as any));
      }

      const sortColumn = {
        createdAt: companies.createdAt,
        publishedAt: companies.publishedAt,
        name: companies.name,
        foundedYear: companies.foundedYear,
      }[sortBy];

      const results = await db.select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        tagline: companies.tagline,
        logo: companies.logo,
        website: companies.website,
        location: companies.location,
        industry: companies.industry,
        stage: companies.stage,
        foundedYear: companies.foundedYear,
        employeeCount: companies.employeeCount,
        totalFunding: companies.totalFunding,
        isVerified: companies.isVerified,
        isFeatured: companies.isFeatured,
        publishedAt: companies.publishedAt,
      }).from(companies)
        .where(and(...conditions))
        .orderBy(
          ...editionOrderBias(companies.countryId, input.editionCountryId),
          sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn),
        );

      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        items: paginatedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single company by ID (public)
   */
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(companies)
        .where(eq(companies.id, input.id))
        .limit(1);

      if (!result[0]) return null;
      return result[0];
    }),

  /**
   * Get comprehensive company by slug (public) - returns ALL data for the company page
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(companies)
        .where(eq(companies.slug, input.slug))
        .limit(1);

      if (!result[0]) return null;

      const company = result[0];

      // Increment view count
      await db.update(companies)
        .set({ viewCount: (company.viewCount || 0) + 1 } as any)
        .where(eq(companies.id, company.id));

      // Get related taxonomy data
      const companyRegions_ = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(companyRegions)
        .innerJoin(regions, eq(companyRegions.regionId, regions.id))
        .where(eq(companyRegions.companyId, company.id));

      const companySectors_ = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(companySectors)
        .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
        .where(eq(companySectors.companyId, company.id));

      // Get team members (people linked to this company)
      const teamMembers = await db.select({
        id: people.id,
        name: people.name,
        slug: people.slug,
        title: people.title,
        avatar: people.avatar,
        linkedIn: people.linkedIn,
        company: people.company,
      })
        .from(people)
        .where(eq(people.companyId, company.id))
        .limit(20);

      // Get published status for jobs
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");

      // Get open jobs at this company
      const openJobs = publishedStatus ? await db.select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        location: jobs.location,
        isRemote: jobs.isRemote,
        remoteType: jobs.remoteType,
        roleType: jobs.roleType,
        seniority: jobs.seniority,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        publishedAt: jobs.publishedAt,
      })
        .from(jobs)
        .where(and(
          eq(jobs.companyId, company.id),
          eq(jobs.statusId, publishedStatus.id)
        ))
        .orderBy(desc(jobs.publishedAt))
        .limit(10) : [];

      // Get related articles (via article_companies junction)
      const relatedArticles = publishedStatus ? await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        mentionType: articleCompanies.mentionType,
      })
        .from(articleCompanies)
        .innerJoin(articles, eq(articleCompanies.articleId, articles.id))
        .where(and(
          eq(articleCompanies.companyId, company.id),
          eq(articles.statusId, publishedStatus.id)
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(10) : [];

      // Get funding rounds
      const fundingRounds_ = await db.select()
        .from(fundingRounds)
        .where(eq(fundingRounds.companyId, company.id))
        .orderBy(desc(fundingRounds.fundingDate));

      // Get investors for each funding round
      const fundingWithInvestors = await Promise.all(
        fundingRounds_.map(async (round) => {
          const roundInvestors = await db.select({
            id: investors.id,
            name: investors.name,
            slug: investors.slug,
            logo: investors.logo,
            role: fundingRoundInvestors.role,
          })
            .from(fundingRoundInvestors)
            .innerJoin(investors, eq(fundingRoundInvestors.investorId, investors.id))
            .where(eq(fundingRoundInvestors.fundingRoundId, round.id));
          return { ...round, investors: roundInvestors };
        })
      );

      // Get products
      const products = await db.select()
        .from(companyProducts)
        .where(eq(companyProducts.companyId, company.id))
        .orderBy(asc(companyProducts.sortOrder));

      // Get awards
      const awards = await db.select()
        .from(companyAwards)
        .where(eq(companyAwards.companyId, company.id))
        .orderBy(desc(companyAwards.year));

      // Get updates feed
      const updates = await db.select()
        .from(companyUpdates)
        .where(eq(companyUpdates.companyId, company.id))
        .orderBy(desc(companyUpdates.createdAt))
        .limit(20);

      // Get similar companies (same industry or sector)
      const similarConditions = [];
      if (company.industry) {
        similarConditions.push(eq(companies.industry, company.industry));
      }
      if (publishedStatus) {
        similarConditions.push(eq(companies.statusId, publishedStatus.id));
      }
      const similarCompanies = similarConditions.length > 0 ? await db.select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        tagline: companies.tagline,
        logo: companies.logo,
        industry: companies.industry,
        location: companies.location,
        stage: companies.stage,
      })
        .from(companies)
        .where(and(
          ...similarConditions,
          sql`${companies.id} != ${company.id}`
        ))
        .limit(6) : [];

      // Get SEO meta
      const seo = await seoService.getSeoMeta("company", company.id, company as Record<string, unknown>);

      return {
        ...company,
        regions: companyRegions_,
        sectors: companySectors_,
        teamMembers,
        openJobs,
        relatedArticles,
        fundingRounds: fundingWithInvestors,
        products,
        awards,
        updates,
        similarCompanies,
        seo,
      };
    }),

  /**
   * List all companies (admin)
   */
  adminList: protectedProcedure
    .input(listCompaniesSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { page, limit, search, industry, stage, isFeatured } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${companies.name}) LIKE LOWER(${searchTerm}) OR LOWER(${companies.tagline}) LIKE LOWER(${searchTerm}) OR LOWER(${companies.location}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (industry) {
        conditions.push(eq(companies.industry, industry));
      }
      if (stage) {
        conditions.push(eq(companies.stage, stage));
      }
      if (isFeatured !== undefined) {
        conditions.push(eq(companies.isFeatured, isFeatured as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(companies)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      const rawResults = await db
        .select()
        .from(companies)
        .leftJoin(workflowStatuses, eq(companies.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: rawResults.map(row => ({
          ...row.companies,
          status: row.workflow_statuses?.slug || 'draft',
          statusName: row.workflow_statuses?.name || 'Draft',
          statusColor: row.workflow_statuses?.color || '#6B7280',
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single company by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(companies)
        .where(eq(companies.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const company = result[0];

      const regIds = await db.select({ regionId: companyRegions.regionId })
        .from(companyRegions)
        .where(eq(companyRegions.companyId, company.id));

      const secIds = await db.select({ sectorId: companySectors.sectorId })
        .from(companySectors)
        .where(eq(companySectors.companyId, company.id));

      const availableTransitions = await workflowService.getAvailableTransitions(
        company.statusId,
        ctx.user.role
      );

      return {
        ...company,
        regionIds: regIds.map(r => r.regionId),
        sectorIds: secIds.map(s => s.sectorId),
        availableTransitions,
      };
    }),

  /**
   * Create company (admin)
   */
  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { regionIds, sectorIds, statusId: inputStatusId, ...companyData } = input;

      const baseSlug = slugService.generateSlug(companyData.name);
      const slug = await slugService.generateUniqueSlug("company", baseSlug);

      let statusId: number;
      if (inputStatusId) {
        statusId = inputStatusId;
      } else {
        const initialStatus = await workflowService.getInitialStatus("editorial");
        if (!initialStatus) throw new Error("Workflow not initialized");
        statusId = initialStatus.id;
      }

      const result = await db.insert(companies).values({
        ...companyData,
        slug,
        statusId,
        createdByUserId: ctx.user.id,
      } as any);

      const companyId = Number(result[0].insertId);

      if (regionIds && regionIds.length > 0) {
        await db.insert(companyRegions).values(
          regionIds.map(regionId => ({ companyId, regionId }))
        );
      }

      if (sectorIds && sectorIds.length > 0) {
        await db.insert(companySectors).values(
          sectorIds.map(sectorId => ({ companyId, sectorId }))
        );
      }

      return { id: companyId, slug };
    }),

  /**
   * Update company (admin)
   */
  update: protectedProcedure
    .input(updateCompanySchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, regionIds, sectorIds, statusId: inputStatusId, ...companyData } = input;

      const updateData: any = { ...companyData };
      if (inputStatusId) {
        updateData.statusId = inputStatusId;
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        if (publishedStatus && inputStatusId === publishedStatus.id) {
          updateData.publishedAt = new Date();
        }
      }

      await db.update(companies)
        .set(updateData as any)
        .where(eq(companies.id, id));

      if (regionIds !== undefined) {
        await db.delete(companyRegions).where(eq(companyRegions.companyId, id));
        if (regionIds.length > 0) {
          await db.insert(companyRegions).values(
            regionIds.map(regionId => ({ companyId: id, regionId }))
          );
        }
      }

      if (sectorIds !== undefined) {
        await db.delete(companySectors).where(eq(companySectors.companyId, id));
        if (sectorIds.length > 0) {
          await db.insert(companySectors).values(
            sectorIds.map(sectorId => ({ companyId: id, sectorId }))
          );
        }
      }

      return { id };
    }),

  /**
   * Delete company (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      await db.delete(companyRegions).where(eq(companyRegions.companyId, input.id));
      await db.delete(companySectors).where(eq(companySectors.companyId, input.id));
      await db.delete(companyProducts).where(eq(companyProducts.companyId, input.id));
      await db.delete(companyAwards).where(eq(companyAwards.companyId, input.id));
      await db.delete(companyUpdates).where(eq(companyUpdates.companyId, input.id));
      await db.delete(companies).where(eq(companies.id, input.id));

      return { success: true };
    }),

  /**
   * Transition workflow status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      id: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const company = await db.select()
        .from(companies)
        .where(eq(companies.id, input.id))
        .limit(1);

      if (!company[0]) throw new Error("Company not found");

      const result = await workflowService.executeTransition(
        "company",
        input.id,
        Number(input.transitionId),
        ctx.user.id,
        ctx.user.role,
        undefined
      );

      const updateData: any = { statusId: result.newStatusId };
      if ((result as any).isPublished) {
        updateData.publishedAt = new Date();
      }

      await db.update(companies)
        .set(updateData as any)
        .where(eq(companies.id, input.id));

      return result;
    }),

  /**
   * Quick create company (full fields with workflow support)
   */
  quickCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      tagline: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      countryId: z.number().optional(),
      cityId: z.number().optional(),
      addressLine: z.string().optional(),
      stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
      foundedYear: z.number().optional(),
      employeeCount: z.string().optional(),
      totalFunding: z.string().optional(),
      publishDirectly: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const existing = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(sql`LOWER(${companies.name}) = LOWER(${input.name})`)
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Company "${existing[0].name}" already exists. Please link to the existing company instead.`);
      }

      const baseSlug = slugService.generateSlug(input.name);
      const slug = await slugService.generateUniqueSlug("company", baseSlug);

      let statusId: number;
      if (input.publishDirectly && ctx.user.role === "admin") {
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        if (!publishedStatus) throw new Error("Published status not found");
        statusId = publishedStatus.id;
      } else if (input.publishDirectly === false) {
        const submittedStatus = await workflowService.getStatusBySlug("editorial", "submitted");
        if (!submittedStatus) throw new Error("Submitted status not found");
        statusId = submittedStatus.id;
      } else {
        const initialStatus = await workflowService.getInitialStatus("editorial");
        if (!initialStatus) throw new Error("Workflow not initialized");
        statusId = initialStatus.id;
      }

      const result = await db.insert(companies).values({
        name: input.name,
        slug,
        tagline: input.tagline,
        description: input.description,
        logo: input.logo,
        website: input.website,
        industry: input.industry,
        linkedIn: input.linkedIn,
        twitter: input.twitter,
        countryId: input.countryId,
        cityId: input.cityId,
        addressLine: input.addressLine,
        stage: input.stage,
        foundedYear: input.foundedYear,
        employeeCount: input.employeeCount,
        totalFunding: input.totalFunding,
        statusId,
        publishedAt: input.publishDirectly && ctx.user.role === "admin" ? new Date() : undefined,
      } as any);

      const companyId = Number(result[0].insertId);

      return { id: companyId, name: input.name, slug };
    }),

  /**
   * Get stats for dashboard
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allCompanies = await db.select().from(companies);
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      
      const published = allCompanies.filter(c => c.statusId === publishedStatus?.id).length;
      const featured = allCompanies.filter(c => c.isFeatured).length;
      const verified = allCompanies.filter(c => c.isVerified).length;

      return {
        total: allCompanies.length,
        published,
        featured,
        verified,
      };
    }),

  /**
   * Export companies for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(listCompaniesSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { search, industry, stage, isFeatured } = input;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${companies.name}) LIKE LOWER(${searchTerm}) OR LOWER(${companies.description}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (industry) {
        conditions.push(eq(companies.industry, industry));
      }
      if (stage) {
        conditions.push(eq(companies.stage, stage));
      }
      if (isFeatured !== undefined) {
        conditions.push(eq(companies.isFeatured, isFeatured as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(companies)
        .where(whereClause)
        .orderBy(desc(companies.createdAt))
        .limit(10000);

      return {
        items: results.map(company => ({
          ...company,
          fundingStage: company.stage,
          totalFunding: company.totalFunding,
        })),
      };
    }),

  /**
   * Get simple company list for dropdowns (id, name, logo, website)
   */
  dropdown: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [];
      if (input?.search) {
        conditions.push(sql`LOWER(${companies.name}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: companies.id,
        name: companies.name,
        logo: companies.logo,
        website: companies.website,
      }).from(companies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(companies.name))
        .limit(500);

      return results;
    }),

  // ============================================================
  // COMPANY PRODUCTS CRUD
  // ============================================================
  listProducts: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(companyProducts).where(eq(companyProducts.companyId, input.companyId)).orderBy(asc(companyProducts.sortOrder));
    }),

  upsertProduct: protectedProcedure
    .input(productSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const { id, ...data } = input;
      if (id) {
        await db.update(companyProducts).set(data as any).where(eq(companyProducts.id, id));
        return { id };
      } else {
        const result = await db.insert(companyProducts).values(data as any);
        return { id: Number(result[0].insertId) };
      }
    }),

  deleteProduct: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      await db.delete(companyProducts).where(eq(companyProducts.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // COMPANY AWARDS CRUD
  // ============================================================
  listAwards: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(companyAwards).where(eq(companyAwards.companyId, input.companyId)).orderBy(desc(companyAwards.year));
    }),

  upsertAward: protectedProcedure
    .input(awardSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const { id, ...data } = input;
      if (id) {
        await db.update(companyAwards).set(data as any).where(eq(companyAwards.id, id));
        return { id };
      } else {
        const result = await db.insert(companyAwards).values(data as any);
        return { id: Number(result[0].insertId) };
      }
    }),

  deleteAward: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      await db.delete(companyAwards).where(eq(companyAwards.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // COMPANY UPDATES CRUD
  // ============================================================
  listUpdates: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(companyUpdates).where(eq(companyUpdates.companyId, input.companyId)).orderBy(desc(companyUpdates.createdAt)).limit(50);
    }),

  upsertUpdate: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const { id, ...data } = input;
      if (id) {
        await db.update(companyUpdates).set(data as any).where(eq(companyUpdates.id, id));
        return { id };
      } else {
        const result = await db.insert(companyUpdates).values(data as any);
        return { id: Number(result[0].insertId) };
      }
    }),

  deleteUpdate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      await db.delete(companyUpdates).where(eq(companyUpdates.id, input.id));
      return { success: true };
    }),
  bulkUpdateStatus: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), statusSlug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const status = await workflowService.getStatusBySlug("editorial", input.statusSlug);
      if (!status) throw new Error("Status not found");
      await db.update(companies)
        .set({ statusId: status.id, ...(input.statusSlug === "published" ? { publishedAt: new Date().toISOString() } : {}) } as any)
        .where(inArray(companies.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      for (const id of input.ids) {
        await db.delete(companyRegions).where(eq(companyRegions.companyId, id));
        await db.delete(companySectors).where(eq(companySectors.companyId, id));
      }
      await db.delete(companies).where(inArray(companies.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
});
