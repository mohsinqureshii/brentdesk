/**
 * Search behaviour, pinned.
 *
 * The old search was a LIKE over English columns, and every case below
 * is something it got wrong: Arabic spelling variants, a headline losing
 * to a passing mention, a two-word query treated as one string. These
 * are the cases to keep passing, not the implementation.
 */
import { describe, it, expect } from "vitest";
import {
  fold,
  foldText,
  makeSnippet,
  parseQuery,
  scoreDoc,
  stripHtml,
  type ScorableDoc,
} from "@shared/search";

const doc = (over: Partial<ScorableDoc>): ScorableDoc => ({
  title: "",
  excerpt: "",
  body: "",
  taxonomy: "",
  ...over,
});

describe("folding", () => {
  it("folds the alef forms a reader interchanges", () => {
    expect(foldText("الأسعار")).toBe(foldText("الاسعار"));
    expect(foldText("إسمنت")).toBe(foldText("اسمنت"));
    expect(foldText("آلات")).toBe(foldText("الات"));
  });

  it("folds ta marbuta and alef maqsura", () => {
    expect(foldText("شركة")).toBe(foldText("شركه"));
    expect(foldText("مصطفى")).toBe(foldText("مصطفي"));
  });

  it("removes harakat, so a vocalised headline still matches a plain query", () => {
    expect(foldText("الطَّاقَة")).toBe(foldText("الطاقه"));
  });

  it("folds Arabic-Indic digits, so ٢٠٢٦ finds 2026", () => {
    expect(foldText("٢٠٢٦")).toBe("2026");
  });

  it("lowercases and strips Latin accents", () => {
    expect(foldText("ARAMCO")).toBe("aramco");
    expect(foldText("Sécurité")).toBe("securite");
  });

  it("keeps a map back to the original, so a snippet can be cut from it", () => {
    const f = fold("الأسعار");
    expect(f.map.length).toBe(f.text.length);
    expect(f.map[0]).toBe(0);
    // Every mapped index is a real position in the source string.
    for (const i of f.map) expect(i).toBeGreaterThanOrEqual(0);
  });
});

describe("parsing a query", () => {
  it("splits into terms and keeps the whole thing as a phrase", () => {
    const q = parseQuery("Saudi cement");
    expect(q.terms).toContain("saudi");
    expect(q.terms).toContain("cement");
    expect(q.phrase).toBe("saudi cement");
  });

  it("drops single Latin characters, which match everything", () => {
    expect(parseQuery("a cement").terms).toEqual(["cement"]);
  });

  it("makes a quoted run mandatory", () => {
    const q = parseQuery('"local content" rules');
    expect(q.required).toEqual(["local content"]);
    expect(q.terms).toContain("rules");
  });

  it("folds Arabic before splitting", () => {
    expect(parseQuery("الأسعار").terms).toEqual([foldText("الاسعار")]);
  });
});

