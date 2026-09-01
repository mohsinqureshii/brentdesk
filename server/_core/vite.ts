/**
 * Dev-only Vite middleware server.
 * ----------------------------------------------------------------------
 * Loaded lazily (dynamic import) from index.ts ONLY when
 * NODE_ENV=development. Never import this module statically from
 * production code paths: `vite` and vite.config's plugins are
 * devDependencies and are absent from production installs.
 */

import { Express } from "express";
import { type Server } from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import {
  isSystemUrl,
  runSSR,
  knownStaticPages,
  noindexPages,
  injectCanonical,
} from "./ssrServe";
import { generateStaticPageMetaTags } from "./staticPagesSEO";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // CRITICAL: Skip sitemap routes entirely - they're handled by sitemapRoutes middleware
      // If we reach here for a sitemap URL, it means the sitemap route didn't match
      // so we should let it 404 naturally instead of trying to SSR it
      if (url.includes('/sitemap') || url.includes('/robots') || url.includes('/rss') || url.includes('/feed')) {
        // Don't process sitemaps/robots/feeds through Vite - let them 404
        // (They should have been caught by sitemapRoutes middleware earlier)
        res.status(404).set({ "Content-Type": "text/plain" } as any).end("Not Found");
        return;
      }
      
      // System URLs (API, admin, static assets) - serve raw template
      if (isSystemUrl(url)) {
        // Inject noindex/nofollow for admin, login, signup, dashboard, profile, account, settings pages
        const noIndexPaths = ['/admin/', '/login', '/signup', '/signin', '/profile', '/account', '/settings', '/dashboard', '/claimed-profiles'];
        if (noIndexPaths.some(p => url.startsWith(p))) {
          template = template.replace(
            '</head>',
            '<meta name="robots" content="noindex, nofollow" />\n</head>'
          );
        }
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" } as any).end(page);
        return;
      }
      
      // Try full SSR for content pages (articles, entities, tags, categories)
      const ssrResult = await runSSR(url, template);
      if (ssrResult) {
        // Handle 301/302 redirects - extract Location from meta-refresh tag
        if (ssrResult.status === 301 || ssrResult.status === 302) {
          const locationMatch = ssrResult.html.match(/url=([^"\s]+)/);
          if (locationMatch) {
            res.redirect(ssrResult.status, locationMatch[1]);
            return;
          }
        }
        const page = await vite.transformIndexHtml(url, ssrResult.html);
        // Add cache-busting headers for social media crawlers
        res.status(ssrResult.status).set({
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "Pragma": "public",
          "Expires": new Date(Date.now() + 3600000).toUTCString(),
        } as any).end(page);
        return;
      }
      
      // For known static pages: inject SEO meta tags
      const cleanPath = url.split('?')[0].split('#')[0];
      const isKnownPage = knownStaticPages.has(cleanPath);
      
      // Determine HTTP status: 404 for unknown pages, 200 for known pages
      const pageStatus = isKnownPage ? 200 : 404;
      
      const staticPageMetaTags = generateStaticPageMetaTags(cleanPath);
      
      // Remove default meta tags that will be replaced
      let finalTemplate = template
        .replace(/<title>[^<]*<\/title>/g, '')
        .replace(/<meta[^>]*name="description"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="title"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="keywords"[^>]*>/gi, '')
        .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
        .replace(/<link[^>]*rel="canonical"[^>]*>/gi, '');
      
      // Inject new SEO meta tags
      finalTemplate = finalTemplate.replace(
        '</head>',
        `${staticPageMetaTags}\n</head>`
      );
      
      // Also inject correct canonical URL for all pages
      finalTemplate = injectCanonical(finalTemplate, url);
      
      // Only add noindex for:
      // 1. Truly unknown pages (not in knownStaticPages and SSR returned null)
      // 2. Explicitly noindex pages (search, password-reset, etc.)
      //
      // Pagination URLs (?page=N) are NOT noindex'd here. The React
      // canonical already points to the base URL (page 1), which
      // tells Google to consolidate ranking signals on page 1 while
      // keeping page 2+ crawlable for article discovery. Adding
      // noindex on top of canonical was over-applying — it removed
      // ~400 paginated category/tag URLs from the index even though
      // they're legitimate listing pages, and starved Google of the
      // crawl path to deeper articles.
      const isExplicitNoindex = noindexPages.has(cleanPath);
      if (!isKnownPage || isExplicitNoindex) {
        finalTemplate = finalTemplate.replace(
          /<meta[^>]*name="robots"[^>]*>/gi,
          '<meta name="robots" content="noindex, follow" />'
        );
      }
      
      const page = await vite.transformIndexHtml(url, finalTemplate);
      // Add cache-busting headers for social media crawlers
      res.status(pageStatus).set({
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Pragma": "public",
        "Expires": new Date(Date.now() + 3600000).toUTCString(),
      } as any).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
