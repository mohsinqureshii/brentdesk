/**
 * Event Seeding / Enrichment
 * ----------------------------------------------------------------------
 * Bulk-imports a curated dataset of real events (scripts/data/*.json)
 * into the events table, and enriches events that already exist.
 *
 * Design rules:
 *   - IDEMPOTENT. Matching is by slug, then by normalised title. Running
 *     it twice inserts nothing the second time.
 *   - NON-DESTRUCTIVE. For existing rows it only fills fields that are
 *     currently empty (NULL / '' / 0). An editor's hand-written
 *     description or hand-picked image is never overwritten.
 *   - DRY RUN by default. The caller must pass apply:true to write.
 *   - Images are license-free Unsplash URLs derived from the dataset's
 *     imageQuery, never scraped press photos.
 *
 * Admin-only. Exposed as adminEventSeed.* in the tRPC root.
 */

import { z } from "zod";
import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  events, sectors, eventSectors, people, eventSpeakers, eventHighlights,
  eventTracks, eventSchedule, eventFaqs, eventTickets, eventSideEvents,
} from "../../drizzle/schema";
import { slugService } from "../services/slug.service";
import { workflowService } from "../services/workflow.service";
import { resolveEventImage } from "../services/eventImageSourcing.service";

const DATASET_FILE = "saudi-events-2026.json";

const seedEventSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  tagline: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  whatToExpect: z.string().nullable().optional(),
  type: z.enum(["conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"]),
  format: z.enum(["in_person", "virtual", "hybrid"]),
  startDate: z.string(),
  endDate: z.string(),
  datesConfirmed: z.boolean().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  registrationUrl: z.string().nullable().optional(),
  organizerName: z.string().nullable().optional(),
  organizerWebsite: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
  expectedAttendees: z.number().nullable().optional(),
  expectedStartups: z.number().nullable().optional(),
  expectedInvestors: z.number().nullable().optional(),
  expectedCountries: z.number().nullable().optional(),
  isFeatured: z.boolean().optional(),
  imageQuery: z.string().nullable().optional(),
  sourceUrls: z.array(z.string()).optional(),
});

type SeedEvent = z.infer<typeof seedEventSchema>;

/**
 * Hero image policy.
 *
 * Previously this seeded `source.unsplash.com` URLs. Unsplash retired
 * that endpoint, so every seeded event rendered a broken image. We now
 * seed NO image at all: the event cards render a designed, on-brand
 * gradient built from the event's own type and title, which looks
 * deliberate rather than broken and never depends on a third party
 * staying alive. Editors attach real photography per event from the
 * media library, and any uploaded image takes precedence immediately.
 */
function imageUrlFor(_ev: SeedEvent): string | null {
  return null;
}

function toMySqlDateTime(isoDate: string, endOfDay = false): string {
  // Dataset carries plain dates; events run venue-hours, so default to
  // 09:00 local start and 18:00 local end rather than midnight.
  const time = endOfDay ? "18:00:00" : "09:00:00";
  return `${isoDate.slice(0, 10)} ${time}`;
}

function normaliseTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Significant tokens of a title: lowercase words with years, ordinals
 * and editorial filler removed. Used for fuzzy matching so an event we
 * already have under a slightly different name is ENRICHED rather than
 * duplicated — e.g. "Black Hat MEA" vs "Black Hat MEA 2026",
 * "Biban Entrepreneurship Forum 2026" vs "Biban Forum 2026",
 * "Future Investment Initiative 10th Edition 2026" vs "FII 2026".
 */
const TITLE_STOPWORDS = new Set([
  "the", "and", "of", "for", "edition", "annual", "official",
  "expo", "exhibition", "conference", "event",
]);

function titleTokens(t: string): Set<string> {
  return new Set(
    normaliseTitle(t)
      .split(" ")
      .filter(w =>
        w.length > 1 &&
        !TITLE_STOPWORDS.has(w) &&
        !/^\d{4}$/.test(w) &&        // years: 2026
        !/^\d+(st|nd|rd|th)$/.test(w) // ordinals: 10th
      ),
  );
}

/**
 * Known naming variants for events whose titles differ by more than
 * years/ordinals. Subset matching was tried and rejected: it wrongly
 * merged genuinely distinct siblings ("Big 5 Construct Saudi 2026" vs
 * its Winter Edition, "Jeddah Season" vs "Jeddah E-Prix Season
 * Opener"). Explicit aliases are safer than a clever rule.
 */
const TITLE_ALIASES: Record<string, string[]> = {
  "biban-forum-2026": ["Biban Entrepreneurship Forum", "Biban Global Forum"],
  "future-investment-initiative-2026": ["FII", "FII PRIORITY", "Future Investment Initiative 10th"],
  "money2020-middle-east-2026": ["Money 20/20 Middle East", "Money2020 ME", "24 Fintech"],
  "leap-2026": ["LEAP Tech Conference", "LEAP Riyadh"],
  "deepfest-2026": ["DeepFest AI", "Deep Fest"],
  "black-hat-mea-2026": ["Black Hat Middle East and Africa", "Black Hat Middle East & Africa"],
  "cityscape-global-2026": ["Cityscape Global Riyadh"],
};

