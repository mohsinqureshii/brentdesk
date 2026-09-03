/**
 * Public Locales Router
 * ----------------------------------------------------------------------
 * What the reader's language switcher reads.
 *
 * `list` is every active language, in the order an editor arranged them.
 * `current` is the one this request resolved to, and how it was decided —
 * the switcher highlights it, and the document sets `lang` and `dir` from
 * it, which is what makes an Arabic page actually read right to left rather
 * than merely contain Arabic.
 *
 * Both read the in-process locale cache, so the cost after warm-up is
 * nothing. The admin clears that cache on every write, so a language added
 * in the back office appears in the switcher on the next request.
 */

import { router, publicProcedure } from "../_core/trpc";
import { listLocales, getTranslations } from "../services/translation.service";
import { UI_STRINGS } from "../../shared/uiStrings";

export const publicLocalesRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await listLocales({ activeOnly: true });
    return rows.map(l => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      direction: l.direction,
      flagEmoji: l.flagEmoji,
      isDefault: l.isDefault,
    }));
  }),

  /**
   * The site's own words in the language being served.
   *
   * English is returned as-is on the default locale without touching the
   * database — the common case must not cost a query. Otherwise the stored
   * strings are laid over the English so a key nobody has translated yet
   * still renders a word rather than a key.
   */
  strings: publicProcedure.query(async ({ ctx }) => {
    if (ctx.locale.isDefault) return { locale: ctx.locale.code, strings: UI_STRINGS as Record<string, string> };
    const stored = await getTranslations("ui", 0, ctx.locale.code);
    return {
      locale: ctx.locale.code,
      strings: { ...(UI_STRINGS as Record<string, string>), ...stored },
    };
  }),

  current: publicProcedure.query(({ ctx }) => ({
    code: ctx.locale.code,
    name: ctx.locale.name,
    nativeName: ctx.locale.nativeName,
    direction: ctx.locale.direction,
    isDefault: ctx.locale.isDefault,
    source: ctx.locale.source,
  })),
});
