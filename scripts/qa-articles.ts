/**
 * Editorial QA gate. Runs over the researched article JSON before ingestion
 * and enforces the rules in content/EDITORIAL_BRIEF.md mechanically, so a
 * violation is caught here rather than on the live site.
 *
 * Exits non-zero if any article fails. Warnings do not fail the run.
 *
 * Run: pnpm tsx scripts/qa-articles.ts
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";

const DIR = path.resolve(import.meta.dirname, "..", "content", "articles");

const AUTHORS = new Set([
  "Mo Qureshi", "Jakson Gudawela", "BrentDesk Staff", "BrentDesk Research",
  // Collaborative byline used on the Big 5 flagship pieces.
  "Mo Qureshi + BrentDesk Staff",
]);

const CATEGORIES = new Set([
  "construction", "energy", "industrial-technology", "infrastructure", "logistics",
  "manufacturing", "mining", "real-estate", "transportation", "utilities", "engineering",
  "epc", "roads", "telecom-infrastructure", "water", "oil-gas", "power", "renewables",
  "chemicals", "heavy-equipment", "machinery", "ports", "supply-chain", "warehousing",
  "facilities-management", "aviation", "rail", "metals", "automation", "data-centers",
  "industrial-ai", "robotics",
]);

/** Structural tells of AI/PR/SEO prose the brief bans outright. */
const BANNED_PHRASES = [
  "key takeaways", "in conclusion", "conclusion:", "why it matters",
  "what comes next", "what happened:", "introduction:",
  "revolutioniz", "revolutionis", "game-changing", "game changing",
  "unlocks the future", "redefines", "transformative journey",
  "pioneering landscape", "new era of innovation", "in today's fast-paced",
  "it is important to note", "stands as a testament", "paving the way for a",
];

/**
 * "groundbreaking" is banned as a puff adjective but is the correct industrial
 * noun for turning the first soil on a plant — "after four years of
 * groundbreakings" is exactly the usage the brief's "unless genuinely required
 * by the facts" clause protects. Flag only the adjectival sense.
 */
const PUFF_PATTERNS: Array<[RegExp, string]> = [
  [/\bgroundbreaking\s+(?:technology|innovation|project|deal|partnership|agreement|initiative|work|research|approach)\b/i,
   "groundbreaking used as a puff adjective"],
];

/**
 * Claims of non-public sourcing. These assert a private source, a briefing
 * or an exclusive, and none of this archive has one — banned outright.
 */
const FALSE_PROVENANCE = [
  "brentdesk learned", "sources told brentdesk", "brentdesk previously revealed",
  "brentdesk understands", "brentdesk has learned", "told brentdesk",
  "brentdesk revealed", "brentdesk can reveal", "brentdesk exclusively",
];

/**
 * Self-citation. "As BrentDesk reported" is honest when it points at an
 * article BrentDesk actually published, and a fabrication when it does not.
 * A blanket ban blocked genuine cross-references into the archive, so the
 * test is whether the sentence carries a link to a real internal article.
 */
const SELF_CITATION = /brentdesk reported/i;

/** Reader-facing admissions of the research limitation, which must not ship. */
const LEAKED_METHODOLOGY = [
  "could not be opened", "primary source could not", "search results",
  "webfetch", "could not be verified", "according to our research",
  "unable to access",
];

/** articles.articleType is a MySQL enum — anything else fails the insert. */
const ARTICLE_TYPES = new Set(["news", "opinion", "press_release", "report", "interview"]);

const ARCHIVE_START = "2025-09-14";
/** The gate runs on the day an article is published, so "today" is the
 *  machine's date, not a constant that quietly went stale the day after it
 *  was written and then failed every article dated after it. */
const TODAY = new Date().toISOString().slice(0, 10);
/** How far ahead a commission may be dated while flagged SCHEDULED. */
const SCHEDULE_HORIZON = new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10);

/**
 * Commission numbers that were retired on purpose. The coverage check below
 * insists every number in the original brief exists, which is right for a
 * commission that was never written and wrong for one that was merged into
 * a later article: the merge is recorded in content/redirects.json and the
 * old URL answers with a 301. Empty since the merged articles were restored.
 */
const RETIRED_COMMISSIONS = new Map<number, string>([]);

interface Issue { file: string; level: "error" | "warn"; message: string }
const issues: Issue[] = [];
const err = (file: string, message: string) => issues.push({ file, level: "error", message });
const warn = (file: string, message: string) => issues.push({ file, level: "warn", message });

const files = readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
const seenSlugs = new Map<string, string>();
const seenCommissions = new Map<number, string>();
const seenHeadlines = new Map<string, string>();
const rows: any[] = [];

