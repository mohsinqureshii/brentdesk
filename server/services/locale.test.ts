import { describe, it, expect } from "vitest";
import { splitLocalePath, matchAcceptLanguage, localePath } from "./locale.service";

const CODES = ["en", "ar", "ur", "zh-Hans"];

describe("splitLocalePath", () => {
  it("pulls a known locale off the front", () => {
    expect(splitLocalePath("/ar/construction/big-5-opens", CODES))
      .toEqual({ code: "ar", basePath: "/construction/big-5-opens" });
  });

  it("handles a bare locale root", () => {
    expect(splitLocalePath("/ar", CODES)).toEqual({ code: "ar", basePath: "/" });
  });

  it("leaves a path alone when the first segment is a category, not a language", () => {
    // The failure this guards: /manufacturing is a real category. Treating
    // any two-or-three letter segment as a locale would 404 the site.
    expect(splitLocalePath("/oil-gas/some-article", CODES))
      .toEqual({ code: null, basePath: "/oil-gas/some-article" });
  });

  it("does not match a language that is not configured", () => {
    expect(splitLocalePath("/fr/construction", CODES))
      .toEqual({ code: null, basePath: "/fr/construction" });
  });

  it("matches a script-tagged code", () => {
    expect(splitLocalePath("/zh-Hans/mining", CODES))
      .toEqual({ code: "zh-Hans", basePath: "/mining" });
  });

  it("is case-insensitive about the prefix but returns the configured casing", () => {
    expect(splitLocalePath("/AR/mining", CODES)).toEqual({ code: "ar", basePath: "/mining" });
  });

  it("leaves the root alone", () => {
    expect(splitLocalePath("/", CODES)).toEqual({ code: null, basePath: "/" });
  });
});

const locale = (code: string, isDefault = false) => ({
  id: 1, code, name: code, nativeName: code, direction: "ltr" as const,
  flagEmoji: null, isDefault, isActive: true,
  translationMode: "manual_ai" as const, provider: null, model: null,
  glossary: [], sortOrder: 0,
});
const ACTIVE = [locale("en", true), locale("ar"), locale("ur")];

describe("matchAcceptLanguage", () => {
  it("matches an exact tag", () => {
    expect(matchAcceptLanguage("ar", ACTIVE)).toBe("ar");
  });

  it("matches a regional tag to its base language", () => {
    expect(matchAcceptLanguage("ar-SA,en;q=0.8", ACTIVE)).toBe("ar");
  });

  it("respects quality ordering rather than document order", () => {
    expect(matchAcceptLanguage("ur;q=0.3,ar;q=0.9", ACTIVE)).toBe("ar");
  });

  it("returns null when nothing configured matches", () => {
    expect(matchAcceptLanguage("fr-FR,de;q=0.8", ACTIVE)).toBeNull();
  });

  it("ignores a wildcard", () => {
    expect(matchAcceptLanguage("*", ACTIVE)).toBeNull();
  });

  it("returns null for a missing header", () => {
    expect(matchAcceptLanguage(undefined, ACTIVE)).toBeNull();
  });
});

describe("localePath", () => {
  it("leaves the default language unprefixed so indexed URLs do not move", () => {
    expect(localePath("/construction/big-5-opens", { code: "en", isDefault: true }))
      .toBe("/construction/big-5-opens");
  });

  it("prefixes every other language", () => {
    expect(localePath("/construction/big-5-opens", { code: "ar", isDefault: false }))
      .toBe("/ar/construction/big-5-opens");
  });

  it("handles the home page", () => {
    expect(localePath("/", { code: "ar", isDefault: false })).toBe("/ar");
    expect(localePath("/", { code: "en", isDefault: true })).toBe("/");
  });

  it("tolerates a path without its leading slash", () => {
    expect(localePath("mining", { code: "ar", isDefault: false })).toBe("/ar/mining");
  });
});
