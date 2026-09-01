import { getDb } from './server/db.ts';
import { articles, articleCategories, categories, users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function createTestArticle() {
  try {
    const db = await getDb();
    
    // Get a category (use fintech as example)
    const categoryResult = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'fintech'))
      .limit(1);

    if (!categoryResult.length) {
      console.error('Category not found');
      process.exit(1);
    }

    const category = categoryResult[0];
    console.log(`Using category: ${category.name} (ID: ${category.id})`);

    // Get a user to be the author
    const userResult = await db
      .select()
      .from(users)
      .limit(1);

    if (!userResult.length) {
      console.error('No users found');
      process.exit(1);
    }

    const author = userResult[0];
    console.log(`Using author: ${author.email} (ID: ${author.id})`);

    // Create test article with statusId = 1 (assuming first status exists)
    const testArticle = {
      title: 'TechScoop Test Article - OG Meta Tags Verification',
      slug: 'techscoop-test-article-og-meta-tags-verification-' + Date.now(),
      excerpt: 'This is a test article created to verify that Open Graph meta tags are working correctly for social media sharing. Each article should display unique title, description, and featured image when shared.',
      content: '<p>This is a comprehensive test article to verify OG meta tags functionality.</p><p>When shared on social media platforms like LinkedIn and WhatsApp, this article should display:</p><ul><li>Unique title: TechScoop Test Article - OG Meta Tags Verification</li><li>Unique description with the excerpt</li><li>Featured image from CloudFront CDN</li><li>Correct URL structure</li></ul><p>This helps ensure that social media crawlers receive proper metadata for rich previews.</p>',
      authorId: author.id,
      statusId: 1, // Use first status ID
      seoTitle: 'TechScoop Test Article - OG Meta Tags Verification',
      seoDescription: 'Test article to verify Open Graph meta tags work correctly for social media sharing with unique titles, descriptions, and images.',
      seoKeywords: 'test, og-tags, meta-tags, social-media, techscoop',
      primaryCategoryId: category.id,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert article
    const insertResult = await db.insert(articles).values(testArticle);
    const articleId = insertResult[0].insertId;
    console.log(`✅ Article created with ID: ${articleId}`);
    console.log(`   Title: ${testArticle.title}`);
    console.log(`   Slug: ${testArticle.slug}`);
    console.log(`   Category: ${category.name}`);

    // Link article to category
    await db.insert(articleCategories).values({
      articleId: articleId,
      categoryId: category.id,
    });
    console.log(`✅ Article linked to category`);

    // Output the URL for testing
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const testUrl = `${appUrl}/${category.slug}/${testArticle.slug}`;
    console.log(`\n📱 Test URL (Dev Server): ${testUrl}`);
    console.log(`\n🔗 Use this URL to test OG meta tags on:`);
    console.log(`   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/`);
    console.log(`   - Twitter Card Validator: https://cards.twitter.com/validator`);
    console.log(`   - Facebook Sharing Debugger: https://www.facebook.com/sharing/debugger/`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating test article:', error);
    process.exit(1);
  }
}

createTestArticle();
