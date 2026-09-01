# Talent Platform — Manus Deploy Instructions

Branch: `claude/optimize-seo-architecture-bkeQo`
Target: `main` after type-check passes
Owner: maq@techbanq.net

This branch lands the full backend foundation for the Talent
Intelligence Platform: tenancy + Redis sessions (Phase 1), candidates,
ATS, GitHub Intelligence, Assessments, Matching, Tenant admin,
Compliance (Phases 2–8). It is **additive** — existing techscoop.io
behavior is unchanged because the legacy public path resolves
`tenantId = null` and never touches the new tables.

There is **no user-facing UI** in this drop. The branch is deploy-safe
to merge and then sit dormant while UI passes ship per phase.

---

## Step 0 — Verify before merge (5 min)

Run on the branch locally:

```bash
git fetch origin claude/optimize-seo-architecture-bkeQo
git checkout claude/optimize-seo-architecture-bkeQo
npm install
npm run check                                    # tsc --noEmit
node scripts/check-module-boundaries.mjs         # must say "8 modules OK"
```

**If `npm run check` fails:** fix the type errors before merging. Most
will be `as any` cast tightenings or missing optional chaining around
new tenant fields. Paste the error list into the next Claude session
and we'll close them in one pass.

**If `npm run check` passes:** safe to merge.

---

## Step 1 — Merge to main

Open the PR if not already open, get one review, squash-merge or
merge-commit (either is fine — branch has 6 logical commits). Tag the
merge commit as `talent-platform-backend-v1` for rollback reference.

```bash
git tag talent-platform-backend-v1
git push origin talent-platform-backend-v1
```

---

## Step 2 — Run migrations

Two new migrations, both additive:

```bash
# In the deploy environment:
npx drizzle-kit migrate
```

This applies, in order:

- `0044_tenants.sql` — `tenants`, `tenant_memberships`, `tenant_audit_log`;
  adds nullable `tenant_id` to `jobs` and `job_applications`.
- `0045_talent_platform.sql` — 28 new tables: candidates, ATS pipeline,
  GitHub intelligence, assessments, matching, billing, compliance.

**Rollback plan if a migration fails:** the migrations only add tables
and nullable columns. Dropping the new tables and the two `tenant_id`
columns reverts cleanly. Don't roll back unless you have to — every
new table is dormant without UI.

**Verify after migration:**

```sql
SHOW TABLES LIKE 'tenant%';                   -- 3 rows
SHOW TABLES LIKE 'candidate%';                -- 4 rows
SHOW TABLES LIKE 'assessment%';               -- 5 rows
SHOW TABLES LIKE 'github_%';                  -- 4 rows
SELECT COUNT(*) FROM candidates;              -- 0
SELECT COUNT(*) FROM tenants;                 -- 0 (we'll create the first one below)
DESCRIBE jobs;                                -- includes tenant_id
DESCRIBE job_applications;                    -- includes tenant_id, current_stage_id
```

---

## Step 3 — Install new runtime deps

```bash
npm install ioredis stripe
```

- `ioredis` — Phase 1c Redis session store. Lazy-loaded; without it
  sessions silently fall back to in-memory (dev mode).
- `stripe` — already used by the Events Hub. Re-listed here in case
  the package.json doesn't yet have it.

No other new deps. Qdrant, Judge0, GitHub, Greenhouse, Slack, and
OpenAI all use native `fetch` — no SDK installs needed.

---

## Step 4 — Provision infrastructure

These can all be provisioned in parallel.

### 4a. Redis (required for production sessions)

Any managed Redis works: Upstash, ElastiCache, Railway, Fly Redis,
Render Redis. Minimum: 100 MB, single region (we colocate with the
app).

```bash
# Once provisioned:
export REDIS_URL='redis://default:<password>@<host>:<port>'
```

Without `REDIS_URL`, sessions go to in-process memory and die on every
deploy. Acceptable for the first ~1 week if Redis isn't ready yet, but
fix before any real signups.

### 4b. Qdrant (required for matching/scoring)

Self-hosted in our cluster, per architecture ADR (Phase 6).

```bash
docker run -d --name qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v /var/lib/qdrant:/qdrant/storage \
  qdrant/qdrant:latest
```

```bash
export QDRANT_URL='http://qdrant:6333'
# Optional, recommended for prod:
export QDRANT_API_KEY='<generate-32-byte-hex>'
```

Without `QDRANT_URL` set, matching endpoints throw
`PRECONDITION_FAILED` to the client with a clear message — UI can
hide the match section gracefully.

### 4c. Judge0 (required for assessment code execution)

Self-hosted, per architecture ADR (Phase 5). Docker compose recipe is
in the Judge0 docs.

```bash
export JUDGE0_BASE_URL='http://judge0:2358'
export JUDGE0_API_KEY='<optional-auth-token>'
```

