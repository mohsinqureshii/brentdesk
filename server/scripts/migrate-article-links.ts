/**
 * Migration Script: Update Internal Article Links
 * 
 * This script updates all internal /article/{slug} links in article content
 * to use the new category-based URL format /{category}/{slug}
 * 
 * Run with: npx tsx server/scripts/migrate-article-links.ts
 */

import { eq, isNotNull, like, or } from "drizzle-orm";
import { getDb } from "../db";
import { articles, categories } from "../../drizzle/schema";

interface MigrationResult {
  articleId: number;
  articleSlug: string;
  linksUpdated: number;
  oldLinks: string[];
  newLinks: string[];
}

async function migrateArticleLinks(): Promise<void> {
  console.log("🚀 Starting article link migration...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  // Get all categories for mapping
  const allCategories = await db.select({
    id: categories.id,
    slug: categories.slug
  }).from(categories);
  
  const categoryMap = new Map(allCategories.map(c => [c.id, c.slug]));
  console.log(`📂 Loaded ${categoryMap.size} categories\n`);

  // Get all articles with their slugs and primary categories
  const allArticles = await db.select({
    id: articles.id,
    slug: articles.slug,
    primaryCategoryId: articles.primaryCategoryId
  }).from(articles);
  
  // Create a map of article slug to category slug
  const articleCategoryMap = new Map<string, string>();
  for (const article of allArticles) {
    const categorySlug = article.primaryCategoryId 
      ? categoryMap.get(article.primaryCategoryId) || 'news'
      : 'news';
    articleCategoryMap.set(article.slug, categorySlug);
  }
  console.log(`📰 Loaded ${articleCategoryMap.size} articles\n`);

  // Find articles that contain /article/ links in their content
  const articlesWithLinks = await db.select()
    .from(articles)
    .where(
      or(
        like(articles.content, '%/article/%'),
        like(articles.content, '%href="/article/%'),
        like(articles.content, '%href=\'/article/%')
      )
    );

  console.log(`🔍 Found ${articlesWithLinks.length} articles with /article/ links\n`);

  if (articlesWithLinks.length === 0) {
    console.log("✅ No articles need migration. All links are already up to date.\n");
    return;
  }

  const results: MigrationResult[] = [];
  let totalLinksUpdated = 0;

  for (const article of articlesWithLinks) {
    const result: MigrationResult = {
      articleId: article.id,
      articleSlug: article.slug,
      linksUpdated: 0,
      oldLinks: [],
      newLinks: []
    };

    let content = article.content || '';
    
    // Regex to find /article/{slug} patterns
    // Matches: /article/some-article-slug
    const linkRegex = /\/article\/([a-z0-9-]+)/gi;
    
    let match;
    const replacements: Array<{ old: string; new: string }> = [];
    
    while ((match = linkRegex.exec(content)) !== null) {
      const fullMatch = match[0]; // /article/some-slug
      const articleSlug = match[1]; // some-slug
      
      // Look up the category for this article
      const categorySlug = articleCategoryMap.get(articleSlug);
      
      if (categorySlug) {
        const newLink = `/${categorySlug}/${articleSlug}`;
        replacements.push({ old: fullMatch, new: newLink });
        result.oldLinks.push(fullMatch);
        result.newLinks.push(newLink);
      } else {
        // Article not found, keep the old link but log it
        console.log(`  ⚠️  Article slug "${articleSlug}" not found in database, keeping original link`);
      }
    }

    // Apply replacements
    for (const { old, new: newLink } of replacements) {
      content = content.replace(new RegExp(escapeRegex(old), 'g'), newLink);
      result.linksUpdated++;
    }

    if (result.linksUpdated > 0) {
      // Update the article content in the database
      await db.update(articles)
        .set({ 
          content,
          updatedAt: new Date().toISOString()
        } as any)
        .where(eq(articles.id, article.id));

      totalLinksUpdated += result.linksUpdated;
      results.push(result);
      
      console.log(`✅ Updated article: "${article.title}" (${result.linksUpdated} links)`);
      for (let i = 0; i < result.oldLinks.length; i++) {
        console.log(`   ${result.oldLinks[i]} → ${result.newLinks[i]}`);
      }
      console.log();
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Articles processed: ${articlesWithLinks.length}`);
  console.log(`Articles updated: ${results.length}`);
  console.log(`Total links updated: ${totalLinksUpdated}`);
  console.log("=".repeat(60) + "\n");

  if (results.length > 0) {
    console.log("📝 Detailed changes:");
    for (const result of results) {
      console.log(`\n  Article ID ${result.articleId} (${result.articleSlug}):`);
      for (let i = 0; i < result.oldLinks.length; i++) {
        console.log(`    - ${result.oldLinks[i]} → ${result.newLinks[i]}`);
      }
    }
  }

  console.log("\n✅ Migration complete!\n");
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run the migration
migrateArticleLinks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
