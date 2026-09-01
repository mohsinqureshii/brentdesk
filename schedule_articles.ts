import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { articles } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // The 8 articles in order
  const articleSlugs = [
    "dubais-qureos-raises-5-million-to-automate-enterprise-hiring-with-ai",
    "saudi-fleet-startup-viero-raises-1-2-million-for-logistics-platform",
    "lebanese-legal-tech-haqq-raises-3-million-to-scale-ai-platform",
    "jordans-alefredo-acquires-uk-tutoring-platform-for-600k",
    "dubai-proptech-daleel-secures-3-million-pre-seed-round",
    "saudi-media-firm-mersal-capital-closes-1-3-million-first-round",
    "saudi-trade-platform-muhide-closes-series-a-backed-by-asyad-group",
    "germany-and-qatar-launch-deep-tech-innovation-hub-in-doha",
  ];

  // Schedule: 08:00, 11:00, 14:00, 17:00, 20:00, 23:00, 02:00+1, 05:00+1
  // Saudi time is UTC+3, so 08:00 AST = 05:00 UTC
  // Today is Feb 7, 2026
  const baseDate = new Date('2026-02-07T05:00:00.000Z'); // 08:00 AST

  const now = new Date();
  console.log("Current UTC time:", now.toISOString());
  console.log("Current Saudi time:", new Date(now.getTime() + 3*60*60*1000).toISOString().replace('T', ' ').slice(0, 19));

  for (let i = 0; i < articleSlugs.length; i++) {
    const slug = articleSlugs[i];
    const publishTime = new Date(baseDate.getTime() + i * 3 * 60 * 60 * 1000);
    const saudiTime = new Date(publishTime.getTime() + 3*60*60*1000);
    
    const isPast = publishTime <= now;
    const statusId = isPast ? 6 : 8; // Published if past, Scheduled if future
    
    await connection.query(
      `UPDATE articles SET publishedAt = ?, scheduledAt = ?, statusId = ?, updatedAt = NOW() WHERE slug = ?`,
      [publishTime, isPast ? null : publishTime, statusId, slug]
    );
    
    console.log(`${isPast ? 'Published' : 'Scheduled'}: ${slug} -> ${saudiTime.toISOString().replace('T', ' ').slice(0, 16)} AST (${publishTime.toISOString().replace('T', ' ').slice(0, 16)} UTC)`);
  }

  console.log("\nDONE: All 8 articles scheduled");
  await connection.end();
}

main().catch(console.error);
