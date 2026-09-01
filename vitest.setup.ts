/**
 * Vitest global setup.
 *
 * Several server modules read required env at import time
 * (server/_core/env.ts throws without JWT_SECRET), which used to make
 * half the test files fail collection on a fresh checkout. Provide safe
 * test defaults here; real values from the environment always win, so CI
 * can still point DATABASE_URL at a provisioned test database.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || "vitest-secret";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Vitest (via Vite) injects its resolved `base` option into process.env as
// BASE_URL="/". shared/publication.getBaseUrl() treats any BASE_URL env var
// as a deliberate override and strips trailing slashes, so "/" collapses to
// "" and every module-level absolute-URL constant breaks under test. Strip
// the injected value unless the environment provided a real http(s) URL.
if (process.env.BASE_URL && !/^https?:\/\//i.test(process.env.BASE_URL)) {
  delete process.env.BASE_URL;
}

// Probe the database once per worker so DB-backed suites can gate on
// reachability (see test-support/dbAvailable.ts). Without this they fail
// with connection errors on a checkout that has no MySQL, which reads as
// broken code rather than missing infrastructure.
{
  let reachable = false;
  if (process.env.DATABASE_URL) {
    try {
      const { createConnection } = await import("mysql2/promise");
      const conn = await createConnection({ uri: process.env.DATABASE_URL, connectTimeout: 3000 });
      await conn.query("SELECT 1");
      await conn.end();
      reachable = true;
    } catch {
      reachable = false;
    }
  }
  process.env.__HAS_DATABASE = reachable ? "1" : "0";
}
