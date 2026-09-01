import { db } from "../server/db";
import { homepageSections } from "../drizzle/schema";

async function main() {
  const sections = await db.select().from(homepageSections);
  console.log("Homepage Sections:");
  sections.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Position: ${s.position}, CategoryId: ${s.categoryId}`);
  });
  process.exit(0);
}
main();
