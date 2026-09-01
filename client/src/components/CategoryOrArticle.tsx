/**
 * CategoryOrArticle - Smart route component
 *
 * Handles URL patterns:
 *
 * 1. /:seg1 (single segment)
 *    - If seg1 is a known category slug → render CategoryNews directly
 *    - Otherwise → render Article
 *
 * 2. /:seg1/:seg2 (two segments)
 *    - If seg2 is a known category slug → render CategoryNews (subcategory)
 *    - Otherwise → render Article (category/article-slug)
 *
 * Uses the cached getAllCategoriesWithCounts query for O(1) lookup.
 * 
 * IMPORTANT: Do NOT redirect to /category/ — the canonical URL is the bare slug.
 * The seoMiddleware redirects /category/:slug → /:slug to prevent duplicate content.
 */

import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import Article from "@/pages/public/Article";
import CategoryNews from "@/pages/public/CategoryNews";
import { Loader2 } from "lucide-react";

export default function CategoryOrArticle() {
  const { categorySlug: seg1, articleSlug: seg2 } = useParams<{
    categorySlug: string;
    articleSlug?: string;
  }>();

  // Fetch all categories (lightweight, cached by React Query)
  const { data: allCategories, isLoading } = trpc.news.getAllCategoriesWithCounts.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 } // cache for 5 minutes
  );

  // Build a Set of all known category slugs for O(1) lookup
  const categorySlugs = new Set(
    (allCategories || []).map((c: { slug: string }) => c.slug.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const seg1IsCategory = seg1 && categorySlugs.has(seg1.toLowerCase());
  const seg2IsCategory = seg2 && categorySlugs.has(seg2.toLowerCase());

  // Case 1: /parentCat/childCat → render CategoryNews with parentSlug + childSlug
  if (seg2IsCategory) {
    return <CategoryNews overrideParentSlug={seg1} overrideChildSlug={seg2} />;
  }

  // Case 2: /catSlug → render CategoryNews with just parentSlug
  if (!seg2 && seg1IsCategory) {
    return <CategoryNews overrideParentSlug={seg1} />;
  }

  // Case 3: /catSlug/articleSlug or /articleSlug → render Article
  return <Article />;
}
