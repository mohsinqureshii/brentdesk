# Manus — Talent Platform full deploy runbook

This is the single source of truth for deploying the Talent Platform from
the current branch to production. Follow every step in order. Each step
includes the exact command, the expected success output, and what to do
when it fails.

Target audience: a competent operator who has SSH access to the techscoop
host, admin access to the techscoop GitHub repo, and a Stripe + Slack
account. Most steps take 5–30 minutes. The whole thing is a 6–8 hour day
if everything runs first time.

**Branch:** `claude/optimize-seo-architecture-bkeQo`
**Target merge:** `main`
**State:** type-clean, boundary-clean, additive over current main

---

## Section 0 — Before you start

### 0.1 What you need

- SSH access to the techscoop host (the box that serves techscoop.com)
- Admin access to `mohsinqureshii/techscoop-main` on GitHub
- Stripe account with API keys (test mode at minimum)
- Ability to create DNS records for `techscoop.com`
- Ability to register a GitHub App
- An email address to receive test emails (Resend domain already configured)
- About 90 minutes of uninterrupted time for Steps 1–5; the rest you can
  do over a day or split across sessions

### 0.2 What this drop adds

| Capability | Status before | Status after |
|---|---|---|
| Multi-tenant SaaS (subdomains, memberships, plans) | N/A | Live |
| Candidate profiles + resume parsing | N/A | Live |
| Recruiter pipeline + kanban | N/A | Live |
| Interview scheduling + feedback | N/A | Live |
| Offer drafting + status flow | N/A | Live |
| GitHub Intelligence (candidate repos + signals) | N/A | Live |
| Coding + AI assessments | N/A | Live |
| Resume↔job matching (semantic) | N/A | Live |
| Stripe subscription billing for tenants | One-shot only (Events) | Subscription mode added |
| GDPR/PDPL/CCPA compliance (DSAR + erasure + retention) | N/A | Live |
| Reports/analytics dashboard | N/A | Live |
| Cookie consent banner + Terms + Privacy pages | N/A | Live |
| PII access audit log | N/A | Live |
| Email templates externalized | Inline strings | 5 templated emails |
| Background crons (github queue + erasure + retention) | N/A | Live |
| Two webhook handlers (Stripe Billing + GitHub App) | N/A | Live |
| Talent Hub job overview (`/admin/talent/jobs`) | N/A | Live |
| Existing techscoop.io news/events/jobs | All working | Unchanged |

### 0.3 The 14 things Manus owns end-to-end

| # | Item | Time |
|---|---|---|
| 1 | Verify the branch type-checks | 5m |
| 2 | Merge branch to main | 5m |
| 3 | Run 3 migrations | 5m |
| 4 | npm install picks up new deps | 5m |
| 5 | Provision Redis | 30m |
| 6 | Provision Qdrant (Docker) | 30m |
| 7 | Provision Judge0 (Docker) | 60m |
| 8 | Set env vars | 10m |
| 9 | Wildcard DNS + TLS | 30m |
| 10 | Configure 7 integrations via the Integration Hub UI | 60m |
| 11 | Register Stripe Billing + GitHub App webhook URLs | 15m |
| 12 | Bootstrap legacy jobs view | 5m |
| 13 | (Optional) Bootstrap first SaaS tenant | 10m |
| 14 | Smoke test + scheduler verify | 30m |

---

## Section 1 — Verify and merge the branch

### 1.1 Pull the branch locally

```bash
git fetch origin
git checkout claude/optimize-seo-architecture-bkeQo
git pull origin claude/optimize-seo-architecture-bkeQo
```

Expected: HEAD at the latest commit (look for the most recent commit
mentioning "Fix legacy-jobs visibility").

### 1.2 Install deps including the new ones

The talent platform added two lazy-loaded deps (`pdf-parse`, `mammoth`)
for PDF/DOCX resume extraction, plus the existing `ioredis` and `stripe`
that earlier rounds added.

