import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.query(`
    SELECT id, title, statusId, publishedAt, scheduledAt 
    FROM articles 
    WHERE id >= 540006 AND id <= 540013
    ORDER BY id
  `);
  console.log("Current UTC:", new Date().toISOString());
  console.log("Articles status:");
  for (const r of rows as any[]) {
    console.log(`  ID ${r.id}: status=${r.statusId}, publishedAt=${r.publishedAt?.toISOString()}, scheduledAt=${r.scheduledAt?.toISOString()}, title=${r.title.substring(0, 60)}`);
  }
  await connection.end();
}
main().catch(console.error);
