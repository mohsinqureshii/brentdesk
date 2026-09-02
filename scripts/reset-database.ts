/**
 * Destructive: drops every table in the target database.
 *
 * For repointing an existing MySQL service at BrentDesk when it still
 * holds another publication's content. Dropping rather than truncating is
 * deliberate — the old schema carries tables from a migration history
 * BrentDesk no longer has, so truncating would leave the database a
 * mixture of two lineages. After this runs the database is empty, and the
 * next server boot applies the BrentDesk baseline and (with
 * SEED_ON_BOOT=1) seeds the system data.
 *
 * There is no undo. Take a backup first — on Railway, the MySQL service's
 * Data tab, or `mysqldump` against the public proxy URL.
 *
 * Guarded twice: it refuses to run unless CONFIRM_RESET matches the name
 * of the database the connection string actually points at, so a stale
 * DATABASE_URL in a shell cannot take out the wrong database.
 *
 * Run: CONFIRM_RESET=<database name> pnpm reset-db
 *      CONFIRM_RESET=<database name> node dist/reset.js
 */

import mysql from "mysql2/promise";

/** Tables whose row counts are worth showing before they are destroyed. */
const REPORT_TABLES = [
  "articles",
  "companies",
  "people",
  "events",
  "jobs",
  "investors",
  "users",
  "newsletter_subscriptions",
];

export async function runReset(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName) throw new Error(`DATABASE_URL has no database name: ${url.replace(/:[^:@]*@/, ":***@")}`);

  const confirm = process.env.CONFIRM_RESET;
  if (confirm !== dbName) {
    throw new Error(
      `Refusing to drop anything.\n` +
        `  This would destroy every table in the database "${dbName}".\n` +
        `  Re-run with CONFIRM_RESET=${dbName} if that is what you want.`,
    );
  }

  const conn = await mysql.createConnection(url);
  try {
    const [tableRows] = await conn.query<any[]>(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?`,
      [dbName],
    );
    const tables: string[] = tableRows.map(r => r.name ?? r.NAME ?? r.table_name);

    if (tables.length === 0) {
      console.log(`[reset] "${dbName}" is already empty — nothing to drop`);
      return;
    }

    console.log(`[reset] database "${dbName}" — ${tables.length} tables`);
    for (const t of REPORT_TABLES) {
      if (!tables.includes(t)) continue;
      const [c] = await conn.query<any[]>(`SELECT COUNT(*) AS n FROM \`${t}\``);
      console.log(`[reset]   ${t}: ${c[0].n} rows`);
    }

    // Foreign keys make drop order matter; disabling the check for the
    // duration is simpler and safer than topologically sorting 230 tables.
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    try {
      for (const t of tables) {
        await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
      }
    } finally {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    const [after] = await conn.query<any[]>(
      `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?`,
      [dbName],
    );
    const remaining = Number(after[0].n);
    if (remaining !== 0) {
      throw new Error(`${remaining} tables survived the drop — check for views or permissions`);
    }
    console.log(`[reset] dropped ${tables.length} tables — "${dbName}" is now empty`);
    console.log(`[reset] next boot will apply the BrentDesk baseline; set SEED_ON_BOOT=1 to seed system data`);
  } finally {
    await conn.end();
  }
}
