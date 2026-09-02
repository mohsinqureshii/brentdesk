import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { boolInt, toDbDate } from "./dbValues";

describe("boolInt", () => {
  it("maps booleans to tinyint and preserves nullish", () => {
    expect(boolInt(true)).toBe(1);
    expect(boolInt(false)).toBe(0);
    expect(boolInt(7)).toBe(7);
    expect(boolInt(null)).toBeUndefined();
    expect(boolInt(undefined)).toBeUndefined();
  });
});

describe("toDbDate", () => {
  it("converts Dates to the MySQL DATETIME form", () => {
    expect(toDbDate(new Date("2026-09-02T00:21:57.739Z"))).toBe("2026-09-02 00:21:57");
  });

  it("normalizes ISO-8601 strings", () => {
    // MySQL under STRICT_TRANS_TABLES rejects every one of these forms
    // with "Incorrect datetime value"; a lenient server accepts them,
    // which is why this only ever broke in production.
    expect(toDbDate("2026-09-02T00:21:57.739Z")).toBe("2026-09-02 00:21:57");
    expect(toDbDate("2026-09-02T00:21:57Z")).toBe("2026-09-02 00:21:57");
    expect(toDbDate("2026-09-02T00:21")).toBe("2026-09-02 00:21:00");
  });

  it("re-reads a zoned offset as UTC rather than keeping wall time", () => {
    expect(toDbDate("2026-09-02T03:21:57+03:00")).toBe("2026-09-02 00:21:57");
  });

  it("leaves already-valid and non-temporal values alone", () => {
    expect(toDbDate("2026-09-02 00:21:57")).toBe("2026-09-02 00:21:57");
    expect(toDbDate("2026-09-02")).toBe("2026-09-02");
    expect(toDbDate("published")).toBe("published");
  });

  it("preserves nullish so Drizzle omits the key", () => {
    expect(toDbDate(null)).toBeNull();
    expect(toDbDate(undefined)).toBeUndefined();
  });
});

describe("temporal write boundary", () => {
  /**
   * Guards the regression this file exists for: a raw `.toISOString()`
   * written into a DATETIME/TIMESTAMP column. It produced
   * "[Auth] Failed to update lastSignedIn: Incorrect datetime value"
   * on MySQL 8 while passing silently against a lenient local MariaDB.
   * Every such write must go through toDbDate().
   */
  it("has no raw toISOString() flowing into a temporal column", () => {
    const columns = new Set(
      [...readFileSync("drizzle/schema.ts", "utf8")
        .matchAll(/(\w+):\s*(?:timestamp|datetime|date)\(/g)].map(m => m[1]),
    );
    const colRe = [...columns].sort((a, b) => b.length - a.length).join("|");
    const files = execSync('grep -rl "toISOString()" --include=*.ts server/', { encoding: "utf8" })
      .split("\n")
      .filter(f => f && !f.includes(".test."))
      // Redis / in-process session store, not SQL.
      .filter(f => f !== "server/middleware/session.middleware.ts");

    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (!line.includes("toISOString()") || line.includes("JSON.stringify")) return;
        const trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("//")) return;
        // A trailing .slice/.split is a read-path format (a date-only key,
        // a CSV cell), not a write.
        if (/toISOString\(\)\s*\.(slice|split|substring)\(/.test(line)) return;
        const atBoundary =
          new RegExp(`\\b(${colRe})\\s*:`).test(line) ||
          new RegExp(`\\.\\b(${colRe})\\s*=`).test(line) ||
          new RegExp(`\\b(?:gte|lte|gt|lt|eq|ne|between)\\(\\s*\\w+\\.(${colRe})\\b`).test(line);
        if (atBoundary) offenders.push(`${file}:${i + 1}: ${trimmed}`);
      });
    }

    expect(offenders, `wrap these in toDbDate():\n${offenders.join("\n")}`).toEqual([]);
  });
});
