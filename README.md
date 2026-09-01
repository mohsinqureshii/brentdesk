# BrentDesk — Industry Media Platform

BrentDesk is a professional publication covering the physical economy — construction,
infrastructure, energy, manufacturing, logistics, transportation, mining, utilities and
industrial technology — across Saudi Arabia, the GCC, MENA and connected global markets.

This repository is the full platform: public site, admin CMS, editorial workflow,
entity graph (articles ↔ companies ↔ people ↔ events ↔ jobs ↔ geography ↔ sectors),
advertising engine, newsletter, SEO engine, and AI editorial tooling.

## Publication identity

The publication's identity (name, domain, emails, socials, bot user-agents, assets)
is centralized in **`shared/publication.ts`** — services, SEO, emails, AI prompts and
UI consume it from there. The AI editorial mandate (sectors, scoring rubric, house
style) lives in **`server/config/editorial.ts`**. Changing the publication means
changing those two files plus `client/index.html` (static shell) and the assets in
`client/public/assets/`.

## Tech stack

- **Backend:** Node.js 22, Express, TypeScript, tRPC 11
- **Frontend:** React 19, Vite 7, Tailwind CSS 4, shadcn/ui, wouter
- **Database:** MySQL 8 with Drizzle ORM
- **Cache:** Redis 7 (optional)
- **Storage:** S3-compatible (R2, AWS S3, MinIO)
- **Auth:** JWT cookie sessions, RBAC

## Project structure

```
brentdesk/
├── client/                  # React frontend (public site + admin CMS)
│   ├── src/pages/public/    # Public pages
│   ├── src/pages/admin/     # Admin CMS pages
│   └── public/assets/       # Brand assets (logo, icons, OG image)
├── server/
│   ├── _core/               # Framework core: entry, auth, SSR, tRPC
│   ├── modules/             # Domain modules (news, companies, people, events, jobs…)
│   ├── admin/               # Admin tRPC routers
│   ├── services/            # Shared services (SEO, workflow, media, AI…)
│   ├── config/              # Editorial identity for AI systems
│   └── routes/              # Express routes (sitemaps, webhooks, feeds)
├── shared/                  # Isomorphic code, incl. publication.ts
├── drizzle/                 # Database schema + migrations
├── scripts/                 # Build scripts (prerender, sitemaps) + seeds
└── docs/                    # Documentation (see docs/brentdesk/)
```

## Getting started

Prerequisites: Node.js 22+, pnpm 10+, MySQL 8+, Redis 7+ (optional).

```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET at minimum
pnpm db:push                # apply database migrations
pnpm tsx scripts/seed-brentdesk.ts   # bootstrap system data (roles, workflow, taxonomy)
pnpm dev                    # start the dev server
```

Production build and run:

```bash
pnpm build
pnpm start
```

Checks:

```bash
pnpm check                  # TypeScript
pnpm test                   # vitest
```

The test suite reports **zero failures with or without infrastructure** — suites that
need something they cannot reach are skipped, not failed. Coverage scales with what is
provisioned:

| Provisioned | Coverage |
|---|---|
| `DATABASE_URL` + `REDIS_URL` + the app running on :3000 | full suite |
| `DATABASE_URL` only | everything except the HTTP-level SEO suite |
| nothing | pure unit/schema tests only |

For the full run: start MySQL and Redis, apply migrations, seed, run `pnpm dev`, then
`DATABASE_URL=… REDIS_URL=… pnpm test`.

## Deploying

The app is a single Node process serving the API and the built client. It needs
MySQL; Redis is optional.

**Required environment variables**

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:port/db` |
| `JWT_SECRET` | long random string |
| `BASE_URL` | **the public URL of the deployment** — canonicals, sitemaps, RSS and OG tags are generated from it. Without it they fall back to `publication.siteUrl` in `shared/publication.ts`, which will be wrong on a platform-generated subdomain. |
| `PORT` | supplied automatically by most platforms; the app binds to it exactly |

See `.env.example` for the full optional set (S3/R2 media, Resend email, Stripe,
AI providers, analytics).

**Build and start**

```bash
pnpm install --frozen-lockfile
pnpm build      # client + server bundle; no database needed
pnpm start      # node dist/index.js
```

`pnpm build` deliberately does **not** touch the database, so an image build
succeeds even where the database is unreachable from the builder. Sitemaps and
feeds are produced at runtime; to also prerender static article HTML at build
time (optional, needs a reachable database) set `PRERENDER_ON_BUILD=1`.

**First deploy**

1. Provision MySQL and set the variables above.
2. Start the app — it applies migrations automatically against an empty database.
3. Seed system data once (categories, sectors, roles, ad slots, homepage
   sections, and an admin login):
   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' pnpm seed
   ```
4. Sign in at `/admin/login`.

The seed is idempotent and inserts no editorial content. A Dockerfile is
included if you prefer a container build over a buildpack.

## Documentation

- `docs/brentdesk/BASELINE.md` — state of the codebase at migration start
- `docs/brentdesk/MIGRATION_INVENTORY.md` — subsystem inventory and decisions
- `docs/admin/SQUARE_DESIGN_SPEC.md` — admin design system
- `docs/talent/` — talent platform architecture (admin-only capability)
