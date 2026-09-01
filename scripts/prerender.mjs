#!/usr/bin/env node

/**
 * Pre-rendering script for TechScoop
 * Generates static HTML files for all articles with article-specific OG meta tags
 * This solves the Manus static file serving limitation by pre-rendering all content
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../server/db.js';
import { articles, categories, media, users } from '../drizzle/schema.js';
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
function generateArticleMetaTags(article, category, author, media) {
  const baseUrl = 'https://techscoop.io';
  const articleUrl = `${baseUrl}/${category.slug}/${article.slug}`;
  const imageUrl = media?.url || 'https://techscoop.io/assets/og-image.png';

  return `
    <!-- Article Meta Tags -->
    <title>${article.title} | TechScoop</title>
    <meta name="title" content="${article.title}" />
    <meta name="description" content="${article.excerpt || article.title}" />
    <meta name="author" content="${author?.name || 'TechScoop'}" />
    <link rel="canonical" href="${articleUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:title" content="${article.title}" />
    <meta property="og:description" content="${article.excerpt || article.title}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="TechScoop" />
    <meta property="og:locale" content="en_US" />
    <meta property="article:published_time" content="${article.publishedAt?.toISOString() || new Date().toISOString()}" />
    <meta property="article:author" content="${author?.name || 'TechScoop'}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${articleUrl}" />
    <meta name="twitter:title" content="${article.title}" />
    <meta name="twitter:description" content="${article.excerpt || article.title}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:site" content="@techaborad" />
  `;
}

/**
 * Inject meta tags into HTML template
 */
function injectMetaTags(template, metaTags) {
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

  // Inject new meta tags
  return html.replace('</head>', `${metaTags}\n</head>`);
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dir) {
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
    const db = getDb();

    // Fetch all published articles with their categories and authors
    const allArticles = await db
      .select({
        article: articles,
        category: categories,
        author: users,
        featuredMedia: media,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(media, eq(articles.featuredImageId, media.id))
      .where(eq(articles.isPublished, true));

    console.log(`[Prerender] Found ${allArticles.length} published articles`);

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

        // Inject into template
        const html = injectMetaTags(baseTemplate, metaTags);

        // Create article directory
        const articleDir = path.resolve(publicDir, category.slug);
        ensureDir(articleDir);

        // Write HTML file
        const filePath = path.resolve(articleDir, `${article.slug}.html`);
        fs.writeFileSync(filePath, html, 'utf-8');

        console.log(`[Prerender] ✓ Generated: /${category.slug}/${article.slug}`);
        successCount++;
      } catch (error) {
        console.error(`[Prerender] ✗ Error generating article "${article.title}":`, error.message);
        errorCount++;
      }
    }

    console.log(`[Prerender] Complete: ${successCount} articles generated, ${errorCount} errors`);
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('[Prerender] Fatal error:', error);
    process.exit(1);
  }
}

// Run pre-rendering
prerender();
