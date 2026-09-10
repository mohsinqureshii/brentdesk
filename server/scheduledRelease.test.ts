/**
 * The contract that lets a future-dated commission publish on its own date.
 *
 * Two pieces have to agree for that to work:
 *
 *   - `isHeld` decides, per article, whether it is still waiting. It must
 *     stop holding on the day itself, not the day after.
 *   - `shouldIngest` decides whether a boot ingests at all. It compares the
 *     rows the database holds against the rows the build expects. Once every
 *     commission lands as a row — held ones as scheduled rows — that
 *     expectation is a property of the build, not of the calendar.
 *
 * The failure this guards against: an expected count that moves with the
 * date makes releasing a scheduled article depend on a deploy happening
 * after that date. A container that simply keeps running never releases it.
 */
import { describe, it, expect } from "vitest";
import { isHeld } from "../scripts/ingest-articles";
import { shouldIngest } from "./_core/bootstrapDecisions";

describe("isHeld", () => {
  const TODAY = "2026-09-06";

  it("holds a SCHEDULED commission dated ahead of today", () => {
    expect(isHeld({ status: "SCHEDULED", eventDate: "2026-09-15" }, TODAY)).toBe(true);
  });

  it("releases on the day itself, not the day after", () => {
    expect(isHeld({ status: "SCHEDULED", eventDate: TODAY }, TODAY)).toBe(false);
  });

  it("never holds an article that is not flagged SCHEDULED", () => {
    // A future eventDate alone is not a hold — only the flag is.
    expect(isHeld({ eventDate: "2026-09-15" }, TODAY)).toBe(false);
    expect(isHeld({ status: "PUBLISHED", eventDate: "2026-09-15" }, TODAY)).toBe(false);
  });

  it("does not hold a back-dated commission", () => {
    expect(isHeld({ status: "SCHEDULED", eventDate: "2025-11-24" }, TODAY)).toBe(false);
  });

  // Slots let a day's coverage publish in sequence rather than all at midnight.
  const NOON = new Date("2026-09-06T12:00:00Z");

  it("keeps holding a same-day commission whose slot has not arrived", () => {
    expect(isHeld(
      { status: "SCHEDULED", eventDate: TODAY, scheduledAt: "2026-09-06T16:00:00Z" },
      TODAY, NOON,
    )).toBe(true);
  });

  it("releases a same-day commission once its slot passes", () => {
    expect(isHeld(
      { status: "SCHEDULED", eventDate: TODAY, scheduledAt: "2026-09-06T08:00:00Z" },
      TODAY, NOON,
    )).toBe(false);
  });

  it("holds a back-dated commission that carries a future slot", () => {
    // Catch-up coverage of an event that has already run.
    expect(isHeld(
      { status: "SCHEDULED", eventDate: "2026-09-04", scheduledAt: "2026-09-08T06:00:00Z" },
      TODAY, NOON,
    )).toBe(true);
  });
});

describe("shouldIngest and the held rows", () => {
  const revision = { revision: "abc" };
  const want = { articles: 388, translations: 1940, ...revision };

  it("ingests when the build carries commissions the database has not got", () => {
    // 353 published + 0 held: the run has not landed yet.
    expect(shouldIngest(undefined, { articles: 353, translations: 1940, revision: "abc" }, want))
      .toBe(true);
  });

  it("does not re-ingest once every commission has landed, held ones included", () => {
    // 353 published + 35 scheduled rows = 388. The scheduler takes it from
    // here; no further deploy is needed for the held ones to appear.
    expect(shouldIngest(undefined, { articles: 388, translations: 1940, revision: "abc" }, want))
      .toBe(false);
  });

  it("still ingests when the archive itself changed under an unchanged count", () => {
    expect(shouldIngest(undefined, { articles: 388, translations: 1940, revision: "stale" }, want))
      .toBe(true);
  });

  it("never ingests from an archive it could not read", () => {
    expect(shouldIngest(undefined, { articles: 0, translations: 0, revision: "" },
      { articles: 0, translations: 0, revision: "abc" })).toBe(false);
  });
});
