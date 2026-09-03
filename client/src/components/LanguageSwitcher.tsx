/**
 * Language Switcher
 * ----------------------------------------------------------------------
 * One click changes the language of the page you are on — not the home
 * page, not a language landing page, the same article.
 *
 * That is why this navigates rather than just setting a cookie: a language
 * lives at its own URL (/ar/construction/big-5-opens), so switching means
 * going there, and the address bar then holds a link that opens in Arabic
 * for whoever it is sent to. The cookie is set as well, so a later visit to
 * a bare URL stays in the language the reader chose.
 *
 * The default language has no prefix. English stays at
 * /construction/big-5-opens, which keeps every already-indexed URL where it
 * is.
 *
 * Reads two public procedures:
 *   locales.list    — the active languages, in the order the desk set
 *   locales.current — the one this request resolved to
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages, Check, ChevronDown } from "lucide-react";
import { LOCALE_COOKIE, stripLocale, withLocale } from "@/lib/locale";
import { useT } from "@/lib/i18n";

export interface LanguageSwitcherProps {
  /** Compact mode for tight headers — the code only, no native name. */
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const localesQuery = trpc.locales.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const currentQuery = trpc.locales.current.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [open, setOpen] = useState(false);
  const t = useT();

  const list = localesQuery.data || [];
  const active = currentQuery.data;

  // One language is not a choice. Nothing renders until a second is added
  // in the back office, so the header does not carry a dead control.
  if (list.length < 2 || !active) return null;

  function switchTo(code: string, isDefault: boolean) {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie =
      `${LOCALE_COOKIE}=${encodeURIComponent(code)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;

    // Same page, different language. Strip whatever prefix is on the current
    // URL before adding the new one, or switching twice would stack them.
    const bare = stripLocale(window.location.pathname, list.map(l => l.code));
    const target = withLocale(bare, { code, isDefault }) + window.location.search;
    // A full load, not a client-side push: the server resolves the language,
    // sets `dir` on the document, and re-renders every query in it.
    window.location.assign(target);
  }

  // Two languages is a toggle, not a menu. EN | AR sitting in the header is
  // one click and no hunting, which is what "convert and see" needs. Three or
  // more and it goes back to a dropdown, because a segmented control stops
  // fitting.
  if (list.length === 2) {
    return (
      <div
        className={`flex items-center rounded-full border border-white/30 overflow-hidden ${className}`}
        role="group"
        aria-label={t("nav.language")}
      >
        {list.map((l) => {
          const isActive = active.code === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => !isActive && switchTo(l.code, l.isDefault)}
              aria-current={isActive ? "true" : undefined}
              lang={l.code}
              dir={l.direction}
              title={l.nativeName}
              className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.code}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 px-2 ${className}`}
          aria-label={`Language: ${active.name}. Change language`}
        >
          <Languages className="h-4 w-4 opacity-80" />
          {!compact && (
            <span className="text-sm font-medium hidden sm:inline">{active.nativeName}</span>
          )}
          {compact && (
            <span className="text-xs font-semibold uppercase">{active.code}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">{t("nav.readThisPageIn")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchTo(l.code, l.isDefault)}
            className="gap-2 cursor-pointer"
            // Each option is written in its own language and reads in its
            // own direction, so an Arabic reader can find Arabic.
            lang={l.code}
            dir={l.direction}
          >
            <span className="text-base">{l.flagEmoji || "🌐"}</span>
            <span className="flex-1">{l.nativeName}</span>
            {active.code === l.code && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
