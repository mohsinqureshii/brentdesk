/**
 * Entity Enrichment Admin Router
 * ----------------------------------------------------------------------
 * Bulk-fills empty `description` columns on profile/detail entities
 * (people, companies, investors, events, accelerators) using LLM
 * generation from each row's existing structured fields.
 *
 * Why: profiles with empty descriptions land in GSC's "Crawled —
 * currently not indexed" bucket. Rather than noindex them (which
 * loses long-tail traffic), we enrich them so they earn the index.
 *
 * Procedures:
 *   listThin        — preview which entities of a type are enrichable
 *   enrichOne       — generate + save for one entity (force=true to
 *                     overwrite an existing description)
 *   enrichBatch     — process up to N thin entities of one type;
 *                     dryRun=true returns the generated text without
 *                     writing it to the DB
 *
 * All procedures are admin-only.
 */

import { z } from "zod";
import { eq, and, isNull, sql, or, isNotNull } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  people, companies, investors, events, accelerators,
  peopleRegions, peopleSectors,
  companyRegions, companySectors,
  investorRegions, investorSectors,
  regions, sectors,
  articles, articlePeople, articleCompanies, articleInvestors,
  articleEvents, articleAccelerators,
  workflowStatuses, categories,
} from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { generateDescription, type EnrichableType, type EnrichmentContext } from "../services/entityEnrichment.service";

/**
 * Derive a logo image URL from a website by extracting the host and
 * pointing at Clearbit's public Logo API. Returns null when the input
 * isn't parseable as a URL or resolves to localhost / private-ish hosts.
 *
 * No network call here — the client just gets back a URL string. The
 * <img src> render is what hits Clearbit, which serves a 1x1 PNG when
 * no logo is on file. Cheap fallback for the "fill missing logo while
 * we're enriching" pass.
 */
function deriveLogoUrlFromWebsite(website: string): string | null {
  if (!website || typeof website !== "string") return null;
  try {
    const candidate = website.trim().startsWith("http")
      ? website.trim()
      : `https://${website.trim()}`;
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "localhost" || host.endsWith(".local")) return null;
    if (!host.includes(".")) return null;
    return `https://logo.clearbit.com/${host}`;
  } catch {
    return null;
  }
}

/**
 * Fetch up to 6 recent published article {title, excerpt} pairs that
 * mention the given entity, via the appropriate junction table. Used
 * to feed real news coverage into the prompt as factual context.
 */
async function loadArticleExcerptsFor(
  type: EnrichableType,
  id: number,
): Promise<EnrichmentContext["articleExcerpts"]> {
  const db = await getDb();
  if (!db) return [];

  // Resolve the published statusId once; if the workflow row isn't
  // there for some reason, fall back to publishedAt-only filter.
  const [pubStatus] = await db.select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .where(and(
      eq(workflowStatuses.slug, "published"),
      eq(workflowStatuses.workflowType, "editorial"),
    ))
    .limit(1);

  const buildQuery = (junction: any, fkCol: any) => {
    const baseQuery = db.select({
      title: articles.title,
      excerpt: articles.excerpt,
    })
      .from(junction)
      .innerJoin(articles, eq(junction.articleId, articles.id))
      .where(and(
        eq(fkCol, id),
        pubStatus
          ? or(eq(articles.statusId, pubStatus.id), isNotNull(articles.publishedAt))
          : isNotNull(articles.publishedAt),
      ))
      .orderBy(desc(articles.publishedAt))
      .limit(6);
    return baseQuery;
  };

  switch (type) {
    case "person":      return await buildQuery(articlePeople, articlePeople.personId);
    case "company":     return await buildQuery(articleCompanies, articleCompanies.companyId);
    case "investor":    return await buildQuery(articleInvestors, articleInvestors.investorId);
    case "event":       return await buildQuery(articleEvents, articleEvents.eventId);
    case "accelerator": return await buildQuery(articleAccelerators, articleAccelerators.acceleratorId);
    default:            return [];
  }
}

const TYPES = ["person", "company", "investor", "event", "accelerator", "article"] as const;

const TYPE_TABLES: Record<EnrichableType, any> = {
  person: people,
  company: companies,
  investor: investors,
  event: events,
  accelerator: accelerators,
  article: articles,
};

/**
 * Fetch one entity row plus the related taxonomy joins each
 * prompt-builder expects (sectors / regions for people, companies,
 * investors). Returns null when the row doesn't exist.
 */
