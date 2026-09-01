import { getDb } from "./server/db.ts";
import { jobs } from "./drizzle/schema.ts";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

// Check total jobs
const allJobs = await db.select({ 
  id: jobs.id, 
  title: jobs.title,
  expiresAt: jobs.expiresAt,
  statusId: jobs.statusId
}).from(jobs);

console.log("Total jobs in database:", allJobs.length);
console.log("Jobs:");
allJobs.forEach(job => {
  console.log(`  ID: ${job.id}, Title: ${job.title}, Expires: ${job.expiresAt}, StatusId: ${job.statusId}`);
});

process.exit(0);
