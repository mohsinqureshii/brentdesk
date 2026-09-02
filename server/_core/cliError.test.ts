import { describe, it, expect } from "vitest";
import { describeError } from "../../scripts/cliError";

describe("describeError", () => {
  it("surfaces a driver error whose message is empty", () => {
    // This is the shape that printed "[reset]" and nothing else.
    const e: any = new Error("");
    e.code = "ECONNREFUSED"; e.errno = -111; e.syscall = "connect"; e.address = "10.0.0.4"; e.port = 3306;
    const out = describeError(e);
    expect(out).toContain("ECONNREFUSED");
    expect(out).toContain("3306");
    expect(out.trim()).not.toBe("");
  });

  it("includes sqlMessage when it differs from message", () => {
    const e: any = new Error("Failed query");
    e.sqlMessage = "Access denied for user"; e.code = "ER_ACCESS_DENIED_ERROR"; e.sqlState = "28000";
    const out = describeError(e);
    expect(out).toContain("Failed query");
    expect(out).toContain("Access denied for user");
    expect(out).toContain("28000");
  });

  it("does not repeat sqlMessage when it equals message", () => {
    const e: any = new Error("same"); e.sqlMessage = "same";
    expect(describeError(e).match(/same/g)?.length).toBe(1);
  });

  it("handles a plain string throw", () => {
    expect(describeError("boom")).toBe("boom");
  });

  it("handles a thrown object with nothing recognisable", () => {
    expect(describeError({ weird: 1 })).toContain("weird");
  });

  it("handles null and undefined", () => {
    expect(describeError(null)).toContain("no error value");
    expect(describeError(undefined)).toContain("no error value");
  });

  it("never returns an empty string", () => {
    for (const v of [new Error(""), {}, 0, false, [], null]) {
      expect(describeError(v).trim().length).toBeGreaterThan(0);
    }
  });
});