async function loadEntityForEnrichment(type: EnrichableType, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const table = TYPE_TABLES[type];
  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;

  if (type === "person") {
    const [pSectors, pRegions] = await Promise.all([
      db.select({ name: sectors.name }).from(peopleSectors)
        .innerJoin(sectors, eq(peopleSectors.sectorId, sectors.id))
        .where(eq(peopleSectors.personId, id)),
      db.select({ name: regions.name }).from(peopleRegions)
        .innerJoin(regions, eq(peopleRegions.regionId, regions.id))
        .where(eq(peopleRegions.personId, id)),
    ]);
    return { ...row, sectors: pSectors, regions: pRegions };
  }
  if (type === "company") {
    const [cSectors, cRegions] = await Promise.all([
      db.select({ name: sectors.name }).from(companySectors)
        .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
        .where(eq(companySectors.companyId, id)),
      db.select({ name: regions.name }).from(companyRegions)
        .innerJoin(regions, eq(companyRegions.regionId, regions.id))
        .where(eq(companyRegions.companyId, id)),
    ]);
    return { ...row, sectors: cSectors, regions: cRegions };
  }
  if (type === "investor") {
    const [iSectors, iRegions] = await Promise.all([
      db.select({ name: sectors.name }).from(investorSectors)
        .innerJoin(sectors, eq(investorSectors.sectorId, sectors.id))
        .where(eq(investorSectors.investorId, id)),
      db.select({ name: regions.name }).from(investorRegions)
        .innerJoin(regions, eq(investorRegions.regionId, regions.id))
        .where(eq(investorRegions.investorId, id)),
    ]);
    return { ...row, sectors: iSectors, regions: iRegions };
  }
  if (type === "article") {
    // Articles need the primary category name to give the prompt
    // editorial context. Single LEFT JOIN keeps it cheap.
    let primaryCategoryName: string | null = null;
    if ((row as any).primaryCategoryId) {
      const cat = await db.select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, (row as any).primaryCategoryId))
        .limit(1);
      primaryCategoryName = cat[0]?.name || null;
    }
    return { ...row, primaryCategoryName };
  }
  // events + accelerators don't currently feed sectors/regions into
  // the prompt — base row is sufficient.
  return row;
}

/**
 * "Thin description" check at the SQL level. Mirrors the floors used
 * by the page-level isThin* helpers: 100 chars for person (bio),
 * 150 chars for everything else (description).
 */
function thinFilter(type: EnrichableType) {
  const tbl = TYPE_TABLES[type];
  if (type === "person") {
    // Person uses `bio` (long) + `shortBio` — treat as thin when neither
    // crosses the 100-char floor.
    return or(
      isNull((tbl as any).bio),
      sql`CHAR_LENGTH(COALESCE(${(tbl as any).bio}, '')) < 100`,
    );
  }
  if (type === "article") {
    // Articles are "thin" when seoDescription OR excerpt is missing.
    // Only consider published articles — drafts are still being
    // edited and don't need bulk enrichment. Body must exist (skip
    // articles without content the AI can summarize).
    return and(
      isNotNull((tbl as any).publishedAt),
      isNotNull((tbl as any).content),
      sql`CHAR_LENGTH(COALESCE(${(tbl as any).content}, '')) > 200`,
      or(
        isNull((tbl as any).seoDescription),
        sql`CHAR_LENGTH(COALESCE(${(tbl as any).seoDescription}, '')) < 80`,
        isNull((tbl as any).excerpt),
        sql`CHAR_LENGTH(COALESCE(${(tbl as any).excerpt}, '')) < 80`,
      ),
    );
  }
  return or(
    isNull(tbl.description),
    sql`CHAR_LENGTH(COALESCE(${tbl.description}, '')) < 150`,
  );
}

