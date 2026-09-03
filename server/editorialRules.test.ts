/**
 * Editorial house rules, enforced on the article corpus.
 *
 * Two constraints set by the publisher (see content/EDITORIAL_BRIEF.md):
 * nothing dated before September 2025, and no editorialising on government.
 *
 * The date rule is mechanical and fully checkable here. The government rule
 * is a matter of judgement and cannot be, so this test does the one part a
 * machine can do honestly: it fails on a short list of constructions that
 * are criticism rather than reporting, and that had actually appeared in
 * drafts. It is a backstop against the phrasings that slipped through
 * before, not a substitute for reading the piece.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "../content/articles");
const EARLIEST = "2025-09-01";

type Article = { headline: string; eventDate: string; content: string };

function corpus(): { file: string; a: Article }[] {
  return readdirSync(DIR)
    .filter(f => f.endsWith(".json"))
    .flatMap(f => {
      const parsed = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
      return (Array.isArray(parsed) ? parsed : [parsed]).map((a: Article) => ({ file: f, a }));
    });
}

describe("editorial house rules", () => {
  it("no article is dated before September 2025", () => {
    const early = corpus()
      .filter(({ a }) => a.eventDate && a.eventDate < EARLIEST)
      .map(({ file, a }) => `${file} (${a.eventDate})`);
    expect(early).toEqual([]);
  });

  it("no article editorialises on government", () => {
    // Each pattern is a verdict rather than a report. Kept deliberately
    // narrow: broad words like "failed" or "delay" are often the plain
    // factual description and must stay usable.
    const BANNED: [RegExp, string][] = [
      [/\bis not the plan that was announced\b/i, "verdict on a government plan"],
      [/\bwas sold as\b/i, "implies a government oversold something"],
      [/\bworth holding against\b/i, "invites an unfavourable comparison"],
      [/\bstatement of ambition rather than\b/i, "scepticism about an official figure"],
      [/\bnothing to show for\b/i, "verdict on delivery"],
      [/\bquietly (?:shelved|dropped|abandoned)\b/i, "imputes motive to an authority"],
      [/\bso far failed to deliver\b/i, "verdict on delivery"],
    ];
    const hits: string[] = [];
    for (const { file, a } of corpus()) {
      const text = `${a.headline} ${a.content}`;
      for (const [re, why] of BANNED) {
        if (re.test(text)) hits.push(`${file}: ${why} — ${re.source}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
