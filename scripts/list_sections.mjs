import { db } from '../server/db.js';
import { homepageSections } from '../drizzle/schema.js';
import { asc } from 'drizzle-orm';

const sections = await db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
console.log('Homepage Sections:');
sections.forEach(s => {
  console.log(`ID: ${s.id}, Name: ${s.name}, Type: ${s.sectionType}, Active: ${s.isActive}, Position: ${s.position}`);
});
process.exit(0);
