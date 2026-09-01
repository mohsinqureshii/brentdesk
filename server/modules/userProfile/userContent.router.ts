/**
 * User Content Management Router
 * Allows regular users to create/manage companies, jobs, people, accelerators, investors, events
 * All user-created content goes through moderation (submitted → admin approval → published)
 */

import { z } from "zod";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  companies,
  jobs,
  people,
  investors,
  events,
  accelerators,
  jobCategories,
  jobRegions,
  jobSectors,
  claimedProfiles,
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { workflowService } from "../../services/workflow.service";

// ============================================================
// SHARED HELPERS
// ============================================================

async function getSubmittedStatusId(): Promise<number> {
  const status = await workflowService.getStatusBySlug("editorial", "submitted");
  if (!status) {
    const initial = await workflowService.getInitialStatus("editorial");
    return initial?.id || 1;
  }
  return status.id;
}

async function getPublishedStatusId(): Promise<number> {
  const status = await workflowService.getStatusBySlug("editorial", "published");
  return status?.id || 6;
}

// ============================================================
// USER CONTENT ROUTER
// ============================================================

export const userContentRouter = router({
  // ============================================================
  // MY CONTENT OVERVIEW
  // ============================================================
  myContentStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    const [companyCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(companies)
      .where(eq(companies.createdByUserId, userId));

    const [jobCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobs)
      .where(eq(jobs.postedById, userId));

    const [personCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(people)
      .where(eq(people.createdByUserId, userId));

    const [investorCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(investors)
      .where(eq(investors.createdByUserId, userId));

    const [eventCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(events)
      .where(eq(events.createdByUserId, userId));

    const [acceleratorCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(accelerators)
      .where(eq(accelerators.createdById, userId));

    return {
      companies: Number(companyCount?.count || 0),
      jobs: Number(jobCount?.count || 0),
      people: Number(personCount?.count || 0),
      investors: Number(investorCount?.count || 0),
      events: Number(eventCount?.count || 0),
      accelerators: Number(acceleratorCount?.count || 0),
    };
  }),

  // ============================================================
  // COMPANIES - User CRUD
  // ============================================================
  myCompanies: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(companies.createdByUserId, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${companies.name}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        tagline: companies.tagline,
        logo: companies.logo,
        industry: companies.industry,
        statusId: companies.statusId,
        viewCount: companies.viewCount,
        createdAt: companies.createdAt,
        publishedAt: companies.publishedAt,
      })
        .from(companies)
        .where(and(...conditions))
        .orderBy(desc(companies.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      // Enrich with status names
      const enriched = await Promise.all(items.map(async (item) => {
        const statuses = await workflowService.getStatuses("editorial");
        const status = statuses.find((s: any) => s.id === item.statusId);
        return { ...item, statusName: status?.name || "Unknown", statusSlug: status?.slug || "unknown" };
      }));

      return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createCompany: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      tagline: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
      foundedYear: z.number().optional(),
      employeeCount: z.string().optional(),
      totalFunding: z.string().optional(),
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check for duplicate
      const existing = await db
        .select({ id: companies.id })
        .from(companies)
        .where(sql`LOWER(${companies.name}) = LOWER(${input.name})`)
        .limit(1);
      if (existing.length > 0) {
        throw new Error(`Company "${input.name}" already exists.`);
      }

      const slug = await slugService.generateUniqueSlug("company", slugService.generateSlug(input.name));
      const statusId = await getSubmittedStatusId();

      const { name, ...rest } = input;
      const result = await db.insert(companies).values({
        ...rest,
        name,
        slug,
        statusId,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: Number(result[0].insertId), slug };
    }),

  updateCompany: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      tagline: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "public", "acquired"]).optional(),
      foundedYear: z.number().optional(),
      employeeCount: z.string().optional(),
      totalFunding: z.string().optional(),
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership via createdByUserId OR approved claimed profile
      const [company] = await db.select().from(companies).where(eq(companies.id, input.id)).limit(1);
      if (!company) throw new Error("Company not found");

      const isCreator = company.createdByUserId === ctx.user.id;
      let isClaimed = false;
      if (!isCreator) {
        const [claim] = await db.select().from(claimedProfiles).where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.id),
          eq(claimedProfiles.status, "approved"),
        ));
        isClaimed = !!claim;
      }
      if (!isCreator && !isClaimed) throw new Error("You don't have permission to edit this company");

      const { id, ...updateData } = input;
      await db.update(companies).set({ ...updateData, updatedAt: new Date().toISOString() } as any).where(eq(companies.id, id));

      return { success: true };
    }),

  // ============================================================
  // JOBS - User CRUD
  // ============================================================
  myJobs: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(jobs.postedById, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${jobs.title}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        companyName: jobs.companyName,
        companyLogo: jobs.companyLogo,
        location: jobs.location,
        roleType: jobs.roleType,
        statusId: jobs.statusId,
        viewCount: jobs.viewCount,
        applicationCount: jobs.applicationCount,
        createdAt: jobs.createdAt,
        publishedAt: jobs.publishedAt,
        expiresAt: jobs.expiresAt,
      })
        .from(jobs)
        .where(and(...conditions))
        .orderBy(desc(jobs.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      const enriched = await Promise.all(items.map(async (item) => {
        const statuses = await workflowService.getStatuses("editorial");
        const status = statuses.find((s: any) => s.id === item.statusId);
        return { ...item, statusName: status?.name || "Unknown", statusSlug: status?.slug || "unknown" };
      }));

      return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createJob: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(512),
      description: z.string().optional(),
      requirements: z.string().optional(),
      benefits: z.string().optional(),
      companyId: z.number().optional(),
      companyName: z.string().min(1).max(255),
      companyLogo: z.string().optional(),
      companyWebsite: z.string().optional(),
      location: z.string().optional(),
      isRemote: z.boolean().optional(),
      remoteType: z.enum(["fully_remote", "hybrid", "on_site"]).optional(),
      roleType: z.enum(["full_time", "part_time", "contract", "internship", "freelance"]).optional(),
      seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      salaryCurrency: z.string().optional(),
      salaryPeriod: z.enum(["hourly", "monthly", "yearly"]).optional(),
      applyUrl: z.string().optional(),
      applyEmail: z.string().optional(),
      expiresAt: z.date().optional(),
      categoryIds: z.array(z.number()).optional(),
      regionIds: z.array(z.number()).optional(),
      sectorIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { categoryIds, regionIds, sectorIds, salaryMin, salaryMax, ...jobData } = input;

      // If companyId is provided, verify the user has an approved claim on that company
      if (input.companyId) {
        const [claim] = await db.select().from(claimedProfiles).where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, input.companyId),
          eq(claimedProfiles.status, "approved"),
        ));
        const [companyRow] = await db.select({ createdByUserId: companies.createdByUserId })
          .from(companies).where(eq(companies.id, input.companyId));
        if (!claim && companyRow?.createdByUserId !== ctx.user.id) {
          throw new Error("You can only post jobs for companies you own or have claimed");
        }
      }

      const slug = await slugService.generateUniqueSlug("job", slugService.generateSlug(input.title));
      const statusId = await getSubmittedStatusId();

      await db.insert(jobs).values({
        title: jobData.title,
        slug,
        description: jobData.description,
        requirements: jobData.requirements,
        benefits: jobData.benefits,
        companyId: jobData.companyId,
        companyName: jobData.companyName,
        companyLogo: jobData.companyLogo,
        companyWebsite: jobData.companyWebsite,
        location: jobData.location,
        isRemote: jobData.isRemote,
        remoteType: jobData.remoteType,
        roleType: jobData.roleType,
        seniority: jobData.seniority,
        salaryMin: salaryMin !== undefined ? String(salaryMin) : undefined,
        salaryMax: salaryMax !== undefined ? String(salaryMax) : undefined,
        salaryCurrency: jobData.salaryCurrency,
        salaryPeriod: jobData.salaryPeriod,
        applyUrl: jobData.applyUrl,
        applyEmail: jobData.applyEmail,
        expiresAt: jobData.expiresAt,
        statusId,
        postedById: ctx.user.id,
      } as any);

      const inserted = await db.select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
      const jobId = inserted[0].id;

      if (categoryIds?.length) {
        for (const categoryId of categoryIds) {
          await db.insert(jobCategories).values({ jobId, categoryId } as any);
        }
      }
      if (regionIds?.length) {
        for (const regionId of regionIds) {
          await db.insert(jobRegions).values({ jobId, regionId } as any);
        }
      }
      if (sectorIds?.length) {
        for (const sectorId of sectorIds) {
          await db.insert(jobSectors).values({ jobId, sectorId } as any);
        }
      }

      return { id: jobId, slug };
    }),

  updateJob: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(512).optional(),
      description: z.string().optional(),
      requirements: z.string().optional(),
      benefits: z.string().optional(),
      companyId: z.number().optional(),
      companyName: z.string().optional(),
      companyLogo: z.string().optional(),
      companyWebsite: z.string().optional(),
      location: z.string().optional(),
      isRemote: z.boolean().optional(),
      remoteType: z.enum(["fully_remote", "hybrid", "on_site"]).optional(),
      roleType: z.enum(["full_time", "part_time", "contract", "internship", "freelance"]).optional(),
      seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      salaryCurrency: z.string().optional(),
      salaryPeriod: z.enum(["hourly", "monthly", "yearly"]).optional(),
      applyUrl: z.string().optional(),
      applyEmail: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership via postedById OR approved claimed profile on the job's company
      const [job] = await db.select().from(jobs).where(eq(jobs.id, input.id)).limit(1);
      if (!job) throw new Error("Job not found");

      const isCreator = job.postedById === ctx.user.id;
      let isClaimed = false;
      if (!isCreator && job.companyId) {
        const [claim] = await db.select().from(claimedProfiles).where(and(
          eq(claimedProfiles.userId, ctx.user.id),
          eq(claimedProfiles.entityType, "company"),
          eq(claimedProfiles.entityId, job.companyId),
          eq(claimedProfiles.status, "approved"),
        ));
        isClaimed = !!claim;
      }
      if (!isCreator && !isClaimed) throw new Error("You don't have permission to edit this job");

      const { id, salaryMin, salaryMax, ...updateData } = input;
      await db.update(jobs).set({
        ...updateData,
        salaryMin: salaryMin !== undefined ? String(salaryMin) : undefined,
        salaryMax: salaryMax !== undefined ? String(salaryMax) : undefined,
        updatedAt: new Date().toISOString(),
      } as any).where(eq(jobs.id, id));

      return { success: true };
    }),

  // ============================================================
  // PEOPLE - User CRUD
  // ============================================================
  myPeople: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(people.createdByUserId, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${people.name}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: people.id,
        name: people.name,
        slug: people.slug,
        title: people.title,
        avatar: people.avatar,
        company: people.company,
        statusId: people.statusId,
        viewCount: people.viewCount,
        createdAt: people.createdAt,
      })
        .from(people)
        .where(and(...conditions))
        .orderBy(desc(people.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      const enriched = await Promise.all(items.map(async (item) => {
        const statuses = await workflowService.getStatuses("editorial");
        const status = statuses.find((s: any) => s.id === item.statusId);
        return { ...item, statusName: status?.name || "Unknown", statusSlug: status?.slug || "unknown" };
      }));

      return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createPerson: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      title: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      company: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      email: z.string().optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const slug = await slugService.generateUniqueSlug("person", slugService.generateSlug(input.name));
      const statusId = await getSubmittedStatusId();

      const result = await db.insert(people).values({
        name: input.name,
        slug,
        title: input.title,
        bio: input.bio,
        avatar: input.avatar,
        company: input.company,
        linkedIn: input.linkedIn,
        twitter: input.twitter,
        email: input.email,
        location: input.location,
        statusId,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: Number(result[0].insertId), slug };
    }),

  // ============================================================
  // INVESTORS - User CRUD
  // ============================================================
  myInvestors: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(investors.createdByUserId, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${investors.name}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: investors.id,
        name: investors.name,
        slug: investors.slug,
        type: investors.type,
        logo: investors.logo,
        statusId: investors.statusId,
        viewCount: investors.viewCount,
        createdAt: investors.createdAt,
      })
        .from(investors)
        .where(and(...conditions))
        .orderBy(desc(investors.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      const enriched = await Promise.all(items.map(async (item) => {
        const statuses = await workflowService.getStatuses("editorial");
        const status = statuses.find((s: any) => s.id === item.statusId);
        return { ...item, statusName: status?.name || "Unknown", statusSlug: status?.slug || "unknown" };
      }));

      return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createInvestor: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      type: z.enum(["angel", "vc", "corporate_vc", "family_office", "accelerator", "other"]),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      location: z.string().optional(),
      investmentStages: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const slug = await slugService.generateUniqueSlug("investor", slugService.generateSlug(input.name));
      const statusId = await getSubmittedStatusId();

      const result = await db.insert(investors).values({
        name: input.name,
        slug,
        type: input.type,
        description: input.description,
        logo: input.logo,
        website: input.website,
        linkedIn: input.linkedIn,
        twitter: input.twitter,
        location: input.location,
        investmentStages: input.investmentStages,
        statusId,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: Number(result[0].insertId), slug };
    }),

  // ============================================================
  // EVENTS - User CRUD
  // ============================================================
  myEvents: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(events.createdByUserId, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${events.title}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        eventType: events.type,
        coverImage: events.featuredImage,
        statusId: events.statusId,
        viewCount: events.viewCount,
        startDate: events.startDate,
        endDate: events.endDate,
        createdAt: events.createdAt,
      })
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      const enriched = await Promise.all(items.map(async (item) => {
        const statuses = await workflowService.getStatuses("editorial");
        const status = statuses.find((s: any) => s.id === item.statusId);
        return { ...item, statusName: status?.name || "Unknown", statusSlug: status?.slug || "unknown" };
      }));

      return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createEvent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(512),
      description: z.string().optional(),
      type: z.enum(["conference", "meetup", "workshop", "hackathon", "webinar", "summit", "other"]),
      coverImage: z.string().optional(),
      location: z.string().optional(),
      venue: z.string().optional(),
      isVirtual: z.boolean().optional(),
      virtualUrl: z.string().optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
      registrationUrl: z.string().optional(),
      organizerName: z.string().optional(),
      organizerLogo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const slug = await slugService.generateUniqueSlug("event", slugService.generateSlug(input.title));
      const statusId = await getSubmittedStatusId();

      const result = await db.insert(events).values({
        title: input.title,
        slug,
        description: input.description,
        type: input.type,
        featuredImage: input.coverImage,
        venue: input.venue,
        virtualUrl: input.virtualUrl,
        startDate: input.startDate,
        endDate: input.endDate || undefined,
        registrationUrl: input.registrationUrl,
        organizerName: input.organizerName,
        organizerLogo: input.organizerLogo,
        statusId,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: Number(result[0].insertId), slug };
    }),

  // ============================================================
  // ACCELERATORS - User CRUD
  // ============================================================
  myAccelerators: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(accelerators.createdById, ctx.user.id)];
      if (input?.search) {
        conditions.push(sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${input.search}%`})`);
      }

      const results = await db.select({
        id: accelerators.id,
        name: accelerators.name,
        slug: accelerators.slug,
        logo: accelerators.logo,
        status: accelerators.status,
        createdAt: accelerators.createdAt,
      })
        .from(accelerators)
        .where(and(...conditions))
        .orderBy(desc(accelerators.createdAt));

      const total = results.length;
      const items = results.slice(offset, offset + limit);

      const enrichedAccel = items.map((item) => {
        return { ...item, statusName: item.status || "Unknown", statusSlug: item.status || "unknown" };
      });

      return { items: enrichedAccel, total, page, totalPages: Math.ceil(total / limit) };
    }),

  createAccelerator: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      logo: z.string().optional(),
      website: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      location: z.string().optional(),
      programLength: z.string().optional(),
      investmentAmount: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const baseSlug = slugService.generateSlug(input.name);
      // accelerators not in EntityType, use manual slug
      const slug = baseSlug + "-" + Date.now().toString(36);
      const statusId = await getSubmittedStatusId();

      const result = await db.insert(accelerators).values({
        name: input.name,
        slug,
        description: input.description,
        logo: input.logo,
        website: input.website,
        location: input.location,
        programLength: input.programLength,
        funding: input.investmentAmount,
        createdById: ctx.user.id,
      } as any);

      return { id: Number(result[0].insertId), slug };
    }),
});
