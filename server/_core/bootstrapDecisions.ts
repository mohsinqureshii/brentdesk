/**
 * Whether a boot should seed or ingest.
 *
 * These used to be emptiness tests, which only ever bootstrap a brand-new
 * database: the moment the first article landed the check went quiet, so
 * every later content release needed someone to remember a variable on the
 * deploy. A release shipping 153 new articles into a database holding 115
 * then looks, from the outside, exactly like a deploy that did nothing.
 *
 * Both operations are idempotent, so the useful question is not "is this
 * table empty" but "does the build carry more than the database holds".
 *
 * Pure on purpose — the counts are gathered by the caller so the decision
 * itself can be tested without a database.
 */

/** A count that could not be read. Never decides anything on its own. */
type Count = number | null;

function flagged(flag: string | undefined): boolean | null {
  if (flag === "1") return true;
  if (flag === "0") return false;
  return null;
}

/** Seed when the database has never been seeded, or when this build adds
 *  profiles it does not have yet. */
export function shouldSeed(
  flag: string | undefined,
  have: { countries: Count; companies: Count; events: Count; locales: Count },
  target: { companies: number; events: number; locales: number },
): boolean {
  const forced = flagged(flag);
  if (forced !== null) return forced;
  if (have.countries === 0) return true;
  return (have.companies !== null && have.companies < target.companies)
      || (have.events !== null && have.events < target.events)
      || (have.locales !== null && have.locales < target.locales);
}

/**
 * Ingest when the build carries more than the database holds — of EITHER
 * articles or translations.
 *
 * Articles alone were not enough. A release whose only new content was a
 * translated archive looked, to a check counting articles, exactly like a
 * deploy with nothing to do: 268 in the build, 268 in the database, skip.
 * The Arabic never landed, and the site served English under an Arabic
 * language switcher — the one failure this whole check exists to prevent,
 * reappearing on a different axis.
 *
 * A `want` of 0 means that file could not be read, which is not a reason to
 * run an ingest with nothing to ingest.
 */
export function shouldIngest(
  flag: string | undefined,
  have: { articles: Count; translations: Count; revision?: string | null },
  want: { articles: number; translations: number; revision?: string },
): boolean {
  const forced = flagged(flag);
  if (forced !== null) return forced;
  const behind = (h: Count, w: number) => h !== null && (h === 0 ? w > 0 : h < w);
  if (behind(have.articles, want.articles) || behind(have.translations, want.translations)) return true;

  // A release that edits, merges or renames articles ships the same number
  // of rows as the one before it, which the counts cannot see. The build's
  // fingerprint can: it changes whenever anything the reader sees changed.
  // A stored fingerprint that could not be read (null) decides nothing, as
  // with the counts; a database that never recorded one ("") is behind by
  // definition. An unreadable archive (want.articles 0) still never runs.
  if (want.revision && want.articles > 0 && have.revision !== null && have.revision !== undefined) {
    return have.revision !== want.revision;
  }
  return false;
}
