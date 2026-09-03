/**
 * QA gate for the translated archive.
 *
 * The same checks a live model call is held to, applied to files in the
 * repository — a translation shipped as content gets no easier a ride than
 * one generated at runtime:
 *
 *   - every href identical to the English, so the archive's internal link
 *     graph survives translation
 *   - every figure in the English present in the translation, so SR57m and
 *     1,000 exhibitors cannot quietly go missing
 *   - the same number of HTML tags, so paragraphs cannot be merged away
 *   - the slug names an article that actually exists
 *   - Arabic text where Arabic is expected, which catches a file that was
 *     copied but never translated
 *
 * Run: pnpm tsx scripts/qa-translations.ts [locale]
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { validateTranslation } from "../server/services/translationChecks";
import { UI_STRINGS } from "../shared/uiStrings";

const ROOT = path.resolve(import.meta.dirname, "..", "content");
const locale = process.argv[2] || "ar";
const TDIR = path.join(ROOT, "translations", locale);
const ADIR = path.join(ROOT, "articles");

/** Scripts whose presence proves a field was actually translated. */
const SCRIPT_RANGES: Record<string, RegExp> = {
  ar: /[؀-ۿ]/,
  ur: /[؀-ۿ]/,
  hi: /[ऀ-ॿ]/,
  zh: /[一-鿿]/,
};

/** The slugs the seed actually creates, read from the seed itself so a rename
 *  there turns into a QA error here rather than a heading that silently stays
 *  English. */
function seededSlugs(arrayName: string): Set<string> {
  const seed = readFileSync(path.join(ROOT, "..", "scripts", "seed-brentdesk.ts"), "utf8");
  const block = new RegExp(`const ${arrayName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`).exec(seed);
  const out = new Set<string>();
  if (!block) return out;
  for (const m of block[1].matchAll(/slug:\s*"([^"]+)"/g)) out.add(m[1]);
  return out;
}
const SEEDED_CATEGORIES = seededSlugs("NEWS_CATEGORIES");
const SEEDED_SECTIONS = seededSlugs("SECTIONS");
let furnitureTranslated = 0;

interface Issue { file: string; level: "error" | "warn"; message: string }
const issues: Issue[] = [];
const err = (file: string, message: string) => issues.push({ file, level: "error", message });
const warn = (file: string, message: string) => issues.push({ file, level: "warn", message });

// The English archive, by slug.
const english = new Map<string, any>();
for (const f of readdirSync(ADIR).filter(f => f.endsWith(".json"))) {
  const parsed = JSON.parse(readFileSync(path.join(ADIR, f), "utf8"));
  for (const a of Array.isArray(parsed) ? parsed : [parsed]) {
    // The archive files call it `headline`; the CMS column is `title`, and a
    // translation names the field it will be stored under.
    english.set(a.slug, { ...a, title: a.title ?? a.headline });
  }
}

if (!existsSync(TDIR)) {
  console.log(`no translations for "${locale}" yet — 0 of ${english.size} articles`);
  process.exit(0);
}

const files = readdirSync(TDIR).filter(f => f.endsWith(".json")).sort();
const script = SCRIPT_RANGES[locale.split("-")[0]];
let fieldCount = 0;
let uiTranslated = 0;

// One article per file, but the furniture files (_categories, _sections)
// carry a list — a file per category name would be 32 files holding one word
// each.
const entries: Array<{ file: string; t: any }> = [];
for (const file of files) {
  try {
    const parsed = JSON.parse(readFileSync(path.join(TDIR, file), "utf8"));
    for (const t of Array.isArray(parsed) ? parsed : [parsed]) entries.push({ file, t });
  } catch (e) {
    err(file, `invalid JSON: ${(e as Error).message}`);
  }
}

for (const { file, t } of entries) {
  if (!t.slug) { err(file, `missing "slug"`); continue; }
  if (!t.fields || typeof t.fields !== "object") { err(file, `missing "fields"`); continue; }
  if (!file.startsWith("_") && file !== `${t.slug}.json`) {
    warn(file, `filename does not match slug "${t.slug}"`);
  }

  // The site's own words rather than an article: keys come from
  // shared/uiStrings.ts, so the check is coverage, not link and figure
  // fidelity.
  if (t.entityType === "ui") {
    for (const key of Object.keys(t.fields)) {
      if (!(key in UI_STRINGS)) warn(file, `"${key}" is not a UI string key`);
    }
    for (const key of Object.keys(UI_STRINGS)) {
      if (!(key in t.fields)) warn(file, `"${key}" is not translated`);
    }
    uiTranslated = Object.keys(t.fields).length;
    if (script) {
      for (const [key, value] of Object.entries(t.fields as Record<string, string>)) {
        // A key whose English is already a proper noun or an acronym is
        // legitimately identical in Arabic.
        if (!script.test(value) && value !== (UI_STRINGS as any)[key]) {
          warn(file, `${key}: no ${locale} script`);
        }
      }
    }
    continue;
  }

  // Site furniture: a category name or a homepage block heading. There is no
  // English article behind these, so the article checks do not apply — what
  // matters is that the slug is one the seed actually creates (a typo here
  // fails silently at ingest, leaving the heading in English forever) and
  // that the name was translated.
  if (t.entityType === "category" || t.entityType === "homepage_section") {
    const known = t.entityType === "category" ? SEEDED_CATEGORIES : SEEDED_SECTIONS;
    if (!known.has(t.slug)) {
      err(file, `${t.entityType} "${t.slug}" is not seeded — nothing will match it`);
    }
    const name = (t.fields as Record<string, string>).name;
    if (!name || !name.trim()) err(file, `${t.slug}: no "name"`);
    else if (script && !script.test(name)) warn(file, `${t.slug}: no ${locale} script`);
    furnitureTranslated++;
    continue;
  }

  const source = english.get(t.slug);
  if (!source) { err(file, `no English article with slug "${t.slug}"`); continue; }

  // Compare only the fields this file actually claims to translate. A partial
  // translation is legitimate — a headline can land before a body does.
  const pairs: Record<string, string> = {};
  for (const key of Object.keys(t.fields)) {
    if (source[key] === undefined || source[key] === null || source[key] === "") {
      warn(file, `translates "${key}", which the English article does not have`);
      continue;
    }
    pairs[key] = source[key];
    fieldCount++;
  }

  for (const p of validateTranslation(pairs, t.fields)) {
    err(file, `${p.field}: ${p.problem}`);
  }

  if (script) {
    for (const [field, value] of Object.entries(t.fields as Record<string, string>)) {
      if (!script.test(value)) err(file, `${field}: no ${locale} script — was it translated?`);
    }
  }

  if (!t.translator) warn(file, `no "translator" recorded`);
}

const errors = issues.filter(i => i.level === "error");
const warns = issues.filter(i => i.level === "warn");
for (const i of [...errors, ...warns]) {
  console.log(`${i.level === "error" ? "ERROR" : " warn"}  ${i.file}: ${i.message}`);
}

const articleFiles = files.filter(f => !f.startsWith("_")).length;
const pct = ((articleFiles / english.size) * 100).toFixed(1);
console.log(
  `\n${articleFiles}/${english.size} articles translated into ${locale} (${pct}%) · ` +
  `${fieldCount} fields · ${uiTranslated}/${Object.keys(UI_STRINGS).length} UI strings · ` +
  `${furnitureTranslated} category and section names · ` +
  `${errors.length} errors · ${warns.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