```bash
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is required because `react-helmet-async` declares
React 18 as a peer but we're on React 19. Existing convention.

Expected: completes with `added N packages` and warnings (no errors).

### 1.3 Type-check

```bash
npm run check
```

Expected: **0 errors**. Output ends cleanly with no `error TS` lines.

If errors appear: open a new Claude session, paste the entire error
list with file:line refs. Do NOT merge until clean.

### 1.4 Module boundary check

```bash
node scripts/check-module-boundaries.mjs
```

Expected: `Module boundaries OK — 8 module(s) checked, no violations.`

If it fails, a service is reaching into another module's internals.
Paste the violations into a Claude session.

### 1.5 Merge to main

Either via PR (recommended for audit trail) or fast-forward. Either is fine.

PR route:

```bash
# Visit GitHub UI and open PR from the branch to main
# Title: "Talent Platform v2 — deploy-ready"
# Body: link to docs/MANUS_TALENT_PLATFORM_COMPLETE.md
# Squash-merge or merge-commit, your choice
```

Fast-forward route:

```bash
git checkout main
git pull
git merge --ff-only claude/optimize-seo-architecture-bkeQo
git push origin main
```

### 1.6 Tag the merge

```bash
git tag talent-platform-v2
git push origin talent-platform-v2
```

This lets you roll back later with `git reset --hard talent-platform-v2~1`
or revert the merge.

---

## Section 2 — Run the migrations

### 2.1 Three migrations in order

The Talent Platform ships three additive migrations:

| # | File | What it does |
|---|---|---|
| 0044 | `0044_tenants.sql` | Adds `tenants`, `tenant_memberships`, `tenant_audit_log` + nullable `tenant_id` columns on `jobs` and `job_applications` |
| 0045 | `0045_talent_platform.sql` | Adds 28 talent tables (candidates, ATS, GitHub, assessments, matching, billing, compliance) |
| 0046 | `0046_pipeline_stages_nullable_tenant.sql` | Makes `pipeline_stages.tenant_id` nullable so legacy public jobs can have a default pipeline too |

### 2.2 Run

```bash
npx drizzle-kit migrate
```

Expected: three "applying ... 0044_tenants", "applying 0045_talent_platform",
"applying 0046_pipeline_stages_nullable_tenant" lines, then "Done".

### 2.3 Verify schema in MySQL

```sql
USE techscoop;

-- Phase 1a tables (3)
SHOW TABLES LIKE 'tenant%';
-- Expect: tenants, tenant_memberships, tenant_audit_log

-- Phase 2-8 tables (28)
SHOW TABLES LIKE 'candidate%';
SHOW TABLES LIKE 'pipeline%';
SHOW TABLES LIKE 'interview%';
SHOW TABLES LIKE 'github_%';
SHOW TABLES LIKE 'assessment%';
SHOW TABLES LIKE 'ai_interview%';
SHOW TABLES LIKE 'offer%';
SHOW TABLES LIKE 'recruiter_notes';
SHOW TABLES LIKE 'pii_access_log';

-- jobs.tenant_id column added
SHOW COLUMNS FROM jobs WHERE field = 'tenant_id';
-- Expect: int, YES (Null = YES)

-- job_applications.tenant_id + current_stage_id
SHOW COLUMNS FROM job_applications WHERE field IN ('tenant_id', 'current_stage_id');
-- Expect: both rows, both nullable

-- 0046 — pipeline_stages.tenant_id now nullable
SHOW COLUMNS FROM pipeline_stages WHERE field = 'tenant_id';
-- Expect: int, YES (Null = YES) — without this, super-admin can't seed
-- a pipeline for legacy jobs and the kanban stays empty
```

If any of those don't return the expected row, the migrations didn't run
cleanly. Re-run `npx drizzle-kit migrate` and check the drizzle journal:

```bash
cat drizzle/meta/_journal.json | tail -30
# Last three idx should be 44, 45, 46
```

---

## Section 3 — Provision external services

These are independent — provision in parallel if you have help. All
three are required for full functionality; the platform gracefully
degrades without them but loses features.

### 3.1 Redis (durable sessions, github fetch queue, rate limits)

Any managed Redis works. Minimums:

- 100 MB memory
- Single region (colocated with the app)
- Persistence enabled (RDB or AOF — both fine)
- TLS connection recommended (no extra config; ioredis handles it)

Provider options:

| Provider | Notes |
|---|---|
| Upstash | Cheapest, REST option not needed (use Redis protocol) |
| ElastiCache | If you're already on AWS |
| Railway | Free tier works for testing |
| Fly Redis | Simple if you're on Fly |
| Render Redis | Simple if you're on Render |
| Self-hosted on the app box | Cheapest at small scale: `docker run -d --name redis --restart unless-stopped -p 6379:6379 -v redis-data:/data redis:7-alpine redis-server --appendonly yes` |

Once provisioned, copy the connection URL. It looks like:

```
redis://default:<password>@<host>:<port>
rediss://default:<password>@<host>:<port>    # TLS variant
```

You'll set this as `REDIS_URL` in Section 4.

**Verify locally before deploying:**

```bash
docker run --rm redis:7-alpine redis-cli -u 'redis://...' PING
# Expect: PONG
```

### 3.2 Qdrant (vector matching for resume↔job similarity)

Self-host per architecture ADR. Docker is the easiest:

```bash
docker run -d \
  --name qdrant \
  --restart unless-stopped \
  -p 6333:6333 -p 6334:6334 \
  -v /var/lib/qdrant:/qdrant/storage \
  -e QDRANT__SERVICE__API_KEY="<your-32-byte-hex-secret>" \
  qdrant/qdrant:latest
```

Generate the API key:

```bash
openssl rand -hex 32
# copy the output; you'll use it twice — once in the docker run above,
# once in Section 10's integration config
```

**Verify Qdrant is up:**

```bash
curl -H 'api-key: <your-key>' http://localhost:6333/healthz
# Expect: "healthz check passed"

