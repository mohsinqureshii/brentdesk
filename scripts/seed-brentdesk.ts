/**
 * BrentDesk bootstrap seed — system data only.
 *
 * Idempotent: safe to run repeatedly; every insert is keyed on a unique
 * column and skipped when the row already exists. This script seeds the
 * data the platform needs to boot and be operated:
 *
 *   - countries (GCC + MENA + major trading partners)
 *   - editions (dormant except International; enable per-country later)
 *   - editorial categories (BrentDesk industrial taxonomy)
 *   - sectors (industry sectors for the entity graph)
 *   - roles (RBAC role catalog)
 *   - ad slots (placements used by the public pages)
 *   - homepage sections (CMS-driven homepage)
 *   - optional admin user (only when ADMIN_EMAIL + ADMIN_PASSWORD are set)
 *
 * It seeds NO editorial content: no articles, companies, people, events,
 * jobs or subscribers. Editorial workflow statuses are seeded by the
 * server itself at boot (workflowService.initializeWorkflows).
 *
 * Two entry points share this logic:
 *   - the CLI wrapper (scripts/seed.ts -> dist/seed.js), run by hand;
 *   - the server at boot when SEED_ON_BOOT=1, so a fresh deploy on a
 *     managed platform can bootstrap itself without a container shell.
 *
 * Importing this module has no side effects: runSeed() owns its own
 * connection pool and closes it, and never calls process.exit().
 *
 * Run: pnpm seed
 */

import bcrypt from "bcryptjs";
import { seedCompanies } from "./seed-companies";
import { seedEvents } from "./seed-events";
import { seedLocales } from "./seed-locales";
import { publication } from "../shared/publication";
import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import {
  countries,
  editions,
  categories,
  sectors,
  roles,
  adSlots,
  adCampaigns,
  adCreatives,
  homepageSections,
  users,
} from "../drizzle/schema";

type SeedDb = MySql2Database<Record<string, never>>;

// ------------------------------------------------------------------
// Countries
// ------------------------------------------------------------------
const COUNTRIES: Array<[string, string, string, string?]> = [
  // name, iso2, iso3, currency
  ["Saudi Arabia", "SA", "SAU", "SAR"],
  ["United Arab Emirates", "AE", "ARE", "AED"],
  ["Qatar", "QA", "QAT", "QAR"],
  ["Kuwait", "KW", "KWT", "KWD"],
  ["Bahrain", "BH", "BHR", "BHD"],
  ["Oman", "OM", "OMN", "OMR"],
  ["Egypt", "EG", "EGY", "EGP"],
  ["Jordan", "JO", "JOR", "JOD"],
  ["Iraq", "IQ", "IRQ", "IQD"],
  ["Morocco", "MA", "MAR", "MAD"],
  ["Algeria", "DZ", "DZA", "DZD"],
  ["Tunisia", "TN", "TUN", "TND"],
  ["Libya", "LY", "LBY", "LYD"],
  ["Lebanon", "LB", "LBN", "LBP"],
  ["Turkey", "TR", "TUR", "TRY"],
  ["United States", "US", "USA", "USD"],
  ["United Kingdom", "GB", "GBR", "GBP"],
  ["Germany", "DE", "DEU", "EUR"],
  ["France", "FR", "FRA", "EUR"],
  ["China", "CN", "CHN", "CNY"],
  ["India", "IN", "IND", "INR"],
  ["Japan", "JP", "JPN", "JPY"],
  ["South Korea", "KR", "KOR", "KRW"],
];

async function seedCountries(db: SeedDb) {
  let added = 0;
  for (const [name, iso2, iso3, currency] of COUNTRIES) {
    const existing = await db.select({ id: countries.id }).from(countries).where(eq(countries.iso2, iso2)).limit(1);
    if (existing.length) continue;
    await db.insert(countries).values({ name, iso2, iso3, currency: currency ?? null, isActive: 1 });
    added++;
  }
  console.log(`[seed] countries: ${added} added`);
}

