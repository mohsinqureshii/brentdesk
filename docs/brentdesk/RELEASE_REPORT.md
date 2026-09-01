# BrentDesk Build Report

TechScoop → BrentDesk platform migration, executed on branch `claude/brentdesk-ofzuct`
(base: `429980b Initial TechScoop upload`). Net diff: 1,257 files changed,
~37k insertions, ~209k deletions.

## A. Baseline (before any change)

- Install: PASS (pnpm, frozen lockfile).
- TypeScript: PASS with 0 errors — but only because a previous pass had sprayed
  **1,255 `as any` casts** across server/ (394 masking Drizzle inserts/updates), exactly
  the pattern `remaining-ts-errors.md` prescribed. That document was stale.
- Client build: PASS, but the main chunk was **6,190 kB** (1,245 kB gzip) with zero route
  splitting; stray 400–780 kB grammar/diagram chunks.
- Tests: 690 total; **140 failed** with env set against an empty DB (60 failed without env —
  test files crashed at import on missing JWT_SECRET). One test file was corrupted
  (flattened newlines) and imported a router that never existed.
- Migrations: **not reproducible.** On a fresh MySQL the chain failed at 0031 (altered ~45
  tables first created in 0035); 0034 dropped tables that never existed; the newsletters
  migration was orphaned from the journal; snapshots stopped at 0043. The server shipped a
  hand-rolled "additive tail" migrator to work around the known breakage.
- Schema: a defective `drizzle-kit pull` output — 202/203 autoincrement ids without
  `.primaryKey()`, 206 string-literal `'CURRENT_TIMESTAMP'` defaults (invalid on push),
  and every unique constraint silently downgraded to a plain index (users.openId,
  subscribers.email, redirects.fromPath, settings.key, all entity slugs) — breaking
  `onDuplicateKeyUpdate` upserts platform-wide.
- Major inherited runtime bugs found later in QA: homepage sections filtered on a
  hardcoded workflow-status id; the ad component's lazy-loading could never fire (ads never
  rendered); public article pages called admin-gated procedures and 403'd for readers;
  newsletter subscribe/unsubscribe SQL referenced nonexistent column names; entity-miss 404
  pages carried no robots directive; live favicons pointed at a dead `/manus-storage/` mount.

## B. Architecture (unchanged in shape, deliberately)

- **Backend:** Express 4 + tRPC 11 (43 namespaces; `admin.*` nests 31 routers), Drizzle ORM
  on MySQL (230-table schema), JWT cookie auth, S3/R2 media storage, Redis optional.
- **Frontend:** React 19 + Vite 7 + wouter + Tailwind 4 (CSS-first tokens) + shadcn/ui;
  public pages statically imported, all 77 admin pages lazy-loaded.
- **CMS:** workflow engine (draft→…→published), CMS-driven homepage sections, moderation +
  claims, media library, RBAC roles.
- **Database:** single squashed baseline migration (`drizzle/0000_brentdesk_baseline.sql`)
  generated from the repaired schema; legacy 52-file chain archived in `drizzle/legacy/`.
- **Deployment:** Dockerfile + docker-compose (MySQL/Redis), GHCR image workflow; env
  documented in `.env.example` (previously absent).

## C. What was preserved (TechScoop capabilities reused)

Articles + editorial workflow + scheduling; Companies, People (kept separate from
Authors), Events hub (agenda/speakers/sponsors/galleries/side events/live coverage/
correspondents/recordings/submissions/ticketing + Stripe), public Jobs board;
advertising engine (slots/campaigns/creatives/impressions/clicks/frequency/blocklist/
AdSense settings); newsletter platform; editions engine (dormant); homepage-sections CMS;
SEO engine (meta, JSON-LD, per-module sitemaps, news/image sitemaps, RSS, robots,
redirects manager, IndexNow/GSC integration, prerendering/SSR); search + search
analytics; media library; claims/suggested-updates moderation; RBAC; integrations hub;
AI editorial engine (discovery, scoring, composition, entity extraction/enrichment, SEO
AI, PDF generator, event coverage agent); WordPress importer (generic); talent/ATS
platform retained as an admin-only capability (well-indexed, tenant-scoped, no public
exposure); multi-tenant infrastructure.

## D. What was removed / disabled

- **Removed from the public product** (backend/admin management retained): Investors,
  Accelerators, Funding tracker, founder Resources (perks/templates/calculators/
  playbooks/regulations/vendors/packs), `/submit-startup`. Routes, nav, sitemaps, robots
  (now explicitly Disallow-ed), SSR configs and search fan-out all updated.