curl -H 'api-key: <your-key>' http://localhost:6333/collections
# Expect: {"result":{"collections":[]},"status":"ok",...}
```

**Persistence note:** `/var/lib/qdrant` is the volume mount; back this up
to S3 nightly. Losing it means re-embedding every candidate + job.

**Capacity sizing:** 1,536-dim vector (OpenAI text-embedding-3-small) is
~6 KB per point. 10,000 candidates + 1,000 jobs = ~70 MB. Don't overprovision.

### 3.3 Judge0 (coding assessment execution)

Judge0 is the heaviest of the three to set up because it needs gVisor
isolation. Use the official docker-compose:

```bash
mkdir -p /opt/judge0
cd /opt/judge0
wget https://github.com/judge0/judge0/releases/download/v1.13.1/judge0-v1.13.1.zip
unzip judge0-v1.13.1.zip
cd judge0-v1.13.1

# Generate secrets
echo "REDIS_PASSWORD=$(openssl rand -hex 16)" > judge0.conf
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> judge0.conf
echo "AUTHN_HEADER=X-Auth-Token" >> judge0.conf
echo "AUTHN_TOKEN=$(openssl rand -hex 32)" >> judge0.conf

docker-compose up -d db redis
sleep 10
docker-compose up -d
```

**Verify Judge0 is up:**

```bash
curl -H "X-Auth-Token: <token-from-above>" http://localhost:2358/system_info
# Expect: JSON with cpu/memory info
```

**Resource sizing:** Judge0 spawns a sandbox per submission. Start with
4 CPU cores + 8 GB RAM. Scale up if assessment volume grows.

**Network:** Judge0 needs outbound access to fetch the language runtimes
on first boot (~3 GB download). After that, no outbound needed.

---

## Section 4 — Set environment variables

These are required on the app box (Manus deploy target). Put them in
your usual config mechanism (systemd EnvironmentFile, .env, Dokku
config:set, etc.).

### 4.1 Required for production

```bash
# Sessions — without it, in-memory fallback, sessions die on restart
export REDIS_URL='redis://default:<password>@<host>:<port>'

# Matching — without it, /admin/talent/candidates/:id match panel empty
# and recruiter "top candidates" returns PRECONDITION_FAILED cleanly
export QDRANT_URL='http://qdrant:6333'
export QDRANT_API_KEY='<your-qdrant-key>'

# Code execution — without it, coding assessments show "not configured"
export JUDGE0_BASE_URL='http://judge0:2358'
export JUDGE0_API_KEY='<your-judge0-auth-token>'

# GitHub OAuth token encryption — without it, base64 fallback with
# WARN_PHASE4_ENCRYPTION_TODO log. Don't ship to real candidates without.
export GITHUB_TOKEN_ENC_KEY="$(openssl rand -hex 32)"

# Embeddings — the OpenAI key. Can ALSO go in integrationConfigs
# (Section 10.1) — env wins if both set.
export OPENAI_API_KEY='sk-...'

# Stripe — these can ALSO go in integrationConfigs (Section 10.2)
export STRIPE_SECRET_KEY='sk_live_...'
export STRIPE_WEBHOOK_SECRET='whsec_...'
```

### 4.2 Optional

```bash
# Redis fallback knob — if you skip Section 3.1, sessions go to in-memory
# (acceptable for week 1, blocker by week 2). Don't set REDIS_URL.

# NODE_ENV — must be 'production' for crons to run
export NODE_ENV='production'
```

### 4.3 Restart the app and verify env

```bash
sudo systemctl restart techscoop          # or: docker-compose restart app
journalctl -u techscoop -f --since '2 minutes ago'
# Watch for:
#   [SessionStore] connected to Redis
#   (no WARN_PHASE4_ENCRYPTION_TODO lines)
```

If you see `[SessionStore] REDIS_URL not set — using in-memory store`,
the env var didn't reach the app. Check your config mechanism.

---

## Section 5 — Wildcard DNS + TLS

Multi-tenant means every SaaS tenant gets a subdomain like
`acme.techscoop.com`. The DNS + TLS setup is the same regardless of
tenant.

### 5.1 DNS

Add a wildcard CNAME at your DNS provider:

```
*.techscoop.com   CNAME   techscoop.com.   (TTL 300)
```

Or A record if you don't use CNAME:

```
*.techscoop.com   A   <app-public-ip>   (TTL 300)
```

Verify:

```bash
dig +short acme.techscoop.com
# Expect: same IP as techscoop.com
```

### 5.2 TLS — Cloudflare path (recommended)

If techscoop.com is already proxied through Cloudflare:

1. Cloudflare's wildcard cert covers `*.techscoop.com` automatically
2. Make sure SSL/TLS mode is "Full (strict)"
3. Edge Certificates → Universal SSL should show `*.techscoop.com`

Done. Test:

```bash
curl -I https://anything.techscoop.com/api/health
# Expect: HTTP/2 200 with valid cert
```

### 5.3 TLS — Caddy path (if not on Cloudflare)

If you're using Caddy as the reverse proxy:

```caddy
*.techscoop.com {
  tls {
    on_demand
  }
  reverse_proxy app:3000
}

