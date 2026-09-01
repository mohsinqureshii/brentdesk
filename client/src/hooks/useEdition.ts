/**
 * useEdition
 * ----------------------------------------------------------------------
 * Returns the active edition for the current visitor — used by
 * listing pages to pass `editionCountryId` into their tRPC queries
 * so the server biases ORDER BY toward the visitor's country.
 *
 * The hook caches aggressively (5 min staleTime) because the active
 * edition only changes on cookie write + page reload. No need to
 * refetch on every render.
 *
 * Convenience: returns `null` for editionCountryId when the visitor
 * is on the International edition (or there's no edition data yet),
 * which makes it easy for query callers to skip the personalization
 * clause cleanly.
 */
import { trpc } from "@/lib/trpc";

export interface ActiveEdition {
  id: number;
  slug: string;
  name: string;
  countryId: number | null;
  isInternational: boolean;
  flagEmoji: string | null;
  supportedLocales: string[];
}

export function useEdition(): {
  edition: ActiveEdition | null;
  /** Convenience: the countryId to pass into listing queries.
   *  Null for International or while the query is loading — listing
   *  procedures treat null as "no country bias, default ordering". */
  editionCountryId: number | null;
  isLoading: boolean;
} {
  const q = trpc.editions.current.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const edition = (q.data || null) as ActiveEdition | null;
  return {
    edition,
    editionCountryId: edition && !edition.isInternational ? edition.countryId : null,
    isLoading: q.isLoading,
  };
}
