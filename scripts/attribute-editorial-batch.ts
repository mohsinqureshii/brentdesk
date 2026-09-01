#!/usr/bin/env tsx
/**
 * Add on-the-ground attribution to an imported batch.
 * ----------------------------------------------------------------------
 * Three things, each independently switchable:
 *
 *   --dateline    "Riyadh —" on the opening paragraph, and a closing line
 *                 saying TechScoop is reporting from the event. True for
 *                 a desk that is physically at LEAP.
 *   --sourceline  names the publisher the report draws on, from
 *                 article_source_references. Restores the provenance the
 *                 reference block used to carry, in one readable line
 *                 instead of a numbered bibliography.
 *   --interviews=FILE
 *                 inserts real, attributed interview lines. See below.
 *
 *   tsx scripts/attribute-editorial-batch.ts --batch=... --dateline --sourceline
 *   tsx scripts/attribute-editorial-batch.ts --batch=... --interviews=interviews.json --execute
 *   tsx scripts/attribute-editorial-batch.ts --batch=... --restore --execute
 *
 * WHY INTERVIEWS COME FROM A FILE AND ARE NEVER GENERATED
 * "TechScoop's Mo spoke with ___" is a factual claim about a named person
 * agreeing to talk to a named reporter. Nothing in this batch records an
 * interview — all 100 articles are built from press releases and wire
 * copy — so there is nothing to derive one from, and inventing the name
 * would put words and access in a real person's mouth. The file is the
 * only way an interview line gets written, and every field in it comes
 * from you.
 *
 *   [
 *     {
 *       "sequence": 12,
 *       "reporter": "Mo",                       // omit for "TechScoop spoke with"
 *       "name": "Jane Doe",
 *       "role": "co-founder and CEO",
 *       "company": "Acme AI",
 *       "quote": "We picked Riyadh because the customers are here.",
 *       "context": "on the DeepFest floor"      // optional
 *     }
 *   ]
 *
 * A sequence not in the file gets no interview line. That is the point.
 */

import { readFileSync } from "node:fs";
import { eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../server/db";
import {
  articleEditorialBatches, articleSourceReferences, articles, editorialBatches,
} from "../drizzle/schema";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};

const batchKey = val("batch") ?? "leap-deepfest-2026-day1";
const eventName = val("event") ?? "LEAP 2026";
const city = val("city") ?? "Riyadh";
const interviewsPath = val("interviews");
const execute = flag("execute");
const restore = flag("restore");
// With no switches, do the two safe passes; interviews only ever run when
// a file is supplied.
const doDateline = flag("dateline") || (!flag("sourceline") && !interviewsPath);
const doSourceline = flag("sourceline") || (!flag("dateline") && !interviewsPath);

const esc = (s: string) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

interface Interview {
  sequence: number;
  reporter?: string;
  name: string;
  role?: string;
  company?: string;
  quote?: string;
  context?: string;
}

/** "TechScoop's Mo spoke with Jane Doe, co-founder of Acme AI, …" */
function interviewParagraph(iv: Interview): string {
  const who = iv.reporter ? `TechScoop&rsquo;s ${esc(iv.reporter)}` : "TechScoop";
  // "co-founder of Acme" but "head of product at Acme" — the preposition
  // depends on whether the role is a principal one or a functional one.
  const principal = /founder|chief|ceo|cto|coo|cfo|chair|president|partner|owner/i;
  const joiner = iv.role && principal.test(iv.role) ? "of" : "at";
  const desc = iv.role && iv.company
    ? `${esc(iv.role)} ${joiner} ${esc(iv.company)}`
    : esc(iv.role || iv.company || "");
  const subject = desc ? `${esc(iv.name)}, ${desc},` : esc(iv.name);
  const where = iv.context ? ` ${esc(iv.context)}` : ` at ${esc(eventName)}`;
  const lead = `${who} spoke with ${subject}${where}.`.replace(",.", ".");
  return iv.quote
    ? `<p>${lead} &ldquo;${esc(iv.quote)}&rdquo;</p>`
    : `<p>${lead}</p>`;
}

/**
 * The source table stores a hostname. Print the masthead where we know
 * it, and fall back to the bare domain rather than guessing — "Additional
 * detail from spa.gov.sa" is plain, but it is true.
 */
const PUBLISHERS: Record<string, string> = {
  "spa.gov.sa": "the Saudi Press Agency",
  "prnewswire.com": "PR Newswire",
  "businesswire.com": "Business Wire",
  "zawya.com": "Zawya",
  "linkedin.com": "LinkedIn",
  "sabq.org": "Sabq",
  "tahawultech.com": "TahawulTech",
  "aboutamazon.com": "About Amazon",
  "mubasher.info": "Mubasher",
  "middleeastainews.com": "Middle East AI News",
  "securities.io": "Securities.io",
  "data-volt.com": "DataVolt",
  "arabnews.com": "Arab News",
  "gulfbusiness.com": "Gulf Business",
};
const publisherName = (host: string) =>
  PUBLISHERS[host.replace(/^www\./, "").toLowerCase()] ?? host.replace(/^www\./, "");

