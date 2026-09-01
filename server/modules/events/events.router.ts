/**
 * Events Module Router
 * Conferences, webinars, and meetups
 */

import { publication } from "../../../shared/publication";
import { z } from "zod";
import { eq, and, desc, asc, like, gte, lte, or, inArray, sql, getTableColumns } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  events,
  eventCategories,
  eventRegions,
  eventSectors,
  eventSchedule,
  eventGallery,
  eventSpeakers,
  eventTracks,
  eventSideEvents,
  eventSponsors,
  eventFaqs,
  eventCoverage,
  eventHighlights,
  eventTickets,
  eventPromoCodes,
  eventOrders,
  eventOrderItems,
  eventLivePosts,
  eventRecordings,
  eventAttendees,
  eventCorrespondents,
  eventExternalClicks,
  eventSubmissions,
  categories,
  regions,
  sectors,
  workflowStatuses,
  media,
  articles,
  articleEvents,
  users,
  people,
  companies,
  investors
} from "../../../drizzle/schema";
import { slugService } from "../../services/slug.service";
import { editionOrderBias } from "../../services/editionOrder";
import { seoService } from "../../services/seo.service";
import { workflowService } from "../../services/workflow.service";
import { resolveEventMode } from "../../services/eventMode.service";
import { canPostLive, canPostLiveWithReason } from "../../services/eventPermissions.service";
import * as stripePaymentService from "../../services/stripePayment.service";
import { moderateSubmission } from "../../services/eventSubmissionModeration.service";
import crypto from "node:crypto";

// ============================================================
// INPUT SCHEMAS
// ============================================================

const booleanCoerce = z.union([z.boolean(), z.number()]).transform(v => Boolean(v));

// Event platform v3 enums — kept in sync with drizzle/schema.ts.
const coverageTypeEnum = z.enum(['article', 'video', 'photos', 'report', 'press_release', 'social', 'other']);
const sideEventTypeEnum = z.enum(['side_event', 'workshop', 'networking', 'party', 'dinner', 'tour', 'other']);
const sideEventStatusEnum = z.enum(['pending', 'approved', 'rejected']);

const createEventSchema = z.object({
  title: z.string().min(1).max(512),
  slug: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  featuredImageId: z.number().optional(),
  featuredImageUrl: z.string().optional(),
  type: z.enum(["conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"]).optional(),
  format: z.enum(["in_person", "virtual", "hybrid"]).optional(),
  venue: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueCity: z.string().optional(),
  venueMapUrl: z.string().optional(),
  venueImage: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  virtualUrl: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  registrationUrl: z.string().optional(),
  ticketUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  price: z.string().optional(),
  priceCurrency: z.string().optional(),
  isFree: booleanCoerce.optional(),
  isFeatured: booleanCoerce.optional(),
  organizerName: z.string().optional(),
  organizerEmail: z.string().optional(),
  organizerWebsite: z.string().optional(),
  // Organiser profile — previously only accepted on update, so these
  // were silently dropped when creating an event and needed a second
  // save to persist.
  organizerLogo: z.string().optional().nullable(),
  organizerDescription: z.string().optional().nullable(),
  organizerContactEmail: z.string().optional().nullable(),
  organizerCompanyId: z.number().optional().nullable(),
  targetAudience: z.array(z.string()).optional().nullable(),
  maxAttendees: z.number().optional(),
  expectedAttendees: z.number().optional(),
  expectedInvestors: z.number().optional(),
  expectedStartups: z.number().optional(),
  expectedCountries: z.number().optional(),
  speakers: z.array(z.object({
    name: z.string(),
    title: z.string().optional(),
    company: z.string().optional(),
    avatar: z.string().optional(),
  })).optional(),
  agenda: z.array(z.object({
    time: z.string(),
    title: z.string(),
    description: z.string().optional(),
    speaker: z.string().optional(),
  })).optional(),
  categoryIds: z.array(z.number()).optional(),
  regionIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.number(),
  // Events Hub v2 fields surfaced via the admin editor. Optional because
  // older callers (and the create endpoint) don't supply them. The
  // update handler at L920+ already spreads unknown keys into dbUpdate,
  // so these flow through as-is.
  ticketProvider: z.enum(['internal','eventbrite','luma','external','none']).optional(),
  externalTicketUrl: z.string().optional().nullable(),
  liveModeStartOverride: z.string().optional().nullable(),
  liveModeEndOverride: z.string().optional().nullable(),
  liveModeForce: z.enum(['pre','live','post']).optional().nullable(),
  recapArticleId: z.number().optional().nullable(),
  featuredImage: z.string().optional(),
  status: z.enum(['draft','published','archived']).optional(),
  // Event platform v3 — organiser profile block.
  organizerLogo: z.string().optional().nullable(),
  organizerDescription: z.string().optional().nullable(),
  organizerContactEmail: z.string().optional().nullable(),
  organizerCompanyId: z.number().optional().nullable(),
});

const listEventsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(),
  type: z.enum(["conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"]).optional(),
  format: z.enum(["in_person", "virtual", "hybrid"]).optional(),
  categoryId: z.number().optional(),
  regionId: z.number().optional(),
  sectorId: z.number().optional(),
  upcoming: z.boolean().optional(),
  featured: z.boolean().optional(),
  city: z.string().optional(),
  isFree: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  // Edition bias — surface events in this country first.
  editionCountryId: z.number().optional(),
  sortBy: z.enum(["startDate", "createdAt", "title", "name", "registrations", "status"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Admin listing accepts everything the public list does plus a few
 * editor-only filters. Kept as an extension (rather than widening
 * listEventsSchema) so the public `list` contract is untouched.
 */
const adminListEventsSchema = listEventsSchema.extend({
  // upcoming = ends in the future, past = already ended. When endDate
  // is null the event is treated as a single-day event and startDate
  // stands in for it.
  timeframe: z.enum(['upcoming', 'past', 'all']).optional(),
  // true = only events with tickets (tier rows or any ticket/reg URL),
  // false = only events without any way to buy/register.
  hasTickets: z.boolean().optional(),
});

// ============================================================
// SHARED HELPERS (event platform v3)
// ============================================================

/**
 * "Has tickets" is the same expression in three places (the admin list
 * column, the admin list filter, and any future export), so it lives
 * here rather than being retyped: true when the event has at least one
 * ticket tier row, or any of the ticket / registration / external
 * ticket URLs is set.
 */
function hasTicketsExpr() {
  return sql`(EXISTS (SELECT 1 FROM ${eventTickets} WHERE ${eventTickets.eventId} = ${events.id})
    OR (${events.ticketUrl} IS NOT NULL AND ${events.ticketUrl} <> '')
    OR (${events.registrationUrl} IS NOT NULL AND ${events.registrationUrl} <> '')
    OR (${events.externalTicketUrl} IS NOT NULL AND ${events.externalTicketUrl} <> ''))`;
}

/** The "when does this event end" expression — endDate, else startDate. */
function eventEndExpr() {
  return sql`COALESCE(${events.endDate}, ${events.startDate})`;
}

/**
 * Published articles linked to an event via article_events. Shared by
 * the public getEventArticles procedure and getBySlug so the event page
 * can render linked coverage without a second round-trip.
 *
 * "Published" follows the repo convention: articles.statusId matches
 * the editorial workflow's `published` status.
 */
async function resolveEventArticles(db: any, eventId: number, includeUnpublished = false) {
  // Public surfaces show published articles only. The admin editor passes
  // includeUnpublished so a freshly linked draft is visible immediately —
  // otherwise linking one appears to silently fail.
  const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
  if (!publishedStatus && !includeUnpublished) return [];

  const rows = await db
    .select({
      id: articleEvents.id,
      articleId: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      featuredImageId: articles.featuredImageId,
      featuredImageUrl: media.url,
      publishedAt: articles.publishedAt,
      mentionType: articleEvents.mentionType,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(articleEvents)
    .innerJoin(articles, eq(articleEvents.articleId, articles.id))
    .leftJoin(media, eq(articles.featuredImageId, media.id))
    .leftJoin(categories, eq(articles.primaryCategoryId, categories.id))
    .where(and(
      eq(articleEvents.eventId, eventId),
      ...(includeUnpublished || !publishedStatus ? [] : [eq(articles.statusId, publishedStatus.id)]),
    ))
    .orderBy(desc(articles.publishedAt));

  return rows.map((r: any) => ({
    // Link row id (article_events.id) — what adminUnlinkArticle takes.
    id: r.id,
    articleId: r.articleId,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? null,
    featuredImageId: r.featuredImageId ?? null,
    featuredImage: r.featuredImageUrl ?? null,
    publishedAt: r.publishedAt,
    mentionType: r.mentionType,
    categorySlug: r.categorySlug ?? null,
    categoryName: r.categoryName ?? null,
  }));
}

/**
 * Sectors for a batch of events, grouped by event id. One query for the
 * whole page — never per-row.
 */
async function resolveSectorsByEvent(db: any, eventIds: number[]) {
  const grouped: Record<number, Array<{ id: number; name: string; slug: string }>> = {};
  if (eventIds.length === 0) return grouped;

  const rows = await db
    .select({
      eventId: eventSectors.eventId,
      id: sectors.id,
      name: sectors.name,
      slug: sectors.slug,
    })
    .from(eventSectors)
    .innerJoin(sectors, eq(eventSectors.sectorId, sectors.id))
    .where(inArray(eventSectors.eventId, eventIds))
    .orderBy(asc(sectors.name));

  for (const row of rows as any[]) {
    (grouped[row.eventId] ||= []).push({ id: row.id, name: row.name, slug: row.slug });
  }
  return grouped;
}

/**
 * Sponsors can either be free text or point at a real company/investor
 * record. When linked, the canonical entity's name/logo/website win so
 * a rebrand doesn't leave stale sponsor tiles behind. Also emits
 * companySlug/investorSlug so the UI can link the tile to the profile.
 */
async function resolveEventSponsors(db: any, eventId: number) {
  const rows = await db
    .select({
      id: eventSponsors.id,
      eventId: eventSponsors.eventId,
      name: eventSponsors.name,
      logo: eventSponsors.logo,
      websiteUrl: eventSponsors.websiteUrl,
      tier: eventSponsors.tier,
      companyId: eventSponsors.companyId,
      investorId: eventSponsors.investorId,
      description: eventSponsors.description,
      isConfirmed: eventSponsors.isConfirmed,
      sortOrder: eventSponsors.sortOrder,
      createdAt: eventSponsors.createdAt,
      companyName: companies.name,
      companyLogo: companies.logo,
      companyWebsite: companies.website,
      companySlug: companies.slug,
      investorName: investors.name,
      investorLogo: investors.logo,
      investorWebsite: investors.website,
      investorSlug: investors.slug,
    })
    .from(eventSponsors)
    .leftJoin(companies, eq(eventSponsors.companyId, companies.id))
    .leftJoin(investors, eq(eventSponsors.investorId, investors.id))
    .where(eq(eventSponsors.eventId, eventId))
    .orderBy(asc(eventSponsors.sortOrder));

  return rows.map((r: any) => ({
    id: r.id,
    eventId: r.eventId,
    // Prefer the linked entity, fall back to the free-text sponsor row.
    name: r.companyName || r.investorName || r.name,
    logo: r.companyLogo || r.investorLogo || r.logo,
    websiteUrl: r.companyWebsite || r.investorWebsite || r.websiteUrl,
    tier: r.tier,
    description: r.description,
    isConfirmed: Boolean(r.isConfirmed),
    companyId: r.companyId,
    investorId: r.investorId,
    companySlug: r.companySlug ?? null,
    investorSlug: r.investorSlug ?? null,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    // Raw (unresolved) values kept so the admin editor can tell the
    // difference between "typed in" and "inherited from the entity".
    rawName: r.name,
    rawLogo: r.logo,
    rawWebsiteUrl: r.websiteUrl,
  }));
}

/**
 * Create (or reuse) a `people` record for an event speaker and return
 * its id. Reuses an existing person with the same name rather than
 * minting a duplicate profile. Slug goes through slugService so it is
 * unique across the people table.
 */
async function ensurePersonForSpeaker(db: any, speaker: {
  name: string;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  photo?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
}): Promise<number | null> {
  const name = (speaker.name || '').trim();
  if (!name) return null;

  // Don't duplicate an existing profile with the same name.
  const existing = await db.select({ id: people.id })
    .from(people)
    .where(sql`LOWER(${people.name}) = LOWER(${name})`)
    .limit(1);
  if (existing[0]?.id) return existing[0].id as number;

  const baseSlug = slugService.generateSlug(name);
  const slug = await slugService.generateUniqueSlug("person", baseSlug);

  // Speakers are editorially vetted before they hit an event page, so
  // the generated profile is published straight away; falls back to
  // the workflow's initial status if "published" isn't configured.
  const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
  const initialStatus = publishedStatus ?? await workflowService.getInitialStatus("editorial");
  if (!initialStatus) throw new Error("Workflow not initialized");

  await db.insert(people).values({
    name,
    slug,
    title: speaker.title ?? null,
    company: speaker.company ?? null,
    bio: speaker.bio ?? null,
    avatar: speaker.photo ?? null,
    linkedIn: speaker.linkedinUrl ?? null,
    twitter: speaker.twitterUrl ?? null,
    statusId: initialStatus.id,
    publishedAt: publishedStatus ? new Date() : null,
  } as any);

  const inserted = await db.select({ id: people.id })
    .from(people)
    .where(eq(people.slug, slug))
    .limit(1);
  return (inserted[0]?.id as number) ?? null;
}

/** Coerce eventSchedule.speakerIds (json column) into a number[]. */
function parseSpeakerIds(value: unknown): number[] {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(v => Number(v)).filter(v => Number.isFinite(v));
}

// ============================================================
// EVENTS ROUTER
// ============================================================

export const eventsRouter = router({
  /**
   * List published events (public)
   */
  list: publicProcedure
    .input(listEventsSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const offset = (page - 1) * limit;

      // Get published status
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) throw new Error("Published status not found");

      // Build conditions
      const conditions = [eq(events.statusId, publishedStatus.id)];

      if (filters.search) {
        conditions.push(sql`LOWER(${events.title}) LIKE LOWER(${`%${filters.search}%`})`);
      }
      if (filters.type) {
        conditions.push(eq(events.type, filters.type));
      }
      if (filters.format) {
        conditions.push(eq(events.format, filters.format));
      }
      if (filters.upcoming) {
        // An event is still "upcoming" until it FINISHES — filtering on
        // startDate dropped in-progress multi-day conferences off the
        // public list entirely on their opening day. Mirrors the admin
        // timeframe filter.
        conditions.push(sql`${eventEndExpr()} >= NOW()`);
      }
      if (filters.startDateFrom) {
        conditions.push(gte(events.startDate, filters.startDateFrom as any));
      }
      if (filters.startDateTo) {
        conditions.push(lte(events.startDate, filters.startDateTo as any));
      }

      // Build query - include all sortBy options with fallbacks
      const sortColumn = {
        startDate: events.startDate,
        createdAt: events.createdAt,
        title: events.title,
        name: events.title,
        registrations: events.viewCount, // fallback to viewCount
        status: events.statusId,
      }[sortBy] || events.startDate;

      if (filters.featured) {
        conditions.push(eq(events.isFeatured, 1));
      }
      // sectorId is declared on the shared list schema and was accepted
      // here but never applied — a public sector filter would have
      // silently returned everything.
      if ((filters as any).sectorId !== undefined) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${eventSectors} WHERE ${eventSectors.eventId} = ${events.id} AND ${eventSectors.sectorId} = ${(filters as any).sectorId})`
        );
      }
      if (filters.city) {
        conditions.push(eq(events.city, filters.city));
      }
      if (filters.isFree !== undefined) {
        conditions.push(eq(events.isFree, filters.isFree as any));
      }

      const results = await db.select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        shortDescription: events.shortDescription,
        featuredImage: events.featuredImage,
        type: events.type,
        format: events.format,
        venue: events.venue,
        city: events.city,
        country: events.country,
        startDate: events.startDate,
        endDate: events.endDate,
        isFree: events.isFree,
        ticketPrice: events.ticketPrice,
        ticketCurrency: events.ticketCurrency,
        expectedAttendees: events.expectedAttendees,
        isFeatured: events.isFeatured,
        organizerName: events.organizerName,
        registrationUrl: events.registrationUrl,
        ticketUrl: events.ticketUrl,
        websiteUrl: events.websiteUrl,
        // Correlated subquery — keeps the listing card honest about
        // social-proof without a second round-trip per event. Counts
        // only 'going' (not 'interested' or 'not_going') so the pill
        // matches the hero CTA.
        goingCount: sql<number>`(SELECT COUNT(*) FROM ${eventAttendees} WHERE ${eventAttendees.eventId} = ${events.id} AND ${eventAttendees.status} = 'going')`,
      }).from(events)
        .where(and(...conditions))
        .orderBy(
          ...editionOrderBias((events as any).countryId, input.editionCountryId),
          sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn),
        );

      // Get speaker counts for all events
      const eventIds = results.map(e => e.id);
      let speakerCounts: Record<number, number> = {};
      if (eventIds.length > 0) {
        const speakerRows = await db.select({
          eventId: eventSpeakers.eventId,
          count: sql<number>`COUNT(*)`
        }).from(eventSpeakers)
          .where(inArray(eventSpeakers.eventId, eventIds))
          .groupBy(eventSpeakers.eventId);
        speakerCounts = Object.fromEntries(speakerRows.map(r => [r.eventId, Number(r.count)]));
      }

      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit).map(e => ({
        ...e,
        speakerCount: speakerCounts[e.id] || 0,
      }));

      // Get type counts for category tabs
      const typeCounts = await db.select({
        type: events.type,
        count: sql<number>`COUNT(*)`
      }).from(events)
        .where(eq(events.statusId, publishedStatus.id))
        .groupBy(events.type);

      // Get city counts for city carousel
      const cityCounts = await db.select({
        city: events.city,
        count: sql<number>`COUNT(*)`
      }).from(events)
        .where(and(eq(events.statusId, publishedStatus.id), sql`${events.city} IS NOT NULL AND ${events.city} != ''`))
        .groupBy(events.city)
        .orderBy(sql`COUNT(*) DESC`);

      return {
        items: paginatedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        typeCounts: Object.fromEntries(typeCounts.map(t => [t.type, Number(t.count)])),
        cityCounts: cityCounts.map(c => ({ city: c.city || '', count: Number(c.count) })),
      };
    }),

  /**
   * Get single event by slug (public)
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(events)
        .where(eq(events.slug, input.slug))
        .limit(1);

      if (!result[0]) return null;

      const event = result[0];

      // Increment view count
      await db.update(events)
        .set({ viewCount: (event.viewCount || 0) + 1 } as any)
        .where(eq(events.id, event.id));

      // Get related taxonomy data
      const eventCats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(eventCategories)
        .innerJoin(categories, eq(eventCategories.categoryId, categories.id))
        .where(eq(eventCategories.eventId, event.id));

      const eventRegs = await db.select({ id: regions.id, name: regions.name, slug: regions.slug })
        .from(eventRegions)
        .innerJoin(regions, eq(eventRegions.regionId, regions.id))
        .where(eq(eventRegions.eventId, event.id));

      const eventSecs = await db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(eventSectors)
        .innerJoin(sectors, eq(eventSectors.sectorId, sectors.id))
        .where(eq(eventSectors.eventId, event.id));

      // Get gallery images
      const gallery = await db.select()
        .from(eventGallery)
        .where(eq(eventGallery.eventId, event.id))
        .orderBy(asc(eventGallery.sortOrder));

      // Get speakers with people data
      const speakersRaw = await db.select({
        id: eventSpeakers.id,
        eventId: eventSpeakers.eventId,
        name: eventSpeakers.name,
        title: eventSpeakers.title,
        company: eventSpeakers.company,
        bio: eventSpeakers.bio,
        photo: eventSpeakers.photo,
        linkedinUrl: eventSpeakers.linkedinUrl,
        twitterUrl: eventSpeakers.twitterUrl,
        websiteUrl: eventSpeakers.websiteUrl,
        personId: eventSpeakers.personId,
        isFeatured: eventSpeakers.isFeatured,
        sortOrder: eventSpeakers.sortOrder,
        personPhoto: people.avatar,
        personName: people.name,
        personTitle: people.title,
        personCompany: people.company,
        personSlug: people.slug,
      })
        .from(eventSpeakers)
        .leftJoin(people, eq(eventSpeakers.personId, people.id))
        .where(eq(eventSpeakers.eventId, event.id))
        .orderBy(desc(eventSpeakers.isFeatured), asc(eventSpeakers.sortOrder));
      
      // Merge person data into speaker, preferring person data if linked
      const speakers = speakersRaw.map(r => ({
        id: r.id,
        eventId: r.eventId,
        name: r.personId && r.personName ? r.personName : r.name,
        title: r.personId && r.personTitle ? r.personTitle : r.title,
        company: r.personId && r.personCompany ? r.personCompany : r.company,
        bio: r.bio,
        photo: r.personId && r.personPhoto ? r.personPhoto : r.photo,
        linkedinUrl: r.linkedinUrl,
        twitterUrl: r.twitterUrl,
        websiteUrl: r.websiteUrl,
        personId: r.personId,
        personSlug: r.personSlug,
        isFeatured: r.isFeatured,
        sortOrder: r.sortOrder,
      }));

      // Get tracks
      const tracks = await db.select()
        .from(eventTracks)
        .where(eq(eventTracks.eventId, event.id))
        .orderBy(asc(eventTracks.sortOrder));

      // Get schedule items
      const schedule = await db.select()
        .from(eventSchedule)
        .where(eq(eventSchedule.eventId, event.id))
        .orderBy(asc(eventSchedule.dayNumber), asc(eventSchedule.startTime));

      // Get side events — public surface only ever shows approved rows.
      // Pending community submissions stay hidden until an editor
      // moderates them via adminModerateSideEvent.
      const sideEvents = await db.select()
        .from(eventSideEvents)
        .where(and(
          eq(eventSideEvents.eventId, event.id),
          eq(eventSideEvents.status, 'approved'),
        ))
        .orderBy(asc(eventSideEvents.dayNumber), asc(eventSideEvents.sortOrder));

      // Get sponsors, resolving name/logo/website from the linked
      // company/investor record when one is attached (see getSponsors).
      const sponsors = await resolveEventSponsors(db, event.id);

      // Get highlights (What to Expect)
      const highlights = await db.select()
        .from(eventHighlights)
        .where(eq(eventHighlights.eventId, event.id))
        .orderBy(asc(eventHighlights.sortOrder));

      // Get SEO meta
      const seo = await seoService.getSeoMeta("event", event.id, event as Record<string, unknown>);

      // Resolve the public display mode (pre / live / post) server-side so
      // the client doesn't have to re-do the date math. This same value
      // gates which JSON-LD payload we emit (LiveBlogPosting only in
      // live mode, VideoObject only post, etc).
      const mode = resolveEventMode(event as any);

      // Going + interested counts — drives the "N going" pill and the
      // RSVP buttons' filled-vs-outlined state in the hero. One row,
      // two scalars; cheaper than two COUNT queries.
      const rsvpCountsRow = await db
        .select({
          goingCount: sql<number>`SUM(CASE WHEN ${eventAttendees.status} = 'going' THEN 1 ELSE 0 END)`,
          interestedCount: sql<number>`SUM(CASE WHEN ${eventAttendees.status} = 'interested' THEN 1 ELSE 0 END)`,
        })
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, event.id));
      const goingCount = Number(rsvpCountsRow[0]?.goingCount || 0);
      const interestedCount = Number(rsvpCountsRow[0]?.interestedCount || 0);

      // Linked published coverage (article_events). Same resolver as
      // getEventArticles so the page renders coverage inline instead of
      // making a second round-trip.
      const relatedArticles = await resolveEventArticles(db, event.id);

      return {
        ...event,
        goingCount,
        interestedCount,
        relatedArticles,
        categories: eventCats,
        regions: eventRegs,
        sectors: eventSecs,
        gallery,
        speakers,
        tracks,
        schedule,
        sideEvents,
        sponsors,
        highlights,
        seo,
        mode,
      };
    }),

  /**
   * List active ticket tiers for an event. Public — drives the Tickets
   * tab on the Event Detail page. Only returns rows with isActive = 1
   * and whose sales window (if set) contains "now". Sorted by sortOrder
   * then price.
   */
  listTickets: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const rows = await db.select()
        .from(eventTickets)
        .where(and(
          eq(eventTickets.eventId, input.eventId),
          eq(eventTickets.isActive, 1),
          // Sales-window filters use OR(null, comparison) so tiers with
          // no salesStart/salesEnd are treated as always-on.
          or(
            sql`${eventTickets.salesStartAt} IS NULL`,
            lte(eventTickets.salesStartAt, now),
          ),
          or(
            sql`${eventTickets.salesEndAt} IS NULL`,
            gte(eventTickets.salesEndAt, now),
          ),
        ))
        .orderBy(asc(eventTickets.sortOrder), asc(eventTickets.priceCents));

      return rows.map(t => ({
        ...t,
        remaining: t.capacity !== null && t.capacity !== undefined
          ? Math.max(0, t.capacity - (t.soldCount || 0))
          : null,
        soldOut: t.capacity !== null && t.capacity !== undefined
          ? (t.soldCount || 0) >= t.capacity
          : false,
      }));
    }),

  /**
   * Live blog feed for an event. Returns posts in (pinned, newest)
   * order, limited to 200. Used by the live-mode Event Detail page
   * with refetchInterval to stream updates. `since` lets the client
   * poll incrementally — we still return pinned posts even when older
   * than `since` so they stay anchored at the top.
   *
   * The composer / write-side of the live blog ships in Wave 2 — this
   * endpoint is read-only for now.
   */
  listLivePosts: publicProcedure
    .input(z.object({
      eventId: z.number(),
      since: z.string().optional(),  // ISO timestamp
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const baseConds = [
        eq(eventLivePosts.eventId, input.eventId),
        eq(eventLivePosts.isDeleted, 0),
        // AI drafts stay out of the public feed until approved.
        eq(eventLivePosts.approvalStatus, 'approved'),
      ];

      // If `since` is provided we want: pinned posts (always) OR
      // posts newer than `since`. This keeps the pinned header even
      // when polling for deltas.
      const whereClause = input.since
        ? and(
            ...baseConds,
            or(
              eq(eventLivePosts.isPinned, 1),
              gte(eventLivePosts.publishedAt, input.since),
            ),
          )
        : and(...baseConds);

      return db.select({
          ...getTableColumns(eventLivePosts),
          authorName: users.name,
        })
        .from(eventLivePosts)
        .leftJoin(users, eq(users.id, eventLivePosts.authorId))
        .where(whereClause)
        .orderBy(desc(eventLivePosts.isPinned), desc(eventLivePosts.publishedAt))
        .limit(200);
    }),

  /**
   * Single live post by id — powers /events/:slug/live/:postId
   * permalinks. Public; only approved, non-deleted posts resolve.
   */
  getLivePost: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db.select({
          ...getTableColumns(eventLivePosts),
          authorName: users.name,
        })
        .from(eventLivePosts)
        .leftJoin(users, eq(users.id, eventLivePosts.authorId))
        .where(and(
          eq(eventLivePosts.id, input.id),
          eq(eventLivePosts.isDeleted, 0),
          eq(eventLivePosts.approvalStatus, 'approved'),
        ))
        .limit(1);
      if (!rows.length) return null;
      const post = rows[0];
      const ev = await db.select({ id: events.id, title: events.title, slug: events.slug })
        .from(events).where(eq(events.id, post.eventId)).limit(1);
      return { ...post, event: ev[0] ?? null };
    }),

  /**
   * List events that are currently in live coverage mode.
   *
   * Live = now sits within the event's live window, which by default is
   * [startDate - 2h, endDate + 6h]. Editors can widen / narrow that with
   * liveModeStartOverride / liveModeEndOverride, or force a mode with
   * liveModeForce (handled by resolveEventMode). Drives the "Live now"
   * strip on the public Events index. Returns a recent-activity count
   * (live posts in the last hour) so the strip can show how active each
   * stream is right now.
   */
  listLiveNow: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      const now = new Date();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      // Outer bound: anything whose canonical window could possibly
      // overlap "now" once buffers are applied. Anything outside this
      // window can't be live regardless of overrides — so we don't
      // even fetch it. Force-live events are pulled in via the OR.
      const windowFrom = new Date(now.getTime() - SIX_HOURS);
      const windowTo = new Date(now.getTime() + TWO_HOURS);

      const candidates = await db.select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        featuredImage: events.featuredImage,
        type: events.type,
        format: events.format,
        venue: events.venue,
        city: events.city,
        country: events.country,
        startDate: events.startDate,
        endDate: events.endDate,
        liveModeStartOverride: (events as any).liveModeStartOverride,
        liveModeEndOverride: (events as any).liveModeEndOverride,
        liveModeForce: (events as any).liveModeForce,
      }).from(events)
        .where(and(
          eq(events.statusId, publishedStatus.id),
          or(
            eq((events as any).liveModeForce, 'live'),
            and(
              lte(events.startDate, windowTo as any),
              // endDate may be null for single-day events; fall back to startDate
              gte(sql`COALESCE(${events.endDate}, ${events.startDate})`, windowFrom as any),
            ),
          ),
        ));

      // Filter down to *actually* live using the shared resolver — this
      // honours liveModeForce and the override timestamps the way the
      // detail page does, so the strip and the page can never disagree.
      const liveEvents = candidates.filter(e =>
        resolveEventMode({
          startDate: e.startDate,
          endDate: e.endDate,
          liveModeStartOverride: e.liveModeStartOverride,
          liveModeEndOverride: e.liveModeEndOverride,
          liveModeForce: e.liveModeForce as any,
        }, now) === 'live'
      );

      if (liveEvents.length === 0) return [];

      // One round-trip for the last-hour post counts across all live events.
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const liveIds = liveEvents.map(e => e.id);
      const postCountRows = await db.select({
        eventId: eventLivePosts.eventId,
        count: sql<number>`COUNT(*)`,
      }).from(eventLivePosts)
        .where(and(
          inArray(eventLivePosts.eventId, liveIds),
          eq(eventLivePosts.isDeleted, 0),
          gte(eventLivePosts.publishedAt, oneHourAgo.toISOString().slice(0, 19).replace('T', ' ')),
        ))
        .groupBy(eventLivePosts.eventId);
      const postCounts: Record<number, number> = Object.fromEntries(
        postCountRows.map(r => [r.eventId, Number(r.count)])
      );

      return liveEvents.map(e => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        featuredImage: e.featuredImage,
        type: e.type,
        format: e.format,
        venue: e.venue,
        city: e.city,
        country: e.country,
        startDate: e.startDate,
        endDate: e.endDate,
        livePostsLastHour: postCounts[e.id] || 0,
      }));
    }),

  /**
   * Get upcoming events
   */
  getUpcoming: publicProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      return db.select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        shortDescription: events.shortDescription,
        type: events.type,
        format: events.format,
        city: events.city,
        startDate: events.startDate,
        isFree: events.isFree,
      }).from(events)
        .where(and(
          eq(events.statusId, publishedStatus.id),
          gte(events.startDate, new Date().toISOString())
        ))
        .orderBy(asc(events.startDate))
        .limit(input.limit);
    }),

  // --------------------------------------------------------
  // ADMIN ENDPOINTS
  // --------------------------------------------------------

  /**
   * List all events (admin)
   */
  adminList: protectedProcedure
    .input(adminListEventsSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const {
        page, limit, search, type, format, upcoming, sortBy, sortOrder,
        timeframe, sectorId, city, hasTickets,
      } = input;
      const offset = (page - 1) * limit;

      // Build conditions for server-side filtering
      const conditions = [];

      if (search) {
        const searchTerm = `%${search}%`;
        // Title / venue / venueName / city / country / organiser, plus a
        // match on any linked sector name so typing "fintech" surfaces
        // the events tagged with that sector.
        conditions.push(
          sql`(LOWER(${events.title}) LIKE LOWER(${searchTerm})
            OR LOWER(${events.venue}) LIKE LOWER(${searchTerm})
            OR LOWER(${events.venueName}) LIKE LOWER(${searchTerm})
            OR LOWER(${events.city}) LIKE LOWER(${searchTerm})
            OR LOWER(${events.country}) LIKE LOWER(${searchTerm})
            OR LOWER(${events.organizerName}) LIKE LOWER(${searchTerm})
            OR EXISTS (
              SELECT 1 FROM ${eventSectors}
              INNER JOIN ${sectors} ON ${sectors.id} = ${eventSectors.sectorId}
              WHERE ${eventSectors.eventId} = ${events.id}
                AND LOWER(${sectors.name}) LIKE LOWER(${searchTerm})
            ))`
        );
      }
      if (type) {
        conditions.push(eq(events.type, type));
      }
      if (format) {
        conditions.push(eq(events.format, format));
      }
      if (upcoming) {
        conditions.push(gte(events.startDate, new Date().toISOString()));
      }
      // upcoming/past are measured against the *end* of the event so a
      // multi-day conference that's mid-run still counts as upcoming.
      if (timeframe === 'upcoming') {
        conditions.push(sql`${eventEndExpr()} >= NOW()`);
      } else if (timeframe === 'past') {
        conditions.push(sql`${eventEndExpr()} < NOW()`);
      }
      if (sectorId !== undefined) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${eventSectors} WHERE ${eventSectors.eventId} = ${events.id} AND ${eventSectors.sectorId} = ${sectorId})`
        );
      }
      if (city) {
        conditions.push(sql`LOWER(${events.city}) LIKE LOWER(${`%${city}%`})`);
      }
      if (hasTickets !== undefined) {
        conditions.push(hasTickets ? sql`${hasTicketsExpr()}` : sql`NOT ${hasTicketsExpr()}`);
      }
      // These live on the shared list schema and were previously accepted
      // but silently ignored here — a caller filtering by them got back
      // unfiltered results, which is worse than an error. Now applied.
      if (input.featured !== undefined) {
        conditions.push(eq(events.isFeatured, input.featured ? 1 : 0));
      }
      if (input.isFree !== undefined) {
        conditions.push(eq(events.isFree, input.isFree ? 1 : 0));
      }
      if (input.categoryId !== undefined) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${eventCategories} WHERE ${eventCategories.eventId} = ${events.id} AND ${eventCategories.categoryId} = ${input.categoryId})`
        );
      }
      if (input.regionId !== undefined) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${eventRegions} WHERE ${eventRegions.eventId} = ${events.id} AND ${eventRegions.regionId} = ${input.regionId})`
        );
      }
      if (input.startDateFrom) {
        conditions.push(gte(events.startDate, new Date(input.startDateFrom as any).toISOString()));
      }
      if (input.startDateTo) {
        conditions.push(lte(events.startDate, new Date(input.startDateTo as any).toISOString()));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(events)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      // Build dynamic sort order
      const sortFn = sortOrder === "asc" ? asc : desc;
      const sortColumn = {
        startDate: events.startDate,
        createdAt: events.createdAt,
        title: events.title,
        name: events.title,
        registrations: events.viewCount, // use viewCount as proxy for registrations
        status: events.statusId,
      }[sortBy] || events.startDate;

      // Get paginated results with workflow status.
      // hasTickets / sideEventCount are correlated subqueries so the
      // admin table stays one round-trip regardless of page size.
      const rawResults = await db
        .select({
          ...getTableColumns(events),
          statusSlug: workflowStatuses.slug,
          workflowStatusName: workflowStatuses.name,
          workflowStatusColor: workflowStatuses.color,
          // True when the event has any ticket tier row, or a
          // ticketUrl / registrationUrl / externalTicketUrl is set.
          hasTicketsFlag: sql<number>`(CASE WHEN ${hasTicketsExpr()} THEN 1 ELSE 0 END)`,
          // Only approved side events count — pending submissions
          // shouldn't inflate the number in the admin list.
          sideEventCountValue: sql<number>`(SELECT COUNT(*) FROM ${eventSideEvents} WHERE ${eventSideEvents.eventId} = ${events.id} AND ${eventSideEvents.status} = 'approved')`,
        })
        .from(events)
        .leftJoin(workflowStatuses, eq(events.statusId, workflowStatuses.id))
        .where(whereClause)
        .orderBy(sortFn(sortColumn))
        .limit(limit)
        .offset(offset);

      // Sectors for the whole page in a single query — grouped in JS so
      // the admin table never fans out into one query per row.
      const sectorsByEvent = await resolveSectorsByEvent(db, rawResults.map((r: any) => r.id));

      return {
        items: rawResults.map(row => {
          const { statusSlug, workflowStatusName, workflowStatusColor, hasTicketsFlag, sideEventCountValue, ...eventRow } = row as any;
          return {
            ...eventRow,
            status: statusSlug || 'draft',
            statusName: workflowStatusName || 'Draft',
            statusColor: workflowStatusColor || '#6B7280',
            city: eventRow.city ?? null,
            hasTickets: Number(hasTicketsFlag || 0) > 0,
            sideEventCount: Number(sideEventCountValue || 0),
            sectors: sectorsByEvent[eventRow.id] ?? [],
          };
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single event by ID (admin)
   */
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const event = result[0];

      // Get taxonomy IDs
      const catIds = await db.select({ categoryId: eventCategories.categoryId })
        .from(eventCategories)
        .where(eq(eventCategories.eventId, event.id));

      const regIds = await db.select({ regionId: eventRegions.regionId })
        .from(eventRegions)
        .where(eq(eventRegions.eventId, event.id));

      const secIds = await db.select({ sectorId: eventSectors.sectorId })
        .from(eventSectors)
        .where(eq(eventSectors.eventId, event.id));

      // Get workflow info
      const availableTransitions = await workflowService.getAvailableTransitions(
        event.statusId,
        ctx.user.role
      );

      // RSVP rollup — surfaces in the Analytics tab. Same shape as the
      // public getBySlug response so client code can share helpers.
      const rsvpCountsRow = await db
        .select({
          goingCount: sql<number>`SUM(CASE WHEN ${eventAttendees.status} = 'going' THEN 1 ELSE 0 END)`,
          interestedCount: sql<number>`SUM(CASE WHEN ${eventAttendees.status} = 'interested' THEN 1 ELSE 0 END)`,
        })
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, event.id));

      return {
        ...event,
        categoryIds: catIds.map(c => c.categoryId),
        regionIds: regIds.map(r => r.regionId),
        sectorIds: secIds.map(s => s.sectorId),
        availableTransitions,
        goingCount: Number(rsvpCountsRow[0]?.goingCount || 0),
        interestedCount: Number(rsvpCountsRow[0]?.interestedCount || 0),
      };
    }),

  /**
   * Create event (admin)
   */
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { categoryIds, regionIds, sectorIds, speakers, agenda, ...eventData } = input;

      // Generate slug
      const baseSlug = input.slug || slugService.generateSlug(input.title);
      const slug = await slugService.generateUniqueSlug("event", baseSlug);

      // Get initial status - for admin-created events, use "Submitted" status so they appear in the queue
      // For regular users, use "Draft" status
      const isAdmin = ["admin", "editor", "senior_editor"].includes(ctx.user.role);
      const targetStatus = isAdmin ? "submitted" : "draft";
      
      const statuses = await db.select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.workflowType, "editorial"));
      
      const initialStatus = statuses.find(s => s.slug === targetStatus) || statuses.find(s => Boolean(s.isInitial));
      if (!initialStatus) throw new Error("Workflow not initialized");

      // Create event
      await db.insert(events).values({
        title: eventData.title,
        slug,
        tagline: eventData.tagline,
        description: eventData.description,
        shortDescription: eventData.shortDescription,
        type: eventData.type || "other",
        format: eventData.format || "in_person",
        featuredImage: eventData.featuredImageUrl,
        venue: eventData.venue,
        venueName: eventData.venueName,
        venueAddress: eventData.venueAddress,
        venueMapUrl: eventData.venueMapUrl,
        venueImage: eventData.venueImage,
        address: eventData.address,
        city: eventData.venueCity || eventData.city,
        country: eventData.country,
        virtualUrl: eventData.virtualUrl,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        timezone: eventData.timezone,
        registrationUrl: eventData.registrationUrl,
        ticketUrl: eventData.ticketUrl,
        websiteUrl: eventData.websiteUrl,
        ticketPrice: eventData.price,
        ticketCurrency: eventData.priceCurrency,
        isFree: eventData.isFree ? 1 : 0,
        isFeatured: eventData.isFeatured ? 1 : 0,
        organizerName: eventData.organizerName,
        organizerEmail: eventData.organizerEmail,
        organizerWebsite: eventData.organizerWebsite,
        organizerLogo: eventData.organizerLogo ?? null,
        organizerDescription: eventData.organizerDescription ?? null,
        organizerContactEmail: eventData.organizerContactEmail ?? null,
        organizerCompanyId: eventData.organizerCompanyId ?? null,
        targetAudience: eventData.targetAudience ?? null,
        expectedAttendees: eventData.expectedAttendees,
        expectedInvestors: eventData.expectedInvestors,
        expectedStartups: eventData.expectedStartups,
        expectedCountries: eventData.expectedCountries,
        statusId: initialStatus.id,
        createdByUserId: ctx.user.id,
      } as any);

      // Get inserted event
      const inserted = await db.select()
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1);

      const eventId = inserted[0].id;

      // Add taxonomies
      if (categoryIds?.length) {
        for (const categoryId of categoryIds) {
          await db.insert(eventCategories).values({ eventId, categoryId } as any);
        }
      }
      if (regionIds?.length) {
        for (const regionId of regionIds) {
          await db.insert(eventRegions).values({ eventId, regionId } as any);
        }
      }
      if (sectorIds?.length) {
        for (const sectorId of sectorIds) {
          await db.insert(eventSectors).values({ eventId, sectorId } as any);
        }
      }

      return { id: eventId, slug };
    }),

  /**
   * Update event (admin)
   */
  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { id, categoryIds, regionIds, sectorIds, speakers, agenda, featuredImageUrl, featuredImageId, venueCity, startTime, endTime, maxAttendees, ...updateData } = input;

      // Map fields that have different names between schema and DB
      const dbUpdate: Record<string, any> = { ...updateData };
      if (featuredImageUrl !== undefined) dbUpdate.featuredImage = featuredImageUrl;
      if (venueCity !== undefined) dbUpdate.city = venueCity;
      if (updateData.price !== undefined) {
        dbUpdate.ticketPrice = updateData.price;
        delete dbUpdate.price;
      }
      if (updateData.priceCurrency !== undefined) {
        dbUpdate.ticketCurrency = updateData.priceCurrency;
        delete dbUpdate.priceCurrency;
      }
      // Convert booleans to tinyint
      if (dbUpdate.isFree !== undefined) dbUpdate.isFree = dbUpdate.isFree ? 1 : 0;
      if (dbUpdate.isFeatured !== undefined) dbUpdate.isFeatured = dbUpdate.isFeatured ? 1 : 0;

      // Update event
      await db.update(events)
        .set(dbUpdate as any)
        .where(eq(events.id, id));

      // Update taxonomies
      if (categoryIds !== undefined) {
        await db.delete(eventCategories).where(eq(eventCategories.eventId, id));
        for (const categoryId of categoryIds) {
          await db.insert(eventCategories).values({ eventId: id, categoryId } as any);
        }
      }
      if (regionIds !== undefined) {
        await db.delete(eventRegions).where(eq(eventRegions.eventId, id));
        for (const regionId of regionIds) {
          await db.insert(eventRegions).values({ eventId: id, regionId } as any);
        }
      }
      if (sectorIds !== undefined) {
        await db.delete(eventSectors).where(eq(eventSectors.eventId, id));
        for (const sectorId of sectorIds) {
          await db.insert(eventSectors).values({ eventId: id, sectorId } as any);
        }
      }

      return { success: true };
    }),

  /**
   * Transition event status (admin)
   */
  transition: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      transitionId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await workflowService.executeTransition(
        "event",
        input.eventId,
        input.transitionId,
        ctx.user.id,
        ctx.user.role,
        input.comment
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await db.update(events)
        .set({ statusId: result.newStatusId } as any)
        .where(eq(events.id, input.eventId));

      // If published, set publishedAt
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (result.newStatusId === publishedStatus?.id) {
        await db.update(events)
          .set({ publishedAt: new Date().toISOString() } as any)
          .where(eq(events.id, input.eventId));
      }

      return { success: true, newStatusId: result.newStatusId };
    }),

  /**
   * Delete event (admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      await db.delete(eventCategories).where(eq(eventCategories.eventId, input.id));
      await db.delete(eventRegions).where(eq(eventRegions.eventId, input.id));
      await db.delete(eventSectors).where(eq(eventSectors.eventId, input.id));
      await db.delete(events).where(eq(events.id, input.id));
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

      await db.update(events)
        .set({ 
          statusId: status.id,
          ...(input.statusSlug === "published" ? { publishedAt: new Date().toISOString() } : {})
        } as any)
        .where(inArray(events.id, input.ids));

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
        await db.delete(eventCategories).where(eq(eventCategories.eventId, id));
        await db.delete(eventRegions).where(eq(eventRegions.eventId, id));
        await db.delete(eventSectors).where(eq(eventSectors.eventId, id));
      }

      await db.delete(events).where(inArray(events.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  /**
   * Export events for CSV download (admin)
   */
  exportList: protectedProcedure
    .input(adminListEventsSchema.extend({ limit: z.number().default(10000) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const { search, type, format, upcoming } = input;

      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          sql`(LOWER(${events.title}) LIKE LOWER(${searchTerm}) OR LOWER(${events.description}) LIKE LOWER(${searchTerm}) OR LOWER(${events.venue}) LIKE LOWER(${searchTerm}))`
        );
      }
      if (type) {
        conditions.push(eq(events.type, type));
      }
      if (format) {
        conditions.push(eq(events.format, format));
      }
      if (upcoming) {
        conditions.push(gte(events.startDate, new Date().toISOString()));
      }
      // The admin list filters by sector/city/timeframe/tickets; the export
      // accepted those inputs but ignored them, so a CSV taken under a
      // filter silently contained every event. Apply the same predicates.
      if ((input as any).sectorId !== undefined) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${eventSectors} WHERE ${eventSectors.eventId} = ${events.id} AND ${eventSectors.sectorId} = ${(input as any).sectorId})`
        );
      }
      if ((input as any).city) {
        conditions.push(sql`LOWER(${events.city}) LIKE LOWER(${`%${(input as any).city}%`})`);
      }
      if ((input as any).timeframe === 'upcoming') {
        conditions.push(sql`${eventEndExpr()} >= NOW()`);
      } else if ((input as any).timeframe === 'past') {
        conditions.push(sql`${eventEndExpr()} < NOW()`);
      }
      if ((input as any).hasTickets !== undefined) {
        conditions.push((input as any).hasTickets ? sql`${hasTicketsExpr()}` : sql`NOT ${hasTicketsExpr()}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(events)
        .where(whereClause)
        .orderBy(desc(events.createdAt))
        .limit(10000);

      return {
        items: results.map(event => ({
          ...event,
          name: event.title,
          location: event.venue,
          isVirtual: event.format === 'virtual',
          isFree: event.isFree ?? true,
          registrationUrl: event.registrationUrl,
        })),
      };
    }),

  // ============================================================
  // SPEAKERS CRUD
  // ============================================================

  getSpeakers: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: eventSpeakers.id,
          eventId: eventSpeakers.eventId,
          name: eventSpeakers.name,
          title: eventSpeakers.title,
          company: eventSpeakers.company,
          bio: eventSpeakers.bio,
          photo: eventSpeakers.photo,
          linkedinUrl: eventSpeakers.linkedinUrl,
          twitterUrl: eventSpeakers.twitterUrl,
          websiteUrl: eventSpeakers.websiteUrl,
          personId: eventSpeakers.personId,
          isFeatured: eventSpeakers.isFeatured,
          sortOrder: eventSpeakers.sortOrder,
          createdAt: eventSpeakers.createdAt,
          // Person data for real photos
          personPhoto: people.avatar,
          personName: people.name,
          personTitle: people.title,
          personCompany: people.company,
          personBio: people.bio,
          personLinkedIn: people.linkedIn,
          personTwitter: people.twitter,
          personSlug: people.slug,
        })
        .from(eventSpeakers)
        .leftJoin(people, eq(eventSpeakers.personId, people.id))
        .where(eq(eventSpeakers.eventId, input.eventId))
        .orderBy(asc(eventSpeakers.sortOrder));
      
      // Merge person data into speaker, preferring person data if linked
      return results.map(r => ({
        id: r.id,
        eventId: r.eventId,
        name: r.personId && r.personName ? r.personName : r.name,
        title: r.personId && r.personTitle ? r.personTitle : r.title,
        company: r.personId && r.personCompany ? r.personCompany : r.company,
        bio: r.personId && r.personBio ? r.personBio : r.bio,
        photo: r.personId && r.personPhoto ? r.personPhoto : r.photo,
        linkedinUrl: r.personId && r.personLinkedIn ? r.personLinkedIn : r.linkedinUrl,
        twitterUrl: r.personId && r.personTwitter ? `https://twitter.com/${r.personTwitter}` : r.twitterUrl,
        websiteUrl: r.websiteUrl,
        personId: r.personId,
        personSlug: r.personSlug,
        isFeatured: r.isFeatured,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
        // Provenance for the admin editor. When a speaker is linked to a
        // Person, that record is the single source of truth: inherited
        // fields must be edited on the person's profile, never here.
        // Fields the person is missing stay editable in the event editor
        // and are written BACK to the person (adminFillPersonGaps).
        personLinked: !!r.personId,
        inheritedFields: r.personId
          ? ([
              r.personName ? "name" : null,
              r.personTitle ? "title" : null,
              r.personCompany ? "company" : null,
              r.personBio ? "bio" : null,
              r.personPhoto ? "photo" : null,
              r.personLinkedIn ? "linkedinUrl" : null,
              r.personTwitter ? "twitterUrl" : null,
            ].filter(Boolean) as string[])
          : [],
        missingOnPerson: r.personId
          ? ([
              r.personTitle ? null : "title",
              r.personCompany ? null : "company",
              r.personBio ? null : "bio",
              r.personPhoto ? null : "photo",
              r.personLinkedIn ? null : "linkedinUrl",
              r.personTwitter ? null : "twitterUrl",
            ].filter(Boolean) as string[])
          : [],
      }));
    }),

  /**
   * Fill gaps on a LINKED person's profile from the event speaker
   * editor. Only writes fields the person is currently missing — an
   * existing value is never overwritten from here, because the People
   * record owns it. Returns which fields were actually written so the
   * UI can confirm ("Photo added to Nadia's profile").
   */
  adminFillPersonGaps: protectedProcedure
    .input(z.object({
      speakerId: z.number(),
      title: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      bio: z.string().optional().nullable(),
      photo: z.string().optional().nullable(),
      linkedinUrl: z.string().optional().nullable(),
      twitterUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      const [sp] = await (db as any).select({
        id: eventSpeakers.id,
        personId: eventSpeakers.personId,
      }).from(eventSpeakers).where(eq(eventSpeakers.id, input.speakerId)).limit(1);
      if (!sp) throw new Error("Speaker not found");
      if (!sp.personId) throw new Error("Speaker is not linked to a person");

      const [person] = await (db as any).select().from(people)
        .where(eq(people.id, sp.personId)).limit(1);
      if (!person) throw new Error("Linked person not found");

      const blank = (v: unknown) => v === null || v === undefined || v === "";
      const set: Record<string, unknown> = {};
      const written: string[] = [];

      // speaker-editor field -> people column
      const pairs: Array<[string, string, string | null | undefined]> = [
        ["title", "title", input.title],
        ["company", "company", input.company],
        ["bio", "bio", input.bio],
        ["photo", "avatar", input.photo],
        ["linkedinUrl", "linkedIn", input.linkedinUrl],
        // people.twitter stores a handle, not a URL
        ["twitterUrl", "twitter", input.twitterUrl
          ? String(input.twitterUrl).replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "").replace(/\/$/, "")
          : input.twitterUrl],
      ];

      for (const [field, column, value] of pairs) {
        if (blank(value)) continue;
        if (!blank((person as any)[column])) continue; // never overwrite
        set[column] = value;
        written.push(field);
      }

      if (written.length) {
        await (db as any).update(people).set(set as any).where(eq(people.id, sp.personId));
      }
      return { success: true, personId: sp.personId, written };
    }),

  addSpeaker: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      name: z.string(),
      title: z.string().optional(),
      company: z.string().optional(),
      bio: z.string().optional(),
      photo: z.string().optional(),
      linkedinUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
      personId: z.number().nullable().optional(),
      // When true and no personId is supplied, mint a `people` record
      // from the speaker details and link it. Never fires if personId
      // is already set — we don't want duplicate person profiles.
      createPersonRecord: z.boolean().optional(),
      isFeatured: booleanCoerce.optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const { createPersonRecord, ...speaker } = input;
      let personId: number | null = speaker.personId ?? null;
      if (!personId && createPersonRecord) {
        personId = await ensurePersonForSpeaker(db, speaker);
      }

      const res = await db.insert(eventSpeakers).values({
        ...speaker,
        personId,
        isFeatured: input.isFeatured ? 1 : 0,
      } as any);
      return { success: true, id: (res as any)?.[0]?.insertId ?? null, personId };
    }),

  updateSpeaker: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      bio: z.string().optional(),
      photo: z.string().optional(),
      linkedinUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
      personId: z.number().nullable().optional(),
      createPersonRecord: z.boolean().optional(),
      isFeatured: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, createPersonRecord, ...data } = input;

      // Default ON: a speaker with no linked profile is a dead name on
      // the public page, so create one unless explicitly told not to.
      let personId: number | null | undefined = data.personId;
      if (createPersonRecord !== false && !personId) {
        // Only create if the row isn't already linked to a person.
        const existingRow = await db.select({ personId: eventSpeakers.personId, name: eventSpeakers.name, title: eventSpeakers.title, company: eventSpeakers.company, bio: eventSpeakers.bio, photo: eventSpeakers.photo, linkedinUrl: eventSpeakers.linkedinUrl, twitterUrl: eventSpeakers.twitterUrl })
          .from(eventSpeakers)
          .where(eq(eventSpeakers.id, id))
          .limit(1);
        const current = existingRow[0];
        if (current?.personId) {
          personId = current.personId;
        } else {
          personId = await ensurePersonForSpeaker(db, {
            name: data.name ?? current?.name ?? '',
            title: data.title ?? current?.title ?? undefined,
            company: data.company ?? current?.company ?? undefined,
            bio: data.bio ?? current?.bio ?? undefined,
            photo: data.photo ?? current?.photo ?? undefined,
            linkedinUrl: data.linkedinUrl ?? current?.linkedinUrl ?? undefined,
            twitterUrl: data.twitterUrl ?? current?.twitterUrl ?? undefined,
          });
        }
      }

      // When the speaker is linked to a Person, that profile owns the
      // identity fields. Strip any the person already has so an edit
      // here can never silently diverge from /people/:slug — gaps are
      // filled through adminFillPersonGaps, which writes to the person.
      let writable: Record<string, unknown> = { ...data };
      const effectivePersonId = personId ?? (personId === null ? null : undefined);
      const linkedId = effectivePersonId ?? (await (db as any)
        .select({ personId: eventSpeakers.personId })
        .from(eventSpeakers).where(eq(eventSpeakers.id, id)).limit(1))[0]?.personId ?? null;

      if (linkedId) {
        const [person] = await (db as any).select().from(people)
          .where(eq(people.id, linkedId)).limit(1);
        if (person) {
          const owned: Array<[string, string]> = [
            ["name", "name"], ["title", "title"], ["company", "company"],
            ["bio", "bio"], ["photo", "avatar"],
            ["linkedinUrl", "linkedIn"], ["twitterUrl", "twitter"],
          ];
          for (const [field, column] of owned) {
            const personValue = (person as any)[column];
            if (personValue !== null && personValue !== undefined && personValue !== "") {
              delete writable[field];
            }
          }
        }
      }

      await db.update(eventSpeakers).set({
        ...writable,
        ...(personId !== undefined ? { personId } : {}),
      } as any).where(eq(eventSpeakers.id, id));
      return { success: true, personId: personId ?? null };
    }),

  /**
   * Typeahead for linking an event speaker to an existing `people`
   * record. Admin-only — used by the speaker editor.
   */
  /** All active sectors — powers the sector filter and editor picker. */
  listSectors: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: sectors.id, name: sectors.name, slug: sectors.slug })
        .from(sectors)
        .where(eq(sectors.isActive, 1))
        .orderBy(asc(sectors.name));
    }),

  adminSearchPeople: protectedProcedure
    .input(z.object({ q: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const q = input.q?.trim();
      if (!q) return [];
      return db.select({
        id: people.id,
        name: people.name,
        slug: people.slug,
        title: people.title,
        company: people.company,
        photo: people.avatar,
          bio: people.bio,
          linkedinUrl: people.linkedIn,
          twitter: people.twitter,
      }).from(people)
        .where(like(people.name, `%${q}%`))
        .orderBy(asc(people.name))
        .limit(10);
    }),

  /**
   * Reverse lookup: every published event this person has spoken at.
   * Powers the "Speaking engagements" block on the person profile.
   */
  getSpeakingEngagements: publicProcedure
    .input(z.object({ personId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      if (!publishedStatus) return [];

      const rows = await db.select({
        eventId: events.id,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventStartDate: events.startDate,
        eventEndDate: events.endDate,
        city: events.city,
        country: events.country,
        speakerTitle: eventSpeakers.title,
        isFeatured: eventSpeakers.isFeatured,
      })
        .from(eventSpeakers)
        .innerJoin(events, eq(eventSpeakers.eventId, events.id))
        .where(and(
          eq(eventSpeakers.personId, input.personId),
          eq(events.statusId, publishedStatus.id),
        ))
        .orderBy(desc(events.startDate));

      return rows.map(r => ({ ...r, isFeatured: Boolean(r.isFeatured) }));
    }),

  deleteSpeaker: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventSpeakers).where(eq(eventSpeakers.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // TRACKS CRUD
  // ============================================================

  getTracks: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventTracks).where(eq(eventTracks.eventId, input.eventId)).orderBy(asc(eventTracks.sortOrder));
    }),

  addTrack: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.insert(eventTracks).values(input as any);
      return { success: true };
    }),

  updateTrack: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, ...data } = input;
      await db.update(eventTracks).set(data as any).where(eq(eventTracks.id, id));
      return { success: true };
    }),

  deleteTrack: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventTracks).where(eq(eventTracks.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // SCHEDULE CRUD
  // ============================================================

  getSchedule: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(eventSchedule)
        .where(eq(eventSchedule.eventId, input.eventId))
        .orderBy(asc(eventSchedule.dayNumber), asc(eventSchedule.sortOrder));

      // Resolve the multi-speaker links (speakerIds json array, plus the
      // legacy single speakerId) in one extra query, not one per row.
      const perRowIds = rows.map(r => {
        const ids = parseSpeakerIds((r as any).speakerIds);
        if (r.speakerId && !ids.includes(r.speakerId)) ids.unshift(r.speakerId);
        return ids;
      });
      const allIds = Array.from(new Set(perRowIds.flat()));

      let speakerMap: Record<number, { id: number; name: string | null; title: string | null; company: string | null; photo: string | null; personId: number | null }> = {};
      if (allIds.length > 0) {
        const speakerRows = await db.select({
          id: eventSpeakers.id,
          name: eventSpeakers.name,
          title: eventSpeakers.title,
          company: eventSpeakers.company,
          photo: eventSpeakers.photo,
          personId: eventSpeakers.personId,
          personName: people.name,
          personTitle: people.title,
          personCompany: people.company,
          personPhoto: people.avatar,
        })
          .from(eventSpeakers)
          .leftJoin(people, eq(eventSpeakers.personId, people.id))
          .where(inArray(eventSpeakers.id, allIds));

        speakerMap = Object.fromEntries(speakerRows.map(s => [s.id, {
          id: s.id,
          name: (s.personId && s.personName) ? s.personName : s.name,
          title: (s.personId && s.personTitle) ? s.personTitle : s.title,
          company: (s.personId && s.personCompany) ? s.personCompany : s.company,
          photo: (s.personId && s.personPhoto) ? s.personPhoto : s.photo,
          personId: s.personId,
        }]));
      }

      return rows.map((r, i) => ({
        ...r,
        speakerIds: perRowIds[i],
        isFeatured: Boolean((r as any).isFeatured),
        speakers: perRowIds[i].map(id => speakerMap[id]).filter(Boolean),
      }));
    }),

  addScheduleItem: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      dayNumber: z.number(),
      title: z.string(),
      description: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      speakerId: z.number().nullable().optional(),
      speakerName: z.string().optional(),
      trackId: z.number().nullable().optional(),
      location: z.string().optional(),
      sessionType: z.enum(['keynote', 'panel', 'workshop', 'networking', 'break', 'other']).optional(),
      imageUrl: z.string().nullable().optional(),
      speakerIds: z.array(z.number()).optional(),
      isFeatured: booleanCoerce.optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { startTime, endTime, isFeatured, ...rest } = input;
      // Convert HH:MM time strings to Date objects (using today's date as base)
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);
      const parseTime = (time: string | undefined) => {
        if (!time) return undefined;
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      };
      const res = await db.insert(eventSchedule).values({
        ...rest,
        ...(isFeatured !== undefined ? { isFeatured: isFeatured ? 1 : 0 } : {}),
        startTime: parseTime(startTime) || new Date(),
        endTime: parseTime(endTime),
      } as any);
      return { success: true, id: (res as any)?.[0]?.insertId ?? null };
    }),

  updateScheduleItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      dayNumber: z.number().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      speakerId: z.number().nullable().optional(),
      speakerName: z.string().optional(),
      trackId: z.number().nullable().optional(),
      location: z.string().optional(),
      sessionType: z.enum(['keynote', 'panel', 'workshop', 'networking', 'break', 'other']).optional(),
      imageUrl: z.string().nullable().optional(),
      speakerIds: z.array(z.number()).optional(),
      isFeatured: booleanCoerce.optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, startTime, endTime, isFeatured, ...rest } = input;
      // Convert HH:MM time strings to Date objects
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);
      const parseTime = (time: string | undefined) => {
        if (!time) return undefined;
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      };
      await db.update(eventSchedule).set({
        ...rest,
        ...(isFeatured !== undefined ? { isFeatured: isFeatured ? 1 : 0 } : {}),
        ...(startTime !== undefined ? { startTime: parseTime(startTime) } : {}),
        ...(endTime !== undefined ? { endTime: parseTime(endTime) } : {}),
      } as any).where(eq(eventSchedule.id, id));
      return { success: true };
    }),

  deleteScheduleItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventSchedule).where(eq(eventSchedule.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // GALLERY CRUD
  // ============================================================

  getGallery: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventGallery).where(eq(eventGallery.eventId, input.eventId)).orderBy(asc(eventGallery.sortOrder));
    }),

  addGalleryImage: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      imageUrl: z.string(),
      caption: z.string().optional(),
      altText: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.insert(eventGallery).values(input as any);
      return { success: true };
    }),

  updateGalleryImage: protectedProcedure
    .input(z.object({
      id: z.number(),
      imageUrl: z.string().optional(),
      caption: z.string().optional(),
      altText: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, ...data } = input;
      await db.update(eventGallery).set(data as any).where(eq(eventGallery.id, id));
      return { success: true };
    }),

  deleteGalleryImage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventGallery).where(eq(eventGallery.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // SIDE EVENTS CRUD
  // ============================================================

  /**
   * Public side-event list. Community submissions land as 'pending' and
   * only become visible here once an editor approves them.
   */
  getSideEvents: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(eventSideEvents)
        .where(and(
          eq(eventSideEvents.eventId, input.eventId),
          eq(eventSideEvents.status, 'approved'),
        ))
        .orderBy(asc(eventSideEvents.dayNumber), asc(eventSideEvents.sortOrder));
      return rows.map(r => ({ ...r, isFree: Boolean(r.isFree) }));
    }),

  addSideEvent: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      dayNumber: z.number().optional(),
      date: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      venue: z.string().optional(),
      capacity: z.number().nullable().optional(),
      registrationUrl: z.string().optional(),
      websiteUrl: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      sideEventType: sideEventTypeEnum.optional(),
      isFree: booleanCoerce.optional(),
      status: sideEventStatusEnum.optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { date, isFree, ...rest } = input;
      const res = await db.insert(eventSideEvents).values({
        ...rest,
        // Editor-created side events are live immediately.
        status: input.status ?? 'approved',
        ...(isFree !== undefined ? { isFree: isFree ? 1 : 0 } : {}),
        date: date ? new Date(date) : null,
      } as any);
      return { success: true, id: (res as any)?.[0]?.insertId ?? null };
    }),

  updateSideEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      dayNumber: z.number().optional(),
      date: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      venue: z.string().optional(),
      capacity: z.number().nullable().optional(),
      registrationUrl: z.string().optional(),
      websiteUrl: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      sideEventType: sideEventTypeEnum.optional(),
      isFree: booleanCoerce.optional(),
      status: sideEventStatusEnum.optional(),
      moderationNotes: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, date, isFree, ...rest } = input;
      await db.update(eventSideEvents).set({
        ...rest,
        ...(isFree !== undefined ? { isFree: isFree ? 1 : 0 } : {}),
        ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
      } as any).where(eq(eventSideEvents.id, id));
      return { success: true };
    }),

  deleteSideEvent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventSideEvents).where(eq(eventSideEvents.id, input.id));
      return { success: true };
    }),

  /**
   * Public side-event submission. Anyone can propose a side event; a
   * logged-in submitter gets their user id stamped on the row. Lands as
   * 'pending' and is invisible until moderated.
   */
  submitSideEvent: publicProcedure
    .input(z.object({
      eventId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().min(1),
      sideEventType: sideEventTypeEnum,
      date: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      venue: z.string().optional(),
      capacity: z.number().nullable().optional(),
      registrationUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      isFree: booleanCoerce.optional(),
      submitterName: z.string().min(1).max(255),
      submitterEmail: z.string().email().max(255),
      submitterOrganisation: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Anti-abuse: cap how many un-moderated submissions one email can
      // queue up against a single event.
      const pendingRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(eventSideEvents)
        .where(and(
          eq(eventSideEvents.eventId, input.eventId),
          eq(eventSideEvents.status, 'pending'),
          sql`LOWER(${eventSideEvents.submitterEmail}) = LOWER(${input.submitterEmail})`,
        ));
      if (Number(pendingRows[0]?.count || 0) >= 3) {
        throw new Error("You already have 3 side event submissions awaiting review for this event. Please wait for them to be reviewed before submitting more.");
      }

      const { date, isFree, ...rest } = input;
      const res = await db.insert(eventSideEvents).values({
        ...rest,
        date: date ? new Date(date) : null,
        isFree: isFree === undefined ? 1 : (isFree ? 1 : 0),
        status: 'pending',
        submittedByUserId: ctx.user?.id ?? null,
      } as any);

      return {
        success: true as const,
        id: (res as any)?.[0]?.insertId ?? null,
        status: 'pending' as const,
      };
    }),

  /**
   * Moderation queue. Pending submissions float to the top so editors
   * see the work that needs doing first.
   */
  adminListSideEventSubmissions: protectedProcedure
    .input(z.object({
      eventId: z.number().optional(),
      status: sideEventStatusEnum.optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const conditions = [];
      if (input.eventId) conditions.push(eq(eventSideEvents.eventId, input.eventId));
      if (input.status) conditions.push(eq(eventSideEvents.status, input.status));

      const rows = await db.select({
        id: eventSideEvents.id,
        eventId: eventSideEvents.eventId,
        eventTitle: events.title,
        eventSlug: events.slug,
        name: eventSideEvents.name,
        description: eventSideEvents.description,
        sideEventType: eventSideEvents.sideEventType,
        dayNumber: eventSideEvents.dayNumber,
        date: eventSideEvents.date,
        startTime: eventSideEvents.startTime,
        endTime: eventSideEvents.endTime,
        venue: eventSideEvents.venue,
        capacity: eventSideEvents.capacity,
        registrationUrl: eventSideEvents.registrationUrl,
        websiteUrl: eventSideEvents.websiteUrl,
        imageUrl: eventSideEvents.imageUrl,
        isFree: eventSideEvents.isFree,
        status: eventSideEvents.status,
        moderationNotes: eventSideEvents.moderationNotes,
        submittedByUserId: eventSideEvents.submittedByUserId,
        submitterName: eventSideEvents.submitterName,
        submitterEmail: eventSideEvents.submitterEmail,
        submitterOrganisation: eventSideEvents.submitterOrganisation,
        sortOrder: eventSideEvents.sortOrder,
        createdAt: eventSideEvents.createdAt,
        updatedAt: eventSideEvents.updatedAt,
      })
        .from(eventSideEvents)
        .leftJoin(events, eq(eventSideEvents.eventId, events.id))
        .where(conditions.length ? and(...conditions) : undefined)
        // Pending first, then newest.
        .orderBy(sql`CASE ${eventSideEvents.status} WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END`, desc(eventSideEvents.createdAt));

      return rows.map(r => ({ ...r, isFree: Boolean(r.isFree) }));
    }),

  adminModerateSideEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['approved', 'rejected']),
      moderationNotes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.update(eventSideEvents).set({
        status: input.status,
        ...(input.moderationNotes !== undefined ? { moderationNotes: input.moderationNotes } : {}),
      } as any).where(eq(eventSideEvents.id, input.id));
      return { success: true as const, id: input.id, status: input.status };
    }),

  // ============================================================
  // SPONSORS (public)
  // ============================================================

  /**
   * Public sponsor list. Resolves name/logo/websiteUrl from the linked
   * company/investor record when one is attached, and returns
   * companySlug/investorSlug so tiles can deep-link to those profiles.
   */
  getSponsors: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return resolveEventSponsors(db, input.eventId);
    }),

  // ============================================================
  // FAQs CRUD
  // ============================================================

  getFaqs: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventFaqs)
        .where(eq(eventFaqs.eventId, input.eventId))
        .orderBy(asc(eventFaqs.sortOrder), asc(eventFaqs.id));
    }),

  adminUpsertFaq: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      question: z.string().min(1).max(512),
      answer: z.string().min(1),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, ...rest } = input;
      if (id) {
        await db.update(eventFaqs).set(rest as any).where(eq(eventFaqs.id, id));
        return { id };
      }
      const res = await db.insert(eventFaqs).values(rest as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  adminDeleteFaq: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventFaqs).where(eq(eventFaqs.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // PRESS / MEDIA COVERAGE CRUD
  // ============================================================

  getCoverage: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(eventCoverage)
        .where(eq(eventCoverage.eventId, input.eventId))
        .orderBy(asc(eventCoverage.sortOrder), desc(eventCoverage.publishedAt));
      return rows.map(r => ({ ...r, isUploaded: Boolean(r.isUploaded) }));
    }),

  adminUpsertCoverage: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      title: z.string().min(1).max(512),
      url: z.string().min(1),
      coverageType: coverageTypeEnum.default('article'),
      sourceName: z.string().max(255).nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      isUploaded: booleanCoerce.optional(),
      publishedAt: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, isUploaded, publishedAt, ...rest } = input;
      const values = {
        ...rest,
        ...(isUploaded !== undefined ? { isUploaded: isUploaded ? 1 : 0 } : {}),
        ...(publishedAt !== undefined ? { publishedAt: publishedAt ? new Date(publishedAt) : null } : {}),
      };
      if (id) {
        await db.update(eventCoverage).set(values as any).where(eq(eventCoverage.id, id));
        return { id };
      }
      const res = await db.insert(eventCoverage).values(values as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  adminDeleteCoverage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventCoverage).where(eq(eventCoverage.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // HIGHLIGHTS CRUD
  // ============================================================

  getHighlights: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventHighlights).where(eq(eventHighlights.eventId, input.eventId)).orderBy(asc(eventHighlights.sortOrder));
    }),

  addHighlight: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.insert(eventHighlights).values(input as any);
      return { success: true };
    }),

  updateHighlight: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, ...data } = input;
      await db.update(eventHighlights).set(data as any).where(eq(eventHighlights.id, id));
      return { success: true };
    }),

  deleteHighlight: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventHighlights).where(eq(eventHighlights.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // ADMIN — Events Hub v2 (tickets, promos, live, recordings, correspondents)
  // ----------------------------------------------------------------
  // These power the redesigned admin Event Editor. Kept under the same
  // events router (rather than a separate server/admin/events.router.ts)
  // so the existing trpc.events.* namespace stays consistent. Auth is
  // checked per-procedure since not all admin routers in this repo go
  // through a shared adminProcedure wrapper.
  // ============================================================

  /**
   * Resolved live-mode for an event. Mirrors what the public Event
   * Detail page will currently show. Returns the resolved mode plus
   * the inputs so the editor can display them side-by-side.
   */
  getResolvedMode: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db.select({
        id: events.id,
        startDate: events.startDate,
        endDate: events.endDate,
        liveModeStartOverride: (events as any).liveModeStartOverride,
        liveModeEndOverride: (events as any).liveModeEndOverride,
        liveModeForce: (events as any).liveModeForce,
      }).from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!rows.length) throw new Error("Event not found");
      const e = rows[0] as any;
      return {
        mode: resolveEventMode(e),
        startDate: e.startDate,
        endDate: e.endDate,
        liveModeStartOverride: e.liveModeStartOverride,
        liveModeEndOverride: e.liveModeEndOverride,
        liveModeForce: e.liveModeForce,
      };
    }),

  // -------- Admin: Tickets --------
  adminListTickets: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      // Returns ALL tickets, including inactive / out-of-window, so
      // admins can re-enable or edit. The public listTickets above
      // filters to active+in-window only.
      return db.select().from(eventTickets)
        .where(eq(eventTickets.eventId, input.eventId))
        .orderBy(asc(eventTickets.sortOrder), asc(eventTickets.priceCents));
    }),

  adminUpsertTicket: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      name: z.string().min(1).max(128),
      description: z.string().optional().nullable(),
      priceCents: z.number().int().min(0),
      currency: z.string().length(3).default('USD'),
      capacity: z.number().int().nullable().optional(),
      salesStartAt: z.string().nullable().optional(),
      salesEndAt: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
      maxPerOrder: z.number().int().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, isActive, ...rest } = input;
      const values: Record<string, any> = { ...rest, isActive: isActive ? 1 : 0 };
      if (id) {
        await db.update(eventTickets).set(values as any).where(eq(eventTickets.id, id));
        return { id };
      }
      const res = await db.insert(eventTickets).values(values as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  adminDeleteTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventTickets).where(eq(eventTickets.id, input.id));
      return { success: true };
    }),

  // -------- Admin: Promo codes --------
  adminListPromoCodes: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      return db.select().from(eventPromoCodes)
        .where(eq(eventPromoCodes.eventId, input.eventId))
        .orderBy(asc(eventPromoCodes.code));
    }),

  adminUpsertPromoCode: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      code: z.string().min(1).max(64),
      discountType: z.enum(['percentage','fixed_cents']),
      discountValue: z.number().int().min(0),
      maxUses: z.number().int().nullable().optional(),
      validFrom: z.string().nullable().optional(),
      validUntil: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, isActive, ...rest } = input;
      const values: Record<string, any> = { ...rest, isActive: isActive ? 1 : 0 };
      if (id) {
        await db.update(eventPromoCodes).set(values as any).where(eq(eventPromoCodes.id, id));
        return { id };
      }
      const res = await db.insert(eventPromoCodes).values(values as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  adminDeletePromoCode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventPromoCodes).where(eq(eventPromoCodes.id, input.id));
      return { success: true };
    }),

  // -------- Admin: Correspondents --------
  // Joins to `users` so the admin UI can render names/emails without a
  // second roundtrip. The `users` table holds the source-of-truth role
  // ('event_correspondent') — this assignment table just scopes that
  // correspondent to a specific event with a per-event role.
  adminListCorrespondents: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      return db.select({
        id: eventCorrespondents.id,
        eventId: eventCorrespondents.eventId,
        userId: eventCorrespondents.userId,
        role: eventCorrespondents.role,
        createdAt: eventCorrespondents.createdAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        userRole: users.role,
      })
        .from(eventCorrespondents)
        .leftJoin(users, eq(users.id, eventCorrespondents.userId))
        .where(eq(eventCorrespondents.eventId, input.eventId))
        .orderBy(asc(eventCorrespondents.createdAt));
    }),

  adminAddCorrespondent: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      // Accept either userId (resolved upstream by autocomplete) or
      // email (admin pastes an email — we look up the user). One of
      // them must be present.
      userId: z.number().optional(),
      email: z.string().email().optional(),
      role: z.enum(['lead','correspondent','photographer']).default('correspondent'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      let userId = input.userId;
      if (!userId && input.email) {
        const found = await db.select({ id: users.id }).from(users)
          .where(eq(users.email, input.email)).limit(1);
        if (!found.length) throw new Error(`No user found with email ${input.email}`);
        userId = found[0].id;
      }
      if (!userId) throw new Error('userId or email is required');

      await db.insert(eventCorrespondents).values({
        eventId: input.eventId,
        userId,
        role: input.role,
        addedById: ctx.user.id,
      } as any);
      return { success: true };
    }),

  adminRemoveCorrespondent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventCorrespondents).where(eq(eventCorrespondents.id, input.id));
      return { success: true };
    }),

  // -------- Admin: Recordings --------
  adminListRecordings: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      return db.select().from(eventRecordings)
        .where(eq(eventRecordings.eventId, input.eventId))
        .orderBy(asc(eventRecordings.sortOrder), asc(eventRecordings.id));
    }),

  adminUpsertRecording: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      scheduleId: z.number().nullable().optional(),
      title: z.string().min(1).max(512),
      speakerName: z.string().nullable().optional(),
      videoUrl: z.string().min(1),
      thumbnailUrl: z.string().nullable().optional(),
      durationSeconds: z.number().int().nullable().optional(),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, ...rest } = input;
      if (id) {
        await db.update(eventRecordings).set(rest as any).where(eq(eventRecordings.id, id));
        return { id };
      }
      const res = await db.insert(eventRecordings).values(rest as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  adminDeleteRecording: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventRecordings).where(eq(eventRecordings.id, input.id));
      return { success: true };
    }),

  // -------- Admin: Live mode controls --------
  // Single endpoint to set any combination of force/override fields.
  // Pass `null` to clear an override (and revert to auto). Omitting a
  // field leaves the existing DB value untouched.
  adminSetLiveMode: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      force: z.enum(['pre','live','post']).nullable().optional(),
      startOverride: z.string().nullable().optional(),
      endOverride: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const patch: Record<string, any> = {};
      if (input.force !== undefined) patch.liveModeForce = input.force;
      if (input.startOverride !== undefined) patch.liveModeStartOverride = input.startOverride;
      if (input.endOverride !== undefined) patch.liveModeEndOverride = input.endOverride;
      if (Object.keys(patch).length === 0) return { success: true };
      await db.update(events).set(patch as any).where(eq(events.id, input.eventId));
      return { success: true };
    }),

  // -------- Admin: User lookup for correspondent autocomplete --------
  adminLookupUser: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const q = `%${input.query}%`;
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
      }).from(users)
        .where(or(like(users.email, q), like(users.name, q)))
        .limit(15);
    }),

  // -------- Admin: Sponsors --------
  // Sponsors don't have CRUD yet — adding minimal admin endpoints so
  // the Sponsors tab in the new editor is functional. Public read of
  // sponsors already happens via the join inside the `get` procedure.
  adminListSponsors: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      return db.select().from(eventSponsors)
        .where(eq(eventSponsors.eventId, input.eventId))
        .orderBy(asc(eventSponsors.sortOrder));
    }),

  adminUpsertSponsor: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      eventId: z.number(),
      name: z.string().min(1).max(255),
      logo: z.string().nullable().optional(),
      websiteUrl: z.string().nullable().optional(),
      tier: z.enum(['platinum','gold','silver','bronze','partner']).default('partner'),
      // Optional link to a canonical company/investor record. When set,
      // the public sponsor tile inherits that entity's name/logo/site.
      companyId: z.number().nullable().optional(),
      investorId: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
      isConfirmed: booleanCoerce.optional(),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const { id, isConfirmed, ...rest } = input;
      const values = {
        ...rest,
        ...(isConfirmed !== undefined ? { isConfirmed: isConfirmed ? 1 : 0 } : {}),
      };
      if (id) {
        await db.update(eventSponsors).set(values as any).where(eq(eventSponsors.id, id));
        return { id };
      }
      const res = await db.insert(eventSponsors).values(values as any);
      return { id: (res as any)?.[0]?.insertId ?? null };
    }),

  /**
   * Typeahead over companies/investors for the sponsor linker in the
   * admin editor. `kind` picks which table to search.
   */
  adminSearchSponsorEntities: protectedProcedure
    .input(z.object({
      q: z.string(),
      kind: z.enum(['company', 'investor']),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const q = input.q?.trim();
      if (!q) return [];
      const term = `%${q}%`;

      if (input.kind === 'company') {
        return db.select({
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
          logo: companies.logo,
          websiteUrl: companies.website,
        }).from(companies)
          .where(like(companies.name, term))
          .orderBy(asc(companies.name))
          .limit(10);
      }

      return db.select({
        id: investors.id,
        name: investors.name,
        slug: investors.slug,
        logo: investors.logo,
        websiteUrl: investors.website,
      }).from(investors)
        .where(like(investors.name, term))
        .orderBy(asc(investors.name))
        .limit(10);
    }),

  adminDeleteSponsor: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(eventSponsors).where(eq(eventSponsors.id, input.id));
      return { success: true };
    }),

  // -------- Admin: Recap article picker --------
  adminSearchArticlesForRecap: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const q = input.query ? `%${input.query}%` : null;
      const rows = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        publishedAt: articles.publishedAt,
      }).from(articles)
        .where(q ? like(articles.title, q) : sql`1=1`)
        .orderBy(desc(articles.publishedAt))
        .limit(25);
      return rows;
    }),

  // ============================================================
  // EVENT ↔ ARTICLE LINKS (article_events)
  // ============================================================

  /**
   * Published articles linked to an event. Public — drives the
   * "Coverage" block on the event page. Newest first.
   */
  getEventArticles: publicProcedure
    .input(z.object({ eventId: z.number(), includeUnpublished: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Only staff may see unpublished links.
      const staff = ['admin', 'editor', 'senior_editor'].includes((ctx as any)?.user?.role ?? '');
      return resolveEventArticles(db, input.eventId, !!input.includeUnpublished && staff);
    }),

  /**
   * Typeahead for the "link an article" picker in the admin event
   * editor. Same shape as adminSearchArticlesForRecap, but capped at 10
   * and driven by a required query string.
   */
  adminSearchArticlesForLink: protectedProcedure
    .input(z.object({ q: z.string(), limit: z.number().int().min(1).max(50).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      const q = input.q?.trim();
      if (!q) return [];
      const rows = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        publishedAt: articles.publishedAt,
      }).from(articles)
        .where(like(articles.title, `%${q}%`))
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit ?? 10);
      return rows;
    }),

  /**
   * Link an article to an event. The (articleId, eventId) pair is
   * treated as unique — re-linking an already-linked article just
   * updates its mentionType instead of creating a duplicate row.
   */
  adminLinkArticle: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      articleId: z.number(),
      mentionType: z.enum(['primary', 'mentioned', 'interview', 'investor_in_round', 'partner', 'speaker', 'sponsor']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const mentionType = input.mentionType ?? 'mentioned';

      const existing = await db.select({ id: articleEvents.id })
        .from(articleEvents)
        .where(and(
          eq(articleEvents.articleId, input.articleId),
          eq(articleEvents.eventId, input.eventId),
        ))
        .limit(1);

      if (existing[0]?.id) {
        await db.update(articleEvents)
          .set({ mentionType } as any)
          .where(eq(articleEvents.id, existing[0].id));
        return { success: true, id: existing[0].id as number };
      }

      const res = await (db as any).insert(articleEvents).values({
        articleId: input.articleId,
        eventId: input.eventId,
        mentionType,
        createdById: ctx.user.id,
      } as any);
      return { success: true, id: (res as any)?.[0]?.insertId ?? null };
    }),

  /** Remove an event ↔ article link by its article_events row id. */
  adminUnlinkArticle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');
      await db.delete(articleEvents).where(eq(articleEvents.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // INTERNAL STRIPE CHECKOUT (Wave 2)
  // ============================================================
  // Public procedures that drive the TicketCheckoutDialog +
  // /events/:slug/tickets/success page. Stripe SDK details are
  // isolated in server/services/stripePayment.service.ts.

  /**
   * Apply (validate) a promo code against a running subtotal. Pure
   * read — does NOT bump usedCount; that happens on webhook receipt
   * when the order actually moves to paid. Throws on any failure
   * (unknown code / inactive / outside validity window / cap hit).
   */
  applyPromoCode: publicProcedure
    .input(z.object({
      eventId: z.number(),
      code: z.string().min(1).max(64),
      subtotalCents: z.number().int().min(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [promo] = await db.select().from(eventPromoCodes)
        .where(and(
          eq(eventPromoCodes.eventId, input.eventId),
          eq(eventPromoCodes.code, input.code),
        ))
        .limit(1);

      if (!promo) throw new Error("Invalid promo code");
      if (!promo.isActive) throw new Error("This promo code is no longer active");

      const nowMs = Date.now();
      if (promo.validFrom && new Date(promo.validFrom).getTime() > nowMs) {
        throw new Error("This promo code is not yet active");
      }
      if (promo.validUntil && new Date(promo.validUntil).getTime() < nowMs) {
        throw new Error("This promo code has expired");
      }
      if (promo.maxUses !== null && promo.maxUses !== undefined &&
          (promo.usedCount || 0) >= promo.maxUses) {
        throw new Error("This promo code has reached its usage limit");
      }

      let discountCents = 0;
      if (promo.discountType === 'percentage') {
        // discountValue stored as integer percent (0-100)
        discountCents = Math.floor(input.subtotalCents * (promo.discountValue / 100));
      } else {
        // fixed_cents — capped at subtotal so total never goes negative
        discountCents = Math.min(promo.discountValue, input.subtotalCents);
      }
      const totalCents = Math.max(0, input.subtotalCents - discountCents);

      return {
        promoCodeId: promo.id,
        discountCents,
        totalCents,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      };
    }),

  /**
   * Create a Stripe Checkout Session for the given event + line items.
   * Server-side re-validates every line (price, capacity, sales window)
   * to defeat client-side tampering. Persists a pending order row +
   * line items BEFORE handing off to Stripe so the webhook can
   * reconcile back via metadata.internalOrderId.
   */
  createCheckoutSession: publicProcedure
    .input(z.object({
      eventId: z.number(),
      items: z.array(z.object({
        ticketId: z.number(),
        quantity: z.number().int().min(1),
      })).min(1),
      customer: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }),
      promoCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Load the event (for slug + title + ticketProvider check)
      const [evt] = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!evt) throw new Error("Event not found");
      if (evt.ticketProvider !== 'internal') {
        throw new Error("This event does not use internal ticketing");
      }

      // 2. Re-validate every line item against current tier state
      const tierIds = input.items.map(i => i.ticketId);
      const tierRows = await db.select().from(eventTickets)
        .where(and(
          eq(eventTickets.eventId, input.eventId),
          inArray(eventTickets.id, tierIds),
        ));
      const tierMap = new Map<number, any>(tierRows.map((t: any) => [t.id, t]));

      const nowMs = Date.now();
      let subtotalCents = 0;
      const currency = (tierRows[0] as any)?.currency || 'USD';
      const validatedItems: Array<{
        ticketId: number; name: string; quantity: number;
        unitPriceCents: number; lineTotalCents: number; currency: string;
        description?: string;
      }> = [];

      for (const item of input.items) {
        const tier = tierMap.get(item.ticketId);
        if (!tier) throw new Error(`Ticket tier ${item.ticketId} not found`);
        if (!tier.isActive) throw new Error(`"${tier.name}" is not currently on sale`);
        if (tier.salesStartAt && new Date(tier.salesStartAt).getTime() > nowMs) {
          throw new Error(`"${tier.name}" sales have not started yet`);
        }
        if (tier.salesEndAt && new Date(tier.salesEndAt).getTime() < nowMs) {
          throw new Error(`"${tier.name}" sales have ended`);
        }
        if (tier.maxPerOrder && item.quantity > tier.maxPerOrder) {
          throw new Error(`"${tier.name}" allows a maximum of ${tier.maxPerOrder} per order`);
        }
        if (tier.capacity !== null && tier.capacity !== undefined) {
          const remaining = tier.capacity - (tier.soldCount || 0);
          if (remaining < item.quantity) {
            throw new Error(`"${tier.name}" only has ${remaining} ticket(s) remaining`);
          }
        }
        const lineTotal = tier.priceCents * item.quantity;
        subtotalCents += lineTotal;
        validatedItems.push({
          ticketId: tier.id,
          name: tier.name,
          description: tier.description || undefined,
          quantity: item.quantity,
          unitPriceCents: tier.priceCents,
          lineTotalCents: lineTotal,
          currency: tier.currency || 'USD',
        });
      }

      // 3. Re-validate promo code if supplied (recompute discount)
      let promoCodeId: number | null = null;
      let discountCents = 0;
      if (input.promoCode) {
        const [promo] = await db.select().from(eventPromoCodes)
          .where(and(
            eq(eventPromoCodes.eventId, input.eventId),
            eq(eventPromoCodes.code, input.promoCode),
          ))
          .limit(1);
        if (!promo || !promo.isActive) throw new Error("Invalid promo code");
        if (promo.validFrom && new Date(promo.validFrom).getTime() > nowMs) {
          throw new Error("Promo code is not yet active");
        }
        if (promo.validUntil && new Date(promo.validUntil).getTime() < nowMs) {
          throw new Error("Promo code has expired");
        }
        if (promo.maxUses !== null && promo.maxUses !== undefined &&
            (promo.usedCount || 0) >= promo.maxUses) {
          throw new Error("Promo code has reached its usage limit");
        }
        if (promo.discountType === 'percentage') {
          discountCents = Math.floor(subtotalCents * (promo.discountValue / 100));
        } else {
          discountCents = Math.min(promo.discountValue, subtotalCents);
        }
        promoCodeId = promo.id;
      }

      const totalCents = Math.max(0, subtotalCents - discountCents);

      // 4. INSERT pending order header
      const userId = (ctx as any)?.user?.id ?? null;
      const orderInsert: any = {
        eventId: input.eventId,
        userId,
        customerEmail: input.customer.email,
        customerName: input.customer.name || null,
        customerPhone: input.customer.phone || null,
        customerCompany: input.customer.company || null,
        subtotalCents,
        discountCents,
        feesCents: 0,
        totalCents,
        currency,
        promoCodeId,
        status: 'pending',
        paymentProvider: 'stripe',
      };
      const orderRes = await db.insert(eventOrders).values(orderInsert as any);
      const orderId = (orderRes as any)?.[0]?.insertId;
      if (!orderId) throw new Error("Failed to create order");

      // 5. INSERT line items (with qrCode placeholders)
      const itemRows = validatedItems.map(li => ({
        orderId,
        ticketId: li.ticketId,
        quantity: li.quantity,
        unitPriceCents: li.unitPriceCents,
        lineTotalCents: li.lineTotalCents,
        qrCode: crypto.randomBytes(16).toString('hex'),
      }));
      if (itemRows.length > 0) {
        await db.insert(eventOrderItems).values(itemRows as any);
      }

      // 6. Build absolute URLs for Stripe
      const proto = (ctx as any)?.req?.protocol || 'https';
      const host = (ctx as any)?.req?.headers?.host || process.env.PUBLIC_HOST || publication.domain;
      const baseUrl = `${proto}://${host}`;
      const successUrl = `${baseUrl}/events/${evt.slug}/tickets/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/events/${evt.slug}`;

      // 7. Hand off to Stripe
      const session = await stripePaymentService.createCheckoutSession({
        eventId: input.eventId,
        eventSlug: evt.slug,
        eventTitle: evt.title,
        customerEmail: input.customer.email,
        lineItems: validatedItems.map(li => ({
          ticketId: li.ticketId,
          name: li.name,
          description: li.description,
          unitAmountCents: li.unitPriceCents,
          currency: li.currency,
          quantity: li.quantity,
        })),
        promoCodeId: promoCodeId ?? undefined,
        discountCents: discountCents > 0 ? discountCents : undefined,
        successUrl,
        cancelUrl,
        internalOrderId: orderId,
      });

      // 8. Persist the session id on the order row for webhook lookup
      await db.update(eventOrders)
        .set({ stripeSessionId: session.sessionId } as any)
        .where(eq(eventOrders.id, orderId));

      return {
        orderId,
        sessionId: session.sessionId,
        url: session.url,
      };
    }),

  /**
   * Public lookup used by /events/:slug/tickets/success?session_id=...
   * Returns the order header + items. Does NOT return Stripe internals
   * (payment ref, stripe session id) — just what the buyer needs.
   */
  getOrderBySession: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db.select().from(eventOrders)
        .where(eq(eventOrders.stripeSessionId, input.sessionId))
        .limit(1);
      if (!order) return null;

      const items = await db.select().from(eventOrderItems)
        .where(eq(eventOrderItems.orderId, order.id));

      // Hydrate item tier names so the success page can render
      // "Standard x2" without a separate round-trip per row.
      const tierIds = Array.from(new Set(items.map((i: any) => i.ticketId)));
      const tiers = tierIds.length > 0
        ? await db.select().from(eventTickets).where(inArray(eventTickets.id, tierIds))
        : [];
      const tierMap = new Map<number, any>(tiers.map((t: any) => [t.id, t]));

      const [evt] = await db.select().from(events).where(eq(events.id, order.eventId)).limit(1);

      return {
        id: order.id,
        eventId: order.eventId,
        eventSlug: evt?.slug || null,
        eventTitle: evt?.title || null,
        status: order.status,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        currency: order.currency,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        items: items.map((it: any) => ({
          id: it.id,
          ticketId: it.ticketId,
          ticketName: tierMap.get(it.ticketId)?.name || `Ticket #${it.ticketId}`,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          lineTotalCents: it.lineTotalCents,
          qrCode: it.qrCode,
        })),
      };
    }),

  // ------------------------------------------------------------
  // Admin sales dashboard
  // ------------------------------------------------------------

  adminListOrders: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      status: z.enum(['pending','paid','refunded','cancelled','failed']).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const conds: any[] = [eq(eventOrders.eventId, input.eventId)];
      if (input.status) conds.push(eq(eventOrders.status, input.status));

      const offset = (input.page - 1) * input.limit;
      const rows = await db.select().from(eventOrders)
        .where(and(...conds))
        .orderBy(desc(eventOrders.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalRow = await db.select({ c: sql<number>`COUNT(*)` })
        .from(eventOrders)
        .where(and(...conds));
      const total = Number((totalRow as any)?.[0]?.c || 0);

      return { rows, total, page: input.page, limit: input.limit };
    }),

  adminGetOrderStats: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const allOrders = await db.select().from(eventOrders)
        .where(eq(eventOrders.eventId, input.eventId));

      let totalRevenue = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let refundedCount = 0;
      for (const o of allOrders as any[]) {
        if (o.status === 'paid') {
          paidCount++;
          totalRevenue += o.totalCents || 0;
        } else if (o.status === 'pending') {
          pendingCount++;
        } else if (o.status === 'refunded') {
          refundedCount++;
        }
      }

      const tiers = await db.select().from(eventTickets)
        .where(eq(eventTickets.eventId, input.eventId))
        .orderBy(asc(eventTickets.sortOrder));

      return {
        totalOrders: allOrders.length,
        totalRevenue,
        paidCount,
        pendingCount,
        refundedCount,
        perTier: (tiers as any[]).map(t => ({
          ticketId: t.id,
          name: t.name,
          sold: t.soldCount || 0,
          capacity: t.capacity,
        })),
      };
    }),

  /**
   * Refund an order. Calls Stripe to refund the charge, then on
   * success updates our DB row + decrements counters. If amountCents
   * is omitted, refunds the full amount.
   */
  adminRefundOrder: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      amountCents: z.number().int().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const [order] = await db.select().from(eventOrders)
        .where(eq(eventOrders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");
      if (order.status !== 'paid') throw new Error("Only paid orders can be refunded");
      if (!order.paymentRef) throw new Error("No payment reference on this order");

      const refund = await stripePaymentService.refundCharge(order.paymentRef, input.amountCents);

      const isFullRefund = !input.amountCents || input.amountCents >= (order.totalCents || 0);
      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (isFullRefund) {
        await db.update(eventOrders)
          .set({ status: 'refunded', refundedAt: nowIso } as any)
          .where(eq(eventOrders.id, order.id));

        // Decrement counters (mirror of webhook charge.refunded)
        const items = await db.select().from(eventOrderItems)
          .where(eq(eventOrderItems.orderId, order.id));
        for (const it of items as any[]) {
          await db.update(eventTickets)
            .set({ soldCount: sql`GREATEST(0, ${eventTickets.soldCount} - ${it.quantity})` } as any)
            .where(eq(eventTickets.id, it.ticketId));
        }
        const totalQty = (items as any[]).reduce((s, i) => s + (i.quantity || 0), 0);
        await db.update(events)
          .set({
            ticketsSoldCount: sql`GREATEST(0, ${events.ticketsSoldCount} - ${totalQty})`,
            ticketsRevenueCents: sql`GREATEST(0, ${events.ticketsRevenueCents} - ${order.totalCents || 0})`,
          } as any)
          .where(eq(events.id, order.eventId));
      }

      return { refundId: refund.id, status: refund.status, fullyRefunded: isFullRefund };
    }),

  /**
   * Admin-entered comp / manual order. Same downstream counter bumps
   * as a Stripe webhook would do — sets status='paid' immediately,
   * no charge happens.
   */
  adminMarkPaidManual: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      items: z.array(z.object({
        ticketId: z.number(),
        quantity: z.number().int().min(1),
      })).min(1),
      customer: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) throw new Error('Unauthorized');

      const tierIds = input.items.map(i => i.ticketId);
      const tierRows = await db.select().from(eventTickets)
        .where(and(
          eq(eventTickets.eventId, input.eventId),
          inArray(eventTickets.id, tierIds),
        ));
      const tierMap = new Map<number, any>(tierRows.map((t: any) => [t.id, t]));

      let subtotalCents = 0;
      const currency = (tierRows[0] as any)?.currency || 'USD';
      const itemRows: any[] = [];
      let totalQty = 0;

      for (const it of input.items) {
        const tier = tierMap.get(it.ticketId);
        if (!tier) throw new Error(`Ticket tier ${it.ticketId} not found`);
        const line = tier.priceCents * it.quantity;
        subtotalCents += line;
        totalQty += it.quantity;
        itemRows.push({
          ticketId: tier.id,
          quantity: it.quantity,
          unitPriceCents: tier.priceCents,
          lineTotalCents: line,
        });
      }

      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const orderRes = await db.insert(eventOrders).values({
        eventId: input.eventId,
        userId: null,
        customerEmail: input.customer.email,
        customerName: input.customer.name || null,
        customerPhone: input.customer.phone || null,
        customerCompany: input.customer.company || null,
        subtotalCents,
        discountCents: 0,
        feesCents: 0,
        totalCents: subtotalCents,
        currency,
        status: 'paid',
        paymentProvider: 'manual',
        paidAt: nowIso,
        notes: input.notes || null,
      } as any);
      const orderId = (orderRes as any)?.[0]?.insertId;
      if (!orderId) throw new Error("Failed to create manual order");

      // Line items with qr codes
      const withQr = itemRows.map(r => ({
        ...r,
        orderId,
        qrCode: crypto.randomBytes(16).toString('hex'),
      }));
      await db.insert(eventOrderItems).values(withQr as any);

      // Bump tier soldCount + event counters
      for (const r of itemRows) {
        await db.update(eventTickets)
          .set({ soldCount: sql`${eventTickets.soldCount} + ${r.quantity}` } as any)
          .where(eq(eventTickets.id, r.ticketId));
      }
      await db.update(events)
        .set({
          ticketsSoldCount: sql`${events.ticketsSoldCount} + ${totalQty}`,
          ticketsRevenueCents: sql`${events.ticketsRevenueCents} + ${subtotalCents}`,
        } as any)
        .where(eq(events.id, input.eventId));

      return { orderId };
    }),

  // ============================================================
  // External-ticket affiliate click tracking
  // ============================================================
  // Fired by the public EventDetail page when a visitor clicks a
  // "Get Tickets" CTA that points at an external provider
  // (Eventbrite / Luma / generic). The handler MUST be best-effort —
  // any failure here is swallowed so the user's click is never
  // blocked, and the response is intentionally trivial so the
  // navigation can happen in parallel.
  trackExternalClick: publicProcedure
    .input(z.object({
      eventId: z.number().int().positive(),
      provider: z.enum(['eventbrite', 'luma', 'external']),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: true };

        // Rotating daily salt — gives us per-day-unique counts on
        // ip_hash without storing raw IPs (PII / GDPR). Salt rotates
        // at UTC midnight which matches DATE() grouping below.
        const dailySalt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const rawIp = (ctx.req?.ip || '') as string;
        const ipHash = rawIp
          ? crypto
              .createHash('sha256')
              .update(rawIp + dailySalt)
              .digest('hex')
              .slice(0, 64)
          : null;

        const referrer = (ctx.req?.headers?.referer as string | undefined) || null;
        const userAgentRaw = ctx.req?.headers?.['user-agent'];
        const userAgent = typeof userAgentRaw === 'string' ? userAgentRaw : null;

        await db.insert(eventExternalClicks).values({
          eventId: input.eventId,
          provider: input.provider,
          userId: ctx.user?.id ?? null,
          referrer,
          userAgent,
          ipHash,
        } as any);
      } catch (err) {
        // Swallow — analytics MUST NOT block a ticket click.
        // eslint-disable-next-line no-console
        console.error('[events.trackExternalClick] insert failed', err);
      }
      return { ok: true };
    }),

  adminGetExternalClickStats: protectedProcedure
    .input(z.object({
      eventId: z.number().int().positive(),
      days: z.number().int().min(1).max(365).optional().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      // Per-provider counts in a single round-trip.
      const totals = await db
        .select({
          provider: eventExternalClicks.provider,
          clicks: sql<number>`COUNT(*)`,
        })
        .from(eventExternalClicks)
        .where(and(
          eq(eventExternalClicks.eventId, input.eventId),
          gte(eventExternalClicks.createdAt, since as any),
        ))
        .groupBy(eventExternalClicks.provider);

      const byProvider: { eventbrite: number; luma: number; external: number } = {
        eventbrite: 0,
        luma: 0,
        external: 0,
      };
      let totalClicks = 0;
      for (const row of totals) {
        const n = Number(row.clicks || 0);
        totalClicks += n;
        if (row.provider && row.provider in byProvider) {
          byProvider[row.provider as 'eventbrite' | 'luma' | 'external'] = n;
        }
      }

      // Unique-clicker count is DISTINCT across providers, so a visitor
      // who clicks both Eventbrite + Luma in the window counts once.
      const uniquesRow = await db
        .select({
          uniques: sql<number>`COUNT(DISTINCT ${eventExternalClicks.ipHash})`,
        })
        .from(eventExternalClicks)
        .where(and(
          eq(eventExternalClicks.eventId, input.eventId),
          gte(eventExternalClicks.createdAt, since as any),
        ));
      const uniqueClickerCount = Number(uniquesRow[0]?.uniques || 0);

      // Per-day buckets. DATE() groups in the server's local tz
      // (UTC on prod), matching the YYYY-MM-DD salt above so the day
      // buckets line up with the unique-hash rotation.
      const perDayRaw = await db
        .select({
          date: sql<string>`DATE(${eventExternalClicks.createdAt})`,
          clicks: sql<number>`COUNT(*)`,
        })
        .from(eventExternalClicks)
        .where(and(
          eq(eventExternalClicks.eventId, input.eventId),
          gte(eventExternalClicks.createdAt, since as any),
        ))
        .groupBy(sql`DATE(${eventExternalClicks.createdAt})`)
        .orderBy(sql`DATE(${eventExternalClicks.createdAt})`);

      const perDayCounts = perDayRaw.map(r => ({
        date: String(r.date),
        clicks: Number(r.clicks || 0),
      }));

      return {
        totalClicks,
        uniqueClickerCount,
        byProvider,
        perDayCounts,
      };
    }),

  // ============================================================
  // LIVE BLOG COMPOSER — write side of the live feed
  //
  // The public read endpoint (listLivePosts above) is already in
  // production. These four mutations + the guard query make up the
  // composer that admins / editors / correspondents use to post
  // live updates from the venue floor.
  //
  // All four reuse canPostLive() — staff role bypass OR per-event
  // correspondent assignment OR being the event tenant. We do not
  // gate on user.role here so that event_correspondent / event_tenant
  // accounts can hit these endpoints from /admin/events/:id/live.
  // ============================================================

  /**
   * Guard query the composer calls on mount. The composer renders
   * an "unauthorized" view if canPost is false — saves a wasted
   * mutation round-trip when a logged-in non-correspondent visits
   * the page directly.
   */
  canPostLiveCheck: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      return canPostLiveWithReason(ctx.user.id, input.eventId);
    }),

  /**
   * Create a new live post. Author defaults to the calling user.
   * Returns the inserted row so the composer can optimistically
   * prepend it to the feed without a refetch.
   */
  postLiveUpdate: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      headline: z.string().max(512).optional().nullable(),
      body: z.string().min(1),
      postType: z.enum(['update','quote','funding','session','sponsor','photo','video','breaking']).default('update'),
      imageUrl: z.string().optional().nullable(),
      embedUrl: z.string().optional().nullable(),
      speakerName: z.string().max(255).optional().nullable(),
      companyName: z.string().max(255).optional().nullable(),
      fundingAmount: z.string().max(64).optional().nullable(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const ok = await canPostLive(ctx.user.id, input.eventId);
      if (!ok) throw new Error("Unauthorized");

      const res = await (db as any).insert(eventLivePosts).values({
        eventId: input.eventId,
        authorId: ctx.user.id,
        headline: input.headline ?? null,
        body: input.body,
        postType: input.postType,
        imageUrl: input.imageUrl ?? null,
        embedUrl: input.embedUrl ?? null,
        speakerName: input.speakerName ?? null,
        companyName: input.companyName ?? null,
        fundingAmount: input.fundingAmount ?? null,
        isPinned: input.isPinned ? 1 : 0,
      } as any);

      const insertId = (res as any)?.[0]?.insertId ?? null;
      if (!insertId) return { id: null };

      // Echo back the full row — saves the client a refetch.
      const rows = await (db as any).select().from(eventLivePosts)
        .where(eq(eventLivePosts.id, insertId)).limit(1);
      return rows[0] ?? { id: insertId };
    }),

  /**
   * Edit an existing live post. Looks up the post first so we can
   * run canPostLive on the post's own event — a correspondent on
   * event A must NOT be able to mutate event B's posts even with
   * a forged eventId.
   */
  editLiveUpdate: protectedProcedure
    .input(z.object({
      id: z.number(),
      headline: z.string().max(512).optional().nullable(),
      body: z.string().min(1).optional(),
      postType: z.enum(['update','quote','funding','session','sponsor','photo','video','breaking']).optional(),
      imageUrl: z.string().optional().nullable(),
      embedUrl: z.string().optional().nullable(),
      speakerName: z.string().max(255).optional().nullable(),
      companyName: z.string().max(255).optional().nullable(),
      fundingAmount: z.string().max(64).optional().nullable(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await (db as any).select({
        id: eventLivePosts.id,
        eventId: eventLivePosts.eventId,
      }).from(eventLivePosts).where(eq(eventLivePosts.id, input.id)).limit(1);
      if (!existing.length) throw new Error("Post not found");

      const ok = await canPostLive(ctx.user.id, existing[0].eventId);
      if (!ok) throw new Error("Unauthorized");

      const { id, isPinned, ...rest } = input;
      const patch: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) patch[k] = v;
      }
      if (isPinned !== undefined) patch.isPinned = isPinned ? 1 : 0;
      if (Object.keys(patch).length === 0) return { success: true };

      await (db as any).update(eventLivePosts).set(patch as any)
        .where(eq(eventLivePosts.id, id));
      return { success: true };
    }),

  /**
   * Soft delete — flips is_deleted to 1 so the public feed hides
   * the post but moderators can still see the history. Same auth
   * model as editLiveUpdate.
   */
  deleteLiveUpdate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await (db as any).select({
        id: eventLivePosts.id,
        eventId: eventLivePosts.eventId,
      }).from(eventLivePosts).where(eq(eventLivePosts.id, input.id)).limit(1);
      if (!existing.length) throw new Error("Post not found");

      const ok = await canPostLive(ctx.user.id, existing[0].eventId);
      if (!ok) throw new Error("Unauthorized");

      await (db as any).update(eventLivePosts)
        .set({ isDeleted: 1 } as any)
        .where(eq(eventLivePosts.id, input.id));
      return { success: true };
    }),

  /**
   * Toggle the pinned flag. Pinned posts stick to the top of the
   * public feed (see listLivePosts orderBy).
   */
  togglePinLiveUpdate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await (db as any).select({
        id: eventLivePosts.id,
        eventId: eventLivePosts.eventId,
        isPinned: eventLivePosts.isPinned,
      }).from(eventLivePosts).where(eq(eventLivePosts.id, input.id)).limit(1);
      if (!existing.length) throw new Error("Post not found");

      const ok = await canPostLive(ctx.user.id, existing[0].eventId);
      if (!ok) throw new Error("Unauthorized");

      const next = existing[0].isPinned ? 0 : 1;
      await (db as any).update(eventLivePosts)
        .set({ isPinned: next } as any)
        .where(eq(eventLivePosts.id, input.id));
      return { success: true, isPinned: Boolean(next) };
    }),

  // ============================================================
  // AI COVERAGE SUGGESTIONS — approval queue
  //
  // The event coverage agent (eventCoverageAgent.service.ts) files
  // web-scraped drafts as source='ai', approvalStatus='pending'.
  // Anyone who can post live updates can approve/reject them; an
  // approve may carry edited headline/body (edit-then-approve).
  // ============================================================

  listLiveSuggestions: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const ok = await canPostLive(ctx.user.id, input.eventId);
      if (!ok) throw new Error("Unauthorized");
      return db.select()
        .from(eventLivePosts)
        .where(and(
          eq(eventLivePosts.eventId, input.eventId),
          eq(eventLivePosts.source, 'ai'),
          eq(eventLivePosts.approvalStatus, 'pending'),
          eq(eventLivePosts.isDeleted, 0),
        ))
        .orderBy(desc(eventLivePosts.publishedAt))
        .limit(50);
    }),

  approveLiveSuggestion: protectedProcedure
    .input(z.object({
      id: z.number(),
      headline: z.string().max(512).optional().nullable(),
      body: z.string().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await (db as any).select({
        id: eventLivePosts.id, eventId: eventLivePosts.eventId,
      }).from(eventLivePosts).where(eq(eventLivePosts.id, input.id)).limit(1);
      if (!existing.length) throw new Error("Suggestion not found");
      const ok = await canPostLive(ctx.user.id, existing[0].eventId);
      if (!ok) throw new Error("Unauthorized");
      await (db as any).update(eventLivePosts)
        .set({
          approvalStatus: 'approved',
          // Approval republishes: timestamp the moment it went live,
          // not the moment the crawler drafted it.
          publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
        } as any)
        .where(eq(eventLivePosts.id, input.id));
      return { success: true };
    }),

  rejectLiveSuggestion: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await (db as any).select({
        id: eventLivePosts.id, eventId: eventLivePosts.eventId,
      }).from(eventLivePosts).where(eq(eventLivePosts.id, input.id)).limit(1);
      if (!existing.length) throw new Error("Suggestion not found");
      const ok = await canPostLive(ctx.user.id, existing[0].eventId);
      if (!ok) throw new Error("Unauthorized");
      await (db as any).update(eventLivePosts)
        .set({ approvalStatus: 'rejected' } as any)
        .where(eq(eventLivePosts.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // EVENT TENANT — admin assigns the event organiser
  //
  // Surfaces in the Live tab as a small Tenant card. Sets
  // events.claimedByUserId so canPostLive() lets that user post
  // without needing a correspondent row. Pass userId = null to
  // unclaim.
  // ============================================================
  adminSetEventTenant: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      userId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }
      await (db as any).update(events)
        .set({ claimedByUserId: input.userId } as any)
        .where(eq(events.id, input.eventId));
      return { success: true };
    }),

  /**
   * Tiny read used by the Tenant card in LiveCoverageSettings.
   * Returns the claimed user's basic display info so the card can
   * show "Claimed by Jane Doe" without a second lookup.
   */
  adminGetEventTenant: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }
      const rows = await (db as any).select({
        claimedByUserId: (events as any).claimedByUserId,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        userRole: users.role,
      })
        .from(events)
        .leftJoin(users, eq(users.id, (events as any).claimedByUserId))
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!rows.length) return { claimedByUserId: null, user: null };
      const r = rows[0];
      return {
        claimedByUserId: r.claimedByUserId ?? null,
        user: r.userId ? {
          id: r.userId,
          name: r.userName,
          email: r.userEmail,
          avatar: r.userAvatar,
          role: r.userRole,
        } : null,
      };
    }),

  // ============================================================
  // RSVP — public "Going / Interested / Not going" toggle
  //
  // Powers the buttons in the Event Detail hero. Upsert pattern
  // (one row per (event, user)). Drives:
  //   - The hero pill ("N going")
  //   - The list-card goingCount (correlated subquery above)
  //   - The eventReminders.service.ts cron — only 'going' +
  //     'interested' attendees get reminder emails
  // ============================================================
  rsvp: protectedProcedure
    .input(z.object({
      eventId: z.number().int().positive(),
      status: z.enum(['interested', 'going', 'not_going']),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select()
        .from(eventAttendees)
        .where(and(
          eq(eventAttendees.eventId, input.eventId),
          eq(eventAttendees.userId, ctx.user.id),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(eventAttendees)
          .set({ status: input.status } as any)
          .where(eq(eventAttendees.id, (existing[0] as any).id));
      } else {
        await db.insert(eventAttendees).values({
          eventId: input.eventId,
          userId: ctx.user.id,
          status: input.status,
        } as any);
      }

      return { status: input.status };
    }),

  /**
   * Read the calling user's RSVP for an event. Public so logged-out
   * visitors can still hit it (returns null) — the client uses the
   * shape to drive the filled-vs-outlined state of the buttons.
   */
  getMyRsvp: publicProcedure
    .input(z.object({ eventId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) return { status: null as null | 'interested' | 'going' | 'not_going' };
      const db = await getDb();
      if (!db) return { status: null };

      const rows = await db.select({ status: eventAttendees.status })
        .from(eventAttendees)
        .where(and(
          eq(eventAttendees.eventId, input.eventId),
          eq(eventAttendees.userId, ctx.user.id),
        ))
        .limit(1);

      return { status: (rows[0]?.status as any) ?? null };
    }),

  // ============================================================
  // Live blog admin stats — used by the Analytics tab in the
  // admin event editor. Returns post totals, type breakdown, and
  // per-correspondent contribution counts.
  // ============================================================
  adminGetLiveBlogStats: protectedProcedure
    .input(z.object({ eventId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!['admin', 'editor', 'senior_editor'].includes(ctx.user.role)) {
        throw new Error('Unauthorized');
      }

      // Total + per-type — single grouped query. is_deleted is
      // filtered out so soft-deleted posts don't inflate counts.
      const typeRows = await db.select({
        postType: eventLivePosts.postType,
        count: sql<number>`COUNT(*)`,
      })
        .from(eventLivePosts)
        .where(and(
          eq(eventLivePosts.eventId, input.eventId),
          eq(eventLivePosts.isDeleted, 0),
        ))
        .groupBy(eventLivePosts.postType);

      const byType: Record<string, number> = {
        update: 0, quote: 0, funding: 0, session: 0,
        sponsor: 0, photo: 0, video: 0, breaking: 0,
      };
      let totalPosts = 0;
      for (const r of typeRows) {
        const n = Number(r.count || 0);
        totalPosts += n;
        if (r.postType) byType[r.postType] = n;
      }

      // Per-correspondent breakdown — joins users for display name.
      const correspondentRows = await db.select({
        userId: eventLivePosts.authorId,
        name: users.name,
        avatar: users.avatar,
        count: sql<number>`COUNT(*)`,
      })
        .from(eventLivePosts)
        .leftJoin(users, eq(users.id, eventLivePosts.authorId))
        .where(and(
          eq(eventLivePosts.eventId, input.eventId),
          eq(eventLivePosts.isDeleted, 0),
        ))
        .groupBy(eventLivePosts.authorId, users.name, users.avatar)
        .orderBy(sql`COUNT(*) DESC`);

      return {
        totalPosts,
        byType,
        postsByCorrespondent: correspondentRows.map(r => ({
          userId: r.userId,
          name: r.name || `User #${r.userId}`,
          avatar: r.avatar,
          count: Number(r.count || 0),
        })),
      };
    }),

  // ============================================================
  // Public event submissions (Events Hub v2 — user-submitted events)
  // ============================================================

  submit: protectedProcedure
    .input(
      z.object({
        title: z.string().min(4).max(512),
        tagline: z.string().max(255).optional(),
        description: z.string().optional(),
        type: z.string().max(64).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        city: z.string().max(128).optional(),
        country: z.string().max(128).optional(),
        venue: z.string().max(255).optional(),
        websiteUrl: z.string().url().optional(),
        registrationUrl: z.string().url().optional(),
        organizerName: z.string().max(255).optional(),
        organizerEmail: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(eventSubmissions).values({
        submitterId: ctx.user.id,
        title: input.title,
        tagline: input.tagline,
        description: input.description,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        city: input.city,
        country: input.country,
        venue: input.venue,
        websiteUrl: input.websiteUrl,
        registrationUrl: input.registrationUrl,
        organizerName: input.organizerName,
        organizerEmail: input.organizerEmail,
        moderationStatus: "pending",
      } as any);
      const rows = await db
        .select({ id: eventSubmissions.id })
        .from(eventSubmissions)
        .where(
          and(
            eq(eventSubmissions.submitterId, ctx.user.id),
            eq(eventSubmissions.title, input.title),
          ),
        )
        .orderBy(sql`${eventSubmissions.id} DESC`)
        .limit(1);
      return { id: rows[0]?.id ?? 0 };
    }),

  adminListSubmissions: protectedProcedure
    .input(
      z.object({
        // 'needs_review' is a UI grouping for the moderator queue tab —
        // server-side maps it to (pending OR ai_flagged) so a recruiter
        // sees both human-pending and AI-uncertain submissions together.
        status: z
          .enum([
            "pending",
            "needs_review",
            "ai_approved",
            "ai_flagged",
            "approved",
            "rejected",
            "all",
          ])
          .default("all"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let where: any;
      if (input.status === "all") {
        where = undefined;
      } else if (input.status === "needs_review") {
        where = or(
          eq(eventSubmissions.moderationStatus, "pending"),
          eq(eventSubmissions.moderationStatus, "ai_flagged"),
        );
      } else {
        where = eq(eventSubmissions.moderationStatus, input.status);
      }
      const offset = (input.page - 1) * input.limit;

      const items = await db
        .select({
          id: eventSubmissions.id,
          submitterId: eventSubmissions.submitterId,
          submitterName: users.name,
          submitterEmail: users.email,
          title: eventSubmissions.title,
          tagline: eventSubmissions.tagline,
          description: eventSubmissions.description,
          type: eventSubmissions.type,
          startDate: eventSubmissions.startDate,
          endDate: eventSubmissions.endDate,
          city: eventSubmissions.city,
          country: eventSubmissions.country,
          venue: eventSubmissions.venue,
          websiteUrl: eventSubmissions.websiteUrl,
          registrationUrl: eventSubmissions.registrationUrl,
          organizerName: eventSubmissions.organizerName,
          organizerEmail: eventSubmissions.organizerEmail,
          moderationStatus: eventSubmissions.moderationStatus,
          moderationScore: eventSubmissions.moderationScore,
          moderationReasoning: eventSubmissions.moderationReasoning,
          reviewedById: eventSubmissions.reviewedById,
          reviewedAt: eventSubmissions.reviewedAt,
          approvedEventId: eventSubmissions.approvedEventId,
          createdAt: eventSubmissions.createdAt,
        })
        .from(eventSubmissions)
        .leftJoin(users, eq(eventSubmissions.submitterId, users.id))
        .where(where)
        .orderBy(sql`${eventSubmissions.id} DESC`)
        .limit(input.limit)
        .offset(offset);

      // Per-status counters for the tab bar in the UI.
      const countRows = await db
        .select({
          moderationStatus: eventSubmissions.moderationStatus,
          count: sql<number>`COUNT(*)`,
        })
        .from(eventSubmissions)
        .groupBy(eventSubmissions.moderationStatus);
      const counts: Record<string, number> = {
        pending: 0, ai_approved: 0, ai_flagged: 0, approved: 0, rejected: 0,
      };
      for (const r of countRows) {
        if (r.moderationStatus) counts[r.moderationStatus] = Number(r.count || 0);
      }
      return { items, counts };
    }),

  adminApproveSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.number().int().positive(),
        // Field overrides applied when creating the canonical event row —
        // moderators frequently tweak title/dates before approving.
        eventData: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(eventSubmissions)
        .set({
          moderationStatus: "approved",
          reviewedById: ctx.user.id,
          reviewedAt: new Date().toISOString(),
        } as any)
        .where(eq(eventSubmissions.id, input.submissionId));
      return { success: true as const };
    }),

  adminRejectSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.number().int().positive(),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(eventSubmissions)
        .set({
          moderationStatus: "rejected",
          moderationReasoning: input.reason ?? "No reason given",
          reviewedById: ctx.user.id,
          reviewedAt: new Date().toISOString(),
        } as any)
        .where(eq(eventSubmissions.id, input.submissionId));
      return { success: true as const };
    }),

  adminBulkApproveSubmissions: protectedProcedure
    .input(
      z.object({
        submissionIds: z.array(z.number().int().positive()).min(1).max(100),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let created = 0;
      let skipped = 0;
      for (const id of input.submissionIds) {
        try {
          await db
            .update(eventSubmissions)
            .set({
              moderationStatus: "approved",
              reviewedById: ctx.user.id,
              reviewedAt: new Date().toISOString(),
            } as any)
            .where(eq(eventSubmissions.id, id));
          created += 1;
        } catch {
          skipped += 1;
        }
      }
      return { created, skipped };
    }),

  adminReModerateSubmission: protectedProcedure
    .input(z.object({ submissionId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "editor", "senior_editor"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Reset to pending so the next moderation pass picks it up.
      await db
        .update(eventSubmissions)
        .set({ moderationStatus: "pending" } as any)
        .where(eq(eventSubmissions.id, input.submissionId));
      return { success: true as const };
    }),
});
