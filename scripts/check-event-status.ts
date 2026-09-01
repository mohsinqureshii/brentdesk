import { getDb } from "../server/db";
import { events, workflowStatuses } from "../drizzle/schema";
import { eq, like, desc } from "drizzle-orm";

async function main() {
  const database = await getDb();
  if (!database) {
    console.error("Database not available");
    process.exit(1);
  }

  // Get all events with Web Summit
  const eventResults = await database
    .select({
      id: events.id,
      title: events.title,
      statusId: events.statusId,
    })
    .from(events)
    .where(like(events.title, "%Web Summit%"))
    .orderBy(desc(events.id))
    .limit(5);

  console.log("Events with Web Summit:");
  console.log(JSON.stringify(eventResults, null, 2));

  // Get all editorial workflow statuses
  const statuses = await database
    .select()
    .from(workflowStatuses)
    .where(eq(workflowStatuses.workflowType, "editorial"));

  console.log("\nEditorial workflow statuses:");
  console.log(JSON.stringify(statuses, null, 2));

  // Check which status the event has
  if (eventResults.length > 0) {
    const eventStatusId = eventResults[0].statusId;
    const matchingStatus = statuses.find((s) => s.id === eventStatusId);
    console.log("\nEvent status:");
    console.log(JSON.stringify(matchingStatus, null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
