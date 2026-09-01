/**
 * Tenant Extraction Middleware
 * ----------------------------------------------------------------------
 * Resolves the active tenant from the request `Host` header and pins it
 * onto `req.tenantContext`. Every downstream tRPC procedure can read it
 * via `ctx.tenantId` (single-tenant path) or `ctx.tenant` (full row).
 *
 * Resolution order:
 *   1. Exact match on `tenants.custom_domain` (e.g. careers.acme.com)
 *   2. Subdomain match: split host on '.', first label → `tenants.slug`
 *   3. Reserved subdomain (www, api, admin, …) → tenantId = null
 *      (apex / platform landing → tenantId = null = legacy public)
 *
 * Caching:
 *   In-process 60s TTL map keyed by host. A tenant's row changes
 *   rarely; we re-check periodically without hitting the DB per request.
 *
 * What "null tenant" means:
 *   The legacy public job board / news site keeps working
 *   exactly as before. Anything tenant-scoped (talent platform) just
 *   refuses to run with null and returns a "tenant required" error.
 */

import { publication } from "../../shared/publication";
import type { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";

// ------------------------------------------------------------
// Reserved subdomains — never resolved as tenant slugs. Add here as
// new public services come online; missing entries surface as 404s
// from the tenant lookup (which then falls back to null), so this is
// belt-and-suspenders.
// ------------------------------------------------------------
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "static",
  "cdn",
  "mail",
  "smtp",
  "ftp",
  "blog",
  "docs",
  "status",
  "support",
  "help",
  "auth",
  "id",
]);

export interface TenantRow {
  id: number;
  slug: string;
  name: string;
  customDomain: string | null;
  plan: "free" | "starter" | "growth" | "enterprise";
  status: "trial" | "active" | "suspended" | "cancelled";
  dataResidency: "us" | "eu" | "ksa";
  settings: unknown;
}

export interface TenantContext {
  tenantId: number | null;
  tenant: TenantRow | null;
  host: string;
  resolvedVia: "custom_domain" | "subdomain" | "reserved" | "apex" | "unknown";
}

// ------------------------------------------------------------
// 60s in-process cache. Tenant lookups dominate every request, so
// caching by Host header is the cheapest thing we can do. When Phase 1c
// adds Redis, this stays — Redis is for sessions, not for the
// per-request tenant resolution which lives on the hot path.
// ------------------------------------------------------------
const cache = new Map<string, { ctx: TenantContext; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

function getCached(host: string): TenantContext | null {
  const hit = cache.get(host);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(host);
    return null;
  }
  return hit.ctx;
}

