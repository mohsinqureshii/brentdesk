import { describe, it, expect, vi, beforeEach } from "vitest";

// The locale list comes from the database. Stub it so these tests exercise
// the tag construction, which is where the SEO-breaking mistakes live.
vi.mock("./translation.service", () => ({
  listLocales: vi.fn(),
}));

import { listLocales } from "./translation.service";
import { localeLinkTags, applyLocaleHead, sitemapAlternates } from "./hreflang.service";

const loc = (code: string, isDefault = false, direction: "ltr" | "rtl" = "ltr") => ({
  id: 1, code, name: code, nativeName: code, direction, flagEmoji: null,
  isDefault, isActive: true, translationMode: "manual_ai" as const,
  provider: null, model: null, glossary: [], sortOrder: 0,
});

const mocked = listLocales as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocked.mockReset();
  mocked.mockResolvedValue([loc("en", true), loc("ar", false, "rtl")]);
});

describe("localeLinkTags", () => {
  it("emits an alternate for every language including the page itself", async () => {
    // A page that lists alternates but omits itself is ignored by Google.
    const { alternates } = await localeLinkTags("/construction/big-5-opens");
    expect(alternates).toContain('hreflang="en"');
    expect(alternates).toContain('hreflang="ar"');
    expect(alternates).toContain("/construction/big-5-opens");
    expect(alternates).toContain("/ar/construction/big-5-opens");
  });

  it("points x-default at the source language", async () => {
    const { alternates } = await localeLinkTags("/ar/construction/big-5-opens");
    const line = alternates.split("\n").find(l => l.includes('x-default'))!;
    expect(line).toContain("/construction/big-5-opens");
    expect(line).not.toContain("/ar/");
  });

  it("gives the Arabic page an Arabic canonical", async () => {
    // Pointing it at the English URL asks Google to drop the Arabic page
    // from the index — the single most common way to make a translated
    // site invisible.
    const { canonical, lang, dir } = await localeLinkTags("/ar/construction/big-5-opens");
    expect(canonical).toMatch(/\/ar\/construction\/big-5-opens$/);
    expect(lang).toBe("ar");
    expect(dir).toBe("rtl");
  });

  it("gives the English page an English canonical", async () => {
    const { canonical, lang } = await localeLinkTags("/construction/big-5-opens");
    expect(canonical).not.toContain("/ar/");
    expect(lang).toBe("en");
  });

  it("handles the home page without a trailing slash artefact", async () => {
    const { alternates } = await localeLinkTags("/");
    expect(alternates).toMatch(/href="[^"]*\/ar"/);
  });

  it("emits nothing when only one language is configured", async () => {
    mocked.mockResolvedValue([loc("en", true)]);
    const { alternates, canonical } = await localeLinkTags("/construction/x");
    expect(alternates).toBe("");
    expect(canonical).toBe("");
  });

  it("treats an unknown first segment as a category, not a language", async () => {
    const { canonical, lang } = await localeLinkTags("/oil-gas/some-article");
    expect(lang).toBe("en");
    expect(canonical).toMatch(/\/oil-gas\/some-article$/);
  });
});

describe("applyLocaleHead", () => {
  const page = [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <link rel="canonical" href="https://brentdesk.com/construction/big-5-opens" />',
    "  </head>",
    "  <body></body>",
    "</html>",
  ].join("\n");

  it("sets lang and dir for a right-to-left language", async () => {
    const out = await applyLocaleHead(page, "/ar/construction/big-5-opens");
    expect(out).toContain('lang="ar"');
    expect(out).toContain('dir="rtl"');
    expect(out).not.toMatch(/<html[^>]*lang="en"/);
  });

  it("replaces the canonical rather than adding a second one", async () => {
    const out = await applyLocaleHead(page, "/ar/construction/big-5-opens");
    const canonicals = out.match(/rel="canonical"/g) ?? [];
    expect(canonicals).toHaveLength(1);
    expect(out).toContain('href="https://brentdesk.com/ar/construction/big-5-opens"');
  });

  it("adds a canonical to a page that had none", async () => {
    const bare = '<html lang="en"><head><title>x</title></head><body></body></html>';
    const out = await applyLocaleHead(bare, "/ar/mining");
    expect(out).toMatch(/rel="canonical"[^>]*\/ar\/mining/);
  });

  it("leaves the page untouched when there is only one language", async () => {
    mocked.mockResolvedValue([loc("en", true)]);
    expect(await applyLocaleHead(page, "/construction/big-5-opens")).toBe(page);
  });
});

describe("sitemapAlternates", () => {
  const BASE = "https://brentdesk.com";
  const langs = [{ code: "en", isDefault: true }, { code: "ar", isDefault: false }];

  it("declares both languages plus x-default for an article URL", () => {
    const out = sitemapAlternates(`${BASE}/construction/big-5-opens`, BASE, langs);
    expect(out).toContain('hreflang="en" href="https://brentdesk.com/construction/big-5-opens"');
    expect(out).toContain('hreflang="ar" href="https://brentdesk.com/ar/construction/big-5-opens"');
    expect(out).toContain('hreflang="x-default" href="https://brentdesk.com/construction/big-5-opens"');
  });

  it("does not leave a bare slash on the front page", () => {
    const out = sitemapAlternates(`${BASE}/`, BASE, langs);
    expect(out).toContain('href="https://brentdesk.com/ar"');
    expect(out).not.toContain("/ar/\"");
  });

  it("emits nothing when one language is configured", () => {
    expect(sitemapAlternates(`${BASE}/mining`, BASE, [{ code: "en", isDefault: true }])).toBe("");
  });
});
