import { useLocation, Link } from "wouter";
import { useParams } from "wouter";
import { useState, useRef, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { SEO } from "@/components/SEO";
import { JsonLd, type ArticleSchema, type BreadcrumbItem } from "@/components/JsonLd";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Share2, Bookmark, MessageCircle, ThumbsUp, Twitter, Linkedin, Facebook, Link2, ChevronLeft, ChevronRight, Play, TrendingUp, Mail, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import { ArticleCompanySnapshots } from "@/components/CompanySnapshot";
import { useBrowsingTracker } from "@/hooks/useBrowsingTracker";
import { SidebarAd, InContentAd, LeaderboardAd, MobileStickyAd, AdUnit } from "@/components/ads/AdUnit";
import { BookmarkButton } from "@/components/BookmarkButton";

// Shared container class matching header
const containerClass = "w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8";

// Helper function to format date
function formatDate(date: Date | string | null): string {
  if (!date) return "Recently";
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }) + " TST";
}

// Helper to get placeholder image
function getPlaceholderImage(index: number): string {
  const images = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&auto=format&fit=crop&q=80",
  ];
  return images[index % images.length];
}

/**
 * ArticleContentWithAds — Splits article HTML content and inserts ads between paragraphs.
 * Inserts a mid-article ad after roughly 40% of paragraphs (minimum 3 paragraphs before first ad).
 * On mobile, shows a 300x250 ad; on desktop, shows a 728x90 leaderboard.
 */
function ArticleContentWithAds({ content }: { content: string }) {
  const parts = useMemo(() => {
    if (!content) return [content];
    // Split on closing </p> tags to find paragraph boundaries
    const paragraphs = content.split(/<\/p>/i);
    if (paragraphs.length < 6) {
      // Too few paragraphs — don't insert mid-article ad
      return [content];
    }
    // Insert ad after ~40% of paragraphs (min 3)
    const insertAt = Math.max(3, Math.floor(paragraphs.length * 0.4));
    const before = paragraphs.slice(0, insertAt).join('</p>') + '</p>';
    const after = paragraphs.slice(insertAt).join('</p>');
    return [before, after];
  }, [content]);

  if (parts.length === 1) {
    return (
      <article
        className="article-content max-w-none mb-6 sm:mb-8 prose prose-lg dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <>
      <article
        className="article-content max-w-none prose prose-lg dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: parts[0] }}
      />
      {/* Mid-Article Ad */}
      <div className="my-6 sm:my-8">
        <div className="hidden sm:block">
          <InContentAd slotKey="article-mid-content" category="article" />
        </div>
        <div className="sm:hidden">
          <AdUnit slotKey="article-mid-content" variant="in-content" category="article" />
        </div>
      </div>
      <article
        className="article-content max-w-none mb-6 sm:mb-8 prose prose-lg dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: parts[1] }}
      />
    </>
  );
}

// Related Articles Carousel Component
interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  category?: string;
  author?: string | null;
  featuredImageUrl?: string | null;
  categories?: Array<{ slug: string; name?: string }>;
}

