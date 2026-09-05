/**
 * The front page's beat bands each carry a "view all". Where it goes is
 * the rule under test: an editor's explicit URL, else the band's own beat
 * at its canonical bare slug, else the newsroom.
 *
 * This is guarded rather than left to the component because the failure
 * mode is invisible — a band still renders, the link just goes somewhere
 * useless, or the component quietly stops rendering a link at all, which
 * is how the bands shipped as dead ends in the first place.
 */
import { describe, it, expect } from "vitest";
import { sectionHref } from "@shared/sectionUrl";

describe("homepage section links", () => {
  it("uses the editor's explicit destination when one is set", () => {
    expect(sectionHref({ viewMoreUrl: "/events", categorySlug: "construction" })).toBe("/events");
  });

  it("otherwise links to the band's own beat, at the canonical bare slug", () => {
    expect(sectionHref({ categorySlug: "construction" })).toBe("/construction");
    // Not /category/construction — that path only exists to redirect.
    expect(sectionHref({ categorySlug: "industrial-technology" })).toBe("/industrial-technology");
  });

  it("falls back to the newsroom only for a band with no beat", () => {
    expect(sectionHref({})).toBe("/news");
    expect(sectionHref({ viewMoreUrl: null, categorySlug: null })).toBe("/news");
  });

  it("never returns an empty destination", () => {
    for (const section of [{}, { categorySlug: "" }, { viewMoreUrl: "" }]) {
      expect(sectionHref(section).length).toBeGreaterThan(0);
    }
  });
});
