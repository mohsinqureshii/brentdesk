# Deploying BrentDesk on Railway

This is the shortest path from an empty Railway project to a serving
BrentDesk instance with an admin login. It assumes nothing about having a
working container shell — the whole bootstrap can be done with environment
variables alone.

## 1. Create the services

In a Railway project, add two services:

1. **MySQL** — `+ New` → `Database` → `Add MySQL`.
2. **App** — `+ New` → `GitHub Repo` → this repository, branch `main`.

Railway builds the app with Nixpacks from `package.json`. `engines.node`
pins Node 22, and `pnpm` is picked up from `packageManager`. The build runs
`pnpm build`, which produces `dist/index.js` (server), `dist/public`
(client) and `dist/seed.js` (bootstrap seed). `pnpm start` serves it.

## 2. Set the app service variables

Under the **app** service → `Variables`. The two the server refuses to
start without are `DATABASE_URL` and `JWT_SECRET`.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` — Railway's reference syntax; it resolves to the private-network URL |
| `JWT_SECRET` | a long random string (`openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `BASE_URL` | the public URL of the app service, no trailing slash |

Do **not** set `PORT`. Railway assigns it, and the server binds whatever it
is handed (`server/_core/index.ts`).

Everything else in `.env.example` is optional and enables a specific
integration (S3 uploads, Stripe, AI providers, analytics). The app boots
without them.

## 3. Bootstrap the database

The server provisions its own schema: on first boot it sees an empty
database and applies the migration baseline in `drizzle/`. On a database
that already has tables it only reconciles the additive tail, and never
replays the full chain unless you set `RUN_STARTUP_MIGRATIONS=1`.

System data (countries, editions, the BrentDesk category taxonomy,
sectors, RBAC roles, ad slots, homepage sections) still needs seeding.
Add these to the app service for the first deploy:

| Variable | Value |
| --- | --- |
| `SEED_ON_BOOT` | `1` |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | a strong password you will change immediately |

Redeploy. The deploy logs should show:

```
[BrentDesk] Server running on http://localhost:8080/
[Migrate] provisioning schema from /app/drizzle
[Migrate] applied 1 migrations — schema provisioned
[seed] countries: 23 added
...
[seed] admin user: created (you@example.com)
[seed] BrentDesk bootstrap complete
```

The seed is idempotent — a second run reports `0 added` for everything —
so leaving `SEED_ON_BOOT=1` set is harmless. It seeds **no** editorial
content: no articles, companies, people, events or subscribers.

Once you have logged in, **delete `ADMIN_EMAIL` and `ADMIN_PASSWORD` from
the service variables** and change the password from the admin UI. A
password in a platform variable is readable by anyone with project access.

If you do have a shell on the *app* service (Railway's shell attaches to
whichever service is selected — a shell with neither `node` nor `pnpm` is
the MySQL container, not the app), the equivalent one-off is:

```sh
node dist/seed.js
```

## 4. Verify

- `https://<your-app>.up.railway.app/api/health` → `200`
- `/` → the homepage shell renders; sections are empty until you publish
- `/admin` → log in with the admin credentials

## Troubleshooting

**"Application failed to respond"** — the container is not listening on
Railway's `PORT`. Check the deploy logs for the first few lines:

- `Missing required environment variable: JWT_SECRET` — `server/_core/env.ts`
  throws at import, so the process dies before binding. Set it.
- No `Server running` line at all — the build failed, or the start command
  is wrong. `pnpm start` must run `node dist/index.js`.
- A `Server running` line but still no response — the port was overridden.
  Remove any `PORT` variable you set by hand.

Database problems do **not** cause this: migrations and the seed run after
the port is open, and a failure there is logged while the server keeps
serving. If the logs show `[Migrate]` or `[seed]` errors but the health
endpoint answers, the deploy is up and the database is the thing to fix.

**Health check passes but every page is empty** — the seed has not run.
Homepage sections are CMS rows; without them the page has nothing to
render. Set `SEED_ON_BOOT=1` and redeploy.