export const entityEnrichmentRouter = router({
  /**
   * How many entities of each type are currently below the threshold,
   * with a small sample for the admin UI preview.
   */
  listThin: adminProcedure
    .input(z.object({
      type: z.enum(TYPES),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tbl = TYPE_TABLES[input.type];

      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tbl)
        .where(thinFilter(input.type));

      const rows = await db
        .select({
          id: tbl.id,
          // Events + articles use `title`; the others use `name`.
          name: (input.type === "event" || input.type === "article")
            ? (tbl as any).title
            : (tbl as any).name,
          slug: tbl.slug,
        })
        .from(tbl)
        .where(thinFilter(input.type))
        .limit(input.limit);

      return { count: Number(count) || 0, sample: rows };
    }),

  /**
   * Enrich a single entity. Returns the generated description without
   * persisting when dryRun=true; otherwise UPDATEs the row.
   */
  enrichOne: adminProcedure
    .input(z.object({
      type: z.enum(TYPES),
      id: z.number().int().positive(),
      force: z.boolean().default(false),
      dryRun: z.boolean().default(false),
      // Free-form text the operator wants to feed in (LinkedIn bio,
      // press release paragraph, About-page copy). Optional. Trimmed
      // server-side to 2000 chars by the service.
      extraContext: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tbl = TYPE_TABLES[input.type];

      const row = await loadEntityForEnrichment(input.type, input.id);
      if (!row) throw new Error(`${input.type} #${input.id} not found`);

      // Skip if already has substantial description, unless forced.
      if (!input.force) {
        let existingLen = 0;
        let floor = 150;
        if (input.type === "person") {
          existingLen = String((row as any).bio || "").replace(/<[^>]+>/g, "").trim().length;
          floor = 100;
        } else if (input.type === "article") {
          // Articles are "thin" only when BOTH seoDescription and
          // excerpt are short — the AI fills both at once, so don't
          // skip when one is set and the other isn't.
          const metaLen = String((row as any).seoDescription || "").trim().length;
          const exLen = String((row as any).excerpt || "").trim().length;
          existingLen = Math.min(metaLen, exLen);
          floor = 80;
        } else {
          existingLen = String((row as any).description || "").replace(/<[^>]+>/g, "").trim().length;
          floor = 150;
        }
        if (existingLen >= floor) {
          return {
            skipped: true,
            reason: "already populated",
            id: input.id,
            existingLength: existingLen,
          };
        }
      }

      // Pull in real news coverage of this entity so the LLM has
      // something concrete to write from. Combined with the operator's
      // optional extraContext, this is what turns a sparse profile
      // (just a name + role) into one with substantive content.
      const articleExcerpts = await loadArticleExcerptsFor(input.type, input.id);

      const result = await generateDescription(input.type, row, {
        articleExcerpts,
        extraContext: input.extraContext,
      });

      if (input.dryRun) {
        return { skipped: false, dryRun: true, id: input.id, ...result };
      }

      // Persist:
      //   person   → bio
      //   article  → seoDescription + excerpt (both, from the JSON output)
      //   others   → description
      // We don't touch shortDescription/shortBio so any human-edited
      // summary on the row is preserved.
      //
      // Bonus: for company/investor/accelerator, if logo is empty AND
      // website is set, derive a logo URL via Clearbit (deterministic,
      // no LLM cost). This is the "fix it for our own self too" leg —
      // we backfill structured data while we're already touching the
      // row, so profiles end up presentable to humans, not just to
      // Google's crawler.
      const appliedFields: string[] = [];
      if (input.type === "article") {
        const update: Record<string, unknown> = { seoDescription: result.description };
        appliedFields.push("seoDescription");
        if (result.excerpt) {
          update.excerpt = result.excerpt;
          appliedFields.push("excerpt");
        }
        await db.update(tbl).set(update as any).where(eq(tbl.id, input.id));
      } else {
        const targetCol = input.type === "person" ? "bio" : "description";
        const update: Record<string, unknown> = { [targetCol]: result.description };
        appliedFields.push(targetCol);

        if (
          (input.type === "company" || input.type === "investor" || input.type === "accelerator") &&
          !((row as any).logo) &&
          (row as any).website
        ) {
          const derivedLogo = deriveLogoUrlFromWebsite((row as any).website as string);
          if (derivedLogo) {
            update.logo = derivedLogo;
            appliedFields.push("logo");
          }
        }

        await db.update(tbl).set(update as any).where(eq(tbl.id, input.id));
      }

      return { skipped: false, dryRun: false, id: input.id, appliedFields, ...result };
    }),

  /**
   * Process up to `limit` thin entities of a given type. Sequential
   * (one LLM call at a time) to avoid bursting the rate limit; for
   * larger backfills run multiple invocations.
   */
  enrichBatch: adminProcedure
    .input(z.object({
      type: z.enum(TYPES),
      limit: z.number().int().min(1).max(50).default(10),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tbl = TYPE_TABLES[input.type];

      const candidates = await db
        .select({ id: tbl.id })
        .from(tbl)
        .where(thinFilter(input.type))
        .limit(input.limit);

      const results: Array<{
        id: number;
        ok: boolean;
        name?: string;
        description?: string;
        error?: string;
      }> = [];

      for (const c of candidates) {
        try {
          const row = await loadEntityForEnrichment(input.type, c.id);
          if (!row) {
            results.push({ id: c.id, ok: false, error: "row vanished mid-batch" });
            continue;
          }
          // Pull this entity's news coverage so the LLM has factual
          // material beyond just structured fields. extraContext isn't
          // used in batch mode — that's per-entity only.
          const articleExcerpts = await loadArticleExcerptsFor(input.type, c.id);
          const r = await generateDescription(input.type, row, { articleExcerpts });
          if (!input.dryRun) {
            if (input.type === "article") {
              const update: Record<string, unknown> = { seoDescription: r.description };
              if (r.excerpt) update.excerpt = r.excerpt;
              await db.update(tbl).set(update as any).where(eq(tbl.id, c.id));
            } else {
              const targetCol = input.type === "person" ? "bio" : "description";
              await db.update(tbl)
                .set({ [targetCol]: r.description } as any)
                .where(eq(tbl.id, c.id));
            }
          }
          results.push({ id: c.id, ok: true, name: r.name, description: r.description });
        } catch (err: any) {
          results.push({
            id: c.id,
            ok: false,
            error: err?.message || String(err),
          });
        }
      }

      return {
        type: input.type,
        attempted: candidates.length,
        succeeded: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        dryRun: input.dryRun,
        results,
      };
    }),
});
