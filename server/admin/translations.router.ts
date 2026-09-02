/**
 * Admin Translations Router
 * ----------------------------------------------------------------------
 * Two jobs, both of them things an editor does rather than a deploy does.
 *
 * LANGUAGES — add, configure and retire the languages the site publishes
 * in. Adding Urdu is a row in `locales`, not a code change. Each language
 * decides how its copy gets written:
 *
 *   auto         — the model translates an article as soon as it publishes
 *                  or its English changes, and the result goes live
 *   manual_ai    — an editor presses Translate; the model writes a draft
 *                  they review before it goes live
 *   manual_write — no model involved; a person types the translation
 *
 * TRANSLATIONS — per article (or category, company, event), what exists in
 * each language, what is stale because the English moved on, and the two
 * ways to change that: run the model, or write it yourself.
 *
 * Every mutation clears the locale cache, so a language added here shows up
 * in the reader's switcher on the next request rather than up to a minute
 * later.
 */

import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  locales, contentTranslations, articles, categories, companies, events,
} from "../../drizzle/schema";
import {
  listLocales, getLocale, invalidateLocaleCache, translateEntity, markStale,
  TRANSLATABLE_FIELDS, sourceHash, type LocaleRow,
} from "../services/translation.service";
import { toDbDate } from "../_core/dbValues";

const localeCode = z.string().trim().min(2).max(12).regex(
  /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/,
  "use a language code like ar, ur, fr or zh-Hans",
);

const glossaryEntry = z.object({
  source: z.string().trim().min(1).max(200),
  target: z.string().trim().min(1).max(200),
});

const ENTITY_TYPES = ["article", "category", "company", "person", "event"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * The English a translation is made from.
 *
 * Kept in one place because three procedures need exactly the same answer:
 * translate needs it as input, the status view needs it to tell whether a
 * stored translation has gone stale, and the manual editor needs it to show
 * the source beside the field being written.
 */
async function loadSource(
  entityType: EntityType, entityId: number,
): Promise<Record<string, string> | null> {
  const db = await getDb();
  if (!db) return null;

  if (entityType === "article") {
    const [row] = await db.select({
      title: articles.title, excerpt: articles.excerpt, content: articles.content,
      seoTitle: articles.seoTitle, seoDescription: articles.seoDescription,
    }).from(articles).where(eq(articles.id, entityId)).limit(1);
    return row ? clean(row) : null;
  }
  if (entityType === "category") {
    const [row] = await db.select({ name: categories.name, description: categories.description })
      .from(categories).where(eq(categories.id, entityId)).limit(1);
    return row ? clean(row) : null;
  }
  if (entityType === "company") {
    const [row] = await db.select({ description: companies.description })
      .from(companies).where(eq(companies.id, entityId)).limit(1);
    return row ? clean(row) : null;
  }
  if (entityType === "event") {
    const [row] = await db.select({
      title: events.title, shortDescription: events.shortDescription,
      description: events.description,
    }).from(events).where(eq(events.id, entityId)).limit(1);
    return row ? clean(row) : null;
  }
  return null;
}

function clean(row: Record<string, any>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => [k, v as string]),
  );
}

