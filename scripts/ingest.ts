/**
 * CLI entry point for editorial ingestion.
 *
 * With no arguments it publishes the archive bundled at dist/articles.json,
 * which is what a deployed container has. With file arguments it publishes
 * those, which is what a local run against content/articles/*.json does.
 *
 * Run: pnpm ingest content/articles/*.json
 *      node dist/ingest.js
 */

import "dotenv/config";
import { runIngest } from "./ingest-articles";

runIngest(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(`[ingest] ${err.message}`);
    process.exit(1);
  });
