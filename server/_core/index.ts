import { publication, getBaseUrl } from "../../shared/publication";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./ssrServe";
import sitemapRoutes from "../routes/sitemaps";
import { articleRedirectMiddleware } from "../routes/articleRedirect";
import { editionMiddleware } from "../routes/editionMiddleware";
import { schedulerService } from "../services/scheduler.service";
import { adsRoutes } from "../routes/ads";
import seoMiddleware from "../routes/seoMiddleware";
import uploadRoute from "../routes/upload";
import stripeWebhookRoute from "../routes/stripeWebhook";
import eventCalendarRoute from "../routes/eventCalendar";
import eventOgImageRoute from "../routes/eventOgImage";
import eventLiveFeedRoute from "../routes/eventLiveFeed";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { mountGithubOAuthCallback } from "../routes/githubOAuthCallback";
import { mountStripeBillingWebhook } from "../routes/stripeBillingWebhook";
import { mountGithubAppWebhook } from "../routes/githubAppWebhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Apply pending drizzle migrations at boot. The production image ships
 * the drizzle/ folder but not drizzle-kit, so we use drizzle-orm's
 * programmatic migrator. Journal-aware and idempotent: already-applied
 * migrations are skipped. Never fatal — a failure is logged and the
 * server keeps serving whatever the current schema supports.
 */
async function runStartupMigrations(): Promise<void> {
  if (process.env.SKIP_STARTUP_MIGRATIONS === "1") return;
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;

    // SAFETY GATE: full-chain replay only happens on a completely empty
    // database (fresh provisioning). On a database that already has
    // tables, never migrate automatically; reconcile the additive tail
    // instead, and require an explicit RUN_STARTUP_MIGRATIONS=1 from an
    // operator who has a backup for anything more.
    const { sql } = await import("drizzle-orm");
    const countRows: any = await db.execute(sql`
      SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE()`);
    const row = Array.isArray(countRows) ? (Array.isArray(countRows[0]) ? countRows[0][0] : countRows[0]) : countRows;
    const tableCount = Number(row?.n ?? row?.N ?? 0);
    if (tableCount > 0 && process.env.RUN_STARTUP_MIGRATIONS !== "1") {
      // Non-empty database: never replay the full chain automatically,
      // but DO reconcile the additive tail (every migration after the
      // 0000 baseline). Additive migrations only CREATE tables and ADD
      // columns/keys, and a database provisioned before them breaks the
      // corresponding code paths entirely.
      await applyAdditiveTail().catch(err =>
        console.error("[Migrate] additive tail failed (continuing):", (err as Error).message),
      );
      console.log(
        `[Migrate] database has ${tableCount} tables — full auto-migration skipped ` +
        `(set RUN_STARTUP_MIGRATIONS=1 to run the complete chain deliberately)`,
      );
      return;
    }

    const path = await import("path");
    const fs = await import("fs");
    const candidates = [
      path.resolve(import.meta.dirname, "../drizzle"), // prod: /app/dist -> /app/drizzle
      path.resolve(process.cwd(), "drizzle"),          // dev: repo root
    ];
    const folder = candidates.find(p => fs.existsSync(path.join(p, "meta", "_journal.json")));
    if (!folder) {
      console.warn("[Migrate] drizzle folder not found, skipping startup migrations");
      return;
    }

    console.log(`[Migrate] provisioning schema from ${folder}`);

    // Custom journal-driven runner instead of drizzle's migrate(): it
    // tolerates a small set of benign MySQL error codes so that partial
    // provisioning (a crashed first boot) can re-run to completion.
    // This branch only ever runs against an EMPTY database (see gate
    // above) — it is initial provisioning, not evolution of live data.
    const journal = JSON.parse(
      fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8"),
    ) as { entries: Array<{ tag: string; when: number }> };

    await db.execute(sql`CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`);
    const lastRows: any = await db.execute(
      sql`SELECT created_at FROM \`__drizzle_migrations\` ORDER BY created_at DESC LIMIT 1`,
    );
    const lastRow = Array.isArray(lastRows) ? (Array.isArray(lastRows[0]) ? lastRows[0][0] : lastRows[0]) : lastRows;
    const lastApplied = Number(lastRow?.created_at ?? 0);

    // Benign-on-fresh-DB MySQL error codes:
    // 1050 table exists, 1060 duplicate column, 1061 duplicate key name,
    // 1091 can't drop (index/column doesn't exist), 1022/1826 duplicate FK,
    // 1146 table doesn't exist yet, 1054 column doesn't exist yet — the
    // chain was regenerated at 0034/0035, so mid-chain ALTERs can
    // reference objects that only exist in the final regenerated shape.
    // Plus transient-shape ALTER failures (1075 auto-column, 1215/3780/
    // 1832/1833 FK shape, 1553 index-used-by-FK, 1025 rename) — tables
    // touched mid-chain are dropped and recreated by the 0034/0035
    // regeneration, so their intermediate shape doesn't matter.
    const BENIGN = new Set([
      1050, 1060, 1061, 1091, 1022, 1826, 1146, 1054,
      1075, 1215, 3780, 1832, 1833, 1553, 1025,
      1170, 1071, // bad key specs (TEXT key without length / key too long)
      1051,       // DROP TABLE on a table that was never created
      1068,       // ADD PRIMARY KEY where one already exists
    ]);
    let applied = 0;

    for (const entry of journal.entries) {
      if (entry.when <= lastApplied) continue;
      const file = path.join(folder, `${entry.tag}.sql`);
      const statements = fs
        .readFileSync(file, "utf8")
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        try {
          await db.execute(sql.raw(stmt));
        } catch (err: any) {
          const errno = err?.cause?.errno ?? err?.errno;
          if (BENIGN.has(Number(errno))) {
            console.warn(
              `[Migrate] ${entry.tag}: ignored benign error ${errno}: ${String(err?.cause?.message ?? err?.message).slice(0, 140)}`,
            );
            continue;
          }
          throw new Error(`${entry.tag}: ${String(err?.cause?.message ?? err?.message)}`);
        }
      }

      await db.execute(
        sql`INSERT INTO \`__drizzle_migrations\` (hash, created_at) VALUES (${entry.tag}, ${entry.when})`,
      );
      applied++;
    }

    console.log(applied
      ? `[Migrate] applied ${applied} migrations — schema provisioned`
      : "[Migrate] schema is up to date");
  } catch (err) {
    console.error(
      "[Migrate] startup migration failed (server continues with current schema):",
      (err as Error).message,
    );
  }
}

