#!/usr/bin/env node
/**
 * Module Boundary Check
 * ----------------------------------------------------------------------
 * Fails (exit 1) if any file outside `server/modules/<x>/` imports from
 * the internals of module `<x>`. The only public surface is the
 * module's `index.ts`.
 *
 * Why: when we extract a module to its own service (HTTP/gRPC), the
 * `index.ts` becomes the client SDK. Cross-module imports that bypass
 * the index break that extraction silently. This check makes them
 * fail loudly in CI.
 *
 * Run:
 *   node scripts/check-module-boundaries.mjs
 *
 * Add new modules to MODULES below as they get a boundary.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Modules whose internals are off-limits to outside callers. Internals
// = anything except `index.ts`.
const MODULES = [
  {
    name: "jobs",
    moduleDir: "server/modules/jobs",
    // Patterns that match imports of internals. Anything matching ONE
    // of these from a file OUTSIDE moduleDir is a boundary violation.
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/jobs\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/jobs\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/jobs\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/jobs\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/jobs\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "candidates",
    moduleDir: "server/modules/candidates",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/candidates\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/candidates\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/candidates\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/candidates\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/candidates\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "assessments",
    moduleDir: "server/modules/assessments",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/assessments\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/assessments\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/assessments\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/assessments\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/assessments\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "github",
    moduleDir: "server/modules/github",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/github\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/github\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/github\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/github\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/github\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "ats",
    moduleDir: "server/modules/ats",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/ats\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/ats\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/ats\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/ats\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/ats\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "matching",
    moduleDir: "server/modules/matching",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/matching\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/matching\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/matching\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/matching\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/matching\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "tenants",
    moduleDir: "server/modules/tenants",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/tenants\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/tenants\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/tenants\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/tenants\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/tenants\/(?!index["'])[^"']+["']/,
    ],
  },
  {
    name: "compliance",
    moduleDir: "server/modules/compliance",
    forbiddenPatterns: [
      /from\s+["']\.\.\/modules\/compliance\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/modules\/compliance\/(?!index["'])[^"']+["']/,
      /from\s+["']\.\.\/\.\.\/\.\.\/modules\/compliance\/(?!index["'])[^"']+["']/,
      /from\s+["']server\/modules\/compliance\/(?!index["'])[^"']+["']/,
      /from\s+["']@\/server\/modules\/compliance\/(?!index["'])[^"']+["']/,
    ],
  },
];

// File globs to scan. Skip node_modules, dist, build artifacts.
const SCAN_DIRS = ["server", "client", "drizzle", "scripts"];

const violations = [];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build" || entry.name === ".next") continue;
      out.push(...(await walk(full)));
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...(await walk(path.join(ROOT, dir))));
  }

  for (const mod of MODULES) {
    const moduleAbsDir = path.join(ROOT, mod.moduleDir);
    for (const file of allFiles) {
      // Skip files inside the module itself — internal imports are fine.
      if (file.startsWith(moduleAbsDir + path.sep)) continue;

      let content;
      try {
        content = await fs.readFile(file, "utf8");
      } catch {
        continue;
      }

      for (const re of mod.forbiddenPatterns) {
        const match = content.match(re);
        if (match) {
          violations.push({
            module: mod.name,
            file: path.relative(ROOT, file),
            line: content.slice(0, match.index ?? 0).split("\n").length,
            snippet: match[0],
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("\nModule boundary violations:\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    module: ${v.module}`);
      console.error(`    found:  ${v.snippet}`);
      console.error("    fix:    import from `server/modules/" + v.module + "` (the index)\n");
    }
    process.exit(1);
  }

  console.log("Module boundaries OK — " + MODULES.length + " module(s) checked, no violations.");
}

main().catch((err) => {
  console.error("Boundary check failed:", err);
  process.exit(1);
});