// ------------------------------------------------------------------
// Editions — dormant at launch (only International active)
// ------------------------------------------------------------------
const EDITIONS: Array<{ name: string; slug: string; iso2: string | null; flag: string; intl?: boolean; active?: boolean }> = [
  { name: "International", slug: "intl", iso2: null, flag: "🌍", intl: true, active: true },
  { name: "Saudi Arabia", slug: "sa", iso2: "SA", flag: "🇸🇦", active: false },
  { name: "United Arab Emirates", slug: "ae", iso2: "AE", flag: "🇦🇪", active: false },
  { name: "Qatar", slug: "qa", iso2: "QA", flag: "🇶🇦", active: false },
  { name: "Kuwait", slug: "kw", iso2: "KW", flag: "🇰🇼", active: false },
  { name: "Bahrain", slug: "bh", iso2: "BH", flag: "🇧🇭", active: false },
  { name: "Oman", slug: "om", iso2: "OM", flag: "🇴🇲", active: false },
];

async function seedEditions(db: SeedDb) {
  let added = 0;
  for (const [i, e] of EDITIONS.entries()) {
    const existing = await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, e.slug)).limit(1);
    if (existing.length) continue;
    let countryId: number | null = null;
    if (e.iso2) {
      const [c] = await db.select({ id: countries.id }).from(countries).where(eq(countries.iso2, e.iso2)).limit(1);
      countryId = c?.id ?? null;
    }
    await db.insert(editions).values({
      countryId,
      name: e.name,
      slug: e.slug,
      flagEmoji: e.flag,
      isInternational: e.intl ? 1 : 0,
      isActive: e.active ? 1 : 0,
      sortOrder: i,
    });
    added++;
  }
  console.log(`[seed] editions: ${added} added`);
}

// ------------------------------------------------------------------
// Editorial categories — BrentDesk industrial taxonomy
// ------------------------------------------------------------------
const NEWS_CATEGORIES: Array<{ name: string; slug: string; description: string; children?: Array<{ name: string; slug: string }> }> = [
  {
    name: "Construction", slug: "construction",
    description: "Contract awards, project milestones, contractors and building technology.",
    children: [
      { name: "EPC", slug: "epc" },
      { name: "Engineering", slug: "engineering" },
    ],
  },
  {
    name: "Infrastructure", slug: "infrastructure",
    description: "Infrastructure programs, transport networks, water and public works.",
    children: [
      { name: "Roads", slug: "roads" },
      { name: "Water", slug: "water" },
      { name: "Telecom Infrastructure", slug: "telecom-infrastructure" },
    ],
  },
  {
    name: "Energy", slug: "energy",
    description: "Oil & gas, power, renewables and the wider energy complex.",
    children: [
      { name: "Oil & Gas", slug: "oil-gas" },
      { name: "Renewables", slug: "renewables" },
      { name: "Power", slug: "power" },
    ],
  },
  {
    name: "Manufacturing", slug: "manufacturing",
    description: "Factories, industrial facilities, localization and industrial investment.",
    children: [
      { name: "Heavy Equipment", slug: "heavy-equipment" },
      { name: "Machinery", slug: "machinery" },
      { name: "Chemicals", slug: "chemicals" },
    ],
  },
  {
    name: "Logistics", slug: "logistics",
    description: "Ports, warehousing, freight and supply chain networks.",
    children: [
      { name: "Ports", slug: "ports" },
      { name: "Warehousing", slug: "warehousing" },
      { name: "Supply Chain", slug: "supply-chain" },
    ],
  },
  {
    name: "Real Estate", slug: "real-estate",
    description: "Major development — giga-projects, master plans, commercial and industrial property.",
    children: [
      { name: "Facilities Management", slug: "facilities-management" },
    ],
  },
  {
    name: "Transportation", slug: "transportation",
    description: "Aviation, rail, roads and mobility infrastructure.",
    children: [
      { name: "Aviation", slug: "aviation" },
      { name: "Rail", slug: "rail" },
    ],
  },
  {
    name: "Mining", slug: "mining",
    description: "Mining, metals and minerals across the region.",
    children: [
      { name: "Metals", slug: "metals" },
    ],
  },
  {
    name: "Utilities", slug: "utilities",
    description: "Power, water and waste — utility projects, operators and regulation.",
  },
  {
    name: "Industrial Technology", slug: "industrial-technology",
    description: "Automation, robotics, industrial AI and data centers.",
    children: [
      { name: "Automation", slug: "automation" },
      { name: "Robotics", slug: "robotics" },
      { name: "Data Centers", slug: "data-centers" },
      { name: "Industrial AI", slug: "industrial-ai" },
    ],
  },
];

