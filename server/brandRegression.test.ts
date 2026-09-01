/**
 * Brand regression guard.
 *
 * The platform was migrated from a previous publication (TechScoop). Its
 * brand, domain, or editorial identity must never reappear in active
 * source or configuration. Historical references are permitted ONLY in
 * the explicitly allowed locations below (archived migrations and the
 * migration documentation).
 *
 * If this test fails, remove the string from the offending file — do not
 * add new exclusions without a documented reason.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Forbidden, case-insensitive. Substrings so variants are caught too.
const FORBIDDEN = ["techscoop", "manus-storage", "manus platform", "manus hosting"];

// Paths (repo-relative prefixes) where historical references are allowed.
const ALLOWED_PREFIXES = [
  "drizzle/legacy/", // archived pre-BrentDesk migration chain
  "docs/", // migration documentation describes the old brand deliberately
  "server/brandRegression.test.ts", // this file
];

function gitGrep(pattern: string): string[] {
  try {
    const out = execFileSync(
      "git",
      ["grep", "-l", "-i", pattern, "--", ".", ":(exclude)pnpm-lock.yaml"],
      { cwd: ROOT, encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch (err: any) {
    // git grep exits 1 when there are no matches
    if (err.status === 1) return [];
    throw err;
  }
}

describe("brand regression", () => {
  for (const pattern of FORBIDDEN) {
    it(`no active source references "${pattern}"`, () => {
      const files = gitGrep(pattern).filter(
        (f) => !ALLOWED_PREFIXES.some((p) => f.startsWith(p)),
      );
      expect(
        files,
        `Forbidden brand string "${pattern}" found in: ${files.join(", ")}`,
      ).toEqual([]);
    });
  }
});
