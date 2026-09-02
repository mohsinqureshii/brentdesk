/**
 * Related Content Service
 * Finds and suggests related articles, entities, and content for internal linking
 */

import { eq, desc, and, ne, inArray, like, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  articles,
  articleCategories,
  articleCompanies,
  articlePeople,
  articleEvents,
  articleTags,
  articleTopics,
  categories,
  tags,
  topics,
  people,
  companies,
  events,
  jobs,
  workflowStatuses,
  media,
} from "../../drizzle/schema";

// ============================================================
// TYPES
// ============================================================

export interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null | null;
  relevanceScore: number;
  matchReason: string;
}

export interface RelatedEntity {
  id: number;
  name: string;
  slug: string;
  type: "person" | "company" | "event" | "job";
  image: string | null;
  relevanceScore: number;
}

export interface InternalLinkSuggestion {
  text: string;
  url: string;
  entityType: string;
  entityId: number;
  relevanceScore: number;
}

// ============================================================
// RELATED CONTENT SERVICE
// ============================================================

export class RelatedContentService {
  /**
   * Get related articles based on shared categories, tags, and topics
   */
  async getRelatedArticles(
    articleId: number,
    limit: number = 5
  ): Promise<RelatedArticle[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get the source article's taxonomies
    const [articleCats, articleTagsList, articleTopicsList] = await Promise.all([
      db.select({ categoryId: articleCategories.categoryId })
        .from(articleCategories)
        .where(eq(articleCategories.articleId, articleId)),
      db.select({ tagId: articleTags.tagId })
        .from(articleTags)
        .where(eq(articleTags.articleId, articleId)),
      db.select({ topicId: articleTopics.topicId })
        .from(articleTopics)
        .where(eq(articleTopics.articleId, articleId)),
    ]);

    const categoryIds = articleCats.map(c => c.categoryId);
    const tagIds = articleTagsList.map(t => t.tagId);
    const topicIds = articleTopicsList.map(t => t.topicId);

    if (categoryIds.length === 0 && tagIds.length === 0 && topicIds.length === 0) {
      // No taxonomies, return recent articles
      // Get published status ID
      const publishedStatus = await db.select({ id: workflowStatuses.id })
        .from(workflowStatuses)
        .where(eq(workflowStatuses.slug, "published"))
        .limit(1);
      
      const publishedStatusId = publishedStatus[0]?.id || 4;

      const recentArticles = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        featuredImageId: articles.featuredImageId,
        publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
      })
        .from(articles)
        .where(and(
          ne(articles.id, articleId),
          eq(articles.statusId, publishedStatusId)
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

      // Get featured images
      const imageIds = recentArticles.map(a => a.featuredImageId).filter(Boolean) as number[];
      const images = imageIds.length > 0 
        ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds))
        : [];
      const imageMap = new Map(images.map(i => [i.id, i.url]));