const JOBS_CATEGORIES = [
  { name: "Engineering", slug: "jobs-engineering" },
  { name: "Construction & Site", slug: "jobs-construction" },
  { name: "Operations & Maintenance", slug: "jobs-operations" },
  { name: "Energy", slug: "jobs-energy" },
  { name: "Logistics & Supply Chain", slug: "jobs-logistics" },
  { name: "Project Management", slug: "jobs-project-management" },
  { name: "HSE", slug: "jobs-hse" },
  { name: "Corporate", slug: "jobs-corporate" },
];

const EVENTS_CATEGORIES = [
  { name: "Conference", slug: "events-conference" },
  { name: "Exhibition & Expo", slug: "events-expo" },
  { name: "Forum & Summit", slug: "events-forum" },
  { name: "Webinar", slug: "events-webinar" },
];

async function seedCategories(db: SeedDb) {
  let added = 0;
  const upsert = async (row: { name: string; slug: string; module: "news" | "jobs" | "events"; description?: string; parentId?: number | null; sortOrder?: number }) => {
    const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, row.slug)).limit(1);
    if (existing.length) return existing[0].id;
    await db.insert(categories).values({
      name: row.name,
      slug: row.slug,
      module: row.module,
      description: row.description ?? null,
      parentId: row.parentId ?? null,
      sortOrder: row.sortOrder ?? 0,
      isActive: 1,
    });
    added++;
    const [created] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, row.slug)).limit(1);
    return created.id;
  };

  for (const [i, cat] of NEWS_CATEGORIES.entries()) {
    const parentId = await upsert({ name: cat.name, slug: cat.slug, module: "news", description: cat.description, sortOrder: i });
    for (const [j, child] of (cat.children ?? []).entries()) {
      await upsert({ name: child.name, slug: child.slug, module: "news", parentId, sortOrder: j });
    }
  }
  for (const [i, cat] of JOBS_CATEGORIES.entries()) await upsert({ ...cat, module: "jobs", sortOrder: i });
  for (const [i, cat] of EVENTS_CATEGORIES.entries()) await upsert({ ...cat, module: "events", sortOrder: i });
  console.log(`[seed] categories: ${added} added`);
}

// ------------------------------------------------------------------
// Sectors — entity-graph industry sectors
// ------------------------------------------------------------------
const SECTORS = [
  "Construction", "Infrastructure", "Energy", "Oil & Gas", "Utilities",
  "Manufacturing", "Industrial Technology", "Logistics", "Supply Chain",
  "Transportation", "Aviation", "Ports", "Rail", "Mining", "Metals",
  "Chemicals", "Real Estate Development", "Facilities Management",
  "Data Centers", "Telecom Infrastructure", "Smart Cities", "Industrial AI",
  "Robotics", "Automation", "Heavy Equipment", "Machinery", "Engineering",
  "EPC", "Maintenance", "Asset Management",
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function seedSectors(db: SeedDb) {
  let added = 0;
  for (const name of SECTORS) {
    const slug = slugify(name);
    const existing = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.slug, slug)).limit(1);
    if (existing.length) continue;
    await db.insert(sectors).values({ name, slug, isActive: 1 });
    added++;
  }
  console.log(`[seed] sectors: ${added} added`);
}

// ------------------------------------------------------------------
// Roles
// ------------------------------------------------------------------
const ROLES = [
  { name: "admin", displayName: "Administrator", description: "Full platform access" },
  { name: "senior_editor", displayName: "Senior Editor", description: "Final editorial approval and publishing" },
  { name: "editor", displayName: "Editor", description: "Editorial review and content management" },
  { name: "author", displayName: "Author", description: "Writes and submits content" },
  { name: "moderator", displayName: "Moderator", description: "Moderates claims, submissions and user content" },
  { name: "user", displayName: "User", description: "Registered reader" },
];

async function seedRoles(db: SeedDb) {
  let added = 0;
  for (const role of ROLES) {
    const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, role.name)).limit(1);
    if (existing.length) continue;
    await db.insert(roles).values({ ...role, roleType: "system", isActive: 1 });
    added++;
  }
  console.log(`[seed] roles: ${added} added`);
}

