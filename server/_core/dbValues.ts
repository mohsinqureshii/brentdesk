/**
 * Narrow value adapters for the Drizzle (MySQL) insert/update boundary.
 *
 * The schema stores flags as tinyint (number 0/1) and dates as
 * timestamp mode:'string'. These helpers convert the looser runtime
 * inputs (booleans, Dates) into those representations without changing
 * nullish semantics: `undefined` stays `undefined` (Drizzle omits the
 * key), `null` stays `null`.
 */

/** true→1, false→0, numbers pass through, null/undefined→undefined. */
export function boolInt(v: boolean | number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v ? 1 : 0;
}

/**
 * Normalize a date to the 'YYYY-MM-DD HH:MM:SS' UTC form MySQL accepts
 * for DATETIME/TIMESTAMP columns. null/undefined are preserved.
 *
 * ISO-8601 strings are normalized too, not passed through: MySQL under
 * STRICT_TRANS_TABLES (the default on MySQL 8) rejects
 * '2026-09-02T00:21:57.739Z' with "Incorrect datetime value" because of
 * the T separator, the fractional seconds and the zone designator. A
 * lenient server (MariaDB out of the box) accepts it, so the failure only
 * shows up in production. Plain 'YYYY-MM-DD' and already-normalized
 * values are left alone.
 */
export function toDbDate(v: Date | string): string;
export function toDbDate(v: Date | string | null): string | null;
export function toDbDate(v: Date | string | undefined): string | undefined;
export function toDbDate(v: Date | string | null | undefined): string | null | undefined;
export function toDbDate(v: Date | string | null | undefined): string | null | undefined {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    // Only touch strings that actually carry an ISO time part.
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/.exec(v);
    if (!m) return v;
    const time = m[2].length === 5 ? `${m[2]}:00` : m[2];
    // A zone designator means the clock time is not UTC yet; re-read it.
    if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace("T", " ");
    }
    return `${m[1]} ${time}`;
  }
  return v.toISOString().slice(0, 19).replace("T", " ");
}
