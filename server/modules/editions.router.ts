/**
 * Public Editions Router
 * ----------------------------------------------------------------------
 * Visitor-facing tRPC procedures for the country-edition system.
 *
 * Procedures:
 *   list     — every active edition (slug, name, flag, locales) for
 *              the header switcher
 *   current  — the edition the request is currently resolved to,
 *              for the React client to highlight in the switcher
 *              and pass as editionCountryId on listing queries
 *
 * Both procedures read from the in-process edition cache, so the
 * cost is essentially zero per request after warm-up.
 */

import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { editions, countries } from "../../drizzle/schema";

export const publicEditionsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: editions.id,
        slug: editions.slug,
        name: editions.name,
        flagEmoji: editions.flagEmoji,
        isInternational: editions.isInternational,
        sortOrder: editions.sortOrder,
        countryId: editions.countryId,
        countryIso2: countries.iso2,
        supportedLocales: editions.supportedLocales,
      })
      .from(editions)
      .leftJoin(countries, eq(editions.countryId, countries.id))
      .where(eq(editions.isActive, 1));
    return rows
      .map((r) => ({
        ...r,
        isInternational: !!r.isInternational,
        supportedLocales: Array.isArray(r.supportedLocales)
          ? (r.supportedLocales as string[])
          : ["en"],
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }),

  /**
   * The edition the current request resolved to. Reads from
   * ctx.edition — see server/services/edition.service.ts for the
   * cookie → CF-IPCountry → International resolution order.
   */
  current: publicProcedure.query(({ ctx }) => {
    return {
      id: ctx.edition.id,
      slug: ctx.edition.slug,
      name: ctx.edition.name,
      countryId: ctx.edition.countryId,
      isInternational: ctx.edition.isInternational,
      flagEmoji: ctx.edition.flagEmoji,
      supportedLocales: ctx.edition.supportedLocales,
    };
  }),
});
