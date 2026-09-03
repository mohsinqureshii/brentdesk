/**
 * Send a reader to the language they read in — once, and never again after
 * they choose for themselves.
 *
 * The rule this enforces is that A URL DEFINES THE LANGUAGE OF ITS PAGE.
 * /construction/big-5-opens is the English article and
 * /ar/construction/big-5-opens is the Arabic one, which is what the canonical
 * and the hreflang set on every page already promise. Serving Arabic at the
 * English URL because a browser asked for Arabic would break that promise:
 * two languages at one address, each claiming to be the canonical of the
 * other, which is how a multilingual site gets both versions dropped.
 *
 * So negotiation redirects rather than swapping content. Accept-Language and
 * the cookie decide WHERE to send someone; the URL they land on decides what
 * they read.
 *
 * Four rules keep it safe:
 *
 *   1. Crawlers are never redirected. A bot must see exactly the URL it
 *      asked for — anything else is cloaking, and Google needs to reach both
 *      sides of an hreflang pair to honour it.
 *   2. A URL that already names a language is left alone, in both
 *      directions. An Arabic link opens in Arabic for an English reader, and
 *      an English link opens in English for an Arabic one. Whoever sent the
 *      link chose the language.
 *   3. The reader's own choice wins over their browser's. The switcher sets
 *      the cookie; once it says English, no header sends them to Arabic
 *      again. That is the escape hatch every auto-redirecting site needs and
 *      most get wrong.
 *   4. The redirect carries the cookie, so the negotiation happens once per
 *      reader rather than on every request.
 *
 * `Vary` is set on every response this touches, including the ones it lets
 * through: a cache that stored the English homepage for one reader must not
 * serve it to the next one whose headers would have been redirected.
 */

import type { Request, Response, NextFunction } from "express";
import { listLocales } from "../services/translation.service";
import {
  LOCALE_COOKIE, splitLocalePath, matchAcceptLanguage, localePath,
} from "../services/locale.service";

/** Same list the locale resolver uses. Kept in step deliberately: a client
 *  treated as a bot for content must be treated as one for redirects too. */
const BOT_RE = /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|lighthouse|gtmetrix|headlesschrome/i;

/** Paths that are not pages, so there is nothing to negotiate. */
const NOT_A_PAGE = [
  "/api/", "/admin", "/assets/", "/fonts/", "/images/", "/uploads/", "/@vite", "/src/",
  "/signin", "/signup", "/login", "/logout", "/auth/", "/dashboard", "/profile", "/account",
];

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function localeNegotiationMiddleware(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const path = req.path;
  if (NOT_A_PAGE.some(p => path.startsWith(p))) return next();
  // A file, not a page: anything with an extension in its last segment.
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return next();
  // Rule 1: never redirect a crawler.
  if (BOT_RE.test(req.headers["user-agent"] ?? "")) return next();

  let active;
  try {
    active = await listLocales({ activeOnly: true });
  } catch {
    // A language lookup must never cost a page view.
    return next();
  }
  if (active.length < 2) return next();

  // Whatever happens below, this response depended on these two.
  res.vary("Accept-Language");
  res.vary("Cookie");

  // Rule 2: the URL already names a language. Nothing to negotiate.
  const { code } = splitLocalePath(path, active.map(l => l.code));
  if (code) return next();

  // Rule 3: the reader's own choice, if they have made one.
  const chosen = readCookie(req.headers.cookie, LOCALE_COOKIE);
  const target = chosen
    ? active.find(l => l.code === chosen)
    : (() => {
        const guess = matchAcceptLanguage(req.headers["accept-language"] as string | undefined, active);
        return guess ? active.find(l => l.code === guess) : undefined;
      })();

  // No preference, or a preference for the language this URL already is.
  if (!target || target.isDefault) return next();

  const to = localePath(path, target) + (req.url.slice(path.length) || "");
  // Rule 4: remember it, so this is decided once rather than every request.
  if (!chosen) {
    res.cookie(LOCALE_COOKIE, target.code, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false, sameSite: "lax", path: "/",
    });
  }
  // 302, not 301: this is a decision about a reader, not about a URL, and it
  // changes the moment they press the switcher.
  res.redirect(302, to);
}

export default localeNegotiationMiddleware;