describe("scoring", () => {
  const query = parseQuery("cement");

  it("ranks a headline above a passing mention in a body", () => {
    const headline = scoreDoc(doc({ title: "cement prices climb" }), query);
    const mention = scoreDoc(doc({ body: "a line about cement somewhere" }), query);
    expect(headline).toBeGreaterThan(mention);
  });

  it("returns zero when nothing matches", () => {
    expect(scoreDoc(doc({ title: "steel imports" }), query)).toBe(0);
  });

  it("rewards a document carrying every term of a multi-word query", () => {
    const q = parseQuery("saudi cement");
    const both = scoreDoc(doc({ body: "saudi output; cement demand" }), q);
    const one = scoreDoc(doc({ body: "cement demand" }), q);
    expect(both).toBeGreaterThan(one);
  });

  it("excludes a document missing a quoted phrase, however well it scores otherwise", () => {
    const q = parseQuery('"local content" cement');
    expect(scoreDoc(doc({ title: "cement cement cement" }), q)).toBe(0);
    expect(scoreDoc(doc({ title: "cement", body: "local content rules" }), q)).toBeGreaterThan(0);
  });

  it("counts a beat name, so a query for a sector finds its coverage", () => {
    const q = parseQuery("logistics");
    expect(scoreDoc(doc({ taxonomy: "logistics" }), q)).toBeGreaterThan(0);
  });

  it("does not let a long body outrank a headline on repetition alone", () => {
    const headline = scoreDoc(doc({ title: "cement" }), query);
    const repeated = scoreDoc(doc({ body: "cement ".repeat(200) }), query);
    expect(headline).toBeGreaterThan(repeated);
  });

  it("lifts the recent only enough to break a tie", () => {
    const now = Date.now();
    const fresh = scoreDoc(doc({ title: "cement", when: now - 86_400_000 }), query, now);
    const old = scoreDoc(doc({ title: "cement", when: now - 400 * 86_400_000 }), query, now);
    const better = scoreDoc(doc({ title: "cement prices", excerpt: "cement" }), query, now);
    expect(fresh).toBeGreaterThan(old);
    expect(better).toBeGreaterThan(fresh);
  });

  it("does not find a term inside a longer word", () => {
    // "cement" is in "reinforcement", and a result highlighting six
    // letters in the middle of another word reads as a broken search.
    expect(scoreDoc(doc({ body: "steel reinforcement fabrication" }), query)).toBe(0);
    expect(scoreDoc(doc({ title: "reinforcement" }), query)).toBe(0);
  });

  it("still finds a word with a suffix on it", () => {
    // Boundary at the start, not at both ends: "cement" should reach
    // "cements" and "cementitious".
    expect(scoreDoc(doc({ title: "cements" }), query)).toBeGreaterThan(0);
  });

  it("matches Arabic mid-token, where the prefixes attach to the word", () => {
    // والأسعار is "and the prices" — one token, and a reader typing
    // الاسعار is looking for something that begins inside it.
    const q = parseQuery("الاسعار");
    expect(scoreDoc(doc({ body: foldText("وارتفعت والأسعار معها") }), q)).toBeGreaterThan(0);
  });

  it("finds Arabic written with a different alef than the query", () => {
    const q = parseQuery("الاسعار");
    expect(scoreDoc(doc({ title: foldText("ارتفاع الأسعار") }), q)).toBeGreaterThan(0);
  });
});

describe("snippets", () => {
  const body =
    "The Public Investment Fund approved a five-year strategy on Tuesday. " +
    "For the construction industry the document matters more than any contract award. " +
    "Cement demand is expected to follow the programme rather than lead it.";

  it("cuts around the match, not from the top of the article", () => {
    const s = makeSnippet(body, parseQuery("cement"), 120);
    expect(s.text.toLowerCase()).toContain("cement");
    expect(s.leadingEllipsis).toBe(true);
  });

  it("marks the matched words, with offsets that land on them", () => {
    const s = makeSnippet(body, parseQuery("cement"), 120);
    expect(s.marks.length).toBeGreaterThan(0);
    const [start, end] = s.marks[0];
    expect(s.text.slice(start, end).toLowerCase()).toBe("cement");
  });

  it("returns the opening when nothing matches, rather than nothing", () => {
    const s = makeSnippet(body, parseQuery("tungsten"), 80);
    expect(s.text.length).toBeGreaterThan(0);
    expect(s.marks).toEqual([]);
  });

  it("quotes Arabic in its own spelling, not the folded one", () => {
    const arabic = "ارتفعت الأسعار في السوق السعودي خلال الربع الأخير من العام.";
    const s = makeSnippet(arabic, parseQuery("الاسعار"), 120);
    // The reader's own spelling comes back, with the hamza intact.
    expect(s.text).toContain("الأسعار");
    const [start, end] = s.marks[0];
    expect(s.text.slice(start, end)).toBe("الأسعار");
  });

  it("does not mark a term buried inside a longer word", () => {
    const s = makeSnippet("Steel reinforcement is fabricated offsite.", parseQuery("cement"), 120);
    expect(s.marks).toEqual([]);
  });

  it("never returns a mark outside the text it cut", () => {
    for (const q of ["cement", "investment fund", "programme"]) {
      const s = makeSnippet(body, parseQuery(q), 100);
      for (const [a, b] of s.marks) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(s.text.length);
        expect(b).toBeGreaterThan(a);
      }
    }
  });
});

describe("stripHtml", () => {
  it("turns a stored body into prose", () => {
    expect(stripHtml("<p>Riyadh <strong>steel</strong> output</p>")).toBe("Riyadh steel output");
  });

  it("drops script and style wholesale", () => {
    expect(stripHtml("<style>p{}</style><p>text</p>")).toBe("text");
  });

  it("decodes the entities the archive actually contains", () => {
    expect(stripHtml("<p>oil &amp; gas&nbsp;projects</p>")).toBe("oil & gas projects");
  });
});