Without `JUDGE0_BASE_URL`, code-run requests throw `Judge0Error("not
configured")`. Multi-choice + LLM-graded short-answer questions still
work without Judge0.

### 4d. GitHub App (required for candidate GitHub Intelligence)

1. Create a new GitHub App at https://github.com/settings/apps/new
   - Permissions: Repository → Contents (read), Metadata (read);
     User → Email (read), Profile (read)
   - Webhook URL: `https://<your-domain>/api/webhooks/github` (not yet
     implemented — flag for next sprint)
   - Generate a webhook secret and a private key (download `.pem`)
2. Note the App ID, Client ID, Client Secret
3. Add the credentials to `integration_configs` (see Step 5)
4. Set the token-encryption key:

```bash
# Generate 64 hex chars (32 bytes):
openssl rand -hex 32
export GITHUB_TOKEN_ENC_KEY='<the-hex-above>'
```

**Critical:** without `GITHUB_TOKEN_ENC_KEY`, OAuth tokens fall back to
base64 storage with a loud `WARN_PHASE4_ENCRYPTION_TODO` log. Don't
ship to production candidates in that state — set the key first.

---

## Step 5 — Configure integrations via admin

The platform stores integration credentials in the `integration_configs`
table (same pattern Stripe + Resend use today). Configure via the
existing admin Integration Hub or insert directly. All examples are
`(integrationId, public_config, secrets)` triples.

### 5a. OpenAI (required for resume parsing + embeddings + AI grading)

Reuses the existing `ai-claude` integration record's secrets bag.
Add an `openaiApiKey` field:

```json
{
  "integrationId": "ai-claude",
  "secrets": {
    "openaiApiKey": "sk-..."
  }
}
```

Or as env var: `OPENAI_API_KEY=sk-...`

### 5b. Qdrant (already covered via env, but optionally configurable)

```json
{
  "integrationId": "qdrant",
  "publicConfig": { "baseUrl": "http://qdrant:6333" },
  "secrets": { "apiKey": "<optional>" }
}
```

### 5c. Judge0 (alternative to env var)

```json
{
  "integrationId": "judge0",
  "publicConfig": { "baseUrl": "http://judge0:2358" },
  "secrets": { "apiKey": "<optional>" }
}
```

### 5d. GitHub App

```json
{
  "integrationId": "github-app",
  "publicConfig": {
    "appId": "<from app settings>",
    "clientId": "<from app settings>"
  },
  "secrets": {
    "clientSecret": "<from app settings>",
    "privateKey": "<pem contents with newlines>",
    "webhookSecret": "<the webhook secret you set>"
  }
}
```

### 5e. Stripe Billing (subscription mode)

Reuses the existing `stripe-payments` config from Events Hub. Add the
`subscriptionPriceIds` mapping:

```json
{
  "integrationId": "stripe-payments",
  "publicConfig": {
    "publishableKey": "<existing>",
    "subscriptionPriceIds": {
      "starter": "price_1Abc...",
      "growth":  "price_1Def...",
      "enterprise": "price_1Ghi..."
    }
  }
}
```

Create the Stripe prices in the Stripe dashboard first; copy the
`price_xxx` ids in here.

### 5f. Slack (optional — recruiter notifications)

Two options:

**Platform-wide webhook** (one Slack workspace gets all events):

```json
{
  "integrationId": "slack-platform",
  "publicConfig": {
    "eventRouting": {
      "newApplication": "#hiring",
      "stageChange": "#hiring-pipeline",
      "offerAccepted": "#hiring-wins"
    }
  },
  "secrets": {
    "webhookUrl": "https://hooks.slack.com/services/..."
  }
}
```

