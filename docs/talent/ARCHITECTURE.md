# TechScoop Talent Intelligence Platform — Architecture Lock

Status: **Draft v1** — locked decisions, jobs-module cleanup, and revised phase plan.
Owner: maq@techbanq.net
Date: 2026-06-14

---

## Part 1 — Locked Decisions (ADRs)

Nine architectural questions resolved upfront. Each decision cascades into schema and module boundaries; revisit only on hard evidence.

### ADR-001 — Tenant routing: subdomain + optional custom domain

**Decision:** `<tenant>.techscoop.com` as the default. Tenants on a paid tier can map a custom domain (`careers.acme.com`) via CNAME.

**Why over alternatives:**
- **SEO**: Each tenant gets its own subdomain authority. Their job listings rank under their own brand, not buried under techscoop.com. Path-based (`techscoop.com/t/acme`) inherits techscoop's authority but the tenant brand is invisible in SERPs.
- **Cookies**: First-party cookies isolate per-tenant sessions cleanly. Path-based shares cookies across tenants — a security smell.
- **Marketing**: Custom domains are table stakes for B2B SaaS hiring sites.

**Implementation:**
- Wildcard DNS `*.techscoop.com` → same deploy.
- Tenant extraction middleware reads `Host` header → looks up `tenants.subdomain` or `tenants.customDomain`.
- Reserved subdomains: `www`, `api`, `admin`, `app`, `static`, `cdn`, `mail` (added to `RESERVED_SUBDOMAINS` const).
- Wildcard TLS via Caddy or Cloudflare (Manus infra decision — flag for ops).

---

### ADR-002 — Deploy topology: monolith with strict module boundaries

**Decision:** Single deploy now. Module boundaries enforced so jobs / candidates / assessments can be carved out later without rewrites.

**Rules:**
- All cross-module access goes through the module's **service layer**, never direct DB or router calls.
- Each module owns its tables (no other module writes to them).
- Module exports a typed service interface; consumers import only from `server/modules/<x>/index.ts`.
- Database FKs across modules are allowed for now but listed in `docs/MODULE_BOUNDARIES.md` so we know what to break first when splitting.

**Future-proofing:** When jobs needs to scale independently, swap the service-layer import for an HTTP/gRPC client — no router code changes.

---

### ADR-003 — Sessions: Redis-backed, durable

**Decision:** Redis-backed session store (replacing the current in-memory map). JWT rejected.

**Why:**
- In-memory sessions die on restart — unacceptable for SaaS where users expect to stay logged in across deploys.
- JWT can't be revoked server-side. For multi-tenant with role changes and termination flows, instant revocation matters more than statelessness.
- Manus has Redis available — no new infra cost.

**Implementation:**
- Existing `session.middleware.ts` keeps its interface; swap the backing store.
- Session payload: `{ userId, tenantId, role, csrfToken, expiresAt }`.
- 24h sliding window, 30-day max lifetime, max 5 concurrent sessions per user.

---

### ADR-004 — Jobs table: single table, nullable `tenantId`

**Decision:** Keep one `jobs` table. Add nullable `tenantId`. Legacy rows (current public news jobs) have `tenantId = NULL` and behave as the public job board.

**Why:**
- No data migration drama. Existing routes for `/jobs` continue to work.
- Tenant-scoped queries add `WHERE tenantId = ?`; public queries add `WHERE tenantId IS NULL`.
- Forking would double the surface area for one boolean's worth of logic.

**Index:** `(tenantId, status, publishedAt DESC)` covers both flows.

---

### ADR-005 — Candidates: new table, linked to users

**Decision:** New `candidates` table. One-to-one with `users` (a user becomes a candidate by uploading a resume or accepting an invite). Completely independent from `people` (which stays as a public-figure directory).

**Shape:**
```
candidates(
  id, userId (FK users), tenantId (nullable — multi-tenant visibility),
  resumeMediaId (FK media), parsedResumeJson, headline,
  yearsExperience, currentTitle, currentCompany, location,
  openToRemote, openToRelocation, salaryExpectationMin/Max/Currency,
  visaStatus, noticePeriod, githubHandle, linkedinUrl, portfolioUrl,
  consentMarketingAt, consentDataProcessingAt,
  createdAt, updatedAt, lastActiveAt
)
```

A candidate can be visible to multiple tenants via `candidate_tenant_visibility(candidateId, tenantId, source)`.

---

### ADR-006 — Coding sandbox: Judge0 (self-hosted)

**Decision:** Judge0 self-hosted in our infra. Not in-house, not commercial.

**Why:**
- Building a secure code-execution sandbox is its own product. 3+ months minimum, ongoing CVE liability.
- CodeSignal / HackerRank are $$$ and lock pricing per-seat.
- Judge0 is open source, AGPL, mature, used by many ed-tech products. Runs in Docker, isolates via gVisor/firecracker.

**Trade-off:** AGPL means if we modify Judge0 source we must publish. We won't — we'll run it as a service behind an internal API.

**Languages day 1:** Python, JavaScript/TypeScript, Java, Go, C++, SQL.

---

### ADR-007 — Embedding store: Qdrant (self-hosted)

**Decision:** Qdrant as a sidecar service. Not pgvector (would require a Postgres migration — huge, out of scope). Not Pinecone (paid, hosted, vendor lock).

**Why:**
- We're on MySQL. pgvector means migrating the whole DB — multi-month effort for one feature.
- Qdrant is open-source, Rust, fast, hybrid search (vector + metadata filter), runs in Docker.
- Self-hosted fits the "proper infra on Manus" direction.

**Usage:** Job description embeddings + candidate profile embeddings. Top-K cosine on tenant-scoped collections.

