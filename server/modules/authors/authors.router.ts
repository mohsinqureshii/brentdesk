/**
 * Public Authors Router
 * Public endpoints for author profile pages
 */

import { z } from "zod";
import { eq, and, desc, sql, or, isNotNull } from "drizzle-orm";
import { router, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { newsRecencyDesc } from "../../_core/articleOrder";
import { localizeRows, localizeCategoryLabels } from "../../services/translation.service";
import { 
  users,
  articles,
  categories,
  articleCategories,
  workflowStatuses,
  media
} from "../../../drizzle/schema";

export const authorsRouter = router({
  /**
   * Get author by username or ID for public profile page
   */
  getByUsername: publicProcedure
    .input(z.object({
      username: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Try to find by username first, then by ID
      let author;
      
      // First try by username
      const [byUsername] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          publicName: users.publicName,
          nickname: users.nickname,
          avatar: users.avatar,
          jobTitle: users.jobTitle,
          authorBio: users.authorBio,
          bio: users.bio,
          twitterHandle: users.twitterHandle,
          linkedinUrl: users.linkedinUrl,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);
      
      author = byUsername;
      
      // If not found by username, try by ID (for fallback links)
      if (!author) {
        const userId = parseInt(input.username);
        if (!isNaN(userId)) {
          const [byId] = await db
            .select({
              id: users.id,
              name: users.name,
              username: users.username,
              publicName: users.publicName,
              nickname: users.nickname,
              avatar: users.avatar,
              jobTitle: users.jobTitle,
              authorBio: users.authorBio,
              bio: users.bio,
              twitterHandle: users.twitterHandle,
              linkedinUrl: users.linkedinUrl,
              email: users.email,
              role: users.role,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          author = byId;
        }
      }

      if (!author) {
        return null;
      }

      // Get unique categories/topics this author writes about
      const authorCategories = await db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(articles)
        .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .innerJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .where(
          and(
            eq(articles.authorId, author.id),
            eq(workflowStatuses.slug, "published")
          )
        )
        .groupBy(categories.id)
        .orderBy(desc(sql`count(*)`))
        .limit(6);

      // Get article count
      const [articleCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .innerJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
        .where(
          and(
            eq(articles.authorId, author.id),
            eq(workflowStatuses.slug, "published")
          )
        );

      // The byline's title and biography are editorial copy a reader meets
      // on every author page, so they take the same overlay as an article;
      // the topic labels are category rows and take the category overlay.
      const [localizedAuthor] = await localizeRows(ctx.locale, "user", [author]);
      const localizedTopics = await localizeCategoryLabels(ctx.locale, authorCategories);

      return {
        ...localizedAuthor,
        displayName: author.publicName || author.nickname || author.name,
        topics: localizedTopics.map(c => ({
          id: c.categoryId,
          name: c.categoryName,
          slug: c.categorySlug,
        })),
        articleCount: articleCount?.count || 0,
      };
    }),

  /**
   * Get author's published articles
   */
  getArticles: publicProcedure
    .input(z.object({
      authorId: z.number(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { authorId, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get published status
      const [publishedStatus] = await db
        .select({ id: workflowStatuses.id })
        .from(workflowStatuses)
        .where(eq(workflowStatuses.slug, "published"))
        .limit(1);

      if (!publishedStatus) {
        return { articles: [], total: 0, hasMore: false };
      }

      // Get articles
      const articlesList = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          featuredImageId: articles.featuredImageId,
          publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
        })
        .from(articles)
        .where(
          and(
            eq(articles.authorId, authorId),
            eq(articles.statusId, publishedStatus.id)
          )
        )
        .orderBy(newsRecencyDesc)
        .limit(limit)
        .offset(offset);

      // Enrich with category and image
      const enrichedArticles = await Promise.all(
        articlesList.map(async (article) => {
          // Get primary category
          const [cat] = await db
            .select({
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(articleCategories)
            .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
            .where(eq(articleCategories.articleId, article.id))
            .limit(1);

          // Get featured image
          let imageUrl = null;
          if (article.featuredImageId) {
            const [img] = await db
              .select({ url: media.url })
              .from(media)
              .where(eq(media.id, article.featuredImageId))
              .limit(1);
            imageUrl = img?.url || null;
          }

          return {
            ...article,
            category: cat || null,
            featuredImageUrl: imageUrl,
          };
        })
      );

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(
          and(
            eq(articles.authorId, authorId),
            eq(articles.statusId, publishedStatus.id)
          )
        );

      const total = countResult?.count || 0;

      return {
        articles: enrichedArticles,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * List all authors (for staff page)
   */
  list: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, limit } = input;
      const offset = (page - 1) * limit;

      // Get users who have published articles or are editors/authors
      const authorsList = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          publicName: users.publicName,
          avatar: users.avatar,
          jobTitle: users.jobTitle,
          role: users.role,
        })
        .from(users)
        .where(
          or(
            eq(users.role, "admin"),
            eq(users.role, "editor"),
            eq(users.role, "senior_editor"),
            eq(users.role, "author")
          )
        )
        .orderBy(users.name)
        .limit(limit)
        .offset(offset);

      // Enrich with article count
      const enrichedAuthors = await Promise.all(
        authorsList.map(async (author) => {
          const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(articles)
            .innerJoin(workflowStatuses, eq(articles.statusId, workflowStatuses.id))
            .where(
              and(
                eq(articles.authorId, author.id),
                eq(workflowStatuses.slug, "published")
              )
            );

          return {
            ...author,
            displayName: author.publicName || author.name,
            articleCount: countResult?.count || 0,
          };
        })
      );

      return enrichedAuthors;
    }),
});
