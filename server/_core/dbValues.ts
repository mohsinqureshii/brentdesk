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
 * Date→'YYYY-MM-DD HH:MM:SS' UTC string, strings passed through
 * unchanged, null/undefined preserved.
 */
export function toDbDate(v: Date | string): string;
export function toDbDate(v: Date | string | null): string | null;
export function toDbDate(v: Date | string | undefined): string | undefined;
export function toDbDate(v: Date | string | null | undefined): string | null | undefined;
export function toDbDate(v: Date | string | null | undefined): string | null | undefined {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") return v;
  return v.toISOString().slice(0, 19).replace("T", " ");
}