      return recentArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featuredImageUrl: a.featuredImageId ? imageMap.get(a.featuredImageId) || null : null,
        publishedAt: a.publishedAt,
        relevanceScore: 0.3,
        matchReason: "Recent article",
      }));
    }

    // Find articles with matching taxonomies
    const relatedScores = new Map<number, { score: number; reasons: string[] }>();

    // Score by shared categories (highest weight)
    if (categoryIds.length > 0) {
      const catMatches = await db.select({
        articleId: articleCategories.articleId,
      })
        .from(articleCategories)
        .where(and(
          inArray(articleCategories.categoryId, categoryIds),
          ne(articleCategories.articleId, articleId)
        ));

      for (const match of catMatches) {
        const existing = relatedScores.get(match.articleId) || { score: 0, reasons: [] };
        existing.score += 0.4;
        existing.reasons.push("Shared category");
        relatedScores.set(match.articleId, existing);
      }
    }

    // Score by shared tags (medium weight)
    if (tagIds.length > 0) {
      const tagMatches = await db.select({
        articleId: articleTags.articleId,
      })
        .from(articleTags)
        .where(and(
          inArray(articleTags.tagId, tagIds),
          ne(articleTags.articleId, articleId)
        ));

      for (const match of tagMatches) {
        const existing = relatedScores.get(match.articleId) || { score: 0, reasons: [] };
        existing.score += 0.3;
        existing.reasons.push("Shared tag");
        relatedScores.set(match.articleId, existing);
      }
    }

    // Score by shared topics (medium weight)
    if (topicIds.length > 0) {
      const topicMatches = await db.select({
        articleId: articleTopics.articleId,
      })
        .from(articleTopics)
        .where(and(
          inArray(articleTopics.topicId, topicIds),
          ne(articleTopics.articleId, articleId)
        ));

      for (const match of topicMatches) {
        const existing = relatedScores.get(match.articleId) || { score: 0, reasons: [] };
        existing.score += 0.3;
        existing.reasons.push("Shared topic");
        relatedScores.set(match.articleId, existing);
      }
    }

    // Get the top related article IDs
    const sortedIds = Array.from(relatedScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit * 2)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      return [];
    }

    // Get published status ID
    const publishedStatus = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.slug, "published"))
      .limit(1);
    
    const publishedStatusId = publishedStatus[0]?.id || 4;

    // Fetch the article details
    const relatedArticlesList = await db.select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      featuredImageId: articles.featuredImageId,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
    })
      .from(articles)
      .where(and(
        inArray(articles.id, sortedIds),
        eq(articles.statusId, publishedStatusId)
      ))
      .orderBy(desc(articles.publishedAt));

    // Get featured images
    const imageIds = relatedArticlesList.map(a => a.featuredImageId).filter(Boolean) as number[];
    const images = imageIds.length > 0 
      ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds))
      : [];
    const imageMap = new Map(images.map(i => [i.id, i.url]));

    return relatedArticlesList.slice(0, limit).map(a => {
      const scoreData = relatedScores.get(a.id) || { score: 0, reasons: [] };
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featuredImageUrl: a.featuredImageId ? imageMap.get(a.featuredImageId) || null : null,
        publishedAt: a.publishedAt,
        relevanceScore: Math.min(1, scoreData.score),
        matchReason: Array.from(new Set(scoreData.reasons)).join(", "),
      };
    });
  }

  /**
   * Get related entities (people, companies, events) for an article
   */
  async getRelatedEntities(
    articleId: number,
    limit: number = 6
  ): Promise<RelatedEntity[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results: RelatedEntity[] = [];
    const seenIds = new Set<string>();

    // ---- 1. Junction-table linked entities (highest confidence) ----

    // Linked companies via article_companies
    const linkedCompanyRows = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      logo: companies.logo,
    })
      .from(articleCompanies)
      .innerJoin(companies, eq(articleCompanies.companyId, companies.id))
      .where(eq(articleCompanies.articleId, articleId));

    for (const c of linkedCompanyRows) {
      if (c.name) {
        const key = `company-${c.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push({ id: c.id, name: c.name, slug: c.slug, type: "company", image: c.logo, relevanceScore: 1.0 });
        }
      }
    }

    // Linked people via article_people
    const linkedPeopleRows = await db.select({
      id: people.id,
      name: people.name,
      slug: people.slug,
      image: people.avatar,
    })
      .from(articlePeople)
      .innerJoin(people, eq(articlePeople.personId, people.id))
      .where(eq(articlePeople.articleId, articleId));

    for (const p of linkedPeopleRows) {
      if (p.name) {
        const key = `person-${p.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push({ id: p.id, name: p.name, slug: p.slug, type: "person", image: p.image, relevanceScore: 1.0 });
        }
      }
    }

    // Linked events via article_events
    const linkedEventRows = await db.select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      featuredImage: events.featuredImage,
    })
      .from(articleEvents)
      .innerJoin(events, eq(articleEvents.eventId, events.id))
      .where(eq(articleEvents.articleId, articleId));

    for (const e of linkedEventRows) {
      if (e.title) {
        const key = `event-${e.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push({ id: e.id, name: e.title, slug: e.slug, type: "event", image: e.featuredImage, relevanceScore: 0.95 });
        }
      }
    }

    // If we already have enough from junction tables, return early
    if (results.length >= limit) {
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    }

    // ---- 2. Text-matching fallback for additional entities ----

    const article = await db.select({
      title: articles.title,
      content: articles.content,
      excerpt: articles.excerpt,
    })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article[0]) {
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    }

    const searchText = `${article[0].title} ${article[0].excerpt || ""} ${article[0].content || ""}`.toLowerCase();

    // Get published status ID for filtering
    const publishedStatus = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.slug, "published"))
      .limit(1);
    const publishedStatusId = publishedStatus[0]?.id || 4;

    // Find mentioned people by text
    const allPeople = await db.select({
      id: people.id,
      name: people.name,
      slug: people.slug,
      image: people.avatar,
    })
      .from(people)
      .where(eq(people.statusId, publishedStatusId))
      .limit(100);

    for (const person of allPeople) {
      const key = `person-${person.id}`;
      if (person.name && !seenIds.has(key) && searchText.includes(person.name.toLowerCase())) {
        seenIds.add(key);
        results.push({ id: person.id, name: person.name, slug: person.slug, type: "person", image: person.image, relevanceScore: 0.9 });
      }
    }

    // Find mentioned companies by text
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      logo: companies.logo,
    })
      .from(companies)
      .where(eq(companies.statusId, publishedStatusId))
      .limit(100);

    for (const company of allCompanies) {
      const key = `company-${company.id}`;
      if (company.name && !seenIds.has(key) && searchText.includes(company.name.toLowerCase())) {
        seenIds.add(key);
        results.push({ id: company.id, name: company.name, slug: company.slug, type: "company", image: company.logo, relevanceScore: 0.85 });
      }
    }

    // Find related events by text
    const upcomingEvents = await db.select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      featuredImage: events.featuredImage,
    })
      .from(events)
      .where(eq(events.statusId, publishedStatusId))
      .orderBy(desc(events.startDate))
      .limit(20);

    for (const event of upcomingEvents) {
      const key = `event-${event.id}`;
      if (event.title && !seenIds.has(key) && searchText.includes(event.title.toLowerCase())) {
        seenIds.add(key);
        results.push({ id: event.id, name: event.title, slug: event.slug, type: "event", image: event.featuredImage, relevanceScore: 0.8 });
      }
    }

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Suggest internal links for article content
   */
  async suggestInternalLinks(
    content: string,
    excludeArticleId?: number
  ): Promise<InternalLinkSuggestion[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const suggestions: InternalLinkSuggestion[] = [];
    const contentLower = content.toLowerCase();

    // Get published status ID
    const publishedStatus = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.slug, "published"))
      .limit(1);
    const publishedStatusId = publishedStatus[0]?.id || 4;

    // Find people mentions
    const allPeople = await db.select({
      id: people.id,
      name: people.name,
      slug: people.slug,
    })
      .from(people)
      .where(eq(people.statusId, publishedStatusId));

    for (const person of allPeople) {
      if (person.name && contentLower.includes(person.name.toLowerCase())) {
        suggestions.push({
          text: person.name,
          url: `/people/${person.slug}`,
          entityType: "person",
          entityId: person.id,
          relevanceScore: 0.9,
        });
      }
    }

    // Find company mentions
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
    })
      .from(companies)
      .where(eq(companies.statusId, publishedStatusId));

    for (const company of allCompanies) {
      if (company.name && company.name.length > 3 && contentLower.includes(company.name.toLowerCase())) {
        suggestions.push({
          text: company.name,
          url: `/companies/${company.slug}`,
          entityType: "company",
          entityId: company.id,
          relevanceScore: 0.85,
        });
      }
    }

    // Find event mentions
    const allEvents = await db.select({
      id: events.id,
      title: events.title,
      slug: events.slug,
    })
      .from(events)
      .where(eq(events.statusId, publishedStatusId));

    for (const event of allEvents) {
      if (event.title && event.title.length > 5 && contentLower.includes(event.title.toLowerCase())) {
        suggestions.push({
          text: event.title,
          url: `/events/${event.slug}`,
          entityType: "event",
          entityId: event.id,
          relevanceScore: 0.8,
        });
      }
    }

    // Find topic mentions for linking to topic pages
    const allTopics = await db.select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
    })
      .from(topics);

    for (const topic of allTopics) {
      if (topic.name && topic.name.length > 4 && contentLower.includes(topic.name.toLowerCase())) {
        suggestions.push({
          text: topic.name,
          url: `/topics/${topic.slug}`,
          entityType: "topic",
          entityId: topic.id,
          relevanceScore: 0.7,
        });
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = suggestions.reduce((acc, curr) => {
      const existing = acc.find(s => s.url === curr.url);
      if (!existing || existing.relevanceScore < curr.relevanceScore) {
        return [...acc.filter(s => s.url !== curr.url), curr];
      }
      return acc as any;
    }, [] as InternalLinkSuggestion[]);

    return uniqueSuggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);
  }

  /**
   * Get articles by category for category pages
   */
  async getArticlesByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ articles: RelatedArticle[]; total: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const category = await db.select()
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);

    if (!category[0]) {
      return { articles: [], total: 0 };
    }

    const offset = (page - 1) * limit;

    const articleIds = await db.select({ articleId: articleCategories.articleId })
      .from(articleCategories)
      .where(eq(articleCategories.categoryId, category[0].id));

    if (articleIds.length === 0) {
      return { articles: [], total: 0 };
    }

    // Get published status ID
    const publishedStatus = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.slug, "published"))
      .limit(1);
    
    const publishedStatusId = publishedStatus[0]?.id || 4;

    const categoryArticles = await db.select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      featuredImageId: articles.featuredImageId,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
    })
      .from(articles)
      .where(and(
        inArray(articles.id, articleIds.map(a => a.articleId)),
        eq(articles.statusId, publishedStatusId)
      ))
      .orderBy(desc(articles.publishedAt));

    const total = categoryArticles.length;
    const paginatedArticles = categoryArticles.slice(offset, offset + limit);

    // Get featured images
    const imageIds = paginatedArticles.map(a => a.featuredImageId).filter(Boolean) as number[];
    const images = imageIds.length > 0 
      ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds))
      : [];
    const imageMap = new Map(images.map(i => [i.id, i.url]));

    return {
      articles: paginatedArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featuredImageUrl: a.featuredImageId ? imageMap.get(a.featuredImageId) || null : null,
        publishedAt: a.publishedAt,
        relevanceScore: 1,
        matchReason: `Category: ${category[0].name}`,
      })),
      total,
    };
  }

  /**
   * Get articles by topic for topic pages
   */
  async getArticlesByTopic(
    topicSlug: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ articles: RelatedArticle[]; total: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const topic = await db.select()
      .from(topics)
      .where(eq(topics.slug, topicSlug))
      .limit(1);

    if (!topic[0]) {
      return { articles: [], total: 0 };
    }

    const offset = (page - 1) * limit;

    const articleIds = await db.select({ articleId: articleTopics.articleId })
      .from(articleTopics)
      .where(eq(articleTopics.topicId, topic[0].id));

    if (articleIds.length === 0) {
      return { articles: [], total: 0 };
    }

    // Get published status ID
    const publishedStatus = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.slug, "published"))
      .limit(1);
    
    const publishedStatusId = publishedStatus[0]?.id || 4;

    const topicArticles = await db.select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      featuredImageId: articles.featuredImageId,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
    })
      .from(articles)
      .where(and(
        inArray(articles.id, articleIds.map(a => a.articleId)),
        eq(articles.statusId, publishedStatusId)
      ))
      .orderBy(desc(articles.publishedAt));

    const total = topicArticles.length;
    const paginatedArticles = topicArticles.slice(offset, offset + limit);

    // Get featured images
    const imageIds = paginatedArticles.map(a => a.featuredImageId).filter(Boolean) as number[];
    const images = imageIds.length > 0 
      ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds))
      : [];
    const imageMap = new Map(images.map(i => [i.id, i.url]));

    return {
      articles: paginatedArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featuredImageUrl: a.featuredImageId ? imageMap.get(a.featuredImageId) || null : null,
        publishedAt: a.publishedAt,
        relevanceScore: 1,
        matchReason: `Topic: ${topic[0].name}`,
      })),
      total,
    };
  }
}

// Export singleton instance
export const relatedContentService = new RelatedContentService();
