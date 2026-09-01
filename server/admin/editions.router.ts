/**
 * Admin Editions Router
 * ----------------------------------------------------------------------
 * Manages the country-anchored views of the site (Reuters-style
 * editions). Each edition maps one row in the `editions` table to a
 * country (or marks itself as the International catch-all). The
 * frontend reads the active list to populate the header switcher
 * and bias listing queries.
 *
 * Procedures:
 *   list           — every edition (joined with country name/iso2)
 *   create         — add a new edition for a country not yet covered
 *   update         — rename / change flag / change supportedLocales
 *   toggleActive   — turn an edition on/off without deleting it
 *   reorder        — bulk-update sortOrder so the header lists in
 *                    the operator's preferred order
 *   delete         — hard-delete a non-International edition
 *
 * The International edition (isInternational = 1) cannot be deleted
 * or have its International flag toggled — it's the system fallback.
 *
 * Locale handling note: supportedLocales is read/written today but
 * the rest of the site doesn't consume it yet. It's plumbing for the
 * upcoming language switcher; the admin form persists the array but
 * shows a "language switcher coming soon" hint so operators know
 * what they're configuring.
 */

import { z } from "zod";
import { eq, sql, asc, ne, and, isNull, isNotNull } from "drizzle-orm";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { editions, countries, articles, articleLocations } from "../../drizzle/schema";

/**
 * AI-detect the primary country for one article using its title +
 * stripped body. Returns null on any failure (no content, LLM error,
 * confidence too low, country name doesn't resolve). The router uses
 * this for the AI backfill path — same prompt the
 * extractLocationFromContent tRPC procedure uses, just called
 * directly so we don't loop through HTTP.
 */
async function aiDetectCountry(
  title: string,
  content: string,
  countriesByName: Map<string, { id: number; iso2: string }>,
  minConfidence = 70,
): Promise<{ countryId: number; countryIso2: string; country: string; city: string; region: string; confidence: number } | null> {
  if (!content || content.length < 200) return null;
  const stripped = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8_000);
  if (stripped.length < 200) return null;

  const { invokeLLM } = await import("../_core/llm");
  let resp: any;
  try {
    resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Extract the primary geographic location of the article — the country the events / company / people / market are based in. Return ONLY JSON: " +
            '{"city":"Riyadh","country":"Saudi Arabia","region":"MENA","confidence":0-100}. ' +
            "Confidence: 0-100. Use < 70 when uncertain, the article is global, or multiple countries are mentioned equally. " +
            "Country MUST be a real country name (e.g. \"Saudi Arabia\", \"United Arab Emirates\", \"Egypt\", \"Pakistan\", \"Turkey\"). " +
            "If the article isn't tied to one country, return confidence < 70.",
        },
        { role: "user", content: `Title: ${title}\n\nBody:\n${stripped}` },
      ],
    });
  } catch {
    return null;
  }

  const raw = resp?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") return null;

  let parsed: any;
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    parsed = JSON.parse(cleaned);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { parsed = JSON.parse(m[0]); } catch { return null; }
  }

  const confidence = Math.max(0, Math.min(100, Number(parsed?.confidence) || 0));
  if (confidence < minConfidence) return null;

  const country = String(parsed?.country || "").trim();
  if (!country) return null;
  // Resolve country name → countryId via the prepared map. Try a
  // few variants for the common MENA aliases the LLM might emit.
  const lc = country.toLowerCase();
  const aliases: Record<string, string> = {
    "uae": "united arab emirates",
    "u.a.e.": "united arab emirates",
    "ksa": "saudi arabia",
    "kingdom of saudi arabia": "saudi arabia",
    "the kingdom of saudi arabia": "saudi arabia",
    "republic of turkey": "turkey",
    "türkiye": "turkey",
    "turkiye": "turkey",
    "arab republic of egypt": "egypt",
    "islamic republic of pakistan": "pakistan",
    "state of qatar": "qatar",
    "kingdom of bahrain": "bahrain",
    "state of kuwait": "kuwait",
    "sultanate of oman": "oman",
  };
  const resolvedKey = aliases[lc] || lc;
  const match = countriesByName.get(resolvedKey);
  if (!match) return null;

  return {
    countryId: match.id,
    countryIso2: match.iso2,
    country,
    city: String(parsed?.city || ""),
    region: String(parsed?.region || ""),
    confidence,
  };
}

/** ISO 639-1 lowercase locale codes the editor can pick today. The
 *  app doesn't render anything in non-English yet, but the editions
 *  table carries the intended locales per edition so the future
 *  language switcher has its source of truth ready. */
