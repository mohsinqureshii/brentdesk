import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

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

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
      role="region"
      aria-label="Cookie consent"
    >
      <Card className="pointer-events-auto mx-auto max-w-4xl p-4 sm:p-6 shadow-lg border-border">
        {!customizing ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 text-sm text-foreground">
              <p className="font-medium mb-1">We value your privacy</p>
              <p className="text-muted-foreground">
                We use cookies to make TechScoop work and to understand how you use it. Read our{" "}
                <Link href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
              <Button variant="ghost" size="sm" onClick={handleRejectAll}>
                Reject all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
                Customize
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Accept all
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Cookie preferences</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose which categories of cookies you allow. Essential cookies are always on.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizing(false)}
                aria-label="Close customize panel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                <div className="flex-1">
                  <Label htmlFor="cookie-essential" className="text-sm font-medium">
                    Essential
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for the site to function (authentication, security, preferences).
                  </p>
                </div>
                <Switch id="cookie-essential" checked={true} disabled aria-readonly />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                <div className="flex-1">
                  <Label htmlFor="cookie-analytics" className="text-sm font-medium">
                    Analytics
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Help us understand how visitors use the site so we can improve it.
                  </p>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                <div className="flex-1">
                  <Label htmlFor="cookie-marketing" className="text-sm font-medium">
                    Marketing
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to deliver relevant ads and measure campaign performance.
                  </p>
                </div>
                <Switch
                  id="cookie-marketing"
                  checked={marketing}
                  onCheckedChange={setMarketing}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={handleRejectAll}>
                Reject all
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                Save preferences
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Accept all
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default CookieConsentBanner;
