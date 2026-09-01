import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { resolveEdition, type ResolvedEdition } from "../services/edition.service";
import type { TenantContext, TenantRow } from "../middleware/tenant.middleware";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Active Edition for this request. */
  edition: ResolvedEdition;
  /** Active tenant — populated by `tenantMiddleware` from the Host
   *  header. NULL means the request hit the apex / a reserved
   *  subdomain (legacy techscoop.io public surface). */
  tenantId: number | null;
  tenant: TenantRow | null;
  tenantResolvedVia: TenantContext["resolvedVia"];
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Edition might already be set by the Express middleware for
  // non-API routes; fall through to a fresh resolve when not.
  const edition =
    (opts.req as any).edition ||
    (await resolveEdition({
      cookieHeader: opts.req.headers.cookie,
      cfCountry: (opts.req.headers["cf-ipcountry"] || opts.req.headers["x-country"]) as string | undefined,
      userAgent: opts.req.headers["user-agent"],
    }));

  // Tenant — already resolved by the Express tenantMiddleware and
  // pinned on `req.tenantContext`. If the middleware didn't run (e.g.
  // a tRPC adapter consumer that bypasses Express), fall through to a
  // safe default (apex / no tenant) so downstream code never sees
  // undefined.
  const tenantCtx = (opts.req as any).tenantContext as TenantContext | undefined;

  return {
    req: opts.req,
    res: opts.res,
    user,
    edition,
    tenantId: tenantCtx?.tenantId ?? null,
    tenant: tenantCtx?.tenant ?? null,
    tenantResolvedVia: tenantCtx?.resolvedVia ?? "unknown",
  };
}
