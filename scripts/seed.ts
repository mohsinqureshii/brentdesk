/**
 * CLI entry point for the BrentDesk bootstrap seed.
 *
 * Kept separate from scripts/seed-brentdesk.ts so that module stays free of
 * side effects and can be imported by the server (SEED_ON_BOOT=1) without
 * self-executing when it is bundled into dist/index.js.
 *
 * Run: pnpm seed          (source, via tsx)
 *      node dist/seed.js  (production bundle, no dev dependencies needed)
 */

import "dotenv/config";
import { runSeed } from "./seed-brentdesk";
import { describeError } from "./cliError";

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[seed] ${describeError(err)}`);
    process.exit(1);
  });
