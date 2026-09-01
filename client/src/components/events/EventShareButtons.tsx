/**
 * EventShareButtons
 *
 * Renders the share row that appears in the EventDetail hero. Always
 * shares the *short* URL (`/e/:slug`) — the SEO middleware 301-redirects
 * those to the canonical `/events/:slug`, but the short form is what
 * fits inside a tweet alongside the title + a hashtag.
 *
 * Channels:
 *   - X (Twitter) intent
 *   - LinkedIn share-offsite
 *   - WhatsApp wa.me/?text=…
 *   - Copy link → navigator.clipboard, toast confirms
 *   - Native share (navigator.share) → only rendered when available so
 *     desktop users don't see a button that errors on click
 *
 * Wave 3 hooks: every channel button calls `onShare(channel)` before
 * the actual nav/intent fires so we can wire share-tracking later
 * without re-touching this component.
 */

import { useEffect, useState } from "react";
import {
  Copy,
  Linkedin,
  MessageCircle,
  Share2,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ShareChannel = "twitter" | "linkedin" | "whatsapp" | "copy" | "native";

interface EventShareButtonsProps {
  /** Event slug — used to build the short URL `/e/:slug`. */
  slug: string;
  /** Plain title used as the share-message prefix. */
  title: string;
  /**
   * Site origin override (defaults to window.location.origin in the
   * browser, or "https://techscoop.io" for SSR). Useful for tests.
   */
  origin?: string;
  /** Optional analytics hook; currently a no-op pending Wave 3 wiring. */
  onShare?: (channel: ShareChannel) => void;
  /** Visual size / variant pass-through. */
  size?: "sm" | "default";
  /** Tailwind className passthrough for the wrapping <div>. */
  className?: string;
}

function getDefaultOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://techscoop.io";
}

export default function EventShareButtons({
  slug,
  title,
  origin,
  onShare,
  size = "sm",
  className = "",
}: EventShareButtonsProps) {
  const [hasNativeShare, setHasNativeShare] = useState(false);

  // navigator.share isn't reliably present at SSR. Detect it once on
  // mount so we don't poke the global during render.
  useEffect(() => {
    setHasNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const base = origin || getDefaultOrigin();
  const shortUrl = `${base}/e/${slug}`;
  const shareText = title;

  const intents = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(shortUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shortUrl,
    )}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shortUrl}`)}`,
  };

  const fire = (channel: ShareChannel) => {
    try {
      onShare?.(channel);
    } catch {
      // analytics hooks must never break the actual share action
    }
  };

  const handleIntent = (channel: "twitter" | "linkedin" | "whatsapp") => {
    fire(channel);
    window.open(intents[channel], "_blank", "noopener,noreferrer,width=600,height=480");
  };

  const handleCopy = async () => {
    fire("copy");
    try {
      // Clipboard API requires HTTPS / a user gesture — we're inside
      // a button click so both are satisfied.
      await navigator.clipboard.writeText(shortUrl);
      toast.success("Link copied", {
        description: shortUrl,
        duration: 2000,
      });
    } catch {
      // Fallback for very old browsers / restrictive contexts.
      toast.error("Couldn't copy automatically", { description: shortUrl });
    }
  };

  const handleNative = async () => {
    fire("native");
    try {
      await navigator.share({ title, text: shareText, url: shortUrl });
    } catch (err: any) {
      // AbortError = user cancelled → swallow silently
      if (err?.name !== "AbortError") {
        console.warn("[EventShareButtons] navigator.share failed:", err);
      }
    }
  };

  const btnSize = size === "sm" ? "sm" : "default";

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      aria-label="Share this event"
    >
      <Button
        variant="outline"
        size={btnSize}
        className="gap-1.5"
        onClick={() => handleIntent("twitter")}
        aria-label="Share on X"
      >
        <Twitter className="h-4 w-4" />
        <span className="hidden sm:inline">X</span>
      </Button>
      <Button
        variant="outline"
        size={btnSize}
        className="gap-1.5"
        onClick={() => handleIntent("linkedin")}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
        <span className="hidden sm:inline">LinkedIn</span>
      </Button>
      <Button
        variant="outline"
        size={btnSize}
        className="gap-1.5"
        onClick={() => handleIntent("whatsapp")}
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </Button>
      <Button
        variant="outline"
        size={btnSize}
        className="gap-1.5"
        onClick={handleCopy}
        aria-label="Copy link"
      >
        <Copy className="h-4 w-4" />
        <span className="hidden sm:inline">Copy</span>
      </Button>
      {hasNativeShare && (
        <Button
          variant="outline"
          size={btnSize}
          className="gap-1.5"
          onClick={handleNative}
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Compact share trigger for speaker cards / session rows. Renders a
 * single share icon that opens a dialog with a tweet intent + copy-
 * link. Kept in this file so the EventDetail page only has to import
 * one module. Caller passes a deep-link hash (e.g. "speaker-42").
 */
interface EntityShareTriggerProps {
  eventSlug: string;
  eventTitle: string;
  eventStartDate: string | null | undefined;
  entityName: string;
  entityType: "speaker" | "session";
  hash: string;
  origin?: string;
}

export function buildEntityShareUrl(
  origin: string,
  eventSlug: string,
  hash: string,
): string {
  return `${origin}/e/${eventSlug}#${hash}`;
}

export function buildEntityShareText(
  entityName: string,
  entityType: "speaker" | "session",
  eventTitle: string,
  eventStartDate: string | null | undefined,
): string {
  const dateStr = eventStartDate
    ? new Date(eventStartDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  if (entityType === "speaker") {
    return dateStr
      ? `${entityName} is speaking at ${eventTitle} on ${dateStr}`
      : `${entityName} is speaking at ${eventTitle}`;
  }
  return dateStr
    ? `${entityName} — ${eventTitle} on ${dateStr}`
    : `${entityName} — ${eventTitle}`;
}

export function EntityShareIntents(props: EntityShareTriggerProps) {
  const base = props.origin || getDefaultOrigin();
  const url = buildEntityShareUrl(base, props.eventSlug, props.hash);
  const text = buildEntityShareText(
    props.entityName,
    props.entityType,
    props.eventTitle,
    props.eventStartDate,
  );

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: url, duration: 2000 });
    } catch {
      toast.error("Couldn't copy automatically", { description: url });
    }
  };

  // TODO(wave-3): generate a downloadable "I'm speaking at {event}"
  // share card image. For now we expose the hook + URL so designers
  // can wire a static image template later. The route would land at
  // /events/:slug/speaker/:id/card.png and reuse the SVG composer
  // from eventOgImage.ts.

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      <div className="flex flex-wrap gap-2">
        <a href={twitterHref} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5">
            <Twitter className="h-4 w-4" />
            Tweet
          </Button>
        </a>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copy link
        </Button>
      </div>
      <div className="text-xs text-muted-foreground border-t pt-2 break-all">
        {url}
      </div>
    </div>
  );
}