# Required for on_demand:
{
  on_demand_tls {
    ask https://techscoop.com/api/tls-check
  }
}
```

Add an endpoint in your app (or a static allowlist) at `/api/tls-check`
that returns 200 only for valid tenant subdomains so Caddy doesn't issue
certs for arbitrary `random.techscoop.com` requests.

### 5.4 Custom domains (paid tier feature)

When a customer wants `careers.acme.com` instead of `acme.techscoop.com`:

- They add a CNAME `careers.acme.com → techscoop.com` at their DNS
- You verify reachability
- You enter the custom domain in the tenant's settings (Section 13)
- Caddy `on_demand` issues a cert automatically (Cloudflare path needs
  Cloudflare for SaaS or a workaround)

Don't worry about this on day 1; it's a follow-up.

---

## Section 6 — Configure the 7 integrations

The platform exposes a single admin page at `/admin/integrations` for
configuring every external service. No SQL inserts required.

### 6.1 Sign in as admin

Open `https://techscoop.com/admin/login` and sign in with an admin
account (role = 'admin' in the `users` table).

Visit `/admin/integrations`. You should see a grid of 7 cards under
"Talent Platform":

- ai-claude
- stripe-payments
- github-app
- qdrant
- judge0
- slack-platform
- greenhouse

Plus any pre-existing TechScoop integrations (Resend, Stripe events,
etc.) under their own category.

### 6.2 ai-claude — REQUIRED

Click "Configure" on the ai-claude card.

| Field | Type | Value |
|---|---|---|
| anthropicApiKey | Secret | `sk-ant-...` (your existing Anthropic key, may already be set) |
| openaiApiKey | Secret | `sk-...` (NEW — needed for embeddings) |

Click Save. Click Test — should respond "OK" or similar. If "no test logic
registered", that's the deferred follow-up #6 from Section 17; not a blocker.

**Why both?** Anthropic Claude does resume parsing + AI grading + AI
interview. OpenAI does embeddings (`text-embedding-3-small`, 1536 dim).
Splitting providers gives best-in-class for each task.

### 6.3 stripe-payments — REQUIRED (covers events + billing)

| Field | Type | Value |
|---|---|---|
| publishableKey | Public | `pk_live_...` |
| secretKey | Secret | `sk_live_...` (already set if Events Hub works) |
| webhookSecret | Secret | `whsec_...` (already set if Events Hub works) |
| subscriptionPriceIds | Public | JSON object — see below |

For `subscriptionPriceIds`:

1. Go to https://dashboard.stripe.com/products
2. Create three subscription products (or use existing):
   - "TechScoop Talent Starter" — $XXX/seat/month
   - "TechScoop Talent Growth" — $XXX/seat/month
   - "TechScoop Talent Enterprise" — custom pricing or fixed
3. Copy each product's price ID (`price_xxx`)
4. Enter as:
   ```json
   {
     "starter": "price_xxx",
     "growth": "price_yyy",
     "enterprise": "price_zzz"
   }
   ```

### 6.4 github-app — REQUIRED for candidate GitHub Intelligence

Two parts: register the app on GitHub, then enter credentials in the
Integration Hub.

#### 6.4.1 Register the GitHub App

1. Open https://github.com/settings/apps/new
2. Fill the form:
   - **GitHub App name:** "TechScoop Talent" (or whatever)
   - **Homepage URL:** `https://techscoop.com`
   - **Callback URL:** `https://techscoop.com/api/auth/github/callback`
   - **Webhook URL:** `https://techscoop.com/api/webhooks/github`
   - **Webhook secret:** generate with `openssl rand -hex 32` — save it
3. **Permissions:**
   - Repository → Contents → Read-only
   - Repository → Metadata → Read-only
   - Account → Email addresses → Read-only
   - Account → Profile → Read-only
4. **Subscribe to events:** Push, Pull request, Installation
5. **Where can this GitHub App be installed?** Any account
6. Create

After creation:

