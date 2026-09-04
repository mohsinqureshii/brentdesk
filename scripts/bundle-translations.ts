/**
 * Bundle the translated archive into dist/translations.json.
 *
 * Translations live in the repository the same way the English archive does —
 * content/translations/<locale>/<slug>.json — rather than being produced by a
 * live model call at boot. Three reasons that matters:
 *
 *   1. They are reviewable. A translation in git can be read in a pull
 *      request, corrected, and blamed. One generated at runtime cannot.
 *   2. They are free to deploy. Re-running 268 articles through a model on
 *      every fresh database would cost real money for a result that never
 *      changes.
 *   3. They are reproducible. The same deploy produces the same Arabic.
 *
 * The runtime model path still exists for anything written after this — an
 * editor presses Translate and it lands in the same table.
 *
 * Run: pnpm tsx scripts/bundle-translations.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..", "content", "translations");
const OUT = path.resolve(import.meta.dirname, "..", "dist", "translations.json");
// Merged and renamed articles keep their old URLs as 301s. The list lives
// in content/ beside the articles it concerns and ships with the bundle.
const REDIRECTS_SRC = path.resolve(import.meta.dirname, "..", "content", "redirects.json");
const REDIRECTS_OUT = path.resolve(import.meta.dirname, "..", "dist", "redirects.json");

export interface TranslationFile {
  /** The English article this translates, by slug. */
  slug: string;
  locale: string;
  /** field -> translated value. Missing fields fall back to English. */
  fields: Record<string, string>;
  /** What produced it, for the audit trail. */
  translator?: string;
}

function main() {
  if (existsSync(REDIRECTS_SRC)) {
    mkdirSync(path.dirname(REDIRECTS_OUT), { recursive: true });
    writeFileSync(REDIRECTS_OUT, readFileSync(REDIRECTS_SRC));
    console.log(`[bundle] redirects -> dist/redirects.json`);
  }
  const out: TranslationFile[] = [];

  if (!existsSync(ROOT)) {
    console.log("[bundle] no content/translations directory — nothing to bundle");
    writeFileSync(OUT, "[]");
    return;
  }

  for (const locale of readdirSync(ROOT)) {
    const dir = path.join(ROOT, locale);
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    for (const f of files) {
      const parsed = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      const batch: TranslationFile[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const t of batch) {
        if (!t.slug || !t.fields) {
          throw new Error(`${locale}/${f}: needs "slug" and "fields"`);
        }
        out.push({ ...t, locale: t.locale || locale });
      }
    }
    console.log(`[bundle] ${locale}: ${files.length} files`);
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`[bundle] ${out.length} translations -> dist/translations.json`);
}

main();
