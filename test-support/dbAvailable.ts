/**
 * Database reachability flag for tests.
 *
 * Some suites exercise real queries and need a provisioned MySQL. Without
 * one they used to fail with connection errors, which is indistinguishable
 * from broken code in CI output. Gate those suites on this flag so a
 * checkout without a database reports them as SKIPPED (missing
 * infrastructure) rather than FAILED (broken code):
 *
 *   import { hasDatabase } from "@test/dbAvailable";
 *   describe.runIf(hasDatabase)("...", () => { ... });
 *
 * The probe itself runs once per worker in vitest.setup.ts, which executes
 * before test modules are imported. This never weakens assertions — when
 * DATABASE_URL points at a live server every gated test runs as before.
 */
export const hasDatabase = process.env.__HAS_DATABASE === "1";
