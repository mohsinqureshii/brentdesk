# BrentDesk Migration Inventory

Audit of the TechScoop codebase (commit `429980b`) ahead of the TechScoop → BrentDesk platform
migration. Classifications: **KEEP** / **KEEP + REFACTOR** / **ADAPT** (BrentDesk adaptation
required) / **DISABLE** (from public UI, backend retained) / **REMOVE** / **INVESTIGATE**.

## Architecture summary

- **Backend**: Express 4 + tRPC 11 (43 top-level namespaces, ~80 routers; `admin.*` nests 31),
  Drizzle ORM on MySQL (228-table monolithic introspected `drizzle/schema.ts`), JWT-cookie auth
  (`jose`, bcryptjs), S3/R2 media storage with a legacy "Manus forge" fallback, Redis present but
  dormant (session middleware never mounted), no Meilisearch despite docs — search is SQL `LIKE`
  fan-out. SSR/prerender layer for SEO (`server/_core/ssrServe.ts`, `scripts/prerender.ts`).
- **Frontend**: React 19 + Vite 7 + wouter + Tailwind 4 (CSS-first tokens in `client/src/index.css`),
  shadcn/ui, TanStack Query + tRPC client. ~95 admin routes, ~80 public routes, all statically
  imported (no code splitting — 6.2 MB main chunk).
- **AI layer**: provider abstraction (builtin/openai/anthropic/google/deepseek/mistral) via raw
  fetch; "builtin" resolves to the Manus forge proxy or Gemini. News discovery agent, scoring
  engine, entity extraction/population, SEO AI, PDF generator, event coverage agent.

## Subsystem classification

| Subsystem | Verdict | Notes |
|---|---|---|
| News/Articles (module, workflow, scheduling, SEO fields) | **KEEP + REFACTOR** | Core platform. Article types extended for BrentDesk (news, analysis, interview, opinion, feature, explainer, press_release, report). Fix `as any` boundary in router. |
| Categories/Tags/Topics/Sectors taxonomy | **ADAPT** | Engine kept; TechScoop startup taxonomy replaced by industrial taxonomy via seed data, not React hardcoding. |
| Authors + People directory | **KEEP** | Kept separate as required. People ↔ company/article/event relations already modeled. |
| Companies directory | **ADAPT** | Keep schema (incl. startup fields — `stage`, `totalFunding`, `techStack`, `pitchDeck` stay in DB to avoid risky migration); hide startup fields from BrentDesk public/admin UI; industrial fields (industry, sectors, projects, certifications, partnerships) become first-class. |
| Events hub (agenda/speakers/sponsors/tickets/live/submissions, 23 tables) | **KEEP + ADAPT** | Most advanced subsystem; becomes a flagship BrentDesk product. Branding + prompts adapted. |
| Jobs public board | **KEEP + ADAPT** | Listing/detail/company/location/SEO kept. "Jobs in Tech" → industry jobs. |
| Talent/ATS platform (28 tables, ~16k LOC, candidates/assessments/interviews/matching/tenants) | **DISABLE** | Admin-only capability retained (well-indexed, tenant-scoped, 100% protected procedures except token-gated assessment flow). Candidate-facing public routes removed from launch navigation; no public exposure. Future capability decision post-launch. |
| Investors directory | **DISABLE** | Backend + admin retained (entangled with SEO/SSR/entity layer — removal is high-risk); removed from public nav, routes, sitemaps, search. |
| Funding tracker | **DISABLE** | Same as investors. Candidate for generalization to industrial/project investment in Phase 2. |
| Accelerators (13 tables) | **DISABLE** | TechScoop-specific. Removed from public product; backend dormant. |
| Startup resources (perks/templates/YC files/calculators/playbooks/regulations/vendors/packs) | **REMOVE (public) + REMOVE (dead code)** | Public routes, nav, sitemap entries removed; YC/founder download assets deleted; `resourcesEnhanced.router` (942 LOC) is entirely unreferenced by the client — removed. |
| Startup submissions (`/submit-startup`) | **REMOVE (public)** | Generic `form_submissions` engine kept (contact/advertise use it). |
| Advertising engine (slots/campaigns/creatives/tracking/AdSense) | **KEEP** | Strong system; BrentDesk placements mapped to the new homepage design; hardcoded AdSense publisher moved to config. |
| Newsletter | **KEEP + ADAPT** | Rebranded; `newsletters` tables must be brought into the Drizzle schema (currently raw SQL against tables created outside the migration chain). |
| Editions (country editions + switcher) | **KEEP (dormant)** | Capability preserved; not exposed at launch. |
| Homepage CMS (`homepage_sections`) | **KEEP + REFACTOR** | Real CMS is `homepage_sections` (admin `HomepageSections`); `HomepageConfig` admin page is an unwired mock (**REMOVE**). New design rendered through CMS sections with automatic fallbacks. |
| SEO engine (meta, JSON-LD, sitemaps, RSS, robots, indexing, GSC) | **KEEP + REFACTOR** | Centralized onto publication config; 4 competing `BASE_URL` constants consolidated; brand-coupled generators rewritten. |
| WordPress-era SEO middleware (410s, year redirects, techscoop.io canonicals) | **REMOVE (TechScoop-specific rules)** | Generic middleware (trailing slash, category canonicalization, DB-backed redirects) kept; TechScoop WP history not inherited by BrentDesk. |
| WordPress importer | **KEEP (generic)** | TechScoop assumptions and one-time import reports removed. |
| Search (SQL LIKE fan-out + analytics) | **KEEP + REFACTOR** | Kept for launch with reduced fan-out (no investors/accelerators); flagged for FULLTEXT/engine upgrade as corpus grows. |
| Search analytics | **KEEP** | |
| Media library (R2/S3) | **KEEP** | Manus forge storage precedence removed; S3/R2 becomes the single backend. |
| Workflow engine + moderation + claims | **KEEP** | |
| RBAC (roles/permissions tables + admin) | **KEEP + REFACTOR** | `requirePermission` middleware exists with zero call sites; admin routers standardized on `adminProcedure`. |
| Auth (JWT cookie) | **KEEP + REFACTOR** | Hardening: cookie flags, centralized admin checks. |
| AI editorial system (discovery/scoring/composition/SEO/entities) | **KEEP + ADAPT** | Engine preserved; every publication-identity prompt rewritten around a central BrentDesk editorial config. Manus "builtin" provider de-prioritized. |
| AI PDF generator | **ADAPT** | Rebranded via publication config. |
| Integrations hub | **KEEP** | TechScoop placeholder text made config-driven. |
| System health | **KEEP** | Mounted into `admin.*` namespace (currently public top-level). |
| Cloudflare seo-worker | **REMOVE** | Existed solely to defeat Manus CDN interception; BrentDesk hosting doesn't need it. Decision revisited at deploy time. |
| Stocks ticker module | **KEEP + ADAPT** | Never called by old client; the new design's market ticker (WTI/Brent/indices) will use it. |
| Root scratch files (26 md reports, 47 one-off scripts) | **REMOVE** | Institutional knowledge preserved in `/docs`; one-off debug/seed artifacts deleted. |
| `content/` TechScoop editorial batches (526 files) | **REMOVE** | Publication content, not platform. |
| TechScoop seed scripts (`seed-techscoop.mjs` etc.) | **REMOVE** | Replaced by a deliberate BrentDesk bootstrap seed. |
| Committed generated XML/feeds in `client/public/` | **REMOVE + REGENERATE** | Stale TechScoop URLs; regenerated from BrentDesk config at build; gitignored. |
| Manus platform coupling (forge LLM/storage defaults, `/manus-storage/` favicons, edge workarounds, deploy docs) | **REMOVE** | Live favicon bug (index.html points at `/manus-storage/…`). Sitemap `/api/` aliases kept (harmless). |

