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
import { listLocales } from "../services/translation.service";

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

  current: publicProcedure.query(({ ctx }) => ({
    code: ctx.locale.code,
    name: ctx.locale.name,
    nativeName: ctx.locale.nativeName,
    direction: ctx.locale.direction,
    isDefault: ctx.locale.isDefault,
    source: ctx.locale.source,
  })),
});
