import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { workflowStatuses, people, tags } from "./drizzle/schema";
import { eq, inArray, like, or } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  // Get all workflow statuses
  const statuses = await db.select().from(workflowStatuses);
  console.log("ALL STATUSES:", JSON.stringify(statuses));
  
  // Get relevant people
  const relevantPeople = await db.select({ id: people.id, name: people.name, slug: people.slug })
    .from(people)
    .where(or(
      like(people.name, '%Qureos%'),
      like(people.company, '%Qureos%'),
      like(people.company, '%Viero%'),
      like(people.company, '%HAQQ%'),
      like(people.company, '%Daleel%')
    ));
  console.log("PEOPLE:", JSON.stringify(relevantPeople));
  
  // Get relevant tags
  const relevantTags = await db.select({ id: tags.id, name: tags.name, slug: tags.slug, tagType: tags.tagType })
    .from(tags)
    .where(or(
      like(tags.name, '%Seed%'),
      like(tags.name, '%Series A%'),
      like(tags.name, '%Pre-Seed%'),
      like(tags.name, '%Dubai%'),
      like(tags.name, '%Saudi%'),
      like(tags.name, '%Qatar%'),
      like(tags.name, '%Lebanon%'),
      like(tags.name, '%Jordan%'),
      like(tags.name, '%PropTech%'),
      like(tags.name, '%Legal%'),
      like(tags.name, '%Logistics%'),
      like(tags.name, '%EdTech%'),
      like(tags.name, '%Deep Tech%'),
      like(tags.name, '%Web Summit%')
    ));
  console.log("TAGS:", JSON.stringify(relevantTags));
  
  await connection.end();
}
main().catch(console.error);
