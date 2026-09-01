import mysql from "mysql2/promise";
async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await c.query("SELECT id, name, slug, workflowType FROM workflow_statuses WHERE slug IN ('scheduled', 'published') ORDER BY id");
  console.table(rows);
  await c.end();
}
main().catch(console.error);
