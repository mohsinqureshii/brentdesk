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

/**
 * Phrase -> a category it indicates.
 *
 * Deliberately broad. An article about a Jeddah port logistics centre
 * genuinely belongs in ports, logistics, supply-chain, construction and
 * infrastructure — filing it under one of those and calling the job done
 * hides it from four category pages a reader would have found it on.
 */
const TAG_CATEGORY: Array<[RegExp, string]> = [
  [/\b(refinery|refining|petrochemical|downstream|upstream|lng|crude|barrels|oilfield|gas plant)\b/i, "oil-gas"],
  [/\b(solar|wind|renewable|hydrogen|photovoltaic|pv plant)\b/i, "renewables"],
  [/\b(grid|transmission|substation|power plant|generation|megawatt|gigawatt|battery storage|ppa|electricity)\b/i, "power"],
  [/\b(desalination|water|wastewater|sewage|reverse osmosis)\b/i, "water"],
  [/\b(port|terminal|container|teu|berth|quay|shipping)\b/i, "ports"],
  [/\b(rail|railway|freight corridor|metro|locomotive)\b/i, "rail"],
  [/\b(airport|aviation|runway|terminal concession|air cargo)\b/i, "aviation"],
  [/\b(warehouse|warehousing|logistics centre|logistics center|distribution centre|fulfilment)\b/i, "warehousing"],
  [/\b(steel|aluminium|aluminum|copper|gold|smelter|rebar|foundry|casting)\b/i, "metals"],
  [/\b(factory|factories|manufacturing|plant|assembly|production line|localis|localiz)\b/i, "manufacturing"],
  [/\b(robot|robotics|autonomous)\b/i, "robotics"],
  [/\b(data centre|data center|hyperscale|colocation|rack|gpu)\b/i, "data-centers"],
  [/\b(artificial intelligence|machine learning|\bai\b|model training|inference)\b/i, "industrial-ai"],
  [/\b(automation|automated|control system|scada|plc)\b/i, "automation"],
  [/\b(procurement|supply chain|tender|sourcing|local content|supplier)\b/i, "supply-chain"],
  [/\b(contractor|contract award|construction|building|site work|concrete|cement)\b/i, "construction"],
  [/\b(mining|mineral|exploration licence|ore|phosphate|bauxite)\b/i, "mining"],
  [/\b(chemical|petrochemicals|admixture|polymer|coating|adhesive)\b/i, "chemicals"],
  [/\b(excavator|crane|loader|bulldozer|heavy equipment|machinery|attachment)\b/i, "heavy-equipment"],
  [/\b(facilities management|\bfm\b|maintenance|handover|operations and maintenance|cleaning)\b/i, "facilities-management"],
  [/\b(developer|masterplan|residential|real estate|district|mixed-use|giga.?project)\b/i, "real-estate"],
  [/\b(highway|road|bridge|tunnel|interchange)\b/i, "roads"],
  [/\b(fibre|fiber|5g|telecom|network operator|connectivity)\b/i, "telecom-infrastructure"],
  [/\b(hvac|chiller|cooling|air conditioning|insulation|refrigerant)\b/i, "engineering"],
  [/\b(epc|engineering, procurement|design.build|turnkey)\b/i, "epc"],
  [/\b(utility|utilities|district cooling|metering)\b/i, "utilities"],
  [/\b(freight|haulage|trucking|last mile|customs)\b/i, "logistics"],
  [/\b(fleet|truck|vehicle|transport)\b/i, "transportation"],
  [/\b(sensor|iot|digital twin|bim|software|platform|dashboard)\b/i, "industrial-technology"],
  [/\b(infrastructure|utilities corridor|public works)\b/i, "infrastructure"],
  [/\b(energy|fuel|power purchase|decarbon)\b/i, "energy"],
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
/** The floor an article should reach. Five category pages is the point of
 *  having a taxonomy: a reader browsing "ports" and a reader browsing
 *  "supply-chain" should both find the Jeddah logistics story. */
const MIN_CATEGORIES = 5;
/** And the ceiling. Past this the tags stop being a filing system and start
 *  being noise on every category page in the site. */
const MAX_CATEGORIES = 7;

/**
 * Categories for one article, ranked by how much the article actually says
 * about each.
 *
 * Evidence is weighted by where it appears: a phrase in the headline is what
 * the piece is about, a tag is what the desk filed it as, and a phrase in the
 * body is a subject it touches. Ancestors come along automatically — an
 * oil-gas story is an energy story.
 *
 * The floor is a target, not a licence to invent: a category with no evidence
 * in the article is never added, so a genuinely narrow piece stays under five
 * rather than being filed somewhere a reader would not expect to find it.
 */
function assignCategories(a: Article): string[] {
  const score = new Map<string, number>();
  const bump = (cat: string, n: number) => {
    if (!VALID.has(cat)) return;
    score.set(cat, (score.get(cat) ?? 0) + n);
    let p = cat;
    while (PARENT[p]) { p = PARENT[p]; score.set(p, (score.get(p) ?? 0) + n / 2); }
  };

  // The primary and its ancestors are not up for debate.
  score.set(a.primaryCategory, 1000);
  let cur = a.primaryCategory;
  while (PARENT[cur]) { cur = PARENT[cur]; score.set(cur, (score.get(cur) ?? 0) + 500); }

  const headline = a.headline ?? "";
  const tagText = (a.tags ?? []).join(" ");
  // Tags stripped of markup: an href full of slugs would match half the
  // patterns and file the article under categories it never mentions.
  const body = (a.content ?? "").replace(/<[^>]*>/g, " ");

  for (const [re, cat] of TAG_CATEGORY) {
    // A phrase in the headline is what the piece is about; a tag is what the
    // desk filed it as. Either alone qualifies.
    if (re.test(headline)) bump(cat, 6);
    if (re.test(tagText)) bump(cat, 5);
    // The body is weaker evidence and needs repetition. A story genuinely
    // about ports says "port" throughout; one that mentions it once in
    // passing is not a ports story, and filing it as one puts a stranger on
    // every reader's category page.
    const hits = (body.match(new RegExp(re.source, "gi")) ?? []).length;
    if (hits) bump(cat, Math.min(hits, 5));
  }

  // Two tiers. Strong evidence — a headline phrase, a desk tag, or four
  // mentions in the body — files the article outright. Weaker evidence is
  // only used to reach the floor, so a story with plenty to say lands in the
  // categories it earns and a narrow one is padded no further than five.
  const STRONG = 4;
  const WEAK = 1;
  const byScore = [...score.entries()].sort((x, y) => y[1] - x[1]);
  const strong = byScore.filter(([, n]) => n >= STRONG).map(([c]) => c);
  const filler = byScore.filter(([, n]) => n >= WEAK && n < STRONG).map(([c]) => c);
  const ranked = [...strong, ...filler].slice(0, Math.max(MIN_CATEGORIES, strong.length));

  // Primary first — it is the canonical URL the article lives at.
  const ordered = [a.primaryCategory, ...ranked.filter(c => c !== a.primaryCategory)];
  return ordered.slice(0, Math.max(MIN_CATEGORIES, Math.min(MAX_CATEGORIES, ordered.length)));
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
/** Names two unrelated companies both go by.
 *
 *  "Masdar" is Abu Dhabi's renewable energy developer AND the Al-Muhaidib
 *  building materials distributor founded in Saudi Arabia in 1971. Both are
 *  in this archive, and a link anchored on the bare name lands the reader on
 *  the wrong company — which is exactly what happened: eight Big 5 pieces
 *  about building materials pointed at a solar story.
 *
 *  The full names ("Masdar Building Materials") still anchor fine. Only the
 *  ambiguous short form is barred, because no amount of scoring can tell
 *  which company a bare "Masdar" in the prose means. */
const COLLIDING_NAMES = new Set(["Masdar"]);

function anchors(a: Article): string[] {
  const out: string[] = [];
  const headline = a.headline;

  for (const c of a.companies ?? []) {
    // Institutional names are too generic to anchor safely.
    if (/^(Ministry|General Authority|National Centre|Royal Commission|Public Investment Fund)\b/i.test(c)) continue;
    if (COLLIDING_NAMES.has(c)) continue;
    if (c.length < 4) continue;
    // The company must be named in the headline, or be an unambiguous
    // shortening of something in it ("ADNOC Gas" for a headline about ADNOC).
    const head = c.split(" ")[0];
    if (headline.includes(c) || (head.length >= 5 && headline.includes(head))) out.push(c);
  }

  // Distinctive multi-word project names from the headline itself.
  for (const m of headline.matchAll(/\b([A-Z][a-z]+(?:[ -][A-Z][a-z']+){1,3})\b/g)) {
    const p = m[1];
    if (COLLIDING_NAMES.has(p)) continue;
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
const short = all.filter(a => (a.categories?.length ?? 0) < MIN_CATEGORIES).length;
console.log(`\n${all.length} articles · ${catChanges} category sets written · avg ${avgCats} categories`);
console.log(`${all.length - short}/${all.length} reach the ${MIN_CATEGORIES}-category floor` +
  (short ? ` · ${short} carry less because the article does not support more` : ""));
console.log(`${linkChanges} internal links added · ${linked}/${all.length} articles now link out`);
console.log(WRITE ? "written" : "dry run — pass --write to save");
