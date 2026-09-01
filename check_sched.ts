import mysql from "mysql2/promise";

async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await c.query(
    "SELECT id, SUBSTRING(title, 1, 55) as title, statusId, DATE_FORMAT(publishedAt, '%Y-%m-%d %H:%i') as pub_utc, DATE_FORMAT(scheduledAt, '%Y-%m-%d %H:%i') as sched_utc FROM articles WHERE id >= 540006 AND id <= 540013 ORDER BY publishedAt"
  );
  console.table(rows);
  await c.end();
}
main().catch(console.error);
