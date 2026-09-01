/**
 * Article Preview Page
 * Allows admins to preview articles regardless of their status
 */

import { useParams, Link } from "wouter";
import { useState, useRef, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Share2, Bookmark, MessageCircle, ThumbsUp, Twitter, Linkedin, Facebook, Link2, ChevronLeft, ChevronRight, Play, TrendingUp, Mail, Loader2, AlertTriangle, ArrowLeft, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { publication } from "@shared/publication";

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

export default function ArticlePreview() {
  const params = useParams<{ id: string }>();
  const articleId = parseInt(params.id || "0", 10);

  // Fetch article using preview endpoint (works for any status)
  const { data: article, isLoading, error } = trpc.news.preview.useQuery(
    { id: articleId },
    { enabled: !!articleId }
  );

  // Fetch related articles
  const { data: relatedData } = trpc.news.list.useQuery({
    page: 1,
    limit: 6,
    sortBy: "publishedAt",
    sortOrder: "desc",
  });

  const relatedArticles = useMemo(() => {
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
      }));
  }, [relatedData, article]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The article you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link href="/admin/articles">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Articles
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get featured image URL from article data or use placeholder
  const featuredImage = (article as any).featuredImageUrl || getPlaceholderImage(article.id);
  const category = article.categories?.[0]?.name || "News";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Preview Banner */}
      <div className="bg-amber-500 text-black py-3 px-4">
        <div className={containerClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Preview Mode - This article is currently in "{article.status?.name || 'Draft'}" status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/articles/${article.id}`}>
                <Button size="sm" variant="outline" className="bg-white hover:bg-[#F0F2F5]">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Article
                </Button>
              </Link>
              <Link href="/admin/articles">
                <Button size="sm" variant="outline" className="bg-white hover:bg-[#F0F2F5]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to List
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1">
        {/* Article Header */}
        <article className="py-8">
          <div className={containerClass}>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link href="/news" className="hover:text-primary">News</Link>
              <span>/</span>
              <span className="text-foreground">{category}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-8">
                {/* Category Badge */}
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
                  {category}
                </Badge>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                  {article.title}
                </h1>

                {/* Excerpt */}
                {article.excerpt && (
                  <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                    {article.excerpt}
                  </p>
                )}

                {/* Author & Meta */}
                <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={article.author?.avatar || undefined} />
                    <AvatarFallback>
                      {article.author?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {article.author?.name || `${publication.name} Staff`}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(article.publishedAt || article.createdAt)}</span>
                      <span>·</span>
                      <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Featured Image */}
                <div className="relative aspect-video rounded-md overflow-hidden mb-8">
                  <img
                    src={featuredImage}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Article Content */}
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: article.content || "<p>No content available.</p>" }}
                />

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {article.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Share Actions */}
                <div className="flex items-center gap-4 py-6 border-t border-b">
                  <span className="text-sm font-medium text-muted-foreground">Share:</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Facebook className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4">
                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div className="bg-muted/30 rounded-md p-6">
                    <h3 className="font-bold text-lg mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      {relatedArticles.slice(0, 5).map((related, index) => (
                        <Link key={related.id} href={`/article/${related.slug}`}>
                          <div className="group cursor-pointer">
                            <p className="text-sm text-muted-foreground mb-1">
                              {related.category || "News"}
                            </p>
                            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {related.title}
                            </h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </article>
      </main>
      
      <Footer />
    </div>
  );
}
