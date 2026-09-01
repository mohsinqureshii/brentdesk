/**
 * Edition First-Visit Banner
 * ----------------------------------------------------------------------
 * One-line banner that surfaces the auto-detected edition on the
 * visitor's first visit so they're not surprised by personalization
 * they didn't ask for. Dismissible — once closed (or once the visitor
 * picks an edition from the header switcher), it never reappears.
 *
 * Detection logic:
 *   - We show the banner only when `tsEdition` cookie is NOT set
 *     AND the server resolved to a non-International edition. That
 *     means: this is the visitor's first visit AND the geo-detection
 *     actually placed them somewhere meaningful.
 *   - A separate `tsEditionBannerDismissed` cookie remembers the
 *     dismiss action so we don't re-show on every page load even
 *     if the visitor hasn't picked yet.
 *
 * Why a banner and not a modal: modals interrupt; banners inform.
 * Reuters / FT / BBC all use the banner pattern for this.
 */
import { useEffect, useState } from "react";
import { useEdition } from "@/hooks/useEdition";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function EditionFirstVisitBanner() {
  const { edition, isLoading } = useEdition();
  const [dismissed, setDismissed] = useState(true);

  // Mount-time check: only un-hide if the visitor has no tsEdition
  // cookie and hasn't already dismissed this banner. Doing this in
  // an effect (not at render) keeps SSR markup identical for
  // everyone — Google sees an empty banner slot, real users see it
  // briefly after hydration.
  useEffect(() => {
    const hasEditionCookie = !!readCookie("tsEdition");
    const hasDismissed = !!readCookie("tsEditionBannerDismissed");
    setDismissed(hasEditionCookie || hasDismissed);
  }, []);

  const close = () => {
    document.cookie = `tsEditionBannerDismissed=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
    setDismissed(true);
  };

  // Don't show on loading, dismissed, no edition, or International
  // (no personalization → no surprise to inform about).
  if (isLoading || dismissed || !edition || edition.isInternational) return null;

  return (
    <div className="w-full bg-blue-600/95 text-white text-sm">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{edition.flagEmoji || "🌍"}</span>
          <span className="truncate">
            You're viewing the <strong>{edition.name}</strong> edition.
            Content from your country surfaces first. Switch via the
            flag in the header.
          </span>
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          className="shrink-0 h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default EditionFirstVisitBanner;
