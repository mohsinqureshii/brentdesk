# Phase 0 — Baseline (commit 429980b "Initial TechScoop upload", 2026-09-01)

Environment: Node 22, pnpm 10 (frozen lockfile OK), local MariaDB + Redis provisioned.

## Results

| Check | Command | Result |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | PASS |
| TypeScript | `tsc --noEmit` | PASS (0 errors) — BUT masked by 1,255 `as any` in server/ (394 on Drizzle `.values()`/`.set()`); `remaining-ts-errors.md` is stale (its 71 errors were "fixed" by the exact `as any` spray the doc recommended) |
| Client build | `vite build` | PASS — main chunk 6,190 kB (1,245 kB gzip); huge stray chunks: mermaid 432k, cytoscape 442k, emacs-lisp 780k, cpp 626k, wasm 622k (streamdown/lowlight pulling full language grammars) |
| Server bundle | `esbuild server/_core/index.ts` | PASS (2.3 MB) |
| Tests (no env) | `vitest run` | 60 failed / 409 passed — most file-level failures = missing JWT_SECRET |
| Tests (env set, empty DB) | `vitest run` + JWT_SECRET/DATABASE_URL/REDIS_URL | 140 failed / 550 passed (690 total, 42 files, 17 failed files) |

## Inherited issues found at baseline

1. `server/admin/aiContent.test.ts` is truncated — "Unexpected end of file" at line 62; the file cannot even be parsed.
2. tinyint↔boolean boundary is real and untested-for: workflow/events tests assert `true`/`false` but receive `1`/`0`.
3. Tests are environment-coupled: many require JWT_SECRET at import time (`server/_core/env.ts` throws), a live DB, or a running seeded HTTP server (server/seo-fixes.test.ts).
4. `seo-fixes.test.ts` asserts TechScoop-branded titles ("Title | TechScoop") — brand-coupled tests.
5. Both `package-lock.json` and `pnpm-lock.yaml` are committed (package manager ambiguity).
6. Client bundle is not code-split: 6.2 MB main chunk.
