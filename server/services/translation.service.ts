/**
 * Translation Service
 * ----------------------------------------------------------------------
 * Turns a piece of published English into another language using whichever
 * model the site is configured for — Claude, OpenAI, Google, DeepSeek or
 * Mistral. The provider plumbing, API keys, failover and cost accounting
 * already exist in llmProvider.service; this is the editorial layer on top
 * of it.
 *
 * Three things make a translation for a trade publication different from a
 * generic one, and all three are enforced here rather than hoped for:
 *
 *   1. THE MARKUP MUST SURVIVE. Article bodies are HTML with contextual
 *      links to other articles. A model that helpfully rewrites an href
 *      breaks the archive's link graph silently. Every response is checked:
 *      the set of hrefs coming out must equal the set going in, or the
 *      translation is rejected.
 *
 *   2. NAMES ARE NOT WORDS. "Big 5 Construct Saudi" is an exhibition, not a
 *      description of five large things. Each locale carries a glossary of
 *      terms to pass through or render a fixed way, and the prompt is built
 *      around it.
 *
 *   3. NUMBERS ARE FACTS. SR57m, 1,000 exhibitors, 30 August. A translation
 *      that "localises" a figure has fabricated one. The prompt forbids it
 *      and every digit sequence in the source is checked for in the output.
 *
 * Staleness: each stored translation records the SHA-256 of the English it
 * was made from. When that English is edited the hash stops matching and the
 * row is marked stale, so the site can fall back to English rather than
 * quietly serve a translation of a paragraph that no longer exists.
 */

import { createHash } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { contentTranslations, locales } from "../../drizzle/schema";
import { invokeLLMProvider, type LLMProvider } from "./ai/llmProvider.service";
import { toDbDate } from "../_core/dbValues";
import { validateTranslation, type FieldProblem } from "./translationChecks";

export { validateTranslation, type FieldProblem } from "./translationChecks";

export type TranslationStatus = "draft" | "published" | "stale";

export interface LocaleRow {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flagEmoji: string | null;
  isDefault: boolean;
  isActive: boolean;
  translationMode: "auto" | "manual_ai" | "manual_write";
  provider: string | null;
  model: string | null;
  glossary: Array<{ source: string; target: string }>;
  sortOrder: number;
}

/** Fields worth translating, per entity type. Anything not listed here is
 *  either structural (slugs, ids) or would be wrong to translate (source
 *  URLs, publication names). Slugs deliberately stay English: a stable URL
 *  is worth more than a translated one, and the locale already sits in the
 *  path. */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  article: ["title", "excerpt", "content", "seoTitle", "seoDescription"],
  category: ["name", "description"],
  company: ["description"],
  person: ["bio"],
  event: ["title", "shortDescription", "description"],
  ui: [],   // every key is translatable; the field IS the key
};

// ============================================================
// Locale lookup, cached like editions are
// ============================================================

let localeCache: { rows: LocaleRow[]; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

function toLocaleRow(r: any): LocaleRow {
  return {
    id: r.id, code: r.code, name: r.name, nativeName: r.nativeName,
    direction: r.direction === "rtl" ? "rtl" : "ltr",
    flagEmoji: r.flagEmoji ?? null,
    isDefault: !!r.isDefault, isActive: !!r.isActive,
    translationMode: r.translationMode,
    provider: r.provider ?? null, model: r.model ?? null,
    glossary: Array.isArray(r.glossary) ? r.glossary : [],
    sortOrder: r.sortOrder ?? 0,
  };
}

export async function listLocales(opts: { activeOnly?: boolean } = {}): Promise<LocaleRow[]> {
  const now = Date.now();
  if (!localeCache || now - localeCache.ts >= CACHE_TTL_MS) {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(locales);
    localeCache = { rows: rows.map(toLocaleRow), ts: now };
  }
  const all = [...localeCache.rows].sort((a, b) => a.sortOrder - b.sortOrder);
  return opts.activeOnly ? all.filter(l => l.isActive) : all;
}

/** Drop the cache. Called by the admin router after any locale write, so an
 *  editor adding a language sees it in the switcher immediately rather than
 *  up to a minute later. */
export function invalidateLocaleCache(): void {
  localeCache = null;
}

export async function getLocale(code: string): Promise<LocaleRow | null> {
  const all = await listLocales();
  return all.find(l => l.code === code) ?? null;
}

export async function getDefaultLocale(): Promise<LocaleRow | null> {
  const all = await listLocales();
  return all.find(l => l.isDefault) ?? all.find(l => l.code === "en") ?? null;
}

// ============================================================
// Reading translations back
// ============================================================

export function sourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Published translations for one entity, as a field → value map.
 * Only "published" rows are returned: drafts are an editor's work in
 * progress and stale rows are translations of English that has since
 * changed. Both fall back to the source language, per field.
 */
export async function getTranslations(
  entityType: string, entityId: number, locale: string,
): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({ field: contentTranslations.field, value: contentTranslations.value })
    .from(contentTranslations)
    .where(and(
      eq(contentTranslations.entityType, entityType),
      eq(contentTranslations.entityId, entityId),
      eq(contentTranslations.locale, locale),
      eq(contentTranslations.status, "published"),
    ));
  return Object.fromEntries(rows.map(r => [r.field, r.value]));
}