function setCached(host: string, ctx: TenantContext): void {
  cache.set(host, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Test-only / admin-only: drop the cache. Used after creating a new
 * tenant in the admin flow so the new subdomain works immediately
 * without waiting for TTL.
 */
export function invalidateTenantCache(host?: string): void {
  if (host) cache.delete(host);
  else cache.clear();
}

// ------------------------------------------------------------
// Host parsing
// ------------------------------------------------------------

// Hosts that resolve to the public site (tenantId = null). The publication
// apex comes from central config; extra apexes (e.g. a www alias or a
// separate talent-platform domain) can be added via TENANT_APEX_HOSTS
// (comma-separated) without a code change.
const APEX_HOSTS = new Set(
  [
    publication.domain,
    `www.${publication.domain}`,
    "localhost",
    "127.0.0.1",
    ...(process.env.TENANT_APEX_HOSTS?.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean) ?? []),
  ],
);

function parseHost(rawHost: string | undefined): {
  host: string;
  firstLabel: string | null;
  isApex: boolean;
} {
  const host = (rawHost || "").toLowerCase().split(":")[0].trim();
  if (!host) return { host: "", firstLabel: null, isApex: false };

  if (APEX_HOSTS.has(host)) {
    return { host, firstLabel: null, isApex: true };
  }

  const labels = host.split(".");
  // `tenant.<platform domain>` → ['tenant', '<platform>', 'com'] → first = tenant
  // `careers.acme.com` → ['careers', 'acme', 'com'] → first = careers (used as custom domain candidate)
  // `localhost` → ['localhost'] → first = null
  if (labels.length < 2) return { host, firstLabel: null, isApex: false };

  return { host, firstLabel: labels[0], isApex: false };
}

function isPlatformSubdomain(host: string): boolean {
  if (host.endsWith(`.${publication.domain}`)) return true;
  for (const apex of Array.from(APEX_HOSTS)) {
    if (apex !== "localhost" && apex !== "127.0.0.1" && host.endsWith(`.${apex}`)) return true;
  }
  return false;
}

// ------------------------------------------------------------
// DB lookup
// ------------------------------------------------------------

async function lookupTenant(host: string, firstLabel: string | null): Promise<TenantRow | null> {
  const db = await getDb();
  if (!db) return null;

  // Strategy 1: full host = custom domain
  // Strategy 2: first label (subdomain) = slug, but only when on
  //             a platform domain — random hosts don't match a slug.
  const conditions = [eq(tenants.customDomain, host)];
  if (firstLabel && !RESERVED_SUBDOMAINS.has(firstLabel) && isPlatformSubdomain(host)) {
    conditions.push(eq(tenants.slug, firstLabel));
  }

  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      customDomain: tenants.customDomain,
      plan: tenants.plan,
      status: tenants.status,
      dataResidency: tenants.dataResidency,
      settings: tenants.settings,
    })
    .from(tenants)
    .where(or(...conditions))
    .limit(1);

  return (rows[0] as TenantRow) ?? null;
}

// ------------------------------------------------------------
// Express middleware
// ------------------------------------------------------------

// Module augmentation for Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const { host, firstLabel, isApex } = parseHost(req.headers.host);

    const cached = getCached(host);
    if (cached) {
      req.tenantContext = cached;
      return next();
    }

    if (isApex) {
      const ctx: TenantContext = {
        tenantId: null,
        tenant: null,
        host,
        resolvedVia: "apex",
      };
      setCached(host, ctx);
      req.tenantContext = ctx;
      return next();
    }

    if (firstLabel && RESERVED_SUBDOMAINS.has(firstLabel) && isPlatformSubdomain(host)) {
      const ctx: TenantContext = {
        tenantId: null,
        tenant: null,
        host,
        resolvedVia: "reserved",
      };
      setCached(host, ctx);
      req.tenantContext = ctx;
      return next();
    }

    const tenant = await lookupTenant(host, firstLabel);

    let resolvedVia: TenantContext["resolvedVia"] = "unknown";
    if (tenant) {
      resolvedVia = tenant.customDomain === host ? "custom_domain" : "subdomain";
    }

    const ctx: TenantContext = {
      tenantId: tenant?.id ?? null,
      tenant,
      host,
      resolvedVia,
    };
    setCached(host, ctx);
    req.tenantContext = ctx;

    return next();
  } catch (err) {
    console.error("[Tenant] middleware error:", err);
    // Fail open — tenant resolution failure shouldn't 500 the public
    // marketing site. Downstream tRPC procedures that require a tenant
    // will throw their own clearer error.
    req.tenantContext = {
      tenantId: null,
      tenant: null,
      host: req.headers.host || "",
      resolvedVia: "unknown",
    };
    return next();
  }
}

/**
 * tRPC-side helper: throw if the request didn't resolve to a tenant.
 * Use this in the talent platform routers. The legacy public-site
 * routers (news, events) keep accepting null and just behave as before.
 */
export function requireTenant(ctx: { tenantId?: number | null }): number {
  if (!ctx.tenantId) {
    throw new Error(
      "TENANT_REQUIRED: this endpoint must be called from a tenant subdomain or custom domain",
    );
  }
  return ctx.tenantId;
}
