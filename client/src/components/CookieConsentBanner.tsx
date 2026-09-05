/**
 * Cookie consent.
 *
 * Two states, one component.
 *
 *   The bar. A slim strip of ink across the foot of the window: one line
 *   of copy, three plain buttons, no card, no shadow, no rounded corners
 *   floating over the middle of the page. It is the first thing a new
 *   reader sees, so it is drawn in the publication's own type rather
 *   than in generic dialog furniture, and it is deliberately short —
 *   the detail lives on the cookie policy, which is linked.
 *
 *   The panel. Opened from "Customise", or from the footer link at any
 *   later date. A real modal: it takes focus, closes on Escape, and
 *   dims the page behind it, because a reader changing their mind about
 *   tracking should not have to hunt for a switch in a strip.
 *
 * Rejecting is exactly as easy as accepting — same size, same weight,
 * same row — which is both the decent way to ask and what GDPR/ePrivacy
 * guidance requires. Nothing is stored until the reader chooses.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";
import { X } from "lucide-react";

const STORAGE_KEY = "ts_cookie_consent";
const EVENT_NAME = "ts:cookie-consent-changed";
const SHOW_EVENT = "ts:cookie-preferences-open";

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: number;
}

/**
 * Programmatically reopen the cookie consent banner / preferences panel.
 * Footer and other components can call this to let users revisit their choices.
 */
export function triggerCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHOW_EVENT));
}

/**
 * Read the user's stored cookie consent. Returns null if no choice has been made.
 */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "acceptedAt" in parsed) {
      return parsed as CookieConsent;
    }
    return null;
  } catch {
    return null;
  }
}

/** One switch in the preferences panel, drawn rather than imported: the
 *  shadcn Switch is styled for a white form, and this panel is ink. */
function Toggle({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-5 w-9 shrink-0 transition-colors ${
        checked ? "bg-primary" : "bg-white/25"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-4 w-4 bg-white transition-[inset-inline-start] ${
          checked ? "start-[1.125rem]" : "start-0.5"
        }`}
      />
    </button>
  );
}

export function CookieConsentBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initial visibility: show only if no prior consent stored.
  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setVisible(true);
    }

    const handleOpen = () => {
      const current = getCookieConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setCustomizing(true);
      setVisible(true);
    };

    window.addEventListener(SHOW_EVENT, handleOpen as EventListener);
    return () => {
      window.removeEventListener(SHOW_EVENT, handleOpen as EventListener);
    };
  }, []);

  // The panel is modal, so Escape closes it back to the bar — or closes
  // the whole thing if the reader had already chosen once.
  useEffect(() => {
    if (!customizing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (getCookieConsent()) {
        setVisible(false);
        setCustomizing(false);
      } else {
        setCustomizing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [customizing]);

  const persist = useCallback((choices: { analytics: boolean; marketing: boolean }) => {
    const payload: CookieConsent = {
      essential: true,
      analytics: choices.analytics,
      marketing: choices.marketing,
      acceptedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (private mode); ignore.
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
    setVisible(false);
    setCustomizing(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    setAnalytics(true);
    setMarketing(true);
    persist({ analytics: true, marketing: true });
  }, [persist]);

  const handleRejectAll = useCallback(() => {
    setAnalytics(false);
    setMarketing(false);
    persist({ analytics: false, marketing: false });
  }, [persist]);

  const handleSave = useCallback(() => {
    persist({ analytics, marketing });
  }, [persist, analytics, marketing]);

  if (!visible) return null;

  // Same button, three uses. Reject and accept are the same size and the
  // same weight; only the colour differs, and only so the primary action
  // is findable — not so the other one is hard to find.
  const btn =
    "bd-display h-10 px-5 text-[0.75rem] font-bold uppercase tracking-[0.08em] transition-colors whitespace-nowrap";

  if (!customizing) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-[60] bd-ink border-t-2 border-primary"
        role="region"
        aria-label={t("cookies.consent")}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
          <div className="min-w-0 flex-1">
            <p className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-white">
              {t("cookies.title")}
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-white/70">
              {t("cookies.body", { site: publication.name })}{" "}
              <Link href="/cookies" className="text-white underline underline-offset-2 hover:text-primary">
                {t("cookies.cookiePolicy")}
              </Link>
              {" · "}
              <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-primary">
                {t("footer.privacyPolicy")}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRejectAll}
              className={`${btn} border border-white/30 text-white hover:bg-white/10`}
            >
              {t("cookies.rejectAll")}
            </button>
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className={`${btn} border border-white/30 text-white hover:bg-white/10`}
            >
              {t("cookies.customize")}
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className={`${btn} bg-primary text-white hover:bg-primary/85`}
            >
              {t("cookies.acceptAll")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categories: {
    id: string;
    label: string;
    help: string;
    checked: boolean;
    onChange?: (v: boolean) => void;
    locked?: boolean;
  }[] = [
    {
      id: "cookie-essential",
      label: t("cookies.essential"),
      help: t("cookies.essentialHelp"),
      checked: true,
      locked: true,
    },
    {
      id: "cookie-analytics",
      label: t("cookies.analytics"),
      help: t("cookies.analyticsHelp"),
      checked: analytics,
      onChange: setAnalytics,
    },
    {
      id: "cookie-marketing",
      label: t("cookies.marketing"),
      help: t("cookies.marketingHelp"),
      checked: marketing,
      onChange: setMarketing,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => (getCookieConsent() ? setVisible(false) : setCustomizing(false))}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("cookies.preferences")}
        className="relative w-full sm:max-w-lg bd-ink border-t-2 sm:border-2 border-primary max-h-[85vh] overflow-y-auto outline-none"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <h2 className="bd-display text-[0.9375rem] font-bold uppercase tracking-[0.1em] text-white">
              {t("cookies.preferences")}
            </h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-white/65">
              {t("cookies.preferencesHelp")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (getCookieConsent() ? setVisible(false) : setCustomizing(false))}
            aria-label={t("cookies.closePanel")}
            className="shrink-0 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5">
          <ul className="border-t border-white/15">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-4 py-4 border-b border-white/15"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-white">
                      {c.label}
                    </span>
                    {c.locked && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
                        {t("cookies.alwaysOn")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-white/60">{c.help}</p>
                </div>
                <Toggle
                  id={c.id}
                  label={c.label}
                  checked={c.checked}
                  disabled={c.locked}
                  onChange={c.onChange}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handleRejectAll}
            className={`${btn} border border-white/30 text-white hover:bg-white/10`}
          >
            {t("cookies.rejectAll")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`${btn} border border-white/30 text-white hover:bg-white/10`}
          >
            {t("cookies.savePreferences")}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className={`${btn} bg-primary text-white hover:bg-primary/85`}
          >
            {t("cookies.acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
