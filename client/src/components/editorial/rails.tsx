/**
 * The rail.
 *
 * A trade paper's right-hand column is not a leftover: it is where a
 * reader who did not come for the lead story finds a reason to stay. Ours
 * was three blocks long on a page five screens tall, and the moment the
 * house ads stopped filling the slots between them the column simply
 * stopped halfway down and left white paper under it.
 *
 * So the rail is built here, once, as a stack of modules rather than as
 * ad hoc JSX on each page. Two rules make it work:
 *
 *   1. A module that has nothing to say renders nothing. No "no jobs
 *      yet" panels, no empty frames.
 *   2. The stack always contains modules that cannot be empty — the
 *      beats, the topics, the newsletter, the latest headlines. A site
 *      with articles in it has all four, so the rail has a floor.
 *
 * Pages choose the order and which extras to include; `Rail` only sets
 * the spacing and the landmark.
 */

import type { ReactNode } from "react";
import { Link } from "wouter";
import { Briefcase, Building2 } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { publication } from "@shared/publication";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import {
  HeadlineRow,
  RailBlock,
  RankedList,
  type Story,
} from "@/components/editorial";

// ------------------------------------------------------------------
// Container
// ------------------------------------------------------------------

export function Rail({ children, className = "" }: { children: ReactNode; className?: string }) {
  const t = useT();
  return (
    <aside className={`space-y-6 min-w-0 ${className}`} aria-label={t("list.sidebar")}>
      {children}
    </aside>
  );
}

// ------------------------------------------------------------------
// Modules built on the archive — these have material as long as the
// site has articles, which is what keeps the rail from running out.
// ------------------------------------------------------------------

/**
 * Most read.
 *
 * View counts are near zero on a young archive, and getMostRead returns
 * an empty list rather than pretending. Rather than drop the block, fall
 * back to the newest stories: a reader looking for "what is everyone
 * reading" is served better by real recent headlines than by a gap.
 */
export function MostReadRail({
  title,
  accent,
  limit = 5,
}: {
  title?: string;
  accent?: string | null;
  limit?: number;
}) {
  const t = useT();
  const { data: mostRead } = trpc.news.getMostRead.useQuery({ limit, days: 30 });
  const { data: fallback } = trpc.news.list.useQuery(
    { limit, status: "published", sortBy: "publishedAt", sortOrder: "desc" },
    { enabled: Array.isArray(mostRead) && mostRead.length === 0 },
  );
  const items = (mostRead?.length ? mostRead : (fallback?.items ?? [])) as Story[];
  if (!items.length) return null;
  return (
    <RailBlock title={title || t("list.mostRead")} accent={accent}>
      <RankedList articles={items.slice(0, limit)} />
    </RailBlock>
  );
}

/**
 * The wire — the newest stories, whatever beat they came off.
 *
 * `exclude` keeps the article you are reading out of its own rail.
 */
export function LatestRail({
  limit = 6,
  exclude,
  categoryId,
  title,
}: {
  limit?: number;
  exclude?: number;
  categoryId?: number;
  title?: string;
}) {
  const t = useT();
  const { data } = trpc.news.list.useQuery({
    limit: limit + 1,
    status: "published",
    sortBy: "publishedAt",
    sortOrder: "desc",
    ...(categoryId ? { categoryId } : {}),
  });
  const items = ((data?.items ?? []) as Story[]).filter((a) => a.id !== exclude).slice(0, limit);
  if (!items.length) return null;
  return (
    <RailBlock title={title || t("list.latestNews")} href="/news">
      <div className="bd-list">
        {items.map((a) => (
          <HeadlineRow key={a.id} article={a} />
        ))}
      </div>
    </RailBlock>
  );
}

/** Editor's picks. Nothing flagged means no block — a pick nobody picked
 *  is just the most recent story with a label on it. */
export function EditorPicksRail({ limit = 5 }: { limit?: number }) {
  const t = useT();
  const { data } = trpc.news.list.useQuery({ isFeatured: true, limit, status: "published" });
  const picks = (data?.items ?? []) as Story[];
  if (!picks.length) return null;
  return (
    <RailBlock title={t("list.editorPicks")} href="/news">
      <div className="bd-list">
        {picks.map((a) => (
          <HeadlineRow key={a.id} article={a} />
        ))}
      </div>
    </RailBlock>
  );
}

