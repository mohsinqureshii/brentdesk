/**
 * The figure-parity gate, and the one construction it deliberately excuses.
 */
import { describe, it, expect } from "vitest";
import { validateTranslation } from "./translationChecks";

describe("figure parity", () => {
  it("fails when a figure in the English is absent from the translation", () => {
    const problems = validateTranslation(
      { title: "A SAR 1.84bn contract" },
      { title: "عقد بمليارات الريالات" },
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("1.84");
  });

  it("passes when every figure carries across", () => {
    expect(validateTranslation(
      { title: "40 projects and 900km" },
      { title: "40 مشروعاً و900 كم" },
    )).toEqual([]);
  });
});

describe("Arabic ordinals", () => {
  it("accepts an ordinal written as an Arabic word", () => {
    // English writes the tenth round "Round 10"; Arabic writes it
    // "الجولة العاشرة". The figure is stated, just not in digits.
    expect(validateTranslation(
      { title: "Round 10 opens with 24 bidders" },
      { title: "الجولة العاشرة تنطلق بـ24 متقدماً" },
    )).toEqual([]);
  });

  it("still fails when a real quantity is dropped", () => {
    // The narrowing must not extend to quantities. 24 has no ordinal
    // reading, and its absence is a fact going missing.
    const problems = validateTranslation(
      { title: "Round 10 opens with 24 bidders" },
      { title: "الجولة العاشرة تنطلق بعدد من المتقدمين" },
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("24");
  });

  it("does not credit an ordinal that is not in the text", () => {
    const problems = validateTranslation(
      { title: "Round 10 of the programme" },
      { title: "جولة من البرنامج" },
    );
    expect(problems[0].problem).toContain("10");
  });
});
