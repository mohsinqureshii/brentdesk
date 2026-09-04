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
  /** The page is in the source language; nothing else in the head to fix. */
  isDefault: boolean;
  /** The same page in the source language — what the templates wrote. */
  sourceUrl: string;
  /** The language-less path, "/construction/big-5-opens". */
  basePath: string;
}> {
  const active = await listLocales({ activeOnly: true });
  const fallback = {
    alternates: "", canonical: "", lang: "en", dir: "ltr" as const,
    isDefault: true, sourceUrl: "", basePath: path,
  };
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
    isDefault: here.isDefault,
    sourceUrl: def ? url(def) : url(here),
    basePath,
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
  const { alternates, canonical, lang, dir, isDefault, sourceUrl, basePath } = await localeLinkTags(path);
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
  // og:locale is written once for English in the article template. A share
  // of an Arabic URL should carry the Arabic locale, or the preview is
  // labelled as an English page.
  const ogLocale = lang === "ar" ? "ar_SA" : lang === "en" ? "en_US" : `${lang}_${lang.toUpperCase()}`;
  out = out.replace(/<meta property="og:locale" content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${ogLocale}" />`);

  // The canonical must point at this language's URL, not the English one.
  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `    <link rel="canonical" href="${escapeAttr(canonical)}" />\n  </head>`);
  }

  // Everything else in the head that names the page was written for the
  // source language: og:url and twitter:url, the NewsArticle's url and
  // mainEntityOfPage, the breadcrumb, inLanguage. Left alone, the Arabic
  // page's own structured data says it is the English one — which asks a
  // search engine to fold it back into the English result.
  if (!isDefault && sourceUrl) {
    out = out.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`);
    out = out.replace(/<meta name="twitter:url" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:url" content="${escapeAttr(canonical)}" />`);

    const home = absoluteUrl("/").replace(/\/$/, "");
    const localHome = `${home}/${lang}`;
    const section = basePath.split("/").filter(Boolean)[0];
    const sourceSection = section ? `${home}/${section}` : "";
    const localSection = section ? `${localHome}/${section}` : "";
    const swap = (body: string, from: string, to: string) =>
      from ? body.split(JSON.stringify(from)).join(JSON.stringify(to)) : body;

    out = out.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/gi,
      (_m, open: string, body: string, close: string) => {
        let b = swap(body, sourceUrl, canonical);
        b = b.replace(/"inLanguage":"[^"]*"/g, `"inLanguage":${JSON.stringify(lang)}`);
        // Only a breadcrumb names the home and section pages as pages; the
        // publisher's url on a NewsArticle is the organisation, not a page.
        if (/"@type":"BreadcrumbList"/.test(b)) {
          b = swap(b, sourceSection, localSection);
          b = swap(b, `${home}/`, localHome);
          b = swap(b, home, localHome);
        }
        return open + b + close;
      });
  }

  out = out.replace(/<\/head>/i, `    ${alternates}\n  </head>`);
  return out;
}

/**
 * The alternate set for a sitemap entry.
 *
 * Same rules as the page tags — reciprocal, absolute, self-included — but
 * expressed as `xhtml:link` inside `<url>`, which is how a sitemap carries
 * hreflang. A sitemap that lists only the English URLs leaves the Arabic
 * archive discoverable solely through the tags on the English pages, which
 * is slower and weaker than declaring both.
 *
 * Returns "" when one language is configured, so a single-language site
 * emits exactly the sitemap it emitted before.
 */
export function sitemapAlternates(
  loc: string, baseUrl: string,
  active: Array<{ code: string; isDefault: boolean }>,
): string {
  if (active.length < 2) return "";
  const bare = loc.startsWith(baseUrl) ? loc.slice(baseUrl.length) || "/" : loc;
  const url = (l: { code: string; isDefault: boolean }) =>
    baseUrl + (l.isDefault ? bare : `/${l.code}${bare === "/" ? "" : bare}`);

  const lines = active.map(l =>
    `\n    <xhtml:link rel="alternate" hreflang="${escapeAttr(l.code)}" href="${escapeAttr(url(l))}" />`,
  );
  const def = active.find(l => l.isDefault);
  if (def) {
    lines.push(`\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeAttr(url(def))}" />`);
  }
  return lines.join("");
}
