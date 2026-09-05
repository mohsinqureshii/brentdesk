/**
 * The editorial kit.
 *
 * Every public page is built from these pieces, which is the point: a
 * headline, a kicker and a section rule should be the same object on the
 * home page, a category page and a search result, or the site stops
 * reading as one publication. Layout differences belong to the pages;
 * type, rules and spacing belong here.
 *
 * The visual model is a trade paper. Stories are separated by hairlines
 * and set in columns rather than floated in rounded cards, section heads
 * are uppercase rails carrying the colour of their beat, and the only
 * ornament a link gets is a colour change on hover.
 */

import { Link } from "wouter";
import { ArrowRight, Clock, ImageIcon } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import { getArticleUrl } from "@/lib/articleUrl";
import { useT } from "@/lib/i18n";

// ------------------------------------------------------------------
// Shape of a story as every list endpoint returns it
// ------------------------------------------------------------------

export interface Story {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: Date | string | null;
  /** When the development happened. Preferred for display — see newsDate(). */
  eventDate?: string | null;
  viewCount?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  author?: { name: string } | null;
  categories?: Array<{ name: string; slug: string }>;
}

type Translate = ReturnType<typeof useT>;

/**
 * The date a reader should see.
 *
 * publishedAt records when BrentDesk published the piece and stays
 * truthful; eventDate is when the development actually happened. An
 * archive published in one sitting would otherwise show "2m ago" against
 * every story, including one reporting a December 2025 announcement.
 */
export function newsDate(a: {
  eventDate?: string | null;
  publishedAt?: Date | string | null;
}): Date | string | null | undefined {
  return a.eventDate ?? a.publishedAt;
}

