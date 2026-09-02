/**
 * Locale Service
 * ----------------------------------------------------------------------
 * Resolves the language for an incoming request, the same way
 * edition.service resolves the country view.
 *
 * Resolution order, highest priority first:
 *   1. The URL path — /ar/construction/slug. This is the one that matters:
 *      a language with its own URL is a page Google can index, and a link
 *      someone can send to a colleague and have it open in the language
 *      they were reading.
 *   2. The `bdLang` cookie — what the visitor last chose, so the switcher
 *      is sticky when they navigate to a bare path.
 *   3. Accept-Language, matched against the active locales.
 *   4. The default locale. English here, and the fallback for every field
 *      no translation covers.
 *
 * The default language never appears in a URL. English lives at
 * /construction/slug, not /en/construction/slug, so the archive's existing
 * URLs — the ones already indexed and linked — do not move.
 *
 * Bots get exactly what the URL says and nothing else: no cookie, no
 * Accept-Language. A crawler must see one stable page per URL, or the
 * language served depends on who is asking, which is cloaking.
 */

import { listLocales, getDefaultLocale, type LocaleRow } from "./translation.service";

export interface ResolvedLocale {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  isDefault: boolean;
  /** The path with any locale prefix removed — what the router should match. */
  basePath: string;
  /** Where the prefix came from. Useful in the SSR layer, which must not
   *  emit a canonical pointing at a language the URL did not ask for. */
  source: "path" | "cookie" | "header" | "default";
}

export const LOCALE_COOKIE = "bdLang";

const BOT_RE = /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|lighthouse|gtmetrix|headlesschrome/i;

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Split a path into its locale prefix and the rest.
 *
 * Exported because the SSR layer and the sitemap generator both need to
 * reason about the same split without resolving a whole request.
 */
export function splitLocalePath(
  path: string, codes: string[],
): { code: string | null; basePath: string } {
  const m = path.match(/^\/([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)(\/.*|$)/);
  if (!m) return { code: null, basePath: path };
  const candidate = m[1].toLowerCase();
  const hit = codes.find(c => c.toLowerCase() === candidate);
  if (!hit) return { code: null, basePath: path };
  return { code: hit, basePath: m[2] || "/" };
}

/** Best match for an Accept-Language header among the active locales.
 *  Matches the base language too, so `ar-SA` finds `ar`. */
export function matchAcceptLanguage(header: string | undefined, active: LocaleRow[]): string | null {
  if (!header) return null;
  const wanted = header
    .split(",")
    .map(part => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find(p => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .filter(w => w.tag && w.tag !== "*")
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const exact = active.find(l => l.code.toLowerCase() === tag);
    if (exact) return exact.code;
    const base = tag.split("-")[0];
    const loose = active.find(l => l.code.toLowerCase().split("-")[0] === base);
    if (loose) return loose.code;
  }
  return null;
}

function toResolved(
  locale: LocaleRow, basePath: string, source: ResolvedLocale["source"],
): ResolvedLocale {
  return {
    code: locale.code,
    name: locale.name,
    nativeName: locale.nativeName,
    direction: locale.direction,
    isDefault: locale.isDefault,
    basePath,
    source,
  };
}

/** The locale to fall back to when the table is empty or unreachable —
 *  a database that cannot answer must not stop a page rendering. */
const EN: ResolvedLocale = {
  code: "en", name: "English", nativeName: "English", direction: "ltr",
  isDefault: true, basePath: "/", source: "default",
};

export async function resolveLocale(opts: {
  path: string;
  cookieHeader?: string;
  acceptLanguage?: string;
  userAgent?: string;
}): Promise<ResolvedLocale> {
  const active = await listLocales({ activeOnly: true });
  if (!active.length) return { ...EN, basePath: opts.path || "/" };

  const fallback = (await getDefaultLocale()) ?? active[0];
  const { code, basePath } = splitLocalePath(opts.path || "/", active.map(l => l.code));

  // 1. The URL wins, always, for everyone.
  if (code) {
    const hit = active.find(l => l.code === code)!;
    // The default language has no prefix. /en/... redirects to /... rather
    // than serving the same page at two URLs.
    if (hit.isDefault) return toResolved(hit, basePath, "path");
    return toResolved(hit, basePath, "path");
  }

  // Bots stop here. One URL, one language, no negotiation.
  const isBot = BOT_RE.test(opts.userAgent ?? "");
  if (isBot) return toResolved(fallback, basePath, "default");

  // 2. What this visitor last chose.
  const cookie = readCookie(opts.cookieHeader, LOCALE_COOKIE);
  if (cookie) {
    const hit = active.find(l => l.code === cookie);
    if (hit) return toResolved(hit, basePath, "cookie");
  }

  // 3. What their browser asks for.
  const header = matchAcceptLanguage(opts.acceptLanguage, active);
  if (header) {
    const hit = active.find(l => l.code === header)!;
    if (!hit.isDefault) return toResolved(hit, basePath, "header");
  }

  return toResolved(fallback, basePath, "default");
}

/** Prefix a site-relative path for a locale. The default language has no
 *  prefix, so existing URLs stay exactly as they are. */
export function localePath(path: string, locale: { code: string; isDefault: boolean }): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale.isDefault) return clean;
  return clean === "/" ? `/${locale.code}` : `/${locale.code}${clean}`;
}
