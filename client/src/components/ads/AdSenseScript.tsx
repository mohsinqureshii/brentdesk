/**
 * The AdSense gate.
 *
 * The library itself is loaded from index.html, because that is what
 * Google's onboarding checks for and what Auto ads needs on every page.
 * What index.html cannot know is whether this particular reader has
 * agreed to advertising, or whether the desk has actually switched
 * AdSense on — so it loads the library with `pauseAdRequests = 1` and
 * Consent Mode set to denied, and nothing is requested until this
 * component lifts both.
 *
 * Two conditions, both required:
 *
 *   The desk has enabled AdSense and has not thrown the kill switch.
 *   Read from /api/adsense-config, which is the database.
 *
 *   The reader has consented to advertising cookies. Our cookie policy
 *   says advertising cookies are off until they are switched on, and a
 *   policy that says that while the tag fills the page with them is
 *   worse than having no policy. Consent Mode carries the answer to
 *   Google either way, so a reader who declines still sees the site,
 *   just without personalised advertising or ad cookies.
 *
 * It listens for a change of mind: accepting from the banner un-pauses
 * without a reload, and withdrawing consent re-pauses and tells Google.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getCookieConsent } from "@/components/CookieConsentBanner";

interface AdsenseConfig {
  publisherId: string | null;
  autoAdsEnabled: boolean;
  adsenseEnabled: boolean;
  globalKillSwitch: boolean;
}

const CONSENT_EVENT = "ts:cookie-consent-changed";

/** Tell Google what this reader allows. Safe before the tag has loaded —
 *  the command queue is created in index.html. */
function updateConsent(granted: boolean): void {
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  const value = granted ? "granted" : "denied";
  gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

function setPaused(paused: boolean): void {
  const queue = ((window as any).adsbygoogle = (window as any).adsbygoogle || []);
  queue.pauseAdRequests = paused ? 1 : 0;
}

export function AdSenseScript() {
  const [config, setConfig] = useState<AdsenseConfig | null>(null);
  const consentRef = useRef<boolean>(false);

  const apply = useCallback((cfg: AdsenseConfig | null, marketing: boolean) => {
    const deskAllows =
      !!cfg && cfg.adsenseEnabled && !cfg.globalKillSwitch && !!cfg.publisherId;
    updateConsent(marketing);
    // Paused unless BOTH are true. The default in index.html is paused,
    // so a failure anywhere in here leaves ads off rather than on.
    setPaused(!(deskAllows && marketing));
  }, []);

  useEffect(() => {
    let cancelled = false;
    consentRef.current = !!getCookieConsent()?.marketing;

    // A failure here must never take a page down with it: no ads is a
    // revenue problem, a thrown error is an outage.
    fetch("/api/adsense-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: AdsenseConfig | null) => {
        if (cancelled) return;
        setConfig(cfg);
        apply(cfg, consentRef.current);
      })
      .catch(() => {
        /* no ad account reachable — the page is unaffected, ads stay paused */
      });

    return () => {
      cancelled = true;
    };
  }, [apply]);

  // The reader changing their mind takes effect immediately, in both
  // directions, without a reload.
  useEffect(() => {
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { marketing?: boolean } | undefined;
      consentRef.current = !!detail?.marketing;
      apply(config, consentRef.current);
    };
    window.addEventListener(CONSENT_EVENT, onConsent as EventListener);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent as EventListener);
  }, [apply, config]);

  return null;
}
