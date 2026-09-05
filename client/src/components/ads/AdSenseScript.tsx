/**
 * Site-wide AdSense loader for Auto Ads.
 *
 * Two different things load the AdSense library. A slot rendered by
 * <AdUnit> loads it on demand for that unit; Auto Ads — where Google
 * decides placement itself — needs the tag present on the page whether or
 * not a manual slot is in view. That is what this mounts.
 *
 * Everything is off until an operator turns it on in
 * Admin → Advertising → AdSense, so a site with no ad account ships no
 * third-party script at all. The kill switch beats both.
 */

import { useEffect } from "react";

interface AdsenseConfig {
  publisherId: string | null;
  autoAdsEnabled: boolean;
  adsenseEnabled: boolean;
  globalKillSwitch: boolean;
}

const SCRIPT_ID = "adsbygoogle-auto";

export function AdSenseScript() {
  useEffect(() => {
    let cancelled = false;

    // A failure here must never take a page down with it: no ads is a
    // revenue problem, a thrown error is an outage.
    fetch("/api/adsense-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((config: AdsenseConfig | null) => {
        if (cancelled || !config) return;
        if (config.globalKillSwitch || !config.autoAdsEnabled) return;
        if (!config.adsenseEnabled || !config.publisherId) return;
        if (document.getElementById(SCRIPT_ID)) return;

        const client = config.publisherId.startsWith("ca-")
          ? config.publisherId
          : `ca-${config.publisherId}`;
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
        document.head.appendChild(script);
      })
      .catch(() => {
        /* no ad account reachable — the page is unaffected */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
