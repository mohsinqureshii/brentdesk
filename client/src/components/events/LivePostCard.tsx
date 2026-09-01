/**
 * LivePostCard — one update in an event's live-coverage feed.
 *
 * Shared between the public live page (/events/:slug/live) and the
 * single-post permalink (/events/:slug/live/:postId). Renders a
 * type-specific body (breaking / funding / quote / photo / video /
 * session / sponsor / update) inside a common shell that carries the
 * relative timestamp, author chip, pin styling, and a copy-permalink
 * share button.
 */

import {
  Calendar,
  DollarSign,
  ExternalLink,
  Pin,
  Quote,
  Share2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/eventLive";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type LivePostType =
  | "update"
  | "quote"
  | "funding"
  | "session"
  | "sponsor"
  | "photo"
  | "video"
  | "breaking";

export interface LivePost {
  id: number;
  eventId: number;
  authorId: number;
  authorName?: string | null;
  headline: string | null;
  body: string;
  imageUrl: string | null;
  embedUrl: string | null;
  postType: LivePostType | string;
  speakerName: string | null;
  companyName: string | null;
  fundingAmount: string | null;
  publishedAt: string;
  isPinned: number;
}

// ----------------------------------------------------------------
// Tiny helpers
// ----------------------------------------------------------------

/**
 * Minimal sanitiser for correspondent-authored bodies: strips <script>
 * blocks (and stray script tags), inline on* handlers, and javascript:
 * URLs. The body is trusted-ish (staff-only composer) — this is a
 * belt-and-braces guard, not a full sanitiser.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?script\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      if (m) return m[1];
    }
  } catch {
    /* malformed URL */
  }
  return null;
}

