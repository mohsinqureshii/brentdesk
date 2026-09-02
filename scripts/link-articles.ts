/**
 * Editorial cross-linking and category assignment.
 *
 * Two passes over content/articles/*.json, both idempotent:
 *
 * 1. CATEGORIES — an article gets its primary category plus every ancestor
 *    (oil-gas implies energy), plus any category its tags clearly indicate.
 *    article_categories is what relatedContent.service scores relatedness on;
 *    with only a primaryCategoryId set it was falling back to "most recent",
 *    which is not relatedness at all.
 *
 * 2. INTERNAL LINKS — where one article names a subject another article
 *    covers, the first unlinked mention becomes a link to it. This is the
 *    linking the brief asks for: contextual, inside the prose, no "related
 *    reading" block bolted to the end.
 *
 * Linking rules, kept deliberately conservative because a wrong link is
 * worse than a missing one:
 *   - anchor on a distinctive subject (company or project name), never on a
 *     generic word;
 *   - only the FIRST unlinked occurrence, and never inside an existing <a>;
 *   - never link an article to itself, and never both ways between the same
 *     pair — the older article does not link forward to news it predates;
 *   - at most MAX_LINKS outbound internal links per article;
 *   - the target must share a company, a category or a tag, so the link is
 *     about something, not just topical drift.
 *
 * Run: pnpm tsx scripts/link-articles.ts [--write]
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";

const DIR = path.resolve(import.meta.dirname, "..", "content", "articles");
const WRITE = process.argv.includes("--write");
const MAX_LINKS = 4;

/** Category slug -> parent slug. Mirrors the seeded taxonomy. */
const PARENT: Record<string, string> = {
  engineering: "construction", epc: "construction",
  "oil-gas": "energy", power: "energy", renewables: "energy",
  automation: "industrial-technology", "data-centers": "industrial-technology",
  "industrial-ai": "industrial-technology", robotics: "industrial-technology",
  roads: "infrastructure", "telecom-infrastructure": "infrastructure", water: "infrastructure",
  ports: "logistics", "supply-chain": "logistics", warehousing: "logistics",
  chemicals: "manufacturing", "heavy-equipment": "manufacturing", machinery: "manufacturing",
  metals: "mining", "facilities-management": "real-estate",
  aviation: "transportation", rail: "transportation",
};

/** Tag or phrase -> an additional category it clearly indicates. */
const TAG_CATEGORY: Array<[RegExp, string]> = [
  [/\b(refinery|refining|petrochemical|downstream|lng|gas)\b/i, "oil-gas"],
  [/\b(solar|wind|renewable|hydrogen)\b/i, "renewables"],
  [/\b(grid|transmission|substation|power plant|generation|battery storage)\b/i, "power"],
  [/\b(desalination|water)\b/i, "water"],
  [/\b(port|terminal|container|teu)\b/i, "ports"],
  [/\b(rail|railway|freight corridor)\b/i, "rail"],
  [/\b(airport|aviation|terminal concession)\b/i, "aviation"],
  [/\b(warehouse|warehousing|logistics centre|logistics center)\b/i, "warehousing"],
  [/\b(steel|aluminium|aluminum|copper|gold|smelter)\b/i, "metals"],
  [/\b(factory|factories|manufacturing|plant|assembly)\b/i, "manufacturing"],
  [/\b(robot|robotics)\b/i, "robotics"],
  [/\b(data centre|data center)\b/i, "data-centers"],
  [/\b(artificial intelligence|machine learning|\bai\b)\b/i, "industrial-ai"],
  [/\b(automation|automated)\b/i, "automation"],
  [/\b(procurement|supply chain|localisation|localization)\b/i, "supply-chain"],
  [/\b(contractor|contract award|construction)\b/i, "construction"],
  [/\b(mining|mineral|exploration licence)\b/i, "mining"],
  [/\b(chemical|petrochemicals)\b/i, "chemicals"],
];

