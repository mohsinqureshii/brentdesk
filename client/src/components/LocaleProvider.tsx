/**
 * Locale Provider
 * ----------------------------------------------------------------------
 * Two jobs, both of which have to happen outside React's tree.
 *
 * 1. ROUTING. A non-default language is a path prefix, so /ar/mining has to
 *    match the same route as /mining. wouter's `base` does exactly that:
 *    every <Route path="/mining"> inside it matches /ar/mining, and every
 *    <Link href="/mining"> it renders points at /ar/mining. Without it the
 *    locale segment would be read as a category and every page would 404.
 *
 * 2. DIRECTION. `lang` and `dir` live on <html>, which React does not own.
 *    Setting `dir="rtl"` is the difference between an Arabic page and a page
 *    with Arabic words laid out left to right — it moves the whole layout,
 *    including anything using CSS logical properties.
 *
 * The prefix is read from the URL rather than from a query, so the first
 * paint is already in the right language and direction instead of flipping
 * once a request comes back.
 */

import { useEffect, useMemo, type ReactNode } from "react";
import { Router as WouterRouter } from "wouter";
import { trpc } from "@/lib/trpc";
import { applyDocumentLocale, localeFromPath } from "@/lib/locale";
import { StringsProvider } from "@/lib/i18n";

/** Known before any request returns, so a hard load of /ar/... is laid out
 *  right to left immediately rather than after a round trip. Extended by
 *  whatever the desk has configured, which the query below supplies. */
const KNOWN_RTL = new Set(["ar", "he", "fa", "ur", "ps", "sd", "ckb", "dv", "yi"]);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const localesQuery = trpc.locales.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const list = localesQuery.data;

  const path = typeof window === "undefined" ? "/" : window.location.pathname;

  // Before the list arrives, guess from the path shape alone. A two or three
  // letter first segment that is a known language tag is treated as one; a
  // real category slug ("oil-gas", "mining") is longer or hyphenated, and
  // the guess is corrected the moment the configured list loads.
  const active = useMemo(() => {
    if (list?.length) {
      const code = localeFromPath(path, list.map(l => l.code));
      const hit = code ? list.find(l => l.code === code) : list.find(l => l.isDefault);
      return hit
        ? { code: hit.code, direction: hit.direction as "ltr" | "rtl", isDefault: hit.isDefault }
        : { code: "en", direction: "ltr" as const, isDefault: true };
    }
    const m = path.match(/^\/([a-z]{2,3})(?:\/|$)/i);
    const guess = m?.[1]?.toLowerCase();
    if (guess && KNOWN_RTL.has(guess)) return { code: guess, direction: "rtl" as const, isDefault: false };
    return { code: "en", direction: "ltr" as const, isDefault: true };
  }, [list, path]);

  useEffect(() => {
    applyDocumentLocale(active.code, active.direction);
  }, [active.code, active.direction]);

  // The default language has no prefix, so its base is "" and every existing
  // URL keeps working untouched.
  const base = active.isDefault ? "" : `/${active.code}`;

  return (
    <WouterRouter base={base}>
      <StringsProvider>{children}</StringsProvider>
    </WouterRouter>
  );
}

export default LocaleProvider;