export function formatTimeAgo(t: Translate, date: Date | string | null | undefined): string {
  if (!date) return t("time.recently");
  const then = new Date(date);
  const diffMins = Math.floor((Date.now() - then.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return diffMins <= 1 ? t("time.justNow") : t("time.minutesAgo", { n: diffMins });
  if (diffHours < 24) return t("time.hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
  return fmtDate(then, { month: "short", day: "numeric", year: "numeric" });
}

export function readTime(t: Translate, article: Story): string {
  const words = (article.excerpt?.length ?? 300) / 5 + 400;
  return t("article.minRead", { n: Math.max(1, Math.round(words / 250)) });
}

export function storyKicker(article: Story): string | null {
  return article.categoryName ?? article.categories?.[0]?.name ?? null;
}

/** The beat a story belongs to, as a URL. Bare slug is canonical. */
export function storyCategoryHref(article: Story): string | null {
  const slug = article.categorySlug ?? article.categories?.[0]?.slug ?? null;
  return slug ? `/${slug}` : null;
}

// ------------------------------------------------------------------
// Section head
// ------------------------------------------------------------------

/**
 * The rail above a band of stories.
 *
 * `href` is where "view all" goes, and it is close to mandatory: a
 * section named after a beat that leads nowhere is a dead end on the
 * busiest page of the site. Pages resolve it from the section's own
 * category rather than defaulting everything to /news.
 */
export function SectionHead({
  title,
  accent,
  href,
  compact = false,
  as = "h2",
}: {
  title: string;
  accent?: string | null;
  href?: string | null;
  compact?: boolean;
  as?: "h1" | "h2" | "h3";
}) {
  const t = useT();
  const Heading = as;
  return (
    <div className="bd-section-head" style={{ ["--bd-accent" as string]: accent || undefined }}>
      <Heading className={`bd-section-title flex-1 ${compact ? "text-[0.9375rem]" : ""}`}>
        <span className="truncate">{title}</span>
      </Heading>
      {href && (
        <Link
          href={href}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary hover:underline underline-offset-2"
        >
          {compact ? t("common.all") : t("common.viewAll")}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
        </Link>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Pieces of a story
// ------------------------------------------------------------------

export function Kicker({ article, accent }: { article: Story; accent?: string | null }) {
  const label = storyKicker(article);
  if (!label) return null;
  return (
    <div className="bd-kicker mb-1.5" style={{ ["--bd-accent" as string]: accent || undefined }}>
      {label}
    </div>
  );
}

export function MetaLine({
  article,
  showRead = true,
  className = "",
}: {
  article: Story;
  showRead?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={`bd-meta flex items-center gap-1.5 ${className}`}>
      <span>{formatTimeAgo(t, newsDate(article))}</span>
      {showRead && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> {readTime(t, article)}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Story artwork, when there is any.
 *
 * No article in the archive carries a featured image yet, so this is not
 * an edge case — it is most of the page. Rather than fill the grid with
 * identical empty frames, the shapes below simply leave the art out and
 * let the type carry the card; `Art` is only used where a frame is part
 * of the object itself, like an event tile.
 */
export function Art({
  article,
  className = "",
}: {
  article: Story;
  className?: string;
}) {
  if (!article.featuredImageUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} aria-hidden>
        <ImageIcon className="h-5 w-5 text-muted-foreground/25" />
      </div>
    );
  }
  return (
    <img
      src={article.featuredImageUrl}
      alt=""
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

// ------------------------------------------------------------------
// Story shapes
// ------------------------------------------------------------------

/**
 * A story as a card in a grid.
 *
 * Image-led when the story has art, type-led when it does not: a rule
 * across the top, the kicker under it and the headline given the room
 * the missing picture would have taken. Both shapes occupy the same
 * column, so a grid holds its lines whichever stories land in it.
 */
export function StoryCard({
  article,
  accent,
  size = "md",
  showExcerpt = false,
  className = "",
}: {
  article: Story;
  accent?: string | null;
  size?: "sm" | "md" | "lg";
  showExcerpt?: boolean;
  className?: string;
}) {
  const hasArt = !!article.featuredImageUrl;
  const headline =
    size === "lg"
      ? hasArt
        ? "text-[1.375rem] lg:text-[1.625rem]"
        : "text-[1.5rem] lg:text-[1.875rem]"
      : size === "sm"
        ? "text-[0.8125rem]"
        : hasArt
          ? "text-[0.9375rem]"
          : "text-[1.0625rem]";
  // Without art the excerpt is the card's body, not an optional extra.
  const withExcerpt = showExcerpt || (!hasArt && size !== "sm");

  return (
    <article className={`group flex flex-col ${className}`}>
      {hasArt && (
        <Link href={getArticleUrl(article)} className="block overflow-hidden bg-muted">
          <Art
            article={article}
            className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
      )}
      <div className={`flex flex-col flex-1 ${hasArt ? "pt-3" : "border-t-2 border-foreground/85 pt-3"}`}>
        <Kicker article={article} accent={accent} />
        <Link href={getArticleUrl(article)}>
          <h3 className={`bd-headline text-foreground line-clamp-4 ${headline}`}>{article.title}</h3>
        </Link>
        {withExcerpt && article.excerpt && (
          <p
            className={`mt-2 leading-relaxed text-muted-foreground ${
              size === "lg" ? "text-[0.9375rem] line-clamp-4" : "text-[0.8125rem] line-clamp-3"
            }`}
          >
            {article.excerpt}
          </p>
        )}
        <MetaLine article={article} className="mt-2.5" showRead={size !== "sm"} />
      </div>
    </article>
  );
}

/**
 * Text row with a small thumbnail — the shape that fills rails and the
 * second column of a band. `hairline` is off when the parent is already
 * a .bd-list, which draws the dividers itself.
 */
export function StoryRow({
  article,
  accent,
  compact = false,
  showArt = true,
  className = "",
}: {
  article: Story;
  accent?: string | null;
  compact?: boolean;
  showArt?: boolean;
  className?: string;
}) {
  return (
    <article className={`group ${className}`}>
      <Link href={getArticleUrl(article)} className="flex gap-3 py-3">
        <div className="min-w-0 flex-1">
          <Kicker article={article} accent={accent} />
          <h3
            className={`bd-headline text-foreground line-clamp-3 ${
              compact ? "text-[0.8125rem]" : "text-[0.9375rem]"
            }`}
          >
            {article.title}
          </h3>
          <MetaLine article={article} className="mt-1.5" showRead={!compact} />
        </div>
        {showArt && article.featuredImageUrl && (
          <Art article={article} className={compact ? "h-12 w-12 shrink-0" : "h-16 w-24 shrink-0"} />
        )}
      </Link>
    </article>
  );
}

/** Headline only, no art — the densest shape, for "in brief" and rails. */
export function HeadlineRow({
  article,
  showTime = true,
  className = "",
}: {
  article: Story;
  showTime?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={`py-2.5 ${className}`}>
      <Link href={getArticleUrl(article)} className="group block">
        <h3 className="bd-headline text-[0.8125rem] text-foreground line-clamp-3">{article.title}</h3>
      </Link>
      {showTime && <div className="bd-meta mt-1">{formatTimeAgo(t, newsDate(article))}</div>}
    </div>
  );
}

/** Numbered list — most read, editor's picks. */
export function RankedList({ articles }: { articles: Story[] }) {
  const t = useT();
  return (
    <ol className="bd-list">
      {articles.map((a, i) => (
        <li key={a.id} className="flex gap-3 py-3">
          <span className="bd-display text-[0.9375rem] font-bold text-primary/45 w-5 shrink-0 tabular-nums pt-px">
            {i + 1}
          </span>
          <div className="min-w-0">
            <Link href={getArticleUrl(a)} className="group">
              <h3 className="bd-headline text-[0.8125rem] text-foreground line-clamp-3">{a.title}</h3>
            </Link>
            <div className="bd-meta mt-1">{formatTimeAgo(t, newsDate(a))}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A rail block: uppercase title over a hairline, then content. */
export function RailBlock({
  title,
  href,
  children,
  accent,
}: {
  title: string;
  href?: string | null;
  children: React.ReactNode;
  accent?: string | null;
}) {
  const t = useT();
  return (
    <section className="bd-card p-4">
      <div
        className="flex items-baseline justify-between gap-2 border-b border-foreground/85 pb-2 mb-1"
        style={{ ["--bd-accent" as string]: accent || undefined }}
      >
        <h2 className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-foreground truncate">
          {title}
        </h2>
        {href && (
          <Link href={href} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-primary hover:underline">
            {t("common.all")}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
