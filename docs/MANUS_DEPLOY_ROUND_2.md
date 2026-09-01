# Manus — Round 2 deploy instructions

Branch: `claude/optimize-seo-architecture-bkeQo`
Tip: `a8a7953` — "Integration pass — wire 12 parallel-agent landings into the app"
State vs main: **7 commits ahead, 0 behind**

This drop closes most of the Tier-2 / Tier-3 gaps from the post-MVP roadmap.
See the "What landed" table at the bottom. It's all additive — existing
deployed behavior is unchanged.

---

## Step 0 — Verify

```bash
git fetch origin
git checkout claude/optimize-seo-architecture-bkeQo
git pull
npm install --legacy-peer-deps                   # two new deps below
npm run check                                    # tsc --noEmit
node scripts/check-module-boundaries.mjs         # must say "8 modules OK"
```

**Expected:** `npm run check` → 0 errors. `boundary check` → 8 modules OK.

If either fails, paste the error list into a new Claude session referencing
this doc + the branch.

---

## Step 1 — Two new runtime deps

The binary-resume-upload agent added these:

```bash
# Already in package.json after the agent's npm install:
#   pdf-parse  (PDF text extraction)
#   mammoth    (DOCX text extraction)
# Both lazy-loaded — without them, the new uploadResumeFile endpoint
# throws a clean "not installed" error; the paste-text path is unaffected.
```

After `git pull`, run `npm install --legacy-peer-deps` to lock them in.

---

## Step 2 — Merge to main

Same procedure as last time. PR or fast-forward — your call.

```bash
git tag talent-platform-mvp-v2
git push origin talent-platform-mvp-v2
```

---

## Step 3 — No new migrations

This drop adds zero new tables and zero schema changes. Skip `drizzle-kit migrate`.

---

## Step 4 — New env vars (optional, no defaults change)

None added in this round. The integrations the previous round documented
(`REDIS_URL`, `QDRANT_URL`, `JUDGE0_BASE_URL`, `OPENAI_API_KEY`,
`GITHUB_TOKEN_ENC_KEY`) are all still the source of truth.

---

## Step 5 — Three new operational surfaces to verify

### 5a. Cron jobs (automatic on boot)

The scheduler now registers three Talent Platform jobs:

| Job | Cadence | What it does |
|---|---|---|
| `github-fetcher-drain` | every 5 min | Process queued GitHub sync jobs |
| `erasure-executor` | every hour | Hard-delete candidates past 30-day grace |
| `retention-sweep` | daily 03:00 UTC | Open erasure requests for retention-expired candidates |

Verify in the logs after first boot — grep for `[TalentCron:`. They run only
in production (NODE_ENV=production check).

### 5b. Two new webhook endpoints

| Route | What | Configure |
|---|---|---|
| `POST /api/webhooks/stripe-billing` | Stripe subscription events | Add to Stripe dashboard webhook list — use the same `STRIPE_WEBHOOK_SECRET` as the events ticket webhook |
| `POST /api/webhooks/github` | GitHub App events (push, PR, installation, ping) | Set in the GitHub App settings as the webhook URL |

Both verify HMAC signatures over the raw body. Both 200 on unknown event
types (no retries). 401 on signature mismatch.

### 5c. Integration Hub UI

`/admin/integrations` is now wired with a full UI for all seven integrations
(Stripe, ai-claude, GitHub App, Qdrant, Judge0, Slack, Greenhouse).

You can now stop inserting `integration_configs` rows by hand:

1. Sign in as admin
2. Visit `/admin/integrations`
3. Click "Configure" on each integration
4. Fill the form — public fields visible, secrets masked
5. Click "Test" to verify connectivity (Stripe/GitHub/Qdrant/Judge0/Slack/Greenhouse currently fall through to "no test logic registered" — see follow-up #6 below)
6. Click "Save"

This is much easier than the SQL-inserts approach in the previous doc.

---

## Step 6 — Bootstrap (if first deploy on this branch)

If migrations 0044/0045 haven't been run yet, follow the original
`MANUS_DEPLOY_TALENT_PLATFORM.md` Steps 2 + 6 + 7 first (run migrations,
wildcard DNS, bootstrap first tenant via `/admin/tenants/new`).

---

## Step 7 — Smoke test the new surfaces

```bash
# 1. Cookie banner appears on landing page
curl -s https://techscoop.com/ | grep -q "cookie" && echo OK

# 2. Privacy + Terms render
curl -s -o /dev/null -w "%{http_code}\n" https://techscoop.com/privacy   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://techscoop.com/terms     # 200

# 3. Integration Hub loads (auth required)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H 'Cookie: <admin session>' \
  https://techscoop.com/admin/integrations    # 200

# 4. New tRPC procedures resolve (smoke)
curl 'https://techscoop.com/api/trpc/admin.integrations.list' \
  -H 'Cookie: <admin>'   # returns [{integrationId,...}]

curl 'https://techscoop.com/api/trpc/ats.report.summary?input={"json":{"range":"30d"}}' \
  -H 'Cookie: <admin>'   # returns {applications, interviews, offers, hires, ...}

# 5. Webhook routes exist (no body → 400/401, not 404)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://techscoop.com/api/webhooks/stripe-billing      # 400 (missing sig)

curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://techscoop.com/api/webhooks/github              # 401 (missing sig)
```

---

## What landed in this round

| Category | Item | Where |
|---|---|---|
| **Compliance** | PII access log fully wired — 15 `logPii` sites across 8 service files | `candidates`, `ats`, `github`, `assessments` services |
| **Background jobs** | 3 cron registrations | `server/services/scheduler.service.ts` |
| **Webhooks** | Stripe Billing subscription event handler | `server/routes/stripeBillingWebhook.ts` |
| **Webhooks** | GitHub App push/PR/installation/ping handler | `server/routes/githubAppWebhook.ts` |
| **Notifications** | Slack fan-out from ATS — new app, stage move, offer accept | `applyInternal`, `moveApplicationToStage`, `markAccepted` |
| **Email** | 5 templates externalized + shared layout | `server/services/emailTemplates/` |
| **Resume** | Binary upload (PDF + DOCX via lazy-loaded `pdf-parse`/`mammoth`) | `server/services/resumeExtraction.service.ts` |
| **Recruiter UI** | Application detail with timeline (notes + interviews + offers) | `/admin/talent/applications/:id` |
| **Recruiter UI** | Interview feedback form (anti-bias gated) | `/admin/talent/interviews/:id/feedback` |
| **Recruiter UI** | Reports dashboard (apps, interviews, offers, hires, funnel) | `/admin/talent/reports` + `ats.report.summary` tRPC |
| **Admin UI** | Integration Hub (configure all 7 in-app) | `/admin/integrations` + `IntegrationConfigDialog` |
| **Public UI** | Cookie consent banner + Terms + Privacy | `/privacy`, `/terms`, root layout |
| **Sidebar** | Talent Platform group expanded to 9 entries | `AdminLayout.tsx` |

**Net diff:** ~6,000 lines added across 30+ files, 0 deleted from prior MVP.

---

## Documented backend gaps (deferred follow-ups)

These were flagged by the agents during their work. Each is a separate small
follow-up; none block the deploy.

| # | Gap | Symptom |
|---|---|---|
| 1 | `ats.interview.findById` | Interview Feedback page falls back to `listUpcoming(90d)` scan for header info |
| 2 | `jobApplications.getById` | Application Detail page fans out across recent jobs to find the row |
| 3 | `ats.pipeline.listStageHistory` | Timeline on Application Detail shows submit + interviews + notes + offers, but not stage transitions |
| 4 | github: `findProfilesByInstallationId` | GitHub webhook acks 200 for push/PR but can't yet refresh the corresponding candidate's profile (logged only) |
| 5 | github: `enqueueIncremental(profileId)` | Same as above |
| 6 | Integration `test()` implementations for stripe / github / qdrant / judge0 / slack / greenhouse | Test button shows "no test logic registered for &lt;id&gt;" |
| 7 | Media-table binding for binary resume uploads | `mediaId=0` placeholder; the file binary isn't linked to the media row (text is extracted + parsed correctly) |

Open a new Claude session pointing at any of these when you're ready. Each is
1–4 hours of work.

---

## Rollback

Same as last time. The drop is fully additive at the schema level (zero new
migrations), so `git revert` is sufficient. Tables remain populated but
unused; safe to leave or clean up later.

```bash
git revert <merge-commit> --mainline 1
git push origin main
```

End of round-2 instructions.