/**
 * Same event under a different name? Titles match when their
 * significant tokens are IDENTICAL (so "Black Hat MEA" == "Black Hat
 * MEA 2026", and "FII 10th Edition 2026" == "Future Investment
 * Initiative 2026" once ordinals/filler are stripped), or when one
 * side matches a curated alias. Deliberately strict — a missed match
 * creates one duplicate to merge by hand, a false match silently
 * destroys a distinct event's identity.
 */
function tokensEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size || a.size < 2) return false;
  for (const w of Array.from(a)) if (!b.has(w)) return false;
  return true;
}

function titlesLikelySame(existingTitle: string, seedTitle: string, seedSlug?: string): boolean {
  if (tokensEqual(titleTokens(existingTitle), titleTokens(seedTitle))) return true;
  const aliases = seedSlug ? TITLE_ALIASES[seedSlug] : undefined;
  if (aliases) {
    const et = titleTokens(existingTitle);
    for (const alias of aliases) if (tokensEqual(et, titleTokens(alias))) return true;
  }
  return false;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "" || v === 0;
}

function loadDataset(): SeedEvent[] {
  const candidates = [
    path.resolve(import.meta.dirname, "../scripts/data", DATASET_FILE),
    path.resolve(process.cwd(), "scripts/data", DATASET_FILE),
    path.resolve(import.meta.dirname, "../../scripts/data", DATASET_FILE),
  ];
  const file = candidates.find(p => fs.existsSync(p));
  if (!file) {
    throw new Error(
      `Dataset ${DATASET_FILE} not found. Looked in: ${candidates.join(", ")}`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error("Dataset must be a JSON array");
  return raw.map((r, i) => {
    const parsed = seedEventSchema.safeParse(r);
    if (!parsed.success) {
      throw new Error(`Dataset entry ${i} (${r?.slug ?? "?"}) invalid: ${parsed.error.message.slice(0, 200)}`);
    }
    return parsed.data;
  });
}


/**
 * Sector taxonomy for events. The `sectors` table drives the admin
 * filter and the public sector badges, but nothing was populating it
 * for events, so every row showed "—". Each entry lists the keywords
 * matched (case-insensitively) against an event's title, tagline and
 * description.
 */
const SECTOR_SEED: Array<{ name: string; slug: string; keywords: string[] }> = [
  { name: "Technology", slug: "technology", keywords: ["tech", "leap", "gitex", "digital", "software", "electronics", "innovation", "startup", "deepfest", "web3", "cloud"] },
  { name: "Artificial Intelligence", slug: "artificial-intelligence", keywords: ["ai ", "artificial intelligence", "deepfest", "machine learning", "sdaia", "data science"] },
  { name: "Finance & Fintech", slug: "finance-fintech", keywords: ["fintech", "finance", "money20", "banking", "investment", "capital", "financial", "wealth"] },
  { name: "Energy", slug: "energy", keywords: ["energy", "oil", "gas", "petro", "solar", "renewable", "power", "wpc", "hydrogen", "nuclear"] },
  { name: "Healthcare", slug: "healthcare", keywords: ["health", "medical", "medic", "pharma", "hospital", "wellness", "rehab", "dental", "biotech"] },
  { name: "Construction & Real Estate", slug: "construction-real-estate", keywords: ["construct", "cityscape", "real estate", "build", "property", "architect", "infrastructure", "big 5", "interior"] },
  { name: "Transport & Logistics", slug: "transport-logistics", keywords: ["logistic", "transport", "supply chain", "aviation", "aero", "rail", "maritime", "port", "mobility", "warehous", "auto show", "motor"] },
  { name: "Retail & E-commerce", slug: "retail-ecommerce", keywords: ["retail", "e-commerce", "ecommerce", "shopping", "franchise", "consumer"] },
  { name: "Food & Agriculture", slug: "food-agriculture", keywords: ["food", "agri", "coffee", "chocolate", "hospitality", "restaurant", "beverage", "halal"] },
  { name: "Media & Entertainment", slug: "media-entertainment", keywords: ["film", "media", "entertainment", "music", "gaming", "esports", "festival", "soundstorm", "season", "concert", "comic"] },
  { name: "Sports", slug: "sports", keywords: ["sport", "formula 1", "e-prix", "football", "games", "camel", "rally", "marathon", "cup"] },
  { name: "Education", slug: "education", keywords: ["education", "school", "university", "learning", "training", "gess", "academic"] },
  { name: "Tourism & Culture", slug: "tourism-culture", keywords: ["tourism", "travel", "culture", "heritage", "art", "biennale", "hotel", "hajj", "umrah", "museum"] },
  { name: "Manufacturing & Industry", slug: "manufacturing-industry", keywords: ["manufactur", "industr", "factory", "machine", "materials", "mining", "minerals", "steel", "plastic"] },
  { name: "Defence & Security", slug: "defence-security", keywords: ["defense", "defence", "security", "cyber", "black hat", "isnr", "military", "police"] },
  { name: "Government & Policy", slug: "government-policy", keywords: ["government", "policy", "municipal", "public sector", "ministry", "forum", "summit"] },
  { name: "Human Resources", slug: "human-resources", keywords: ["hr ", "human resources", "talent", "recruit", "workforce", "employment"] },
];

/** Ensure the sector rows exist; returns slug -> id. */
async function ensureSectors(db: any): Promise<Map<string, number>> {
  const existing = await db.select({ id: sectors.id, slug: sectors.slug }).from(sectors);
  const bySlug = new Map<string, number>(existing.map((r: any) => [r.slug, r.id]));
  for (const sec of SECTOR_SEED) {
    if (bySlug.has(sec.slug)) continue;
    const res: any = await db.insert(sectors).values({
      name: sec.name, slug: sec.slug, isActive: 1,
    } as any);
    const id = res?.[0]?.insertId ?? res?.insertId;
    if (id) bySlug.set(sec.slug, Number(id));
  }
  return bySlug;
}

/**
 * Keyword-match an event to sector slugs (max 3, most specific first).
 *
 * Matching is anchored to word starts, not raw substrings: plain
 * `includes` tagged LEAP as Tourism because "art" appears inside
 * "startup", and similar false positives across the set. A leading
 * word boundary still allows prefix matches ("construct" →
 * "construction", "industr" → "industrial").
 */
const KEYWORD_RE_CACHE = new Map<string, RegExp>();
function keywordRegex(k: string): RegExp {
  const key = k.toLowerCase().trim();
  let re = KEYWORD_RE_CACHE.get(key);
  if (!re) {
    re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    KEYWORD_RE_CACHE.set(key, re);
  }
  return re;
}

function inferSectors(text: string): string[] {
  const hay = ` ${text.toLowerCase()} `;
  const hits: string[] = [];
  for (const sec of SECTOR_SEED) {
    if (sec.keywords.some(k => keywordRegex(k).test(hay))) hits.push(sec.slug);
  }
  // "government-policy" matches the very common words forum/summit, so
  // only keep it when nothing more specific matched.
  const specific = hits.filter(h => h !== "government-policy");
  return (specific.length ? specific : hits).slice(0, 3);
}

/**
 * An event counts as "has an image" only for a non-blank URL. Older
 * rows carry '' rather than NULL, and those need sourcing just as much
 * as NULL ones do.
 */
function hasImage(url: string | null | undefined): boolean {
  return typeof url === "string" && url.trim().length > 0;
}

/**
 * Wall-clock budget for one sourceEventImages call. Commons requests
 * are sequential and throttled, so the honest cap on a batch is time,
 * not row count — the request returns partial progress and the admin
 * re-runs rather than holding a connection open for minutes.
 */
const IMAGE_SOURCING_BUDGET_MS = 45_000;


// ----------------------------------------------------------------------
// Flagship events — fully researched reference pages (LEAP, DeepFest)
// ----------------------------------------------------------------------

const FLAGSHIP_FILE = "flagship-events-2026.json";

/** Create or reuse a People profile so event speakers are real, linkable
 *  profiles rather than free text. Deduped by name, same rule the event
 *  editor uses. */
async function ensurePerson(db: any, sp: any): Promise<number | null> {
  const name = String(sp.name || "").trim();
  if (!name) return null;
  const existing = await db.select({ id: people.id }).from(people)
    .where(sql`LOWER(${people.name}) = LOWER(${name})`).limit(1);
  if (existing[0]?.id) return Number(existing[0].id);

  const baseSlug = slugService.generateSlug(name);
  const slug = await slugService.generateUniqueSlug("person", baseSlug);
  const published = await workflowService.getStatusBySlug("editorial", "published");
  const initial = published ?? (await workflowService.getInitialStatus("editorial"));
  if (!initial) throw new Error("Workflow not initialized");

  const res: any = await db.insert(people).values({
    name,
    slug,
    title: sp.title ?? null,
    company: sp.company ?? null,
    bio: sp.bio ?? null,
    linkedIn: sp.linkedinUrl ?? null,
    website: sp.websiteUrl ?? null,
    statusId: initial.id,
    publishedAt: published ? new Date() : null,
  } as any);
  return Number(res?.[0]?.insertId ?? res?.insertId) || null;
}

function loadFlagship(): any[] {
  const candidates = [
    path.resolve(import.meta.dirname, "../scripts/data", FLAGSHIP_FILE),
    path.resolve(process.cwd(), "scripts/data", FLAGSHIP_FILE),
    path.resolve(import.meta.dirname, "../../scripts/data", FLAGSHIP_FILE),
  ];
  const file = candidates.find(p => fs.existsSync(p));
  if (!file) throw new Error(`${FLAGSHIP_FILE} not found`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error("Flagship dataset must be an array");
  return raw;
}

export const eventSeedRouter = router({
  /**
   * Populate the flagship reference events (LEAP, DeepFest) with fully
   * researched content: prose, verified figures, audience chips,
   * highlights, tracks, indicative agenda, FAQs, ticket tiers, side
   * events, and speakers promoted into real People profiles.
   *
   * Idempotent: child rows are replaced for the events it owns, and
   * People are deduped by name. Editor-set images are never touched.
   */
  seedFlagshipEvents: protectedProcedure
    .input(z.object({ apply: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dataset = loadFlagship();
      const report: Array<Record<string, unknown>> = [];

      for (const ev of dataset) {
        const [row] = await (db as any).select({ id: events.id })
          .from(events).where(eq(events.slug, ev.slug)).limit(1);
        if (!row) {
          report.push({ slug: ev.slug, skipped: "event not found — run the Saudi 2026 seed first" });
          continue;
        }
        const eventId = Number(row.id);
        const counts: Record<string, number> = {
          speakers: 0, peopleCreated: 0, highlights: 0, tracks: 0,
          agenda: 0, faqs: 0, tickets: 0, sideEvents: 0,
          photosPreserved: 0,
        };

        if (!input.apply) {
          report.push({
            slug: ev.slug, eventId, wouldWrite: {
              speakers: ev.speakers?.length ?? 0,
              highlights: ev.highlights?.length ?? 0,
              tracks: ev.tracks?.length ?? 0,
              agenda: ev.agenda?.length ?? 0,
              faqs: ev.faqs?.length ?? 0,
              tickets: ev.ticketTypes?.length ?? 0,
              sideEvents: ev.sideEvents?.length ?? 0,
            },
          });
          continue;
        }

        // --- core copy + verified figures -----------------------------
        const whatToExpect = Array.isArray(ev.whatToExpect)
          ? ev.whatToExpect.map((w: any) => `${w.lead}: ${w.detail}`).join("\n")
          : null;
        // Only write what the dataset actually knows. Assigning `null` for
        // a field the dataset happens to omit would erase an editor's
        // work on every re-seed, which turns a refresh into a rollback.
        const core: Record<string, unknown> = { isFeatured: 1 };
        const setIf = (col: string, value: unknown) => {
          if (value !== undefined && value !== null && value !== "") core[col] = value;
        };
        setIf("tagline", ev.tagline);
        setIf("shortDescription", ev.shortDescription);
        setIf("description", ev.description);
        setIf("whatToExpect", whatToExpect);
        setIf("targetAudience", ev.whoShouldAttend);
        setIf("venueName", ev.venueName);
        setIf("venueAddress", ev.venueAddress);
        setIf("websiteUrl", ev.websiteUrl);
        setIf("registrationUrl", ev.registrationUrl);
        setIf("organizerName", ev.organizerName);
        setIf("organizerDescription", ev.organizerDescription);
        setIf("organizerWebsite", ev.organizerWebsite);
        setIf("expectedAttendees", ev.figures?.expectedAttendees);
        setIf("expectedStartups", ev.figures?.expectedStartups);
        setIf("expectedInvestors", ev.figures?.expectedInvestors);
        setIf("expectedCountries", ev.figures?.expectedCountries);
        await (db as any).update(events).set(core as any).where(eq(events.id, eventId));

        // --- speakers -> People profiles ------------------------------
        // Re-seeding replaces the rows, so anything an editor added by
        // hand afterwards — most importantly a real portrait — would be
        // destroyed by a blind delete-and-reinsert. Snapshot the images
        // first and carry them across by name, and only where the
        // dataset does not supply one itself.
        const priorSpeakerPhotos = new Map<string, string>();
        {
          const prior = await (db as any)
            .select({ name: eventSpeakers.name, photo: eventSpeakers.photo })
            .from(eventSpeakers)
            .where(eq(eventSpeakers.eventId, eventId));
          for (const p of prior as Array<{ name: string; photo: string | null }>) {
            if (p.photo && p.name) priorSpeakerPhotos.set(p.name.trim().toLowerCase(), p.photo);
          }
        }
        await (db as any).delete(eventSpeakers).where(eq(eventSpeakers.eventId, eventId));
        for (const [i, sp] of (ev.speakers ?? []).entries()) {
          const before = await (db as any).select({ id: people.id }).from(people)
            .where(sql`LOWER(${people.name}) = LOWER(${sp.name})`).limit(1);
          const personId = await ensurePerson(db, sp);
          if (!before[0] && personId) counts.peopleCreated++;
          const photo =
            sp.photo ?? priorSpeakerPhotos.get(String(sp.name).trim().toLowerCase()) ?? null;
          if (photo && !sp.photo) counts.photosPreserved++;
          await (db as any).insert(eventSpeakers).values({
            eventId, name: sp.name, title: sp.title ?? null,
            company: sp.company ?? null, bio: sp.bio ?? null,
            photo,
            linkedinUrl: sp.linkedinUrl ?? null, websiteUrl: sp.websiteUrl ?? null,
            personId, isFeatured: sp.isFeatured ? 1 : 0, sortOrder: i,
          } as any);
          counts.speakers++;
        }

        // --- highlights -----------------------------------------------
        await (db as any).delete(eventHighlights).where(eq(eventHighlights.eventId, eventId));
        for (const [i, h] of (ev.highlights ?? []).entries()) {
          await (db as any).insert(eventHighlights).values({
            eventId, title: h.title, description: h.description ?? null,
            icon: h.icon ?? null, sortOrder: i,
          } as any);
          counts.highlights++;
        }

        // --- tracks, then agenda referencing them ----------------------
        await (db as any).delete(eventTracks).where(eq(eventTracks.eventId, eventId));
        const trackIds = new Map<string, number>();
        for (const [i, t] of (ev.tracks ?? []).entries()) {
          const res: any = await (db as any).insert(eventTracks).values({
            eventId, name: t.name, description: t.description ?? null,
            color: t.color ?? "#22c55e", sortOrder: i,
          } as any);
          const id = Number(res?.[0]?.insertId ?? res?.insertId);
          if (id) trackIds.set(t.name, id);
          counts.tracks++;
        }

        await (db as any).delete(eventSchedule).where(eq(eventSchedule.eventId, eventId));
        const startDay = new Date(String(ev.startDate));
        for (const [i, a] of (ev.agenda ?? []).entries()) {
          const day = new Date(startDay);
          day.setDate(day.getDate() + Math.max(0, (a.dayNumber ?? 1) - 1));
          const iso = day.toISOString().slice(0, 10);
          await (db as any).insert(eventSchedule).values({
            eventId, title: a.title, description: a.description ?? null,
            startTime: `${iso} ${a.startTime ?? "10:00"}:00`,
            endTime: a.endTime ? `${iso} ${a.endTime}:00` : null,
            dayNumber: a.dayNumber ?? 1,
            sessionType: a.sessionType ?? "other",
            trackId: a.trackName ? trackIds.get(a.trackName) ?? null : null,
            speakerName: Array.isArray(a.speakerNames) && a.speakerNames.length
              ? a.speakerNames.join(", ") : null,
            sortOrder: i,
          } as any);
          counts.agenda++;
        }

        // --- FAQs -------------------------------------------------------
        await (db as any).delete(eventFaqs).where(eq(eventFaqs.eventId, eventId));
        for (const [i, f] of (ev.faqs ?? []).entries()) {
          await (db as any).insert(eventFaqs).values({
            eventId, question: f.question, answer: f.answer, sortOrder: i,
          } as any);
          counts.faqs++;
        }

        // --- ticket tiers (no invented prices) -------------------------
        await (db as any).delete(eventTickets).where(eq(eventTickets.eventId, eventId));
        for (const [i, t] of (ev.ticketTypes ?? []).entries()) {
          const desc = [t.description, Array.isArray(t.includes) && t.includes.length
            ? `Includes: ${t.includes.join(", ")}` : null, t.priceNote]
            .filter(Boolean).join(" — ");
          await (db as any).insert(eventTickets).values({
            eventId, name: t.name, description: desc || null,
            priceCents: 0, currency: "SAR", isActive: 1, sortOrder: i,
          } as any);
          counts.tickets++;
        }

        // --- side events ------------------------------------------------
        // Community-submitted side events are NOT part of the dataset and
        // must survive a re-seed: only the rows this seed owns (by name)
        // are replaced. Editor-added imagery is carried across the same
        // way speaker portraits are.
        const seededNames = new Set(
          (ev.sideEvents ?? []).map((se: any) => String(se.name).trim().toLowerCase()),
        );
        const priorSideImages = new Map<string, string>();
        {
          const prior = await (db as any)
            .select({
              id: eventSideEvents.id,
              name: eventSideEvents.name,
              imageUrl: eventSideEvents.imageUrl,
            })
            .from(eventSideEvents)
            .where(eq(eventSideEvents.eventId, eventId));
          for (const p of prior as Array<{ id: number; name: string; imageUrl: string | null }>) {
            const key = String(p.name || "").trim().toLowerCase();
            if (p.imageUrl) priorSideImages.set(key, p.imageUrl);
            if (seededNames.has(key)) {
              await (db as any).delete(eventSideEvents).where(eq(eventSideEvents.id, p.id));
            }
          }
        }
        for (const [i, se] of (ev.sideEvents ?? []).entries()) {
          const key = String(se.name).trim().toLowerCase();
          await (db as any).insert(eventSideEvents).values({
            eventId, name: se.name, description: se.description ?? null,
            imageUrl: se.imageUrl ?? priorSideImages.get(key) ?? null,
            registrationUrl: se.registrationUrl ?? null,
            venue: se.venue ?? null,
            sideEventType: se.sideEventType ?? "side_event",
            status: "approved", sortOrder: i,
          } as any);
          counts.sideEvents++;
        }

        report.push({ slug: ev.slug, eventId, ...counts });
      }

      return { applied: input.apply, events: report };
    }),

  /**
   * Ensure EVERY event speaker resolves to a People profile.
   *
   * Speakers added before person-linking existed (or imported from
   * elsewhere) carry free text only, so their names aren't clickable and
   * the person has no profile page. This creates the missing profiles
   * from whatever the speaker row already holds, dedupes by name so a
   * speaker appearing at several events shares one profile, and links
   * the rows. Idempotent — already-linked speakers are untouched.
   */
  backfillSpeakerPeople: protectedProcedure
    .input(z.object({
      apply: z.boolean().default(false),
      eventId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await (db as any).select({
        id: eventSpeakers.id,
        eventId: eventSpeakers.eventId,
        name: eventSpeakers.name,
        title: eventSpeakers.title,
        company: eventSpeakers.company,
        bio: eventSpeakers.bio,
        photo: eventSpeakers.photo,
        linkedinUrl: eventSpeakers.linkedinUrl,
        websiteUrl: eventSpeakers.websiteUrl,
        personId: eventSpeakers.personId,
      }).from(eventSpeakers).where(
        input.eventId
          ? sql`${eventSpeakers.personId} IS NULL AND ${eventSpeakers.eventId} = ${input.eventId}`
          : sql`${eventSpeakers.personId} IS NULL`,
      );

      if (!input.apply) {
        return {
          applied: false,
          unlinkedSpeakers: rows.length,
          distinctPeople: new Set(rows.map((r: any) => String(r.name).trim().toLowerCase())).size,
          linked: 0, created: 0, failures: [],
        };
      }

      let linked = 0;
      let created = 0;
      const failures: Array<{ name: string; reason: string }> = [];

      for (const sp of rows) {
        try {
          const name = String(sp.name || "").trim();
          if (!name) {
            failures.push({ name: "(blank)", reason: "speaker has no name" });
            continue;
          }
          const before = await (db as any).select({ id: people.id }).from(people)
            .where(sql`LOWER(${people.name}) = LOWER(${name})`).limit(1);
          const personId = await ensurePerson(db, sp);
          if (!personId) {
            failures.push({ name, reason: "could not create profile" });
            continue;
          }
          if (!before[0]) created++;

          // Backfill any detail the profile is missing from the speaker
          // row — never overwrite what the profile already holds.
          const [person] = await (db as any).select().from(people)
            .where(eq(people.id, personId)).limit(1);
          if (person) {
            const blank = (v: unknown) => v === null || v === undefined || v === "";
            const patch: Record<string, unknown> = {};
            if (blank(person.title) && sp.title) patch.title = sp.title;
            if (blank(person.company) && sp.company) patch.company = sp.company;
            if (blank(person.bio) && sp.bio) patch.bio = sp.bio;
            if (blank(person.avatar) && sp.photo) patch.avatar = sp.photo;
            if (blank(person.linkedIn) && sp.linkedinUrl) patch.linkedIn = sp.linkedinUrl;
            if (blank(person.website) && sp.websiteUrl) patch.website = sp.websiteUrl;
            if (Object.keys(patch).length) {
              await (db as any).update(people).set(patch as any).where(eq(people.id, personId));
            }
          }

          await (db as any).update(eventSpeakers)
            .set({ personId } as any).where(eq(eventSpeakers.id, sp.id));
          linked++;
        } catch (err) {
          failures.push({ name: String(sp.name), reason: (err as Error).message.slice(0, 120) });
        }
      }

      return { applied: true, unlinkedSpeakers: rows.length, linked, created, failures: failures.slice(0, 25) };
    }),

  /**
   * Report what a run would do without touching anything.
   */
  preview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new Error("Admin access required");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const dataset = loadDataset();
    const existing = await db
      .select({ id: events.id, slug: events.slug, title: events.title })
      .from(events);
    const bySlug = new Map(existing.map(e => [e.slug, e]));
    const byTitle = new Map(existing.map(e => [normaliseTitle(e.title), e]));

    let toInsert = 0;
    let toEnrich = 0;
    for (const ev of dataset) {
      const matched =
        bySlug.has(ev.slug) ||
        byTitle.has(normaliseTitle(ev.title)) ||
        existing.some(e => titlesLikelySame(e.title, ev.title, ev.slug));
      if (matched) toEnrich++;
      else toInsert++;
    }
    return {
      datasetCount: dataset.length,
      existingEventCount: existing.length,
      wouldInsert: toInsert,
      wouldEnrich: toEnrich,
    };
  }),

  /**
   * Insert missing events and fill blank fields on existing ones.
   * Pass apply:false (default) for a dry run.
   */
  run: protectedProcedure
    .input(z.object({
      apply: z.boolean().default(false),
      limit: z.number().min(1).max(500).default(200),
      publish: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dataset = loadDataset().slice(0, input.limit);

      const publishedStatus = input.publish
        ? await workflowService.getStatusBySlug("editorial", "published")
        : null;
      if (input.publish && !publishedStatus) {
        throw new Error("Editorial 'published' status missing — cannot publish seeded events");
      }

      const existing = await db
        .select()
        .from(events);
      const bySlug = new Map(existing.map((e: any) => [e.slug, e]));
      const byTitle = new Map(existing.map((e: any) => [normaliseTitle(e.title), e]));

      let repairedImages = 0;
      if (input.apply) {
        const res: any = await (db as any).execute(sql`
          UPDATE events SET featuredImage = NULL
          WHERE featuredImage LIKE '%source.unsplash.com%'`);
        repairedImages = Number(res?.affectedRows ?? res?.[0]?.affectedRows ?? 0);
        if (repairedImages) {
          console.log(`[EventSeed] cleared ${repairedImages} dead Unsplash image URLs`);
        }
      }

      const inserted: string[] = [];
      const enriched: Array<{ slug: string; fields: string[] }> = [];
      const skipped: string[] = [];
      const errors: Array<{ slug: string; error: string }> = [];

      for (const ev of dataset) {
        try {
          const match =
            bySlug.get(ev.slug) ??
            byTitle.get(normaliseTitle(ev.title)) ??
            existing.find((e: any) => titlesLikelySame(e.title, ev.title, ev.slug));

          if (!match) {
            if (input.apply) {
              await (db as any).insert(events).values({
                title: ev.title,
                slug: ev.slug,
                tagline: ev.tagline ?? null,
                shortDescription: ev.shortDescription ?? null,
                description: ev.description ?? null,
                whatToExpect: ev.whatToExpect ?? null,
                type: ev.type,
                format: ev.format,
                featuredImage: imageUrlFor(ev),
                startDate: toMySqlDateTime(ev.startDate),
                endDate: toMySqlDateTime(ev.endDate, true),
                timezone: "Asia/Riyadh",
                city: ev.city ?? null,
                country: ev.country ?? "Saudi Arabia",
                venue: ev.venueName ?? null,
                venueName: ev.venueName ?? null,
                venueAddress: ev.venueAddress ?? null,
                websiteUrl: ev.websiteUrl ?? null,
                registrationUrl: ev.registrationUrl ?? null,
                organizerName: ev.organizerName ?? null,
                organizerWebsite: ev.organizerWebsite ?? null,
                isFree: ev.isFree ? 1 : 0,
                expectedAttendees: ev.expectedAttendees ?? null,
                expectedStartups: ev.expectedStartups ?? null,
                expectedInvestors: ev.expectedInvestors ?? null,
                expectedCountries: ev.expectedCountries ?? null,
                isFeatured: ev.isFeatured ? 1 : 0,
                statusId: publishedStatus?.id ?? null,
                publishedAt: input.publish ? sql`NOW()` : null,
                createdByUserId: ctx.user.id,
              } as any);
            }
            inserted.push(ev.slug);
            continue;
          }

          // ---- enrichment: only fill genuinely empty fields ----
          const set: Record<string, unknown> = {};
          const filled: string[] = [];
          const maybe = (col: string, value: unknown) => {
            if (value === null || value === undefined || value === "") return;
            if (!isEmpty((match as any)[col])) return;
            set[col] = value;
            filled.push(col);
          };

          maybe("tagline", ev.tagline);
          maybe("shortDescription", ev.shortDescription);
          maybe("description", ev.description);
          maybe("whatToExpect", ev.whatToExpect);
          maybe("featuredImage", imageUrlFor(ev));
          maybe("venueName", ev.venueName);
          maybe("venue", ev.venueName);
          maybe("venueAddress", ev.venueAddress);
          maybe("city", ev.city);
          maybe("country", ev.country ?? "Saudi Arabia");
          maybe("websiteUrl", ev.websiteUrl);
          maybe("registrationUrl", ev.registrationUrl);
          maybe("organizerName", ev.organizerName);
          maybe("organizerWebsite", ev.organizerWebsite);
          maybe("expectedAttendees", ev.expectedAttendees);
          maybe("expectedStartups", ev.expectedStartups);
          maybe("expectedInvestors", ev.expectedInvestors);
          maybe("expectedCountries", ev.expectedCountries);
          maybe("timezone", "Asia/Riyadh");

          if (!Object.keys(set).length) {
            skipped.push(ev.slug);
            continue;
          }
          if (input.apply) {
            await (db as any).update(events).set(set as any).where(eq(events.id, (match as any).id));
          }
          enriched.push({ slug: ev.slug, fields: filled });
        } catch (err) {
          errors.push({ slug: ev.slug, error: (err as Error).message.slice(0, 200) });
        }
      }

      // Repair pass: earlier seeds wrote source.unsplash.com URLs, an
      // endpoint Unsplash has since retired. Clear them so the designed
      // fallback renders instead of a broken image. Only touches those
      // dead URLs — editor-attached images are never modified.
      // Sector assignment. The sectors table drives the admin filter and
      // the public badges but nothing populated it for events, so every
      // row read "—". Assign on every run: idempotent, and events that
      // already have sectors are left alone so editor choices survive.
      let sectorsAssigned = 0;
      if (input.apply) {
        const sectorIds = await ensureSectors(db);
        const allEvents = await (db as any).select({
          id: events.id, title: events.title, tagline: events.tagline,
          shortDescription: events.shortDescription, type: events.type,
        }).from(events);
        const alreadyTagged = new Set<number>(
          (await (db as any).select({ eventId: eventSectors.eventId }).from(eventSectors))
            .map((r: any) => r.eventId),
        );
        for (const ev of allEvents) {
          if (alreadyTagged.has(ev.id)) continue;
          const slugs = inferSectors(
            [ev.title, ev.tagline, ev.shortDescription, ev.type].filter(Boolean).join(" "),
          );
          for (const slug of slugs) {
            const sid = sectorIds.get(slug);
            if (!sid) continue;
            try {
              await (db as any).insert(eventSectors).values({ eventId: ev.id, sectorId: sid } as any);
              sectorsAssigned++;
            } catch { /* duplicate pair — ignore */ }
          }
        }
      }

      return {
        applied: input.apply,
        datasetCount: dataset.length,
        insertedCount: inserted.length,
        enrichedCount: enriched.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        repairedImages,
        sectorsAssigned,
        inserted: inserted.slice(0, 100),
        enriched: enriched.slice(0, 100),
        errors: errors.slice(0, 20),
      };
    }),

  /**
   * How much of the events index is still missing photography.
   * Read-only; safe to poll from the admin screen.
   */
  previewImageSourcing: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new Error("Admin access required");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rows = await (db as any)
      .select({ id: events.id, featuredImage: events.featuredImage })
      .from(events);

    let eventsWithImage = 0;
    let eventsWithoutImage = 0;
    for (const row of rows as Array<{ featuredImage: string | null }>) {
      if (hasImage(row.featuredImage)) eventsWithImage++;
      else eventsWithoutImage++;
    }
    return { eventsWithoutImage, eventsWithImage };
  }),

  /**
   * Source real photography from Wikimedia Commons for events that have
   * none, and store the attribution alongside it.
   *
   * Safety rules:
   *   - onlyMissing:true (the default) never touches an event that
   *     already has an image, so an editor's hand-picked photo is
   *     safe. Overwriting requires an explicit onlyMissing:false.
   *   - Events without an image are processed FIRST regardless, so a
   *     capped run always spends its budget where it matters.
   *   - Hard-capped at 100 events AND a wall-clock budget: Commons is
   *     rate-limited to sequential requests, so one call must not be
   *     able to run for minutes. Re-run to continue.
   *   - Failures are per-event and non-fatal. If Commons is
   *     unreachable, every event simply lands in `failures` with a
   *     reason and nothing is written.
   *
   * Counters: `attempted` = events we actually searched for,
   * `updated` = rows written, `skipped` = candidates deliberately not
   * searched (already had an image, nothing to search on, or the time
   * budget ran out). `failures` is a diagnostic list covering both
   * attempted-but-unresolved and unsearchable events.
   */
  sourceEventImages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(25),
      onlyMissing: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const all = await (db as any)
        .select({
          id: events.id,
          slug: events.slug,
          title: events.title,
          city: events.city,
          country: events.country,
          venue: events.venue,
          venueName: events.venueName,
          type: events.type,
          format: events.format,
          featuredImage: events.featuredImage,
        })
        .from(events);

      const rows = all as Array<{
        id: number;
        slug: string;
        title: string;
        city: string | null;
        country: string | null;
        venue: string | null;
        venueName: string | null;
        type: string | null;
        format: string | null;
        featuredImage: string | null;
      }>;

      // Missing images first, then (only when onlyMissing:false) the rest.
      const missing = rows.filter(r => !hasImage(r.featuredImage));
      const present = input.onlyMissing ? [] : rows.filter(r => hasImage(r.featuredImage));
      const queue = [...missing, ...present].slice(0, input.limit);

      let attempted = 0;
      let updated = 0;
      let skipped = 0;
      const failures: Array<{ slug: string; reason: string }> = [];

      const startedAt = Date.now();

      for (const ev of queue) {
        if (Date.now() - startedAt > IMAGE_SOURCING_BUDGET_MS) {
          skipped++;
          continue;
        }

        // Belt and braces: an editor image is never overwritten unless
        // onlyMissing:false was explicitly passed.
        if (input.onlyMissing && hasImage(ev.featuredImage)) {
          skipped++;
          continue;
        }

        // Commons is searched by place; with neither a venue nor a city
        // there is nothing meaningful to ask for.
        if (!ev.venueName && !ev.venue && !ev.city) {
          skipped++;
          failures.push({ slug: ev.slug, reason: "no venue or city to search on" });
          continue;
        }

        attempted++;
        try {
          const image = await resolveEventImage(ev);
          if (!image) {
            failures.push({ slug: ev.slug, reason: "no suitable Commons photo found" });
            continue;
          }
          await (db as any)
            .update(events)
            .set({
              featuredImage: image.url,
              featuredImageCredit: image.credit,
              featuredImageSource: image.sourcePage,
              featuredImageLicense: image.license,
            } as any)
            .where(eq(events.id, ev.id));
          updated++;
        } catch (err) {
          failures.push({
            slug: ev.slug,
            reason: (err as Error)?.message?.slice(0, 200) ?? "unknown error",
          });
        }
      }

      return {
        attempted,
        updated,
        skipped,
        failures: failures.slice(0, 100),
      };
    }),
});
