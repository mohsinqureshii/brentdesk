/**
 * Edition Middleware
 * ----------------------------------------------------------------------
 * Resolves the active edition for every incoming request and stashes
 * it on `req.edition` so downstream tRPC procedures + SSR helpers
 * can read it without re-resolving.
 *
 * Also sets `Vary: Cookie` on responses so any cache layer (Cloudflare,
 * future CDN) will key personalized HTML by the `tsEdition` cookie.
 * Critical for not serving one visitor's edition to another from
 * cache.
 *
 * Skips API routes, static assets, sitemaps — they're either
 * already personalized at the tRPC layer (which gets the same
 * resolution via ctx) or shouldn't vary at all (sitemaps need to
 * be one canonical version per URL).
 */

import { Request, Response, NextFunction } from "express";
import { resolveEdition, type ResolvedEdition } from "../services/edition.service";

// Attach edition to req via module augmentation
declare global {
  namespace Express {
    interface Request {
      edition?: ResolvedEdition;
    }
  }
}

export async function editionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip paths that don't need personalization. SSR / SPA-rendered
  // pages WILL hit this middleware; tRPC API calls also resolve
  // independently in createContext below, but having it on req
  // means SSR helpers can use it too.
  const p = req.path;
  if (
    p.startsWith("/api/sitemap") ||
    p === "/sitemap.xml" ||
    p === "/robots.txt" ||
    p === "/rss.xml" ||
    p === "/feed.xml" ||
    p === "/jobs-feed.xml" ||
    p.startsWith("/assets/") ||
    p.startsWith("/_") ||
    /\.(css|js|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot|xml|json|txt)$/i.test(p)
  ) {
    return next();
  }

  try {
    req.edition = await resolveEdition({
      cookieHeader: req.headers.cookie,
      cfCountry: (req.headers["cf-ipcountry"] || req.headers["x-country"]) as string | undefined,
      userAgent: req.headers["user-agent"],
    });

    // Tell any downstream cache that personalized responses depend
    // on the cookie. Append to any existing Vary header rather than
    // overwriting (e.g., Vary: Accept-Encoding set by compression).
    const existingVary = res.getHeader("Vary");
    const additions = ["Cookie"];
    const merged = existingVary
      ? `${existingVary}, ${additions.join(", ")}`
      : additions.join(", ");
    res.setHeader("Vary", merged);
  } catch (err) {
    // Never let an edition lookup failure break the request.
    console.error("[edition] resolution failed:", err);
  }
  next();
}