for (const file of files) {
  let parsed: any;
  try {
    parsed = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
  } catch (e) {
    err(file, `invalid JSON: ${(e as Error).message}`);
    continue;
  }
  const batch = Array.isArray(parsed) ? parsed : [parsed];

  for (const a of batch) {
    const required = ["commission", "headline", "slug", "excerpt", "content", "author",
      "primaryCategory", "eventDate", "primarySourceUrl", "primarySourceName",
      "seoTitle", "seoDescription", "researchConfidence"];
    for (const f of required) {
      if (a[f] === undefined || a[f] === null || a[f] === "") err(file, `missing "${f}"`);
    }
    if (issues.some(i => i.file === file && i.level === "error")) { rows.push({ file, ...a }); continue; }

    // Identity — duplicates would collide in the CMS or read as repetition.
    const dupSlug = seenSlugs.get(a.slug);
    if (dupSlug) err(file, `duplicate slug "${a.slug}" (also in ${dupSlug})`);
    seenSlugs.set(a.slug, file);

    const dupCom = seenCommissions.get(a.commission);
    if (dupCom) err(file, `duplicate commission ${a.commission} (also in ${dupCom})`);
    seenCommissions.set(a.commission, file);

    const hKey = a.headline.toLowerCase().trim();
    const dupH = seenHeadlines.get(hKey);
    if (dupH) err(file, `duplicate headline (also in ${dupH})`);
    seenHeadlines.set(hKey, file);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) err(file, `slug not clean: "${a.slug}"`);

    // Bylines and taxonomy.
    if (!AUTHORS.has(a.author)) err(file, `unapproved byline "${a.author}"`);
    if (!CATEGORIES.has(a.primaryCategory)) err(file, `unknown category "${a.primaryCategory}"`);
    if (a.articleType && !ARTICLE_TYPES.has(a.articleType)) {
      err(file, `articleType "${a.articleType}" is not in the schema enum (${[...ARTICLE_TYPES].join(", ")})`);
    }

    // Confidence — C must have been replaced, not published.
    if (!["A", "B"].includes(a.researchConfidence)) {
      err(file, `confidence "${a.researchConfidence}" — only A and B may publish`);
    }

    // Dates. A commission dated after today is legitimate — the brief runs to
    // 3 September and today is the 2nd — but it may not be published as though
    // it already ran. Such a file must declare itself scheduled and say why,
    // and the ingest skips it until its date arrives.
    const scheduled = a.status === "SCHEDULED";
    if (scheduled && !a.scheduledReason) err(file, `status SCHEDULED with no scheduledReason`);
    const latest = scheduled ? SCHEDULE_HORIZON : TODAY;

    for (const f of ["eventDate", "informationCutoff"]) {
      if (a[f] && !/^\d{4}-\d{2}-\d{2}$/.test(a[f])) err(file, `${f} not YYYY-MM-DD: "${a[f]}"`);
    }
    if (a.eventDate < ARCHIVE_START || a.eventDate > latest) {
      err(file, `eventDate ${a.eventDate} outside the ${scheduled ? "scheduling" : "archive"} window ${ARCHIVE_START}..${latest}`);
    }
    if (scheduled && a.eventDate <= TODAY) {
      err(file, `status SCHEDULED but eventDate ${a.eventDate} is not in the future — publish it instead`);
    }
    if (a.informationCutoff) {
      if (a.informationCutoff < a.eventDate) {
        err(file, `informationCutoff ${a.informationCutoff} precedes eventDate ${a.eventDate}`);
      }
      if (a.informationCutoff > latest) err(file, `informationCutoff ${a.informationCutoff} is in the future`);
    }

    // Sources.
    if (!/^https?:\/\//.test(a.primarySourceUrl)) err(file, `primarySourceUrl is not a URL`);
    const secondary: string[] = a.secondarySourceUrls ?? [];
    if (a.researchConfidence === "B" && secondary.length < 1) {
      warn(file, `grade B with no secondary source listed`);
    }

    // Body.
    const html: string = a.content;
    if (/<h[1-3][\s>]/i.test(html)) {
      const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      if (words < 1000) err(file, `headings in a ${words}-word article — news articles take none`);
      else warn(file, `headings present (${words} words) — allowed only if genuinely necessary`);
    }
    if (/^#{1,6}\s|\*\*[^*]+\*\*/m.test(html)) err(file, `markdown in content — HTML only`);
    if (!/^\s*<p[\s>]/i.test(html)) err(file, `content does not start with a <p>`);

    // Scan the prose, not the markup — an href full of slugs is not copy.
    const scanned = (html.replace(/<[^>]+>/g, " ") + " " + a.headline + " " +
      a.excerpt + " " + (a.deck ?? ""));
    const lower = scanned.toLowerCase();
    for (const p of BANNED_PHRASES) if (lower.includes(p)) err(file, `banned phrasing: "${p}"`);
    for (const [re, label] of PUFF_PATTERNS) if (re.test(scanned)) err(file, label);
    for (const p of FALSE_PROVENANCE) if (lower.includes(p)) err(file, `claims non-public sourcing: "${p}"`);
    if (SELF_CITATION.test(html) && !/href="\/(article\/)?[a-z0-9-]+(\/[a-z0-9-]+)?"/.test(html)) {
      err(file, `"BrentDesk reported" with no link to the article being cited`);
    }
    for (const p of LEAKED_METHODOLOGY) if (lower.includes(p)) err(file, `research methodology leaked into copy: "${p}"`);

    const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    if (words < 420) err(file, `only ${words} words — below the floor for a news article`);
    if (words > 1800) warn(file, `${words} words — long even for a flagship feature`);

    const listItems = (html.match(/<li[\s>]/gi) ?? []).length;
    if (listItems > 8) warn(file, `${listItems} list items — the brief prefers prose`);

    // Quotes must carry attribution somewhere in the piece. Check the prose
    // with tags stripped — an href is full of straight quotes — and match
    // typographic marks by escape so the check survives re-encoding.
    const prose = html.replace(/<[^>]+>/g, " ");
    const quoted = (prose.match(/[\u201C\u2018"][^\u201D\u2019"]{25,}[\u201D\u2019"]/g) ?? []).length;
    // Cover the inflections a reporter actually writes — "saying the company
    // was..." attributes just as well as "said" and was failing this check.
    const ATTRIBUTION = /\b(?:said|says|saying|told|telling|according to|wrote|writes|stated|states|added|adds|described|per)\b/i;
    if (quoted > 0 && !ATTRIBUTION.test(prose)) {
      err(file, `${quoted} long quotation(s) with no attribution verb`);
    }

    // SEO.
    if (a.seoTitle.length > 70) warn(file, `seoTitle ${a.seoTitle.length} chars`);
    if (a.seoDescription.length > 170) warn(file, `seoDescription ${a.seoDescription.length} chars`);

    if (a.imageReviewRequired !== true) warn(file, `imageReviewRequired not set`);

    rows.push({ file, ...a, actualWords: words });
  }
}

// Internal links must resolve. Articles now cross-reference each other, and
// a link to a slug that does not exist is a 404 for the reader and a broken
// signal for a crawler — worse than no link at all.
{
  const slugs = new Set(rows.map(r => r.slug));
  for (const r of rows) {
    for (const m of String(r.content ?? "").matchAll(/href="\/([^"]+)"/g)) {
      const target = m[1];
      let slug: string | null = null;
      if (target.startsWith("article/")) slug = target.slice("article/".length);
      else {
        const parts = target.split("/");
        if (parts.length === 2 && CATEGORIES.has(parts[0])) slug = parts[1];
      }
      if (slug && !slugs.has(slug.replace(/[#?].*$/, ""))) {
        issues.push({ file: r.file, level: "error", message: `internal link to unknown article "/${target}"` });
      }
    }
  }
}

// Coverage.
for (let n = 1; n <= 100; n++) {
  if (seenCommissions.has(n) || RETIRED_COMMISSIONS.has(n)) continue;
  issues.push({ file: "-", level: "error", message: `commission ${String(n).padStart(3, "0")} missing` });
}

const errors = issues.filter(i => i.level === "error");
const warns = issues.filter(i => i.level === "warn");

for (const i of errors) console.error(`ERROR ${i.file}: ${i.message}`);
for (const i of warns) console.warn(`warn  ${i.file}: ${i.message}`);

console.log(`\n${rows.length} articles · ${errors.length} errors · ${warns.length} warnings`);
if (rows.length) {
  const byAuthor: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byConf: Record<string, number> = {};
  for (const r of rows) {
    byAuthor[r.author] = (byAuthor[r.author] ?? 0) + 1;
    if (r.eventDate) byMonth[r.eventDate.slice(0, 7)] = (byMonth[r.eventDate.slice(0, 7)] ?? 0) + 1;
    byConf[r.researchConfidence] = (byConf[r.researchConfidence] ?? 0) + 1;
  }
  console.log("bylines:   ", JSON.stringify(byAuthor));
  console.log("confidence:", JSON.stringify(byConf));
  console.log("by month:  ", JSON.stringify(Object.fromEntries(Object.entries(byMonth).sort())));
  const replaced = rows.filter(r => r.replacementOf);
  console.log(`replacements: ${replaced.length}`);
}

process.exit(errors.length ? 1 : 0);
