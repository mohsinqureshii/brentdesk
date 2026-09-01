#!/usr/bin/env tsx

/**
 * Pre-rendering script for TechScoop
 * Generates static HTML files for all articles with article-specific OG meta tags
 * This solves the Manus static file serving limitation by pre-rendering all content
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../server/db';
import { articles, categories, media, users, articleCategories } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'dist', 'public');
const templatePath = path.resolve(publicDir, 'index.html');

// Ensure dist/public exists
if (!fs.existsSync(publicDir)) {
  console.error(`Error: ${publicDir} does not exist. Run 'pnpm build' first.`);
  process.exit(1);
}

// Read the base template
let baseTemplate = '';
try {
  baseTemplate = fs.readFileSync(templatePath, 'utf-8');
} catch (error) {
  console.error(`Error reading template: ${error.message}`);
  process.exit(1);
}

/**
 * Generate OG meta tags for an article
 */
function generateArticleMetaTags(article: any, category: any, author: any, mediaItem: any) {
  const baseUrl = 'https://techscoop.io';
  const articleUrl = `${baseUrl}/${category.slug}/${article.slug}`;
  const imageUrl = mediaItem?.url || 'https://techscoop.io/assets/og-image.png';
  
  // Escape quotes in text for HTML attributes
  const escapeHtml = (text: string) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const title = escapeHtml(article.title);
  const description = escapeHtml(article.excerpt || article.title);
  const authorName = escapeHtml(author?.name || 'TechScoop');

  return `
    <!-- Article Meta Tags -->
    <title>${title} | TechScoop</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />
    <meta name="author" content="${authorName}" />
    <link rel="canonical" href="${articleUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="TechScoop" />
    <meta property="og:locale" content="en_US" />
    <meta property="article:published_time" content="${typeof article.publishedAt === 'string' ? article.publishedAt : (article.publishedAt?.toISOString?.() || new Date().toISOString())}" />
    <meta property="article:author" content="${authorName}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${articleUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:site" content="@techscoopmena" />
  `;
}

/**
 * Build a per-page WebPage JSON-LD for the prerender output. Mirrors the
 * SSR helper in server/_core/vite.ts so build-time output matches runtime.
 */
function buildWebPageJsonLdForArticle(articleUrl: string): string {
  const obj = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${articleUrl}#webpage`,
    url: articleUrl,
    isPartOf: { "@id": "https://techscoop.io/#website" },
    inLanguage: "en-US",
  };
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

/**
 * Inject meta tags into HTML template
 */
function injectMetaTags(template: string, metaTags: string, articleUrl?: string): string {
  // Remove existing meta tags
  let html = template
    .replace(/<title>[^<]*<\/title>/g, '')
    .replace(/<meta[^>]*name="title"[^>]*>/gi, '')
    .replace(/<meta[^>]*name="description"[^>]*>/gi, '')
    .replace(/<meta[^>]*name="author"[^>]*>/gi, '')
    .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<meta[^>]*property="article:[^"]*"[^>]*>/gi, '');

  // Replace WebPage placeholder with article-specific JSON-LD
  if (articleUrl) {
    html = html.replace(/<!--SSR_WEBPAGE_PLACEHOLDER-->/, buildWebPageJsonLdForArticle(articleUrl));
  }

  // Inject new meta tags
  return html.replace('</head>', `${metaTags}\n</head>`);
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Main pre-rendering function
 */
async function prerender() {
  console.log('[Prerender] Starting pre-rendering of articles...');

  try {
    const db = await getDb();
    if (!db) {
      console.error('[Prerender] Database not available. Make sure DATABASE_URL is set.');
      process.exit(1);
    }

    // Fetch all articles with their primary categories and authors
    const allArticles = await db
      .select({
        article: articles,
        category: categories,
        author: users,
        featuredMedia: media,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.primaryCategoryId, categories.id))
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(media, eq(articles.featuredImageId, media.id));
    
    // All articles will be pre-rendered (filtering by status can be done at runtime)
    console.log(`[Prerender] Found ${allArticles.length} articles to pre-render`);

    let successCount = 0;
    let errorCount = 0;

    for (const { article, category, author, featuredMedia } of allArticles) {
      try {
        if (!category) {
          console.warn(`[Prerender] Skipping article "${article.title}" - no category`);
          continue;
        }

        // Generate meta tags
        const metaTags = generateArticleMetaTags(article, category, author, featuredMedia);
        const articleUrl = `https://techscoop.io/${category.slug}/${article.slug}`;

        // Inject into template
        const html = injectMetaTags(baseTemplate, metaTags, articleUrl);

        // Create article directory
        const articleDir = path.resolve(publicDir, category.slug);
        ensureDir(articleDir);

        // Write HTML file
        const filePath = path.resolve(articleDir, `${article.slug}.html`);
        fs.writeFileSync(filePath, html, 'utf-8');

        console.log(`[Prerender] ✓ Generated: /${category.slug}/${article.slug}`);
        successCount++;
      } catch (error: any) {
        console.error(`[Prerender] ✗ Error generating article "${article.title}":`, error.message);
        errorCount++;
      }
    }

    console.log(`[Prerender] Complete: ${successCount} articles generated, ${errorCount} errors`);
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('[Prerender] Fatal error:', error.message);
    process.exit(1);
  }
}

// Run pre-rendering
prerender();
