#!/usr/bin/env node
/**
 * Run a .sql file against DATABASE_URL and print the rows as a table.
 *
 * Exists so the preflight can run on a GitHub runner without a mysql
 * client binary. Read-only by convention — it is only ever pointed at the
 * preflight script — and it exits non-zero if any row's second column
 * does not start with "OK", so a failed check fails the job instead of
 * scrolling past in a green log.
 */
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

const file = process.argv[2];
if (!file) {
  console.error("usage: run-sql.mjs <file.sql>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it under Settings -> Secrets and variables -> Actions.");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
try {
  const [results] = await conn.query(sql);
  // mysql2 shapes the result differently depending on the script:
  //   one SELECT              -> [row, row, ...]
  //   several statements      -> [[rows], ResultSetHeader, [rows], ...]
  // Normalise both to a list of row-arrays, and drop the headers that
  // INSERT/UPDATE statements produce. Getting this wrong is dangerous in
  // one specific direction: if no row set is recognised, every check is
  // skipped and the script reports success having verified nothing.
  const isHeader = (v) => v && typeof v === "object" && "affectedRows" in v;
  const isRow = (v) => v && typeof v === "object" && !Array.isArray(v) && !isHeader(v);

  const top = Array.isArray(results) ? results : [results];
  const multi = top.some((entry) => Array.isArray(entry) || isHeader(entry));
  const sets = multi
    ? top.filter((entry) => Array.isArray(entry) && entry.some(isRow))
    : (top.some(isRow) ? [top.filter(isRow)] : []);

  let failed = 0;
  let checked = 0;
  for (const rows of sets) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    console.table(rows);
    for (const row of rows) {
      const values = Object.values(row).map(String);
      const verdict = values[1];
      if (!verdict) continue;
      checked += 1;
      if (!verdict.startsWith("OK")) {
        failed += 1;
        console.error(`FAILED CHECK: ${values[0]} -> ${verdict}`);
      }
    }
  }
  if (checked === 0) {
    console.error("No result rows were returned — nothing was verified. Refusing to report success.");
    process.exit(1);
  }
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Fix these before importing.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
} finally {
  await conn.end();
}