// ------------------------------------------------------------------
// Ad slots — placements used by the public templates
// ------------------------------------------------------------------
const AD_SLOTS: Array<{ key: string; name: string; page: string; position: string; dimensions: string }> = [
  { key: "home-leaderboard", name: "Homepage Leaderboard", page: "home", position: "top", dimensions: "970x250" },
  { key: "home-banner-mid", name: "Homepage Mid Banner", page: "home", position: "mid", dimensions: "970x90" },
  { key: "home-brand-band", name: "Homepage Brand Band", page: "home", position: "bottom", dimensions: "970x250" },
  { key: "home-sidebar-top", name: "Homepage Rail Top", page: "home", position: "sidebar-top", dimensions: "300x250" },
  { key: "home-sidebar-mid", name: "Homepage Rail Middle", page: "home", position: "sidebar-mid", dimensions: "300x600" },
  { key: "home-sidebar-bottom", name: "Homepage Rail Bottom", page: "home", position: "sidebar-bottom", dimensions: "300x250" },
  { key: "home-in-feed-1", name: "Homepage In-feed 1", page: "home", position: "in-feed", dimensions: "728x90" },
  { key: "home-in-feed-2", name: "Homepage In-feed 2", page: "home", position: "in-feed", dimensions: "728x90" },
  { key: "home-in-feed-3", name: "Homepage In-feed 3", page: "home", position: "in-feed", dimensions: "728x90" },
  { key: "article-leaderboard", name: "Article Leaderboard", page: "article", position: "top", dimensions: "728x90" },
  { key: "article-mid-content", name: "Article Mid Content", page: "article", position: "mid", dimensions: "728x90" },
  { key: "article-in-content", name: "Article In Content", page: "article", position: "in-content", dimensions: "300x250" },
  { key: "article-mobile-in-content", name: "Article Mobile In Content", page: "article", position: "in-content-mobile", dimensions: "320x100" },
  { key: "article-sidebar", name: "Article Sidebar", page: "article", position: "sidebar", dimensions: "300x600" },
  { key: "category-leaderboard", name: "Category Leaderboard", page: "category", position: "top", dimensions: "970x90" },
  { key: "category-sidebar", name: "Category Sidebar", page: "category", position: "sidebar", dimensions: "300x250" },
  { key: "category-in-feed-1", name: "Category In-feed", page: "category", position: "in-feed", dimensions: "728x90" },
  { key: "detail-sidebar-top", name: "Detail Sidebar Top", page: "detail", position: "sidebar-top", dimensions: "300x250" },
  { key: "detail-sidebar-bottom", name: "Detail Sidebar Bottom", page: "detail", position: "sidebar-bottom", dimensions: "300x250" },
  { key: "events-sidebar", name: "Events Sidebar", page: "events", position: "sidebar", dimensions: "300x250" },
  { key: "tag-sidebar", name: "Tag Sidebar", page: "tag", position: "sidebar", dimensions: "300x250" },
  { key: "tag-bottom", name: "Tag Bottom", page: "tag", position: "bottom", dimensions: "728x90" },
  { key: "mobile-sticky-bottom", name: "Mobile Sticky Bottom", page: "global", position: "sticky-bottom", dimensions: "320x50" },
];

async function seedAdSlots(db: SeedDb) {
  let added = 0;
  for (const slot of AD_SLOTS) {
    const existing = await db.select({ id: adSlots.id }).from(adSlots).where(eq(adSlots.slotKey, slot.key)).limit(1);
    if (existing.length) continue;
    await db.insert(adSlots).values({
      name: slot.name,
      slotKey: slot.key,
      pageType: slot.page,
      position: slot.position,
      dimensions: slot.dimensions,
      isActive: 1,
    });
    added++;
  }
  console.log(`[seed] ad slots: ${added} added`);
}

