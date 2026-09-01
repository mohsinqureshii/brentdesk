import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, workflowStatuses, companies } from "./drizzle/schema";
import { eq, inArray, like, or } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  const admins = await db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.role, ['admin', 'author', 'editor', 'senior_editor']));
  console.log("USERS:", JSON.stringify(admins));
  
  const statuses = await db.select({ id: workflowStatuses.id, name: workflowStatuses.name, slug: workflowStatuses.slug, isPublished: workflowStatuses.isPublished })
    .from(workflowStatuses)
    .where(eq(workflowStatuses.workflowType, 'news'));
  console.log("STATUSES:", JSON.stringify(statuses));
  
  const comps = await db.select({ id: companies.id, name: companies.name, slug: companies.slug })
    .from(companies)
    .where(or(
      like(companies.name, '%Qureos%'),
      like(companies.name, '%Viero%'),
      like(companies.name, '%HAQQ%'),
      like(companies.name, '%Daleel%'),
      like(companies.name, '%Mersal%'),
      like(companies.name, '%MUHIDE%'),
      like(companies.name, '%Alefredo%')
    ));
  console.log("COMPANIES:", JSON.stringify(comps));
  
  await connection.end();
}
main().catch(console.error);
