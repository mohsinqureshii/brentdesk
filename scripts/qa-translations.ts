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

for (const file of files) {
  let t: any;
  try {
    t = JSON.parse(readFileSync(path.join(TDIR, file), "utf8"));
  } catch (e) {
    err(file, `invalid JSON: ${(e as Error).message}`);
    continue;
  }

  if (!t.slug) { err(file, `missing "slug"`); continue; }
  if (!t.fields || typeof t.fields !== "object") { err(file, `missing "fields"`); continue; }
  if (file !== `${t.slug}.json`) warn(file, `filename does not match slug "${t.slug}"`);

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

const articleFiles = files.filter(f => f !== "_ui.json").length;
const pct = ((articleFiles / english.size) * 100).toFixed(1);
console.log(
  `\n${articleFiles}/${english.size} articles translated into ${locale} (${pct}%) · ` +
  `${fieldCount} fields · ${uiTranslated}/${Object.keys(UI_STRINGS).length} UI strings · ` +
  `${errors.length} errors · ${warns.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
