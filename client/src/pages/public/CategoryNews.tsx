/**
 * A beat.
 *
 * The same page serves a parent beat (/construction) and a sub-beat
 * (/construction/epc): the route decides which, and the sub-beat chips
 * filter in place rather than navigating, so a reader comparing two
 * sub-beats does not lose their position in the feed.
 *
 * Built from the editorial kit, so a story on a beat page is the same
 * object it is on the front page — same headline, same kicker, same rule.
 */

import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { publication } from "@shared/publication";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ListPagination";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SidebarAd, LeaderboardAd, InContentAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { trpc } from "@/lib/trpc";
import {
  RailBlock,
  RankedList,
  StoryCard,
  StoryRow,
  type Story,
} from "@/components/editorial";

/**
 * The colour a beat is set in. Category rows carry no colour of their
 * own, so the mapping lives here; a beat with no entry takes the house
 * accent rather than an arbitrary one.
 */
const BEAT_ACCENTS: Record<string, string> = {
  construction: "#b45309",
  infrastructure: "#0e7490",
  energy: "#15803d",
  "oil-gas": "#065f46",
  renewables: "#4d7c0f",
  manufacturing: "#6d28d9",
  logistics: "#be123c",
  "real-estate": "#c2410c",
  transportation: "#1d4ed8",
  mining: "#57534e",
  utilities: "#0f766e",
  "industrial-technology": "#4338ca",
};

interface CategoryNewsProps {
  overrideParentSlug?: string;
  overrideChildSlug?: string;
}

export default function CategoryNews({ overrideParentSlug, overrideChildSlug }: CategoryNewsProps = {}) {
  const t = useT();
  const params = useParams<{ parentSlug: string; childSlug?: string }>();
  const parentSlug = overrideParentSlug || params.parentSlug;
  const childSlug = overrideChildSlug || params.childSlug;
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  const categorySlug = selectedSubCategory || (childSlug || parentSlug)?.toLowerCase() || "";
  const parentCategorySlug = (parentSlug || "")?.toLowerCase();

  const { data: categoryData, isLoading, error } = trpc.news.listByCategory.useQuery(
    {
      categorySlug,
      page,
      limit: 20,
      sortBy: sortBy === "popular" ? "viewCount" : "publishedAt",
    },
    { enabled: !!categorySlug },
  );

  const { data: subCategories } = trpc.news.getSubCategoriesWithCounts.useQuery(
    { parentSlug: parentCategorySlug },
    { enabled: !!parentCategorySlug },
  );

  const { data: allCategories } = trpc.news.getAllCategoriesWithCounts.useQuery();

  const category = categoryData?.category;
  const articles = (categoryData?.items || []) as Story[];
  const total = categoryData?.total || 0;
  const totalPages = categoryData?.totalPages || 0;
  const accent = BEAT_ACCENTS[parentCategorySlug] || BEAT_ACCENTS[categorySlug];

  const [lead, ...rest] = articles;
  const canonicalPath = childSlug ? `/${parentSlug}/${childSlug}` : `/${parentSlug}`;

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

  if (error || !category) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("state.categoryNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <h1 className="bd-display text-2xl font-bold mb-3">{t("state.categoryNotFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("state.noArticlesCategory")}</p>
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
        title={category.name}
        description={category.description || `Latest ${category.name} news and updates from ${publication.name}.`}
        canonical={`${publication.siteUrl}${canonicalPath}`}
      />
      <Header />

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Beat masthead */}
        <header className="pt-8 pb-5 border-b-2 border-foreground">
          <div className="flex items-center gap-3">
            <span
              className="w-1.5 h-8 sm:h-10 shrink-0"
              style={{ backgroundColor: accent || "var(--primary)" }}
              aria-hidden
            />
            <h1 className="bd-lede text-[1.75rem] sm:text-[2.5rem] text-foreground">{category.name}</h1>
          </div>
          {category.description && (
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {category.description}
            </p>
          )}

          {!!subCategories?.length && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                onClick={() => {
                  setSelectedSubCategory(null);
                  setPage(1);
                }}
                className={`bd-display text-[0.75rem] font-bold uppercase tracking-[0.08em] transition-colors ${
                  !selectedSubCategory ? "text-primary" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {t("common.all")} {category.name}
              </button>
              {subCategories.map((subCat) => (
                <button
                  key={subCat.id}
                  onClick={() => {
                    setSelectedSubCategory(subCat.slug);
                    setPage(1);
                  }}
                  className={`bd-display text-[0.75rem] font-bold uppercase tracking-[0.08em] transition-colors ${
                    selectedSubCategory === subCat.slug
                      ? "text-primary"
                      : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  {subCat.name}
                  <span className="ms-1 text-muted-foreground/70 tabular-nums">{subCat.articleCount}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Count and sort */}
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
          <LeaderboardAd slotKey="category-leaderboard" />
        </div>

        {articles.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">{t("state.noArticlesCategory")}</div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-x-10 gap-y-8 items-start py-6">
            <div className="min-w-0">
              <div className="pb-6 border-b border-border">
                <StoryCard article={lead} accent={accent} size="lg" showExcerpt />
              </div>

              <div className="bd-list">
                {rest.map((article, idx) => (
                  <React.Fragment key={article.id}>
                    {idx > 0 && idx % 6 === 0 && (
                      <InContentAd slotKey={`category-in-feed-${Math.floor(idx / 6)}`} />
                    )}
                    <StoryRow article={article} accent={accent} />
                  </React.Fragment>
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
              <SidebarAd slotKey="category-sidebar" />

              <RailBlock title={t("list.trendingIn", { category: category.name })} accent={accent}>
                <RankedList articles={articles.slice(0, 5)} />
              </RailBlock>

              {!!allCategories?.length && (
                <RailBlock title={t("list.browseCategories")}>
                  <ul className="bd-list">
                    {allCategories
                      .filter((c) => c.articleCount > 0)
                      .slice(0, 10)
                      .map((cat) => {
                        const active = cat.slug === categorySlug || cat.slug === parentCategorySlug;
                        return (
                          <li key={cat.id}>
                            {/* The bare slug is the canonical category URL —
                                /category/<slug> only exists to 301 to it. */}
                            <Link
                              href={`/${cat.slug}`}
                              className={`flex items-center justify-between gap-3 py-2.5 text-[0.8125rem] font-semibold transition-colors ${
                                active ? "text-primary" : "text-foreground hover:text-primary"
                              }`}
                            >
                              <span className="truncate">{cat.name}</span>
                              <span className="bd-meta tabular-nums">{cat.articleCount}</span>
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                </RailBlock>
              )}

              <section className="bd-ink p-5">
                <h2 className="bd-display text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-white">
                  {t("newsletter.beatDigest", { category: category.name })}
                </h2>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/65">
                  {t("newsletter.beatDigestBody", { category: category.name })}
                </p>
                <div className="mt-4">
                  <NewsletterSignup variant="inline" />
                </div>
              </section>

              <SidebarAd slotKey="category-sidebar-bottom" />
            </aside>
          </div>
        )}
      </main>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