**Per-tenant webhook** (each customer's own Slack):

```json
{
  "integrationId": "slack-tenant-<tenantId>",
  "secrets": {
    "webhookUrl": "https://hooks.slack.com/services/..."
  }
}
```

Per-tenant wins when both are configured.

### 5g. Greenhouse (per-customer, optional)

```json
{
  "integrationId": "greenhouse",
  "publicConfig": { "syncDirection": "import_only" },
  "secrets": { "apiKey": "<Greenhouse Harvest API key>" }
}
```

---

## Step 6 — Set DNS for tenant subdomains

Required for the multi-tenant routing to work.

1. Add a wildcard DNS record:
   ```
   *.techscoop.com  CNAME  <your-app-host>
   ```
2. Provision wildcard TLS — either:
   - Cloudflare in front (handles `*.techscoop.com` automatically), or
   - Caddy with `tls { on_demand }` for custom-domain tenants

Tenant subdomain resolution starts working immediately. The middleware
caches lookups for 60 s, so a freshly-created tenant is reachable
within 60 s without a restart.

---

## Step 7 — Bootstrap the first tenant

The platform is multi-tenant but starts with zero tenants. Create one
to test end-to-end.

Pick a super_admin user (someone in `users` with `role = 'admin'`),
then call the tenant CRUD via tRPC:

```bash
curl -X POST https://techscoop.com/api/trpc/tenants.create \
  -H 'Cookie: <super_admin session cookie>' \
  -H 'Content-Type: application/json' \
  -d '{
    "json": {
      "slug": "acme",
      "name": "Acme Corp",
      "plan": "starter",
      "dataResidency": "us",
      "trialDays": 14,
      "ownerUserId": <some user id>
    }
  }'
```

Verify: visit `https://acme.techscoop.com` — the tenant resolution
middleware should pin `tenantId = <acme-id>` on every tRPC request from
that host.

---

## Step 8 — Smoke test

After the first tenant exists, run these checks. All should succeed.

```bash
# 1. Legacy public job board still works (apex / null tenant)
curl 'https://techscoop.com/api/trpc/jobs.list?input={"json":{"page":1,"limit":5,"sortBy":"createdAt","sortOrder":"desc"}}'

# 2. Tenant resolution
curl 'https://acme.techscoop.com/api/trpc/tenants.myTenants' \
  -H 'Cookie: <tenant owner session>'

# 3. Candidate self-service
curl 'https://acme.techscoop.com/api/trpc/candidates.me' \
  -H 'Cookie: <any user session>'

# 4. Compliance: list policies for the new tenant (should be empty)
curl 'https://acme.techscoop.com/api/trpc/compliance.listPolicies?input={"json":{"tenantId":<acme-id>}}' \
  -H 'Cookie: <super_admin>'

# 5. Sessions persist across restart
# Sign in, restart the app, refresh — should still be logged in
# (only works if REDIS_URL is set)
```

Any 4xx/5xx from these is a deploy issue — usually env var missing or
migration not applied.

---

## Step 9 — Cron registration (do this within the first week)

Three jobs need to run on a schedule. They're exposed as admin tRPC
endpoints in this drop; wire them into `server/services/scheduler.service.ts`:

| Cron | Endpoint | Schedule |
|---|---|---|
| GitHub fetcher drain | `github.runFetchJobs` | every 5 min |
| Erasure executor | `compliance.processDueErasures` | hourly |
| Retention sweep | `compliance.processRetention` | daily at 03:00 UTC |

Until wired, the github fetcher queue accumulates and DSAR erasures
hang in 30-day grace forever. Not urgent for week 1, blocker by week 4.

---

## What's deferred (NOT in this drop)

Plan separate sessions for each.

1. **UIs** — recruiter dashboard, candidate portal, tenant admin,
   assessment taker, billing flow. Each is ~1 week.
2. **PII access log wiring** — `PII_ACCESS_LOG_TODO` markers planted
   across phase 2–6 services. Need actual `logPii()` calls. Half-day.
3. **Scheduler cron registration** — listed above.
4. **Email templates** — phase 3 sends interview/offer emails with
   inline strings; move to template files for branding.
5. **Slack event subscription** — `slackIntegration.service.ts` is
   ready to fire but ATS services don't yet call its `notifyStageChange`
   at the right moments.
6. **Greenhouse field mapping** — current sync is fetch-only; mapping
   Greenhouse rows → our tables needs per-customer rules.
7. **Webhook endpoints** — `/api/webhooks/github` and the Stripe
   subscription webhook handler need to be mounted on Express. The
   handlers exist; only the route registration is missing.
8. **Test suites** — unit + integration tests.

---

## Rollback procedures

**App rollback** (revert merge):
```bash
git revert <merge-commit> --mainline 1
git push origin main
```

The talent tables stay in the DB but become orphan; safe.

**Schema rollback** (rare — only if a column blocks something):

```sql
ALTER TABLE jobs DROP COLUMN tenant_id;
ALTER TABLE job_applications DROP COLUMN tenant_id, DROP COLUMN current_stage_id;
DROP TABLE candidate_erasure_requests, retention_policies, pii_access_log,
           tenant_billing_subscriptions, job_embeddings_meta,
           candidate_embeddings_meta, candidate_scores,
           plagiarism_reports, ai_interview_turns, ai_interview_sessions,
           assessment_code_runs, assessment_attempt_answers,
           assessment_attempts, assessment_questions, assessment_templates,
           github_fetch_jobs, github_signals, github_repos, github_profiles,
           recruiter_notes, offers, interview_feedback, interviews,
           candidate_stage_history, pipeline_stages,
           resume_parses, candidate_tenant_visibility, candidates,
           tenant_audit_log, tenant_memberships, tenants;
```

Update `drizzle/meta/_journal.json` to remove the 0044 and 0045 entries.

---

## Contacts

- Architecture questions: see `docs/TALENT_PLATFORM_ARCHITECTURE.md` (9 ADRs)
- Issues during deploy: paste error + relevant log lines into a new
  Claude session referencing this doc and the branch
  `claude/optimize-seo-architecture-bkeQo`

End of instructions.
