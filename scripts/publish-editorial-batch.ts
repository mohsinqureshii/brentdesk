#!/usr/bin/env tsx
/**
 * Publish (or un-publish) every article belonging to one editorial batch.
 * ----------------------------------------------------------------------
 * The batch importer deliberately never publishes — it files everything as
 * a draft. This is the separate, explicit step that takes those drafts
 * live, scoped to a single batch so it can never touch anything else in
 * the newsroom.
 *
 *   Dry run (default, writes nothing):
 *     tsx scripts/publish-editorial-batch.ts --batch=leap-deepfest-2026-day1
 *
 *   Publish:
 *     tsx scripts/publish-editorial-batch.ts --batch=... --execute
 *
 *   Publish gradually — oldest sequence first, N at a time:
 *     tsx scripts/publish-editorial-batch.ts --batch=... --limit=10 --execute
 *
 *   Put them all back to draft:
 *     tsx scripts/publish-editorial-batch.ts --batch=... --revert --execute
 *
 * WHY A DIRECT STATUS WRITE, NOT workflowService.executeTransition:
 * the seeded editorial workflow has no path into `published`. Its only
 * inbound transition is `scheduled -> published`, and nothing transitions
 * into `scheduled` — so `published` is unreachable through the graph. The
 * admin editor has always written `statusId` directly for this reason.
 * This script does the same thing, but writes a workflow_audit_log row for
 * every article so the change is still traceable to a user and reversible.
 *
 * publishedAt is written in MySQL's `YYYY-MM-DD HH:MM:SS` form. Under
 * STRICT_TRANS_TABLES (the default) MySQL rejects the ISO-8601 string
 * `new Date().toISOString()` produces, because of the fractional seconds
 * and trailing `Z`.
 */

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../server/db";
import {
  articles,
  articleEditorialBatches,
  editorialBatches,
  users,
  workflowAuditLog,
  workflowStatuses,
} from "../drizzle/schema";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const batchKey = value("batch") ?? "leap-deepfest-2026-day1";
const execute = flag("execute");
const revert = flag("revert");
const limit = Number(value("limit") ?? "0") || 0;
const actorName = value("actor") ?? "TechScoop Desk";

/** MySQL DATETIME literal in UTC. */
function mysqlNow(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL.");

  const [batch] = await (db as any)
    .select()
    .from(editorialBatches)
    .where(eq(editorialBatches.batchKey, batchKey))
    .limit(1);
  if (!batch) throw new Error(`Editorial batch '${batchKey}' was not found.`);

  const targetSlug = revert ? "draft" : "published";
  const [target] = await (db as any)
    .select()
    .from(workflowStatuses)
    .where(and(
      eq(workflowStatuses.workflowType, "editorial"),
      eq(workflowStatuses.slug, targetSlug),
    ))
    .limit(1);
  if (!target) throw new Error(`Editorial workflow status '${targetSlug}' was not found.`);

  // The actor is recorded on every audit row, so a bulk publish is
  // attributable to a real account rather than appearing from nowhere.
  const everyone = await (db as any).select().from(users);
  const actor = everyone.find((u: any) =>
    [u.publicName, u.name, u.username]
      .filter(Boolean)
      .some((v: string) => v.trim().toLowerCase() === actorName.trim().toLowerCase()));
  if (!actor) throw new Error(`Actor '${actorName}' was not found. Pass --actor="<name>".`);

  const rows = await (db as any)
    .select({
      articleId: articleEditorialBatches.articleId,
      sequence: articleEditorialBatches.sequence,
      title: articles.title,
      slug: articles.slug,
      statusId: articles.statusId,
      publishedAt: articles.publishedAt,
    })
    .from(articleEditorialBatches)
    .innerJoin(articles, eq(articles.id, articleEditorialBatches.articleId))
    .where(eq(articleEditorialBatches.batchId, batch.id))
    .orderBy(articleEditorialBatches.sequence);

  const pending = rows.filter((r: any) => r.statusId !== target.id);
  const slice = limit > 0 ? pending.slice(0, limit) : pending;

  const report = {
    batchKey,
    action: revert ? "revert-to-draft" : "publish",
    dryRun: !execute,
    actor: actor.publicName || actor.name,
    inBatch: rows.length,
    alreadyInTargetState: rows.length - pending.length,
    willChange: slice.length,
    articles: slice.map((r: any) => ({
      sequence: r.sequence,
      id: r.articleId,
      slug: r.slug,
      title: r.title,
    })),
  };

  if (!execute || slice.length === 0) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const ids = slice.map((r: any) => r.articleId);
  const now = mysqlNow();

  await (db as any).transaction(async (tx: any) => {
    for (const row of slice) {
      await tx.insert(workflowAuditLog).values({
        entityType: "article",
        entityId: row.articleId,
        fromStatusId: row.statusId,
        toStatusId: target.id,
        userId: actor.id,
        comment: revert
          ? `Reverted to draft with editorial batch ${batchKey}`
          : `Published with editorial batch ${batchKey}`,
      } as any);
    }

    await tx.update(articles).set({ statusId: target.id } as any).where(inArray(articles.id, ids));

    if (revert) {
      // Leave publishedAt intact: it is the article's intended display
      // date, not a record of when the button was pressed, and clearing it
      // would lose the editorial datetime the batch carried.
    } else {
      // Only fill a missing date. An article that already carries one —
      // every article in this batch does — keeps it, so re-publishing
      // never silently rewrites the newsroom's own timestamps.
      await tx
        .update(articles)
        .set({ publishedAt: now } as any)
        .where(and(inArray(articles.id, ids), sql`${articles.publishedAt} IS NULL`));
    }
  });

  console.log(JSON.stringify({ ...report, dryRun: false, changed: ids.length }, null, 2));
  console.log(
    revert
      ? "\nReverted. Regenerate sitemaps so the URLs drop out again."
      : "\nPublished. Regenerate sitemaps and ping search engines to get them indexed.",
  );
}

main()
  .then(() => {
    // The shared db module keeps a mysql2 pool open, which holds the event
    // loop alive after the work is done. Exit explicitly so the script
    // terminates instead of hanging a deploy job.
    process.exit(0);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
