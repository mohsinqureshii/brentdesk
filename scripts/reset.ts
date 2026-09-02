/**
 * CLI entry point for the destructive database reset. See
 * scripts/reset-database.ts for what it does and how it is guarded.
 */

import "dotenv/config";
import { runReset } from "./reset-database";
import { describeError } from "./cliError";

runReset()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(`[reset] ${describeError(err)}`);
    process.exit(1);
  });
