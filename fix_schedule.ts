import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // The DB stores as UTC. Saudi time is UTC+3.
  // We want: 08:00 AST = 05:00 UTC, 11:00 AST = 08:00 UTC, etc.
  // But the scheduler already published articles 1 & 2 (status 6).
  // The DB shows pub_utc = 00:00 for article 1, meaning it was stored as midnight UTC.
  // The DB connection might be applying a timezone offset.
  // Let's use explicit UTC strings to be safe.

  const schedule = [
    { id: 540006, utc: "2026-02-07 05:00:00" },  // 08:00 AST
    { id: 540007, utc: "2026-02-07 08:00:00" },  // 11:00 AST
    { id: 540008, utc: "2026-02-07 11:00:00" },  // 14:00 AST
    { id: 540009, utc: "2026-02-07 14:00:00" },  // 17:00 AST
    { id: 540010, utc: "2026-02-07 17:00:00" },  // 20:00 AST
    { id: 540011, utc: "2026-02-07 20:00:00" },  // 23:00 AST
    { id: 540012, utc: "2026-02-07 23:00:00" },  // 02:00 AST next day
    { id: 540013, utc: "2026-02-08 02:00:00" },  // 05:00 AST next day
  ];

  const now = new Date();
  const nowUtcStr = now.toISOString().replace("T", " ").slice(0, 19);
  console.log("Current UTC:", nowUtcStr);
  console.log("Current Saudi (UTC+3):", new Date(now.getTime() + 3*3600000).toISOString().replace("T", " ").slice(0, 19));

  for (const s of schedule) {
    const isPast = new Date(s.utc + "Z") <= now;
    const statusId = isPast ? 6 : 8;
    const scheduledAt = isPast ? null : s.utc;

    await connection.query(
      "UPDATE articles SET publishedAt = ?, scheduledAt = ?, statusId = ?, updatedAt = NOW() WHERE id = ?",
      [s.utc, scheduledAt, statusId, s.id]
    );

    const astHour = (parseInt(s.utc.slice(11, 13)) + 3) % 24;
    const astTime = `${String(astHour).padStart(2, "0")}:${s.utc.slice(14, 16)}`;
    console.log(`${isPast ? "Published" : "Scheduled"}: ID ${s.id} -> ${s.utc} UTC (${astTime} AST) [status=${statusId}]`);
  }

  // Verify
  const [rows] = await connection.query(
    "SELECT id, SUBSTRING(title, 1, 45) as title, statusId, DATE_FORMAT(publishedAt, '%Y-%m-%d %H:%i') as pub_utc, DATE_FORMAT(scheduledAt, '%Y-%m-%d %H:%i') as sched_utc FROM articles WHERE id >= 540006 AND id <= 540013 ORDER BY publishedAt"
  );
  console.log("\nVerification:");
  console.table(rows);

  await connection.end();
  console.log("\nDONE: Schedule corrected");
}

main().catch(console.error);
