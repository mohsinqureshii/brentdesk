/**
 * The site's own words, in the language being read.
 *
 * One query for the whole page, cached for the session, with the English
 * from shared/uiStrings.ts as both the initial value and the fallback. That
 * ordering matters: the first paint shows real words rather than keys or
 * blanks, and a string nobody has translated yet degrades to English rather
 * than to `nav.signIn`.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { UI_STRINGS, interpolate, type UiKey } from "@shared/uiStrings";

type Strings = Record<string, string>;

const StringsContext = createContext<Strings>(UI_STRINGS as Strings);

export function StringsProvider({ children }: { children: ReactNode }) {
  const q = trpc.locales.strings.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
    // The English is already compiled into the bundle, so there is nothing
    // to wait for and no reason to flash.
    placeholderData: { locale: "en", strings: UI_STRINGS as Strings },
  });
  const value = useMemo(() => q.data?.strings ?? (UI_STRINGS as Strings), [q.data]);
  return <StringsContext.Provider value={value}>{children}</StringsContext.Provider>;
}

/**
 * `const t = useT()` then `t("article.share")`.
 * Pass variables for keys that carry {placeholders}.
 */
export function useT() {
  const strings = useContext(StringsContext);
  return (key: UiKey, vars?: Record<string, string | number>): string =>
    interpolate(strings[key] ?? UI_STRINGS[key] ?? key, vars);
}