/**
 * Reconcile the additive migration tail (every journal entry after the
 * 0000 baseline) on a live, non-empty database. Tail migrations must only
 * create tables or add columns/keys — re-checked per file at runtime as a
 * hard safety invariant (any DROP TABLE/COLUMN is refused). Missing
 * objects break entire modules when the code deploys ahead of the schema.
 */
const ADDITIVE_TAIL_FROM_IDX = 1;

async function applyAdditiveTail(): Promise<void> {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) return;
  const { sql } = await import("drizzle-orm");
  const path = await import("path");
  const fs = await import("fs");

  const candidates = [
    path.resolve(import.meta.dirname, "../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
  ];
  const folder = candidates.find(p => fs.existsSync(path.join(p, "meta", "_journal.json")));
  if (!folder) return;

  // A ledger of applied tags, rather than probing for known schema
  // objects. The old probe hard-coded markers from 0036-0050 and returned
  // early once it found them, so ANY migration added afterwards was never
  // even looked at — 0051 shipped and silently never applied in
  // production. A ledger has no such blind spot: each tag is applied once
  // and every future migration is picked up without editing this file.
  //
  // Tail DDL is guarded by the benign-error list below, so re-applying a
  // tag on an already-current database is safe and recorded in the ledger.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _additive_migrations (
      tag varchar(255) NOT NULL,
      appliedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tag)
    )`);
  const ledgerRows: any = await db.execute(sql`SELECT tag FROM _additive_migrations`);
  const ledgerList = Array.isArray(ledgerRows)
    ? (Array.isArray(ledgerRows[0]) ? ledgerRows[0] : ledgerRows)
    : [];
  const alreadyApplied = new Set(
    (ledgerList as Array<{ tag: string }>).map(r => r.tag).filter(Boolean),
  );

  console.log("[Migrate] reconciling additive migration tail");
  const journal = JSON.parse(
    fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };

  const BENIGN = new Set([1050, 1060, 1061, 1062, 1091, 1022, 1826, 1146, 1054, 1068, 1051]);
  let applied = 0;
  const appliedTags: string[] = [];
  for (const entry of journal.entries) {
    if (entry.idx < ADDITIVE_TAIL_FROM_IDX) continue;
    if (alreadyApplied.has(entry.tag)) continue;
    const text = fs.readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8");
    if (/DROP\s+(TABLE|COLUMN)/i.test(text)) {
      console.error(`[Migrate] SAFETY: ${entry.tag} contains destructive DDL — refusing to auto-apply`);
      continue;
    }
    // Drizzle separates statements with "--> statement-breakpoint", but
    // hand-written migrations often don't. Without a fallback the whole
    // file is sent as one statement and MySQL rejects it as a syntax
    // error — which is exactly how 0051 failed. Split on semicolon +
    // newline when no breakpoint marker is present, and drop chunks that
    // are only comments.
    const chunks = text.includes("--> statement-breakpoint")
      ? text.split("--> statement-breakpoint")
      : text.split(/;\s*\n/);
    const statements = chunks
      .map(c => c.trim().replace(/;\s*$/, "").trim())
      .filter(c => c.length > 0 && c.split("\n").some(line => {
        const t = line.trim();
        return t.length > 0 && !t.startsWith("--");
      }));
    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt));
        applied++;
      } catch (err: any) {
        const errno = Number(err?.cause?.errno ?? err?.errno);
        if (!BENIGN.has(errno)) {
          console.error(`[Migrate] tail ${entry.tag} statement failed (${errno}): ${String(err?.cause?.message ?? err?.message).slice(0, 140)}`);
        }
      }
    }
    // Recorded even when individual statements hit benign errors: the
    // objects exist either way, and the alternative is retrying the same
    // migration on every single boot forever.
    await db.execute(sql`INSERT IGNORE INTO _additive_migrations (tag) VALUES (${entry.tag})`);
    appliedTags.push(entry.tag);
  }
  console.log(
    `[Migrate] additive tail done — ${applied} statements across ${appliedTags.length} migration(s)` +
    (appliedTags.length ? `: ${appliedTags.join(", ")}` : ""),
  );
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ----------------------------------------------------------------
  // Stripe webhook — MUST come before express.json() so the raw body
  // is preserved for signature verification. Mounting the route with
  // express.raw() on this exact path keeps every other endpoint on
  // JSON parsing.
  // ----------------------------------------------------------------
  app.use(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json", limit: "1mb" }),
  );
  app.use(stripeWebhookRoute);

  // JSON body limit kept low; file uploads go through multipart (upload route), not JSON
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // ----------------------------------------------------------------
  // Tenant extraction — must come before /api/trpc so the tRPC context
  // can read req.tenantContext. Apex / reserved subdomains resolve as
  // null (legacy public-site behavior); tenant subdomains and custom
  // domains resolve as the tenant id. 60s in-process cache absorbs the
  // per-request lookup cost.
  // ----------------------------------------------------------------
  app.use(tenantMiddleware);

  // GitHub OAuth callback — must be after tenantMiddleware so the
  // callback has access to req.tenantContext (the candidate row lives
  // in the active tenant's scope).
  mountGithubOAuthCallback(app);

  // Stripe Billing + GitHub App webhooks. Each route installs its
  // own express.raw() middleware so signature verification works
  // against the exact bytes Stripe / GitHub sent.
  mountStripeBillingWebhook(app);
  mountGithubAppWebhook(app);
  // tRPC API (handles all auth via email/password endpoints)
  // Custom middleware to parse tRPC query parameters for GET requests
  app.use("/api/trpc", (req, res, next) => {
    // For GET requests with query parameters, tRPC expects the input in req.query.input
    // The createExpressMiddleware will handle parsing it
    next();
  });
  
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      responseMeta() {
        return {};
      },
    })
  );
  // Simple liveness health check (used by Dockerfile HEALTHCHECK)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Server version diagnostic endpoint
  app.get("/api/version", (req, res) => {
    res.json({ version: "2.3.0", deployed: new Date().toISOString(), sitemapFormat: "sitemapindex", nodeEnv: process.env.NODE_ENV || 'not-set' });
  });

  // SSR Health Monitoring endpoint
  // Tests SSR rendering for a sample article and returns pass/fail status
  app.get("/api/health/ssr", async (req, res) => {
    const startTime = Date.now();
    const checks: { name: string; status: "pass" | "fail"; message: string; durationMs?: number }[] = [];

    try {
      // 1. Check database connectivity
      const dbStart = Date.now();
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        checks.push({ name: "database", status: "fail", message: "Database not available", durationMs: Date.now() - dbStart });
        return res.json({ status: "fail", checks, totalDurationMs: Date.now() - startTime });
      }
      checks.push({ name: "database", status: "pass", message: "Connected", durationMs: Date.now() - dbStart });

      // 2. Check workflow statuses exist
      const wfStart = Date.now();
      const { workflowService } = await import("../services/workflow.service");
      const publishedStatus = await workflowService.getStatusBySlug("editorial", "published");
      const scheduledStatus = await workflowService.getStatusBySlug("editorial", "scheduled");
      if (!publishedStatus || !scheduledStatus) {
        checks.push({ name: "workflow_statuses", status: "fail", message: `published=${!!publishedStatus}, scheduled=${!!scheduledStatus}`, durationMs: Date.now() - wfStart });
      } else {
        checks.push({ name: "workflow_statuses", status: "pass", message: `published=id:${publishedStatus.id}, scheduled=id:${scheduledStatus.id}`, durationMs: Date.now() - wfStart });
      }

      // 3. Check SSR rendering for a sample article
      const ssrStart = Date.now();
      const { articles, categories } = await import("../../drizzle/schema");
      const { isNotNull, desc } = await import("drizzle-orm");
      const sampleArticle = await db
        .select({ slug: articles.slug, title: articles.title })
        .from(articles)
        .where(isNotNull(articles.publishedAt))
        .orderBy(desc(articles.publishedAt))
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!sampleArticle) {
        checks.push({ name: "ssr_article_lookup", status: "fail", message: "No published articles found", durationMs: Date.now() - ssrStart });
      } else {
        // Try to render SSR for this article
        const { getArticleForSSR } = await import("../services/ssr.service");
        const ssrData = await getArticleForSSR("news", sampleArticle.slug);
        if (ssrData) {
          const hasImage = !!ssrData.image;
          const hasTitle = !!ssrData.title;
          const hasUrl = !!ssrData.url;
          checks.push({
            name: "ssr_render",
            status: hasImage && hasTitle && hasUrl ? "pass" : "fail",
            message: `title=${hasTitle}, image=${hasImage}, url=${hasUrl} — "${sampleArticle.title?.slice(0, 60)}"`,
            durationMs: Date.now() - ssrStart,
          });

          // 3b. Validate og:image:type matches the actual image URL extension
          if (ssrData.image) {
            const { generateMetaTags: genArticleMeta } = await import("../services/ssr.service").then(m => ({ generateMetaTags: m.generateMetaTags }));
            const metaHtml = genArticleMeta(ssrData);
            const ogImageTypeMatch = metaHtml.match(/og:image:type["']\s+content=["']([^"']+)["']/);
            const ogImageType = ogImageTypeMatch?.[1] ?? null;
            const imageUrl = ssrData.image.toLowerCase().split('?')[0];
            const expectedType = imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg') ? 'image/jpeg'
              : imageUrl.endsWith('.png') ? 'image/png'
              : imageUrl.endsWith('.webp') ? 'image/webp'
              : imageUrl.endsWith('.gif') ? 'image/gif'
              : null;
            const mimeTypeMatch = !expectedType || ogImageType === expectedType;
            checks.push({
              name: "ssr_og_image_type",
              status: mimeTypeMatch ? "pass" : "fail",
              message: mimeTypeMatch
                ? `og:image:type=${ogImageType} matches URL extension`
                : `MISMATCH: og:image:type=${ogImageType} but URL extension suggests ${expectedType}`,
            });
          }
        } else {
          checks.push({ name: "ssr_render", status: "fail", message: `getArticleForSSR returned null for slug: ${sampleArticle.slug}`, durationMs: Date.now() - ssrStart });
        }
      }

      // 4. Check meta tag generation
      const metaStart = Date.now();
      try {
        const { generateMetaTags: genMeta } = await import("./metaTags");
        const testMeta = genMeta({
          title: "Health Check",
          description: "Test",
          url: `${getBaseUrl()}/test`,
          image: "https://example.com/test.jpg",
        });
        const hasOgImage = testMeta.includes('og:image');
        const hasOgTitle = testMeta.includes('og:title');
        checks.push({
          name: "meta_tag_generation",
          status: hasOgImage && hasOgTitle ? "pass" : "fail",
          message: `og:image=${hasOgImage}, og:title=${hasOgTitle}`,
          durationMs: Date.now() - metaStart,
        });
      } catch (err) {
        checks.push({ name: "meta_tag_generation", status: "fail", message: String(err), durationMs: Date.now() - metaStart });
      }

      const allPass = checks.every(c => c.status === "pass");
      res.status(allPass ? 200 : 503).json({
        status: allPass ? "pass" : "fail",
        checks,
        totalDurationMs: Date.now() - startTime,
      });
    } catch (error) {
      checks.push({ name: "unexpected_error", status: "fail", message: error instanceof Error ? error.message : String(error) });
      res.status(503).json({
        status: "fail",
        checks,
        totalDurationMs: Date.now() - startTime,
      });
    }
  });
  // SEO API endpoints - bypass Manus platform CDN interception of /sitemap.xml and /robots.txt
  // The platform intercepts these two specific filenames at the edge, so we serve them under /api/
  app.get("/api/sitemap.xml", async (req, res) => {
    try {
      const { seoService } = await import("../services/seo.service");
      const xml = await seoService.generateSitemapIndex();
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap index:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
  app.get("/api/robots.txt", async (req, res) => {
    try {
      const { seoService } = await import("../services/seo.service");
      const txt = seoService.generateRobotsTxt();
      res.set("Content-Type", "text/plain");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(txt);
    } catch (error) {
      console.error("Error generating robots.txt:", error);
      res.status(500).send("Error generating robots.txt");
    }
  });
  // File upload route (must be before Vite middleware)
  app.use(uploadRoute);

  // ============================================================
  // SEO ROUTES — REGISTER BEFORE seoMiddleware
  // ============================================================
  // CRITICAL ORDERING: sitemap/robots routes MUST run before seoMiddleware,
  // otherwise its trailing-slash normalizer / 3-segment article redirect /
  // tag-feed handlers can intercept SEO file URLs and produce 301/410/SPA-fallback
  // responses, which is what GSC was reporting as "Article Not Found".
  //
  // The /api/* aliases additionally bypass the Manus platform edge, which
  // intercepts /sitemap*.xml and /robots.txt at CDN level on bare paths.
  app.use("/api", sitemapRoutes);
  app.use(sitemapRoutes);

  // ============================================================
  // EVENTS HUB v2 — share / discovery routes
  // ============================================================
  // Mounted BEFORE seoMiddleware so they aren't intercepted by the
  // trailing-slash normalizer or the catch-all redirects table. Each
  // route owns a path with a file extension (.ics / .png / .xml) which
  // also makes them immune to the "/:parentCat/:childCat/:articleSlug"
  // article-redirect catch-all in seoMiddleware.
  app.use(eventCalendarRoute);
  app.use(eventOgImageRoute);
  app.use(eventLiveFeedRoute);

  // Hard short-circuit: if a request for an SEO file ever falls through
  // (e.g. dynamic route threw), force a 404 with proper Content-Type instead
  // of letting the SPA HTML fallback be served — Google MUST NOT receive
  // text/html for an .xml URL.
  app.use((req, res, next) => {
    const p = req.path;
    if (
      /^\/sitemap[\w-]*\.xml$/.test(p) ||
      p === "/robots.txt" ||
      p === "/rss.xml" ||
      p === "/feed.xml" ||
      p === "/jobs-feed.xml"
    ) {
      if (!res.headersSent) {
        res.status(404)
          .set("Content-Type", p.endsWith(".txt") ? "text/plain" : "application/xml")
          .send(p.endsWith(".txt") ? "Not found" : '<?xml version="1.0"?><error>not found</error>');
        return;
      }
    }
    next();
  });

  // SEO middleware - handles 410s, redirects, noindex, trailing slashes
  app.use(seoMiddleware);
  // Ads.txt route (must be before Vite middleware)
  app.use(adsRoutes);
  // Article redirect middleware for SEO (301 redirects for non-primary category URLs)
  app.use(articleRedirectMiddleware);
  // Edition resolver — attaches req.edition + sets Vary: Cookie so any
  // cache layer keys personalized HTML by the tsEdition cookie.
  // Bots always get International, never a country edition.
  app.use(editionMiddleware);
  // Global error handler to prevent 5xx errors from reaching Google
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err.message, err.stack);
    
    // Don't expose internal errors to clients
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
      });
    }
  });
  
  // Apply pending drizzle migrations before serving. Non-fatal by design:
  // a DB that was provisioned outside the migration journal logs an error
  // and the server still boots. Skippable via SKIP_STARTUP_MIGRATIONS=1.
  await runStartupMigrations();

  // development mode uses Vite, production mode uses static files.
  // The specifier is built at runtime so esbuild can't statically
  // resolve it — vite (a devDependency) must never end up in the
  // production bundle, where importing it crashes on startup.
  if (process.env.NODE_ENV === "development") {
    const devViteModule = "./vite" + "";
    const { setupVite } = await import(devViteModule);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`[${publication.name}] Server running on http://localhost:${port}/`);

    // Sitemap smoke test — runs every generator once at startup so column
    // typos / SQL errors surface in deploy logs instead of silently failing
    // when Googlebot crawls a sitemap. Non-fatal: server keeps running even
    // if a generator throws; the error is just logged loudly.
    setTimeout(async () => {
      try {
        const { seoService } = await import("../services/seo.service");
        const generators: Array<[string, () => Promise<string>]> = [
          ["index", () => seoService.generateSitemapIndex()],
          ["news", () => seoService.generateGoogleNewsSitemap()],
          ["images", () => seoService.generateImagesSitemap()],
          ...["articles", "jobs", "people", "investors", "companies",
              "accelerators", "events", "resources", "research",
              "categories", "tags", "authors", "pages"]
            .map((m): [string, () => Promise<string>] =>
              [m, () => seoService.generateSitemap(m)]),
        ];
        const failed: string[] = [];
        for (const [name, gen] of generators) {
          try { await gen(); } catch (err) {
            failed.push(name);
            console.error(`[Sitemap-Smoke:${name}] FAILED:`, err instanceof Error ? err.message : err);
            const sql = (err as any)?.sqlMessage;
            if (sql) console.error(`[Sitemap-Smoke:${name}] SQL: ${sql}`);
          }
        }
        if (failed.length > 0) {
          console.error(`[Sitemap-Smoke] ${failed.length}/${generators.length} sitemaps fail to generate: ${failed.join(", ")}`);
        } else {
          console.log(`[Sitemap-Smoke] OK — all ${generators.length} sitemaps generate successfully`);
        }
      } catch (err) {
        console.error("[Sitemap-Smoke] Bootstrap failed:", err);
      }
    }, 15000); // 15s after listen — DB pool is warm by then

    // Start the scheduler to auto-publish scheduled articles (every minute)
    // Seed workflow statuses if the table is empty — a dozen modules
    // (events, jobs, news, companies…) hard-require the editorial
    // 'published' status and 500 without it. Idempotent: no-ops when
    // any status row exists.
    import("../services/workflow.service")
      .then(m => m.workflowService.initializeWorkflows())
      .then(() => console.log("[Workflow] status seed check complete"))
      .catch(err => console.error("[Workflow] status seeding failed:", (err as Error).message));

    schedulerService.start(60000);

    // AI event coverage agent — every 15 min, sweeps the web for news
    // about events currently in live mode and files draft updates into
    // the editor approval queue. No-op when nothing is live.
    if (process.env.NODE_ENV === "production") {
      const sweep = () =>
        import("../services/ai/eventCoverageAgent.service")
          .then(m => m.runEventCoverageSweep())
          .catch(err => console.error("[CoverageAgent] sweep error:", (err as Error).message));
      setInterval(sweep, 15 * 60 * 1000);
      setTimeout(sweep, 2 * 60 * 1000); // first sweep shortly after boot
    }
  });
}

startServer().catch(console.error);
