/**
 * Merges content/articles/*.json into dist/articles.json.
 *
 * The runtime image ships only dist/, so the source article directory is
 * absent in a deployed container. Bundling the archive alongside the server
 * lets a deploy publish it without any assumption about the filesystem.
 *
 * Run: pnpm tsx scripts/bundle-articles.ts
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const SRC = path.resolve(import.meta.dirname, "..", "content", "articles");
const OUT = path.resolve(import.meta.dirname, "..", "dist", "articles.json");

let files: string[] = [];
try {
  files = readdirSync(SRC).filter(f => f.endsWith(".json")).sort();
} catch {
  console.log("[bundle] no content/articles directory — writing an empty archive");
}

const all: any[] = [];
for (const f of files) {
  const parsed = JSON.parse(readFileSync(path.join(SRC, f), "utf8"));
  all.push(...(Array.isArray(parsed) ? parsed : [parsed]));
}
all.sort((a, b) => (a.commission ?? 0) - (b.commission ?? 0));

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(all));
console.log(`[bundle] ${all.length} articles -> dist/articles.json`);
