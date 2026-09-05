/**
 * A topic.
 *
 * Tags cut across beats — "Local Content" runs through construction,
 * manufacturing and logistics alike — so this page keeps the kicker on
 * every row, unlike a beat page where the kicker would repeat itself
 * down the column.
 */

import { useState } from "react";
import { Link, useParams } from "wouter";
import { Loader2, Tag as TagIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { publication } from "@shared/publication";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ListPagination";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SidebarAd, LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { trpc } from "@/lib/trpc";
import { RailBlock, RankedList, StoryCard, StoryRow, type Story } from "@/components/editorial";

/** What kind of thing a tag is, in the reader's words. */
function formatTagType(tagType: string | null): string {
  if (!tagType) return "Topic";
  const map: Record<string, string> = {
    product_tech: "Technology",
    regulation: "Regulation",
    deal_business: "Business",
    sector: "Sector",
    region: "Region",
    hub_program: "Programme",
    investor: "Investor",
    event: "Event",
    company: "Company",
    general: "Topic",
  };
  return map[tagType] || "Topic";
}

export default function TagPage() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);

  const tagSlug = (slug || "").toLowerCase();

  const { data: tagData, isLoading, error } = trpc.news.listByTag.useQuery(
    {
      tagSlug,
      page,
      limit: 20,
      sortBy: sortBy === "popular" ? "viewCount" : "publishedAt",
    },
    { enabled: !!tagSlug },
  );

  const { data: allTags } = trpc.news.getAllTagsWithCounts.useQuery();

  const tag = tagData?.tag;
  const articles = (tagData?.items || []) as Story[];
  const total = tagData?.total || 0;
  const totalPages = tagData?.totalPages || 0;

  const [lead, ...rest] = articles;
  const canonicalPath = `/tag/${tagSlug}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("state.tagNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <TagIcon className="h-10 w-10 text-muted-foreground/40 mb-4" aria-hidden />
          <h1 className="bd-display text-2xl font-bold mb-3">{t("state.tagNotFound")}</h1>
          <Link href="/news">
            <Button className="rounded-none">{t("state.backToNews")}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={tag.name}
        description={tag.description || `${tag.name} coverage from ${publication.name}.`}
        canonical={`${publication.siteUrl}${canonicalPath}`}
      />
      <Header />

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <header className="pt-8 pb-5 border-b-2 border-foreground">
          <p className="bd-eyebrow">{formatTagType(tag.tagType)}</p>
          <h1 className="bd-lede mt-2 text-[1.75rem] sm:text-[2.5rem] text-foreground">{tag.name}</h1>
          {tag.description && (
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {tag.description}
            </p>
          )}
        </header>

        <div className="flex items-center justify-between gap-4 py-3 border-b border-border">
          <p className="bd-eyebrow">{t("list.articlesCount", { n: total })}</p>
          <div className="flex items-center gap-4">
            <span className="bd-eyebrow hidden sm:inline">{t("list.sortBy")}</span>
            {(["latest", "popular"] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setSortBy(key);
                  setPage(1);
                }}
                aria-pressed={sortBy === key}
                className={`bd-display text-[0.75rem] font-bold uppercase tracking-[0.08em] transition-colors ${
                  sortBy === key ? "text-primary" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {key === "latest" ? t("list.latest") : t("list.mostRead")}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <LeaderboardAd slotKey="tag-leaderboard" />
        </div>

        {articles.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">{t("state.noArticlesTag")}</div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-x-10 gap-y-8 items-start py-6">
            <div className="min-w-0">
              <div className="pb-6 border-b border-border">
                <StoryCard article={lead} size="lg" showExcerpt />
              </div>
              <div className="bd-list">
                {rest.map((article) => (
                  <StoryRow key={article.id} article={article} />
                ))}
              </div>
              <ListPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="pt-8"
              />
            </div>

            <aside className="space-y-6 min-w-0 lg:sticky lg:top-28" aria-label={t("list.sidebar")}>
              <SidebarAd slotKey="tag-sidebar" />

              <RailBlock title={t("list.mostRead")}>
                <RankedList articles={articles.slice(0, 5)} />
              </RailBlock>

              {!!allTags?.length && (
                <RailBlock title={t("list.popularTags")}>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3">
                    {allTags
                      .filter((x) => x.articleCount > 0 && x.slug !== tagSlug)
                      .slice(0, 16)
                      .map((x) => (
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
              )}

              <section className="bd-ink p-5">
                <h2 className="bd-display text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-white">
                  {publication.newsletter.name}
                </h2>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/65">
                  {t("newsletter.dailyDescription")}
                </p>
                <div className="mt-4">
                  <NewsletterSignup variant="inline" source="tag-rail" />
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
