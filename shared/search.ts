/**
 * Search: the part that is a function.
 *
 * Everything here is pure — fold a string, split a query, score a
 * document, cut a snippet — so it can be tested without a database and
 * reused on either side of the wire. The service that reads the archive
 * and builds an index lives in server/services/search.service.ts.
 *
 * The problem this exists to solve: search was `LIKE '%term%'` over the
 * English title, excerpt and body, ordered by date. That fails three
 * ways. It finds nothing in Arabic, because the Arabic text is in
 * content_translations and the query never looked there. It cannot rank,
 * so a passing mention in the last paragraph of a year-old piece beats
 * the headline that is exactly the thing you searched for. And it treats
 * a two-word query as one string, so "saudi cement" only matches those
 * words adjacent.
 */

// ------------------------------------------------------------------
// Folding
// ------------------------------------------------------------------

/**
 * Arabic normalisation.
 *
 * A reader types الاسعار; the article says الأسعار. Same word, different
 * alef, and a raw comparison misses it. Arabic search that does not fold
 * these is search that does not work, so:
 *
 *   - the harakat (fatha, damma, kasra, sukun, shadda, tanween) and the
 *     superscript alef are removed; they are optional in running text
 *     and almost never typed into a search box
 *   - tatweel (ـ), which only stretches a joining line, is removed
 *   - أ إ آ ٱ all fold to ا
 *   - ى folds to ي, and ة to ه — the two endings readers interchange
 *   - ؤ and ئ fold to و and ي
 *   - Arabic-Indic digits fold to Western ones, so ٢٠٢٦ finds 2026
 *
 * Latin text is lowercased and stripped of combining marks, so "Aramco"
 * finds "aramco" and "Sécurité" finds "securite".
 */
/**
 * The Arabic combining marks: harakat, tanween, shadda, sukun, the
 * superscript alef and the Quranic annotation range — plus the hamza
 * above and below, which NFD produces when it decomposes أ and إ.
 *
 * A predicate rather than a global regex: a /g regex carries lastIndex
 * between calls, and this runs once per character.
 */
function isHarakat(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (
    (c >= 0x0610 && c <= 0x061a) ||
    (c >= 0x064b && c <= 0x065f) ||
    c === 0x0670 ||
    (c >= 0x06d6 && c <= 0x06ed)
  );
}

const FOLD_PAIRS: Record<string, string> = {
  "أ": "ا", // أ
  "إ": "ا", // إ
  "آ": "ا", // آ
  "ٱ": "ا", // ٱ
  "ى": "ي", // ى
  "ة": "ه", // ة
  "ؤ": "و", // ؤ
  "ئ": "ي", // ئ
};

// Arabic-Indic and Eastern Arabic-Indic digits.
for (let i = 0; i < 10; i++) {
  FOLD_PAIRS[String.fromCharCode(0x0660 + i)] = String(i);
  FOLD_PAIRS[String.fromCharCode(0x06f0 + i)] = String(i);
}

/**
 * A folded copy of `text`, plus a map back to the original.
 *
 * `map[i]` is the index in `text` that produced folded character `i`.
 * That is what lets a snippet be cut out of the original string — with
 * its real spelling and its real diacritics — from a match found in the
 * folded one. Without it a highlighted result would have to be shown in
 * its normalised form, which for Arabic means showing the reader a
 * mangled version of their own language.
 */
export function fold(text: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Marks that carry no search value: the harakat, and the tatweel
    // (U+0640), which only stretches a joining line.
    if (isHarakat(ch) || ch === "\u0640") continue;

    const mapped = FOLD_PAIRS[ch];
    if (mapped !== undefined) {
      for (const c of mapped) {
        out.push(c);
        map.push(i);
      }
      continue;
    }

    // Decompose one character at a time rather than the whole string.
    // Decomposing the string changes its length — أ becomes alef plus a
    // combining hamza — so every offset after the first such letter is
    // wrong, which is what put a trailing space inside an Arabic
    // highlight. Per character the map stays exact: one source index,
    // however many folded characters come out of it.
    for (const c of ch.normalize("NFD")) {
      const code = c.charCodeAt(0);
      if (code >= 0x0300 && code <= 0x036f) continue; // Latin accents
      if (isHarakat(c)) continue;
      const folded = FOLD_PAIRS[c] ?? c.toLowerCase();
      for (const f of folded) {
        out.push(f);
        map.push(i);
      }
    }
  }

  return { text: out.join(""), map };
}

/** The folded text alone, for the many callers that do not need offsets. */
export function foldText(text: string): string {
  return fold(text).text;
}

