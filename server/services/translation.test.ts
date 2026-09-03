import { describe, it, expect } from "vitest";
import { validateTranslation, applyTranslation, sourceHash } from "./translation.service";

describe("validateTranslation", () => {
  it("accepts a faithful translation", () => {
    const src = { title: "Big 5 Construct Saudi Opens in Riyadh" };
    const out = { title: "بيج 5 كونستركت السعودية ينطلق في الرياض" };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("rejects a translated href", () => {
    // The failure this check exists for: a model that helpfully "localises"
    // a link breaks the archive's internal link graph with no error anywhere.
    const src = { content: '<p>See <a href="/construction/big-5-opens">the report</a>.</p>' };
    const out = { content: '<p>راجع <a href="/ar/الإنشاءات/تقرير">التقرير</a>.</p>' };
    const problems = validateTranslation(src, out);
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("links changed");
  });

  it("lets a quarter be spelled out as a word", () => {
    // "Q3" is an ordinal, and written Arabic spells it. Counting the 3 as a
    // figure forced translators to write «الربع الثالث (Q3)» purely to get
    // past the gate, which is a worse sentence for no factual gain.
    const src = { excerpt: "Net income of $26.9bn in Q3 2025." };
    const out = { excerpt: "صافي دخل 26.9 مليار دولار في الربع الثالث من 2025." };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("still counts the year alongside a spelled-out quarter", () => {
    const src = { excerpt: "Awards slowed in Q1 2026." };
    const out = { excerpt: "تباطأت الترسيات في الربع الأول." };
    const problems = validateTranslation(src, out);
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("2026");
  });

  it("does not read an HTML entity's code point as a figure", () => {
    // &#8377; is a rupee sign. Counting the 8377 made the entity itself a
    // fact the Arabic had to carry.
    const src = { content: "<p>A &#8377;12,000 crore order.</p>" };
    const out = { content: "<p>طلبية بقيمة 12,000 كرور روبية.</p>" };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("lets a decade be spelled out as a word", () => {
    const src = { content: "<p>A 1970s steel processor in Jeddah.</p>" };
    const out = { content: "<p>معالج صلب في جدة يعود إلى سبعينيات القرن الماضي.</p>" };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("still compares a bare year exactly", () => {
    const src = { content: "<p>Commissioned in 1970.</p>" };
    const out = { content: "<p>دخل الخدمة في السبعينيات.</p>" };
    expect(validateTranslation(src, out)).toHaveLength(1);
  });

  it("does not treat a chemical formula's subscript as a figure", () => {
    const src = { excerpt: "Cutting CO2 by 40 percent." };
    const out = { excerpt: "خفض ثاني أكسيد الكربون بنسبة 40 في المئة." };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("accepts a translation that keeps its hrefs", () => {
    const src = { content: '<p>See <a href="/construction/big-5-opens">the report</a>.</p>' };
    const out = { content: '<p>راجع <a href="/construction/big-5-opens">التقرير</a>.</p>' };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("catches a dropped figure", () => {
    const src = { excerpt: "An investment of SR57m covering 91,000 square metres." };
    const out = { excerpt: "استثمار يغطي 91,000 متر مربع." };
    const problems = validateTranslation(src, out);
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("figures missing");
  });

  it("does not mind a different thousands separator", () => {
    const src = { excerpt: "1,000 exhibitors from 50 countries." };
    const out = { excerpt: "1.000 عارض من 50 دولة." };
    expect(validateTranslation(src, out)).toEqual([]);
  });

  it("catches dropped markup", () => {
    const src = { content: "<p>One.</p><p>Two.</p><p>Three.</p>" };
    const out = { content: "<p>واحد. اثنان. ثلاثة.</p>" };
    const problems = validateTranslation(src, out);
    expect(problems.some(p => p.problem.includes("tag count"))).toBe(true);
  });

  it("catches an empty field", () => {
    const problems = validateTranslation({ title: "A headline" }, { title: "   " });
    expect(problems).toEqual([{ field: "title", problem: "came back empty" }]);
  });

  it("reports every problem in one pass so a retry can fix them together", () => {
    const src = {
      title: "SR57m Logistics Centre",
      content: '<p><a href="/x/y">link</a></p>',
    };
    const out = { title: "مركز لوجستي", content: "<p>رابط</p>" };
    const problems = validateTranslation(src, out);
    expect(problems.map(p => p.field).sort()).toEqual(["content", "content", "title"]);
  });
});

describe("applyTranslation", () => {
  const article = {
    id: 1, title: "Big 5 Opens", excerpt: "The show opened.", content: "<p>Body.</p>",
  };

  it("overlays only the fields that were translated", () => {
    const out = applyTranslation(article, { title: "بيج 5 ينطلق" });
    expect(out.title).toBe("بيج 5 ينطلق");
    // Untranslated fields fall back to English rather than blanking the page.
    expect(out.excerpt).toBe("The show opened.");
    expect(out.id).toBe(1);
  });

  it("leaves the row alone when there is no translation", () => {
    expect(applyTranslation(article, undefined)).toEqual(article);
  });

  it("ignores an empty translated value", () => {
    expect(applyTranslation(article, { title: "" }).title).toBe("Big 5 Opens");
  });
});

describe("sourceHash", () => {
  it("changes when the English changes, which is what marks a translation stale", () => {
    const before = sourceHash("<p>The show opened on 30 August.</p>");
    const after = sourceHash("<p>The show opened on 31 August.</p>");
    expect(before).not.toBe(after);
    expect(sourceHash("<p>The show opened on 30 August.</p>")).toBe(before);
  });
});