// ------------------------------------------------------------------
// House ads — real self-promotional creatives so every ad slot renders
// a clearly-labeled ADVERTISEMENT during development and before direct
// campaigns are sold. Served at the lowest priority by the ad engine.
// ------------------------------------------------------------------
async function seedHouseAds(db: SeedDb) {
  const existing = await db.select({ id: adCampaigns.id }).from(adCampaigns).where(eq(adCampaigns.name, "BrentDesk House")).limit(1);
  if (existing.length) {
    console.log("[seed] house ads: already present");
    return;
  }
  await db.insert(adCampaigns).values({
    name: "BrentDesk House",
    campaignType: "house",
    objective: "awareness",
    pricingModel: "flat",
    status: "active",
  });
  const [campaign] = await db.select({ id: adCampaigns.id }).from(adCampaigns).where(eq(adCampaigns.name, "BrentDesk House")).limit(1);
  const creatives = [
    {
      name: "House — Advertise",
      nativeHeadline: "Reach the people building the region",
      nativeDescription: "Put your brand in front of decision-makers across construction, energy, infrastructure and logistics.",
      nativeCta: "Advertise with us",
      clickUrl: "/advertise",
    },
    {
      name: "House — Newsletter",
      nativeHeadline: publication.newsletter.name,
      nativeDescription: publication.newsletter.description,
      nativeCta: "Subscribe",
      clickUrl: "/newsletter",
    },
    {
      name: "House — Events",
      nativeHeadline: "Where the industry meets",
      nativeDescription: "Conferences, expos and forums across Saudi Arabia, the GCC and MENA.",
      nativeCta: "Browse events",
      clickUrl: "/events",
    },
  ];
  for (const creative of creatives) {
    await db.insert(adCreatives).values({
      campaignId: campaign.id,
      name: creative.name,
      format: "native",
      nativeHeadline: creative.nativeHeadline,
      nativeDescription: creative.nativeDescription,
      nativeCta: creative.nativeCta,
      clickUrl: creative.clickUrl,
      status: "approved",
    });
  }
  console.log("[seed] house ads: campaign + 3 native creatives added");
}

// ------------------------------------------------------------------
// Homepage sections — CMS-driven homepage
// ------------------------------------------------------------------
async function seedHomepageSections(db: SeedDb) {
  const catId = async (slug: string) => {
    const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
    return c?.id ?? null;
  };

  const SECTIONS: Array<Partial<typeof homepageSections.$inferInsert> & { name: string; slug: string; sectionType: any }> = [
    { name: "Top Story", slug: "top-story", sectionType: "hero", layout: "featured_grid", articleCount: 4, sortOrder: 0, position: "main", accentColor: "#2563eb" },
    { name: "Latest Headlines", slug: "latest-headlines", sectionType: "headlines", layout: "list", articleCount: 5, sortOrder: 1, position: "main", accentColor: "#2563eb" },
    { name: "In Brief", slug: "in-brief", sectionType: "in_brief", layout: "compact", articleCount: 6, sortOrder: 2, position: "main", accentColor: "#2563eb" },
    { name: "Construction", slug: "home-construction", sectionType: "category", categoryId: await catId("construction"), layout: "two_column", articleCount: 4, sortOrder: 3, position: "main", accentColor: "#b45309", viewMoreUrl: "/construction" },
    { name: "Infrastructure", slug: "home-infrastructure", sectionType: "category", categoryId: await catId("infrastructure"), layout: "two_column", articleCount: 4, sortOrder: 4, position: "main", accentColor: "#0e7490", viewMoreUrl: "/infrastructure" },
    { name: "Energy", slug: "home-energy", sectionType: "category", categoryId: await catId("energy"), layout: "two_column", articleCount: 4, sortOrder: 5, position: "main", accentColor: "#15803d", viewMoreUrl: "/energy" },
    { name: "Manufacturing", slug: "home-manufacturing", sectionType: "category", categoryId: await catId("manufacturing"), layout: "two_column", articleCount: 4, sortOrder: 6, position: "main", accentColor: "#7c3aed", viewMoreUrl: "/manufacturing" },
    { name: "Logistics", slug: "home-logistics", sectionType: "category", categoryId: await catId("logistics"), layout: "two_column", articleCount: 4, sortOrder: 7, position: "main", accentColor: "#be123c", viewMoreUrl: "/logistics" },
    { name: "Most Read", slug: "most-read", sectionType: "trending", layout: "list", articleCount: 5, sortOrder: 0, position: "sidebar", accentColor: "#2563eb" },
    { name: "Industry Jobs", slug: "sidebar-jobs", sectionType: "sidebar_jobs", layout: "list", articleCount: 5, sortOrder: 1, position: "sidebar" },
    { name: "Upcoming Events", slug: "sidebar-events", sectionType: "sidebar_events", layout: "list", articleCount: 4, sortOrder: 2, position: "sidebar" },
  ];

  let added = 0;
  for (const section of SECTIONS) {
    const existing = await db.select({ id: homepageSections.id }).from(homepageSections).where(eq(homepageSections.slug, section.slug)).limit(1);
    if (existing.length) continue;
    await db.insert(homepageSections).values({ ...section, isActive: 1 } as typeof homepageSections.$inferInsert);
    added++;
  }
  console.log(`[seed] homepage sections: ${added} added`);
}

