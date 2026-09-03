/**
 * The site's furniture has to translate too.
 *
 * The bug this guards against was visible the moment anyone opened /ar: 268
 * translated articles sitting under English block headings — "Latest
 * Headlines", "In Brief", "Most Read" — with an English category label above
 * every card. The archive was in Arabic and the page around it was not.
 *
 * Those names are editor-written and live in the database, so no amount of
 * translating articles reaches them. Two shapes are needed: a row whose OWN
 * name is translated (a category, a homepage section), and a row carrying
 * someone else's name as a label (an article card's `categoryName`, which
 * belongs to the category, not the article).
 *
 * The database is stubbed rather than the module, so the real lookup and the
 * real id-matching run.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/** Rows the stubbed content_translations table holds. */
let stored: Array<{ entityType: string; entityId: number; field: string; value: string }> = [];
let selected: any;

vi.mock("../db", () => ({
  getDb: async () => ({
    select: (shape: any) => {
      selected = shape;
      return {
        from: () => ({
          where: () =>
            Promise.resolve(
              stored.map(r => ({ entityId: r.entityId, field: r.field, value: r.value })),
            ),
        }),
      };
    },
  }),
}));

const { localizeRows, localizeCategoryLabels } = await import("./translation.service");

const AR = { code: "ar", isDefault: false };
const EN = { code: "en", isDefault: true };

beforeEach(() => {
  selected = undefined;
  stored = [];
});

describe("localizeRows", () => {
  it("translates a homepage block heading", async () => {
    stored = [{ entityType: "homepage_section", entityId: 2, field: "name", value: "آخر العناوين" }];
    const [out] = await localizeRows(AR, "homepage_section", [{ id: 2, name: "Latest Headlines" }]);
    expect(out.name).toBe("آخر العناوين");
  });

  it("leaves a heading nobody has translated in English rather than blank", async () => {
    stored = [{ entityType: "homepage_section", entityId: 2, field: "name", value: "آخر العناوين" }];
    const [out] = await localizeRows(AR, "homepage_section", [{ id: 99, name: "In Brief" }]);
    expect(out.name).toBe("In Brief");
  });

  it("costs nothing on the default language — no query at all", async () => {
    const rows = [{ id: 2, name: "Latest Headlines" }];
    expect(await localizeRows(EN, "homepage_section", rows)).toBe(rows);
    expect(selected).toBeUndefined();
  });
});

describe("localizeCategoryLabels", () => {
  it("translates the label an article card carries", async () => {
    // The row's own id is the article's; the name belongs to category 7, so
    // the row-id overlay cannot reach it.
    stored = [{ entityType: "category", entityId: 7, field: "name", value: "الإنشاءات" }];
    const [out] = await localizeCategoryLabels(AR, [
      { id: 1234, title: "…", categoryId: 7, categoryName: "Construction" },
    ]);
    expect(out.categoryName).toBe("الإنشاءات");
    expect(out.id).toBe(1234);
    expect(out.title).toBe("…");
  });

  it("leaves a row with no category alone, without querying", async () => {
    const rows = [{ id: 1, categoryId: null, categoryName: null }];
    expect(await localizeCategoryLabels(AR, rows)).toBe(rows);
    expect(selected).toBeUndefined();
  });

  it("costs nothing on the default language", async () => {
    const rows = [{ id: 1, categoryId: 7, categoryName: "Construction" }];
    expect(await localizeCategoryLabels(EN, rows)).toBe(rows);
    expect(selected).toBeUndefined();
  });
});
