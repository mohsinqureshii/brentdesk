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