/** Strip tags and decode the handful of entities the archive uses, so a
 *  body can be searched and quoted as prose rather than as markup. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------------
// The query
// ------------------------------------------------------------------

export interface ParsedQuery {
  /** The whole folded query, for a phrase match. */
  phrase: string;
  /** Folded terms, deduplicated, longest first. */
  terms: string[];
  /** Terms the reader quoted — these must all appear. */
  required: string[];
}

/**
 * A query, taken apart.
 *
 * Quoted runs stay together and become mandatory; everything else is a
 * term. Single characters are dropped from Latin queries — one letter
 * matches half the archive — but kept for scripts where a single
 * character is a word, which for this site means CJK.
 */
export function parseQuery(raw: string): ParsedQuery {
  const quoted: string[] = [];
  const rest = raw.replace(/[""«»"]([^""«»"]+)[""«»"]/g, (_, inner) => {
    const f = foldText(inner).trim();
    if (f) quoted.push(f);
    return " ";
  });

  const phrase = foldText(raw).replace(/\s+/g, " ").trim();
  const seen = new Set<string>(quoted);
  const terms = [...quoted];

  for (const token of foldText(rest).split(/[^\p{L}\p{N}]+/u)) {
    if (!token) continue;
    const isCjk = /[぀-ヿ一-鿿]/.test(token);
    if (token.length < 2 && !isCjk) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
  }

  terms.sort((a, b) => b.length - a.length);
  return { phrase, terms, required: quoted };
}

// ------------------------------------------------------------------
// Scoring
// ------------------------------------------------------------------

/** The folded text of one document, by field. */
export interface ScorableDoc {
  title: string;
  excerpt: string;
  body: string;
  /** Category and tag names, folded and joined. */
  taxonomy: string;
  /** Milliseconds. Used only to break ties and to lift the very recent. */
  when?: number | null;
}

/**
 * Whether a term must match at a word boundary.
 *
 * It must, in a script that separates its words: searching "cement" and
 * being shown "reinforcement" with six letters of it highlighted is a
 * search that looks broken, and the archive is full of words that
 * contain other words.
 *
 * It must not, in Arabic. Arabic writes its definite article, its
 * conjunction and several prepositions joined to the front of the word —
 * والأسعار is "and the prices" — so a reader typing الاسعار is looking
 * for a string that legitimately begins mid-token. Requiring a boundary
 * there would break the language rather than tighten the results.
 */