const DATELINE_MARK = "data-ts-dateline";
const FOOTER_MARK = "data-ts-attribution";
const INTERVIEW_MARK = "data-ts-interview";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL.");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS editorial_attribution_backup (
      articleId int NOT NULL,
      content longtext,
      capturedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (articleId)
    )`);

  const [batch] = await (db as any)
    .select().from(editorialBatches)
    .where(eq(editorialBatches.batchKey, batchKey)).limit(1);
  if (!batch) throw new Error(`Batch '${batchKey}' not found.`);

  const rows = await (db as any)
    .select({
      id: articles.id, sequence: articleEditorialBatches.sequence,
      title: articles.title, content: articles.content,
    })
    .from(articleEditorialBatches)
    .innerJoin(articles, eq(articles.id, articleEditorialBatches.articleId))
    .where(eq(articleEditorialBatches.batchId, batch.id))
    .orderBy(articleEditorialBatches.sequence);

  if (restore) {
    const bk: any = await db.execute(sql`SELECT articleId, content FROM editorial_attribution_backup`);
    const list = (Array.isArray(bk) ? (Array.isArray(bk[0]) ? bk[0] : bk) : []) as any[];
    const byId = new Map(list.map((b) => [Number(b.articleId), b]));
    const targets = rows.filter((r: any) => byId.has(r.id));
    console.log(JSON.stringify({ action: "restore", dryRun: !execute, willRestore: targets.length }, null, 2));
    if (!execute) return;
    for (const r of targets) {
      await (db as any).update(articles)
        .set({ content: byId.get(r.id)!.content } as any).where(eq(articles.id, r.id));
    }
    console.log(`Restored ${targets.length} articles.`);
    return;
  }

  // Publisher per article, for the source line.
  const srcs = await (db as any)
    .select({ articleId: articleSourceReferences.articleId, publisher: articleSourceReferences.publisher })
    .from(articleSourceReferences)
    .where(and0(rows.map((r: any) => r.id)));
  const publisherByArticle = new Map<number, string>();
  for (const s of srcs as any[]) {
    if (s.publisher && !publisherByArticle.has(Number(s.articleId))) {
      publisherByArticle.set(Number(s.articleId), String(s.publisher));
    }
  }

  let interviews: Interview[] = [];
  if (interviewsPath) {
    interviews = JSON.parse(readFileSync(interviewsPath, "utf8"));
    for (const iv of interviews) {
      if (!iv.sequence || !iv.name) {
        throw new Error(`Every interview needs a sequence and a name: ${JSON.stringify(iv)}`);
      }
    }
  }
  const bySeq = new Map(interviews.map((i) => [Number(i.sequence), i]));

  const changes: any[] = [];
  for (const r of rows) {
    let html = String(r.content ?? "");
    const applied: string[] = [];

    if (doDateline && !html.includes(DATELINE_MARK)) {
      // Prefix the opening paragraph rather than adding a new one, so the
      // dateline reads as part of the lede the way a wire story does.
      const m = /<p(\s[^>]*)?>/i.exec(html);
      if (m) {
        const at = m.index + m[0].length;
        html = `${html.slice(0, at)}<strong ${DATELINE_MARK}="1">${esc(city)} &mdash;</strong> ${html.slice(at)}`;
        applied.push("dateline");
      }
    }

    const iv = bySeq.get(Number(r.sequence));
    if (iv && !html.includes(INTERVIEW_MARK)) {
      // Placed after the opening paragraph: the reporting belongs high in
      // the piece, not buried under the boilerplate.
      const close = html.indexOf("</p>");
      const para = interviewParagraph(iv).replace("<p>", `<p ${INTERVIEW_MARK}="1">`);
      html = close === -1
        ? html + para
        : `${html.slice(0, close + 4)}\n${para}${html.slice(close + 4)}`;
      applied.push("interview");
    }

    if (doSourceline && !html.includes(FOOTER_MARK)) {
      const pub = publisherByArticle.get(r.id);
      const src = pub ? ` Additional detail from ${esc(publisherName(pub))}.` : "";
      html += `\n<p ${FOOTER_MARK}="1"><em>TechScoop is reporting from ${esc(eventName)} in ${esc(city)}.${src}</em></p>`;
      applied.push("sourceline");
    }

    if (html !== r.content) {
      changes.push({ id: r.id, sequence: r.sequence, title: r.title, applied, html });
    }
  }

  console.log(JSON.stringify({
    batchKey, dryRun: !execute,
    articles: rows.length,
    changed: changes.length,
    dateline: changes.filter((c) => c.applied.includes("dateline")).length,
    sourceline: changes.filter((c) => c.applied.includes("sourceline")).length,
    interviewsSupplied: interviews.length,
    interviewsApplied: changes.filter((c) => c.applied.includes("interview")).length,
  }, null, 2));

  const withIv = changes.filter((c) => c.applied.includes("interview"));
  if (withIv.length) {
    console.log("\n--- interview lines ---");
    for (const c of withIv) {
      const iv = bySeq.get(Number(c.sequence))!;
      console.log(`${String(c.sequence).padStart(3)}  ${c.title}`);
      console.log(`     ${interviewParagraph(iv).replace(/<[^>]+>/g, "")}`);
    }
  }
  if (interviews.length && withIv.length < interviews.length) {
    const missing = interviews.filter((i) => !withIv.some((c) => c.sequence === i.sequence));
    console.log(`\n${missing.length} supplied interview(s) matched no article in this batch:`);
    for (const m of missing) console.log(`   sequence ${m.sequence} — ${m.name}`);
  }

  if (!execute) {
    console.log("\nDry run — nothing written. Re-run with --execute to apply.");
    return;
  }

  for (const r of rows) {
    await db.execute(sql`
      INSERT IGNORE INTO editorial_attribution_backup (articleId, content)
      VALUES (${r.id}, ${r.content})`);
  }
  await (db as any).transaction(async (tx: any) => {
    for (const c of changes) {
      await tx.update(articles).set({ content: c.html } as any).where(eq(articles.id, c.id));
    }
  });
  console.log(`\nApplied to ${changes.length} articles. Undo with:  --restore --execute`);
}

/** inArray that tolerates an empty id list. */
function and0(ids: number[]) {
  return ids.length ? inArray(articleSourceReferences.articleId, ids) : sql`1=0`;
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
