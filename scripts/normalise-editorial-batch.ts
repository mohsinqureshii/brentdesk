#!/usr/bin/env tsx
/**
 * Apply TechScoop house style to an imported editorial batch.
 * ----------------------------------------------------------------------
 *   - titles (and seoTitle / ogTitle) from Title Case to sentence case,
 *     preserving brand names, acronyms and named entities
 *   - remove <h2> section headings from the body
 *   - remove the trailing "References" block
 *
 *   Dry run — prints every change, writes nothing (default):
 *     tsx scripts/normalise-editorial-batch.ts --batch=leap-deepfest-2026-day1
 *
 *   Apply:
 *     tsx scripts/normalise-editorial-batch.ts --batch=... --execute
 *
 *   Undo, restoring the pre-change snapshot:
 *     tsx scripts/normalise-editorial-batch.ts --batch=... --restore --execute
 *
 * Scoped to one batch, so it can never touch the rest of the newsroom.
 * Before writing anything it snapshots title, seoTitle, ogTitle and
 * content for every article into editorial_style_backup, which is what
 * --restore reads. The snapshot is taken once and never overwritten, so
 * restore always returns to the original import.
 *
 * The source URLs removed with the References block are NOT lost: the
 * importer already wrote them to article_source_references.
 */

import { eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../server/db";
import {
  articles,
  articleCompanies,
  articleEditorialBatches,
  articlePeople,
  companies,
  editorialBatches,
  people,
} from "../drizzle/schema";
import {
  buildProtectedWords,
  sentenceCaseTitle,
  stripCitationMarkers,
  stripHeadings,
  stripReferences,
} from "./lib/editorialStyle";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};

const batchKey = val("batch") ?? "leap-deepfest-2026-day1";
const execute = flag("execute");
const restore = flag("restore");

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL.");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS editorial_style_backup (
      articleId int NOT NULL,
      title varchar(512),
      seoTitle varchar(512),
      ogTitle varchar(512),
      content longtext,
      capturedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (articleId)
    )`);

  const [batch] = await (db as any)
    .select().from(editorialBatches)
    .where(eq(editorialBatches.batchKey, batchKey)).limit(1);
  if (!batch) throw new Error(`Editorial batch '${batchKey}' was not found.`);

  const rows = await (db as any)
    .select({
      id: articles.id,
      sequence: articleEditorialBatches.sequence,
      title: articles.title,
      seoTitle: articles.seoTitle,
      ogTitle: articles.ogTitle,
      content: articles.content,
    })
    .from(articleEditorialBatches)
    .innerJoin(articles, eq(articles.id, articleEditorialBatches.articleId))
    .where(eq(articleEditorialBatches.batchId, batch.id))
    .orderBy(articleEditorialBatches.sequence);

  if (rows.length === 0) throw new Error(`Batch '${batchKey}' has no articles.`);

  // ------------------------------------------------------------ restore
  if (restore) {
    const backup: any = await db.execute(
      sql`SELECT articleId, title, seoTitle, ogTitle, content FROM editorial_style_backup`);
    const list = (Array.isArray(backup) ? (Array.isArray(backup[0]) ? backup[0] : backup) : []) as any[];
    const byId = new Map(list.map((b) => [Number(b.articleId), b]));
    const targets = rows.filter((r: any) => byId.has(r.id));
    console.log(JSON.stringify({ action: "restore", dryRun: !execute, willRestore: targets.length }, null, 2));
    if (!execute) return;
    for (const r of targets) {
      const b = byId.get(r.id)!;
      await (db as any).update(articles)
        .set({ title: b.title, seoTitle: b.seoTitle, ogTitle: b.ogTitle, content: b.content } as any)
        .where(eq(articles.id, r.id));
    }
    console.log(`Restored ${targets.length} articles to their imported state.`);
    return;
  }

  // The protected vocabulary is built from the entities these articles
  // actually link to, so every company and person they name keeps its
  // casing without anyone maintaining a list by hand.
  const ids = rows.map((r: any) => r.id);
  const coNames = await (db as any)
    .select({ name: companies.name }).from(articleCompanies)
    .innerJoin(companies, eq(companies.id, articleCompanies.companyId))
    .where(inArray(articleCompanies.articleId, ids));
  const peopleNames = await (db as any)
    .select({ name: people.name }).from(articlePeople)
    .innerJoin(people, eq(people.id, articlePeople.personId))
    .where(inArray(articlePeople.articleId, ids));

  const protectedWords = buildProtectedWords([
    ...coNames.map((c: any) => c.name),
    ...peopleNames.map((p: any) => p.name),
    "LEAP 2026", "DeepFest 2026",
  ]);

  const changes: any[] = [];
  for (const r of rows) {
    const title = sentenceCaseTitle(r.title ?? "", protectedWords);
    const seoTitle = r.seoTitle ? sentenceCaseTitle(r.seoTitle, protectedWords) : r.seoTitle;
    const ogTitle = r.ogTitle ? sentenceCaseTitle(r.ogTitle, protectedWords) : r.ogTitle;
    // References FIRST. stripHeadings removes every <h2>, including the
    // "References" heading that stripReferences keys on — run the other
    // way round and the reference paragraph survives with its heading
    // gone, which is worse than not touching it at all.
    const withoutRefs = stripReferences(r.content ?? "");
    const content = stripCitationMarkers(stripHeadings(withoutRefs));

    const touched =
      title !== r.title || seoTitle !== r.seoTitle ||
      ogTitle !== r.ogTitle || content !== r.content;
    if (!touched) continue;

    changes.push({
      sequence: r.sequence, id: r.id,
      titleBefore: r.title, titleAfter: title,
      headingsRemoved: (r.content?.match(/<h[1-6]/gi) || []).length,
      referencesRemoved: withoutRefs.length < (r.content ?? "").length,
      bytesBefore: (r.content ?? "").length, bytesAfter: content.length,
      _write: { title, seoTitle, ogTitle, content },
    });
  }

  const summary = {
    batchKey, dryRun: !execute,
    articlesInBatch: rows.length,
    articlesChanged: changes.length,
    titlesChanged: changes.filter((c) => c.titleBefore !== c.titleAfter).length,
    headingsRemoved: changes.reduce((n, c) => n + c.headingsRemoved, 0),
    referenceBlocksRemoved: changes.filter((c) => c.referencesRemoved).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- titles ---");
  for (const c of changes) {
    if (c.titleBefore === c.titleAfter) continue;
    console.log(`${String(c.sequence).padStart(3)}  ${c.titleBefore}\n     ${c.titleAfter}`);
  }

  if (!execute) {
    console.log("\nDry run — nothing written. Re-run with --execute to apply.");
    return;
  }

  // Snapshot first, and only once: a second run must not overwrite the
  // original with already-normalised text, or restore becomes a no-op.
  for (const r of rows) {
    await db.execute(sql`
      INSERT IGNORE INTO editorial_style_backup (articleId, title, seoTitle, ogTitle, content)
      VALUES (${r.id}, ${r.title}, ${r.seoTitle}, ${r.ogTitle}, ${r.content})`);
  }

  await (db as any).transaction(async (tx: any) => {
    for (const c of changes) {
      await tx.update(articles).set(c._write as any).where(eq(articles.id, c.id));
    }
  });

  console.log(`\nApplied to ${changes.length} articles. Snapshot kept in editorial_style_backup.`);
  console.log("Undo with:  --restore --execute");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
