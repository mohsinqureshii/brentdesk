/**
 * ThreeSegmentRoute - Handles 3-segment URLs: /parentCat/childCat/articleSlug
 *
 * These URLs appear in GSC as soft 404s because there's no route for them.
 * Examples:
 *   /technology/health-tech/article-slug
 *   /news/press-release/article-slug
 *   /powerlist/incubators/article-slug
 *
 * Strategy:
 * - Redirect to /:childCat/:articleSlug (canonical 2-segment URL)
 * - The Article component will handle any further redirects if needed
 * - This fixes the soft 404 by giving Google a proper 301 redirect
 *
 * Note: The SSR in vite.ts already handles these URLs correctly for crawlers.
 * This component handles the client-side routing for actual users.
 */

import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function ThreeSegmentRoute() {
  const params = useParams<{
    parentCat: string;
    childCat: string;
    articleSlug: string;
  }>();

  const [, navigate] = useLocation();
  const { parentCat, childCat, articleSlug } = params;

  useEffect(() => {
    if (childCat && articleSlug) {
      // Redirect /parentCat/childCat/articleSlug → /childCat/articleSlug
      // The canonical URL uses the child category slug directly
      navigate(`/${childCat}/${articleSlug}`, { replace: true });
    }
  }, [parentCat, childCat, articleSlug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
