/**
 * The front page.
 *
 * Laid out as a trade paper rather than a feed: a lead story that takes
 * the width it deserves, a column of the next three, a rail that stays
 * useful all the way down, and then a run of beat bands — construction,
 * infrastructure, energy — each one a rule, a feature and the stories
 * under it. Every band's head links into its own beat, because a section
 * named after a category that leads nowhere is a dead end on the busiest
 * page of the site.
 *
 * The bands come from the CMS (homepage_sections), so the order, the
 * beat, the accent and how many stories each carries are editable
 * without touching this file.
 */

import React from "react";
import { Link } from "wouter";
import { Briefcase, Building2, Calendar, Loader2, MapPin } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/JsonLd";
import { SEO } from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { getArticleUrl } from "@/lib/articleUrl";
import { SidebarAd, LeaderboardAd, InContentAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";
import {
  HeadlineRow,
  RailBlock,
  RankedList,
  SectionHead,
  StoryCard,
  StoryRow,
  type Story,
  formatTimeAgo,
  newsDate,
  readTime,
} from "@/components/editorial";

interface HomepageSection {
  id: number;
  name: string;
  slug: string;
  sectionType: string;
  categoryId?: number | null;
  categorySlug?: string | null;
  accentColor?: string | null;
  articleCount?: number | null;
  layout?: string | null;
  viewMoreUrl?: string | null;
  sortOrder?: number | null;
  isActive?: number | boolean | null;
  position?: string | null;
}

/**
 * Where a section's "view all" goes.
 *
 * An explicit viewMoreUrl set by an editor wins. Otherwise the section's
 * own category is the answer — the bare slug is the canonical category
 * URL — and only a section with no beat at all falls back to /news.
 */
function sectionHref(section: HomepageSection): string {
  if (section.viewMoreUrl) return section.viewMoreUrl;
  if (section.categorySlug) return `/${section.categorySlug}`;
  return "/news";
}

// ------------------------------------------------------------------
// Lead
// ------------------------------------------------------------------

/**
 * The lead story and the three behind it.
 *
 * The lead is drawn on ink. That started as a way to give an archive with
 * no photography a front page with weight, and it stays because it does
 * the job a masthead photo would: it fixes the eye before the columns
 * start. A story that does have art gets it, dimmed under the same ink so
 * the headline still leads.
 */
function LeadBand({ section }: { section: HomepageSection }) {
  const t = useT();
  const { data: articles = [], isLoading } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 4,
  });

  if (isLoading) return <div className="bd-card h-[420px] animate-pulse" />;
  const [lead, ...rest] = articles as Story[];
  if (!lead) return null;

  return (
    <section aria-label={t("list.topStory")} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Link
        href={getArticleUrl(lead)}
        className="group lg:col-span-8 relative overflow-hidden bd-ink flex flex-col justify-end min-h-[340px] lg:min-h-[460px]"
      >
        {lead.featuredImageUrl && (
          <img
            src={lead.featuredImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
        <div className="relative p-6 lg:p-10">
          <span className="bd-display inline-block bg-white text-black text-[10px] font-bold tracking-[0.16em] uppercase px-2.5 py-1 mb-5">
            {t("list.topStory")}
          </span>
          <h1 className="bd-lede text-white text-[1.75rem] lg:text-[2.75rem] max-w-3xl">{lead.title}</h1>
          {lead.excerpt && (
            <p className="mt-4 text-white/75 text-sm lg:text-base leading-relaxed line-clamp-2 max-w-2xl">
              {lead.excerpt}
            </p>
          )}
          <div className="bd-meta mt-5 flex items-center gap-2 text-white/55">
            <span>{formatTimeAgo(t, newsDate(lead))}</span>
            <span aria-hidden>·</span>
            <span>{readTime(t, lead)}</span>
          </div>
        </div>
      </Link>

      <div className="lg:col-span-4 bd-list border-t border-border lg:border-t-0">
        {rest.slice(0, 3).map((article) => (
          <StoryRow key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// Latest + in brief
// ------------------------------------------------------------------

/**
 * The `headlines` section feeds two columns — the newsroom's running list
 * split in half so neither column repeats the other.
 */
function LatestBand({ section, inBrief }: { section?: HomepageSection; inBrief?: HomepageSection }) {
  const t = useT();
  const perColumn = section?.articleCount || 6;
  const { data: headlineRows = [] } = trpc.admin.homepage.getSectionArticles.useQuery(
    { sectionId: section?.id ?? 0, limit: perColumn * 2 },
    { enabled: !!section },
  );
  const { data: briefRows = [] } = trpc.admin.homepage.getSectionArticles.useQuery(
    { sectionId: inBrief?.id ?? 0, limit: inBrief?.articleCount || 6 },
    { enabled: !!inBrief },
  );

  const rows = headlineRows as Story[];
  if (!rows.length && !briefRows.length) return null;

  const left = rows.slice(0, perColumn);
  const right = rows.slice(perColumn);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 items-start">
      {!!left.length && (
        <div>
          <SectionHead
            title={section?.name ?? t("list.latest")}
            accent={section?.accentColor}
            href={section ? sectionHref(section) : "/news"}
            compact
          />
          <div className="bd-list">
            {left.map((a) => (
              <StoryRow key={a.id} article={a} compact />
            ))}
          </div>
        </div>
      )}
      {!!right.length && (
        <div>
          <SectionHead title={t("list.latestNews")} accent={section?.accentColor} href="/news" compact />
          <div className="bd-list">
            {right.map((a) => (
              <StoryRow key={a.id} article={a} compact />
            ))}
          </div>
        </div>
      )}
      {!!(briefRows as Story[]).length && inBrief && (
        <div>
          <SectionHead
            title={inBrief.name}
            accent={inBrief.accentColor}
            href={sectionHref(inBrief)}
            compact
          />
          <div className="bd-list">
            {(briefRows as Story[]).map((a) => (
              <HeadlineRow key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Beat bands
// ------------------------------------------------------------------

/**
 * One beat, two shapes.
 *
 * `feature` gives the band a lead with art and the rest as rows; `cards`
 * runs four abreast. Alternating them down the page is what stops a long
 * front page reading as one repeated template.
 */
function BeatBand({ section, shape }: { section: HomepageSection; shape: "feature" | "cards" }) {
  const { data: articles = [], isLoading } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 4,
  });
  if (isLoading || !articles.length) return null;
  const stories = articles as Story[];
  const accent = section.accentColor;

  return (
    <section aria-label={section.name}>
      <SectionHead title={section.name} accent={accent} href={sectionHref(section)} />
      {shape === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {stories.slice(0, 4).map((a) => (
            <StoryCard key={a.id} article={a} accent={accent} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
          <div className="md:col-span-7">
            <StoryCard article={stories[0]} accent={accent} size="lg" showExcerpt />
          </div>
          <div className="md:col-span-5 bd-list">
            {stories.slice(1, 4).map((a) => (
              <StoryRow key={a.id} article={a} accent={accent} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Full-width bands
// ------------------------------------------------------------------

function EventsBand({ editionCountryId }: { editionCountryId?: number }) {
  const t = useT();
  const { data } = trpc.events.list.useQuery({ editionCountryId });
  const events = (data?.items ?? []).slice(0, 5);
  if (!events.length) return null;
  return (
    <section aria-label={t("nav.events")}>
      <SectionHead title={t("nav.events")} href="/events" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8">
        {events.map((event: any) => {
          const d = event.startDate ? new Date(event.startDate) : null;
          return (
            <Link key={event.id} href={`/events/${event.slug || event.id}`} className="group">
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {event.featuredImage ? (
                  <img
                    src={event.featuredImage}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="h-full w-full bd-ink flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white/30" aria-hidden />
                  </div>
                )}
                {d && (
                  <div className="absolute top-0 left-0 bg-primary text-white px-2 py-1 text-center leading-none">
                    <div className="bd-display text-[0.9375rem] font-bold">{d.getDate()}</div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.1em] mt-0.5">
                      {fmtDate(d, { month: "short" })}
                    </div>
                  </div>
                )}
              </div>
              <h3 className="bd-headline mt-3 text-[0.8125rem] text-foreground line-clamp-2">{event.title}</h3>
              {(event.city || event.country) && (
                <div className="bd-meta mt-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{[event.city, event.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedCompanies() {
  const t = useT();
  const { data } = trpc.companies.list.useQuery({ isFeatured: true, limit: 8 });
  const companies = data?.items ?? [];
  if (!companies.length) return null;
  return (
    <section aria-label={t("list.featuredCompanies")}>
      <SectionHead title={t("list.featuredCompanies")} href="/companies" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-border border border-border bg-card">
        {companies.map((company: any) => (
          <Link
            key={company.id}
            href={`/companies/${company.slug || company.id}`}
            className="group p-4 flex flex-col items-center text-center gap-2 hover:bg-muted/50 transition-colors"
          >
            {company.logo ? (
              <img src={company.logo} alt="" loading="lazy" className="h-9 w-9 object-contain" />
            ) : (
              <div className="h-9 w-9 bg-muted flex items-center justify-center">
                <Building2 className="h-4 w-4 text-muted-foreground/50" aria-hidden />
              </div>
            )}
            <span className="bd-display text-[0.75rem] font-bold text-foreground line-clamp-1">{company.name}</span>
            {company.industry && (
              <span className="text-[10px] text-muted-foreground line-clamp-1">{company.industry}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// Rail
// ------------------------------------------------------------------

function MostReadRail({ section }: { section: HomepageSection }) {
  const t = useT();
  const { data: mostRead = [] } = trpc.news.getMostRead.useQuery({
    limit: section.articleCount || 5,
    days: 30,
  });
  if (!mostRead.length) return null;
  return (
    <RailBlock title={section.name || t("list.mostRead")} accent={section.accentColor}>
      <RankedList articles={mostRead as Story[]} />
    </RailBlock>
  );
}

/**
 * Editor's picks — the articles an editor flagged. Nothing flagged means
 * no block: an empty rail is better than a rail filled with whatever was
 * most recent and called a pick.
 */
function EditorPicksRail() {
  const t = useT();
  const { data } = trpc.news.list.useQuery({ isFeatured: true, limit: 5, status: "published" });
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

function JobsRail({ section, editionCountryId }: { section: HomepageSection; editionCountryId?: number }) {
  const { data } = trpc.jobs.list.useQuery({ editionCountryId });
  const jobs = (data?.items ?? []).slice(0, section.articleCount || 5);
  if (!jobs.length) return null;
  return (
    <RailBlock title={section.name} href="/jobs">
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

function EventsRail({ section, editionCountryId }: { section: HomepageSection; editionCountryId?: number }) {
  const { data } = trpc.events.list.useQuery({ editionCountryId });
  const events = (data?.items ?? []).slice(0, section.articleCount || 4);
  if (!events.length) return null;
  return (
    <RailBlock title={section.name} href="/events">
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

function NewsletterRail() {
  const t = useT();
  return (
    <section className="bd-ink p-5">
      <h2 className="bd-display text-[0.9375rem] font-bold uppercase tracking-[0.1em] text-white">
        {publication.newsletter?.name ?? t("nav.newsletter")}
      </h2>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/65">{t("newsletter.dailyDescription")}</p>
      <div className="mt-4">
        <NewsletterSignup variant="inline" />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function News() {
  const t = useT();
  const { editionCountryId } = useEdition();

  const { data: sections, isLoading: sectionsLoading } = trpc.admin.homepage.getSections.useQuery();

  const activeSections = ((sections ?? []) as HomepageSection[])
    .filter((s) => s.isActive !== 0 && s.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const mainSections = activeSections.filter((s) => (s.position ?? "main") === "main");
  const railSections = activeSections.filter((s) => s.position === "sidebar");

  const headlines = mainSections.find((s) => s.sectionType === "headlines");
  const inBrief = mainSections.find((s) => s.sectionType === "in_brief");
  const beats = mainSections.filter((s) => s.sectionType === "category");
  const heroSection = mainSections.find((s) => s.sectionType === "hero");

  if (sectionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${publication.name} | ${publication.seoTagline}`}
        description={publication.description}
        canonical={`${publication.siteUrl}/`}
        ogImage={publication.assets.ogImage}
      />
      <JsonLd
        type="WebSite"
        data={{ name: publication.name, url: publication.siteUrl, description: publication.description }}
      />
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {heroSection && <LeadBand section={heroSection} />}

        <div className="mt-10 grid grid-cols-1 xl:grid-cols-12 gap-x-10 gap-y-10">
          <div className="xl:col-span-8 space-y-10 min-w-0">
            <LeaderboardAd slotKey="home-leaderboard" />
            <LatestBand section={headlines} inBrief={inBrief} />
            {beats.map((section, i) => (
              <React.Fragment key={section.id}>
                <BeatBand section={section} shape={i % 2 === 0 ? "feature" : "cards"} />
                {i === 1 && <InContentAd slotKey="home-in-feed-1" />}
                {i === 3 && <InContentAd slotKey="home-in-feed-2" />}
              </React.Fragment>
            ))}
          </div>

          <aside className="xl:col-span-4 space-y-6 min-w-0" aria-label={t("list.sidebar")}>
            <SidebarAd slotKey="home-sidebar-top" />
            {railSections.map((section, i) => (
              <React.Fragment key={section.id}>
                {section.sectionType === "trending" && <MostReadRail section={section} />}
                {section.sectionType === "sidebar_jobs" && (
                  <JobsRail section={section} editionCountryId={editionCountryId ?? undefined} />
                )}
                {section.sectionType === "sidebar_events" && (
                  <EventsRail section={section} editionCountryId={editionCountryId ?? undefined} />
                )}
                {i === 0 && (
                  <>
                    <EditorPicksRail />
                    <SidebarAd slotKey="home-sidebar-mid" />
                    <NewsletterRail />
                  </>
                )}
              </React.Fragment>
            ))}
            {railSections.length === 0 && (
              <>
                <EditorPicksRail />
                <NewsletterRail />
              </>
            )}
            <SidebarAd slotKey="home-sidebar-bottom" />
          </aside>
        </div>

        <div className="mt-12 space-y-12">
          <LeaderboardAd slotKey="home-banner-mid" />
          <FeaturedCompanies />
          <EventsBand editionCountryId={editionCountryId ?? undefined} />
          <LeaderboardAd slotKey="home-brand-band" />
        </div>
      </main>

      <MobileStickyAd slotKey="mobile-sticky-bottom" />
      <Footer />
    </div>
  );
}
