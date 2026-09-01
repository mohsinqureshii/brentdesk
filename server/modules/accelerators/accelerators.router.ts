/**
 * Accelerators Module Router
 * CRUD operations for accelerator programs
 */

import { z } from "zod";
import { eq, desc, and, like, or, sql, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { accelerators, regions, sectors, workflowStatuses, acceleratorCohorts, acceleratorAlumniCompanies, acceleratorTeamMembers, acceleratorBenefits, acceleratorFaqs, acceleratorPrograms, acceleratorPartners, acceleratorMilestones, acceleratorTestimonials, acceleratorStats, acceleratorDeckSubmissions, acceleratorReminders } from "../../../drizzle/schema";
import { storagePut } from "../../storage";
import { workflowService } from "../../services/workflow.service";
import { editionOrderBias } from "../../services/editionOrder";
import { TRPCError } from "@trpc/server";

// ============================================================
// ACCELERATORS MODULE ROUTER
// ============================================================

export const acceleratorsRouter = router({
  /**
   * List accelerators (public)
   */
  list: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
      regionId: z.number().optional(),
      sectorId: z.number().optional(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).optional(),
      // Edition bias — surface accelerators in this country first.
      editionCountryId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const offset = (input.page - 1) * input.limit;

      // Build conditions
      const conditions = [];
      
      if (input.search) {
        conditions.push(
          or(
            sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${input.search}%`})`,
            sql`LOWER(${accelerators.description}) LIKE LOWER(${`%${input.search}%`})`
          )
        );
      }

      if (input.regionId) {
        conditions.push(eq(accelerators.regionId, input.regionId));
      }

      if (input.sectorId) {
        conditions.push(eq(accelerators.sectorId, input.sectorId));
      }

      if (input.status) {
        conditions.push(eq(accelerators.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select({
        id: accelerators.id,
        name: accelerators.name,
        slug: accelerators.slug,
        description: accelerators.description,
        shortDescription: accelerators.shortDescription,
        logo: accelerators.logo,
        website: accelerators.website,
        location: accelerators.location,
        regionId: accelerators.regionId,
        sectorId: accelerators.sectorId,
        programLength: accelerators.programLength,
        equity: accelerators.equity,
        funding: accelerators.funding,
        applicationDeadline: accelerators.applicationDeadline,
        programStartDate: accelerators.programStartDate,
        programEndDate: accelerators.programEndDate,
        benefits: accelerators.benefits,
        requirements: accelerators.requirements,
        applicationUrl: accelerators.applicationUrl,
        status: accelerators.status,
        isFeatured: accelerators.isFeatured,
        createdById: accelerators.createdById,
        createdAt: accelerators.createdAt,
        updatedAt: accelerators.updatedAt,
      })
        .from(accelerators)
        .where(whereClause)
        .orderBy(
          ...editionOrderBias((accelerators as any).countryId, input.editionCountryId),
          desc(accelerators.createdAt),
        )
        .limit(input.limit)
        .offset(offset);

      const [{ value: total }] = await db.select({ value: sql<number>`COUNT(*) as count` })
        .from(accelerators)
        .where(whereClause);

      return {
        items,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Get single accelerator by ID or slug (public) - RICH detail with all related data
   */
  get: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      slug: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!input.id && !input.slug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either id or slug is required" });
      }

      const condition = input.id 
        ? eq(accelerators.id, input.id)
        : eq(accelerators.slug, input.slug!);

      const result = await db.select({
        id: accelerators.id,
        name: accelerators.name,
        slug: accelerators.slug,
        description: accelerators.description,
        shortDescription: accelerators.shortDescription,
        logo: accelerators.logo,
        website: accelerators.website,
        location: accelerators.location,
        regionId: accelerators.regionId,
        sectorId: accelerators.sectorId,
        programLength: accelerators.programLength,
        equity: accelerators.equity,
        funding: accelerators.funding,
        applicationDeadline: accelerators.applicationDeadline,
        programStartDate: accelerators.programStartDate,
        programEndDate: accelerators.programEndDate,
        benefits: accelerators.benefits,
        requirements: accelerators.requirements,
        applicationUrl: accelerators.applicationUrl,
        status: accelerators.status,
        isFeatured: accelerators.isFeatured,
        createdById: accelerators.createdById,
        createdAt: accelerators.createdAt,
        updatedAt: accelerators.updatedAt,
        countryId: accelerators.countryId,
        cityId: accelerators.cityId,
        email: accelerators.email,
      })
        .from(accelerators)
        .where(condition)
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Accelerator not found" });
      }

      const accel = result[0];
      const accelId = accel.id;

      // Fetch all related data in parallel
      const [cohorts, alumni, team, benefits, faqs, programs, partners, milestones, testimonials, stats] = await Promise.all([
        db.select().from(acceleratorCohorts).where(eq(acceleratorCohorts.acceleratorId, accelId)).orderBy(desc(acceleratorCohorts.cohortNumber)),
        db.select().from(acceleratorAlumniCompanies).where(eq(acceleratorAlumniCompanies.acceleratorId, accelId)).orderBy(acceleratorAlumniCompanies.sortOrder),
        db.select().from(acceleratorTeamMembers).where(eq(acceleratorTeamMembers.acceleratorId, accelId)).orderBy(acceleratorTeamMembers.sortOrder),
        db.select().from(acceleratorBenefits).where(eq(acceleratorBenefits.acceleratorId, accelId)).orderBy(acceleratorBenefits.sortOrder),
        db.select().from(acceleratorFaqs).where(eq(acceleratorFaqs.acceleratorId, accelId)).orderBy(acceleratorFaqs.sortOrder),
        db.select().from(acceleratorPrograms).where(eq(acceleratorPrograms.acceleratorId, accelId)).orderBy(acceleratorPrograms.sortOrder),
        db.select().from(acceleratorPartners).where(eq(acceleratorPartners.acceleratorId, accelId)).orderBy(acceleratorPartners.sortOrder),
        db.select().from(acceleratorMilestones).where(eq(acceleratorMilestones.acceleratorId, accelId)).orderBy(acceleratorMilestones.sortOrder),
        db.select().from(acceleratorTestimonials).where(eq(acceleratorTestimonials.acceleratorId, accelId)).orderBy(acceleratorTestimonials.sortOrder),
        db.select().from(acceleratorStats).where(eq(acceleratorStats.acceleratorId, accelId)).orderBy(acceleratorStats.sortOrder),
      ]);

      return {
        ...accel,
        cohorts,
        alumniCompaniesData: alumni,
        teamMembersData: team,
        benefitsData: benefits,
        faqsData: faqs,
        programsData: programs,
        partnersData: partners,
        milestonesData: milestones,
        testimonialsData: testimonials,
        statsData: stats,
      };
    }),

  /**
   * Get alumni companies with filtering (public)
   */
  getAlumni: publicProcedure
    .input(z.object({
      acceleratorId: z.number(),
      cohortId: z.number().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(acceleratorAlumniCompanies.acceleratorId, input.acceleratorId)];
      if (input.cohortId) conditions.push(eq(acceleratorAlumniCompanies.cohortId, input.cohortId));
      if (input.sector) conditions.push(eq(acceleratorAlumniCompanies.sector, input.sector));
      if (input.country) conditions.push(eq(acceleratorAlumniCompanies.country, input.country));
      if (input.search) conditions.push(sql`LOWER(${acceleratorAlumniCompanies.companyName}) LIKE LOWER(${`%${input.search}%`})`);

      const offset = (input.page - 1) * input.limit;
      const items = await db.select()
        .from(acceleratorAlumniCompanies)
        .where(and(...conditions))
        .orderBy(acceleratorAlumniCompanies.sortOrder)
        .limit(input.limit)
        .offset(offset);

      const countResult = await db.select({ count: sql<number>`COUNT(*)` })
        .from(acceleratorAlumniCompanies)
        .where(and(...conditions));

      return { items, total: Number(countResult[0]?.count || 0) };
    }),

  /**
   * Submit pitch deck (authenticated)
   */
  submitDeck: protectedProcedure
    .input(z.object({
      acceleratorId: z.number(),
      programId: z.number().optional(),
      companyName: z.string().min(1),
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      fileUrl: z.string().min(1),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.insert(acceleratorDeckSubmissions).values({
        acceleratorId: input.acceleratorId,
        userId: ctx.user.id,
        programId: input.programId || null,
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        fileUrl: input.fileUrl,
        message: input.message || null,
      } as any);

      return { success: true };
    }),

  /**
   * Set reminder for upcoming program (public - email based)
   */
  setReminder: publicProcedure
    .input(z.object({
      acceleratorId: z.number(),
      programId: z.number().optional(),
      email: z.string().email(),
      reminderType: z.enum(["application_open", "deadline", "program_start"]).default("application_open"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if reminder already exists
      const existing = await db.select().from(acceleratorReminders)
        .where(and(
          eq(acceleratorReminders.acceleratorId, input.acceleratorId),
          eq(acceleratorReminders.email, input.email),
          eq(acceleratorReminders.reminderType, input.reminderType)
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: true, message: "Reminder already set" };
      }

      await db.insert(acceleratorReminders).values({
        acceleratorId: input.acceleratorId,
        programId: input.programId || null,
        email: input.email,
        reminderType: input.reminderType,
      } as any);

      return { success: true, message: "Reminder set successfully" };
    }),

  /**
   * Create accelerator (admin only)
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      website: z.string().optional(),
      logo: z.string().optional(),
      location: z.string().optional(),
      regionId: z.number().optional(),
      sectorId: z.number().optional(),
      programLength: z.string().optional(),
      equity: z.string().optional(),
      funding: z.string().optional(),
      applicationDeadline: z.string().optional(),
      programStartDate: z.string().optional(),
      programEndDate: z.string().optional(),
      benefits: z.string().optional(),
      requirements: z.string().optional(),
      applicationUrl: z.string().optional(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).default("active"),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      email: z.string().optional(),
      mission: z.string().optional(),
      applicationProcess: z.string().optional(),
      cohortSize: z.string().optional(),
      investmentRange: z.string().optional(),
      equityTaken: z.string().optional(),
      successRate: z.string().optional(),
      totalFunded: z.number().optional(),
      totalRaisedByAlumni: z.string().optional(),
      avgFollowon: z.string().optional(),
      batchCount: z.number().optional(),
      nextCohortDate: z.string().optional(),
      coverImage: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      alumniCompanies: z.any().optional(),
      successStories: z.any().optional(),
      programDetails: z.any().optional(),
      teamMembers: z.any().optional(),
      partners: z.any().optional(),
      notableAlumni: z.any().optional(),
      socialLinks: z.any().optional(),
      gallery: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      // Check for duplicate slug
      const existing = await db.select()
        .from(accelerators)
        .where(eq(accelerators.slug, input.slug))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already exists" });
      }

      const result = await db.insert(accelerators).values({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        website: input.website || null,
        logo: input.logo || null,
        location: input.location || null,
        regionId: input.regionId || null,
        sectorId: input.sectorId || null,
        programLength: input.programLength || null,
        equity: input.equity || null,
        funding: input.funding || null,
        applicationDeadline: input.applicationDeadline || null,
        programStartDate: input.programStartDate || null,
        programEndDate: input.programEndDate || null,
        benefits: input.benefits || null,
        requirements: input.requirements || null,
        applicationUrl: input.applicationUrl || null,
        status: input.status,
        createdById: ctx.user.id,
      } as any);

      // Get the inserted ID
      const inserted = await db.select({ id: accelerators.id })
        .from(accelerators)
        .where(eq(accelerators.slug, input.slug))
        .limit(1);

      return { id: inserted[0]?.id || 0, success: true };
    }),

  /**
   * Update accelerator (admin only)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      shortDescription: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      logo: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      regionId: z.number().optional().nullable(),
      sectorId: z.number().optional().nullable(),
      programLength: z.string().optional().nullable(),
      equity: z.string().optional().nullable(),
      funding: z.string().optional().nullable(),
      applicationDeadline: z.string().optional().nullable(),
      programStartDate: z.string().optional().nullable(),
      programEndDate: z.string().optional().nullable(),
      benefits: z.string().optional().nullable(),
      requirements: z.string().optional().nullable(),
      applicationUrl: z.string().optional().nullable(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).optional(),
      linkedIn: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(),
      facebook: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      youtube: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      mission: z.string().optional().nullable(),
      applicationProcess: z.string().optional().nullable(),
      cohortSize: z.string().optional().nullable(),
      investmentRange: z.string().optional().nullable(),
      equityTaken: z.string().optional().nullable(),
      successRate: z.string().optional().nullable(),
      totalFunded: z.number().optional().nullable(),
      totalRaisedByAlumni: z.string().optional().nullable(),
      avgFollowon: z.string().optional().nullable(),
      batchCount: z.number().optional().nullable(),
      nextCohortDate: z.string().optional().nullable(),
      coverImage: z.string().optional().nullable(),
      contactEmail: z.string().optional().nullable(),
      contactPhone: z.string().optional().nullable(),
      alumniCompanies: z.any().optional(),
      successStories: z.any().optional(),
      programDetails: z.any().optional(),
      teamMembers: z.any().optional(),
      partners: z.any().optional(),
      notableAlumni: z.any().optional(),
      socialLinks: z.any().optional(),
      gallery: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const { id, ...updateData } = input;

      // Check if slug is being changed and if it's unique
      if (updateData.slug) {
        const existing = await db.select()
          .from(accelerators)
          .where(and(
            eq(accelerators.slug, updateData.slug),
            sql`${accelerators.id} != ${id}`
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Slug already exists" });
        }
      }

      // Separate relational data from scalar fields
      const { alumniCompanies, teamMembers, partners, programDetails, notableAlumni, successStories, gallery, socialLinks, ...scalarData } = updateData;

      await db.update(accelerators)
        .set(scalarData as any)
        .where(eq(accelerators.id, id));

      // Sync alumni companies to relational table if provided
      if (Array.isArray(alumniCompanies)) {
        await db.delete(acceleratorAlumniCompanies).where(eq(acceleratorAlumniCompanies.acceleratorId, id));
        if (alumniCompanies.length > 0) {
          await db.insert(acceleratorAlumniCompanies).values(
            alumniCompanies.map((a: any, idx: number) => ({
              acceleratorId: id,
              companyName: a.name || a.companyName || "",
              logo: a.logo || null,
              sector: a.sector || null,
              fundingRaised: a.fundingRaised || null,
              fundingStage: a.status || null,
              sortOrder: idx,
            }))
          );
        }
      }

      // Sync team members to relational table if provided
      if (Array.isArray(teamMembers)) {
        await db.delete(acceleratorTeamMembers).where(eq(acceleratorTeamMembers.acceleratorId, id));
        if (teamMembers.length > 0) {
          await db.insert(acceleratorTeamMembers).values(
            teamMembers.map((t: any, idx: number) => ({
              acceleratorId: id,
              name: t.name || "",
              title: t.role || t.title || null,
              photo: t.image || t.photo || null,
              linkedIn: t.linkedIn || t.linkedin || null,
              sortOrder: idx,
            }))
          );
        }
      }

      // Sync partners to relational table if provided
      if (Array.isArray(partners)) {
        await db.delete(acceleratorPartners).where(eq(acceleratorPartners.acceleratorId, id));
        if (partners.length > 0) {
          await db.insert(acceleratorPartners).values(
            partners.map((p: any, idx: number) => ({
              acceleratorId: id,
              name: p.name || "",
              type: p.type || null,
              logo: p.logo || null,
              description: p.description || null,
              sortOrder: idx,
            }))
          );
        }
      }

      return { success: true };
    }),

  /**
   * Delete accelerator (admin only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!["admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete accelerators" });
      }

      await db.delete(accelerators).where(eq(accelerators.id, input.id));

      return { success: true };
    }),

  /**
   * Admin list with more details
   */
  adminList: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const offset = (input.page - 1) * input.limit;

      const conditions = [];
      
      if (input.search) {
        conditions.push(
          or(
            sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${input.search}%`})`,
            sql`LOWER(${accelerators.description}) LIKE LOWER(${`%${input.search}%`})`
          )
        );
      }

      if (input.status) {
        conditions.push(eq(accelerators.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rawItems = await db.select()
        .from(accelerators)
        .leftJoin(workflowStatuses, eq(accelerators.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(desc(accelerators.createdAt))
        .limit(input.limit)
        .offset(offset);

      const countResult = await db.select({ count: sql<number>`COUNT(*)` })
        .from(accelerators)
        .where(whereClause);
      const total = Number(countResult[0]?.count || 0);

      return {
        items: rawItems.map(row => ({
          ...row.accelerators,
          workflowStatus: row.workflow_statuses?.slug || 'draft',
          workflowStatusName: row.workflow_statuses?.name || 'Draft',
          workflowStatusColor: row.workflow_statuses?.color || '#6B7280',
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Export accelerators for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["active", "upcoming", "completed", "paused"]).optional(),
      limit: z.number().default(10000),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const conditions = [];
      
      if (input.search) {
        conditions.push(
          or(
            sql`LOWER(${accelerators.name}) LIKE LOWER(${`%${input.search}%`})`,
            sql`LOWER(${accelerators.description}) LIKE LOWER(${`%${input.search}%`})`
          )
        );
      }
      if (input.status) {
        conditions.push(eq(accelerators.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(accelerators)
        .where(whereClause)
        .orderBy(desc(accelerators.createdAt))
        .limit(10000);

      return {
        items: results.map(acc => ({
          ...acc,
          type: acc.name,
          applicationDeadline: acc.applicationDeadline,
          programDuration: '',
          fundingAmount: '',
          equityTaken: acc.equity || '',
          batchSize: '',
          isActive: 1,
        })),
      };
    }),
  bulkUpdateStatus: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), statusSlug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      const status = await workflowService.getStatusBySlug("editorial", input.statusSlug);
      if (!status) throw new Error("Status not found");
      await db.update(accelerators)
        .set({ statusId: status.id } as any)
        .where(inArray(accelerators.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!!["admin", "senior_editor"].includes(ctx.user.role)) throw new Error("Unauthorized");
      await db.delete(accelerators).where(inArray(accelerators.id, input.ids));
      return { success: true, count: input.ids.length };
    }),

  // ── Cohort CRUD ──────────────────────────────────────────────

  /**
   * List cohorts for an accelerator (admin)
   */
  getCohorts: protectedProcedure
    .input(z.object({ acceleratorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      const cohorts = await db
        .select()
        .from(acceleratorCohorts)
        .where(eq(acceleratorCohorts.acceleratorId, input.acceleratorId))
        .orderBy(acceleratorCohorts.sortOrder);
      return cohorts;
    }),

  /**
   * Create a cohort (admin/editor)
   */
  createCohort: protectedProcedure
    .input(z.object({
      acceleratorId: z.number(),
      cohortNumber: z.number().optional(),
      name: z.string().min(1),
      year: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      demoDayDate: z.string().optional(),
      cohortSize: z.number().optional(),
      applicationsReceived: z.number().optional(),
      acceptanceRate: z.string().optional(),
      status: z.enum(["completed", "active", "upcoming"]).default("upcoming"),
      theme: z.string().optional(),
      highlights: z.string().optional(),
      totalFundingRaised: z.string().optional(),
      jobsCreated: z.number().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      const result = await db.insert(acceleratorCohorts).values({
        acceleratorId: input.acceleratorId,
        cohortNumber: input.cohortNumber,
        name: input.name,
        year: input.year,
        startDate: input.startDate,
        endDate: input.endDate,
        demoDayDate: input.demoDayDate,
        cohortSize: input.cohortSize,
        applicationsReceived: input.applicationsReceived,
        acceptanceRate: input.acceptanceRate,
        status: input.status,
        theme: input.theme,
        highlights: input.highlights,
        totalFundingRaised: input.totalFundingRaised,
        jobsCreated: input.jobsCreated,
        sortOrder: input.sortOrder,
      } as any);
      return { success: true, id: Number((result as any).insertId) };
    }),

  /**
   * Update a cohort (admin/editor)
   */
  updateCohort: protectedProcedure
    .input(z.object({
      id: z.number(),
      cohortNumber: z.number().optional(),
      name: z.string().min(1).optional(),
      year: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      demoDayDate: z.string().optional(),
      cohortSize: z.number().optional(),
      applicationsReceived: z.number().optional(),
      acceptanceRate: z.string().optional(),
      status: z.enum(["completed", "active", "upcoming"]).optional(),
      theme: z.string().optional(),
      highlights: z.string().optional(),
      totalFundingRaised: z.string().optional(),
      jobsCreated: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      const { id, ...updateData } = input;
      await db.update(acceleratorCohorts).set(updateData as any).where(eq(acceleratorCohorts.id, id));
      return { success: true };
    }),

  /**
   * Delete a cohort (admin only)
   */
  deleteCohort: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      await db.delete(acceleratorCohorts).where(eq(acceleratorCohorts.id, input.id));
      return { success: true };
    }),

  // ── Cohort–Alumni Linking ────────────────────────────────────────

  /**
   * Get all alumni for an accelerator (with cohort assignment info)
   */
  getAcceleratorAlumniWithCohorts: protectedProcedure
    .input(z.object({ acceleratorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      return db
        .select()
        .from(acceleratorAlumniCompanies)
        .where(eq(acceleratorAlumniCompanies.acceleratorId, input.acceleratorId))
        .orderBy(acceleratorAlumniCompanies.sortOrder);
    }),

  /**
   * Assign an alumni company to a cohort (set cohortId)
   */
  assignAlumniToCohort: protectedProcedure
    .input(z.object({
      alumniId: z.number(),
      cohortId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      await db
        .update(acceleratorAlumniCompanies)
        .set({ cohortId: input.cohortId } as any)
        .where(eq(acceleratorAlumniCompanies.id, input.alumniId));
      return { success: true };
    }),

  /**
   * Bulk assign multiple alumni to a cohort
   */
  bulkAssignAlumniToCohort: protectedProcedure
    .input(z.object({
      alumniIds: z.array(z.number()),
      cohortId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      if (input.alumniIds.length === 0) return { success: true, count: 0 };
      await db
        .update(acceleratorAlumniCompanies)
        .set({ cohortId: input.cohortId } as any)
        .where(inArray(acceleratorAlumniCompanies.id, input.alumniIds));
      return { success: true, count: input.alumniIds.length };
    }),
});