## Critical inherited defects (fix list)

1. **Migration chain is not reproducible.** `0031` alters ~45 tables first created in `0035`;
   `0034` drops tables that don't exist; `0041_dashing_preak.sql` (newsletters) is orphaned from
   the journal; snapshots stop at `0043`; `drizzle-kit generate` would diff against stale state.
   → BrentDesk ships a squashed, verified baseline migration; legacy chain archived.
2. **`drizzle/schema.ts` is a defective introspection**: 202/203 autoincrement ids missing
   `.primaryKey()`; 206 string-literal `'CURRENT_TIMESTAMP'` defaults; `newsletters` tables absent.
   `drizzle-kit push` fails on a fresh MySQL.
3. **Unique constraints destroyed** by `0031` and never restored (`users.openId`,
   `subscribers.email`, `redirects.fromPath`, `settings.key`, every entity slug…). `upsertUser`'s
   `.onDuplicateKeyUpdate` can never fire → duplicate users.
4. **Hot paths unindexed**: every `article_*` join table, every `statusId`, `publishedAt` on most
   entities, ad analytics tables, RBAC tables.
5. **1,255 `as any` casts** in server/ masking the tinyint↔boolean and timestamp↔Date boundary
   (the stale `remaining-ts-errors.md` prescribed exactly this).
6. **Authorization inconsistency**: only ~5 of 30 admin routers use `adminProcedure`; 475 inline
   role checks; several admin procedures are `publicProcedure`; RBAC + rate-limit + session
   middleware are dead code; `systemHealth`/`adminEventSeed` mounted outside `admin.*`.
7. **Runtime bugs found**: `server/admin/aiContent.router.ts` writes to nonexistent
   `ai_editorial_feedback` table; `server/admin/aiContent.test.ts` is truncated mid-file;
   `generate-sitemaps.ts` references a nonexistent `sitemapGenerator.service.ts`; live favicons
   point at `/manus-storage/`; homepage sidebar CMS sections computed but never rendered;
   Companies/People/Investors/Accelerators pages client-filter a single server page.
8. **Brand coupling**: 13,171 `techscoop` lines across 802 files; four independent `BASE_URL`
   constants; `editorialBatchImport.service.ts` hard-rejects non-techscoop.io canonicals;
   emails default to `hello@techscoop.io`; Stripe coupon names carry the brand.
9. **Tests**: brand-coupled assertions, env-coupled imports (`JWT_SECRET` at import time), and
   mostly literal-assertion tests; talent/ads/ticketing untested.

## Projects entity — recommendation

Do **not** build a Projects subsystem now. At launch, projects (factories, airports, power plants,
data centers, developments) are representable as: articles + `article_companies` +
`article_locations` + industrial sector taxonomy + tags (e.g. `neom`, `riyadh-metro`). The entity
graph already surfaces coverage on company/location/sector pages. **Recommend Projects become a
first-class entity in Phase 2** (dedicated table + article/company/event/location relations +
`/projects/:slug`), reusing the moderation/claims/SEO machinery — the current architecture
accommodates it without rework.
