import React from "react";
import { Link } from "wouter";
import { useParams } from "wouter";
import { useState } from "react";
import { getArticleUrl } from "@/lib/articleUrl";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarAd, LeaderboardAd, InContentAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { trpc } from "@/lib/trpc";
import { 
  Clock, 
  ArrowRight, 
  ChevronDown, 
  TrendingUp,
  Rss,
  Mail,
  Loader2
} from "lucide-react";

// Default color mapping for categories
const categoryColors: Record<string, string> = {
  "ai": "bg-purple-500",
  "artificial-intelligence": "bg-purple-500",
  "fintech": "bg-green-500",
  "startups": "bg-orange-500",
  "venture": "bg-blue-500",
  "funding-vc": "bg-amber-500",
  "ecommerce": "bg-amber-500",
  "healthtech": "bg-red-500",
  "gaming": "bg-pink-500",
  "security": "bg-slate-600",
  "technology": "bg-cyan-500",
  "cloud-infra-data-centers": "bg-indigo-500",
  "enterprise": "bg-teal-500",
};

// Helper function to format time ago
function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "Recently";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Helper function to estimate read time
function estimateReadTime(excerpt: string | null): string {
  if (!excerpt) return "2 min read";
  const words = excerpt.split(/\s+/).length;
  const mins = Math.max(2, Math.ceil(words / 200));
  return `${mins} min read`;
}

interface CategoryNewsProps {
  overrideParentSlug?: string;
  overrideChildSlug?: string;
}

