import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { getArticleUrl } from "@/lib/articleUrl";

interface Article {
  id: string | number;
  image: string;
  category: string;
  title: string;
  readTime?: string;
  slug?: string;
  primaryCategory?: { slug: string } | null;
  categories?: Array<{ slug: string }>;
}

const defaultArticles: Article[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    category: "VC and Risk",
    title: "Why Silicon Valley is fleeing California",
    readTime: "5 min read"
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=250&fit=crop",
    category: "AI",
    title: "AI music startup hits $100M ARR",
    readTime: "4 min read"
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=250&fit=crop",
    category: "Startups",
    title: "The rise of vibe apps",
    readTime: "6 min read"
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=250&fit=crop",
    category: "AI",
    title: "Building for Arabic-First Users",
    readTime: "6 min read"
  },
];

interface RelatedArticlesProps {
  articles?: Article[];
  title?: string;
}

export function RelatedArticles({ articles = defaultArticles, title = "Related Articles" }: RelatedArticlesProps) {
  // Helper to get article URL - uses category-based URL if available
  const getUrl = (article: Article): string => {
    if (article.slug) {
      return getArticleUrl({
        slug: article.slug,
        primaryCategory: article.primaryCategory,
        categories: article.categories,
      });
    }
    // Fallback for static/default articles without slug
    return `/news`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      
      <div className="space-y-4">
        {articles.slice(0, 4).map((article) => (
          <Link 
            key={article.id} 
            href={getUrl(article)}
            className="flex gap-3 group"
          >
            <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-muted-foreground transition-colors leading-tight">
                {article.title}
              </h4>
              {article.readTime && (
                <p className="text-xs text-muted-foreground mt-1">{article.readTime}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      <Link 
        href="/news" 
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors pt-2"
      >
        View all articles
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