const RelatedArticlesCarousel = ({ articles }: { articles: RelatedArticle[] }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScrollButtons);
      return () => ref.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (articles.length === 0) return null;

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg hover:bg-muted transition-colors -ml-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg hover:bg-muted transition-colors -mr-4"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {articles.map((article, idx) => (
          <Link
            key={article.id}
            href={getArticleUrl(article)}
            className="group flex-shrink-0 w-[260px] sm:w-[280px] lg:w-[300px]"
          >
            <article className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={article.featuredImageUrl || getPlaceholderImage(idx)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <Badge variant="secondary" className="text-xs mb-2">
                  {article.category || "News"}
                </Badge>
                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                  {article.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-2">{article.author || "TechScoop"}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function Article() {
  // Support both URL patterns:
  // - /:categorySlug/:articleSlug (new category-based)
  // - /article/:slug (legacy)
  const params = useParams<{ slug?: string; categorySlug?: string; articleSlug?: string }>();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  
  // Get the article slug from URL (handles both patterns)
  const articleSlug = useMemo(() => {
    // For /article/:slug pattern
    if (params.slug) return params.slug;
    // For /:categorySlug/:articleSlug pattern
    if (params.articleSlug) return params.articleSlug;
    return "";
  }, [params]);

  // Get category slug from URL for validation
  const categorySlug = useMemo(() => {
    // For /:categorySlug/:articleSlug pattern
    if (params.categorySlug) return params.categorySlug;
    return undefined;
  }, [params]);

  // Check if this is a legacy /article URL
  const isLegacyUrl = location.startsWith('/article/');

  // Fetch article by slug with category validation
  const { data: articleData, isLoading, error } = trpc.news.getBySlug.useQuery(
    { slug: articleSlug, categorySlug },
    { enabled: !!articleSlug }
  );

  // Handle redirect if category doesn't match or if using legacy /article URL
  useEffect(() => {
    if (articleData && 'redirect' in articleData && articleData.redirect) {
      // Redirect to correct URL
      const correctUrl = `/${articleData.correctCategorySlug}/${articleData.articleSlug}`;
      setLocation(correctUrl, { replace: true });
    } else if (isLegacyUrl && articleData && !('redirect' in articleData)) {
      // Redirect legacy /article URLs to category-based URLs
      const article = articleData as any;
      const primaryCat = article.primaryCategory || article.categories?.[0];
      if (primaryCat?.slug) {
        const correctUrl = `/${primaryCat.slug}/${article.slug}`;
        setLocation(correctUrl, { replace: true });
      }
    }
  }, [articleData, setLocation, isLegacyUrl]);

  // Extract article from response (handle both redirect and normal response)
  const article = useMemo(() => {
    if (!articleData) return null;
    if ('redirect' in articleData && articleData.redirect) return null;
    // Type assertion to exclude redirect type since we've checked for it
    return articleData as Exclude<typeof articleData, { redirect: boolean }>;
  }, [articleData]);

  // Track browsing history
  useBrowsingTracker(article ? {
    contentType: "article",
    contentId: article.id,
    contentTitle: article.title,
    contentSlug: article.slug,
    contentCategory: (article as any).primaryCategory?.name || (article as any).categories?.[0]?.name || "",
    contentImageUrl: (article as any).featuredImageUrl || undefined,
  } : null);

  // Fetch related articles using the new related content service
  const { data: relatedArticlesData } = trpc.news.getRelatedArticles.useQuery(
    { articleId: article?.id || 0, limit: 6 },
    { enabled: !!article?.id }
  );

  // Fetch related entities (people, companies, events mentioned in article)
  const { data: relatedEntitiesData } = trpc.news.getRelatedEntities.useQuery(
    { articleId: article?.id || 0, limit: 6 },
    { enabled: !!article?.id }
  );

  // Fallback to list query if no related articles found
  const { data: relatedData } = trpc.news.list.useQuery({
    page: 1,
    limit: 6,
    sortBy: "publishedAt",
    sortOrder: "desc",
  }, { enabled: !relatedArticlesData || relatedArticlesData.length === 0 });

  // Fetch most popular articles
  const { data: popularData } = trpc.news.list.useQuery({
    page: 1,
    limit: 5,
    sortBy: "viewCount",
    sortOrder: "desc",
  });

  const relatedArticles = useMemo(() => {
    // Prefer related articles from the new service
    if (relatedArticlesData && relatedArticlesData.length > 0) {
      return relatedArticlesData.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.matchReason?.split(',')[0] || "Related",
        author: null,
        featuredImageUrl: a.featuredImageUrl,
        categories: [],
      }));
    }
    // Fallback to list query
    if (!relatedData?.items || !article) return [];
    return relatedData.items
      .filter(a => a.id !== article.id)
      .slice(0, 6)
      .map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.categories?.[0]?.name,
        author: a.author?.name,
        featuredImageUrl: a.featuredImageUrl,
        categories: a.categories,
      }));
  }, [relatedArticlesData, relatedData, article]);

  // Related entities for internal linking
  const relatedEntities = useMemo(() => {
    if (!relatedEntitiesData) return [];
    return relatedEntitiesData;
  }, [relatedEntitiesData]);

  const mostPopular = useMemo(() => {
    if (!popularData?.items) return [];
    return popularData.items.slice(0, 5).map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
    }));
  }, [popularData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title="Article Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Link href="/news">
            <Button>Back to News</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const category = article.categories?.[0]?.name || "News";
  const authorName = article.author?.name || "TechScoop";
  const authorAvatar = article.author?.avatar || "";
  const articleTagsList = article.tags || [];

  // Generate canonical URL using primary category
  const primaryCategorySlug = (article as any).primaryCategory?.slug || article.categories?.[0]?.slug;
  const canonicalUrl = primaryCategorySlug 
    ? `https://techscoop.io/${primaryCategorySlug}/${article.slug}`
    : `https://techscoop.io/article/${article.slug}`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.excerpt || undefined}
        canonical={canonicalUrl}
        ogType="article"
        ogImage={article.featuredImageUrl || undefined}
        // Respect the per-article robotsIndexing flag the writer can
        // set in the editor. Was dead code before — the field is
        // editable in admin but never reached the rendered page,
        // so noindex'd articles still got indexed.
        noindex={(article as any).robotsIndexing === "noindex"}
        article={{
          publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
          modifiedTime: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
          author: authorName,
          section: category,
        }}
      />
      
      {/* JSON-LD Structured Data for SEO */}
      <JsonLd
        type="NewsArticle"
        data={{
          headline: article.title,
          description: article.seoDescription || article.excerpt || undefined,
          image: article.featuredImageUrl || undefined,
          datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
          dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
          author: {
            name: authorName,
            url: article.author?.username ? `https://techscoop.io/author/${article.author.username}` : undefined,
            image: authorAvatar || undefined,
          },
          mainEntityOfPage: canonicalUrl,
          articleSection: category,
          keywords: articleTagsList.map(t => t.name),
          dateline: 'MENA',
        } as ArticleSchema}
      />
      <JsonLd
        type="BreadcrumbList"
        data={[
          { name: 'Home', url: 'https://techscoop.io' },
          { name: category, url: `https://techscoop.io/${primaryCategorySlug}` },
          { name: article.title, url: canonicalUrl },
        ] as BreadcrumbItem[]}
      />
      
      <Header />
      
      {/* Split Hero Section - Full Width */}
      <div className="w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[300px] sm:min-h-[380px] lg:min-h-[480px]">
          {/* Left - Image (50% width) */}
          <div className="w-full lg:w-1/2 h-[280px] sm:h-[320px] lg:h-auto relative overflow-hidden">
            <img
              src={article.featuredImageUrl || getPlaceholderImage(article.id)}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            {!article.featuredImageUrl && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
                  IMAGE CREDITS: <span className="underline">UNSPLASH</span>
                </span>
              </div>
            )}
          </div>
          
          {/* Right - Content on Black Background (50% width) */}
          <div className="w-full lg:w-1/2 bg-black flex items-center">
            <div className="w-full max-w-[700px] px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10 lg:py-12">
              {/* Category & Social Row */}
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <Badge className="bg-transparent border border-white/40 text-white hover:bg-white/10 text-xs uppercase tracking-widest font-medium px-3 py-1">
                  {category}
                </Badge>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[44px] font-bold text-white leading-[1.15] mb-6 lg:mb-8">
                {article.title}
              </h1>
              
              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-2 text-white/80 text-sm sm:text-base">
                {article.author?.username || article.author?.id ? (
                  <Link
                    href={`/author/${article.author?.username || article.author?.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <span className="font-medium text-white">{authorName}</span>
                )}
                <span className="text-white/50">·</span>
                <time dateTime={article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined}>
                  {formatDate(article.publishedAt)}
                </time>
                {article.updatedAt &&
                  article.publishedAt &&
                  new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 86_400_000 && (
                    <>
                      <span className="text-white/50">·</span>
                      <span className="text-white/70 text-xs sm:text-sm">
                        Updated{" "}
                        <time dateTime={new Date(article.updatedAt).toISOString()}>
                          {formatDate(article.updatedAt)}
                        </time>
                      </span>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Leaderboard Ad - Below Hero */}
      <div className={`${containerClass} pt-4 sm:pt-6`}>
        <LeaderboardAd slotKey="article-leaderboard" category="article" className="hidden sm:block" />
        {/* Mobile version - 300x250 rectangle */}
        <div className="sm:hidden">
          <AdUnit slotKey="article-mobile-in-content" variant="in-content" category="article" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`${containerClass} py-6 sm:py-8 lg:py-10`}>
        {/* Two Column Layout - Article + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-6">
          {/* Main Content - Takes remaining space */}
          <div className="flex-1 min-w-0">
            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {/* Article Content - Split with mid-article ad */}
            <ArticleContentWithAds content={article.content || ""} />

            {/* Post-Article Ad */}
            <InContentAd slotKey="article-in-content" category="article" />

            {/* Tags */}
            {articleTagsList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border">
                <span className="text-xs sm:text-sm font-medium text-foreground mr-2">Topics:</span>
                {articleTagsList.map((tag) => (
                  <Link key={tag.id || tag.name} href={`/tag/${tag.slug || tag.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Badge variant="outline" className="rounded-full hover:bg-muted transition-colors text-xs">
                      {tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Share & Save Section */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-muted-foreground">Share:</span>
                <Button variant="outline" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0">
                  <Twitter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0">
                  <Linkedin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0">
                  <Facebook className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0">
                  <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <BookmarkButton
                contentType="article"
                contentId={article.id}
                contentTitle={article.title}
                contentSlug={article.slug}
                contentCategory={(article as any).primaryCategory?.name || article.categories?.[0]?.name}
                contentImageUrl={article.featuredImageUrl || undefined}
                variant="button"
              />
            </div>

            {/* Author Bio Card */}
            <div className="border-t border-border pt-5 sm:pt-6 lg:pt-8">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                  <AvatarImage src={authorAvatar} />
                  <AvatarFallback className="text-lg font-semibold">{authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-foreground text-sm sm:text-base">{authorName}</p>
                    {article.author?.twitterHandle && (
                      <a 
                        href={`https://twitter.com/${article.author.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-muted-foreground hover:text-[#1DA1F2] transition-colors"
                      >
                        <span className="text-xs sm:text-sm">@{article.author.twitterHandle}</span>
                        <Twitter className="h-3.5 w-3.5 text-[#1DA1F2]" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                    {article.author?.authorBio || article.author?.bio || `${authorName} is a reporter at TechScoop covering the MENA tech ecosystem.`}
                  </p>
                  <Link 
                    href={`/author/${article.author?.username || article.author?.id || 'unknown'}`}
                    className="text-xs sm:text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    View Bio →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Fixed Width */}
          <aside className="w-full lg:w-[320px] xl:w-[340px] flex-shrink-0 space-y-5 sm:space-y-6">
            {/* Newsletter CTA Green Card */}
            <div className="bg-[#0a0] rounded-xl p-4 sm:p-5 text-white">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="font-bold text-base sm:text-lg">TS</span>
                <span className="text-xs sm:text-sm opacity-90">TechScoop TPC</span>
              </div>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed mb-3 sm:mb-4">
                Get ahead in the MENA tech scene — straight to your inbox. Join the industry's must-read daily newsletter covering startups, funding, and more.
              </p>
              <Button className="w-full bg-white text-[#0a0] hover:bg-white/90 font-medium rounded-full text-sm h-9 sm:h-10">
                Subscribe →
              </Button>
            </div>

            {/* Company Snapshots */}
            {article && 'id' in article && article.id && (
              <ArticleCompanySnapshots articleId={article.id} />
            )}

            {/* Most Popular */}
            {mostPopular.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <h3 className="font-bold text-base sm:text-lg text-foreground">Most Popular</h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {mostPopular.map((item, idx) => (
                    <Link key={item.id} href={`/article/${item.slug}`} className="group flex gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors leading-snug flex-1">
                        {item.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter CTA */}
            <div className="bg-muted rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground">Daily Newsletter</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Get the latest tech news and startup updates delivered daily.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm h-9 px-3 sm:px-4">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Sidebar Ad - Top */}
            <SidebarAd slotKey="article-sidebar" category="article" />

            {/* Sidebar Ad - Bottom (post-content) */}
            <SidebarAd slotKey="article-post-content" category="article" />
          </aside>
        </div>

        {/* Related Entities Section */}
        {relatedEntities.length > 0 && (
          <section className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-border">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-4 sm:mb-6">Mentioned in This Article</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedEntities.map((entity) => (
                <Link
                  key={`${entity.type}-${entity.id}`}
                  href={`/${entity.type === 'person' ? 'people' : entity.type === 'company' ? 'companies' : 'events'}/${entity.slug}`}
                  className="group flex flex-col items-center text-center p-4 bg-card border border-border rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted mb-3">
                    {entity.image ? (
                      <img
                        src={entity.image}
                        alt={entity.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-semibold">
                        {entity.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {entity.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs mt-2 capitalize">
                    {entity.type}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Articles Carousel */}
        {relatedArticles.length > 0 && (
          <section className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Related Articles</h2>
              <Link href="/news" className="text-xs sm:text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
            <RelatedArticlesCarousel articles={relatedArticles} />
          </section>
        )}
      </main>
      <Footer />

      {/* Mobile Sticky Ad - Bottom of screen, only on mobile */}
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
