import { describe, it, expect } from "vitest";
import { shouldSeed, shouldIngest } from "./bootstrapDecisions";

const TARGET = { companies: 125, events: 7, locales: 2 };
const complete = { countries: 23, companies: 125, events: 7, locales: 2 };
const behind = { countries: 23, companies: 40, events: 0, locales: 0 };
const fresh = { countries: 0, companies: 0, events: 0, locales: 0 };

describe("shouldSeed", () => {
  it("seeds a fresh database", () => {
    expect(shouldSeed(undefined, fresh, TARGET)).toBe(true);
  });

  it("seeds when the build adds company profiles the database lacks", () => {
    // The regression this exists for: a deploy shipping 85 new company
    // profiles to a database holding the previous 40 used to do nothing.
    expect(shouldSeed(undefined, behind, TARGET)).toBe(true);
  });

  it("seeds when only the events are short", () => {
    expect(shouldSeed(undefined, { ...complete, events: 0 }, TARGET)).toBe(true);
  });

  it("leaves a complete database alone", () => {
    expect(shouldSeed(undefined, complete, TARGET)).toBe(false);
  });

  it("does not re-seed because an editor added companies of their own", () => {
    expect(shouldSeed(undefined, { ...complete, companies: 400 }, TARGET)).toBe(false);
  });

  it("honours the flags either way", () => {
    expect(shouldSeed("1", complete, TARGET)).toBe(true);
    expect(shouldSeed("0", fresh, TARGET)).toBe(false);
  });

  it("seeds when a new language is added to the seed list", () => {
    expect(shouldSeed(undefined, { ...complete, locales: 1 }, TARGET)).toBe(true);
  });

  it("decides nothing on counts it could not read", () => {
    expect(shouldSeed(
      undefined,
      { countries: null, companies: null, events: null, locales: null },
      TARGET,
    )).toBe(false);
  });
});

describe("shouldIngest", () => {
  const A = (articles: number | null, translations: number | null = 0) => ({ articles, translations });
  const W = (articles: number, translations = 0) => ({ articles, translations });

  it("publishes an archive larger than the database", () => {
    expect(shouldIngest(undefined, A(115), W(266))).toBe(true);
  });

  it("leaves a database that already has the whole archive alone", () => {
    expect(shouldIngest(undefined, A(266), W(266))).toBe(false);
  });

  it("does not run on an archive it could not read", () => {
    // want === 0 means the bundled file was missing or unparseable. Running
    // an ingest then would only report zero and confuse the deploy log.
    expect(shouldIngest(undefined, A(0), W(0))).toBe(false);
  });

  it("bootstraps an empty database from a readable archive", () => {
    expect(shouldIngest(undefined, A(0), W(266))).toBe(true);
  });

  it("does not run when the database holds more than the build ships", () => {
    // Articles written in the CMS rather than shipped in the archive file.
    expect(shouldIngest(undefined, A(300), W(266))).toBe(false);
  });

  it("honours the flags either way", () => {
    expect(shouldIngest("1", A(266), W(266))).toBe(true);
    expect(shouldIngest("0", A(0), W(266))).toBe(false);
  });

  it("decides nothing on a count it could not read", () => {
    expect(shouldIngest(undefined, A(null), W(266))).toBe(false);
  });

  // The case that shipped English under an Arabic switcher: every article
  // already published, and a build carrying a translated archive the
  // database has never seen.
  it("publishes translations into a database that already has every article", () => {
    expect(shouldIngest(undefined, A(268, 0), W(268, 1578))).toBe(true);
  });

  it("stops once the translations have landed too", () => {
    expect(shouldIngest(undefined, A(268, 1578), W(268, 1578))).toBe(false);
  });

  it("publishes a translation the archive has grown since the last deploy", () => {
    // 268 headlines translated, bodies added in this build.
    expect(shouldIngest(undefined, A(268, 1072), W(268, 1578))).toBe(true);
  });

  it("does not run for translations it could not read", () => {
    expect(shouldIngest(undefined, A(268, 0), W(268, 0))).toBe(false);
  });

  it("ignores a translation count it could not read", () => {
    expect(shouldIngest(undefined, A(268, null), W(268, 1578))).toBe(false);
  });
});