function needsWordBoundary(term: string): boolean {
  return /^[a-z0-9]/.test(term);
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Where `needle` occurs in `haystack`, honouring the boundary rule.
 *
 * `cap` stops the scan early: a body that says "cement" forty times is
 * not twenty times more about cement than one that says it twice, and
 * without a cap a long article beats a precise one on length alone.
 */
export function findAll(haystack: string, needle: string, cap = Infinity): number[] {
  if (!needle) return [];
  const boundary = needsWordBoundary(needle);
  const found: number[] = [];
  let i = haystack.indexOf(needle);
  while (i !== -1 && found.length < cap) {
    if (!boundary || !isWordChar(haystack[i - 1])) found.push(i);
    i = haystack.indexOf(needle, i + 1);
  }
  return found;
}

/** Does this text contain the term, under the boundary rule? */
export function contains(haystack: string, needle: string): boolean {
  return findAll(haystack, needle, 1).length > 0;
}

/** True where a match begins a word AND ends one — "rail" in "rail
 *  freight" rather than in "railway". Worth a bonus, not a requirement:
 *  "cement" should still find "cements". */
function hasWholeWord(haystack: string, needle: string): boolean {
  for (const i of findAll(haystack, needle)) {
    if (!isWordChar(haystack[i + needle.length])) return true;
  }
  return false;
}

export const SCORE = {
  phraseInTitle: 140,
  phraseInExcerpt: 45,
  phraseInBody: 25,
  termInTitle: 22,
  termWordStartBonus: 10,
  termInExcerpt: 7,
  termInBody: 3,
  termInTaxonomy: 12,
  allTermsPresent: 35,
  /**
   * The most recency can be worth — deliberately less than the weakest
   * content signal above. At 10 it exceeded an excerpt hit, so a
   * day-old headline-only match beat a story matching in both the
   * headline and the standfirst. Recency breaks ties; it does not win
   * arguments.
   */
  recencyMax: 4,
} as const;

/**
 * How well a document answers a query. Zero means it does not.
 *
 * A quoted term that is missing scores the document out entirely — that
 * is what quoting is for.
 */
export function scoreDoc(doc: ScorableDoc, q: ParsedQuery, now = Date.now()): number {
  if (!q.terms.length) return 0;

  for (const req of q.required) {
    const present =
      contains(doc.title, req) ||
      contains(doc.excerpt, req) ||
      contains(doc.body, req) ||
      contains(doc.taxonomy, req);
    if (!present) return 0;
  }

  let score = 0;

  if (q.phrase && q.phrase.includes(" ")) {
    if (contains(doc.title, q.phrase)) score += SCORE.phraseInTitle;
    else if (contains(doc.excerpt, q.phrase)) score += SCORE.phraseInExcerpt;
    else if (contains(doc.body, q.phrase)) score += SCORE.phraseInBody;
  }

  let matchedTerms = 0;
  for (const term of q.terms) {
    let hit = false;
    if (contains(doc.title, term)) {
      score += SCORE.termInTitle;
      if (hasWholeWord(doc.title, term)) score += SCORE.termWordStartBonus;
      hit = true;
    }
    if (contains(doc.taxonomy, term)) {
      score += SCORE.termInTaxonomy;
      hit = true;
    }
    if (contains(doc.excerpt, term)) {
      score += SCORE.termInExcerpt;
      hit = true;
    }
    const inBody = findAll(doc.body, term, 4).length;
    if (inBody) {
      score += SCORE.termInBody * inBody;
      hit = true;
    }
    if (hit) matchedTerms++;
  }

  if (!matchedTerms) return 0;
  if (matchedTerms === q.terms.length && q.terms.length > 1) score += SCORE.allTermsPresent;

  if (doc.when) {
    const days = (now - doc.when) / 86_400_000;
    if (days >= 0 && days < 90) score += Math.round(SCORE.recencyMax * (1 - days / 90));
  }

  return score;
}

// ------------------------------------------------------------------
// Snippets
// ------------------------------------------------------------------

export interface Snippet {
  /** Text cut from the original, not the folded copy. */
  text: string;
  /** [start, end) offsets into `text` to mark. */
  marks: [number, number][];
  /** Whether text was cut from the front / the back. */
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
}

/**
 * The passage that shows why this result is a result.
 *
 * Cut around the first match, on a word boundary where one is close, and
 * marked so the reader sees their own words in it. This is the "with
 * context" half of search: a list of ten headlines does not tell you
 * which one actually discusses the thing you asked about.
 *
 * Falls back to the opening of the text when nothing matches — better a
 * standfirst than an empty row.
 */
export function makeSnippet(raw: string, q: ParsedQuery, length = 240): Snippet {
  const clean = raw;
  const folded = fold(clean);

  // Where to centre: the phrase if it is there, else the longest term.
  let at = -1;
  let hitLen = 0;
  if (q.phrase && q.phrase.includes(" ")) {
    at = findAll(folded.text, q.phrase, 1)[0] ?? -1;
    hitLen = at === -1 ? 0 : q.phrase.length;
  }
  if (at === -1) {
    for (const term of q.terms) {
      const i = findAll(folded.text, term, 1)[0];
      if (i !== undefined) {
        at = i;
        hitLen = term.length;
        break;
      }
    }
  }

  if (at === -1) {
    const head = clean.slice(0, length);
    return {
      text: head + (clean.length > length ? "" : ""),
      marks: [],
      leadingEllipsis: false,
      trailingEllipsis: clean.length > length,
    };
  }

  const before = Math.floor((length - hitLen) / 3);
  let startF = Math.max(0, at - before);
  let endF = Math.min(folded.text.length, startF + length);
  startF = Math.max(0, Math.min(startF, endF - length));

  let start = folded.map[startF] ?? 0;
  let end = endF >= folded.map.length ? clean.length : folded.map[endF] ?? clean.length;

  // Snap to word boundaries so a snippet does not open mid-word.
  if (start > 0) {
    const space = clean.lastIndexOf(" ", start);
    if (space !== -1 && start - space < 25) start = space + 1;
  }
  if (end < clean.length) {
    const space = clean.indexOf(" ", end);
    if (space !== -1 && space - end < 25) end = space;
  }

  const text = clean.slice(start, end).trim();

  // Re-find the marks inside the cut text, in its own folded space.
  const cut = fold(text);
  const marks: [number, number][] = [];
  const wanted = q.phrase && q.phrase.includes(" ") && contains(cut.text, q.phrase)
    ? [q.phrase]
    : q.terms;
  for (const term of wanted) {
    for (const i of findAll(cut.text, term, 12)) {
      const s = cut.map[i] ?? 0;
      const e = (cut.map[i + term.length - 1] ?? text.length - 1) + 1;
      marks.push([s, e]);
    }
    if (marks.length > 24) break;
  }
  marks.sort((a, b) => a[0] - b[0]);

  // Merge overlaps, or nested marks would double-wrap a word.
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m] as [number, number]);
  }

  return {
    text,
    marks: merged,
    leadingEllipsis: start > 0,
    trailingEllipsis: end < clean.length,
  };
}
