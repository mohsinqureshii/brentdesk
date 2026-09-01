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
