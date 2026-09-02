/**
 * hreflang alternates
 * ----------------------------------------------------------------------
 * Tells a search engine that /construction/big-5-opens and
 * /ar/construction/big-5-opens are the same story in two languages, so it
 * shows the Arabic one to an Arabic searcher instead of treating it as a
 * duplicate or ignoring it.
 *
 * Three rules, and getting any of them wrong is worse than emitting nothing:
 *
 *   1. The set must be reciprocal and must include the page itself. A page
 *      that lists alternates but not itself is ignored.
 *   2. Every alternate must be an absolute URL.
 *   3. x-default points at the source language, which is where a reader
 *      whose language the site does not publish in should land.
 *
 * The canonical is per-language: the Arabic page's canonical is the Arabic
 * URL, not the English one. Pointing it at English would ask Google to drop
 * the Arabic page from the index entirely — the single most common way to
 * make a multilingual site invisible.
 */

import { absoluteUrl } from "../../shared/publication";
import { listLocales } from "./translation.service";
import { splitLocalePath } from "./locale.service";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * The `<link rel="alternate">` set for one path, plus the canonical for the
 * language the path is in.
 *
 * Returns empty strings when only one language is configured: a site with
 * one language has no alternates, and emitting a lone self-referencing
 * hreflang is noise.
 */
export async function localeLinkTags(path: string): Promise<{
  alternates: string;
  canonical: string;
  lang: string;
  dir: "ltr" | "rtl";
}> {
  const active = await listLocales({ activeOnly: true });
  const fallback = { alternates: "", canonical: "", lang: "en", dir: "ltr" as const };
  if (active.length < 2) return fallback;

  const { code, basePath } = splitLocalePath(path, active.map(l => l.code));
  const here = code
    ? active.find(l => l.code === code)
    : active.find(l => l.isDefault);
  if (!here) return fallback;

  const url = (l: { code: string; isDefault: boolean }) =>
    absoluteUrl(l.isDefault ? basePath : `/${l.code}${basePath === "/" ? "" : basePath}`);

  const lines = active.map(l =>
    `<link rel="alternate" hreflang="${escapeAttr(l.code)}" href="${escapeAttr(url(l))}" />`,
  );
  const def = active.find(l => l.isDefault);
  if (def) {
    lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeAttr(url(def))}" />`);
  }

  return {
    alternates: lines.join("\n    "),
    canonical: url(here),
    lang: here.code,
    dir: here.direction,
  };
}

/**
 * Put the language onto a rendered page.
 *
 * Rewrites `<html lang dir>`, replaces the canonical with the one for this
 * language, and appends the alternates. Done as a post-processing step over
 * the finished HTML so every SSR route gets it from one place rather than
 * each of the eleven meta-tag generators growing its own copy.
 */
export async function applyLocaleHead(html: string, path: string): Promise<string> {
  const { alternates, canonical, lang, dir } = await localeLinkTags(path);
  if (!alternates) return html;

  let out = html;

  // <html lang="en"> → the language actually served, with its direction.
  out = out.replace(
    /<html([^>]*)>/i,
    (_m, attrs: string) => {
      const cleaned = String(attrs)
        .replace(/\slang="[^"]*"/i, "")
        .replace(/\sdir="[^"]*"/i, "");
      return `<html${cleaned} lang="${lang}" dir="${dir}">`;
    },
  );

  // The canonical must point at this language's URL, not the English one.
  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `    <link rel="canonical" href="${escapeAttr(canonical)}" />\n  </head>`);
  }

  out = out.replace(/<\/head>/i, `    ${alternates}\n  </head>`);
  return out;
}
