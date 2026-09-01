/**
 * Fix Job Expiration Dates
 * Updates all expired jobs to have future expiration dates (90 days from now)
 */

import { getDb } from "../server/db";
import { jobs } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function fixJobExpiration() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  try {
    // Calculate 90 days from now
    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    console.log(`📅 Current time: ${now.toISOString()}`);
    console.log(`📅 New expiration date: ${futureDate.toISOString()}`);

    // Update all jobs with expired or null expiresAt to have future expiration
    const result = await db.update(jobs)
      .set({ 
        expiresAt: futureDate
      })
      .where(
        sql`${jobs.expiresAt} IS NULL OR ${jobs.expiresAt} < NOW()`
      );

    console.log(`✅ Updated job expiration dates`);

    // Verify the update
    const allJobs = await db.select({
      id: jobs.id,
      title: jobs.title,
      expiresAt: jobs.expiresAt
    }).from(jobs);

    const expiredCount = allJobs.filter(j => {
      if (!j.expiresAt) return false;
      return new Date(j.expiresAt) < now;
    }).length;

    const validCount = allJobs.filter(j => {
      if (!j.expiresAt) return false;
      return new Date(j.expiresAt) >= now;
    }).length;

    console.log(`\n📊 Job Status:`);
    console.log(`   Total jobs: ${allJobs.length}`);
    console.log(`   Valid (not expired): ${validCount}`);
    console.log(`   Expired: ${expiredCount}`);

    if (expiredCount === 0) {
      console.log(`\n✅ All jobs now have future expiration dates!`);
    } else {
      console.log(`\n⚠️  ${expiredCount} jobs still have past expiration dates`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating jobs:", error);
    process.exit(1);
  }
}

fixJobExpiration();