// ------------------------------------------------------------------
// Editorial bylines
// ------------------------------------------------------------------
/**
 * The approved BrentDesk byline list. Bylines are `users` rows with
 * role='author'; articles.authorId points at them. Deliberately minimal —
 * no invented biographies, employers, credentials or social accounts,
 * because none of that can be legitimately supported.
 */
const AUTHORS: Array<{ publicName: string; name: string; jobTitle: string | null; authorBio: string }> = [
  {
    publicName: "Mo Qureshi",
    name: "Mo Qureshi",
    jobTitle: "Editor",
    authorBio: "Mo covers Saudi Arabia and the wider GCC for BrentDesk, with a focus on construction, infrastructure, energy and industrial strategy.",
  },
  {
    publicName: "Jakson Gudawela",
    name: "Jakson Gudawela",
    jobTitle: "Industry Correspondent",
    authorBio: "Jakson Gudawela reports on manufacturing, oil and gas, mining, logistics and industrial technology for BrentDesk.",
  },
  {
    publicName: "BrentDesk Research",
    name: "BrentDesk Research",
    jobTitle: "Research Desk",
    authorBio: "Data-led research and market analysis from the BrentDesk research desk.",
  },
  {
    publicName: "Mo Qureshi + BrentDesk Staff",
    name: "Mo Qureshi + BrentDesk Staff",
    jobTitle: null,
    authorBio: "Reported by Mo Qureshi with the BrentDesk newsroom.",
  },
  {
    publicName: "BrentDesk Staff",
    name: "BrentDesk Staff",
    jobTitle: null,
    authorBio: "Reporting from the BrentDesk newsroom.",
  },
];

async function seedAuthors(db: SeedDb) {
  // Same person, revised byline. Renaming keeps the existing archive's
  // articles attached instead of stranding them on a retired name.
  const [legacy] = await db.select({ id: users.id }).from(users).where(eq(users.publicName, "Mo")).limit(1);
  if (legacy) {
    await db.update(users).set({ publicName: "Mo Qureshi", name: "Mo Qureshi" }).where(eq(users.id, legacy.id));
    console.log("[seed] authors: renamed byline \"Mo\" to \"Mo Qureshi\"");
  }

  let added = 0;
  for (const a of AUTHORS) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.publicName, a.publicName)).limit(1);
    if (existing.length) continue;
    await db.insert(users).values({
      openId: `author_${a.publicName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: a.name,
      publicName: a.publicName,
      jobTitle: a.jobTitle,
      authorBio: a.authorBio,
      loginMethod: "system",
      role: "author",
    });
    added++;
  }
  console.log(`[seed] authors: ${added} added`);
}

// ------------------------------------------------------------------
// Optional admin user
// ------------------------------------------------------------------
async function seedAdminUser(db: SeedDb) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("[seed] admin user: skipped (set ADMIN_EMAIL + ADMIN_PASSWORD to create one)");
    return;
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    console.log("[seed] admin user: already exists");
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await db.insert(users).values({
    openId,
    email,
    password: hashed,
    name: "Administrator",
    loginMethod: "email",
    role: "admin",
  });
  console.log(`[seed] admin user: created (${email})`);
}

/**
 * Seed the system data BrentDesk needs to boot and be operated.
 * Idempotent. Throws on failure; the caller decides what that means.
 */
export async function runSeed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const pool = mysql.createPool(url);
  const db = drizzle(pool) as SeedDb;
  try {
    await seedCountries(db);
    await seedEditions(db);
    await seedCategories(db);
    await seedSectors(db);
    await seedRoles(db);
    await seedAdSlots(db);
    await seedHouseAds(db);
    await seedHomepageSections(db);
    await seedAuthors(db);
    await seedLocales(db);
    // Company profiles need the published editorial status, which the server
    // creates at boot. Resolve it here so the seed works standalone too.
    {
      const { workflowService } = await import("../server/services/workflow.service");
      let status = await workflowService.getStatusBySlug("editorial", "published");
      if (!status) {
        await workflowService.initializeWorkflows();
        status = await workflowService.getStatusBySlug("editorial", "published");
      }
      if (status) {
        await seedCompanies(db, status.id);
        await seedEvents(db, status.id);
      } else {
        console.warn("[seed] companies and events: skipped (no published editorial status)");
      }
    }
    await seedAdminUser(db);
    console.log("[seed] BrentDesk bootstrap complete");
  } finally {
    await pool.end();
  }
}