- **Deleted outright:** 37 MB of TechScoop editorial content (`content/`), YC/founder
  lead-magnet downloads, `resourcesEnhanced.router.ts` (942 LOC, zero client references),
  the LEAP editorial import pipeline (~75 scripts), 26 root scratch reports, 47 one-off
  debug/seed scripts (including `seed-techscoop.mjs`), WordPress one-time import
  artifacts, the Cloudflare worker that existed only to defeat the previous host's CDN,
  two GitHub workflows tied to the old brand/host, dead client components (ManusDialog,
  AIChatBox, Map, FlashNewsTicker, unused cards, PartnerDashboard), committed generated
  sitemaps/feeds with techscoop.io URLs, old search-engine verification tokens, and the
  previous host's storage-proxy precedence.
- **Startup fields hidden from public UI** (data preserved in DB per migration policy):
  funding stage, total funding, funding rounds/investors, pitch deck, tech stack,
  ARR/active-users on company pages, snapshots and directory cards/filters.
- **Not inherited:** TechScoop's WordPress-era redirect/410 rules (year archives, tag
  shapes, one-off page moves) — BrentDesk starts with clean URL history; generic URL
  hygiene (WP probe 410s, trailing-slash, category canonicalization) kept.

## E. Brand migration

`shared/publication.ts` is the single source of publication identity (name, wordmark,
legal name, domain, canonical URL + env override, description, emails, socials, bot
user-agents, assets, newsletter identity, postal address); `server/config/editorial.ts`
is the AI editorial mandate. The four competing hardcoded `BASE_URL` constants were
consolidated onto `getBaseUrl()`. 13,171 techscoop-referencing lines across 802 files at
baseline → **zero** outside `drizzle/legacy/` and `docs/`, enforced by an automated
brand-regression test (`server/brandRegression.test.ts`) that fails CI on `techscoop` or
old-host identifiers in active source. New brand assets generated (SVG wordmarks,
favicons, icons, OG image). The static shell (`client/index.html`) mirrors the config by
necessity and is covered by the regression test.

## F. Data reset

BrentDesk provisions **fresh databases** — no TechScoop records migrate. The baseline
migration creates schema only; `scripts/seed-brentdesk.ts` (idempotent) seeds system
data: 23 countries, 7 dormant editions (International active), 44 industrial categories,
30 sectors, 6 roles, 23 ad slots, a house-ad campaign with 3 self-promotional native
creatives, 11 CMS homepage sections, and an optional env-driven admin user. Editorial
workflow statuses seed at server boot. `scripts/dev-fixtures.ts` provides [DEV]-prefixed
UI-verification content and refuses to run in production. No fake production data exists.

## G–K. Entity products

- **News (G):** article platform intact — SEO fields, OG, canonical, robots enum, Google
  News keywords, scheduling, flash/featured/editor-pick flags, WP provenance columns.
  Article types now `news, analysis, interview, opinion, feature, explainer,
  press_release, report` (analysis/feature/explainer added; projects/deals deliberately
  modeled as taxonomy + entity links, not article types).
- **Companies (H):** directory + profiles kept; industrial fields first-class (industry,
  sectors, location, founded, employees, products, partnerships, awards, certifications,
  people, coverage, jobs, events); startup fields hidden from UI, preserved in schema;
  server-side location filtering added (the old client-side filter over one page was
  removed); `/companies/:slug` resolves by slug.
- **People (I):** kept separate from Authors; person ↔ company/article/event/sector/
  region relations intact; broken location filter (backed by a field the API never
  returned) removed; role filter re-flavored to industry.
- **Events (J):** the full hub preserved and rebranded — detail, agenda, speakers,
  sponsors, galleries, side events, live coverage + correspondents + SSE feed +
  AI-suggested live posts, recordings, submissions + AI moderation, ticketing (tiers/
  orders/promo codes/Stripe/external providers), ICS, OG images, reminders, analytics.
  Nested-list markup bug fixed.
- **Jobs (K):** public board kept (listing/detail/company/location/seniority/type/salary/
  application/SEO schema/click analytics); ATS remains admin-only.

## L. Entity graph

