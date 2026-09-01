/**
 * AdUnit — Production-ready ad component
 * 
 * Rendering priority: Direct Campaign → House Ad → Google AdSense → Empty (hidden)
 * Features:
 * - IAB-compliant viewability tracking (IntersectionObserver: 50%+ visible for 1s+)
 * - Impression & click tracking via tRPC
 * - Lazy loading (only loads when near viewport)
 * - Google AdSense integration with pub-ID from DB
 * - Responsive sizing with standard IAB dimensions
 * - "Advertisement" label per IAB/Google policy
 * - Ad blocker detection with polite messaging
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";

// Standard IAB ad sizes
const AD_SIZES: Record<string, { width: number; height: number }> = {
  "728x90": { width: 728, height: 90 },
  "300x250": { width: 300, height: 250 },
  "300x600": { width: 300, height: 600 },
  "320x50": { width: 320, height: 50 },
  "160x600": { width: 160, height: 600 },
  "970x250": { width: 970, height: 250 },
  "336x280": { width: 336, height: 280 },
};

// Session ID for frequency capping
function getSessionId(): string {
  let sid = sessionStorage.getItem("ts_ad_session");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("ts_ad_session", sid);
  }
  return sid;
}

interface AdUnitProps {
  /** The slot key matching a database ad_slot record */
  slotKey: string;
  /** Visual variant for layout */
  variant?: "sidebar" | "leaderboard" | "in-content" | "footer" | "mobile-sticky";
  /** Optional CSS class override */
  className?: string;
  /** Whether to lazy load (default: true) */
  lazy?: boolean;
  /** Page category for targeting */
  category?: string;
}

