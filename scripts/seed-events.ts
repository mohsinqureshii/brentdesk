/**
 * Trade-show profiles for the entity graph behind the editorial archive.
 *
 * The archive names exhibitions constantly — Big 5 Construct Saudi alone is
 * referenced in more than sixty articles — and an exhibition is not a
 * company. Without a profile those mentions link to nothing.
 *
 * Same restraint as the company seed: identity facts only. Dates, venue,
 * organiser and scope, each corroborated in the research core behind the
 * commission. No attendance claims beyond what the organiser stated.
 *
 * Idempotent on slug.
 */

import { type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { events } from "../drizzle/schema";
import { toDbDate } from "../server/_core/dbValues";

export type EventDb = MySql2Database<Record<string, never>>;

interface Show {
  title: string; slug: string; start: string; end: string;
  venueName: string; city: string; country: string;
  websiteUrl: string | null; organizerName: string | null;
  shortDescription: string; description: string;
}

const SHOWS: Show[] = [
  {
    title: "Big 5 Construct Saudi 2026", slug: "big-5-construct-saudi-2026",
    start: "2026-08-30", end: "2026-09-02",
    venueName: "Riyadh Front Exhibition & Conference Center", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.big5constructsaudi.com/", organizerName: "dmg events",
    shortDescription: "Saudi Arabia's construction exhibition, held in Riyadh under the patronage of the Ministry of Industry and Mineral Resources.",
    description: "The 2026 edition of Big 5 Construct Saudi ran from 30 August to 2 September at the Riyadh Front Exhibition & Conference Center under the patronage of the Ministry of Industry and Mineral Resources, under the theme \"From foundation to future, built for every scale\". The organiser reported more than 1,000 exhibitors from over 50 countries. Four sector events were co-located with it: Heavy Saudi Arabia, Totally Concrete Saudi Arabia, HVACR Saudi Arabia and Saudi FM & Clean.",
  },
  {
    title: "HVACR Saudi Arabia 2026", slug: "hvacr-saudi-arabia-2026",
    start: "2026-08-30", end: "2026-09-02",
    venueName: "Riyadh Front Exhibition & Conference Center", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.big5constructsaudi.com/", organizerName: "dmg events",
    shortDescription: "The heating, ventilation, air conditioning and refrigeration event co-located with Big 5 Construct Saudi.",
    description: "HVACR Saudi Arabia covers cooling, ventilation and refrigeration equipment for the Saudi market, from chillers and air handling to controls, insulation and pipe support. It ran alongside Big 5 Construct Saudi at the Riyadh Front Exhibition & Conference Center from 30 August to 2 September 2026.",
  },
  {
    title: "Heavy Saudi Arabia 2026", slug: "heavy-saudi-arabia-2026",
    start: "2026-08-30", end: "2026-09-02",
    venueName: "Riyadh Front Exhibition & Conference Center", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.big5constructsaudi.com/", organizerName: "dmg events",
    shortDescription: "The heavy machinery and construction equipment event co-located with Big 5 Construct Saudi.",
    description: "Heavy Saudi Arabia covers earthmoving, lifting, material handling and site machinery for the Saudi construction market. It ran alongside Big 5 Construct Saudi at the Riyadh Front Exhibition & Conference Center from 30 August to 2 September 2026.",
  },
  {
    title: "Totally Concrete Saudi Arabia 2026", slug: "totally-concrete-saudi-arabia-2026",
    start: "2026-08-30", end: "2026-09-02",
    venueName: "Riyadh Front Exhibition & Conference Center", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.big5constructsaudi.com/", organizerName: "dmg events",
    shortDescription: "The concrete, cement and construction materials event co-located with Big 5 Construct Saudi.",
    description: "Totally Concrete Saudi Arabia covers cement and concrete production, admixtures, precast systems, reinforcement and testing. It ran alongside Big 5 Construct Saudi at the Riyadh Front Exhibition & Conference Center from 30 August to 2 September 2026.",
  },
  {
    title: "Saudi FM & Clean 2026", slug: "saudi-fm-and-clean-2026",
    start: "2026-08-30", end: "2026-09-02",
    venueName: "Riyadh Front Exhibition & Conference Center", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.big5constructsaudi.com/", organizerName: "dmg events",
    shortDescription: "The facilities management and cleaning event co-located with Big 5 Construct Saudi.",
    description: "Saudi FM & Clean covers facilities management, maintenance, cleaning and building operations — the part of an asset's life that begins at handover. It ran alongside Big 5 Construct Saudi at the Riyadh Front Exhibition & Conference Center from 30 August to 2 September 2026.",
  },
  {
    title: "Saudi WoodShow 2026", slug: "saudi-woodshow-2026",
    start: "2026-09-01", end: "2026-09-03",
    venueName: "Riyadh Exhibition & Convention Center, Malham", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://www.saudiwoodshow.com/", organizerName: null,
    shortDescription: "Saudi Arabia's timber, wood products and woodworking machinery exhibition.",
    description: "Saudi WoodShow covers timber, wood-based panels, furniture components and woodworking machinery for the Saudi market. The 2026 edition ran in Riyadh from 1 to 3 September, overlapping the closing days of Big 5 Construct Saudi.",
  },
  {
    title: "LEAP 2026", slug: "leap-2026",
    start: "2026-08-31", end: "2026-09-03",
    venueName: "Riyadh Exhibition & Convention Center, Malham", city: "Riyadh", country: "Saudi Arabia",
    websiteUrl: "https://onegiantleap.com/", organizerName: "Tahaluf",
    shortDescription: "Saudi Arabia's technology exhibition, covering artificial intelligence, cloud, data infrastructure and startups.",
    description: "LEAP is the Kingdom's flagship technology exhibition, covering artificial intelligence, cloud and data infrastructure, semiconductors, connectivity and startup investment. Its 2026 edition ran at the Riyadh Exhibition & Convention Center in Malham from 31 August to 3 September, overlapping Big 5 Construct Saudi across the city.",
  },
];

/** Insert or refresh the trade-show profiles. Idempotent on slug. */
export async function seedEvents(db: EventDb, statusId: number): Promise<void> {
  let added = 0, updated = 0;
  for (const s of SHOWS) {
    const values = {
      title: s.title, slug: s.slug, type: "conference" as const, format: "in_person" as const,
      startDate: toDbDate(`${s.start}T00:00:00Z`), endDate: toDbDate(`${s.end}T23:59:59Z`),
      timezone: "Asia/Riyadh",
      venue: s.venueName, venueName: s.venueName, city: s.city, country: s.country,
      websiteUrl: s.websiteUrl, organizerName: s.organizerName,
      shortDescription: s.shortDescription, description: s.description,
      statusId, publishedAt: toDbDate(new Date()),
    };

    const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, s.slug)).limit(1);
    if (existing) { await db.update(events).set(values as any).where(eq(events.id, existing.id)); updated++; }
    else { await db.insert(events).values(values as any); added++; }
  }
  console.log(`[seed] events: ${added} added, ${updated} updated`);
}
