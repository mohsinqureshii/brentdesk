/**
 * Generate article URL based on category and slug
 * Uses category-based URLs when category is available: /{category-slug}/{article-slug}
 * Falls back to /article/{slug} when no category
 */

interface ArticleWithCategory {
  slug: string;
  categories?: Array<{ slug: string; name?: string }>;
  primaryCategory?: { slug: string; name?: string } | null;
}

export function getArticleUrl(article: ArticleWithCategory): string {
  // Try to get primary category first, then first category
  const category = article.primaryCategory || article.categories?.[0];
  
  if (category?.slug) {
    return `/${category.slug}/${article.slug}`;
  }
  
  // Fallback to /article/slug
  return `/news/${article.slug}`;
}

/**
 * Generate article URL from individual parts
 */
export function buildArticleUrl(slug: string, categorySlug?: string | null): string {
  if (categorySlug) {
    return `/${categorySlug}/${slug}`;
  }
  return `/news/${slug}`;
}
