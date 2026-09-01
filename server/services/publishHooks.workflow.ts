/**
 * Workflow → publishHooks bridge
 * ----------------------------------------------------------------------
 * When workflowService.executeTransition flips an entity into a published
 * status, it calls firePublishHookForEntity(entityType, entityId).
 *
 * This module owns the entityType → DB lookup → URL resolution mapping so
 * workflow.service.ts stays free of every entity table import.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  articles,
  jobs,
  events,
  companies,
  people,
  investors,
  accelerators,
  resources,
  research,
  categories,
} from "../../drizzle/schema";
import { onEntityPublished, buildEntityUrl, type PublishedEntityType } from "./publishHooks.service";

const ENTITY_TABLE: Record<PublishedEntityType, any> = {
  article:     articles,
  job:         jobs,
  event:       events,
  company:     companies,
  person:      people,
  investor:    investors,
  accelerator: accelerators,
  resource:    resources,
  research:    research,
};

const ENTITY_TYPE_ALIASES: Record<string, PublishedEntityType> = {
  article:     "article",
  news:        "article",
  job:         "job",
  jobs:        "job",
  event:       "event",
  events:      "event",
  company:     "company",
  companies:   "company",
  person:      "person",
  people:      "person",
  investor:    "investor",
  investors:   "investor",
  accelerator: "accelerator",
  accelerators:"accelerator",
  resource:    "resource",
  resources:   "resource",
  research:    "research",
};

export async function firePublishHookForEntity(
  entityType: string,
  entityId: number,
  userId?: number
): Promise<void> {
  const normalized = ENTITY_TYPE_ALIASES[entityType];
  if (!normalized) return; // Not an SEO-relevant entity (e.g. "comment")

  const db = await getDb();
  if (!db) return;

  const table = ENTITY_TABLE[normalized];
  if (!table) return;

  // Articles need their primary category slug to build the canonical URL.
  if (normalized === "article") {
    const row = await db
      .select({ slug: articles.slug, title: articles.title, categoryId: articles.primaryCategoryId })
      .from(articles)
      .where(eq(articles.id, entityId))
      .limit(1);
    if (!row[0]) return;
    let categorySlug = "news";
    if (row[0].categoryId) {
      const cat = await db
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.id, row[0].categoryId))
        .limit(1);
      categorySlug = cat[0]?.slug || "news";
    }
    onEntityPublished({
      entityType: "article",
      entityId,
      url: buildEntityUrl("article", row[0].slug, { categorySlug }),
      title: row[0].title || undefined,
      slug: row[0].slug,
      triggeredBy: userId,
      trigger: "transition",
    });
    return;
  }

  // companies/people/investors/accelerators have `name`; jobs/events/research/resources have `title`.
  const usesName = normalized === "company" || normalized === "person" ||
                   normalized === "investor" || normalized === "accelerator";
  const titleCol = usesName ? (table as any).name : (table as any).title;

  const row = await db
    .select({ slug: (table as any).slug, label: titleCol })
    .from(table)
    .where(eq((table as any).id, entityId))
    .limit(1);
  if (!row[0] || !(row[0] as any).slug) return;

  onEntityPublished({
    entityType: normalized,
    entityId,
    url: buildEntityUrl(normalized, (row[0] as any).slug),
    title: (row[0] as any).label || undefined,
    slug: (row[0] as any).slug,
    triggeredBy: userId,
    trigger: "transition",
  });
}
