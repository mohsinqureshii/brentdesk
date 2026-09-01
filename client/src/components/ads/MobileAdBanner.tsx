import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AdBannerProps {
  slot: "top" | "inline" | "sticky-bottom" | "interstitial" | "native-feed";
  className?: string;
}

// Placeholder ad component - replace with actual ad network (Google AdSense, etc.)
// This shows the ad placement structure for monetization
export function MobileAdBanner({ slot, className = "" }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay showing ads for better UX
    const timer = setTimeout(() => setVisible(true), slot === "sticky-bottom" ? 3000 : 500);
    return () => clearTimeout(timer);
  }, [slot]);

  if (dismissed || !visible) return null;

  const slotConfig = {
    "top": {
      height: "h-[50px]",
      label: "Ad",
      container: "w-full bg-muted/30 border-b border-border",
    },
    "inline": {
      height: "h-[250px]",
      label: "Advertisement",
      container: "w-full my-4 bg-muted/20 rounded-lg border border-border overflow-hidden",
    },
    "sticky-bottom": {
      height: "h-[50px]",
      label: "Ad",
      container: "fixed bottom-14 left-0 right-0 z-30 bg-background border-t border-border md:hidden",
    },
    "interstitial": {
      height: "h-[300px]",
      label: "Sponsored",
      container: "w-full my-6 bg-muted/10 rounded-xl border border-border overflow-hidden",
    },
    "native-feed": {
      height: "min-h-[120px]",
      label: "Sponsored",
      container: "w-full bg-card rounded-xl border border-border overflow-hidden",
    }
  };

  const config = slotConfig[slot];

  return (
    <div className={`${config.container} ${className}`}>
      <div className={`relative flex flex-col items-center justify-center ${config.height} px-4`}>
        {/* Ad label */}
        <div className="absolute top-1 left-2 flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium px-1 py-0.5 bg-muted/50 rounded">
            {config.label}
          </span>
        </div>
        
        {/* Dismiss button for sticky and interstitial */}
        {(slot === "sticky-bottom" || slot === "interstitial") && (
          <button 
            onClick={() => setDismissed(true)}
            className="absolute top-1 right-2 p-0.5 rounded-full hover:bg-muted/50"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        {/* Ad placeholder content - replace with actual ad tag */}
        <div 
          className="w-full h-full flex items-center justify-center"
          data-ad-slot={slot}
          data-ad-format={slot === "inline" ? "rectangle" : slot === "sticky-bottom" ? "banner" : "auto"}
        >
          {/* 
            Integration point for ad networks:
            - Google AdSense: <ins class="adsbygoogle" data-ad-client="ca-pub-XXX" data-ad-slot="XXX" />
            - Google Ad Manager: <div id="div-gpt-ad-XXX" />
            - Carbon Ads: <script async src="//cdn.carbonads.com/carbon.js?serve=XXX" />
          */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/50">Ad Space ({slot})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Native ad card for feed integration (Bloomberg-style)
export function NativeAdCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden ${className}`}>
      <div className="p-3">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium px-1.5 py-0.5 bg-muted/50 rounded">
            Sponsored
          </span>
        </div>
        {/* Placeholder for native ad content */}
        <div 
          className="min-h-[80px] flex items-center justify-center"
          data-ad-slot="native-feed"
          data-ad-format="native"
        >
          <p className="text-xs text-muted-foreground/50">Native Ad Placement</p>
        </div>
      </div>
    </div>
  );
}
