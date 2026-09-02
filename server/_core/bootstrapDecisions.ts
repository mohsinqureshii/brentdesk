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

/** Ingest when the bundled archive would publish more articles than the
 *  database holds. `want` of 0 means the archive could not be read, which is
 *  not a reason to run an ingest with nothing to ingest. */
export function shouldIngest(flag: string | undefined, have: Count, want: number): boolean {
  const forced = flagged(flag);
  if (forced !== null) return forced;
  if (have === null) return false;
  return have === 0 ? want > 0 : have < want;
}
