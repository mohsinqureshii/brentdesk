import React from "react";
import { fmtDate } from "@/lib/dates";
import { Header } from "@/components/layout/Header";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { JsonLd } from "@/components/JsonLd";
import { SEO } from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { Link } from "wouter";
import {
  Clock, ArrowRight, Briefcase, Loader2, Calendar, MapPin, Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { getArticleUrl } from "@/lib/articleUrl";
import { SidebarAd, LeaderboardAd, InContentAd, MobileStickyAd, AdUnit } from "@/components/ads/AdUnit";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

// ------------------------------------------------------------------
// Types + helpers
// ------------------------------------------------------------------

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: Date | string | null;
  /** Date the underlying development happened. Preferred for display —
   *  see newsDate(). */
  eventDate?: string | null;
  viewCount?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  author?: { name: string } | null;
  categories?: Array<{ name: string; slug: string }>;
}

interface HomepageSection {
  id: number;
  name: string;
  slug: string;
  sectionType: string;
  categoryId?: number | null;
  accentColor?: string | null;
  articleCount?: number | null;
  layout?: string | null;
  viewMoreUrl?: string | null;
  sortOrder?: number | null;
  isActive?: number | boolean | null;
  position?: string | null;
}

/**
 * The date a reader should see.
 *
 * publishedAt records when BrentDesk published the piece and stays truthful;
 * eventDate is when the development actually happened. An archive published
 * in one sitting would otherwise show "2m ago" against every story,
 * including one reporting a December 2025 announcement — accurate about the
 * publication record, and misleading about the news.
 */
function newsDate(a: { eventDate?: string | null; publishedAt?: Date | string | null }): Date | string | null | undefined {
  return a.eventDate ?? a.publishedAt;
}

/** These sit outside the components that use them, so they cannot call the
 *  hook themselves and take the translator instead. They were the last
 *  English left on the Arabic home page: every card carried "9h ago" and
 *  "2 min read" in Latin because the keys existed but nothing reached for
 *  them. */
type Translate = ReturnType<typeof useT>;

