/**
 * editionOrderBias
 * ----------------------------------------------------------------------
 * Shared helper used by every public listing procedure that wants to
 * surface the visitor's edition (country) content first, then fall
 * back to the existing sort.
 *
 * Pattern at the call site:
 *
 *   import { editionOrderBias } from "../../services/editionOrder";
 *   ...
 *   .orderBy(
 *     ...editionOrderBias(jobs.countryId, input.editionCountryId),
 *     desc(jobs.publishedAt),
 *   )
 *
 * When `editionCountryId` is null/undefined (visitor on International,
 * or no edition resolved), this returns an empty array — the existing
 * ORDER BY runs unchanged. So adding the helper to a list query never
 * changes default behavior; it only adds personalization on top.
 *
 * The CASE WHEN approach is MySQL-portable and uses a parameterized
 * value (no SQL injection risk). It evaluates per-row, but with an
 * index on the country_id column it stays cheap.
 */
import { sql, type SQL } from "drizzle-orm";

export function editionOrderBias(
  countryIdCol: unknown,
  editionCountryId: number | null | undefined,
): SQL[] {
  if (!editionCountryId || editionCountryId <= 0) return [];
  // Cast to any inside the template — drizzle's sql tag accepts
  // Column instances but the union types make TS unhappy here.
  return [sql`CASE WHEN ${countryIdCol as any} = ${editionCountryId} THEN 0 ELSE 1 END`];
}