const VALID = new Set([
  "construction", "energy", "industrial-technology", "infrastructure", "logistics",
  "manufacturing", "mining", "real-estate", "transportation", "utilities", "engineering",
  "epc", "roads", "telecom-infrastructure", "water", "oil-gas", "power", "renewables",
  "chemicals", "heavy-equipment", "machinery", "ports", "supply-chain", "warehousing",
  "facilities-management", "aviation", "rail", "metals", "automation", "data-centers",
  "industrial-ai", "robotics",
]);

interface Article {
  commission: number; headline: string; slug: string; content: string;
  events?: string[];
  primaryCategory: string; categories?: string[]; tags?: string[];
  companies?: string[]; eventDate: string; internalLinks?: string[];
  [k: string]: any;
}

const files = readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
const byFile = new Map<string, Article[]>();
const all: Article[] = [];
for (const f of files) {
  const batch: Article[] = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  byFile.set(f, batch);
  all.push(...batch);
}

// ---------------------------------------------------------------- categories
function assignCategories(a: Article): string[] {
  const out = new Set<string>([a.primaryCategory]);

  // Every ancestor: an oil-gas story belongs in energy too.
  let cur = a.primaryCategory;
  while (PARENT[cur]) { cur = PARENT[cur]; out.add(cur); }

  // Whatever the tags and headline clearly indicate.
  const hay = [a.headline, ...(a.tags ?? [])].join(" ");
  for (const [re, cat] of TAG_CATEGORY) {
    if (re.test(hay) && VALID.has(cat)) {
      out.add(cat);
      let p = cat;
      while (PARENT[p]) { p = PARENT[p]; out.add(p); }
    }
  }

  // Keep it meaningful: primary first, at most four.
  const ordered = [a.primaryCategory, ...[...out].filter(c => c !== a.primaryCategory)];
  return ordered.slice(0, 4);
}

// -------------------------------------------------------------------- links
/** A phrase that can anchor a link to this article.
 *
 *  The anchor must be a SUBJECT of the target, not merely a name that
 *  appears somewhere in it. Requiring the phrase in the target's headline
 *  is what enforces that: a first pass anchored on any shared company and
 *  produced links like "Microsoft" in a UAE data-centre piece pointing at
 *  an article about Aramco's refinery AI — both mention Microsoft, neither
 *  is about it. A reader following that link is misled, and a search engine
 *  reads it as a topical signal that is simply false. */
