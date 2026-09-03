/**
 * Edition Switcher
 * ----------------------------------------------------------------------
 * Header dropdown that lets the visitor pick which country edition
 * they're browsing in. Default detected from Cloudflare geo on
 * server-side; persisted in the `tsEdition` cookie once the visitor
 * makes a choice (or after first-visit auto-detection).
 *
 * The active edition's slug → cookie → next request resolves to it
 * via server/services/edition.service.ts. On change we hard-reload
 * the page so every listing query gets re-fetched with the new
 * editionCountryId.
 *
 * Reads from two public tRPC procedures:
 *   editions.list    — the dropdown options
 *   editions.current — the active edition (highlight + flag in trigger)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Check, ChevronDown } from "lucide-react";

export interface EditionSwitcherProps {
  /** Compact mode for tight headers — shows just the flag, no name. */
  compact?: boolean;
  className?: string;
}

/**
 * Sets the tsEdition cookie and triggers a hard reload so the
 * server-rendered HTML (and tRPC payloads) pick up the new edition.
 * 1-year max-age keeps the choice sticky across sessions.
 */
function setEditionAndReload(slug: string) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `tsEdition=${encodeURIComponent(slug)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
  // Hard reload so SSR + tRPC + all cached fetches re-resolve.
  window.location.reload();
}

export function EditionSwitcher({ compact = false, className = "" }: EditionSwitcherProps) {
  const t = useT();
  const editions = trpc.editions.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const current = trpc.editions.current.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [open, setOpen] = useState(false);

  const list = editions.data || [];
  const active = current.data;

  if (list.length === 0 || !active) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 px-2 ${className}`}
          aria-label={t("edition.currentlyViewing", { edition: active.name })}
        >
          <span className="text-base leading-none">{active.flagEmoji || "🌍"}</span>
          {!compact && (
            <span className="text-sm font-medium hidden sm:inline">{active.name}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Globe className="h-3.5 w-3.5" /> {t("nav.chooseEdition")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list
          .filter((e) => !e.isInternational)
          .map((e) => (
            <DropdownMenuItem
              key={e.id}
              onClick={() => setEditionAndReload(e.slug)}
              className="gap-2 cursor-pointer"
            >
              <span className="text-base">{e.flagEmoji || "🏳️"}</span>
              <span className="flex-1">{e.name}</span>
              {active.id === e.id && <Check className="h-4 w-4 text-emerald-600" />}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        {list
          .filter((e) => e.isInternational)
          .map((e) => (
            <DropdownMenuItem
              key={e.id}
              onClick={() => setEditionAndReload(e.slug)}
              className="gap-2 cursor-pointer"
            >
              <span className="text-base">{e.flagEmoji || "🌍"}</span>
              <span className="flex-1">{e.name}</span>
              {active.id === e.id && <Check className="h-4 w-4 text-emerald-600" />}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EditionSwitcher;