All 14 article↔entity join tables preserved and now indexed (they had **zero indexes**);
EntityLinking + EntityEnrichment admin tools intact; a story linked to a company/person/
event/location/sector surfaces automatically on those entity pages. New public
`news.getArticleCompanies` read powers the article-page company panel (previously an
admin-gated call that 403'd for readers).

## M. Homepage

CMS-driven, per the supplied design: hero Top Story (dark editorial lead + secondary
stack), category chip row, Latest Headlines + In Brief band, per-category sections with
automatic latest-article fallbacks, Most Read / Industry Jobs / Upcoming Events rail
widgets (CMS `position: sidebar` rows are now actually rendered — previously computed
and dead), newsletter box wired to the real subscribe mutation, Featured Companies and
Events bands, market ticker (Brent/WTI/gas/indices; live when a quote provider is
configured, labeled static fallback otherwise). Editors control sections, order,
accents, counts and pinning through the existing admin. The old `HomepageConfig` mock
admin page still exists but is superseded by Homepage Sections (see W).

## N. Advertising

Existing engine kept end-to-end. Placements seeded for the new design (970×250/90
leaderboards, 728×90 in-content, 300×250/300×600 rail, 320×50 mobile sticky, native
bands) — every unit renders an ADVERTISEMENT label; direct → house → AdSense priority;
impression/viewability/click tracking intact. Fixed the serving-path bug that prevented
lazy ad units from ever loading. The previous publication's hardcoded AdSense account was
removed; ads.txt is env/DB-driven and serves a comment-only file until a publisher is
configured.

## O. SEO

Metadata, JSON-LD (NewsMediaOrganization, WebSite, Article, Person, Event, JobPosting,
Breadcrumb), canonical logic, robots, per-module + news + image sitemaps, RSS/jobs
feeds, prerendering and SSR all generate from the central config; retired modules
removed from index/robots/stats and Disallow-ed. Generated XML is no longer committed —
gitignored and rebuilt at build/publish time. IndexNow/GSC integration retained
(re-verification for the new domain is an ops task). Entity-miss 404s now emit noindex.

## P. AI editorial system

Engine preserved (discovery, 3-stage scoring with self-learning, composition, entity
extraction/population, SEO AI, tone/plagiarism/social/newsletter tools, provider
abstraction with cost tracking). The publication-identity layer was rewritten, not
renamed: prompts build from `server/config/editorial.ts` (identity, sector universe,
strong topics, Saudi→GCC→MENA→Global rubric where generic startup fundraising and
consumer-app news score low, and house style forbidding marketing vocabulary and
invented facts). Discovery keyword/entity lists replaced with industrial-economy sets.
Stage-3 feedback writes targeted a nonexistent table and silently failed — repaired onto
the real ledger. PDF generator rebranded via config.

## Q. Security

Fixed: sameSite=lax session cookies (CSRF mitigation for cookie-authed mutations); JWT
lifetime 1 year → 30 days; login (5/15min/IP) and registration (3/hour/IP) rate
limiting wired into the previously-dead rate-limit module; admin-gated data no longer
requested by public pages; storage-proxy precedence removed. Verified: no secrets in the
repo (pattern scan clean); admin routers' public procedures are all legitimately public
(ad serving, tracking, subscribes, feeds); `systemHealth`/`adminEventSeed` mounted at
top level but 100% protected procedures; assessment token-gated flows are deliberate.
Known remaining gaps in W.

## R. Performance

Main client chunk 6,190 kB → **1,780 kB** (gzip 1,245 → 361 kB): 77 admin pages
lazy-loaded, retired modules deleted, recharts/framer-motion split. Database: hot-path
indexes added across articles (status/publishedAt/category), all article↔entity join
tables, entity statusId, audit logs; unique keys restored. Client-side filtering of
server-paginated data removed on Companies/People. Remaining hotspots listed in W.

## S. Responsiveness

Browser-verified at 1440/768/390 across home, companies, people, events, jobs, article,
category, search, about, newsletter and 404: no horizontal overflow at any viewport
(automated scrollWidth check), mobile single-column with scrollable chips/ticker, sheet
navigation, sticky mobile ad dismissible.

## T. Accessibility

Semantic landmarks (`nav`/`aside`/`section` with aria-labels) in the new chrome and
homepage; aria-labels on icon-only buttons; alt attributes on content imagery (empty for
decorative); the events nested-`<li>` violation fixed; focus-visible styles from the
design system; form labels retained on rebuilt static pages. No full audit performed —
noted in W.

## U. Test results

- `pnpm check` (tsc --noEmit): **clean**.
- `DATABASE_URL=… REDIS_URL=… npx vitest run`: **698 passed, 0 failed, 8 skipped**
  (skips are env-gated: 4 Google-credential, 3 live-LLM, 1 notification-proxy).
- `pnpm build` with DATABASE_URL: vite + esbuild + prerender (10/10 fixture articles) +
  sitemap generation all pass; build now fails loudly if prerender/sitemaps fail.
- Production bundle (`node dist/index.js`) smoke: health, homepage, article SSR with
  BrentDesk titles/canonicals, sitemap.xml, RSS, robots, companies, 404-with-noindex,
  admin login — all verified against a fresh provisioned database.
- Fresh-provisioning proof: drop DB → `drizzle-kit migrate` → seed → boot → fixtures →
  all green (performed repeatedly during QA).

## V. TechScoop string audit

`git grep -i techscoop` matches only: `drizzle/legacy/**` (archived pre-BrentDesk
migrations — intentional history), `docs/**` (migration documentation describing the old
brand — intentional), and the brand-regression test that forbids everything else. Same
for old-host (`manus`) identifiers. CI-enforced going forward.

## W. Known limitations (not hidden)

1. **`as any` debt remains.** The root causes were fixed in the schema, and the five
   core content routers (news/companies/people/events/jobs) were cleaned to **zero casts**
   using narrow boundary adapters (`server/_core/dbValues.ts`: boolInt/toDbDate) — 226
   casts removed with no behavior change. **950 casts remain** across the wider server
   codebase (talent platform, admin routers, services). They are masks, not correctness
   bugs — tests and runtime verify behavior — but they weaken the type boundary. Backlog
   item, with the adapter pattern established.
2. **Domain assumption.** `brentdesk.com` is used as the canonical domain in
   `shared/publication.ts`, `client/index.html` and brand assets. If the real domain
   differs, change those two files (+ assets) and set BASE_URL.
3. **Search is SQL LIKE fan-out** (5 parallel queries, no FULLTEXT). Fine at launch
   scale; needs FULLTEXT indexes or a search engine before tens of thousands of articles.
4. **`people.list` fetches all rows and paginates in JS** (pre-existing) — needs
   SQL pagination as the directory grows; several admin lists use limit:500 fetches.
5. **Media pipeline untested end-to-end** here (no S3/R2 credentials in this
   environment); upload route and library code paths are unchanged from the working
   inherited implementation and fail cleanly when unconfigured.
6. **RBAC is coarse.** The granular permission tables/middleware exist but procedures
   enforce role checks (mostly inline, some via adminProcedure); `requirePermission` has
   no call sites. Session-store/concurrent-session middleware remains unmounted.
7. **Live market quotes** depend on a quote provider; until configured the ticker shows
   a static representative set (clearly one-shot values, not fake live data).
8. **86 `console.log` calls** in server non-test code (mostly boot/scheduler/services);
   no structured logger.
9. **25 TODOs** remain, clustered in GitHub-App webhook stubs (documented as unfinished)
   and one admin talent page.
10. **Stripe account state** (old coupon names, webhook endpoints, GSC/IndexNow
    verification, DNS, R2 bucket naming) lives outside this repo and needs an ops pass at
    deploy time. `docs/admin/SQUARE_DESIGN_SPEC.md` and `docs/talent/*` still describe
    the admin/talent subsystems under their original naming.
11. **Editions dormant by design** — engine seeded but only International active; the
    switcher is not mounted in the new header.
12. **HomepageConfig mock admin page** (blocks) still routed at `/admin/homepage`;
    the real CMS is `/admin/homepage-sections`. Removing or wiring the mock is backlog.

## X. Future backlog (separate from launch blockers — none of these block)

- Projects as a first-class entity (recommended Phase 2; see MIGRATION_INVENTORY.md) —
  the entity graph accommodates it without rework.
- Full `as any` elimination + drizzle-zod insert schemas; structured logging; FULLTEXT
  search; SQL pagination for people/admin lists; granular RBAC enforcement; mounting the
  session store + global rate limits; generalizing the funding module to industrial
  investment/project finance; deciding the talent platform's future; activating country
  editions; accessibility audit; image pipeline for editorial photography; deleting or
  wiring the HomepageConfig mock page.

## Y. Release verdict

**READY FOR BRENTDESK EDITORIAL PUBLISHING**

(Ready as a platform: fresh provisioning, checks, builds, tests, runtime and QA all
pass with zero TechScoop residue in active code. Go-live still requires the standard
ops pass outside this repo: real domain + DNS, S3/R2 + email + Stripe + analytics
credentials, and search-engine re-verification.)