export function AdUnit({
  slotKey,
  variant = "sidebar",
  className = "",
  lazy = true,
  category,
}: AdUnitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);

  const sessionId = useMemo(() => getSessionId(), []);

  // Lazy loading: observe when container enters viewport
  useEffect(() => {
    if (!lazy || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Fetch ad data from backend
  const { data: adData, isLoading } = trpc.admin.advertising.getAdForSlotV2.useQuery(
    {
      slotKey,
      pageUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
      category,
      sessionId,
    },
    { enabled: isVisible, staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Track impression mutation
  const trackImpressionMut = trpc.admin.advertising.trackImpression.useMutation();
  const trackClickMut = trpc.admin.advertising.trackClick.useMutation();

  // Viewability tracking (IAB standard: 50% visible for 1+ second)
  useEffect(() => {
    if (!containerRef.current || !adData || adData.type === "empty" || adData.type === "adsense") return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!viewStartTime) setViewStartTime(Date.now());
        } else {
          setViewStartTime(null);
        }
      },
      { threshold: [0.5] }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [adData, viewStartTime]);

  // Fire impression after 1 second of viewability
  useEffect(() => {
    if (!viewStartTime || impressionTracked || !adData || adData.type === "empty" || adData.type === "adsense") return;
    const timer = setTimeout(() => {
      if (adData.type === "direct" || adData.type === "house") {
        trackImpressionMut.mutate({
          campaignId: adData.campaignId,
          creativeId: adData.creativeId,
          slotId: adData.slotId,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
        });
        setImpressionTracked(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [viewStartTime, impressionTracked, adData]);

  // Handle ad click
  const handleAdClick = useCallback(() => {
    if (!adData || adData.type === "empty" || adData.type === "adsense") return;
    if (adData.type === "direct" || adData.type === "house") {
      trackClickMut.mutate({
        campaignId: adData.campaignId,
        creativeId: adData.creativeId,
        slotId: adData.slotId,
        pageUrl: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    }
  }, [adData]);

  // Detect ad blockers
  useEffect(() => {
    const testAd = document.createElement("div");
    testAd.innerHTML = "&nbsp;";
    testAd.className = "adsbox";
    testAd.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
    document.body.appendChild(testAd);
    requestAnimationFrame(() => {
      if (testAd.offsetHeight === 0) {
        setAdBlockerDetected(true);
      }
      document.body.removeChild(testAd);
    });
  }, []);

  // Determine dimensions from variant
  const getDimensions = () => {
    if (adData && "dimensions" in adData && adData.dimensions) {
      const size = AD_SIZES[adData.dimensions];
      if (size) return size;
    }
    switch (variant) {
      case "leaderboard": return { width: 728, height: 90 };
      case "footer": return { width: 728, height: 90 };
      case "in-content": return { width: 728, height: 90 };
      case "mobile-sticky": return { width: 320, height: 50 };
      case "sidebar":
      default: return { width: 300, height: 250 };
    }
  };

  const dims = getDimensions();

  // Container classes based on variant
  const variantClasses = {
    sidebar: "w-full max-w-[300px]",
    leaderboard: "w-full max-w-[728px] mx-auto",
    "in-content": "w-full max-w-[728px] mx-auto my-6",
    footer: "w-full max-w-[728px] mx-auto",
    "mobile-sticky": "fixed bottom-0 left-0 right-0 z-50 flex justify-center md:hidden",
  };

  // Don't render anything while loading or when empty
  if (isLoading || !adData || (adData?.type === "empty" && !adBlockerDetected)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`${variantClasses[variant]} ${className}`}
      data-ad-slot={slotKey}
      data-ad-variant={variant}
    >
      {/* Advertisement label (IAB/Google policy) */}
      <div className="flex items-center justify-center mb-0.5">
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium">
          Advertisement
        </span>
      </div>

      {/* Loading state */}
      {(isLoading || !isVisible) && (
        <div
          className="bg-muted/20 rounded animate-pulse"
          style={{ width: "100%", maxWidth: dims.width, height: dims.height }}
        />
      )}

      {/* Direct or House Ad */}
      {adData && (adData.type === "direct" || adData.type === "house") && (
        <a
          href={adData.clickUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleAdClick}
          className="block rounded overflow-hidden transition-opacity hover:opacity-90"
          style={{ maxWidth: dims.width }}
        >
          {adData.format === "banner" && adData.fileUrl && (
            <img
              src={adData.fileUrl}
              alt={adData.nativeHeadline || "Advertisement"}
              width={dims.width}
              height={dims.height}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          )}
          {adData.format === "native" && (
            <div className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
              {adData.fileUrl && (
                <img
                  src={adData.fileUrl}
                  alt={adData.nativeHeadline || ""}
                  className="w-full h-32 object-cover rounded mb-2"
                  loading="lazy"
                />
              )}
              {adData.nativeHeadline && (
                <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                  {adData.nativeHeadline}
                </p>
              )}
              {adData.nativeDescription && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {adData.nativeDescription}
                </p>
              )}
              {adData.nativeCta && (
                <span className="inline-block mt-2 text-xs font-medium text-primary">
                  {adData.nativeCta} →
                </span>
              )}
            </div>
          )}
          {adData.format === "text" && (
            <div className="bg-card border border-border rounded-lg p-3">
              {adData.nativeHeadline && (
                <p className="text-sm font-semibold text-primary mb-1">{adData.nativeHeadline}</p>
              )}
              {adData.nativeDescription && (
                <p className="text-xs text-muted-foreground">{adData.nativeDescription}</p>
              )}
            </div>
          )}
        </a>
      )}

      {/* Google AdSense */}
      {adData?.type === "adsense" && !adBlockerDetected && (
        <AdSenseUnit
          publisherId={adData.publisherId}
          slotId={adData.adsenseSlotId}
          width={dims.width}
          height={dims.height}
          variant={variant}
        />
      )}

      {/* Ad blocker detected - polite message */}
      {adBlockerDetected && adData?.type !== "direct" && adData?.type !== "house" && (
        <div
          className="bg-muted/30 border border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-center p-4"
          style={{ maxWidth: dims.width, minHeight: Math.min(dims.height, 120) }}
        >
          <div>
            <p className="text-xs text-muted-foreground/70 mb-1">
              Support independent journalism
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              Consider disabling your ad blocker for {publication.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Google AdSense Unit Renderer
 * Loads the AdSense script once and renders an ad unit
 */
// Global promise to ensure AdSense script loads only once
let adsenseLoadPromise: Promise<void> | null = null;

function loadAdsenseScript(publisherId: string): Promise<void> {
  if (adsenseLoadPromise) return adsenseLoadPromise;
  
  // If script already exists and adsbygoogle is available, resolve immediately
  if (document.querySelector('script[src*="adsbygoogle"]') && (window as any).adsbygoogle) {
    adsenseLoadPromise = Promise.resolve();
    return adsenseLoadPromise;
  }

  adsenseLoadPromise = new Promise((resolve) => {
    // If script tag exists but adsbygoogle not yet ready, wait for it
    if (document.querySelector('script[src*="adsbygoogle"]')) {
      const checkReady = setInterval(() => {
        if ((window as any).adsbygoogle) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(checkReady); resolve(); }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-overlays', 'false');
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('[AdUnit] AdSense script failed to load');
      resolve(); // Resolve anyway so ads don't block forever
    };
    document.head.appendChild(script);
  });

  return adsenseLoadPromise;
}

function AdSenseUnit({
  publisherId,
  slotId,
  width,
  height,
  variant,
}: {
  publisherId: string;
  slotId?: string | null;
  width: number;
  height: number;
  variant: string;
}) {
  const adRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [filled, setFilled] = useState<boolean | null>(null);
  const pushedRef = useRef(false);

  // Load AdSense script once globally using the shared promise
  useEffect(() => {
    loadAdsenseScript(publisherId).then(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publisherId]);

  // Overlay/vignette blocker - set up once globally
  useEffect(() => {
    if ((window as any).__tsOverlayBlocker) return;
    (window as any).__tsOverlayBlocker = true;

    const isAutoAdOverlay = (el: HTMLElement): boolean => {
      const cs = window.getComputedStyle(el);
      const isFixed = cs.position === 'fixed';
      const hasHighZIndex = parseInt(cs.zIndex) > 999;
      if (!isFixed || !hasHighZIndex) return false;
      const hasGoogleIframe = !!(
        el.querySelector('iframe[src*="googlesyndication"]') ||
        el.querySelector('iframe[src*="doubleclick"]') ||
        el.querySelector('iframe[id*="aswift"]')
      );
      if (hasGoogleIframe) return true;
      if (el.classList.contains('google-auto-placed')) return true;
      return false;
    };

    const removeOverlayAd = (el: HTMLElement) => {
      el.style.display = 'none';
      try { el.remove(); } catch (e) { /* ignore */ }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && isAutoAdOverlay(node)) removeOverlayAd(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, []);

  // Push ad when script is loaded - use pushedRef to prevent double-push
  useEffect(() => {
    if (!loaded || !adRef.current || pushedRef.current) return;
    pushedRef.current = true;
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    } catch (e) {
      console.warn("[AdUnit] AdSense push failed:", e);
    }
    // Check if ad was filled after a delay
    const checkFill = setTimeout(() => {
      const ins = adRef.current?.querySelector('ins.adsbygoogle');
      if (ins) {
        const status = ins.getAttribute('data-ad-status');
        setFilled(status !== 'unfilled');
      } else {
        setFilled(false);
      }
    }, 3000);
    return () => clearTimeout(checkFill);
  }, [loaded]);

  const isResponsive = variant === "leaderboard" || variant === "in-content" || variant === "footer";

  // Hide completely if ad was not filled
  if (filled === false) return null;

  return (
    <div ref={adRef} className="flex justify-center" style={{ minHeight: filled === null ? undefined : 0 }}>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: isResponsive ? "100%" : width,
          height: isResponsive ? "auto" : height,
          maxWidth: width,
          overflow: "hidden",
        }}
        data-ad-client={`ca-${publisherId}`}
        data-ad-slot={slotId || ""}
        // "fixed" is not a valid data-ad-format value — omit the
        // attribute entirely for fixed-size units per AdSense docs.
        {...(isResponsive
          ? { "data-ad-format": "auto", "data-full-width-responsive": "true" }
          : {})}
      />
    </div>
  );
}

/**
 * Convenience wrapper for common ad placements
 */
export function LeaderboardAd({ slotKey, className, category }: { slotKey: string; className?: string; category?: string }) {
  return <AdUnit slotKey={slotKey} variant="leaderboard" className={className} category={category} />;
}

export function SidebarAd({ slotKey, className, category }: { slotKey: string; className?: string; category?: string }) {
  return <AdUnit slotKey={slotKey} variant="sidebar" className={className} category={category} />;
}

export function InContentAd({ slotKey, className, category }: { slotKey: string; className?: string; category?: string }) {
  return <AdUnit slotKey={slotKey} variant="in-content" className={className} category={category} />;
}

export function FooterAd({ slotKey, className }: { slotKey: string; className?: string }) {
  return <AdUnit slotKey={slotKey} variant="footer" className={className} />;
}

export function MobileStickyAd({ slotKey }: { slotKey: string }) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <>
      {/* Spacer to prevent content from being hidden behind sticky ad */}
      <div className="h-16 md:hidden" />
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-6 right-2 bg-background/90 border border-border rounded-t-md px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close ad"
        >
          ✕
        </button>
        <div className="flex justify-center py-1">
          <AdUnit slotKey={slotKey} variant="mobile-sticky" lazy={false} />
        </div>
      </div>
    </>
  );
}
