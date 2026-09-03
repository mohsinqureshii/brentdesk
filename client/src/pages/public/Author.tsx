import { useState, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { Link, useParams } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Twitter, Mail, Linkedin, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import { LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { SEO } from "@/components/SEO";

const formatDate = (date: Date | string | null) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return fmtDate(d, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to get placeholder image
function getPlaceholderImage(index: number): string {
  const images = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80",
  ];
  return images[index % images.length];
}

const ARTICLES_PER_PAGE = 20;

const Author = () => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  
  // Fetch author data
  const { data: author, isLoading: isLoadingAuthor } = trpc.authors.getByUsername.useQuery(
    { username: id || "" },
    { enabled: !!id }
  );

  // Fetch author's articles with pagination
  const { data: articlesData, isLoading: isLoadingArticles, isFetching } = trpc.authors.getArticles.useQuery(
    { authorId: author?.id || 0, page, limit: ARTICLES_PER_PAGE },
    { enabled: !!author?.id }
  );

  // Update allArticles when data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (articlesData?.articles) {
      if (page === 1) {
        setAllArticles(articlesData.articles);
      } else if (!isFetching) {
        // Append new articles only when not fetching
        const existingIds = new Set(allArticles.map(a => a.id));
        const newArticles = articlesData.articles.filter(a => !existingIds.has(a.id));
        if (newArticles.length > 0) {
          setAllArticles(prev => [...prev, ...newArticles]);
        }
      }
      setHasLoadedInitial(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [articlesData?.articles?.length, page, isFetching]);

  // Fetch most popular articles for sidebar
  const { data: popularData } = trpc.news.list.useQuery({
    page: 1,
    limit: 5,
    sortBy: "viewCount",
    sortOrder: "desc",
  });

  const mostPopular = useMemo(() => {
    if (!popularData?.items) return [];
    return popularData.items.slice(0, 5).map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      categories: a.categories,
    }));
  }, [popularData]);

  const handleLoadMore = () => {
    setPage(p => p + 1);
  };

  if (isLoadingAuthor) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a0]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title={t("state.authorNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("state.authorNotFound")}</h1>
          <p className="text-muted-foreground mb-6">The author you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button>{t("state.backHome")}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = author.displayName || author.name || "Unknown Author";
  const firstName = displayName.split(" ")[0];
  const hasMore = articlesData?.hasMore || false;
  const totalArticles = author.articleCount || 0;
  const displayedArticles = allArticles.length > 0 ? allArticles : (articlesData?.articles || []);

  // Canonical: prefer the username (stable, what the route accepts).
  // If the param differs (e.g. someone visits via numeric id), Google
  // would otherwise see two URLs for the same author profile.
  const canonicalUsername = author.username || id;
  const authorCanonical = `${publication.siteUrl}/author/${canonicalUsername}`;
  const authorBio = (author as any).authorBio || (author as any).bio || `Articles and analysis by ${displayName} on ${publication.name}.`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`${displayName} | ${publication.name}`}
        description={String(authorBio).slice(0, 160)}
        canonical={authorCanonical}
        ogImage={author.avatar || undefined}
      />
      <Header />

      {/* Hero Section - Full Width Green Background */}
      <section className="w-full bd-ink">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            {/* Author Avatar */}
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 border-4 border-white/30">
              <AvatarImage src={author.avatar || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl sm:text-3xl lg:text-4xl bg-white/20 text-white">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Author Info */}
            <div className="flex-1">
              {author.jobTitle && (
                <p className="text-white/80 text-xs sm:text-sm uppercase tracking-widest mb-2">{author.jobTitle}</p>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                {displayName}
              </h1>
              
              {/* Social Links */}
              <div className="flex items-center gap-4 mb-6">
                {author.twitterHandle && (
                  <a 
                    href={`https://twitter.com/${author.twitterHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="text-sm">@{author.twitterHandle.replace('@', '')}</span>
                  </a>
                )}
                {author.email && (
                  <a 
                    href={`mailto:${author.email}`}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {author.linkedinUrl && (
                  <a 
                    href={author.linkedinUrl.startsWith('http') ? author.linkedinUrl : `https://linkedin.com/in/${author.linkedinUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* Bio */}
              {(author.authorBio || author.bio) && (
                <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-3xl mb-4">
                  {author.authorBio || author.bio}
                </p>
              )}
              
              {/* Topics */}
              {author.topics && author.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {author.topics.map((topic) => (
                    <Link key={topic.id} href={`/category/${topic.slug}`}>
                      <Badge 
                        className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {topic.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section with Sidebar */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Main Content - Article List */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 pb-2 border-b-2 border-[#0a0] inline-block">
              Latest from {firstName}
            </h2>
            
            {/* Article List */}
            {isLoadingArticles && !hasLoadedInitial ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#0a0]" />
              </div>
            ) : displayedArticles.length > 0 ? (
              <>
                <div className="divide-y divide-border">
                  {displayedArticles.map((article, idx) => (
                    <Link 
                      key={article.id}
                      href={getArticleUrl({ slug: article.slug, categories: article.category ? [article.category] : [] })}
                      className="group flex gap-4 sm:gap-6 py-5 first:pt-0"
                    >
                      {/* Article Image */}
                      <div className="w-[140px] sm:w-[180px] lg:w-[200px] flex-shrink-0">
                        <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={article.featuredImageUrl || getPlaceholderImage(idx)}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                      
                      {/* Article Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        {article.category && (
                          <span className="text-[#0a0] text-xs font-semibold uppercase tracking-wider">
                            {article.category.name}
                          </span>
                        )}
                        <h3 className="font-bold text-foreground text-base sm:text-lg lg:text-xl leading-snug group-hover:text-[#0a0] transition-colors mt-1 mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {displayName} · {formatDate(article.publishedAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={handleLoadMore}
                      variant="outline"
                      size="lg"
                      disabled={isFetching}
                      className="px-8 border-[#0a0] text-[#0a0] hover:bd-ink hover:text-white"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t("state.loading")}
                        </>
                      ) : (
                        "Load More Articles"
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Article Count */}
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  Showing {displayedArticles.length} of {totalArticles} articles
                </p>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t("state.noArticlesYet")}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[320px] xl:w-[340px] flex-shrink-0 space-y-6">
            {/* Ad Placeholder */}
            <div className="bg-muted rounded-xl p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("common.advertisement")}</p>
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg aspect-[4/3] flex items-center justify-center">
                <span className="text-muted-foreground text-sm">{t("common.adSpace")}</span>
              </div>
            </div>

            {/* Most Popular */}
            {mostPopular.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="h-5 w-5 text-[#0a0]" />
                  <h3 className="font-bold text-lg text-foreground">{t("list.mostRead")}</h3>
                </div>
                <div className="space-y-4">
                  {mostPopular.map((item, idx) => (
                    <Link 
                      key={item.id} 
                      href={getArticleUrl({ slug: item.slug, categories: item.categories || [] })} 
                      className="group flex gap-3"
                    >
                      <span className="text-2xl font-bold text-muted-foreground/50 group-hover:text-[#0a0] transition-colors">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-foreground group-hover:text-[#0a0] transition-colors leading-snug flex-1">
                        {item.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter CTA */}
            <div className="bd-ink rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-lg">BD</span>
                <span className="text-sm opacity-90">{publication.newsletter.name}</span>
              </div>
              <p className="text-sm opacity-90 leading-relaxed mb-4">
                The top industrial, infrastructure and energy stories from Saudi Arabia, the GCC and MENA — in your inbox every morning.
              </p>
              <Button className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-full">
                Subscribe →
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
        <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
};

export default Author;
