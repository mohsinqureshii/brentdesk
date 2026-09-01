/**
 * DEV FIXTURES — clearly-labeled development content for verifying the UI.
 *
 * NOT part of the production bootstrap (scripts/seed-brentdesk.ts). Every
 * row is prefixed "[DEV]" or uses the reserved dev- slug prefix so it can
 * be identified and purged. Refuses to run when NODE_ENV=production.
 *
 * Run: pnpm tsx scripts/dev-fixtures.ts
 * Purge: delete rows with slug LIKE 'dev-%' across articles/companies/events/jobs.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { and, eq } from "drizzle-orm";
import {
  users, articles, companies, events, jobs, categories, workflowStatuses,
  articleCategories,
} from "../drizzle/schema";

if (process.env.NODE_ENV === "production") {
  console.error("[dev-fixtures] refusing to run in production");
  process.exit(1);
}
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const db = drizzle(DATABASE_URL);

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString().slice(0, 19).replace("T", " ");
const daysAhead = (d: number) =>
  new Date(Date.now() + d * 86400000).toISOString().slice(0, 19).replace("T", " ");

async function main() {
  const [published] = await db.select({ id: workflowStatuses.id }).from(workflowStatuses)
    .where(and(eq(workflowStatuses.slug, "published"), eq(workflowStatuses.workflowType, "editorial")));
  if (!published) throw new Error("published workflow status missing — boot the server once first");

  // Author
  let [author] = await db.select({ id: users.id }).from(users).where(eq(users.email, "desk@brentdesk.local"));
  if (!author) {
    await db.insert(users).values({
      openId: `dev_${Date.now()}`,
      email: "desk@brentdesk.local",
      name: "[DEV] BrentDesk Desk",
      publicName: "BrentDesk Desk",
      username: "brentdesk-desk",
      role: "author",
      loginMethod: "email",
    });
    [author] = await db.select({ id: users.id }).from(users).where(eq(users.email, "desk@brentdesk.local"));
  }

  const catId = async (slug: string) => {
    const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
    return c?.id ?? null;
  };

  // Articles — one per major category, obviously-fixture titles.
  const ARTICLES: Array<{ slug: string; cat: string; title: string; excerpt: string; ago: number }> = [
    { slug: "dev-giga-project-water-award", cat: "construction", ago: 0,
      title: "[DEV] Giga-project awards SAR 8bn water package to contractor JV",
      excerpt: "Development fixture: a placeholder construction contract-award story used to verify the homepage lead layout." },
    { slug: "dev-metro-extension-tender", cat: "infrastructure", ago: 1,
      title: "[DEV] Metro extension tender draws six international consortia",
      excerpt: "Development fixture: infrastructure tender story for layout verification." },
    { slug: "dev-solar-ipp-financial-close", cat: "energy", ago: 1,
      title: "[DEV] 1.5 GW solar IPP reaches financial close",
      excerpt: "Development fixture: energy project-finance story for layout verification." },
    { slug: "dev-ev-plant-localization", cat: "manufacturing", ago: 2,
      title: "[DEV] EV assembly plant breaks ground under localization program",
      excerpt: "Development fixture: manufacturing investment story for layout verification." },
    { slug: "dev-port-automation-rollout", cat: "logistics", ago: 2,
      title: "[DEV] Port operator begins automated-crane rollout at container terminal",
      excerpt: "Development fixture: logistics technology story for layout verification." },
    { slug: "dev-masterplan-phase-two", cat: "real-estate", ago: 3,
      title: "[DEV] Coastal master plan enters phase two with hotels package",
      excerpt: "Development fixture: real estate development story for layout verification." },
    { slug: "dev-rail-freight-corridor", cat: "transportation", ago: 3,
      title: "[DEV] Rail freight corridor study moves to detailed design",
      excerpt: "Development fixture: transportation planning story for layout verification." },
    { slug: "dev-phosphate-expansion", cat: "mining", ago: 4,
      title: "[DEV] Phosphate expansion adds three million tonnes of capacity",
      excerpt: "Development fixture: mining expansion story for layout verification." },
    { slug: "dev-desal-plant-commissioning", cat: "utilities", ago: 4,
      title: "[DEV] Desalination plant enters commissioning ahead of summer peak",
      excerpt: "Development fixture: utilities story for layout verification." },
    { slug: "dev-industrial-ai-pilot", cat: "industrial-technology", ago: 5,
      title: "[DEV] Steelmaker pilots AI-driven predictive maintenance across mills",
      excerpt: "Development fixture: industrial technology story for layout verification." },
  ];

  let added = 0;
  for (const a of ARTICLES) {
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, a.slug));
    if (existing.length) continue;
    const primaryCategoryId = await catId(a.cat);
    await db.insert(articles).values({
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: `<p>${a.excerpt}</p><p>This is development fixture content. It exists only to verify typography, spacing and entity layouts in the BrentDesk interface and must never be published to a production audience.</p>`,
      authorId: author.id,
      statusId: published.id,
      articleType: "news",
      primaryCategoryId,
      publishedAt: daysAgo(a.ago),
    } as typeof articles.$inferInsert);
    const [row] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, a.slug));
    if (primaryCategoryId) {
      await db.insert(articleCategories).values({ articleId: row.id, categoryId: primaryCategoryId } as typeof articleCategories.$inferInsert);
    }
    added++;
  }
  console.log(`[dev-fixtures] articles: ${added} added`);

  // Companies
  const COMPANIES = [
    { slug: "dev-alpha-contracting", name: "[DEV] Alpha Contracting", industry: "Construction", location: "Riyadh, Saudi Arabia" },
    { slug: "dev-gulf-grid-utilities", name: "[DEV] Gulf Grid Utilities", industry: "Utilities", location: "Dammam, Saudi Arabia" },
    { slug: "dev-red-sea-logistics", name: "[DEV] Red Sea Logistics", industry: "Logistics", location: "Jeddah, Saudi Arabia" },
    { slug: "dev-emirates-steel-works", name: "[DEV] Emirates Steel Works", industry: "Manufacturing", location: "Abu Dhabi, UAE" },
  ];
  added = 0;
  for (const c of COMPANIES) {
    const existing = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, c.slug));
    if (existing.length) continue;
    await db.insert(companies).values({
      name: c.name,
      slug: c.slug,
      tagline: "Development fixture company",
      description: "Development fixture company used to verify directory layouts.",
      industry: c.industry,
      location: c.location,
      statusId: published.id,
      isFeatured: 1,
      publishedAt: now(),
    } as typeof companies.$inferInsert);
    added++;
  }
  console.log(`[dev-fixtures] companies: ${added} added`);

  // Events
  const EVENTS = [
    { slug: "dev-industrial-expo", title: "[DEV] Industrial Expo 2026", city: "Riyadh", country: "Saudi Arabia", ahead: 20 },
    { slug: "dev-energy-forum", title: "[DEV] Regional Energy Forum", city: "Dhahran", country: "Saudi Arabia", ahead: 45 },
    { slug: "dev-logistics-summit", title: "[DEV] Gulf Logistics Summit", city: "Dubai", country: "UAE", ahead: 70 },
  ];
  added = 0;
  for (const e of EVENTS) {
    const existing = await db.select({ id: events.id }).from(events).where(eq(events.slug, e.slug));
    if (existing.length) continue;
    await db.insert(events).values({
      title: e.title,
      slug: e.slug,
      description: "Development fixture event used to verify event layouts.",
      startDate: daysAhead(e.ahead),
      endDate: daysAhead(e.ahead + 2),
      city: e.city,
      country: e.country,
      statusId: published.id,
      publishedAt: now(),
    } as typeof events.$inferInsert);
    added++;
  }
  console.log(`[dev-fixtures] events: ${added} added`);

  // Jobs
  const JOBS = [
    { slug: "dev-senior-project-engineer", title: "[DEV] Senior Project Engineer", companyName: "[DEV] Alpha Contracting", location: "Riyadh, Saudi Arabia", employmentType: "Full-time" },
    { slug: "dev-hse-manager", title: "[DEV] HSE Manager", companyName: "[DEV] Gulf Grid Utilities", location: "Dammam, Saudi Arabia", employmentType: "Full-time" },
    { slug: "dev-logistics-planner", title: "[DEV] Logistics Planner", companyName: "[DEV] Red Sea Logistics", location: "Jeddah, Saudi Arabia", employmentType: "Full-time" },
    { slug: "dev-maintenance-supervisor", title: "[DEV] Maintenance Supervisor", companyName: "[DEV] Emirates Steel Works", location: "Abu Dhabi, UAE", employmentType: "Full-time" },
  ];
  added = 0;
  for (const j of JOBS) {
    const existing = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.slug, j.slug));
    if (existing.length) continue;
    await db.insert(jobs).values({
      title: j.title,
      slug: j.slug,
      companyName: j.companyName,
      description: "Development fixture job used to verify job-board layouts.",
      location: j.location,
      employmentType: j.employmentType,
      statusId: published.id,
      publishedAt: now(),
    } as typeof jobs.$inferInsert);
    added++;
  }
  console.log(`[dev-fixtures] jobs: ${added} added`);

  console.log("[dev-fixtures] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[dev-fixtures] failed:", err);
  process.exit(1);
});
