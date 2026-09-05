import { useState, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { Link, useParams } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { RailBlock, RankedList, SectionHead, StoryRow } from "@/components/editorial";
import {
  AboutDeskRail,
  BeatsRail,
  LatestRail,
  NewsletterRail,
  Rail,
  TopicsRail,
} from "@/components/editorial/rails";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Twitter, Mail, Linkedin, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        title={`${displayName}${author.jobTitle ? ` — ${author.jobTitle}` : ""} | ${publication.name}`}
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
            <SectionHead title={t("author.latestFrom", { name: firstName })} />

            {/* Article List */}
            {isLoadingArticles && !hasLoadedInitial ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              </div>
            ) : displayedArticles.length > 0 ? (
              <>
                <div className="bd-list">
                  {displayedArticles.map((article) => (
                    <StoryRow key={article.id} article={article as any} />
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
                      className="px-8 border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t("state.loading")}
                        </>
                      ) : (
                        t("list.loadMore")
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

          {/* The rail */}
          <Rail className="w-full lg:w-[320px] xl:w-[340px] flex-shrink-0">
            {/* A real slot, not a mock. This carried a drawn "ad space"
                panel that no advertiser had ever bought. */}
            <SidebarAd slotKey="author-sidebar" />

            {mostPopular.length > 0 && (
              <RailBlock title={t("list.mostRead")} href="/news">
                <RankedList articles={mostPopular as any} />
              </RailBlock>
            )}

            <NewsletterRail source="author-rail" />
            <LatestRail limit={6} />
            <BeatsRail />
            <TopicsRail />
            <AboutDeskRail />
          </Rail>
        </div>
      </section>

      <Footer />
        <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
};

export default Author;