function formatTimeAgo(t: Translate, date: Date | string | null | undefined): string {
  if (!date) return t("time.recently");
  const then = new Date(date);
  const diffMs = Date.now() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return diffMins <= 1 ? t("time.justNow") : t("time.minutesAgo", { n: diffMins });
  if (diffHours < 24) return t("time.hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
  return fmtDate(then, { month: "short", day: "numeric", year: "numeric" });
}

function readTime(t: Translate, article: Article): string {
  const words = (article.excerpt?.length ?? 300) / 5 + 400;
  return t("article.minRead", { n: Math.max(1, Math.round(words / 250)) });
}

function kicker(article: Article): string | null {
  return article.categoryName ?? article.categories?.[0]?.name ?? null;
}

// ------------------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------------------

function SectionHeader({
  title,
  accent,
  link,
  compact = false,
}: { title: string; accent?: string | null; link?: string | null; compact?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h2
        className={`bd-section-title min-w-0 ${compact ? "text-base whitespace-nowrap" : ""}`}
        style={{ ["--bd-accent" as string]: accent || undefined }}
      >
        <span className="truncate">{title}</span>
      </h2>
      {link && (
        <Link
          href={link}
          className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {compact ? t("common.all") : t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Thumb({ article, className }: { article: Article; className?: string }) {
  if (!article.featuredImageUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center text-muted-foreground/40 ${className ?? ""}`}>
        <Building2 className="h-6 w-6" />
      </div>
    );
  }
  return <img src={article.featuredImageUrl} alt="" loading="lazy" className={`object-cover ${className ?? ""}`} />;
}

function MetaLine({ article, showRead = true }: { article: Article; showRead?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span>{formatTimeAgo(t, newsDate(article))}</span>
      {showRead && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {readTime(t, article)}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Row: kicker + title + meta with a thumbnail on the right.
 * `compact` shrinks the thumb for the narrow three-column editorial band,
 * where a full-width thumb leaves the headline only a few characters.
 */
function ArticleRow({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <Link href={getArticleUrl(article)} className="group flex gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        {kicker(article) && <div className="bd-kicker mb-1">{kicker(article)}</div>}
        <h3 className={`bd-headline line-clamp-3 text-foreground ${compact ? "text-[13.5px]" : "text-[15px]"}`}>
          {article.title}
        </h3>
        <div className="mt-1.5">
          <MetaLine article={article} showRead={!compact} />
        </div>
      </div>
      <Thumb
        article={article}
        className={compact ? "h-12 w-12 rounded shrink-0" : "h-16 w-24 rounded-md shrink-0"}
      />
    </Link>
  );
}

// ------------------------------------------------------------------
// Top story block (hero + secondary stack)
// ------------------------------------------------------------------

function TopStorySection({ section }: { section: HomepageSection }) {
  const t = useT();
  const { data: articles = [], isLoading } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 4,
  });

  if (isLoading) {
    return <div className="bd-card h-[420px] animate-pulse" />;
  }
  const [lead, ...rest] = articles as Article[];
  if (!lead) return null;

  return (
    <section aria-label={t("list.topStory")} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Lead card — dark editorial hero */}
      <Link
        href={getArticleUrl(lead)}
        className="group lg:col-span-3 relative overflow-hidden rounded-xl bd-ink flex flex-col justify-end min-h-[320px] lg:min-h-[420px]"
      >
        {lead.featuredImageUrl && (
          <img
            src={lead.featuredImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45 group-hover:opacity-40 group-hover:scale-[1.02] transition-all duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="relative p-6 lg:p-8">
          <span className="inline-block bg-white text-black text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-sm mb-4">
            {t("list.topStory")}
          </span>
          <h1 className="bd-display text-white font-extrabold tracking-tight leading-[1.15] text-2xl lg:text-4xl max-w-2xl">
            {lead.title}
          </h1>
          {lead.excerpt && (
            <p className="mt-3 text-white/80 text-sm lg:text-base leading-relaxed line-clamp-2 max-w-xl">
              {lead.excerpt}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            <span>{formatTimeAgo(t, newsDate(lead))}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readTime(t, lead)}
            </span>
          </div>
        </div>
      </Link>

      {/* Secondary stack */}
      <div className="lg:col-span-2 bd-card px-5 py-2">
        {rest.slice(0, 3).map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// Category chip row
// ------------------------------------------------------------------

function CategoryChips() {
  const t = useT();
  const { data: categories } = trpc.news.getAllCategoriesWithCounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const parents = ((categories ?? []) as any[]).filter((c) => !c.parentId && c.isActive !== 0);
  if (!parents.length) return null;
  return (
    <nav aria-label={t("footer.categories")} className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
      {parents.map((c: any) => (
        <Link
          key={c.slug}
          href={`/${c.slug}`}
          className="shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] font-semibold text-foreground/80 hover:border-primary hover:text-primary transition-colors"
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

// ------------------------------------------------------------------
// Headlines + In Brief band
// ------------------------------------------------------------------

/**
 * The `headlines` CMS section feeds TWO columns of the editorial band —
 * "Latest Headlines" and "Latest News" — which is how the section type is
 * defined in the admin ("Latest Headlines + Latest News") and how the
 * homepage design lays it out. One query is split across both columns so
 * the two lists never repeat a story.
 */
function HeadlinesColumns({ section }: { section: HomepageSection }) {
  const t = useT();
  const perColumn = section.articleCount || 5;
  const { data: articles = [] } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: perColumn * 2,
  });
  const rows = articles as Article[];
  if (!rows.length) return null;

  const headlines = rows.slice(0, perColumn);
  const latest = rows.slice(perColumn);

  return (
    <>
      <div className="bd-card p-5">
        <SectionHeader title={section.name} accent={section.accentColor} link={section.viewMoreUrl || "/news"} compact />
        <div>
          {headlines.map((a) => (
            <ArticleRow key={a.id} article={a} compact />
          ))}
        </div>
      </div>
      {latest.length > 0 && (
        <div className="bd-card p-5">
          <SectionHeader title={t("list.latestNews")} accent={section.accentColor} link="/news" compact />
          <div>
            {latest.map((a) => (
              <ArticleRow key={a.id} article={a} compact />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function InBriefSection({ section }: { section: HomepageSection }) {
  const t = useT();
  const { data: articles = [] } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 6,
  });
  if (!articles.length) return null;
  return (
    <div className="bd-card p-5 flex flex-col">
      <SectionHeader title={section.name} accent={section.accentColor} />
      <ol className="flex-1">
        {(articles as Article[]).map((a) => (
          <li key={a.id} className="flex gap-3 py-2.5 border-b border-border last:border-0">
            <span className="text-[11px] font-semibold text-muted-foreground w-14 shrink-0 pt-0.5">
              {formatTimeAgo(t, newsDate(a))}
            </span>
            <Link href={getArticleUrl(a)} className="group min-w-0">
              <span className="bd-headline text-sm text-foreground line-clamp-2">{a.title}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href="/news"
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------
// CMS category section: 1 featured + list
// ------------------------------------------------------------------

function CategorySection({ section }: { section: HomepageSection }) {
  const { data: articles = [], isLoading } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 4,
  });
  if (isLoading || !articles.length) return null;
  const [featured, ...rest] = articles as Article[];
  const hasList = rest.length > 0;

  return (
    <section aria-label={section.name}>
      <SectionHeader title={section.name} accent={section.accentColor} link={section.viewMoreUrl} />
      <div className={`grid grid-cols-1 gap-5 ${hasList ? "md:grid-cols-2" : ""}`}>
        <Link href={getArticleUrl(featured)} className="group bd-card overflow-hidden flex flex-col">
          {featured.featuredImageUrl && (
            <div className="aspect-[16/9] overflow-hidden">
              <Thumb article={featured} className="h-full w-full group-hover:scale-[1.02] transition-transform duration-300" />
            </div>
          )}
          <div className="p-4 flex-1 flex flex-col">
            {kicker(featured) && <div className="bd-kicker mb-1.5">{kicker(featured)}</div>}
            <h3 className="bd-headline text-lg text-foreground line-clamp-2">{featured.title}</h3>
            {featured.excerpt && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{featured.excerpt}</p>
            )}
            <div className="mt-auto pt-3">
              <MetaLine article={featured} />
            </div>
          </div>
        </Link>
        {hasList && (
          <div className="bd-card px-5 py-1.5">
            {rest.slice(0, 3).map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// Events + companies bands
// ------------------------------------------------------------------

function EventsBand({ editionCountryId }: { editionCountryId?: number }) {
  const t = useT();
  const { data } = trpc.events.list.useQuery({ editionCountryId });
  const events = (data?.items ?? []).slice(0, 5);
  if (!events.length) return null;
  return (
    <section aria-label={t("nav.events")}>
      <SectionHeader title={t("nav.events")} accent="#2563eb" link="/events" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {events.map((event: any) => {
          const d = event.startDate ? new Date(event.startDate) : null;
          return (
            <Link key={event.id} href={`/events/${event.slug || event.id}`} className="group bd-card overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {event.featuredImage ? (
                  <img src={event.featuredImage} alt="" loading="lazy" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                ) : (
                  <div className="h-full w-full bd-ink opacity-90 flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-white/40" />
                  </div>
                )}
                {d && (
                  <div className="absolute top-2 left-2 bg-card rounded-md px-2 py-1 text-center leading-tight shadow-sm">
                    <div className="text-sm font-extrabold text-foreground">{d.getDate()}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      {fmtDate(d, { month: "short" })}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="bd-headline text-[13px] text-foreground line-clamp-2">{event.title}</h3>
                {(event.city || event.country) && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{[event.city, event.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
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
      <SectionHeader title={t("list.featuredCompanies")} accent="#2563eb" link="/companies" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {companies.map((company: any) => (
          <Link
            key={company.id}
            href={`/companies/${company.slug || company.id}`}
            className="group bd-card p-4 flex flex-col items-center text-center gap-2 hover:border-primary/40 transition-colors"
          >
            {company.logo ? (
              <img src={company.logo} alt="" loading="lazy" className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
            <span className="text-[13px] font-bold text-foreground line-clamp-1">{company.name}</span>
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
// Rail widgets
// ------------------------------------------------------------------

function MostReadWidget({ section }: { section: HomepageSection }) {
  const t = useT();
  const { data: mostRead = [] } = trpc.news.getMostRead.useQuery({
    limit: section.articleCount || 5,
    days: 30,
  });
  if (!mostRead.length) return null;
  return (
    <div className="bd-card p-5">
      <SectionHeader title={section.name} accent={section.accentColor} />
      <ol>
        {(mostRead as Article[]).map((a, i) => (
          <li key={a.id} className="flex gap-3 py-2.5 border-b border-border last:border-0">
            <span className="bd-display text-lg font-extrabold text-muted-foreground/40 w-7 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <Link href={getArticleUrl(a)} className="group">
                <span className="bd-headline text-sm text-foreground line-clamp-2">{a.title}</span>
              </Link>
              <div className="mt-1 text-[11px] text-muted-foreground">{formatTimeAgo(t, newsDate(a))}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function JobsWidget({ section, editionCountryId }: { section: HomepageSection; editionCountryId?: number }) {
  const t = useT();
  const { data } = trpc.jobs.list.useQuery({ editionCountryId });
  const jobs = (data?.items ?? []).slice(0, section.articleCount || 5);
  if (!jobs.length) return null;
  const colors = ["#2563eb", "#7c3aed", "#0e7490", "#15803d", "#b45309"];
  return (
    <div className="bd-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="bd-section-title">
          <Briefcase className="h-4 w-4 text-primary" /> {section.name}
        </h2>
        <Link href="/jobs" className="text-xs font-semibold text-primary hover:underline">
          {t("common.viewAll")}
        </Link>
      </div>
      <ul>
        {jobs.map((job: any, i: number) => (
          <li key={job.id} className="border-b border-border last:border-0">
            <Link href={`/jobs/${job.slug || job.id}`} className="group flex gap-3 py-3">
              <span
                className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-extrabold"
                style={{ backgroundColor: colors[i % colors.length] }}
              >
                {(job.companyName || job.title || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="bd-headline text-[13px] text-foreground line-clamp-1">{job.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {[job.location, job.employmentType].filter(Boolean).join(" · ") || job.companyName}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventsWidget({ section, editionCountryId }: { section: HomepageSection; editionCountryId?: number }) {
  const t = useT();
  const { data } = trpc.events.list.useQuery({ editionCountryId });
  const events = (data?.items ?? []).slice(0, section.articleCount || 4);
  if (!events.length) return null;
  return (
    <div className="bd-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="bd-section-title">
          <Calendar className="h-4 w-4 text-primary" /> {section.name}
        </h2>
        <Link href="/events" className="text-xs font-semibold text-primary hover:underline">
          {t("common.viewAll")}
        </Link>
      </div>
      <ul>
        {events.map((event: any) => (
          <li key={event.id} className="border-b border-border last:border-0">
            <Link href={`/events/${event.slug || event.id}`} className="group block py-3">
              <div className="bd-headline text-[13px] text-foreground line-clamp-2">{event.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {event.startDate &&
                  fmtDate(new Date(event.startDate), { month: "short", day: "numeric" })}
                {(event.city || event.country) && ` · ${[event.city, event.country].filter(Boolean).join(", ")}`}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterBox() {
  const t = useT();
  return (
    <div className="bd-card p-5">
      <h2 className="bd-section-title mb-1.5">{publication.newsletter.name}</h2>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t("newsletter.dailyDescription")}</p>
      <NewsletterSignup variant="inline" source="homepage-rail" />
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function News() {
  const t = useT();
  const { editionCountryId } = useEdition();

  const { data: sections, isLoading: sectionsLoading } = trpc.admin.homepage.getSections.useQuery();

  // Ticker headline: latest published article
  const { data: latestData, isLoading: latestLoading } = trpc.news.list.useQuery({
    limit: 1,
    status: "published",
    sortBy: "publishedAt",
    sortOrder: "desc",
    editionCountryId: editionCountryId ?? undefined,
  });
  const latest = (latestData?.items?.[0] ?? null) as Article | null;

  const activeSections = ((sections ?? []) as HomepageSection[])
    .filter((s) => s.isActive !== 0 && s.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const mainSections = activeSections.filter((s) => (s.position ?? "main") === "main");
  const railSections = activeSections.filter((s) => s.position === "sidebar");

  // Pair the headlines + in_brief sections into one band when both exist.
  const headlines = mainSections.find((s) => s.sectionType === "headlines");
  const inBrief = mainSections.find((s) => s.sectionType === "in_brief");
  const categorySections = mainSections.filter((s) => s.sectionType === "category");
  const heroSection = mainSections.find((s) => s.sectionType === "hero");

  if (sectionsLoading || latestLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <MarketTicker headline={latest?.title} headlineHref={latest ? getArticleUrl(latest) : undefined} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="xl:col-span-2 space-y-8 min-w-0">
            {heroSection && <TopStorySection section={heroSection} />}

            <CategoryChips />

            <LeaderboardAd slotKey="home-leaderboard" />

            {(headlines || inBrief) && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                {headlines && <HeadlinesColumns section={headlines} />}
                {inBrief && <InBriefSection section={inBrief} />}
              </div>
            )}

            {categorySections.map((section, i) => (
              <React.Fragment key={section.id}>
                <CategorySection section={section} />
                {i === 1 && <InContentAd slotKey="home-in-feed-1" />}
                {i === 3 && <InContentAd slotKey="home-in-feed-2" />}
              </React.Fragment>
            ))}
          </div>

          {/* Rail */}
          <aside className="space-y-6 min-w-0" aria-label={t("list.sidebar")}>
            <SidebarAd slotKey="home-sidebar-top" />
            {railSections.map((section, i) => (
              <React.Fragment key={section.id}>
                {section.sectionType === "trending" && <MostReadWidget section={section} />}
                {section.sectionType === "sidebar_jobs" && (
                  <JobsWidget section={section} editionCountryId={editionCountryId ?? undefined} />
                )}
                {section.sectionType === "sidebar_events" && (
                  <EventsWidget section={section} editionCountryId={editionCountryId ?? undefined} />
                )}
                {i === 0 && (
                  <>
                    <AdUnit slotKey="home-sidebar-mid" variant="sidebar" />
                    <NewsletterBox />
                  </>
                )}
              </React.Fragment>
            ))}
            {railSections.length === 0 && <NewsletterBox />}
            <SidebarAd slotKey="home-sidebar-bottom" />
          </aside>
        </div>

        {/* Full-width bands */}
        <div className="mt-10 space-y-10">
          <AdUnit slotKey="home-banner-mid" variant="leaderboard" />
          <FeaturedCompanies />
          <EventsBand editionCountryId={editionCountryId ?? undefined} />
          <AdUnit slotKey="home-brand-band" variant="leaderboard" />
        </div>
      </main>

      <MobileStickyAd slotKey="mobile-sticky-bottom" />
      <Footer />
    </div>
  );
}
