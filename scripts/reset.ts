/**
 * CLI entry point for the destructive database reset. See
 * scripts/reset-database.ts for what it does and how it is guarded.
 */

import "dotenv/config";
import { runReset } from "./reset-database";

runReset()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(`[reset] ${err.message}`);
    process.exit(1);
  });