7. Note the **App ID** (top of the app's settings page)
8. Note the **Client ID** (under "OAuth credentials")
9. Click **Generate a new client secret** — save the value
10. Click **Generate a private key** — downloads a `.pem` file. Save it.

#### 6.4.2 Enter credentials in Integration Hub

Back at `/admin/integrations`, click "Configure" on github-app:

| Field | Type | Value |
|---|---|---|
| appId | Public | The integer from step 7 |
| clientId | Public | From step 8 |
| clientSecret | Secret | From step 9 |
| privateKey | Secret | Open the `.pem` file in a text editor and paste the entire contents including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines |
| webhookSecret | Secret | The value from step 2 |

Save. Click Test — currently falls through to "no test logic registered"
(deferred follow-up #6); not a blocker.

### 6.5 qdrant — REQUIRED for matching

| Field | Type | Value |
|---|---|---|
| baseUrl | Public | `http://qdrant:6333` (your Qdrant URL — internal network is fine if app + qdrant share a Docker network) |
| apiKey | Secret | The key you set in Section 3.2 |

Save. Click Test — currently no-op; verify manually:

```bash
curl -H 'api-key: <key>' http://qdrant:6333/healthz
# Expect: "healthz check passed"
```

### 6.6 judge0 — REQUIRED for coding assessments

| Field | Type | Value |
|---|---|---|
| baseUrl | Public | `http://judge0:2358` |
| apiKey | Secret | The AUTHN_TOKEN value from Section 3.3 |

Save.

### 6.7 slack-platform — OPTIONAL but recommended

Create an Incoming Webhook in your Slack workspace:

1. Go to https://api.slack.com/apps → Your Apps → Create New App → From scratch
2. Name: "TechScoop Talent" — pick your workspace
3. Add feature → Incoming Webhooks → Activate
4. Add New Webhook to Workspace → Pick a channel like `#hiring`
5. Copy the webhook URL — looks like `https://hooks.slack.com/services/T.../B.../...`

Back at the Integration Hub:

| Field | Type | Value |
|---|---|---|
| webhookUrl | Secret | The URL from step 5 |
| eventRouting | Public | JSON below |

eventRouting:

```json
{
  "newApplication": "#hiring",
  "stageChange": "#hiring-pipeline",
  "offerAccepted": "#hiring-wins"
}
```

If you only have one channel, repeat the same name. Empty string falls
back to the webhook's default channel.

### 6.8 greenhouse — OPTIONAL, per-customer

Skip unless a customer is migrating from Greenhouse. When you have one:

| Field | Type | Value |
|---|---|---|
| apiKey | Secret | The customer's Greenhouse Harvest API key |
| syncDirection | Public | `import_only` (only option for now) |

---

## Section 7 — Register external webhook URLs

Two webhooks need to be registered at the provider, not just at the app.

### 7.1 Stripe Billing webhook

The Events Hub already uses `/api/webhooks/stripe` for one-shot ticket
checkout. Subscription events go to a new endpoint.

1. https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. **Endpoint URL:** `https://techscoop.com/api/webhooks/stripe-billing`
4. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Signing secret:** copy the value; it's the same `STRIPE_WEBHOOK_SECRET`
   as the events one (both webhooks share the same Stripe secret in the
   current setup). If you want them separate, configure two distinct
   webhook secrets and adjust the env var.

Test from Stripe CLI:

```bash
stripe trigger customer.subscription.created
# Watch the app logs for:
#   [StripeBilling] received customer.subscription.created evt_...
```

### 7.2 GitHub App webhook

You already entered the webhook URL when creating the GitHub App in
Section 6.4.1. To verify it's reachable:

1. https://github.com/settings/apps/<your-app> → Advanced
2. Look at "Recent Deliveries"
3. Click any to see the response code
4. If 401: webhook secret mismatch — recheck Section 6.4.2 webhookSecret field
5. If 404: route not mounted; check `server/_core/index.ts` mounts
   `mountGithubAppWebhook(app)`

You can also click "Redeliver" on any delivery to retry.

---

## Section 8 — Bootstrap legacy jobs view

This is the step that fixes "I'm super-admin and don't see any jobs in
the talent hub."

1. Sign in as admin on apex: `https://techscoop.com/admin/login`
2. Visit `https://techscoop.com/admin/talent/jobs`
3. You should see every job you've posted via the legacy `/admin/jobs`
   page, with applicant counts and view counts
4. Click the **Seed default pipeline** button (top right)
5. Toast confirms either "Default pipeline stages seeded" (first time) or
   "Pipeline already set up" (idempotent)
6. Now visit `/admin/talent/pipeline`, pick any job from the dropdown —
   the 7-stage kanban renders: Sourced → Screening → Phone → Onsite →
   Offer → Hired → Rejected

If `/admin/talent/jobs` is empty, you have no posted jobs yet. Post one
via `/admin/jobs/new`, then return to `/admin/talent/jobs`.

---

## Section 9 — Bootstrap first SaaS tenant (optional)

Only do this if you're onboarding a paying customer or want to test the
multi-tenant flow.

### 9.1 Create the tenant

1. Sign in as super-admin on apex
2. Visit `/admin/tenants/new`
3. Fill in:
   - **Slug:** lowercase alphanumeric — becomes `acme.techscoop.com`
   - **Name:** customer's display name
   - **Owner user id:** the integer user.id of their primary contact
     (look up in MySQL: `SELECT id, name, email FROM users WHERE email='owner@acme.com';`)
   - **Plan:** Starter / Growth / Enterprise
   - **Trial days:** 14 (or whatever)
   - **Data residency:** US / EU / KSA — picks which Qdrant collection
     namespace they get
4. Click Create

### 9.2 Verify tenant resolution

```bash
curl -s -H 'Cookie: <owner session>' https://acme.techscoop.com/api/trpc/tenants.myTenants
# Expect: array with the new tenant
```

The owner can now sign in at `acme.techscoop.com` and use the talent
platform isolated from techscoop.io.

Default pipeline auto-seeds on tenant create. The owner doesn't need to
click anything.

### 9.3 Invite their team

Owner signs in on the tenant subdomain → `/admin/tenants/<id>` →
Members tab → Invite member by user id + role.

---

## Section 10 — Smoke test

Run these in order, ideally from a different machine than the app server.

### 10.1 Health endpoints

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://techscoop.com/api/health
# Expect: 200

curl -s https://techscoop.com/api/health/ssr
# Expect: JSON with "status":"ok"
```

### 10.2 Legacy paths unchanged

```bash
curl -s 'https://techscoop.com/api/trpc/jobs.list?input={"json":{"page":1,"limit":5,"sortBy":"createdAt","sortOrder":"desc"}}'
# Expect: tRPC JSON with `result.data.items` array

curl -s 'https://techscoop.com/api/trpc/news.list?input={"json":{"page":1,"limit":3}}'
# Expect: tRPC JSON
```

### 10.3 New talent endpoints (need admin auth)

Get an admin session cookie first:

```bash
# Sign in via the UI, then in dev tools copy the COOKIE_NAME value
ADMIN_COOKIE='<paste here>'

# Tenants
curl -s -H "Cookie: $ADMIN_COOKIE" \
  'https://techscoop.com/api/trpc/tenants.list?input={"json":{}}'
# Expect: items array

# Candidates list
curl -s -H "Cookie: $ADMIN_COOKIE" \
  'https://techscoop.com/api/trpc/candidates.listForTenant?input={"json":{"page":1,"limit":5}}'
# Expect: items + total

# Pipeline stages (after Section 8 seeding)
curl -s -H "Cookie: $ADMIN_COOKIE" \
  'https://techscoop.com/api/trpc/ats.pipeline.listStages?input={"json":{}}'
# Expect: 7-row array

# System health
curl -s -H "Cookie: $ADMIN_COOKIE" \
  'https://techscoop.com/api/trpc/systemHealth.summary'
# Expect: { checks: [...], summary: { configured: N, reachable: M } }
# All seven integrations should show configured: true
# Qdrant + Judge0 should show reachable: true
```

### 10.4 Public legal + cookie banner

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://techscoop.com/privacy
# Expect: 200

curl -s -o /dev/null -w "%{http_code}\n" https://techscoop.com/terms
# Expect: 200
```

In a real browser: visit `https://techscoop.com/` — cookie banner should
appear at the bottom on first visit. Click "Accept all" → it disappears
+ localStorage.ts_cookie_consent set.

### 10.5 Webhook endpoints reachable

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://techscoop.com/api/webhooks/stripe-billing
# Expect: 400 (missing Stripe-Signature header) — NOT 404

curl -s -o /dev/null -w "%{http_code}\n" -X POST https://techscoop.com/api/webhooks/github
# Expect: 401 (missing X-Hub-Signature-256 header) — NOT 404
```

### 10.6 Candidate self-service (needs a regular user session)

Sign in as any regular user (not admin):

1. Visit `/me`
2. You should see the candidate dashboard — applications stats + job
   recommendations (empty until you upload a resume)
3. Visit `/me/candidate-profile`
4. Paste any resume text + click "Parse with AI" — should populate skills
   + experience
5. Save the profile
6. Click "Connect" next to GitHub handle — should open GitHub OAuth
   authorization in a new tab; after granting access you land at
   `/me/candidate-profile?github=connected`

### 10.7 End-to-end recruiter flow

Sign in as admin:

1. `/admin/talent/jobs` — pick a job → click Pipeline → kanban renders
2. Move an applicant card to a different stage with the arrow buttons
3. Visit `/admin/talent/candidates/<id>` for any candidate → click
   "Recompute score" → score updates with breakdown
4. Click "Draft offer" → fill in the dialog → submit → check
   `/admin/talent/offers` to see the draft
5. Click "Send" on the offer row → candidate gets the offerSent email
   template

---

## Section 11 — Verify the scheduler

After the app's been running 5+ minutes, check logs:

```bash
journalctl -u techscoop -f --since '10 minutes ago' | grep -i TalentCron
```

Expected:

```
[TalentCron:github-fetcher-drain] running   (every 5 min)
[TalentCron:erasure-executor] running       (hourly)
[TalentCron:retention-sweep] running        (daily 03:00 UTC)
```

If you don't see the cron names, verify:

1. `NODE_ENV=production` is set (Section 4.3)
2. The scheduler service is actually invoked — check
   `server/services/scheduler.service.ts` is imported somewhere in app boot

The first run of `github-fetcher-drain` is silent if no candidates have
connected GitHub. The first run of `erasure-executor` is silent if no
DSAR erasure requests are queued. Both are normal.

---

## Section 12 — Things only Manus can confirm

These can't be unit-tested or verified from your laptop. You have to do
them on the real deploy.

| # | Check | How |
|---|---|---|
| 1 | Sessions persist across deploys | Sign in, redeploy, refresh — still logged in |
| 2 | Qdrant collections create | After a recruiter clicks "Compute matches", curl `/collections` shows `candidates_global` + `jobs_global` |
| 3 | Judge0 actually runs code | Submit a coding assessment as a candidate; Judge0 logs the submission |
| 4 | Email sends | Schedule an interview as a recruiter; recipient checks inbox (look at Resend dashboard for delivered count) |
| 5 | Stripe Billing events flow | `stripe trigger customer.subscription.created` from CLI; app logs `[StripeBilling] received ... evt_...` |
| 6 | GitHub webhook events flow | Push to a repo in your GitHub App's installation; app logs `[GitHubWebhook] received push ...` |
| 7 | Cron jobs actually run | After 5 min: `journalctl ... | grep TalentCron`. After 24h: `SELECT COUNT(*) FROM candidate_erasure_requests WHERE status='executed';` (only counts something if you've actually erased) |
| 8 | TLS valid on tenant subdomains | `curl -I https://acme.techscoop.com` returns valid cert |
| 9 | Wildcard cookies work | Sign in on `acme.techscoop.com`, refresh — still logged in (means cookie scoped to that subdomain) |

---

## Section 13 — Backend gaps to close after deploy

These are documented follow-ups. Each is 1–4 hours of work in a new Claude
session. Not blockers; they have workarounds.

| # | Gap | Workaround in place | When to close |
|---|---|---|---|
| 1 | `ats.interview.findById` | Interview Feedback page scans `listUpcoming(90d)` | When a recruiter clicks Feedback on a >90d-old interview and it shows "Interview #<id>" |
| 2 | `jobApplications.getById` | Application Detail fans out across recent jobs | When recruiters complain page is slow |
| 3 | `ats.pipeline.listStageHistory` | Timeline missing stage transitions | When stage history audit is requested |
| 4 | `github.findProfilesByInstallationId` + `enqueueIncremental` | Webhook acks 200 but doesn't refresh candidates | When github signals get stale |
| 5 | Per-integration `test()` impls | Test button shows "no test logic registered" | When you can't tell why an integration broke |
| 6 | Media-table binding for binary resumes | `mediaId=0` placeholder | When you need to give recruiters the original PDF |

Each gap: open a new Claude session, point at this doc, name the gap. ~1h
turnaround per gap.

---

## Section 14 — Common errors and fixes

### 14.1 `npm install` fails with peer dep conflict

```
ERESOLVE could not resolve
```

Fix: use `--legacy-peer-deps`:

```bash
npm install --legacy-peer-deps
```

### 14.2 Migration fails with "table already exists"

Cause: previous deploy partially ran, journal didn't update.

Fix:

```sql
-- check what's there
SHOW TABLES LIKE 'tenants';

-- if it exists but journal doesn't reflect it, mark as run:
UPDATE __drizzle_migrations
SET hash = '<hash from drizzle/meta/_journal.json>'
WHERE id = 44;
```

Or just drop and re-run if no real data:

```sql
DROP TABLE tenant_audit_log, tenant_memberships, tenants;
```

Then `npx drizzle-kit migrate` again.

### 14.3 `[SessionStore] REDIS_URL not set` after env var is set

Cause: the env var isn't reaching the Node process. PM2, systemd, Docker
each have their own config.

Fix systemd:

```bash
sudo systemctl edit techscoop
# Add:
[Service]
Environment="REDIS_URL=redis://..."

sudo systemctl daemon-reload
sudo systemctl restart techscoop
```

Fix Docker:

```bash
# In your docker-compose.yml or run command:
-e REDIS_URL=redis://...
```

### 14.4 Tenant subdomain returns 404 / wrong content

Cause: middleware not extracting tenant from Host header.

Diagnose:

```bash
curl -H 'Host: acme.techscoop.com' https://techscoop.com/api/trpc/tenants.myTenants
# Should see tenant resolved
```

If wrong: check that the `tenantMiddleware` is actually mounted in
`server/_core/index.ts` BEFORE `/api/trpc`. Also check
`SELECT * FROM tenants WHERE slug='acme';` returns the row.

### 14.5 "Stripe is not configured" when clicking Send on an offer

Cause: offer letter sends an email but ALSO triggers a Stripe call somewhere.

Fix: this shouldn't happen — `ats.offer.send` only emails. If you see
this, paste the stack trace into a Claude session.

### 14.6 GitHub Connect button does nothing

Cause: `github-app` integration not configured.

Fix: complete Section 6.4. Verify by:

```bash
curl -H "Cookie: <user>" 'https://techscoop.com/api/trpc/github.authorizeUrl?input={"json":{"state":"test"}}'
# Expect: { result: { data: { url: "https://github.com/login/oauth/authorize?..." } } }
# NOT: { error: "GitHub App not configured" }
```

### 14.7 Cookie banner doesn't appear

Cause: localStorage already has consent set OR banner not mounted.

Fix:

```js
// In dev tools console:
localStorage.removeItem('ts_cookie_consent');
location.reload();
```

If still doesn't appear: confirm `<CookieConsentBanner />` is mounted in
`client/src/App.tsx` next to `<Router />`.

### 14.8 Migrations run but `/admin/talent/jobs` shows nothing

Cause: you have no jobs in the legacy public scope (tenant_id IS NULL).

Fix: post a job via `/admin/jobs/new`. It'll appear immediately.

OR: your existing jobs got a tenant_id assigned somehow (shouldn't happen
from the migrations). Check:

```sql
SELECT id, title, tenant_id FROM jobs LIMIT 10;
-- tenant_id should be NULL for all pre-existing jobs
```

### 14.9 Pipeline kanban shows no columns even after Seed defaults

Cause: migration 0046 didn't run; `pipeline_stages.tenant_id` is still
NOT NULL.

Diagnose:

```sql
SHOW COLUMNS FROM pipeline_stages WHERE field='tenant_id';
-- Expect: Null = YES
```

If `Null = NO`: re-run `npx drizzle-kit migrate`.

---

## Section 15 — Backup + restore drill

Before declaring victory, prove you can recover.

### 15.1 Backups to take nightly

| What | Where | Tool |
|---|---|---|
| MySQL all tables | S3 / off-host storage | `mysqldump --single-transaction techscoop \| gzip > /tmp/backup-$(date +%F).sql.gz` |
| Qdrant snapshot | S3 | `curl -X POST -H 'api-key:...' http://qdrant:6333/collections/<name>/snapshots` |
| Resume binaries (when media-binding lands) | S3 / object store | `aws s3 sync /var/lib/uploads/resumes s3://...` |
| `/etc/techscoop/.env` (env vars) | Encrypted, off-host | manual |
| GitHub App private key | 1Password / encrypted | manual |

### 15.2 Restore drill (do once a quarter)

1. Spin up a fresh test box
2. Restore MySQL from last night's backup
3. Restore Qdrant snapshots
4. Set env vars
5. Boot the app
6. Verify: sign in, see jobs, see candidates, see a recent application

If anything is missing, your backup plan has a gap.

---

## Section 16 — Rollback

If something goes catastrophically wrong post-merge, you have two options.

### 16.1 App rollback (preferred — schema stays)

```bash
git revert <merge-commit> --mainline 1
git push origin main
# Redeploy
```

The talent tables remain in the DB. They become orphaned (no app code reads
them) but harmless. Safe to clean up later.

### 16.2 Schema rollback (rare)

Only if a column is breaking other things. Use the SQL in
`docs/MANUS_DEPLOY_TALENT_PLATFORM.md`'s rollback section (it's still
correct — drops the same tables in dependency order).

Then update `drizzle/meta/_journal.json` to remove entries 44/45/46.

---

## Section 17 — When to come back for more

After deploy + 1–2 weeks of real use, you'll have a list of items the
deferred follow-ups don't cover. Common ones:

- Workflow builder UI (drag-drop pipeline editor)
- Bulk candidate import from Greenhouse with field mapping
- Mobile responsive polish (recruiter mobile is 50% of usage)
- Drag-drop kanban (click-arrows feel laggy at 100+ candidates)
- Self-service DSAR export UI for candidates
- Rate limiting per tenant (when first abusive customer shows up)
- Sentry / error tracking (when something silent breaks)
- SSO (SAML / OIDC) — first enterprise prospect asks
- Tenant-owner audit log UI (enterprise compliance)

Open a new Claude session and rank these by what you actually saw breaking
or what your first paying customer asked for. Don't preemptively build.

---

## Section 18 — Quick reference

### Service status check (everything in one curl)

```bash
ADMIN_COOKIE='<paste here>'
curl -s -H "Cookie: $ADMIN_COOKIE" \
  https://techscoop.com/api/trpc/systemHealth.summary | jq
# Returns a JSON with each integration's configured + reachable status
```

### Sidebar map

| Sidebar group | Pages |
|---|---|
| Talent Platform → Jobs | `/admin/talent/jobs` |
| Talent Platform → Pipeline | `/admin/talent/pipeline` |
| Talent Platform → Candidates | `/admin/talent/candidates` |
| Talent Platform → Interviews | `/admin/talent/interviews` |
| Talent Platform → Offers | `/admin/talent/offers` |
| Talent Platform → Assessments | `/admin/talent/assessments` |
| Talent Platform → Reports | `/admin/talent/reports` |
| Talent Platform → Tenants | `/admin/tenants` |
| Talent Platform → Integrations | `/admin/integrations` |
| Talent Platform → System Health | `/admin/system-health` |

### Public candidate routes

| URL | What |
|---|---|
| `/me` | Candidate dashboard |
| `/me/candidate-profile` | Profile editor |
| `/me/applications` | My applications |
| `/assess/:token` | Take an assessment (invite token) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Webhook endpoints

| URL | Registered at | Notes |
|---|---|---|
| `/api/webhooks/stripe` | Stripe dashboard (Events Hub) | Pre-existing |
| `/api/webhooks/stripe-billing` | Stripe dashboard (Subscription) | NEW — register at Section 7.1 |
| `/api/webhooks/github` | GitHub App settings | NEW — register at Section 7.2 |
| `/api/auth/github/callback` | GitHub App OAuth callback URL | NEW — set when registering |

End of complete runbook.