function isTwitterStatus(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return (
      (host === "twitter.com" || host === "x.com") &&
      /\/status(?:es)?\/\d+/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------
// Sub-parts
// ----------------------------------------------------------------

/** Body markup — may contain simple inline HTML from the composer. */
function PostBody({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  if (!html || !stripTags(html)) return null;
  return (
    <div
      className={`prose prose-sm prose-neutral dark:prose-invert max-w-none break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

/** Link card for tweets and other non-embeddable video/embed URLs. */
function LinkCard({ url, label }: { url: string; label: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-muted/30 hover:bg-muted px-4 py-3 transition group"
    >
      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate">{label}</span>
        <span className="block text-xs text-muted-foreground truncate">{host}</span>
      </span>
    </a>
  );
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const ytId = youTubeId(url);
  if (ytId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }
  if (isTwitterStatus(url)) {
    return <LinkCard url={url} label="View post on X" />;
  }
  return <LinkCard url={url} label="Watch video" />;
}

// ----------------------------------------------------------------
// Card
// ----------------------------------------------------------------

export default function LivePostCard({
  post,
  eventSlug,
  large = false,
}: {
  post: LivePost;
  eventSlug: string;
  /** Permalink page renders the card slightly bigger. */
  large?: boolean;
}) {
  const type = (post.postType || "update") as LivePostType;
  const pinned = !!post.isPinned;

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${eventSlug}/live/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Could not copy link");
    }
  };

  const accent =
    type === "breaking"
      ? "border-l-4 border-l-red-500"
      : type === "funding"
      ? "border-l-4 border-l-emerald-500"
      : type === "quote"
      ? "border-l-4 border-l-blue-500"
      : "";

  const fullDate = new Date(post.publishedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card
      id={`live-post-${post.id}`}
      className={`scroll-mt-40 overflow-hidden ${accent} ${
        pinned ? "ring-1 ring-amber-400/70" : ""
      }`}
    >
      <CardContent className={large ? "p-6" : "p-4"}>
        {/* Meta row: pin / type badge · timestamp · share */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {pinned && (
            <span
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
              title="Pinned key moment"
            >
              <Pin className="h-3.5 w-3.5" />
            </span>
          )}
          {type === "breaking" ? (
            <Badge className="bg-red-600 text-white border-transparent gap-1 px-2 py-0 text-[10px] tracking-wider">
              <Zap className="h-3 w-3" /> BREAKING
            </Badge>
          ) : type === "session" ? (
            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider">
              <Calendar className="h-3 w-3" /> Session
            </span>
          ) : type === "sponsor" ? (
            <span className="uppercase tracking-wider text-[10px] border rounded-full px-2 py-0.5">
              Sponsored
            </span>
          ) : (
            <span className="uppercase tracking-wider text-[10px]">{type}</span>
          )}
          <time
            className="ml-auto shrink-0"
            dateTime={post.publishedAt}
            title={fullDate}
          >
            {timeAgo(post.publishedAt)}
          </time>
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 p-1 -m-1 hover:text-primary transition"
            aria-label="Copy link to this update"
            title="Copy link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Type-specific body */}
        {type === "breaking" && (
          <div>
            {post.headline && (
              <h3 className={`font-bold leading-tight ${large ? "text-2xl" : "text-lg"}`}>
                {post.headline}
              </h3>
            )}
            <PostBody html={post.body} className="mt-1.5" />
          </div>
        )}

        {type === "funding" && (
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
                Funding announced
              </div>
              <div className={`font-bold leading-tight ${large ? "text-2xl" : "text-lg"}`}>
                {post.companyName || post.headline || "New deal"}
                {post.fundingAmount ? ` raises ${post.fundingAmount}` : ""}
              </div>
              {post.headline && post.companyName && (
                <div className="text-sm font-medium mt-0.5">{post.headline}</div>
              )}
              <PostBody html={post.body} className="mt-1.5" />
            </div>
          </div>
        )}

        {type === "quote" && (
          <figure>
            <Quote className="h-5 w-5 text-blue-500 mb-2" aria-hidden="true" />
            <blockquote
              className={`italic leading-snug font-medium ${large ? "text-2xl" : "text-xl"}`}
            >
              {stripTags(post.body)}
            </blockquote>
            {post.speakerName && (
              <figcaption className="text-sm text-muted-foreground mt-3">
                — {post.speakerName}
                {post.companyName ? `, ${post.companyName}` : ""}
              </figcaption>
            )}
          </figure>
        )}

        {type === "photo" && (
          <div>
            {post.headline && (
              <h3 className="font-semibold leading-tight mb-2">{post.headline}</h3>
            )}
            {post.imageUrl && (
              <a
                href={post.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open full image"
                className="block"
              >
                <img
                  src={post.imageUrl}
                  alt={post.headline || stripTags(post.body).slice(0, 80) || "Live photo"}
                  className={`w-full rounded-lg object-cover cursor-zoom-in ${
                    large ? "max-h-[36rem]" : "max-h-96"
                  }`}
                  loading="lazy"
                />
              </a>
            )}
            <PostBody
              html={post.body}
              className="mt-2 text-sm text-muted-foreground"
            />
          </div>
        )}

        {type === "video" && (
          <div>
            {post.headline && (
              <h3 className="font-semibold leading-tight mb-2">{post.headline}</h3>
            )}
            {post.embedUrl && (
              <VideoEmbed url={post.embedUrl} title={post.headline || "Live video"} />
            )}
            <PostBody html={post.body} className="mt-2" />
          </div>
        )}

        {(type === "session" || type === "update" || type === "sponsor") && (
          <div>
            {post.headline && (
              <h3 className={`font-semibold leading-tight ${large ? "text-xl" : ""}`}>
                {post.headline}
              </h3>
            )}
            <PostBody html={post.body} className={post.headline ? "mt-1.5" : ""} />
            {post.imageUrl && (
              <a
                href={post.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3"
                title="Open full image"
              >
                <img
                  src={post.imageUrl}
                  alt={post.headline || "Update image"}
                  className="w-full rounded-lg object-cover max-h-80 cursor-zoom-in"
                  loading="lazy"
                />
              </a>
            )}
            {post.embedUrl && (
              <div className="mt-3">
                <LinkCard url={post.embedUrl} label={post.headline || "Related link"} />
              </div>
            )}
          </div>
        )}

        {/* Author chip */}
        {post.authorName && (
          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
              {post.authorName.slice(0, 1)}
            </span>
            by {post.authorName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
