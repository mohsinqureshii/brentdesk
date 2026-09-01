import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/JsonLd";
import { SEO } from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { Link } from "wouter";
import { Clock, ChevronRight, Play, ArrowRight, Mail, Plus, Rocket, Star, TrendingUp, TrendingDown, ChevronLeft, ChevronDown, Building2, MapPin, Briefcase, Users, DollarSign, ExternalLink, Bookmark, Loader2, Calendar, Headphones, Video, Newspaper, Zap, Shield, Cpu, Car, Smartphone, Mic, Eye, Flame, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { getArticleUrl } from "@/lib/articleUrl";
import { SidebarAd as SidebarAdComponent, LeaderboardAd, InContentAd, MobileStickyAd, AdUnit } from "@/components/ads/AdUnit";
import { SubmitStartupDialog } from "@/components/public/SubmitStartupDialog";

// Fallback stock data (used when API is unavailable)
const fallbackStockCategories = [
  { id: 'global', label: 'Global Tech' },
  { id: 'uae', label: 'UAE Stocks' },
  { id: 'saudi', label: 'Saudi Stocks' },
  { id: 'qatar', label: 'Qatar Stocks' },
];

const fallbackStocks: Record<string, Array<{ symbol: string; name: string; price: number; change: number; changePercent: number }>> = {
  global: [
    { symbol: "^IXIC", name: "Nasdaq", price: 23501.24, change: 65.23, changePercent: 0.28 },
    { symbol: "GOOGL", name: "Alphabet", price: 327.93, change: -2.56, changePercent: -0.78 },
    { symbol: "AAPL", name: "Apple Inc.", price: 248.04, change: -0.30, changePercent: -0.12 },
    { symbol: "^DJI", name: "Dow Jones", price: 49098.71, change: -285.12, changePercent: -0.58 },
    { symbol: "MSFT", name: "Microsoft", price: 465.95, change: 15.12, changePercent: 3.35 },
  ],
  uae: [
    { symbol: "ETISALAT", name: "e&", price: 24.50, change: 0.35, changePercent: 1.45 },
    { symbol: "FAB", name: "First Abu Dhabi Bank", price: 14.82, change: 0.18, changePercent: 1.23 },
    { symbol: "EMAAR", name: "Emaar Properties", price: 8.45, change: -0.12, changePercent: -1.40 },
    { symbol: "DIB", name: "Dubai Islamic Bank", price: 5.67, change: 0.08, changePercent: 1.43 },
  ],
  saudi: [
    { symbol: "ARAMCO", name: "Saudi Aramco", price: 28.45, change: 0.15, changePercent: 0.53 },
    { symbol: "ALRAJHI", name: "Al Rajhi Bank", price: 96.50, change: 1.20, changePercent: 1.26 },
    { symbol: "STC", name: "Saudi Telecom", price: 42.30, change: -0.35, changePercent: -0.82 },
    { symbol: "SNB", name: "Saudi National Bank", price: 38.80, change: 0.45, changePercent: 1.17 },
  ],
  qatar: [
    { symbol: "QNBK", name: "Qatar National Bank", price: 17.45, change: 0.12, changePercent: 0.69 },
    { symbol: "IQCD", name: "Industries Qatar", price: 12.80, change: -0.15, changePercent: -1.16 },
    { symbol: "QEWS", name: "Qatar Electricity", price: 15.30, change: 0.08, changePercent: 0.53 },
    { symbol: "QIBK", name: "Qatar Islamic Bank", price: 21.60, change: 0.25, changePercent: 1.17 },
  ],
};

// Helper function to format time ago
function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Recently";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// Helper to get placeholder image
function getPlaceholderImage(index: number): string {
  const images = [
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&auto=format&fit=crop&q=80",
  ];
  return images[index % images.length];
}

// Section accent colors
const sectionColors: Record<string, string> = {
  "ai": "#8B5CF6",
  "artificial-intelligence": "#8B5CF6",
  "startups": "#10B981",
  "security": "#EF4444",
  "venture": "#F59E0B",
  "apps": "#EC4899",
  "transportation": "#3B82F6",
  "in-brief": "#6B7280",
  "podcasts": "#8B5CF6",
  "videos": "#EF4444",
  "events-section": "#F59E0B",
  "events-conferences": "#F59E0B",
  "fintech-section": "#3B82F6",
  "fintech": "#3B82F6",
  "media-gaming-section": "#EC4899",
  "media-gaming-creator-economy": "#EC4899",
  "default": "#000000",
};

// Section icons
const sectionIcons: Record<string, React.ReactNode> = {
  "ai": <Cpu className="h-4 w-4" />,
  "artificial-intelligence": <Cpu className="h-4 w-4" />,
  "startups": <Rocket className="h-4 w-4" />,
  "security": <Shield className="h-4 w-4" />,
  "venture": <DollarSign className="h-4 w-4" />,
  "apps": <Smartphone className="h-4 w-4" />,
  "transportation": <Car className="h-4 w-4" />,
  "in-brief": <Zap className="h-4 w-4" />,
  "podcasts": <Mic className="h-4 w-4" />,
  "videos": <Video className="h-4 w-4" />,
  "events-section": <Calendar className="h-4 w-4" />,
  "events-conferences": <Calendar className="h-4 w-4" />,
  "fintech-section": <DollarSign className="h-4 w-4" />,
  "fintech": <DollarSign className="h-4 w-4" />,
  "media-gaming-section": <Play className="h-4 w-4" />,
  "media-gaming-creator-economy": <Play className="h-4 w-4" />,
};

// Section Header Component
const SectionHeader = ({ 
  title, 
  color = "#000000", 
  link,
  icon
}: { 
  title: string; 
  color?: string; 
  link?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 pb-2 border-b border-border">
    <span 
      className="w-1 h-4 md:h-5 rounded-sm" 
      style={{ backgroundColor: color }}
    />
    {icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 md:[&>svg]:h-4 md:[&>svg]:w-4" style={{ color }}>{icon}</span>}
    <h2 className="text-sm md:text-lg font-bold text-foreground">{title}</h2>
    {link && (
      <Link href={link} className="ml-auto text-[10px] md:text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
        More <ChevronRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

// Article Card Components
interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: Date | string | null;
  viewCount?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  author?: { name: string } | null;
  categories?: Array<{ name: string; slug: string }>;
}

// Featured Article Card (Large)
const FeaturedArticleCard = ({ article, index }: { article: Article; index: number }) => (
  <Link href={getArticleUrl(article)} className="group block">
    <article className="relative overflow-hidden rounded-lg aspect-[16/10]">
      <img 
        src={article.featuredImageUrl || getPlaceholderImage(index)} 
        alt={article.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      {(article.categoryName || article.categories?.[0]?.name) && (
        <Badge className="absolute top-3 left-3 bg-black/60 text-white border-none text-xs">
          {article.categoryName || article.categories?.[0]?.name}
        </Badge>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-white font-bold text-lg leading-tight mb-2 group-hover:text-primary-foreground transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <span>{article.author?.name || "TechScoop"}</span>
          <span>•</span>
          <span>{formatTimeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  </Link>
);

// Compact Article Card - Proper mobile sizing
const CompactArticleCard = ({ article, index, showImage = true }: { article: Article; index: number; showImage?: boolean }) => (
  <Link href={getArticleUrl(article)} className="group flex gap-4 py-4 border-b border-border last:border-0 overflow-hidden">
    {showImage && (
      <div className="shrink-0 w-20 h-16 md:w-24 md:h-[72px] rounded-lg overflow-hidden">
        <img 
          src={article.featuredImageUrl || getPlaceholderImage(index)} 
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    )}
    <div className="flex-1 min-w-0 overflow-hidden">
      {(article.categoryName || article.categories?.[0]?.name) && (
        <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide block">
          {article.categoryName || article.categories?.[0]?.name}
        </span>
      )}
      <h4 className="text-xs md:text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors break-words">
        {article.title}
      </h4>
      <span className="text-[10px] md:text-xs text-muted-foreground mt-1 block">
        {formatTimeAgo(article.publishedAt)}
      </span>
    </div>
  </Link>
);

// List Article Card (No image, compact)
const ListArticleCard = ({ article }: { article: Article }) => (
  <Link href={getArticleUrl(article)} className="group block py-2 border-b border-border last:border-0">
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground text-xs mt-0.5">•</span>
      <div>
        <h4 className="text-sm text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h4>
        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(article.publishedAt)}</span>
      </div>
    </div>
  </Link>
);

// Category Section Component - Fetches articles from backend API
const CategorySection = ({ 
  section
}: { 
  section: {
    id: number;
    name: string;
    slug: string;
    sectionType: string;
    accentColor?: string | null;
    layout?: string | null;
    showViewMore?: boolean | null;
    viewMoreUrl?: string | null;
    categorySlug?: string | null;
    articleCount?: number | null;
  };
}) => {
  // Fetch articles for this specific section from the backend
  const { data: articles = [], isLoading } = trpc.admin.homepage.getSectionArticles.useQuery({
    sectionId: section.id,
    limit: section.articleCount || 5,
  });
  
  const color = section.accentColor || sectionColors[section.slug] || sectionColors.default;
  const icon = sectionIcons[section.slug];
  const viewMoreLink = section.viewMoreUrl || (section.categorySlug ? `/category/${section.categorySlug}` : `/news`);
  
  // Show loading state or skip if no articles
  if (isLoading) {
    return (
      <section className="mb-10">
        <SectionHeader title={section.name} color={color} icon={icon} />
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }
  
  if (!articles || articles.length === 0) {
    return null;
  }
  
  // In Brief section - two column list layout
  if (section.layout === "list" || section.sectionType === "in_brief" || section.slug === "in-brief") {
    return (
      <section className="mb-8">
        <SectionHeader 
          title={section.name} 
          color={color} 
          link={section.showViewMore ? viewMoreLink : undefined}
          icon={icon}
        />
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-0">
          {articles.map((article) => (
            <ListArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    );
  }
  
  // Default category layout - Featured article left, compact list right (matches design)
  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 5);
  
  return (
    <section className="mb-4 overflow-hidden">
      <SectionHeader 
        title={section.name} 
        color={color} 
        link={section.showViewMore ? viewMoreLink : undefined}
        icon={icon}
      />
      {/* Mobile: Horizontal scroll, Desktop: Grid */}
      <div className="md:grid md:grid-cols-2 gap-4 md:gap-6 md:items-stretch">
        {/* Mobile: Cards in horizontal scroll with proper sizing */}
        <div className="flex md:hidden gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
          {articles.slice(0, 5).map((article, idx) => (
            <Link key={article.id} href={getArticleUrl(article)} className="group shrink-0 w-[140px] overflow-hidden">
              <div className="rounded-lg overflow-hidden aspect-[4/3] mb-1.5">
                <img 
                  src={article.featuredImageUrl || getPlaceholderImage(idx)} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase block">
                {article.categoryName}
              </span>
              <h4 className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 mt-0.5 break-words">
                {article.title}
              </h4>
            </Link>
          ))}
        </div>
        
        {/* Desktop: Featured Article with image */}
        {mainArticle && (
          <div className="hidden md:block">
            <Link href={getArticleUrl(mainArticle)} className="group block">
              <div className="rounded-lg overflow-hidden aspect-[4/3] mb-3">
                <img 
                  src={mainArticle.featuredImageUrl || getPlaceholderImage(0)} 
                  alt={mainArticle.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {mainArticle.categoryName}
              </span>
              <h3 className="text-base font-semibold text-foreground leading-tight mt-1 group-hover:text-primary transition-colors line-clamp-2">
                {mainArticle.title}
              </h3>
              {mainArticle.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{mainArticle.excerpt}</p>
              )}
              <span className="text-xs text-muted-foreground mt-2 block">{formatTimeAgo(mainArticle.publishedAt)}</span>
            </Link>
          </div>
        )}
        
        {/* Desktop: Compact article list - stretch to fill full height */}
        <div className="hidden md:flex md:flex-col">
          {sideArticles.map((article, idx) => (
            <div key={article.id} className="flex-1 flex border-b border-border last:border-0">
              <Link href={getArticleUrl(article)} className="group flex gap-4 items-center w-full py-2">
                <div className="shrink-0 w-24 h-[72px] rounded-lg overflow-hidden">
                  <img 
                    src={article.featuredImageUrl || getPlaceholderImage(idx + 1)} 
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  {article.categoryName && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
                      {article.categoryName}
                    </span>
                  )}
                  <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors break-words">
                    {article.title}
                  </h4>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Pastel background colors for trending cards
const trendingPastelColors = [
  "bg-pink-100",
  "bg-blue-100", 
  "bg-green-100",
  "bg-yellow-100",
  "bg-purple-100",
  "bg-orange-100",
  "bg-cyan-100",
  "bg-rose-100",
];

// Trending Now Section - Horizontal scroll with proper overflow handling
const TrendingSection = ({ articles }: { articles: Article[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 160;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <section className="mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Trending Now" color="#EF4444" icon={<TrendingUp className="h-4 w-4" />} />
        <div className="hidden sm:flex items-center gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <Link href="/news" className="text-xs text-muted-foreground hover:text-foreground ml-2">
            View all
          </Link>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:-mx-0 md:px-0"
      >
        {articles.map((article, idx) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)} 
            className={`group shrink-0 w-[140px] md:w-[200px] rounded-lg p-2.5 md:p-4 ${trendingPastelColors[idx % trendingPastelColors.length]} hover:shadow-md transition-all overflow-hidden`}
          >
            <Badge variant="outline" className="mb-1.5 bg-white/80 border-none text-[9px] md:text-xs font-medium px-1.5 py-0.5">
              {article.categoryName || article.categories?.[0]?.name || "News"}
            </Badge>
            <h4 className="text-[11px] md:text-sm font-bold text-foreground leading-tight line-clamp-3 group-hover:text-primary transition-colors mb-1.5 break-words">
              {article.title}
            </h4>
            <div className="flex items-center gap-1 text-[9px] md:text-xs text-muted-foreground">
              <span className="truncate max-w-[50px] md:max-w-none">{article.author?.name || "TechScoop"}</span>
              <span>•</span>
              <span className="shrink-0">{formatTimeAgo(article.publishedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// Latest Headlines Section - Responsive grid with proper text wrapping
const LatestHeadlines = ({ articles }: { articles: Article[] }) => (
  <section className="mb-4 overflow-hidden">
    <SectionHeader title="Latest Headlines" color="#000000" link="/news" icon={<Newspaper className="h-4 w-4" />} />
    {/* Mobile: 2 columns, Desktop: 4 columns */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {articles.slice(0, 4).map((article, idx) => (
        <Link key={article.id} href={getArticleUrl(article)} className="group overflow-hidden">
          <div className="rounded-lg overflow-hidden aspect-[16/10] mb-2">
            <img 
              src={article.featuredImageUrl || getPlaceholderImage(idx)} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide block">
            {article.categoryName || article.categories?.[0]?.name}
          </span>
          <h4 className="text-xs md:text-sm font-semibold text-foreground leading-tight line-clamp-2 mt-1 group-hover:text-primary transition-colors break-words">
            {article.title}
          </h4>
        </Link>
      ))}
    </div>
  </section>
);

// Latest News Section - Vertical list with proper text wrapping
const LatestNews = ({ articles }: { articles: Article[] }) => (
  <section className="mb-4 overflow-hidden">
    <SectionHeader title="Latest News" color="#000000" link="/news" />
    <div className="divide-y divide-border">
      {articles.map((article, idx) => (
        <Link key={article.id} href={getArticleUrl(article)} className="group flex gap-3 py-3 first:pt-0">
          {/* Thumbnail */}
          <div className="shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-lg overflow-hidden">
            <img 
              src={article.featuredImageUrl || getPlaceholderImage(idx)} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase block">
              {article.categoryName || article.categories?.[0]?.name}
            </span>
            <h4 className="text-xs md:text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors break-words">
              {article.title}
            </h4>
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mt-1">
              <span className="truncate max-w-[80px] md:max-w-none">{article.author?.name || "TechScoop"}</span>
              <span>•</span>
              <span className="shrink-0">{formatTimeAgo(article.publishedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

// Premium Banner - Bloomberg-style compact
const PremiumBanner = () => (
  <div className="bg-[#1a1a1a] rounded-lg p-2.5 md:p-6 mb-3 md:mb-4">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className="font-bold text-white text-xs md:text-lg">TechScoop Premium</h3>
        <p className="text-[9px] md:text-sm text-white/70 truncate">Unlimited MENA tech news</p>
      </div>
      <Button size="sm" className="shrink-0 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-[10px] md:text-xs px-2 md:px-6 h-7 md:h-8">
        Subscribe
      </Button>
    </div>
  </div>
);

// Videos Section
const VideosSection = ({ articles }: { articles: Article[] }) => (
  <section className="mb-8">
    <SectionHeader title="Videos" color="#EF4444" link="/videos" icon={<Video className="h-4 w-4" />} />
    <div className="grid grid-cols-2 gap-4">
      {articles.slice(0, 2).map((article, idx) => (
        <Link key={article.id} href={getArticleUrl(article)} className="group relative">
          <div className="rounded-lg overflow-hidden aspect-video">
            <img 
              src={article.featuredImageUrl || getPlaceholderImage(idx)} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-5 w-5 text-black ml-0.5" />
              </div>
            </div>
          </div>
          <h4 className="text-xs font-medium text-foreground leading-tight line-clamp-2 mt-2 group-hover:text-primary transition-colors">
            {article.title}
          </h4>
        </Link>
      ))}
    </div>
  </section>
);

// Sidebar Components
interface Job {
  id: number;
  title: string;
  companyName: string;
  location: string | null;
  slug: string;
}

interface Event {
  id: number;
  title: string;
  startDate?: Date | string | null;
  location?: string | null;
  slug: string;
}

const SidebarJobs = ({ jobs }: { jobs: Job[] }) => (
  <div className="bg-card border border-border rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-sm text-foreground">Recent Jobs</h3>
      <Link href="/jobs" className="text-xs text-primary hover:underline">View all</Link>
    </div>
    <div className="space-y-3">
      {jobs.slice(0, 4).map((job) => (
        <Link key={job.id} href={`/jobs/${job.slug}`} className="group block">
          <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {job.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{job.companyName}</span>
            {job.location && (
              <>
                <span>•</span>
                <span>{job.location}</span>
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const SidebarEvents = ({ events }: { events: Event[] }) => (
  <div className="bg-card border border-border rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-sm text-foreground">Upcoming Events</h3>
      <Link href="/events" className="text-xs text-primary hover:underline">View all</Link>
    </div>
    <div className="space-y-3">
      {events.slice(0, 3).map((event) => (
        <Link key={event.id} href={`/events/${event.slug}`} className="group block">
          <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {event.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {event.startDate && (
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
            )}
            {event.location && (
              <>
                <span>•</span>
                <span>{event.location}</span>
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const SidebarQuickLinks = () => (
  <div className="bg-card border border-border rounded-lg p-4 mb-4">
    <h3 className="font-bold text-sm text-foreground mb-3">Quick Links</h3>
    <div className="space-y-2">
      {[
        { label: "Submit News Tip", href: "/submit" },
        { label: "Advertise With Us", href: "/advertise" },
        { label: "About TechScoop", href: "/about" },
        { label: "Contact Us", href: "/contact" },
      ].map((link) => (
        <Link 
          key={link.href} 
          href={link.href}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronRight className="h-3 w-3" />
          {link.label}
        </Link>
      ))}
    </div>
  </div>
);

const SidebarPodcast = () => (
  <div className="bg-card border border-border rounded-lg p-4 mb-4">
    <h3 className="font-bold text-sm text-foreground mb-3">Latest Podcast</h3>
    <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
      <img 
        src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&auto=format&fit=crop&q=80"
        alt="Podcast"
        className="w-full h-full object-cover"
      />
    </div>
    <h4 className="text-sm font-medium text-foreground line-clamp-2">
      The Future of MENA Tech Ecosystem
    </h4>
    <p className="text-xs text-muted-foreground mt-1">Episode 42 • 45 min</p>
    <Button size="sm" variant="outline" className="w-full mt-3">
      <Headphones className="h-4 w-4 mr-2" />
      Listen Now
    </Button>
  </div>
);

const SidebarNewsletter = ({ onSubmitClick }: { onSubmitClick: () => void }) => (
  <div className="bg-black text-white rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Rocket className="h-5 w-5" />
      <h3 className="font-bold text-sm">Get Featured</h3>
    </div>
    <p className="text-xs opacity-90 mb-3">
      Submit your startup to get featured on TechScoop and reach thousands of readers.
    </p>
    <Button size="sm" className="w-full bg-white text-black hover:bg-white/90 font-medium" onClick={onSubmitClick}>
      Submit Your Startup
    </Button>
  </div>
);

const SidebarAd = () => (
  <div className="mb-4">
    <SidebarAdComponent slotKey="home-sidebar-top" />
  </div>
);

// Most Read Sidebar Widget
const SidebarMostRead = () => {
  const { data: mostReadArticles = [] } = trpc.news.getMostRead.useQuery({ limit: 5, days: 30 });
  
  if (mostReadArticles.length === 0) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="font-bold text-sm text-foreground">Most Read</h3>
      </div>
      <div className="space-y-0">
        {mostReadArticles.map((article: any, idx: number) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)}
            className="group flex gap-3 py-2.5 border-b border-border last:border-0"
          >
            <span className="text-2xl font-bold text-muted-foreground/40 leading-none w-6 shrink-0 pt-0.5">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {article.viewCount != null && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />
                    {article.viewCount.toLocaleString()}
                  </span>
                )}
                {article.publishedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(new Date(article.publishedAt))}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Editor's Picks Sidebar Widget
const SidebarEditorPicks = () => {
  const { data: editorPicks = [] } = trpc.news.getEditorPicks.useQuery({ limit: 4 });
  
  if (editorPicks.length === 0) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-4 w-4 text-amber-500" />
        <h3 className="font-bold text-sm text-foreground">Editor's Picks</h3>
      </div>
      <div className="space-y-3">
        {editorPicks.map((article: any, idx: number) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)}
            className="group block"
          >
            {idx === 0 && article.featuredImageUrl && (
              <div className="rounded-lg overflow-hidden aspect-[16/9] mb-2">
                <img 
                  src={article.featuredImageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h4>
            {idx === 0 && article.excerpt && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
            )}
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {article.publishedAt ? formatTimeAgo(new Date(article.publishedAt)) : ''}
            </span>
            {idx < editorPicks.length - 1 && <div className="border-b border-border mt-3" />}
          </Link>
        ))}
      </div>
    </div>
  );
};

// Featured Companies Section
const FeaturedCompanies = () => {
  const { editionCountryId } = useEdition();
  const { data: companiesData } = trpc.companies.list.useQuery({
    limit: 4,
    editionCountryId: editionCountryId ?? undefined,
  });
  
  if (!companiesData?.items?.length) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-foreground">Featured Companies</h3>
        <Link href="/companies" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {companiesData.items.slice(0, 4).map((company: { id: number; name: string; slug: string; logo: string | null }) => (
          <Link 
            key={company.id} 
            href={`/companies/${company.slug}`}
            className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
          >
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs font-medium text-foreground truncate">{company.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

// TechScoop Daily Newsletter
const TechScoopDaily = () => (
  <div className="bg-card border border-border rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Mail className="h-5 w-5 text-primary" />
      <h3 className="font-bold text-sm text-foreground">TechScoop Daily</h3>
    </div>
    <p className="text-xs text-muted-foreground mb-3">
      Get the latest MENA tech news delivered to your inbox every morning.
    </p>
    <div className="flex gap-2">
      <input 
        type="email" 
        placeholder="Your email"
        className="flex-1 px-3 py-1.5 text-xs border border-border rounded bg-background"
      />
      <Button size="sm">Subscribe</Button>
    </div>
  </div>
);

// Podcasts Section
const PodcastsSection = () => (
  <section className="mb-8">
    <SectionHeader title="Podcasts" color="#8B5CF6" link="/podcasts" icon={<Mic className="h-4 w-4" />} />
    <div className="grid grid-cols-2 gap-4">
      {[
        { title: "Bulletproof", host: "Ryan Holiday", image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=200" },
        { title: "Sasha", host: "Sasha Pieterse", image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=200" },
      ].map((podcast, idx) => (
        <Link key={idx} href="/podcasts" className="group flex gap-3 items-center">
          <div className="w-12 h-12 rounded overflow-hidden shrink-0">
            <img src={podcast.image} alt={podcast.title} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{podcast.title}</h4>
            <p className="text-xs text-muted-foreground">{podcast.host}</p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);



// Main News Page Component
export default function News() {
  const [activeStockTab, setActiveStockTab] = useState('global');
  const [showDropdown, setShowDropdown] = useState(false);
  const [openSubmitStartup, setOpenSubmitStartup] = useState(false);
  
  // Fetch homepage sections from backend
  const { data: sections, isLoading: sectionsLoading } = trpc.admin.homepage.getSections.useQuery();

  // Edition bias — the homepage threads the visitor's country into
  // every section query so the lead story, sidebars, and section
  // tiles all bias toward their country before falling back to the
  // global feed.
  const { editionCountryId } = useEdition();

  // Fetch articles for display - sort by publishedAt to show newest published first
  const { data: articlesData, isLoading: articlesLoading } = trpc.news.list.useQuery({
    limit: 50,
    status: "published",
    sortBy: "publishedAt",
    sortOrder: "desc",
    editionCountryId: editionCountryId ?? undefined,
  });

  // Fetch flash news
  const { data: flashNewsData } = trpc.news.getFlashNews.useQuery();

  // Fetch jobs for sidebar
  const { data: jobsData } = trpc.jobs.list.useQuery({
    editionCountryId: editionCountryId ?? undefined,
  });

  // Fetch events for sidebar
  const { data: eventsData } = trpc.events.list.useQuery({
    editionCountryId: editionCountryId ?? undefined,
  });
  
  // Stock data
  const stockCategories = fallbackStockCategories;
  const techStocks = fallbackStocks[activeStockTab] || fallbackStocks.global;
  
  const articles = articlesData?.items || [];
  const jobs = jobsData?.items || [];
  const events = eventsData?.items || [];
  
  // Organize articles by category
  const articlesByCategory: Record<number, Article[]> = {};
  articles.forEach((article: any) => {
    const catId = article.primaryCategoryId || 0;
    if (!articlesByCategory[catId]) {
      articlesByCategory[catId] = [];
    }
    articlesByCategory[catId].push(article as Article);
  });
  
  // Hero article and sidebar articles
  const heroArticle = articles[0] as Article | undefined;
  const sidebarArticles = articles.slice(1, 4) as Article[];
  const trendingArticles = articles.slice(0, 6) as Article[];
  const headlineArticles = articles.slice(4, 8) as Article[];
  const latestNewsArticles = articles.slice(8, 14) as Article[];
  
  // Flash news items
  const flashNewsItems = (flashNewsData && flashNewsData.length > 0 
    ? flashNewsData 
    : articles.slice(0, 5)
  ).map((article: any, idx: number) => ({
    id: article.id,
    text: `${['🚀', '💰', '📱', '🌍', '🎮'][idx % 5]} ${article.title}`,
    link: getArticleUrl(article),
  }));
  
  const activeCategory = stockCategories.find(c => c.id === activeStockTab) || stockCategories[0];
  
  if (articlesLoading) {
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
  
  // Get articles for a specific section based on category
  const getSectionArticles = (section: any) => {
    if (!section) return [];
    const categoryId = section.categoryId;
    if (categoryId && articlesByCategory[categoryId]) {
      return articlesByCategory[categoryId].slice(0, section.articleCount || 5);
    }
    // Fallback to latest articles
    return articles.slice(0, section.articleCount || 5) as Article[];
  };
  
  // Filter sections by position
  const mainSections = sections?.filter(s => s.position === 'main') || [];
  const sidebarSections = sections?.filter(s => s.position === 'sidebar') || [];
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* SEO Meta Tags for Homepage */}
      <SEO
        title="MENA's Tech Ecosystem Platform - Startups, Investors, Jobs & Events"
        description="TechScoop is MENA's leading technology publication covering startups, venture capital, tech jobs, and innovation across the Middle East and North Africa. Get the latest tech news, funding announcements, and industry insights."
        canonical="https://techscoop.io/"
        keywords="MENA tech news, Middle East startups, tech jobs Dubai, Saudi Arabia technology, UAE venture capital, Arab tech ecosystem, startup funding, tech events MENA, innovation Middle East, fintech MENA"
        ogImage="/assets/og-image.png"
        ogType="website"
      />
      {/* JSON-LD Structured Data for SEO */}
      <JsonLd
        type="Organization"
        data={{
          name: "TechScoop",
          url: "https://techscoop.io",
          logo: "/assets/logo.png",
          description: "MENA's leading tech ecosystem platform covering startups, investors, jobs, and events across the Middle East and North Africa.",
          sameAs: [
            "https://twitter.com/TechScoopMENA",
            "https://linkedin.com/company/techscoop",
            "https://facebook.com/TechScoopMENA"
          ],
          contactPoint: {
            type: "ContactPoint",
            email: "contact@techscoop.io",
            contactType: "customer service"
          }
        }}
      />
      <JsonLd
        type="WebSite"
        data={{
          name: "TechScoop",
          url: "https://techscoop.io",
          description: "MENA's Tech Ecosystem Platform - Startups, Investors, Jobs & Events",
          potentialAction: {
            type: "SearchAction",
            target: "https://techscoop.io/search?q={search_term_string}",
            queryInput: "required name=search_term_string"
          }
        }}
      />
      <Header />
      
      {/* Flash News Bar */}
      <div className="w-full bg-[#2b1b17] text-white overflow-hidden">
        <div className="flex items-center h-10">
          {/* Fixed FLASH badge */}
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded ml-3 sm:ml-6 lg:ml-8 mr-4 shrink-0 z-10">FLASH</span>
          {/* Scrolling ticker strip — clips to remaining width */}
          <div className="flex-1 overflow-hidden relative">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-[#2b1b17] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[#2b1b17] to-transparent z-10 pointer-events-none" />
            {/* Marquee track — two identical sets for seamless loop */}
            <div className="animate-marquee">
              {flashNewsItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="mx-8 hover:text-yellow-400 transition-colors cursor-pointer text-sm font-medium"
                >
                  {item.text}
                </Link>
              ))}
              {/* Duplicate set for seamless loop */}
              {flashNewsItems.map((item) => (
                <Link
                  key={`dup-${item.id}`}
                  href={item.link}
                  className="mx-8 hover:text-yellow-400 transition-colors cursor-pointer text-sm font-medium"
                >
                  {item.text}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stocks Ticker */}
      <div className="w-full bg-[#666362] text-white border-b border-border">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center h-12">
            <div className="relative shrink-0 mr-4">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-background hover:bg-background/10 rounded transition-colors"
              >
                {activeCategory.label}
                <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                  {stockCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveStockTab(category.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                        activeStockTab === category.id ? 'text-foreground font-medium bg-muted' : 'text-muted-foreground'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Auto-scrolling stock strip */}
            <div className="flex-1 overflow-hidden relative">
              {/* Fade edges */}
              <div className="absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-[#666362] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-[#666362] to-transparent z-10 pointer-events-none" />
              {/* Scrolling track — duplicated for seamless loop */}
              <div className="animate-stock-scroll items-center gap-8">
                {techStocks.map((stock) => (
                  <span key={stock.symbol} className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-sm">{stock.symbol}</span>
                    <span className="text-sm text-white/70">{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`flex items-center text-xs font-medium ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.change >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                      {stock.change >= 0 ? '▲' : '▼'}{Math.abs(stock.changePercent).toFixed(2)}%
                    </span>
                    <span className="text-white/30 mx-2">|</span>
                  </span>
                ))}
                {/* Duplicate for seamless loop */}
                {techStocks.map((stock) => (
                  <span key={`dup-${stock.symbol}`} className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-sm">{stock.symbol}</span>
                    <span className="text-sm text-white/70">{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`flex items-center text-xs font-medium ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.change >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                      {stock.change >= 0 ? '▲' : '▼'}{Math.abs(stock.changePercent).toFixed(2)}%
                    </span>
                    <span className="text-white/30 mx-2">|</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>



      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6 overflow-x-hidden">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-9 overflow-hidden">
            {/* Dynamic Sections - Rendered based on sectionType from database */}
            {mainSections.map((section, sectionIndex) => {
              // Check if section is active
              if (!section.isActive) return null;
              
              // In-feed ad insertion: show mobile-visible ads between sections
              // Insert after every 3rd visible section (indices 2, 5, 8...)
              const adSlotKeys = ['home-in-feed-1', 'home-in-feed-2', 'home-in-feed-3'];
              const adIndex = Math.floor(sectionIndex / 3) - 1;
              const showInFeedAd = sectionIndex > 0 && sectionIndex % 3 === 0 && adIndex >= 0 && adIndex < adSlotKeys.length;
              
              const sectionContent = (() => {
              // Render based on sectionType
              switch (section.sectionType) {
                case 'hero':
                  return heroArticle ? (
                    <section key={section.id} className="mb-4 overflow-hidden">
                      <div className="flex flex-col md:grid md:grid-cols-5 gap-3 md:gap-4">
                        <Link href={getArticleUrl(heroArticle)} className="group md:col-span-3">
                          <article className="relative">
                            <div className="relative overflow-hidden rounded-lg h-[200px] md:h-auto md:aspect-[4/3]">
                              <img 
                                src={heroArticle.featuredImageUrl || getPlaceholderImage(0)} 
                                alt={heroArticle.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
                              {heroArticle.categories?.[0] && (
                                <Badge className="absolute top-2 left-2 md:top-4 md:left-4 bg-black text-white border-none rounded px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs">
                                  {heroArticle.categories[0].name}
                                </Badge>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
                                <h2 className="text-white font-bold text-sm md:text-2xl leading-tight mb-1 md:mb-2 group-hover:text-primary-foreground transition-colors line-clamp-2 break-words">
                                  {heroArticle.title}
                                </h2>
                                {heroArticle.excerpt && (
                                  <p className="text-white/70 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2 break-words">
                                    {heroArticle.excerpt}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 text-white/80 text-[10px] md:text-sm">
                                  <span>{heroArticle.author?.name || "TechScoop"}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(heroArticle.publishedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        </Link>
                        <div className="md:col-span-2 flex flex-col gap-2 md:gap-3">
                          {sidebarArticles.slice(0, 2).map((article) => (
                            <Link 
                              key={article.id} 
                              href={getArticleUrl(article)} 
                              className="group bg-muted/30 rounded-lg p-3 md:p-5 hover:bg-muted/50 transition-colors flex-1 overflow-hidden"
                            >
                              <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide block">
                                {article.categories?.[0]?.name}
                              </span>
                              <h3 className="text-xs md:text-lg font-semibold text-foreground leading-snug mt-1 md:mt-2 group-hover:text-primary transition-colors line-clamp-2 break-words">
                                {article.title}
                              </h3>
                              <span className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-3 block">
                                {formatTimeAgo(article.publishedAt)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : null;
                
                case 'trending':
                  return <TrendingSection key={section.id} articles={trendingArticles} />;
                
                case 'headlines':
                  // Headlines section includes Latest Headlines, Latest News, and Premium Banner
                  return (
                    <React.Fragment key={section.id}>
                      <LatestHeadlines articles={headlineArticles} />
                      <LatestNews articles={latestNewsArticles} />
                      <PremiumBanner />
                    </React.Fragment>
                  );
                
                case 'in_brief':
                case 'category':
                  return (
                    <CategorySection 
                      key={section.id} 
                      section={section as {
                        id: number;
                        name: string;
                        slug: string;
                        sectionType: string;
                        accentColor?: string | null;
                        layout?: string | null;
                        showViewMore?: boolean | null;
                        viewMoreUrl?: string | null;
                        categorySlug?: string | null;
                        articleCount?: number | null;
                      }} 
                    />
                  );
                
                case 'stocks':
                  return null; // Stocks are shown in the ticker bar, not as a section
                
                default:
                  return null;
              }
              })();
              
              return (
                <React.Fragment key={section.id}>
                  {showInFeedAd && (
                    <div className="empty:hidden">
                      {/* Mobile in-feed ad - visible on all screens */}
                      <div className="lg:hidden">
                        <InContentAd slotKey={adSlotKeys[adIndex]} category="home" />
                      </div>
                      {/* Desktop in-feed leaderboard */}
                      <div className="hidden lg:block">
                        <LeaderboardAd slotKey={adSlotKeys[adIndex]} category="home" />
                      </div>
                    </div>
                  )}
                  {sectionContent}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              {/* Get Featured CTA */}
              <SidebarNewsletter onSubmitClick={() => setOpenSubmitStartup(true)} />
              
              {/* Advertisement */}
              <SidebarAd />
              
              {/* Most Read */}
              <SidebarMostRead />
              
              {/* Editor's Picks */}
              <SidebarEditorPicks />
              
              {/* Recent Jobs */}
              <SidebarJobs jobs={jobs as Job[]} />
              
              {/* TechScoop Daily */}
              <TechScoopDaily />
              
              {/* Featured Companies */}
              <FeaturedCompanies />
              
              {/* Upcoming Events */}
              <SidebarEvents events={events as Event[]} />
              
              {/* Quick Links */}
              <SidebarQuickLinks />
            </div>
          </aside>
        </div>
      </main>
      
      <Footer />
      
      {/* Submit Startup Dialog */}
      <SubmitStartupDialog open={openSubmitStartup} onOpenChange={setOpenSubmitStartup} />
    </div>
  );
}
