/**
 * The SSR layer has to render in the language the URL asks for.
 *
 * The bug this guards against shipped once and was invisible to every
 * existing test: /ar/construction/big-5-opens routed correctly, came back
 * 200, and carried `lang="ar" dir="rtl"` — with an English headline, an
 * English meta description and an English body underneath. The locale was
 * stripped for routing and then thrown away, so nothing below the head ever
 * learned which language had been asked for.
 *
 * That is worse than serving no Arabic at all: it asks a search engine to
 * index two URLs carrying identical English text as if they were different
 * languages, which is the textbook way to have both dropped.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const translations = new Map<string, string>();

vi.mock("./translation.service", () => ({
  localizeArticle: vi.fn(async (locale: any, row: any) => {
    if (!locale || locale.isDefault) return row;
    const out = { ...row };
    for (const [field, value] of translations) out[field] = value;
    return out;
  }),
  localizeArticles: vi.fn(async (locale: any, rows: any[]) =>
    !locale || locale.isDefault ? rows : rows.map(r => ({ ...r, title: "عنوان" })),
  ),
}));

import { localizeArticle, localizeArticles } from "./translation.service";

const asMock = (f: unknown) => f as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  translations.clear();
  asMock(localizeArticle).mockClear();
  asMock(localizeArticles).mockClear();
});

describe("the SSR overlay", () => {
  it("leaves the row alone on the default language", async () => {
    const row = { id: 1, title: "PIF Strategy Turns Saudi Construction Toward Delivery" };
    const out = await localizeArticle({ code: "en", isDefault: true }, row);
    expect(out.title).toBe(row.title);
  });

  it("replaces the headline the page is built from", async () => {
    translations.set("title", "استراتيجية صندوق الاستثمارات العامة توجّه البناء نحو التنفيذ");
    const out = await localizeArticle(
      { code: "ar", isDefault: false },
      { id: 1, title: "PIF Strategy Turns Saudi Construction Toward Delivery" },
    );
    expect(out.title).toMatch(/[؀-ۿ]/);
    expect(out.title).not.toContain("PIF Strategy");
  });

  it("replaces every field a meta tag or the prerendered body reads", async () => {
    // Each of these feeds a different part of the page: <title> and og:title,
    // the meta description, and the crawler's copy of the article. Missing any
    // one of them leaves a visibly half-translated page.
    for (const f of ["title", "seoTitle", "seoDescription", "excerpt", "content"]) {
      translations.set(f, `عربي:${f}`);
    }
    const out = await localizeArticle({ code: "ar", isDefault: false }, {
      id: 1, title: "t", seoTitle: "st", seoDescription: "sd", excerpt: "e", content: "<p>c</p>",
    });
    for (const f of ["title", "seoTitle", "seoDescription", "excerpt", "content"]) {
      expect(out[f]).toBe(`عربي:${f}`);
    }
  });

  it("localizes the sibling links too, so related reading is not half English", async () => {
    const sibs = [{ id: 2, title: "Riyadh Metro Red Line", slug: "a" }];
    const out = await localizeArticles({ code: "ar", isDefault: false }, sibs);
    expect(out[0].title).toMatch(/[؀-ۿ]/);
  });
});