**Embedding model:** OpenAI `text-embedding-3-small` (cheap, good, 1536 dims) via the existing `llmProvider.service.ts`. Configurable per tenant later.

---

### ADR-008 — GitHub Intelligence: GitHub App + background fetcher

**Decision:** Register a GitHub App. Candidates authorize it during onboarding. Use the App's installation tokens for fetches.

**Why over anonymous / per-user OAuth:**
- Anonymous: 60 req/hr — useless at scale.
- Per-user OAuth: 5,000 req/hr per user, but token refresh and revocation become our problem.
- GitHub App: 15,000 req/hr per installation, plus webhooks (push, PR, repo events) without polling.

**Implementation:**
- BullMQ queue with Redis backing (Redis already in for sessions — reuse).
- Worker fetches repos, languages, commit cadence, PR contributions, languages by LoC.
- LLM-scored "engineering signals" summary cached for 24h.

---

### ADR-009 — Compliance: GDPR + PDPL + CCPA from day 1

**Decision:** Build for all three. Cheaper to bake in now than retrofit.

**Required from Phase 1:**
- Audit log on every read of candidate PII (`pii_access_log`).
- Right-to-erasure flow (soft-delete with 30-day grace, hard-delete after).
- Data export (DSAR) — JSON dump of everything tied to a candidate.
- Consent capture on candidate signup (separate flags for marketing, data processing, third-party sharing).
- Data residency flag per tenant (EU / US / KSA) — Phase 8 enforces actual residency; schema captures it now.
- Retention policy table per tenant (default 24 months after last activity).

---

## Part 2 — Jobs Module Cleanup (microservice-ready)

**Current state:** Two router files, 1,862 lines total, doing DB queries inline. No service layer. Direct schema imports scattered.

**Target state:** Clean module boundary so jobs can be carved out as a service later without touching consumers.

### Refactor plan

```
server/modules/jobs/
├── index.ts                    ← public exports (services, types) — the contract
├── jobs.router.ts              ← thin tRPC layer, validates + calls service
├── jobApplications.router.ts   ← thin tRPC layer
├── services/
│   ├── jobs.service.ts         ← all DB writes/reads for jobs
│   ├── jobApplications.service.ts
│   ├── jobSearch.service.ts    ← list/filter/search (heaviest queries)
│   └── jobAnalytics.service.ts ← clicks, view counts, application count
├── repositories/
│   ├── jobs.repository.ts      ← raw Drizzle queries, no business logic
│   └── jobApplications.repository.ts
├── types.ts                    ← module-internal types
└── tenant.guard.ts             ← every service entry takes tenantId, enforces scope
```

### Cleanup rules

1. **No router does DB work.** Routers validate input, call a service, format output.
2. **Services are tenant-aware.** Every public service method takes `tenantId: number | null` (null = public job board). The guard rejects cross-tenant access.
3. **No module imports `jobs` table directly outside this folder.** Add an ESLint rule + CODEOWNERS entry.
4. **Single source of truth for types.** `JobDTO`, `JobApplicationDTO` exported from `types.ts`; consumers import those, not the Drizzle row types.
5. **Microservice path:** When we extract, `index.ts` becomes an HTTP client; everything else stays put.

### Concrete deletions/consolidations on the refactor pass

From the current routers, expected consolidations:
- The 30+ inline `slugService.generateUniqueSlug("job", ...)` calls move into `jobs.service.createJob()`.
- `workflowService` calls (status transitions) move into `jobs.service.transitionStatus()`.
- Filter logic in `listJobsSchema`/`list` procedure moves into `jobSearch.service.search()` with a single typed `JobSearchQuery`.
- Counter updates (`viewCount`, `applicationCount`) move into `jobAnalytics.service.*` so we can swap to event-based later.

### Effort estimate

1.5 weeks. Pure refactor — same behavior, same tests. Add tenant-scoping guards as scaffolding (default `tenantId = null` everywhere until Phase 1 adds the column).

---

## Part 3 — Revised Phase Plan

Phase 0 is now this document. Phase 0.5 is the jobs cleanup. Then the Talent Platform work begins on a clean base.

| Phase | Weeks | Scope |
|-------|-------|-------|
| 0 | done | Architecture lock (this doc) |
| 0.5 | 1.5 | Jobs module cleanup → service-layer boundary |
| 1 | 2 | Tenants + Redis sessions + tenant-scoped RBAC + tenant memberships |
| 2 | 2 | Candidate core: `candidates` table, resume upload, LLM resume parser, candidate self-service |
| 3 | 2 | ATS pipeline: stages, history, bulk actions, recruiter notes, email templates |
| 4 | 2 | GitHub Intelligence: GitHub App + BullMQ workers + signals summary |
| 5 | 3 | Assessment engine: Judge0 sandbox + question bank + AI interview |
| 6 | 2 | Scoring + Matching: composite score + Qdrant embeddings + top-K matching |
| 7 | 2 | Recruiter / employer / admin dashboards + Greenhouse + Slack |
| 8 | 1 | Compliance hardening: DSAR flow, residency, load tests |
| **Total** | **~17.5 weeks** | |

Compliance hooks (audit log, consent capture, soft-delete) get added in the phase that introduces the data — not deferred to Phase 8. Phase 8 is the formal review + the residency enforcement.

---

## Part 4 — What I need from you to start Phase 0.5

1. **Confirm:** Start with the jobs module cleanup, or do tenants first? Cleanup first is safer (clean base for tenant scoping), but adds 1.5 weeks before any new feature lands.
2. **Manus ops confirm:** Redis available, Qdrant containerized, Judge0 containerized, GitHub App registration approved.
3. **One product call:** What's the tenant pricing tier where custom domain unlocks? (Affects feature-flag plumbing in tenant model.)

Once you confirm #1, I'll open a branch for the jobs cleanup and start.
