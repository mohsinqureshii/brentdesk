/**
 * The masthead has to stay put when the page scrolls.
 *
 * It is declared `sticky top-0`, and that was true the whole time it was
 * scrolling away on every page except the front one. `position: sticky`
 * sticks to the nearest scrolling ancestor, and an element with
 * `overflow-x: hidden` is one — CSS resolves the unspecified axis to
 * `auto` rather than leaving it visible. A page wrapper carrying
 * `overflow-x-hidden` is therefore a scroll container exactly as tall as
 * its own content, so the header inside it never has anything to stick
 * to and travels up with the rest of the document.
 *
 * `overflow-x: clip` stops horizontal overflow the same way without
 * establishing a scroll container, which is what index.css already uses
 * on html and body. This guards the pages, because the failure is
 * invisible in review: the class name still says sticky, the page still
 * looks right in a screenshot, and only scrolling reveals it.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Radix's menu, select, command and context-menu surfaces are allowed to
 * clip with `hidden`: they are popovers with their own scroll, they are
 * not ancestors of the masthead, and nothing sticky lives inside them.
 */
const ALLOWED = [
  "client/src/components/ui/dropdown-menu.tsx",
  "client/src/components/ui/select.tsx",
  "client/src/components/ui/command.tsx",
  "client/src/components/ui/context-menu.tsx",
];

function gitGrep(pattern: string, pathspec: string): string[] {
  try {
    return execFileSync("git", ["grep", "-l", pattern, "--", pathspec], {
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

/**
 * Source with its comments removed.
 *
 * The header carries a comment explaining this exact trap, and it names
 * the class in order to be findable — which tripped the check the first
 * time it ran. A guard that cannot be written about is not much of a
 * guard, so it looks at code rather than at text.
 */
function codeOnly(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

describe("sticky header", () => {
  it("is declared sticky to the top of the viewport", () => {
    const header = readFileSync(
      path.join(ROOT, "client/src/components/layout/Header.tsx"),
      "utf8",
    );
    expect(header).toMatch(/<header className="sticky top-0/);
  });

  it("has no page wrapper that turns itself into a scroll container", () => {
    const offenders = gitGrep("overflow-x-hidden", "client/src")
      .filter((f) => !ALLOWED.includes(f))
      .filter((f) => codeOnly(f).includes("overflow-x-hidden"));
    expect(offenders).toEqual([]);
  });

  it("clips horizontal overflow on html and body rather than hiding it", () => {
    const css = readFileSync(path.join(ROOT, "client/src/index.css"), "utf8");
    // Both must be `clip`; `hidden` on either one disables sticky for the
    // whole document, which is the same bug one level up.
    const htmlBlock = css.match(/\bhtml\s*\{[^}]*\}/)?.[0] ?? "";
    const bodyBlock = css.match(/\bbody\s*\{[^}]*\}/)?.[0] ?? "";
    expect(htmlBlock).toContain("overflow-x: clip");
    expect(bodyBlock).toContain("overflow-x: clip");
    expect(htmlBlock).not.toContain("overflow-x: hidden");
    expect(bodyBlock).not.toContain("overflow-x: hidden");
  });
});
