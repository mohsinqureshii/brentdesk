/**
 * Dates in the language of the page.
 *
 * Every reader-facing date was formatted with a hardcoded "en-US", so an
 * Arabic article carried "September 3, 2026" and the events strip on an
 * Arabic homepage read "SEP". A translated archive with English months in
 * the bylines is still visibly an English site.
 *
 * The language is read off <html lang>, which LocaleProvider sets before
 * first paint, so nothing has to be threaded through the component tree to
 * every one of these call sites.
 *
 * Arabic gets an explicit calendar and numbering system rather than the bare
 * tag. "ar-SA" defaults to the Hijri calendar and Arabic-Indic digits, which
 * would silently turn 3 September 2026 into a different date in unfamiliar
 * numerals — Gulf business press prints Gregorian dates in Western numerals,
 * and so does the rest of this archive.
 */

function documentLocale(): string {
  if (typeof document === "undefined") return "en-US";
  const lang = document.documentElement.lang || "en";
  if (!lang || lang === "en" || lang.startsWith("en-")) return "en-US";
  if (lang.startsWith("ar")) return "ar-u-nu-latn-ca-gregory";
  return lang;
}

type Dateish = Date | string | number;

function asDate(d: Dateish): Date {
  return d instanceof Date ? d : new Date(d);
}

/** `fmtDate(publishedAt, { month: "short", day: "numeric" })` */
export function fmtDate(d: Dateish, opts?: Intl.DateTimeFormatOptions): string {
  return asDate(d).toLocaleDateString(documentLocale(), opts);
}

export function fmtTime(d: Dateish, opts?: Intl.DateTimeFormatOptions): string {
  return asDate(d).toLocaleTimeString(documentLocale(), opts);
}

export function fmtDateTime(d: Dateish, opts?: Intl.DateTimeFormatOptions): string {
  return asDate(d).toLocaleString(documentLocale(), opts);
}
