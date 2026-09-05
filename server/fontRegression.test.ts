/**
 * Font regression guard.
 *
 * Arabic pages get STC Forward by forcing the whole subtree to inherit a
 * stack that leads with it (see the top of client/src/index.css). That
 * mechanism has one weakness: an inline `font-family` outranks it, because
 * inline styles beat any stylesheet rule that is not `!important`. The
 * effect is silent and only visible in Arabic — the Latin face has no
 * Arabic glyphs, so the text drops to whatever the browser falls back to,
 * which is not the publication's typeface.
 *
 * That is exactly how the top-story headline on the Arabic home page ended
 * up in a system font while every check that read the CSS said it was fine.
 * Use the `.bd-display` class instead; it sits in a layer the Arabic rule
 * outranks, so it applies in English and yields in Arabic.
 *
 * If this test fails, replace the inline style with a class. Only add an
 * exception for something that is genuinely per-locale in JavaScript.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// The one deliberate case: the wordmark names the Latin display face for
// the Latin mark and deliberately names nothing for the Arabic one, which
// is a decision only reachable in JavaScript.
const ALLOWED = ["client/src/components/layout/Header.tsx"];

function gitGrep(pattern: string): string[] {
  try {
    return execFileSync("git", ["grep", "-l", pattern, "--", "client/src"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch (err: any) {
    if (err.status === 1) return []; // no matches
    throw err;
  }
}

describe("font regression", () => {
  it("no component sets font-family inline, which would break Arabic", () => {
    const offenders = gitGrep("fontFamily").filter(f => !ALLOWED.includes(f));
    expect(offenders).toEqual([]);
  });

  it("the Arabic stack leads with STC Forward and falls through to the Latin face", () => {
    const onDisk = readFileSync(path.join(ROOT, "client/src/index.css"), "utf8");
    expect(onDisk).toContain(
      '[lang="ar"], [dir="rtl"], .font-arabic {\n  font-family: "STC Forward", "Atyp Text", "Atyp Display"',
    );
    // The rule only works unlayered — inside @layer it loses to utilities.
    const idx = onDisk.indexOf('[lang="ar"], [dir="rtl"], .font-arabic');
    const before = onDisk.slice(0, idx);
    const depth = (before.match(/{/g) || []).length - (before.match(/}/g) || []).length;
    expect(depth).toBe(0);
  });
});