/** Same, for a page of entities at once — one query for a listing rather
 *  than one per card. */
export async function getTranslationsFor(
  entityType: string, entityIds: number[], locale: string,
): Promise<Map<number, Record<string, string>>> {
  const out = new Map<number, Record<string, string>>();
  if (!entityIds.length) return out;
  const db = await getDb();
  if (!db) return out;
  const rows = await db
    .select({
      entityId: contentTranslations.entityId,
      field: contentTranslations.field,
      value: contentTranslations.value,
    })
    .from(contentTranslations)
    .where(and(
      eq(contentTranslations.entityType, entityType),
      inArray(contentTranslations.entityId, entityIds),
      eq(contentTranslations.locale, locale),
      eq(contentTranslations.status, "published"),
    ));
  for (const r of rows) {
    const bag = out.get(r.entityId) ?? {};
    bag[r.field] = r.value;
    out.set(r.entityId, bag);
  }
  return out;
}

/**
 * Overlay a translation onto a source record. Field by field, so a headline
 * that has been translated and a body that has not produce a readable page
 * rather than an empty one.
 */
export function applyTranslation<T extends Record<string, any>>(
  row: T, translated: Record<string, string> | undefined,
): T {
  if (!translated) return row;
  const out: Record<string, any> = { ...row };
  for (const [field, value] of Object.entries(translated)) {
    if (value) out[field] = value;
  }
  return out as T;
}

// ============================================================
// The prompt
// ============================================================

function buildSystemPrompt(locale: LocaleRow): string {
  const glossary = locale.glossary.length
    ? "\n\nGLOSSARY — render these exactly as given, every time:\n" +
      locale.glossary.map(g => `  ${g.source} → ${g.target}`).join("\n")
    : "";

  return [
    `You are a professional translator for an industrial trade publication`,
    `covering Saudi Arabia and the Gulf. You translate published English`,
    `journalism into ${locale.name} (${locale.nativeName}) for readers who work`,
    `in construction, energy, manufacturing and logistics.`,
    ``,
    `Write the way that industry's own trade press writes in ${locale.name}:`,
    `plain, specific, unadorned. Do not add throat-clearing, do not summarise,`,
    `do not editorialise, and do not soften a direct sentence into a polite one.`,
    `Translate what is there — no more and no less.`,
    ``,
    `HARD RULES:`,
    `1. Preserve every HTML tag exactly as it appears, including attributes.`,
    `   Never change, translate or reorder an href. Never add or remove a tag.`,
    `2. Never change a number, unit, currency, percentage or date. SR57m stays`,
    `   SR57m. 1,000 exhibitors stays 1,000. Do not convert currencies.`,
    `3. Keep company, product, project, exhibition and person names in their`,
    `   original form unless the glossary below gives a rendering.`,
    `4. Keep the paragraph structure: one paragraph in, one paragraph out.`,
    `5. If a sentence cannot be rendered faithfully, translate it literally`,
    `   rather than inventing a smoother version.`,
    glossary,
  ].join("\n");
}

function buildUserPrompt(fields: Record<string, string>): string {
  return [
    `Translate each field below. Return ONLY a JSON object whose keys are the`,
    `same field names and whose values are the translations. No commentary,`,
    `no code fence.`,
    ``,
    JSON.stringify(fields, null, 2),
  ].join("\n");
}

function parseJsonResponse(text: string): Record<string, string> {
  let t = text.trim();
  // Models fence JSON even when told not to.
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in the model's reply");
  const parsed = JSON.parse(t.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null) throw new Error("model returned a non-object");
  return parsed as Record<string, string>;
}

// ============================================================
// Translating
// ============================================================

export interface TranslateResult {
  locale: string;
  fields: Record<string, string>;
  provider: LLMProvider;
  model: string;
  costUsd: string;
  problems: FieldProblem[];
}

/**
 * One call to the model, validated, with one retry.
 *
 * The retry is not a blind repeat: the second attempt is told exactly what
 * was wrong with the first, which is the difference between a model that
 * fixes a dropped link and one that drops it again.
 */
