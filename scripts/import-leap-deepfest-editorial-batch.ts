#!/usr/bin/env tsx
import path from "node:path";
const args = new Set(process.argv.slice(2));
const manifestArg = process.argv.find((value) => value.startsWith("--manifest="));
const manifestPath = manifestArg
  ? path.resolve(manifestArg.slice("--manifest=".length))
  : path.resolve("content/leap-deepfest-2026/final/import-manifest.json");
const execute = args.has("--execute");
const confirmedDraftOnly = args.has("--confirm-unpublished-drafts");

// The service module loads the shared environment contract. Dry-run validation
// never reaches getDb(), so use non-connecting placeholders only when callers
// have not supplied real values. Execution still requires real backend config.
if (!execute) {
  process.env.JWT_SECRET ||= "editorial-validation-only";
  process.env.DATABASE_URL ||= "mysql://validation-only.invalid:3306/validation";
}

const { importEditorialBatch, loadEditorialBatchManifest } = await import("../server/services/editorialBatchImport.service");

if (execute && !confirmedDraftOnly) {
  throw new Error("Execution requires --confirm-unpublished-drafts. This importer must never publish articles.");
}

const manifest = await loadEditorialBatchManifest(manifestPath);
const report = await importEditorialBatch(manifest, {
  dryRun: !execute,
  createMissingTaxonomy: !args.has("--no-create-taxonomy"),
  createMissingEntities: !args.has("--no-create-entities"),
});

console.log(JSON.stringify(report, null, 2));

// Exit explicitly. The shared db module holds an open mysql2 pool, which
// keeps the event loop alive long after the work is done — the first
// production run finished in 13m30s and then sat idle until the job's
// 45-minute cap cancelled it, which reads like a failed import when the
// data had in fact been committed half an hour earlier.
process.exit(report.valid ? 0 : 1);