export default function CategoryNews({ overrideParentSlug, overrideChildSlug }: CategoryNewsProps = {}) {
  const params = useParams<{ parentSlug: string; childSlug?: string }>();
  // Allow props to override URL params (used by CategoryOrArticle for bare slug routes)
  const parentSlug = overrideParentSlug || params.parentSlug;
  const childSlug = overrideChildSlug || params.childSlug;
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  
  // Use childSlug if available, otherwise use parentSlug
  const categorySlug = selectedSubCategory || (childSlug || parentSlug)?.toLowerCase() || "";
  const parentCategorySlug = (parentSlug || "")?.toLowerCase();
  
  // Fetch category and articles from backend
  const { data: categoryData, isLoading, error } = trpc.news.listByCategory.useQuery({
    categorySlug,
    page,
    limit: 20,
    sortBy: sortBy === "popular" ? "viewCount" : "publishedAt",
  }, {
    enabled: !!categorySlug,
  });

  // Fetch sub-categories for this parent category
  const { data: subCategories } = trpc.news.getSubCategoriesWithCounts.useQuery({
    parentSlug: parentCategorySlug,
  }, {
    enabled: !!parentCategorySlug,
  });

  // Fetch all categories for Browse Categories sidebar
  const { data: allCategories } = trpc.news.getAllCategoriesWithCounts.useQuery();

  const category = categoryData?.category;
  const articles = categoryData?.items || [];
  const total = categoryData?.total || 0;
  const totalPages = categoryData?.totalPages || 0;
  
  // Get category color
  const categoryColor = categoryColors[parentCategorySlug] || categoryColors[categorySlug] || "bg-primary";
  
  // Find featured article (first one with isFeatured or just the first one)
  const featuredArticle = articles.find(a => a.isFeatured) || articles[0];
  const regularArticles = articles.filter(a => a.id !== featuredArticle?.id);
  
  // Build canonical URL using bare slugs (not /category/ prefix)
  // This matches the sitemap and SSR canonical URLs
  const canonicalPath = childSlug 
    ? `/${parentSlug}/${childSlug}` 
    : `/${parentSlug}`;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  // Error or not found state
  if (error || !category) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Category Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">The category "{categorySlug}" does not exist.</p>
          <Link href="/news">
            <Button>Back to News</Button>
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
        description={category.description || `Latest ${category.name} news and updates from TechScoop.`}
        canonical={`https://techscoop.io${canonicalPath}`}
      />
      <Header />
      
      <main className="w-full">
        {/* Category Hero */}
        <div className="border-b border-border bg-background">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 md:py-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className={`w-1.5 h-5 sm:w-2 sm:h-7 md:w-3 md:h-8 ${categoryColor} rounded-sm flex-shrink-0`} />
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight break-words">
                {category.name}
              </h1>
            </div>
            {category.description && (
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mb-4 sm:mb-5 break-words">
                {category.description}
              </p>
            )}
            
            {/* Sub-categories Pills */}
            {subCategories && subCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 overflow-hidden">
                <button
                  onClick={() => { setSelectedSubCategory(null); setPage(1); }}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    !selectedSubCategory 
                      ? "bg-foreground text-background" 
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  All {category.name}
                </button>
                {subCategories.map((subCat) => (
                  <button
                    key={subCat.id}
                    onClick={() => { setSelectedSubCategory(subCat.slug); setPage(1); }}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedSubCategory === subCat.slug 
                        ? "bg-foreground text-background" 
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {subCat.name} <span className="text-muted-foreground ml-0.5 sm:ml-1">{subCat.articleCount}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Subscribe/Follow Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="default" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <Rss className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Follow</span> {category.name}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Get</span> {category.name} <span className="hidden sm:inline">digest</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="border-b border-border bg-muted/30">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{total}</span> articles
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
                <button 
                  onClick={() => { setSortBy("latest"); setPage(1); }}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    sortBy === "latest" 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Latest
                </button>
                <button 
                  onClick={() => { setSortBy("popular"); setPage(1); }}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    sortBy === "popular" 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Most Popular
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Ad */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <LeaderboardAd slotKey="category-leaderboard" />
        </div>

        {/* Main Content */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No articles found in this category yet.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_340px] gap-4 sm:gap-6 lg:gap-8 items-start">
              {/* Articles List */}
              <div className="space-y-0">
                {/* Featured Article */}
                {featuredArticle && (
                  <Link 
                    href={getArticleUrl({ slug: featuredArticle.slug, primaryCategory: featuredArticle.primaryCategory })}
                    className="group block mb-4 sm:mb-6 md:mb-8"
                  >
                    <article className="grid sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 pb-4 sm:pb-6 md:pb-8 border-b border-border">
                      <div className="aspect-[16/10] rounded-lg sm:rounded-xl overflow-hidden bg-muted">
                        {featuredArticle.featuredImageUrl ? (
                          <img 
                            src={featuredArticle.featuredImageUrl} 
                            alt={featuredArticle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <Badge className={`${categoryColor} text-white border-0 rounded-full text-xs sm:text-sm`}>
                            Featured
                          </Badge>
                          {featuredArticle.tags?.slice(0, 1).map(tag => (
                            <Badge key={tag.id} variant="secondary" className="rounded-full text-xs sm:text-sm">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                        <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-2 sm:mb-3 line-clamp-3 break-words">
                          {featuredArticle.title}
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-3 break-words">
                          {featuredArticle.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">
                            {featuredArticle.author?.name || "TechScoop"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {formatTimeAgo(featuredArticle.publishedAt)}
                          </span>
                          <span className="hidden sm:inline">{estimateReadTime(featuredArticle.excerpt)}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                )}

                {/* Regular Articles */}
                {regularArticles.map((article, idx) => (
                  <React.Fragment key={article.id}>
                  {idx > 0 && idx % 5 === 0 && (
                    <div className="py-3 sm:py-4">
                      <InContentAd slotKey={`category-in-feed-${Math.floor(idx / 5)}`} />
                    </div>
                  )}
                  <Link 
                    href={getArticleUrl({ slug: article.slug, primaryCategory: article.primaryCategory })}
                    className="group block"
                  >
                    <article className="flex gap-3 sm:gap-4 md:gap-5 py-3 sm:py-5 md:py-6 border-b border-border">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                          {article.tags?.slice(0, 2).map(tag => (
                            <Badge key={tag.id} variant="secondary" className="rounded-full text-[10px] sm:text-xs px-1.5 sm:px-2">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-1.5 sm:mb-2 line-clamp-2 break-words">
                          {article.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3 hidden sm:block break-words">
                          {article.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                          <span className="font-medium text-foreground truncate max-w-[80px] sm:max-w-none">
                            {article.author?.name || "TechScoop"}
                          </span>
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {formatTimeAgo(article.publishedAt)}
                          </span>
                          <span className="hidden sm:inline">{estimateReadTime(article.excerpt)}</span>
                        </div>
                      </div>
                      <div className="w-20 h-16 sm:w-24 sm:h-20 md:w-40 md:h-28 flex-shrink-0 rounded-md sm:rounded-lg overflow-hidden bg-muted">
                        {article.featuredImageUrl ? (
                          <img 
                            src={article.featuredImageUrl} 
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                        )}
                      </div>
                    </article>
                  </Link>
                  </React.Fragment>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-4 sm:pt-6 md:pt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      Prev
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-4">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile Browse Categories - shown on mobile only */}
              <div className="lg:hidden mb-6">
                {allCategories && allCategories.length > 0 && (
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <h3 className="font-semibold text-foreground mb-3 text-sm">Browse Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.filter(c => c.articleCount > 0).slice(0, 8).map((cat) => (
                        <Link 
                          key={cat.id}
                          href={`/category/${cat.slug}`}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs transition-colors ${
                            cat.slug === categorySlug || cat.slug === parentCategorySlug
                              ? "bg-foreground text-background"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <span className="font-medium">{cat.name}</span>
                          <span className={`${
                            cat.slug === categorySlug || cat.slug === parentCategorySlug
                              ? "text-background/70"
                              : "text-muted-foreground"
                          }`}>
                            {cat.articleCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block space-y-6 sticky top-24">
                {/* Ad Spot */}
                <SidebarAd slotKey="category-sidebar" />

                {/* Trending in Category */}
                <div className="bg-muted/30 rounded-xl p-5 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Trending in {category.name}</h3>
                  </div>
                  <div className="space-y-4">
                    {articles.slice(0, 5).map((article, idx) => (
                      <Link 
                        key={article.id}
                        href={getArticleUrl({ slug: article.slug, primaryCategory: article.primaryCategory })}
                        className="group flex gap-3"
                      >
                        <span className="text-2xl font-bold text-muted-foreground/50 w-6">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(article.publishedAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Browse Categories */}
                {allCategories && allCategories.length > 0 && (
                  <div className="bg-background rounded-xl p-5 border border-border">
                    <h3 className="font-semibold text-foreground mb-4">Browse Categories</h3>
                    <div className="space-y-1">
                      {allCategories.filter(c => c.articleCount > 0).slice(0, 10).map((cat) => (
                        <Link 
                          key={cat.id}
                          href={`/category/${cat.slug}`}
                          className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors ${
                            cat.slug === categorySlug || cat.slug === parentCategorySlug
                              ? "bg-foreground text-background"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="font-medium">{cat.name}</span>
                          <span className={`text-sm ${
                            cat.slug === categorySlug || cat.slug === parentCategorySlug
                              ? "text-background/70"
                              : "text-muted-foreground"
                          }`}>
                            {cat.articleCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newsletter CTA */}
                <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
                  <h3 className="font-semibold text-foreground mb-2">
                    Get {category.name} Updates
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Weekly digest of the top stories in {category.name}.
                  </p>
                  <Button className="w-full gap-2" size="sm">
                    <Mail className="h-4 w-4" />
                    Subscribe
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
