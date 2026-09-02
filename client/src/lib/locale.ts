/**
 * Locale helpers for the browser.
 *
 * The same two rules the server applies, applied on the client so a link
 * built in React and a link built in SSR agree:
 *
 *   - The default language has no prefix. English lives at
 *     /construction/big-5-opens, so every URL indexed before the site had
 *     more than one language stays exactly where it is.
 *   - Every other language is a path prefix. /ar/construction/big-5-opens
 *     is a real URL: indexable, linkable, and it opens in Arabic for
 *     whoever receives it.
 */

export const LOCALE_COOKIE = "bdLang";

export interface LocaleLike {
  code: string;
  isDefault: boolean;
}

/** Remove a known locale prefix from a path. Unknown first segments are
 *  left alone — `/oil-gas/...` is a category, not a language. */
export function stripLocale(path: string, codes: string[]): string {
  const m = path.match(/^\/([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)(\/.*|$)/);
  if (!m) return path || "/";
  const found = codes.find(c => c.toLowerCase() === m[1].toLowerCase());
  if (!found) return path;
  return m[2] || "/";
}

/** The locale prefix on the current path, if it is one of `codes`. */
export function localeFromPath(path: string, codes: string[]): string | null {
  const m = path.match(/^\/([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)(\/.*|$)/);
  if (!m) return null;
  return codes.find(c => c.toLowerCase() === m[1].toLowerCase()) ?? null;
}

/** Add a locale prefix to a site-relative path. */
export function withLocale(path: string, locale: LocaleLike): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale.isDefault) return clean;
  return clean === "/" ? `/${locale.code}` : `/${locale.code}${clean}`;
}

/**
 * Put the language on the document.
 *
 * `lang` is what a screen reader switches voice on and what a browser picks
 * a font stack with. `dir` is what turns an Arabic page from Arabic words in
 * a left-to-right layout into an Arabic page. Both belong on <html>, which
 * React does not own, so they are set imperatively.
 */
export function applyDocumentLocale(code: string, direction: "ltr" | "rtl"): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (html.lang !== code) html.lang = code;
  if (html.dir !== direction) html.dir = direction;
}
