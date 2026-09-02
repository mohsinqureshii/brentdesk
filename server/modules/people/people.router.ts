/**
 * People Directory Module Router
 * Leader profiles with claim/update moderation
 */

import { z } from "zod";
import { eq, and, desc, asc, like, isNotNull, inArray, sql } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  people, 
  peopleRegions,
  peopleSectors,
  regions,
  sectors,
  workflowStatuses
} from "../../../drizzle/schema";
import { boolInt, toDbDate } from "../../_core/dbValues";
import { slugService } from "../../services/slug.service";
import { editionOrderBias } from "../../services/editionOrder";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";
import { moderationService } from "../../services/moderation.service";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createPersonSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  bio: z.string().optional(),
  shortBio: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string().optional(),
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  github: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  location: z.string().optional(),
  functionalStrengths: z.any().optional(),
  openTo: z.any().optional(),
  experience: z.any().optional(),
  education: z.any().optional(),
  languages: z.any().optional(),
  achievements: z.any().optional(),
  angelInvestments: z.any().optional(),
  boardRoles: z.any().optional(),
  advisorRoles: z.any().optional(),
  companiesFounded: z.any().optional(),
  keyAchievements: z.any().optional(),
  interests: z.any().optional(),
  availability: z.string().optional(),
  bookingRate: z.string().optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
  isVerified: z.boolean().optional(),
  statusId: z.number().optional(),
});

const updatePersonSchema = createPersonSchema.partial().extend({
  id: z.number(),
});

const listPeopleSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  isVerified: z.boolean().optional(),
  // Edition bias — surface people from this country first.
  editionCountryId: z.number().optional(),
  sortBy: z.enum(["name", "createdAt", "viewCount", "companyName", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const claimProfileSchema = z.object({
  personId: z.number(),
  claimantName: z.string().min(1),
  claimantEmail: z.string().email(),
  claimantRole: z.string().optional(),
  proofLinks: z.array(z.string()).optional(),
});

const suggestUpdateSchema = z.object({
  personId: z.number(),
  proposedChanges: z.record(z.string(), z.object({
    old: z.unknown(),
    new: z.unknown(),
  })),
  reason: z.string().optional(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional(),
  evidenceLinks: z.array(z.string()).optional(),
});

// ============================================================
// PEOPLE ROUTER
// ============================================================

export const peopleRouter = router({
  /**
   * List published people (public)
   */
  list: publicProcedure
    .input(listPeopleSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      // Build conditions
      const conditions = [eq(people.statusId, publishedStatus.id)];

      if (filters.search) {
        conditions.push(sql`LOWER(${people.name}) LIKE LOWER(${`%${filters.search}%`})`);
      }
      if (filters.isVerified !== undefined) {
        conditions.push(eq(people.isVerified, filters.isVerified ? 1 : 0));
      }

      // Build query - include all sortBy options with fallbacks
      const sortColumn = {
        name: people.name,
        createdAt: people.createdAt,
        viewCount: people.viewCount,
        companyName: people.company,
        status: people.statusId,
      }[sortBy] || people.createdAt;

      const results = await db.select({
        id: people.id,
        name: people.name,
        slug: people.slug,
        title: people.title,
        company: people.company,
        shortBio: people.shortBio,
        avatar: people.avatar,
        isVerified: people.isVerified,
        viewCount: people.viewCount,
      }).from(people)
        .where(and(...conditions))
        .orderBy(
          ...editionOrderBias(people.countryId, input.editionCountryId),
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
   * Get single person by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(people)
        .where(eq(people.slug, input.slug))
        .limit(1);

      if (!result[0]) return null;

      const person = result[0];

      // Increment view count
      await db.update(people)
        .set({ viewCount: (person.viewCount || 0) + 1 })
        .where(eq(people.id, person.id));

      // Get related data
      const personRegions = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(peopleRegions)
        .innerJoin(regions, eq(peopleRegions.regionId, regions.id))
        .where(eq(peopleRegions.personId, person.id));

      const personSectors = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(peopleSectors)
        .innerJoin(sectors, eq(peopleSectors.sectorId, sectors.id))
        .where(eq(peopleSectors.personId, person.id));

      // Get similar people (same sector or region, exclude current)
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      let similarPeople: Array<{ id: number; name: string; slug: string; title: string | null; company: string | null; avatar: string | null }> = [];
      if (publishedStatus) {
        const similar = await db.select({
          id: people.id,
          name: people.name,
          slug: people.slug,
          title: people.title,
          company: people.company,
          avatar: people.avatar,
        }).from(people)
          .where(and(
            eq(people.statusId, publishedStatus.id),
            sql`${people.id} != ${person.id}`
          ))
          .orderBy(desc(people.viewCount))
          .limit(6);
        similarPeople = similar;
      }

      // Get SEO meta
      const seo = await seoService.getSeoMeta("person", person.id, person as Record<string, unknown>);

      return {
        ...person,
        regions: personRegions,
        sectors: personSectors,
        similarPeople,
        seo,
      };
    }),

  /**
   * Claim profile (public)
   */
  claimProfile: publicProcedure
    .input(claimProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const claimId = await moderationService.submitClaim({
        entityType: "person",
        entityId: input.personId,
        claimantUserId: ctx.user?.id,
        claimantName: input.claimantName,
        claimantEmail: input.claimantEmail,
        claimantRole: input.claimantRole,
        proofLinks: input.proofLinks,
      });

      return { success: true, claimId };
    }),

  /**
   * Suggest update (public)
   */
  suggestUpdate: publicProcedure
    .input(suggestUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const updateId = await moderationService.submitUpdate({
        entityType: "person",
        entityId: input.personId,
        submitterUserId: ctx.user?.id,
        submitterName: input.submitterName,
        submitterEmail: input.submitterEmail,
        proposedChanges: input.proposedChanges as Record<string, { old: unknown; new: unknown }>,
        reason: input.reason,
        evidenceLinks: input.evidenceLinks,
      });

      return { success: true, updateId };
    }),

  /**
   * Get version history (public)
   */
  getVersionHistory: publicProcedure
    .input(z.object({ personId: z.number() }))
    .query(async ({ input }) => {
      return moderationService.getVersionHistory("person", input.personId);
    }),

  // --------------------------------------------------------
  // ADMIN ENDPOINTS
  // --------------------------------------------------------

  /**
   * List all people (admin)
   */
  adminList: protectedProcedure
    .input(listPeopleSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { page, limit, search, status, isVerified, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build conditions for server-side filtering
      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${people.name}) LIKE LOWER(${searchTerm}) OR LOWER(${people.title}) LIKE LOWER(${searchTerm}) OR LOWER(${people.company}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (status) {
        conditions.push(eq(people.statusId, parseInt(status)));
      }
      if (isVerified !== undefined) {
        conditions.push(eq(people.isVerified, isVerified ? 1 : 0));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(people)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      // Build dynamic sort order
      const sortFn = sortOrder === "asc" ? asc : desc;
      const sortColumn = {
        name: people.name,
        createdAt: people.createdAt,
        viewCount: people.viewCount,
        companyName: people.company,
        status: people.statusId,
      }[sortBy] || people.createdAt;

      // Get paginated results with workflow status
      const rawResults = await db
        .select()
        .from(people)
        .leftJoin(workflowStatuses, eq(people.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(sortFn(sortColumn))
        .limit(limit)
        .offset(offset);

      return {
        items: rawResults.map(row => ({
          ...row.people,
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
   * Get single person by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(people)
        .where(eq(people.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const person = result[0];

      // Get taxonomy IDs
      const regIds = await db.select({ regionId: peopleRegions.regionId })
        .from(peopleRegions)
        .where(eq(peopleRegions.personId, person.id));

      const secIds = await db.select({ sectorId: peopleSectors.sectorId })
        .from(peopleSectors)
        .where(eq(peopleSectors.personId, person.id));

      // Get workflow info
      const availableTransitions = await workflowService.getAvailableTransitions(
        person.statusId,
        ctx.user.role
      );

      return {
        ...person,
        regionIds: regIds.map(r => r.regionId),
        sectorIds: secIds.map(s => s.sectorId),
        availableTransitions,
      };
    }),

  /**
   * Create person (admin)
   */
  create: protectedProcedure
    .input(createPersonSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { regionIds, sectorIds, ...personData } = input;

      // Generate slug
      const baseSlug = input.slug || slugService.generateSlug(input.name);
      const slug = await slugService.generateUniqueSlug("person", baseSlug);

      // Get status - use provided statusId or default to published for directory entries
      let statusId = personData.statusId;
      if (!statusId) {
        // Default to published for directory entries (companies, people, investors)
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        statusId = publishedStatus?.id;
        if (!statusId) {
          const initialStatus = await workflowService.getInitialStatus("editorial");
          statusId = initialStatus?.id || 1;
        }
      }

      // Create person
      await db.insert(people).values({
        ...personData,
        isVerified: boolInt(personData.isVerified),
        slug,
        statusId,
      });

      // Get inserted person
      const inserted = await db.select()
        .from(people)
        .where(eq(people.slug, slug))
        .limit(1);

      const personId = inserted[0].id;

      // Add taxonomies
      if (regionIds?.length) {
        for (const regionId of regionIds) {
          await db.insert(peopleRegions).values({ personId, regionId });
        }
      }
      if (sectorIds?.length) {
        for (const sectorId of sectorIds) {
          await db.insert(peopleSectors).values({ personId, sectorId });
        }
      }

      return { id: personId, slug };
    }),

  /**
   * Update person (admin)
   */
  update: protectedProcedure
    .input(updatePersonSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, regionIds, sectorIds, ...personData } = input;

      // Update person — flags become tinyint numbers; keys with
      // undefined values are skipped by drizzle, as before.
      const updateData: Partial<typeof people.$inferInsert> = {
        ...personData,
        isVerified: boolInt(personData.isVerified),
      };
      await db.update(people)
        .set(updateData)
        .where(eq(people.id, id));

      // Update taxonomies
      if (regionIds !== undefined) {
        await db.delete(peopleRegions).where(eq(peopleRegions.personId, id));
        for (const regionId of regionIds) {
          await db.insert(peopleRegions).values({ personId: id, regionId });
        }
      }
      if (sectorIds !== undefined) {
        await db.delete(peopleSectors).where(eq(peopleSectors.personId, id));
        for (const sectorId of sectorIds) {
          await db.insert(peopleSectors).values({ personId: id, sectorId });
        }
      }

      return { success: true };
    }),

  /**
   * Transition person status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      personId: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await workflowService.executeTransition(
        "person",
        input.personId,
        input.transitionId,
        ctx.user.id,
        ctx.user.role,
        input.comment
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await db.update(people)
        .set({ statusId: result.newStatusId })
        .where(eq(people.id, input.personId));

      // If published, set publishedAt
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (result.newStatusId === publishedStatus?.id) {
        await db.update(people)
          .set({ publishedAt: toDbDate(new Date()) })
          .where(eq(people.id, input.personId));
      }

      return { success: true, newStatusId: result.newStatusId };
    }),

  /**
   * Delete person (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await db.delete(peopleRegions).where(eq(peopleRegions.personId, input.id));
      await db.delete(peopleSectors).where(eq(peopleSectors.personId, input.id));
      await db.delete(people).where(eq(people.id, input.id));

      return { success: true };
    }),

  /**
   * Verify person (admin/moderator)
   */
  verify: protectedProcedure
    .input(z.object({ personId: z.number(), isVerified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "moderator"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      await db.update(people)
        .set({ isVerified: (input.isVerified ? 1 : 0) })
        .where(eq(people.id, input.personId));
      return { success: true };
    }),

  /**
   * Bulk update status (admin)
   */
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      statusSlug: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const status = await workflowService.getStatusBySlug("editorial", input.statusSlug);
      if (!status) throw new Error("Status not found");

      await db.update(people)
        .set({ 
          statusId: status.id,
          ...(input.statusSlug === "published" ? { publishedAt: toDbDate(new Date()) } : {})
        })
        .where(inArray(people.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  /**
   * Bulk delete (admin)
   */
  bulkDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      for (const id of input.ids) {
        await db.delete(peopleRegions).where(eq(peopleRegions.personId, id));
        await db.delete(peopleSectors).where(eq(peopleSectors.personId, id));
      }

      await db.delete(people).where(inArray(people.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  /**
   * Quick create person (full fields with workflow support)
   */
  quickCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      title: z.string().optional(),
      company: z.string().optional(),
      companyId: z.number().optional(),
      shortBio: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      email: z.string().optional(),
      linkedIn: z.string().optional(),
      twitter: z.string().optional(),
      website: z.string().optional(),
      countryId: z.number().optional(),
      cityId: z.number().optional(),
      location: z.string().optional(),
      publishDirectly: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor", "author"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Check for existing person with same name (case-insensitive)
      const existing = await db
        .select({ id: people.id, name: people.name })
        .from(people)
        .where(sql`LOWER(${people.name}) = LOWER(${input.name})`)
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Person "${existing[0].name}" already exists. Please link to the existing person instead.`);
      }

      // Generate slug
      const baseSlug = slugService.generateSlug(input.name);
      const slug = await slugService.generateUniqueSlug("person", baseSlug);

      // Determine status based on publishDirectly flag and user role
      let statusId: number;
      if (input.publishDirectly && ctx.user.role === "admin") {
        const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
        if (!publishedStatus) throw new Error("Published status not found");
        statusId = publishedStatus.id;
      } else if (input.publishDirectly === false) {
        // Submit for review
        const submittedStatus = await workflowService.getStatusBySlug("editorial", "submitted");
        if (!submittedStatus) throw new Error("Submitted status not found");
        statusId = submittedStatus.id;
      } else {
        // Default to draft
        const initialStatus = await workflowService.getInitialStatus("editorial");
        if (!initialStatus) throw new Error("Workflow not initialized");
        statusId = initialStatus.id;
      }

      // Create person with all provided data
      await db.insert(people).values({
        name: input.name,
        slug,
        title: input.title,
        company: input.company,
        companyId: input.companyId,
        shortBio: input.shortBio,
        bio: input.bio,
        avatar: input.avatar,
        email: input.email,
        linkedIn: input.linkedIn,
        twitter: input.twitter,
        website: input.website,
        countryId: input.countryId,
        cityId: input.cityId,
        location: input.location,
        statusId,
        publishedAt: input.publishDirectly && ctx.user.role === "admin" ? toDbDate(new Date()) : undefined,
      });

      // Get inserted person
      const inserted = await db.select()
        .from(people)
        .where(eq(people.slug, slug))
        .limit(1);

      return { id: inserted[0].id, name: input.name, slug };
    }),

  /**
   * Export people for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(listPeopleSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { search, status, isVerified } = input;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${people.name}) LIKE LOWER(${searchTerm}) OR LOWER(${people.title}) LIKE LOWER(${searchTerm}) OR LOWER(${people.company}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (status) {
        conditions.push(eq(people.statusId, parseInt(status)));
      }
      if (isVerified !== undefined) {
        conditions.push(eq(people.isVerified, isVerified ? 1 : 0));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(people)
        .where(whereClause)
        .orderBy(desc(people.createdAt))
        .limit(10000);

      return {
        items: results.map(person => ({
          ...person,
          company: { name: person.company },
          linkedinUrl: person.linkedIn,
          twitterUrl: person.twitter,
        })),
      };
    }),
});
