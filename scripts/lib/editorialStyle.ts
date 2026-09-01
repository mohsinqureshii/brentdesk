/**
 * House-style normalisation for imported editorial batches.
 * ----------------------------------------------------------------------
 * Three transformations, all deterministic and all reversible from the
 * snapshot the caller takes before applying them:
 *
 *   1. sentenceCaseTitle  Title Case -> TechScoop sentence case, with
 *                         brand names and acronyms preserved.
 *   2. stripHeadings      remove <h2> section headings from the body.
 *   3. stripReferences    remove the trailing "References" block.
 *
 * TITLE CASING IS DELIBERATELY CONSERVATIVE. Lowercasing a proper noun
 * ("HUMAIN" -> "Humain", "NEOM" -> "Neom") is a worse error than leaving
 * a word capitalised, so a word is only lowercased when it is positively
 * identified as generic. Anything unrecognised keeps the casing it came
 * with. The protected set is built from the batch's own company, people
 * and event names, so it needs no maintenance as the data changes.
 */

/** Words safe to lowercase mid-title. Curated from this batch's own vocabulary. */
const GENERIC = new Set<string>([
  "a", "academy", "accelerate", "access", "across", "advance", "advanced",
  "advancing", "after", "agent", "agentic", "ahead", "all", "amid", "an",
  "and", "anywhere", "arabia's", "as", "asset", "at", "autonomous",
  "barcode", "begins", "brands", "break", "bring", "brings", "build",
  "built", "but", "by", "capability", "center", "centers", "centre",
  "certification", "cities", "cloud", "collection", "commercial",
  "companies", "compliance", "compute", "computing", "concierge",
  "confirms", "conflict", "connected", "connects", "contact", "contract",
  "creative", "cryptography", "customer", "data", "day", "deal", "deals",
  "debut", "debuts", "dedicated", "delegations", "demonstrates", "deploy",
  "deployment", "deploys", "developer", "digital", "early", "ecosystem",
  "efficiency", "emergency", "enterprise", "exhibition", "expand",
  "expands", "expansion", "experience", "experiences", "expertise",
  "explores", "fabric", "facility", "finalist", "finance", "financing",
  "firms", "first", "fleet", "focus", "following", "for", "founder",
  "fractional", "free", "from", "full", "fund", "funding", "global",
  "governance", "ground", "hackathon", "halal", "hardware", "hazard",
  "health", "healthcare", "helmet", "highlighting", "humanoid", "in",
  "incubator", "industrial", "infrastructure", "inks", "insurance",
  "integrated", "integrators", "intelligence", "interfaces", "internal",
  "into", "investment", "investments", "its", "kids", "laptop", "launch",
  "launches", "layers", "lead", "lifecycle", "live", "major",
  "management", "maritime", "mass", "maturity", "meeting", "ministries",
  "model", "models", "modernization", "named", "names", "national",
  "native", "network", "networks", "new", "observability", "of", "off",
  "official", "on", "open", "operating", "operational", "optimize", "or",
  "out", "over", "partner", "partners", "partnership", "pass", "pavilion",
  "per", "performance", "phone", "phones", "photo", "physical",
  "planning", "platform", "platforms", "portfolio", "powered", "present",
  "preventive", "procurement", "production", "products", "project",
  "promising", "proptech", "prosthetics", "providers", "quantum",
  "record", "region", "regional", "rescheduled", "research", "resident",
  "rings", "rises", "robot", "robotaxi", "robots", "rooms", "round",
  "route", "secures", "security", "selected", "service", "showcase",
  "showcases", "shuttle", "sign", "smart", "solution", "solutions",
  "sovereign", "spotlights", "startup", "startups", "strategy", "summit",
  "supercluster", "support", "target", "teams", "than", "the", "their",
  "theme", "to", "tool", "tools", "top", "transportation", "trucking",
  "twin", "under", "unified", "unit", "unveil", "unveils", "up", "update",
  "use", "valuation", "via", "voice", "wireless", "with", "world's",
  "zone", "co", "develop", "gen", "next", "made", "ready", "metal", "bare",
  "driven", "enabled", "powered", "time", "real", "stack", "vehicle", "trust",
  "zero", "efficient", "energy", "first", "services", "estate", "real",
]);

/** Never lowercase these, whatever else the rules say. */
const ALWAYS_KEEP = new Set<string>([
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
  "Middle", "East", "Arabic", "Saudi", "Arabia", "Riyadh", "Jeddah", "Gulf",
  "Kingdom", "Pakistani", "Taiwanese", "Chinese", "Indian", "Emirati", "Omani", "Vision",
  // Product, venue and programme names from this batch that read as
  // ordinary words but are not: leaving them capitalised is the safe error.
  "Arena", "Ascent", "Bob", "Classpedia", "Frontier", "Fuel", "Garage", "Grand",
  "Jetson", "Linux", "Maxera", "Maximo", "Metro", "Mu'tamad", "Nights", "Prix",
  "Robobus", "Rocket", "Series", "Silk", "Siraj", "Thor", "Zawal",
]);

