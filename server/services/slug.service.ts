/**
 * Slug Service
 * Handles URL slug generation, validation, and WordPress URL preservation
 */

import { eq, and, like } from "drizzle-orm";
import { getDb } from "../db";
import { toDbDate } from "../_core/dbValues";
import { 
  articles, 
  jobs, 
  people, 
  investors, 
  events, 
  resources, 
  research,
  companies,
  redirects,
  wpMigrationLog
} from "../../drizzle/schema";

// ============================================================
// TYPES
// ============================================================

export type EntityType = "article" | "job" | "person" | "investor" | "event" | "resource" | "research" | "company";

export interface SlugCheckResult {
  isAvailable: boolean;
  suggestedSlug?: string;
}

// ============================================================
// SLUG SERVICE CLASS
// ============================================================

export class SlugService {
  /**
   * Generate a URL-safe slug from a string
   * SEO best practices: short, clean, lowercase, hyphen-separated
   * - Removes "and" to shorten slugs
   * - Removes special characters
   * - Collapses multiple hyphens
   */
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s*&\s*/g, "-")      // Replace & with hyphen
      .replace(/\s+and\s+/g, "-")    // Remove " and " to shorten
      .replace(/[^\w\s-]/g, "")      // Remove special characters
      .replace(/[\s_-]+/g, "-")      // Replace spaces and underscores with hyphens
      .replace(/-+/g, "-")           // Collapse multiple hyphens
      .replace(/^-+|-+$/g, "");       // Remove leading/trailing hyphens
  }

  /**
   * Generate a clean category slug (for taxonomy)
   * Keeps all key words, removes only "and" and special chars
   * e.g., "Hardware, Robotics & IoT" -> "hardware-robotics-iot"
   */
  generateCategorySlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s*&\s*/g, "-")      // Replace & with hyphen
      .replace(/\s+and\s+/g, "-")    // Remove " and "
      .replace(/,\s*/g, "-")         // Replace commas with hyphen
      .replace(/[^\w\s-]/g, "")      // Remove special characters
      .replace(/[\s_-]+/g, "-")      // Replace spaces with hyphens
      .replace(/-+/g, "-")           // Collapse multiple hyphens
      .replace(/^-+|-+$/g, "");       // Trim hyphens
  }

  /**
   * Check if a slug is available for an entity type
   */
  async checkSlugAvailability(
    entityType: EntityType,
    slug: string,
    excludeId?: number
  ): Promise<SlugCheckResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const table = this.getTableForEntityType(entityType);
    if (!table) {
      return { isAvailable: true };
    }

    // Check if slug exists
    let query = db.select({ id: table.id, slug: table.slug })
      .from(table)
      .where(eq(table.slug, slug));

    const existing = await query;

    // If no match, slug is available
    if (existing.length === 0) {
      return { isAvailable: true };
    }

    // If match is the same entity we're updating, it's available
    if (excludeId && existing.length === 1 && existing[0].id === excludeId) {
      return { isAvailable: true };
    }

    // Slug is taken, suggest an alternative
    const suggestedSlug = await this.generateUniqueSlug(entityType, slug);
    return { isAvailable: false, suggestedSlug };
  }

  /**
   * Generate a category-prefixed slug for articles
   * Format: category-slug/article-slug or category-slug/subcategory-slug/article-slug
   */
  async generateArticleSlugWithCategory(
    articleSlug: string,
    categorySlug?: string,
    subcategorySlug?: string
  ): Promise<string> {
    const parts: string[] = [];
    if (categorySlug) parts.push(categorySlug);
    if (subcategorySlug) parts.push(subcategorySlug);
    parts.push(articleSlug);
    return parts.join("/");
  }

  /**
   * Generate a unique slug by appending a number if needed
   */
  async generateUniqueSlug(entityType: EntityType, baseSlug: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const table = this.getTableForEntityType(entityType);
    if (!table) return baseSlug;

    // Find all slugs that start with the base slug
    const existing = await db.select({ slug: table.slug })
      .from(table)
      .where(like(table.slug, `${baseSlug}%`));

    const existingSlugs = new Set(existing.map(e => e.slug));

    // If base slug is available, use it
    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    // Find the next available number
    let counter = 2;
    while (existingSlugs.has(`${baseSlug}-${counter}`)) {
      counter++;
    }

    return `${baseSlug}-${counter}`;
  }

  /**
   * Create a redirect from an old URL to a new URL
   */
  async createRedirect(
    fromPath: string,
    toPath: string,
    statusCode: 301 | 302 = 301
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if redirect already exists
    const existing = await db.select()
      .from(redirects)
      .where(eq(redirects.fromPath, fromPath))
      .limit(1);

    if (existing.length > 0) {
      // Update existing redirect
      await db.update(redirects)
        .set({ toPath, statusCode, isActive: 1 } as any)
        .where(eq(redirects.id, existing[0].id));
    } else {
      // Create new redirect
      await db.insert(redirects).values({
        fromPath,
        toPath,
        statusCode,
        isActive: 1
      } as any);
    }
  }

  /**
   * Get redirect for a path
   */
  async getRedirect(path: string): Promise<{ toPath: string; statusCode: number } | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select()
      .from(redirects)
      .where(and(
        eq(redirects.fromPath, path),
        eq(redirects.isActive, 1)
      ))
      .limit(1);

    if (result.length === 0) return null;

    // Increment hit count
    await db.update(redirects)
      .set({
        hitCount: (result[0].hitCount || 0) + 1,
        lastHitAt: toDbDate(new Date())
      } as any)
      .where(eq(redirects.id, result[0].id));

    return {
      toPath: result[0].toPath,
      statusCode: result[0].statusCode
    };
  }

  /**
   * Bulk import redirects
   */
  async bulkImportRedirects(
    items: Array<{ fromPath: string; toPath: string; statusCode?: 301 | 302 }>
  ): Promise<{ imported: number; errors: string[] }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await this.createRedirect(item.fromPath, item.toPath, item.statusCode || 301);
        imported++;
      } catch (error) {
        errors.push(`Failed to import redirect from ${item.fromPath}: ${error}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Export all redirects
   */
  async exportRedirects(): Promise<Array<{
    fromPath: string;
    toPath: string;
    statusCode: number;
    hitCount: number | null;
    isActive: boolean | null;
  }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rows = await db.select({
      fromPath: redirects.fromPath,
      toPath: redirects.toPath,
      statusCode: redirects.statusCode,
      hitCount: redirects.hitCount,
      isActive: redirects.isActive
    }).from(redirects);
    
    return rows.map(r => ({
      ...r,
      isActive: r.isActive !== null ? Boolean(r.isActive) : null
    }));
  }

  /**
   * Preserve WordPress URL by creating a redirect if slug changes
   */
  async preserveWordPressUrl(
    wpUrl: string,
    newEntityType: EntityType,
    newEntityId: number,
    newSlug: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Parse the WordPress URL to get the path
    const wpPath = new URL(wpUrl, "https://example.com").pathname;
    
    // Determine the new path based on entity type
    const pathPrefixes: Record<EntityType, string> = {
      article: "/news",
      job: "/jobs",
      person: "/people",
      investor: "/investors",
      event: "/events",
      resource: "/resources",
      research: "/research",
      company: "/companies"
    };

    const newPath = `${pathPrefixes[newEntityType]}/${newSlug}`;

    // If paths are different, create a redirect
    if (wpPath !== newPath) {
      await this.createRedirect(wpPath, newPath, 301);
    }

    // Log the migration
    await db.insert(wpMigrationLog).values({
      wpPostId: 0, // Will be set by the importer
      wpPostType: "post",
      wpUrl,
      newEntityType,
      newEntityId,
      newUrl: newPath,
      status: wpPath !== newPath ? "redirect_created" : "success"
    } as any);
  }

  /**
   * Get URL parity report for WordPress migration
   */
  async getUrlParityReport(): Promise<Array<{
    wpUrl: string;
    newUrl: string;
    status: string | null;
    entityType: string;
    entityId: number;
  }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select({
      wpUrl: wpMigrationLog.wpUrl,
      newUrl: wpMigrationLog.newUrl,
      status: wpMigrationLog.status,
      entityType: wpMigrationLog.newEntityType,
      entityId: wpMigrationLog.newEntityId
    }).from(wpMigrationLog);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getTableForEntityType(entityType: EntityType): any {
    const tables: Record<EntityType, any> = {
      article: articles,
      job: jobs,
      person: people,
      investor: investors,
      event: events,
      resource: resources,
      research: research,
      company: companies
    };
    return tables[entityType];
  }
}

// Export singleton instance
export const slugService = new SlugService();