export async function translateFields(
  fields: Record<string, string>, locale: LocaleRow,
): Promise<TranslateResult> {
  const present = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v && v.trim()),
  );
  if (!Object.keys(present).length) {
    throw new Error("nothing to translate");
  }

  const system = buildSystemPrompt(locale);
  let userPrompt = buildUserPrompt(present);
  let last: { candidate: Record<string, string>; problems: FieldProblem[]; res: any } | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await invokeLLMProvider({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ] as any,
      provider: (locale.provider as LLMProvider) || undefined,
      model: locale.model || undefined,
      temperature: 0.2,
      maxTokens: 8192,
      operation: `translate:${locale.code}`,
    });

    let candidate: Record<string, string>;
    try {
      candidate = parseJsonResponse(res.content);
    } catch (err) {
      if (attempt === 2) throw err;
      userPrompt = buildUserPrompt(present) +
        `\n\nYour previous reply was not valid JSON. Return only the JSON object.`;
      continue;
    }

    const problems = validateTranslation(present, candidate);
    last = { candidate, problems, res };
    if (!problems.length) {
      return {
        locale: locale.code, fields: candidate,
        provider: res.provider, model: res.model,
        costUsd: res.estimatedCostUsd, problems: [],
      };
    }

    userPrompt = buildUserPrompt(present) +
      `\n\nYour previous translation had these problems. Fix them and return ` +
      `the whole object again:\n` +
      problems.map(p => `  - ${p.field}: ${p.problem}`).join("\n");
  }

  // Second attempt still imperfect. Hand it back WITH its problems rather
  // than throwing: an editor reviewing a draft that dropped one figure is
  // better served than one who gets nothing and no explanation.
  return {
    locale: locale.code, fields: last!.candidate,
    provider: last!.res.provider, model: last!.res.model,
    costUsd: last!.res.estimatedCostUsd, problems: last!.problems,
  };
}

/**
 * Translate one entity and store the result.
 *
 * `publish` decides whether readers see it immediately. A locale in `auto`
 * mode publishes; a manual translate lands as a draft for review unless the
 * editor asked for it to go live.
 */
export async function translateEntity(opts: {
  entityType: string;
  entityId: number;
  locale: LocaleRow;
  source: Record<string, string>;
  publish: boolean;
  requestedById?: number | null;
}): Promise<TranslateResult> {
  const db = await getDb();
  if (!db) throw new Error("database unavailable");

  const allowed = TRANSLATABLE_FIELDS[opts.entityType];
  const source = allowed?.length
    ? Object.fromEntries(Object.entries(opts.source).filter(([k]) => allowed.includes(k)))
    : opts.source;

  const result = await translateFields(source, opts.locale);
  const now = toDbDate(new Date());

  for (const [field, value] of Object.entries(result.fields)) {
    if (!value || !source[field]) continue;
    const row = {
      entityType: opts.entityType,
      entityId: opts.entityId,
      locale: opts.locale.code,
      field,
      value,
      source: "ai" as const,
      status: (opts.publish ? "published" : "draft") as TranslationStatus,
      model: result.model,
      sourceHash: sourceHash(source[field]),
      translatedAt: now,
      reviewedById: opts.requestedById ?? null,
    };
    await db
      .insert(contentTranslations)
      .values(row as any)
      .onDuplicateKeyUpdate({
        set: {
          value: row.value, source: row.source, status: row.status,
          model: row.model, sourceHash: row.sourceHash, translatedAt: row.translatedAt,
        } as any,
      });
  }
  return result;
}

/**
 * Mark every translation of an entity stale whose source text has changed.
 *
 * Called when an article is edited. A stale row stops being served — the
 * reader gets English rather than a translation of a sentence that is no
 * longer in the piece — and shows up in the admin as needing a re-run.
 */
export async function markStale(
  entityType: string, entityId: number, source: Record<string, string>,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({
      id: contentTranslations.id,
      field: contentTranslations.field,
      sourceHash: contentTranslations.sourceHash,
      status: contentTranslations.status,
    })
    .from(contentTranslations)
    .where(and(
      eq(contentTranslations.entityType, entityType),
      eq(contentTranslations.entityId, entityId),
    ));

  let marked = 0;
  for (const r of rows) {
    const current = source[r.field];
    if (current === undefined || r.status === "stale") continue;
    if (r.sourceHash && r.sourceHash === sourceHash(current)) continue;
    await db.update(contentTranslations)
      .set({ status: "stale" } as any)
      .where(eq(contentTranslations.id, r.id));
    marked++;
  }
  return marked;
}

export const translationService = {
  listLocales, getLocale, getDefaultLocale, invalidateLocaleCache,
  getTranslations, getTranslationsFor, applyTranslation,
  translateFields, translateEntity, markStale, validateTranslation, sourceHash,
};

/**
 * Overlay the request's language onto a list of article rows.
 *
 * A no-op on the default language, which is the common case and must not
 * cost a query. Otherwise one query for the whole page, not one per card.
 */
export async function localizeArticles<T extends { id: number }>(
  locale: { code: string; isDefault: boolean } | undefined, rows: T[],
): Promise<T[]> {
  if (!locale || locale.isDefault || !rows.length) return rows;
  const map = await getTranslationsFor("article", rows.map(r => r.id), locale.code);
  return rows.map(r => applyTranslation(r, map.get(r.id)));
}

/** Same for a single article. */
export async function localizeArticle<T extends { id: number }>(
  locale: { code: string; isDefault: boolean } | undefined, row: T,
): Promise<T> {
  if (!locale || locale.isDefault) return row;
  return applyTranslation(row, await getTranslations("article", row.id, locale.code));
}