function hasInternalCapital(word: string): boolean {
  const core = word.replace(/[^A-Za-z]/g, "");
  return core.length > 1 && /[A-Z]/.test(core.slice(1));
}

function isAcronym(word: string): boolean {
  const core = word.replace(/[^A-Za-z]/g, "");
  return core.length >= 2 && core === core.toUpperCase();
}

/**
 * Build the protected vocabulary from the batch's own entity lists, so
 * every company, person and event the articles name keeps its casing.
 */
export function buildProtectedWords(entityNames: string[]): Set<string> {
  const out = new Set<string>();
  for (const name of entityNames) {
    const words = name
      .split(/[\s/,&()]+/)
      .map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9']+$/g, ""))
      .filter((w) => w.length > 1);

    for (const word of words) {
      // A generic word inside a multi-word company name does not earn
      // protection everywhere else in the batch: "Data Dynamics" must not
      // keep "Data" capitalised in "AI data center", and "Google Cloud"
      // must not keep "Cloud" in "Saudi cloud region". Protect it only
      // when the entity IS that single word.
      if (words.length > 1 && GENERIC.has(word.toLowerCase())) continue;
      out.add(word.toLowerCase());
    }
  }
  return out;
}

/**
 * Title Case -> sentence case. The first word is always capitalised;
 * every later word is lowercased ONLY if it is in the generic list and
 * is not protected, an acronym, or internally capitalised.
 */
export function sentenceCaseTitle(title: string, protectedWords: Set<string>): string {
  const parts = title.split(/(\s+)/);
  let firstWordSeen = false;

  return parts
    .map((token) => {
      if (/^\s+$/.test(token) || token.length === 0) return token;

      // Leading punctuation (quotes, brackets) is not the word itself.
      const m = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(token);
      const [, lead, core, trail] = m ?? ["", "", token, ""];
      if (!core) return token;

      const isFirst = !firstWordSeen;
      firstWordSeen = true;

      // The opening word keeps its capital, whatever it is.
      if (isFirst) return token;

      // Hyphenated compounds are handled segment by segment, so
      // "AI-Native" becomes "AI-native" and "Saudi-Made" becomes
      // "Saudi-made" rather than being left alone wholesale.
      if (core.includes("-")) {
        const out = core
          .split("-")
          .map((seg) => {
            if (!seg) return seg;
            if (ALWAYS_KEEP.has(seg)) return seg;
            if (isAcronym(seg)) return seg;
            if (hasInternalCapital(seg)) return seg;
            if (protectedWords.has(seg.toLowerCase())) return seg;
            if (GENERIC.has(seg.toLowerCase())) return seg.toLowerCase();
            return seg;
          })
          .join("-");
        return lead + out + trail;
      }

      if (ALWAYS_KEEP.has(core)) return token;
      if (isAcronym(core)) return token;              // AI, LEAP, HUMAIN, MCIT
      if (hasInternalCapital(core)) return token;      // DataVolt, MinIO, GameX, MoU
      if (protectedWords.has(core.toLowerCase())) return token; // any named entity


      if (GENERIC.has(core.toLowerCase())) return lead + core.toLowerCase() + trail;

      // Unrecognised: leave exactly as it came. Under-converting beats
      // turning someone's name or a product into lower case.
      return token;
    })
    .join("");
}

/**
 * Remove inline citation markers — "[1]", and the anchor form
 * <a href="#1">[1]</a> that linked into the reference list. Once the
 * reference block is gone these point at nothing, and bracketed footnote
 * numbers are an academic convention that does not belong in news copy
 * regardless. Restricted to 1-2 digits so real bracketed text survives.
 */
export function stripCitationMarkers(html: string): string {
  return html
    .replace(/<a[^>]*href="#\d{1,2}"[^>]*>\s*\[\d{1,2}\]\s*<\/a>/gi, "")
    .replace(/\s*\[\d{1,2}\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

/** Remove every <h2>…</h2> section heading, leaving the paragraphs. */
export function stripHeadings(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Remove the trailing "References" block: the heading plus everything
 * after it. Source URLs are not lost — the import writes them to
 * article_source_references, which is where they belong.
 */
export function stripReferences(html: string): string {
  const idx = html.search(/<h[1-6][^>]*>\s*(references|sources)\s*<\/h[1-6]>/i);
  if (idx === -1) return html;
  return html.slice(0, idx).trim();
}