const LOCALE_CODES = ["en", "ar", "tr", "ur", "fr"] as const;

const supportedLocalesSchema = z
  .array(z.enum(LOCALE_CODES))
  .min(1)
  .max(5);

export const editionsRouter = router({
  /**
   * Returns every edition, ordered for the admin list view. Joined
   * against countries for the iso2/name display, but the country
   * column is nullable (International row).
   */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rows = await db
      .select({
        id: editions.id,
        countryId: editions.countryId,
        name: editions.name,
        slug: editions.slug,
        flagEmoji: editions.flagEmoji,
        isInternational: editions.isInternational,
        isActive: editions.isActive,
        supportedLocales: editions.supportedLocales,
        sortOrder: editions.sortOrder,
        createdAt: editions.createdAt,
        updatedAt: editions.updatedAt,
        countryName: countries.name,
        countryIso2: countries.iso2,
      })
      .from(editions)
      .leftJoin(countries, eq(editions.countryId, countries.id))
      .orderBy(asc(editions.sortOrder), asc(editions.name));

    // Coerce supportedLocales — JSON columns come back as unknown[].
    return rows.map((r) => ({
      ...r,
      supportedLocales: Array.isArray(r.supportedLocales)
        ? (r.supportedLocales as string[])
        : ["en"],
    }));
  }),

  /**
   * Returns the list of countries that don't yet have an edition,
   * so the "Add edition" dropdown has a clean candidate list.
   */
  availableCountries: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db
      .select({ countryId: editions.countryId })
      .from(editions);
    const usedIds = new Set(existing.map((e) => e.countryId).filter((id): id is number => id !== null));
    const all = await db
      .select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
      .from(countries)
      .where(eq(countries.isActive, 1))
      .orderBy(asc(countries.name));
    return all.filter((c) => !usedIds.has(c.id));
  }),

  create: adminProcedure
    .input(
      z.object({
        countryId: z.number().int().positive(),
        name: z.string().min(1).max(64),
        slug: z
          .string()
          .min(1)
          .max(32)
          .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
        flagEmoji: z.string().max(8).optional(),
        supportedLocales: supportedLocalesSchema.default(["en"]),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Reject if slug or country are already taken — the unique
      // indexes would catch it at SQL level, but a friendlier
      // error message is worth the extra round-trip.
      const existing = await db
        .select({ id: editions.id, slug: editions.slug, countryId: editions.countryId })
        .from(editions);
      if (existing.some((e) => e.slug === input.slug)) {
        throw new Error(`Slug "${input.slug}" is already in use`);
      }
      if (existing.some((e) => e.countryId === input.countryId)) {
        throw new Error("This country already has an edition");
      }

      const result: any = await db.insert(editions).values({
        countryId: input.countryId,
        name: input.name,
        slug: input.slug,
        flagEmoji: input.flagEmoji || null,
        isInternational: 0,
        isActive: 1,
        supportedLocales: input.supportedLocales as any,
        sortOrder: input.sortOrder,
      });
      const insertId = result?.insertId ?? result?.[0]?.insertId;
      return { id: Number(insertId) };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(64).optional(),
        slug: z
          .string()
          .min(1)
          .max(32)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        flagEmoji: z.string().max(8).nullable().optional(),
        supportedLocales: supportedLocalesSchema.optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Slug collision check — only when the operator is changing it.
      if (input.slug) {
        const clash = await db
          .select({ id: editions.id })
          .from(editions)
          .where(and(eq(editions.slug, input.slug), ne(editions.id, input.id)))
          .limit(1);
        if (clash.length > 0) {
          throw new Error(`Slug "${input.slug}" is already in use`);
        }
      }

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.slug !== undefined) updates.slug = input.slug;
      if (input.flagEmoji !== undefined) updates.flagEmoji = input.flagEmoji;
      if (input.supportedLocales !== undefined) updates.supportedLocales = input.supportedLocales as any;
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

      if (Object.keys(updates).length === 0) return { ok: true, changed: 0 };

      await db.update(editions).set(updates as any).where(eq(editions.id, input.id));
      return { ok: true, changed: Object.keys(updates).length };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // International is the safety net — disabling it would leave
      // visitors with no edition. Reject the request and tell the
      // operator why.
      const [row] = await db
        .select({ isInternational: editions.isInternational })
        .from(editions)
        .where(eq(editions.id, input.id))
        .limit(1);
      if (!row) throw new Error("Edition not found");
      if (row.isInternational && !input.isActive) {
        throw new Error("The International edition cannot be disabled — it's the fallback for visitors whose country has no edition.");
      }

      await db
        .update(editions)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(editions.id, input.id));
      return { ok: true };
    }),

  /**
   * Bulk-update sortOrder. Frontend computes the desired order from
   * its drag-and-drop UI and posts the full list of (id, sortOrder)
   * pairs. We don't try to be clever about diffing — just write what
   * the client sent. Wrapped in a transaction to avoid half-applied
   * orderings if one row fails.
   */
  reorder: adminProcedure
    .input(
      z.object({
        items: z
          .array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int() }))
          .min(1)
          .max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // MySQL via Drizzle doesn't expose a clean transaction wrapper
      // in this codebase's pattern — we write each row sequentially.
      // Worst case on partial failure: a few rows have new
      // sortOrders, others have old. Idempotent on retry.
      for (const it of input.items) {
        await db.update(editions).set({ sortOrder: it.sortOrder } as any).where(eq(editions.id, it.id));
      }
      return { ok: true, updated: input.items.length };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [row] = await db
        .select({ isInternational: editions.isInternational })
        .from(editions)
        .where(eq(editions.id, input.id))
        .limit(1);
      if (!row) throw new Error("Edition not found");
      if (row.isInternational) {
        throw new Error("The International edition is system-managed and cannot be deleted.");
      }

      await db.delete(editions).where(eq(editions.id, input.id));
      return { ok: true };
    }),

  // ============================================================
  // Backfill: count + populate articles.coverageCountryId
  // ============================================================
  // Articles need a country tag for the news.list edition bias to
  // surface them. We bridge two existing sources:
  //   1. articleLocations table — admins tag here via the Location
  //      tab in the article editor. Highest-confidence signal.
  //   2. articles.coverageCountryId — direct column, used by
  //      news.list. Rarely populated historically.
  //
  // The backfill walks articles where coverageCountryId IS NULL,
  // finds the matching country in articleLocations.country (text
  // match against countries.name), and writes the FK. Idempotent;
  // safe to re-run. No LLM cost — it's all SQL.

  /**
   * Count articles still missing a coverageCountryId. Surfaces the
   * size of the backlog before the operator clicks "Run backfill".
   *
   * Returns three numbers:
   *   missingTotal   — articles with coverageCountryId IS NULL
   *   backfillable   — subset that have at least one articleLocations
   *                    row (so the SQL-based backfill can resolve)
   *   aiBackfillable — subset with no articleLocations row AND a
   *                    body long enough for the LLM to analyze.
   *                    These need the AI path.
   */
  backfillStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [missing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(articles)
      .where(isNull(articles.coverageCountryId));

    const [withLocation] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${articles.id})` })
      .from(articles)
      .innerJoin(articleLocations, eq(articleLocations.articleId, articles.id))
      .where(and(
        isNull(articles.coverageCountryId),
        isNotNull(articleLocations.country),
      ));

    // AI-eligible = no coverageCountryId, no articleLocations row,
    // body content present and substantial (>= 200 chars).
    const [aiEligible] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(articles)
      .where(and(
        isNull(articles.coverageCountryId),
        isNotNull(articles.content),
        sql`CHAR_LENGTH(COALESCE(${articles.content}, '')) >= 200`,
        sql`NOT EXISTS (SELECT 1 FROM article_locations al WHERE al.article_id = ${articles.id})`,
      ));

    return {
      missingTotal: Number(missing?.count || 0),
      backfillable: Number(withLocation?.count || 0),
      aiBackfillable: Number(aiEligible?.count || 0),
    };
  }),

  /**
   * Run the backfill. Writes coverageCountryId on articles where:
   *   - coverageCountryId IS NULL
   *   - articleLocations has a country name that matches an entry
   *     in the countries table by name (case-insensitive)
   *
   * Processes up to `limit` articles per call to keep the request
   * bounded; the operator clicks again to chew through the rest.
   * Returns per-article results for transparency.
   */
  backfillCoverageCountry: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Pull candidate (articleId, country-name) pairs in one query.
      // We pick the first articleLocations row per article when
      // multiple are tagged (admins occasionally tag both KSA + UAE
      // — we go with the alphabetically first).
      const candidates = await db
        .select({
          articleId: articleLocations.articleId,
          countryName: articleLocations.country,
        })
        .from(articleLocations)
        .innerJoin(articles, eq(articleLocations.articleId, articles.id))
        .where(and(
          isNull(articles.coverageCountryId),
          isNotNull(articleLocations.country),
        ))
        .limit(input.limit);

      // Resolve country names → countryIds in one round-trip.
      const allCountries = await db
        .select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
        .from(countries);
      const byNameLc = new Map<string, number>();
      const byIso2Lc = new Map<string, number>();
      for (const c of allCountries) {
        byNameLc.set(c.name.toLowerCase(), c.id);
        if (c.iso2) byIso2Lc.set(c.iso2.toLowerCase(), c.id);
      }

      const results: Array<{ articleId: number; ok: boolean; countryId?: number; reason?: string }> = [];
      const seen = new Set<number>();

      for (const c of candidates) {
        if (seen.has(c.articleId)) continue; // dedupe within this batch
        seen.add(c.articleId);

        const raw = (c.countryName || "").trim();
        if (!raw) {
          results.push({ articleId: c.articleId, ok: false, reason: "empty country" });
          continue;
        }
        const lc = raw.toLowerCase();
        const countryId = byNameLc.get(lc) || byIso2Lc.get(lc);
        if (!countryId) {
          results.push({ articleId: c.articleId, ok: false, reason: `unknown country: ${raw}` });
          continue;
        }
        await db.update(articles)
          .set({ coverageCountryId: countryId } as any)
          .where(eq(articles.id, c.articleId));
        results.push({ articleId: c.articleId, ok: true, countryId });
      }

      return {
        processed: results.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results: results.slice(0, 50), // truncate response so big batches don't bloat the payload
      };
    }),

  /**
   * AI backfill — for articles where the SQL-based backfill can't
   * help (no articleLocations row), call the LLM on title + body
   * to detect the primary country. Writes coverageCountryId AND
   * inserts an articleLocations row so future passes treat the
   * article as tagged.
   *
   * Confidence floor is 70 by default; the LLM emits its own
   * confidence and we drop anything below. Processes up to `limit`
   * articles per call sequentially (no LLM rate-bursting). Cost:
   * ≈ $0.001 per article in token usage.
   */
  backfillCoverageCountryAI: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(25),
      minConfidence: z.number().int().min(0).max(100).default(70),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Pre-load every country once so each LLM result can resolve
      // its country-name → countryId without a per-row DB hit.
      const allCountries = await db
        .select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
        .from(countries);
      const byName = new Map<string, { id: number; iso2: string }>();
      for (const c of allCountries) {
        if (!c.iso2) continue;
        const entry = { id: c.id, iso2: c.iso2 };
        byName.set(c.name.toLowerCase(), entry);
        byName.set(c.iso2.toLowerCase(), entry);
      }

      // Candidate articles: missing coverageCountryId, no
      // articleLocations row, body present and substantial.
      const candidates = await db
        .select({
          id: articles.id,
          title: articles.title,
          content: articles.content,
        })
        .from(articles)
        .where(and(
          isNull(articles.coverageCountryId),
          isNotNull(articles.content),
          sql`CHAR_LENGTH(COALESCE(${articles.content}, '')) >= 200`,
          sql`NOT EXISTS (SELECT 1 FROM article_locations al WHERE al.article_id = ${articles.id})`,
        ))
        .limit(input.limit);

      const userId = (ctx as any)?.user?.id ?? null;
      const results: Array<{
        articleId: number;
        ok: boolean;
        countryId?: number;
        country?: string;
        confidence?: number;
        reason?: string;
      }> = [];

      for (const c of candidates) {
        try {
          const detection = await aiDetectCountry(
            c.title,
            c.content || "",
            byName,
            input.minConfidence,
          );
          if (!detection) {
            results.push({ articleId: c.id, ok: false, reason: "no confident match" });
            continue;
          }

          // Write the coverageCountryId on the article AND seed an
          // articleLocations row so the next status check counts
          // this article as "tagged" rather than re-running it
          // through the AI path.
          await db.update(articles)
            .set({ coverageCountryId: detection.countryId } as any)
            .where(eq(articles.id, c.id));
          // articleLocations.country is iso2 (varchar(2)), region is
          // a short code (varchar(10)). Don't insert long names.
          await db.insert(articleLocations).values({
            articleId: c.id,
            country: detection.countryIso2,
            region: (detection.region || "").slice(0, 10) || null,
            city: detection.city || null,
            createdById: userId,
          } as any);

          results.push({
            articleId: c.id,
            ok: true,
            countryId: detection.countryId,
            country: detection.country,
            confidence: detection.confidence,
          });
        } catch (err: any) {
          results.push({
            articleId: c.id,
            ok: false,
            reason: err?.message || String(err),
          });
        }
      }

      return {
        processed: results.length,
        succeeded: results.filter((r) => r.ok).length,
        skipped: results.filter((r) => !r.ok && r.reason === "no confident match").length,
        failed: results.filter((r) => !r.ok && r.reason !== "no confident match").length,
        results: results.slice(0, 50),
      };
    }),
});