async function requireLocale(code: string): Promise<LocaleRow> {
  const locale = await getLocale(code);
  if (!locale) throw new TRPCError({ code: "NOT_FOUND", message: `no language "${code}"` });
  if (locale.isDefault) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${locale.name} is the language articles are written in — it is not translated`,
    });
  }
  return locale;
}

export const translationsRouter = router({
  // ==========================================================
  // Languages
  // ==========================================================

  listLocales: adminProcedure.query(async () => {
    const rows = await listLocales();
    const db = await getDb();
    if (!db) return rows.map(r => ({ ...r, publishedCount: 0, draftCount: 0, staleCount: 0 }));

    // One grouped query for every language's counts, rather than three per
    // row: this list is the page's header and loads on every visit.
    const counts = await db
      .select({
        locale: contentTranslations.locale,
        status: contentTranslations.status,
        n: sql<number>`COUNT(DISTINCT ${contentTranslations.entityType}, ${contentTranslations.entityId})`,
      })
      .from(contentTranslations)
      .groupBy(contentTranslations.locale, contentTranslations.status);

    return rows.map(r => {
      const mine = counts.filter(c => c.locale === r.code);
      const at = (s: string) => Number(mine.find(c => c.status === s)?.n ?? 0);
      return {
        ...r,
        publishedCount: at("published"),
        draftCount: at("draft"),
        staleCount: at("stale"),
      };
    });
  }),

  createLocale: adminProcedure
    .input(z.object({
      code: localeCode,
      name: z.string().trim().min(1).max(64),
      nativeName: z.string().trim().min(1).max(64),
      direction: z.enum(["ltr", "rtl"]).default("ltr"),
      flagEmoji: z.string().trim().max(8).optional(),
      translationMode: z.enum(["auto", "manual_ai", "manual_write"]).default("manual_ai"),
      provider: z.string().trim().max(32).nullish(),
      model: z.string().trim().max(64).nullish(),
      glossary: z.array(glossaryEntry).max(200).optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });

      const existing = await getLocale(input.code);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `${input.code} already exists` });
      }
      const [{ maxSort }] = await db
        .select({ maxSort: sql<number>`COALESCE(MAX(${locales.sortOrder}), 0)` })
        .from(locales);

      await db.insert(locales).values({
        code: input.code,
        name: input.name,
        nativeName: input.nativeName,
        direction: input.direction,
        flagEmoji: input.flagEmoji || null,
        isDefault: 0,
        isActive: input.isActive ? 1 : 0,
        translationMode: input.translationMode,
        provider: input.provider || null,
        model: input.model || null,
        glossary: input.glossary ?? [],
        sortOrder: Number(maxSort) + 1,
      } as any);
      invalidateLocaleCache();
      return { code: input.code };
    }),

  updateLocale: adminProcedure
    .input(z.object({
      code: localeCode,
      name: z.string().trim().min(1).max(64).optional(),
      nativeName: z.string().trim().min(1).max(64).optional(),
      direction: z.enum(["ltr", "rtl"]).optional(),
      flagEmoji: z.string().trim().max(8).nullish(),
      translationMode: z.enum(["auto", "manual_ai", "manual_write"]).optional(),
      provider: z.string().trim().max(32).nullish(),
      model: z.string().trim().max(64).nullish(),
      glossary: z.array(glossaryEntry).max(200).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });

      const locale = await getLocale(input.code);
      if (!locale) throw new TRPCError({ code: "NOT_FOUND", message: `no language "${input.code}"` });

      // The default language is what everything falls back to. Switching it
      // off would leave pages with nothing to render when a translation is
      // missing, which is every page on the day a language is added.
      if (locale.isDefault && input.isActive === false) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${locale.name} is the default language and cannot be deactivated`,
        });
      }

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.nativeName !== undefined) patch.nativeName = input.nativeName;
      if (input.direction !== undefined) patch.direction = input.direction;
      if (input.flagEmoji !== undefined) patch.flagEmoji = input.flagEmoji || null;
      if (input.translationMode !== undefined) patch.translationMode = input.translationMode;
      if (input.provider !== undefined) patch.provider = input.provider || null;
      if (input.model !== undefined) patch.model = input.model || null;
      if (input.glossary !== undefined) patch.glossary = input.glossary;
      if (input.isActive !== undefined) patch.isActive = input.isActive ? 1 : 0;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
      if (!Object.keys(patch).length) return { code: input.code };

      await db.update(locales).set(patch as any).where(eq(locales.code, input.code));
      invalidateLocaleCache();
      return { code: input.code };
    }),

  /**
   * Retire a language. The translations are kept.
   *
   * Deleting the copy along with the row would throw away work an editor
   * may have written by hand, to save a few kilobytes. Deactivate hides a
   * language from readers; this removes it from the admin too, and the copy
   * comes back if the language is re-added.
   */
  deleteLocale: adminProcedure
    .input(z.object({ code: localeCode }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });
      const locale = await getLocale(input.code);
      if (!locale) throw new TRPCError({ code: "NOT_FOUND", message: `no language "${input.code}"` });
      if (locale.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST", message: "the default language cannot be removed",
        });
      }
      await db.delete(locales).where(eq(locales.code, input.code));
      invalidateLocaleCache();
      return { code: input.code, translationsKept: true };
    }),

  // ==========================================================
  // Translations for one entity
  // ==========================================================

  /**
   * What exists in every language for one article, and what state it is in.
   * This is what the translation panel on the article editor reads.
   */
  status: adminProcedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const source = await loadSource(input.entityType, input.entityId);
      if (!db || !source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "no such record" });
      }
      const fields = TRANSLATABLE_FIELDS[input.entityType] ?? Object.keys(source);
      const rows = await db
        .select()
        .from(contentTranslations)
        .where(and(
          eq(contentTranslations.entityType, input.entityType),
          eq(contentTranslations.entityId, input.entityId),
        ));

      const all = await listLocales();
      return {
        source,
        fields,
        locales: all.filter(l => !l.isDefault).map(l => {
          const mine = rows.filter(r => r.locale === l.code);
          // "Stale" is not only the stored status: a row whose hash no longer
          // matches the English is stale whether or not anything has run
          // markStale on it yet, and the editor should see that immediately.
          const drifted = mine.filter(r =>
            source[r.field] !== undefined &&
            r.sourceHash !== null &&
            r.sourceHash !== sourceHash(source[r.field]!),
          ).map(r => r.field);
          return {
            code: l.code,
            name: l.name,
            nativeName: l.nativeName,
            direction: l.direction,
            flagEmoji: l.flagEmoji,
            translationMode: l.translationMode,
            isActive: l.isActive,
            fields: Object.fromEntries(mine.map(r => [r.field, {
              value: r.value,
              status: drifted.includes(r.field) ? "stale" : r.status,
              source: r.source,
              model: r.model,
              translatedAt: r.translatedAt,
            }])),
            missing: fields.filter(f => source[f] && !mine.some(r => r.field === f)),
            drifted,
          };
        }),
      };
    }),

  /**
   * Run the model over one entity into one language.
   *
   * `publish` is the difference between the two buttons an editor sees:
   * "Translate and publish" for a language they trust, "Translate as draft"
   * for one they want to read first. A locale in manual_write mode is not
   * translatable by machine at all — that is what the mode means.
   */
  translate: adminProcedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number().int().positive(),
      locale: localeCode,
      publish: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const locale = await requireLocale(input.locale);
      if (locale.translationMode === "manual_write") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${locale.name} is set to be written by hand. Change its mode to use the model.`,
        });
      }
      const source = await loadSource(input.entityType, input.entityId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "no such record" });

      const result = await translateEntity({
        entityType: input.entityType,
        entityId: input.entityId,
        locale,
        source,
        publish: input.publish,
        requestedById: (ctx as any).user?.id ?? null,
      });
      return {
        locale: locale.code,
        fields: Object.keys(result.fields),
        provider: result.provider,
        model: result.model,
        costUsd: result.costUsd,
        // Non-empty means the model could not be made to satisfy the checks
        // in two attempts. The copy is stored so an editor can fix it by
        // hand rather than losing it, but they need to know what to look at.
        problems: result.problems,
        published: input.publish,
      };
    }),

  /** Write or correct one field by hand. This is the manual_write path, and
   *  also how an editor fixes a machine translation. */
  saveField: adminProcedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number().int().positive(),
      locale: localeCode,
      field: z.string().trim().min(1).max(64),
      value: z.string().max(500_000),
      publish: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });
      const locale = await requireLocale(input.locale);

      const source = await loadSource(input.entityType, input.entityId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "no such record" });
      const allowed = TRANSLATABLE_FIELDS[input.entityType] ?? Object.keys(source);
      if (allowed.length && !allowed.includes(input.field)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `"${input.field}" is not a translatable field on a ${input.entityType}`,
        });
      }

      const row = {
        entityType: input.entityType,
        entityId: input.entityId,
        locale: locale.code,
        field: input.field,
        value: input.value,
        source: "human" as const,
        status: input.publish ? ("published" as const) : ("draft" as const),
        model: null,
        // Hashed against the English as it stands now: a hand-written
        // translation is current until the English changes again.
        sourceHash: source[input.field] ? sourceHash(source[input.field]!) : null,
        translatedAt: toDbDate(new Date()),
        reviewedById: (ctx as any).user?.id ?? null,
      };
      await db.insert(contentTranslations).values(row as any).onDuplicateKeyUpdate({
        set: {
          value: row.value, source: row.source, status: row.status, model: null,
          sourceHash: row.sourceHash, translatedAt: row.translatedAt,
          reviewedById: row.reviewedById,
        } as any,
      });
      return { ok: true };
    }),

  /** Publish or unpublish what is already stored, without re-running
   *  anything. The review step for a drafted machine translation. */
  setStatus: adminProcedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number().int().positive(),
      locale: localeCode,
      field: z.string().trim().min(1).max(64).optional(),
      status: z.enum(["draft", "published"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });
      const conds = [
        eq(contentTranslations.entityType, input.entityType),
        eq(contentTranslations.entityId, input.entityId),
        eq(contentTranslations.locale, input.locale),
      ];
      if (input.field) conds.push(eq(contentTranslations.field, input.field));
      await db.update(contentTranslations)
        .set({ status: input.status } as any)
        .where(and(...conds));
      return { ok: true };
    }),

  /** Re-check an entity's translations against its current English and mark
   *  the ones that have drifted. Called after an article is edited. */
  refreshStaleness: adminProcedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const source = await loadSource(input.entityType, input.entityId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "no such record" });
      const marked = await markStale(input.entityType, input.entityId, source);
      return { marked };
    }),

  // ==========================================================
  // Across the archive
  // ==========================================================

  /**
   * What is not yet translated into a language, newest first.
   *
   * This is the queue behind the "translate everything" workflow: an editor
   * picks a language, sees what is missing, and runs it in batches they can
   * watch rather than one job that either works or does not.
   */
  pending: adminProcedure
    .input(z.object({
      locale: localeCode,
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, articles: [] };
      await requireLocale(input.locale);

      const translated = db
        .select({ id: contentTranslations.entityId })
        .from(contentTranslations)
        .where(and(
          eq(contentTranslations.entityType, "article"),
          eq(contentTranslations.locale, input.locale),
          eq(contentTranslations.field, "content"),
          eq(contentTranslations.status, "published"),
        ));

      const [{ total }] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(articles)
        .where(sql`${articles.id} NOT IN ${translated}`);

      const rows = await db
        .select({
          id: articles.id, title: articles.title, slug: articles.slug,
          eventDate: articles.eventDate, publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(sql`${articles.id} NOT IN ${translated}`)
        .orderBy(sql`COALESCE(${articles.eventDate}, ${articles.publishedAt}) DESC`)
        .limit(input.limit)
        .offset(input.offset);

      return { total: Number(total), articles: rows };
    }),
});