function anchors(a: Article): string[] {
  const out: string[] = [];
  const headline = a.headline;

  for (const c of a.companies ?? []) {
    // Institutional names are too generic to anchor safely.
    if (/^(Ministry|General Authority|National Centre|Royal Commission|Public Investment Fund)\b/i.test(c)) continue;
    if (c.length < 4) continue;
    // The company must be named in the headline, or be an unambiguous
    // shortening of something in it ("ADNOC Gas" for a headline about ADNOC).
    const head = c.split(" ")[0];
    if (headline.includes(c) || (head.length >= 5 && headline.includes(head))) out.push(c);
  }

  // Distinctive multi-word project names from the headline itself.
  for (const m of headline.matchAll(/\b([A-Z][a-z]+(?:[ -][A-Z][a-z']+){1,3})\b/g)) {
    const p = m[1];
    if (p.length >= 8 && !/^(Saudi Arabia|The |A |An |United States|United Arab|Abu Dhabi|New |More )/.test(p)) out.push(p);
  }
  return [...new Set(out)].filter(distinctive).sort((x, y) => y.length - x.length);
}

/** How many headlines in the archive a phrase fits.
 *
 *  A phrase that fits a hundred headlines identifies nothing. Across the Big
 *  5 package "Construct Saudi" matched the project-name pattern in almost
 *  every headline, so most articles ended up anchored on it and pointed at
 *  whichever show piece happened to score highest — a link about nothing.
 *  An anchor has to pick out its target. */
const MAX_HEADLINE_SHARE = 3;
const headlineFreq = new Map<string, number>();
function distinctive(phrase: string): boolean {
  let n = headlineFreq.get(phrase);
  if (n === undefined) {
    n = all.filter(x => x.headline.includes(phrase)).length;
    headlineFreq.set(phrase, n);
  }
  return n <= MAX_HEADLINE_SHARE;
}

function relatedness(a: Article, b: Article): number {
  let score = 0;
  const ac = new Set(a.companies ?? []), bc = new Set(b.companies ?? []);
  for (const c of ac) if (bc.has(c)) score += 3;
  // Two articles covering the same exhibition are about the same thing.
  // The show names used to sit in `companies` and scored here as a side
  // effect; they are events now, so count them deliberately.
  const ae = new Set(a.events ?? []);
  for (const e of b.events ?? []) if (ae.has(e)) score += 2;
  if (a.primaryCategory === b.primaryCategory) score += 2;
  const acat = new Set(a.categories ?? []);
  for (const c of b.categories ?? []) if (c !== b.primaryCategory && acat.has(c)) score += 1;
  const at = new Set((a.tags ?? []).map(t => t.toLowerCase()));
  for (const t of b.tags ?? []) if (at.has(t.toLowerCase())) score += 1;
  return score;
}

/** Insert a link on the first occurrence of `phrase` that is not already
 *  inside an anchor or an HTML attribute. */
function linkFirst(html: string, phrase: string, href: string): string | null {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^\\w>])(${esc})(?![\\w])`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const before = html.slice(0, m.index);
    // Inside an existing <a>…</a>?
    const lastOpen = before.lastIndexOf("<a ");
    const lastClose = before.lastIndexOf("</a>");
    if (lastOpen > lastClose) continue;
    // Inside a tag?
    if (before.lastIndexOf("<") > before.lastIndexOf(">")) continue;
    return html.slice(0, m.index) + m[1] + `<a href="${href}">${m[2]}</a>` + html.slice(m.index + m[0].length);
  }
  return null;
}

let catChanges = 0, linkChanges = 0;
const linkLog: string[] = [];

for (const a of all) {
  const cats = assignCategories(a);
  if (JSON.stringify(a.categories ?? []) !== JSON.stringify(cats)) { a.categories = cats; catChanges++; }
}

for (const a of all) {
  const existing = new Set<string>(a.internalLinks ?? []);
  const candidates = all
    .filter(b => b.slug !== a.slug)
    // Only link backwards in time: an article must not reference news that
    // had not happened when it was written.
    .filter(b => b.eventDate <= a.eventDate)
    .filter(b => !existing.has(b.slug))
    .map(b => ({ b, score: relatedness(a, b) }))
    .filter(x => x.score >= 3)
    .sort((x, y) => y.score - x.score || (x.b.eventDate < y.b.eventDate ? 1 : -1));

  let added = 0;
  for (const { b } of candidates) {
    if ((a.internalLinks?.length ?? 0) + added >= MAX_LINKS) break;
    const href = `/${b.primaryCategory}/${b.slug}`;
    if (a.content.includes(`href="${href}"`)) continue;
    for (const phrase of anchors(b)) {
      const next = linkFirst(a.content, phrase, href);
      if (next) {
        a.content = next;
        a.internalLinks = [...(a.internalLinks ?? []), b.slug];
        linkLog.push(`${String(a.commission).padStart(3, "0")} -> ${String(b.commission).padStart(3, "0")}  "${phrase}"`);
        added++; linkChanges++;
        break;
      }
    }
  }
}

if (WRITE) {
  for (const [f, batch] of byFile) {
    writeFileSync(path.join(DIR, f), JSON.stringify(batch, null, 2) + "\n");
  }
}

const linked = all.filter(a => (a.internalLinks?.length ?? 0) > 0).length;
const avgCats = (all.reduce((n, a) => n + (a.categories?.length ?? 0), 0) / all.length).toFixed(1);
console.log(linkLog.join("\n"));
console.log(`\n${all.length} articles · ${catChanges} category sets written · avg ${avgCats} categories`);
console.log(`${linkChanges} internal links added · ${linked}/${all.length} articles now link out`);
console.log(WRITE ? "written" : "dry run — pass --write to save");