/**
 * The beats, with how much is behind each one.
 *
 * Counts are the point: they tell a reader which beats this desk
 * actually covers before they click. The bare slug is the canonical
 * category URL — /category/<slug> only exists to redirect onto it.
 */
export function BeatsRail({ activeSlug, limit = 12 }: { activeSlug?: string; limit?: number }) {
  const t = useT();
  const { data } = trpc.news.getAllCategoriesWithCounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const beats = ((data ?? []) as any[]).filter((c) => c.articleCount > 0).slice(0, limit);
  if (!beats.length) return null;
  return (
    <RailBlock title={t("list.browseCategories")}>
      <ul className="bd-list">
        {beats.map((c: any) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.id}>
              <Link
                href={`/${c.slug}`}
                className={`flex items-center justify-between gap-3 py-2.5 text-[0.8125rem] font-semibold transition-colors ${
                  active ? "text-primary" : "text-foreground hover:text-primary"
                }`}
              >
                <span className="truncate">{c.name}</span>
                <span className="bd-meta tabular-nums">{c.articleCount}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </RailBlock>
  );
}

/** Topics cut across beats, so they are set as a tag cloud rather than a
 *  list — a reader scans them, they do not read down them. */
export function TopicsRail({ activeSlug, limit = 18 }: { activeSlug?: string; limit?: number }) {
  const t = useT();
  const { data } = trpc.news.getAllTagsWithCounts.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const tags = ((data ?? []) as any[])
    .filter((x) => x.articleCount > 0 && x.slug !== activeSlug)
    .slice(0, limit);
  if (!tags.length) return null;
  return (
    <RailBlock title={t("list.popularTags")}>
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3">
        {tags.map((x: any) => (
          <Link
            key={x.id}
            href={`/tag/${x.slug}`}
            className="bd-display text-[0.75rem] font-bold uppercase tracking-[0.06em] text-foreground/65 hover:text-primary transition-colors"
          >
            {x.name}
            <span className="ms-1 text-muted-foreground/70 tabular-nums">{x.articleCount}</span>
          </Link>
        ))}
      </div>
    </RailBlock>
  );
}

// ------------------------------------------------------------------
// Modules built on the other datasets — these self-hide
// ------------------------------------------------------------------

export function EventsRail({
  title,
  editionCountryId,
  limit = 4,
}: {
  title?: string;
  editionCountryId?: number;
  limit?: number;
}) {
  const t = useT();
  const { data } = trpc.events.list.useQuery({ editionCountryId });
  const events = (data?.items ?? []).slice(0, limit);
  if (!events.length) return null;
  return (
    <RailBlock title={title || t("rail.upcomingEvents")} href="/events">
      <ul className="bd-list">
        {events.map((event: any) => (
          <li key={event.id}>
            <Link href={`/events/${event.slug || event.id}`} className="group block py-3">
              <div className="bd-headline text-[0.8125rem] text-foreground line-clamp-2">{event.title}</div>
              <div className="bd-meta mt-1">
                {event.startDate && fmtDate(new Date(event.startDate), { month: "short", day: "numeric" })}
                {(event.city || event.country) &&
                  ` · ${[event.city, event.country].filter(Boolean).join(", ")}`}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

export function JobsRail({
  title,
  editionCountryId,
  limit = 5,
}: {
  title?: string;
  editionCountryId?: number;
  limit?: number;
}) {
  const t = useT();
  const { data } = trpc.jobs.list.useQuery({ editionCountryId });
  const jobs = (data?.items ?? []).slice(0, limit);
  if (!jobs.length) return null;
  return (
    <RailBlock title={title || t("rail.openRoles")} href="/jobs">
      <ul className="bd-list">
        {jobs.map((job: any) => (
          <li key={job.id}>
            <Link href={`/jobs/${job.slug || job.id}`} className="group flex gap-3 py-3">
              <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" aria-hidden />
              <div className="min-w-0">
                <div className="bd-headline text-[0.8125rem] text-foreground line-clamp-2">{job.title}</div>
                <div className="bd-meta mt-1 truncate">
                  {[job.companyName, job.location].filter(Boolean).join(" · ")}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

/** The companies register, as a rail block. Logos where we hold one, the
 *  name where we do not — never an empty frame. */
export function CompaniesRail({ limit = 6 }: { limit?: number }) {
  const t = useT();
  const { data } = trpc.companies.list.useQuery({ limit, isFeatured: true });
  const { data: any_ } = trpc.companies.list.useQuery(
    { limit },
    { enabled: !!data && (data.items?.length ?? 0) === 0 },
  );
  const companies = (data?.items?.length ? data.items : (any_?.items ?? [])) as any[];
  if (!companies.length) return null;
  return (
    <RailBlock title={t("rail.companies")} href="/companies">
      <ul className="bd-list">
        {companies.slice(0, limit).map((c) => (
          <li key={c.id}>
            <Link
              href={`/companies/${c.slug || c.id}`}
              className="flex items-center gap-3 py-2.5 group"
            >
              {c.logo ? (
                <img src={c.logo} alt="" loading="lazy" className="h-7 w-7 object-contain shrink-0" />
              ) : (
                <span className="h-7 w-7 bg-muted flex items-center justify-center shrink-0" aria-hidden>
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block bd-display text-[0.8125rem] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {c.name}
                </span>
                {c.industry && (
                  <span className="block bd-meta truncate">{c.industry}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

// ------------------------------------------------------------------
// Modules with no data behind them at all — the floor of the rail
// ------------------------------------------------------------------

export function NewsletterRail({ source }: { source?: string }) {
  const t = useT();
  return (
    <section className="bd-ink p-5">
      <h2 className="bd-display text-[0.9375rem] font-bold uppercase tracking-[0.1em] text-white">
        {publication.newsletter?.name ?? t("nav.newsletter")}
      </h2>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/65">
        {t("newsletter.dailyDescription")}
      </p>
      <div className="mt-4">
        <NewsletterSignup variant="inline" source={source} />
      </div>
    </section>
  );
}

/**
 * Who is writing this.
 *
 * Cheap to render, impossible to be empty, and the one block in the rail
 * that answers the question a first-time reader actually has. It also
 * puts the standards and corrections pages one click from every article,
 * which is where a publication of record should keep them.
 */
export function AboutDeskRail() {
  const t = useT();
  return (
    <RailBlock title={t("rail.aboutDesk")}>
      <p className="pt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
        {t("footer.description", { site: publication.name })}
      </p>
      <ul className="bd-list mt-3">
        {[
          { href: "/about", label: t("footer.aboutUs") },
          { href: "/about#editorial-policy", label: t("about.editorialPolicy") },
          { href: "/contact", label: t("footer.contactUs") },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block py-2.5 text-[0.8125rem] font-semibold text-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

// ------------------------------------------------------------------
// The band under the page
// ------------------------------------------------------------------

/**
 * Where the rail stops.
 *
 * A rail can be too long as easily as too short. On a beat page the
 * stories end at the pagination and the rail carried on for another
 * fifteen hundred pixels, which trades a hole under the rail for a hole
 * under the stories — the same complaint, mirrored.
 *
 * So the browse blocks come out of the rail on those pages and run full
 * width beneath both columns. They are better placed here anyway: a
 * reader who has reached the foot of a page is done with this beat and
 * is looking for the next one, and three columns of links is what that
 * reader wants rather than a narrow strip of them beside white paper.
 */
export function ExploreBand({
  activeCategorySlug,
  activeTagSlug,
  className = "",
}: {
  activeCategorySlug?: string;
  activeTagSlug?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <section
      className={`border-t-2 border-foreground pt-6 ${className}`}
      aria-label={t("sitemap.forReaders")}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
        <BeatsRail activeSlug={activeCategorySlug} />
        <TopicsRail activeSlug={activeTagSlug} />
        <AboutDeskRail />
      </div>
    </section>
  );
}
