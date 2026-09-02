/**
 * The languages the site ships knowing about.
 *
 * Only two are seeded. English is the default — the language articles are
 * written in, never translated, and the fallback for any field a translation
 * has not covered. Arabic is the one every other language will be judged
 * against here: right-to-left, and the second language of the market this
 * publication covers.
 *
 * Everything else is added from the admin. That is the point of the table:
 * adding Urdu or French is a row, not a deploy.
 *
 * Arabic seeds in `manual_ai` mode deliberately. `auto` would start spending
 * against the site's LLM key the moment an article published, which is not a
 * decision a seed script gets to make on someone's behalf.
 *
 * Idempotent on code.
 */

import { type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { locales } from "../drizzle/schema";

export type LocaleDb = MySql2Database<Record<string, never>>;

interface Seed {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flagEmoji: string;
  isDefault: number;
  isActive: number;
  translationMode: "auto" | "manual_ai" | "manual_write";
  sortOrder: number;
  glossary?: Array<{ source: string; target: string }>;
}

const SEEDS: Seed[] = [
  {
    code: "en", name: "English", nativeName: "English", direction: "ltr",
    flagEmoji: "🇬🇧", isDefault: 1, isActive: 1, translationMode: "manual_write",
    sortOrder: 0,
  },
  {
    code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl",
    flagEmoji: "🇸🇦", isDefault: 0, isActive: 1, translationMode: "manual_ai",
    sortOrder: 1,
    // Names that must survive translation intact: a reader searching for the
    // exhibition, the ministry or the code needs the string the rest of the
    // industry uses, not a literal rendering of it.
    glossary: [
      { source: "BrentDesk", target: "BrentDesk" },
      { source: "Big 5 Construct Saudi", target: "Big 5 Construct Saudi" },
      { source: "Vision 2030", target: "رؤية 2030" },
      { source: "Saudi Building Code", target: "كود البناء السعودي" },
      { source: "Public Investment Fund", target: "صندوق الاستثمارات العامة" },
    ],
  },
];

/** Insert or refresh the seeded locales. Idempotent on code.
 *  Only ever fills in a locale that is missing — an existing row keeps the
 *  mode, provider and glossary an editor chose for it. */
export async function seedLocales(db: LocaleDb): Promise<void> {
  let added = 0, kept = 0;
  for (const s of SEEDS) {
    const [existing] = await db.select({ id: locales.id }).from(locales)
      .where(eq(locales.code, s.code)).limit(1);
    if (existing) { kept++; continue; }
    await db.insert(locales).values(s as any);
    added++;
  }
  console.log(`[seed] locales: ${added} added, ${kept} left as configured`);
}

/** How many locales a seeded database holds. Read by the boot check. */
export const LOCALE_SEED_COUNT = SEEDS.length;
