import { createConnection } from "mysql2/promise";

async function bulkPublishAll() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  try {
    // Get the published status ID
    const [statuses] = await conn.execute(`SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1`);
    const publishedStatusId = statuses[0]?.id || 6;
    console.log(`Published status ID: ${publishedStatusId}`);

    // Publish all draft people
    const [peopleResult] = await conn.execute(
      `UPDATE people SET statusId = ? WHERE statusId != ?`,
      [publishedStatusId, publishedStatusId]
    );
    console.log(`Published ${peopleResult.affectedRows} people`);

    // Publish all draft investors
    const [investorsResult] = await conn.execute(
      `UPDATE investors SET statusId = ? WHERE statusId != ?`,
      [publishedStatusId, publishedStatusId]
    );
    console.log(`Published ${investorsResult.affectedRows} investors`);

    // Publish all draft companies
    const [companiesResult] = await conn.execute(
      `UPDATE companies SET statusId = ? WHERE statusId != ?`,
      [publishedStatusId, publishedStatusId]
    );
    console.log(`Published ${companiesResult.affectedRows} companies`);

    // Publish all draft accelerators (if statusId column exists)
    try {
      const [acceleratorsResult] = await conn.execute(
        `UPDATE accelerators SET statusId = ? WHERE statusId != ?`,
        [publishedStatusId, publishedStatusId]
      );
      console.log(`Published ${acceleratorsResult.affectedRows} accelerators`);
    } catch (e) {
      console.log(`Accelerators table may not have statusId column: ${e.message}`);
    }

    // Publish all draft events (if statusId column exists)
    try {
      const [eventsResult] = await conn.execute(
        `UPDATE events SET statusId = ? WHERE statusId != ?`,
        [publishedStatusId, publishedStatusId]
      );
      console.log(`Published ${eventsResult.affectedRows} events`);
    } catch (e) {
      console.log(`Events table may not have statusId column: ${e.message}`);
    }

    // Publish all draft resources (if statusId column exists)
    try {
      const [resourcesResult] = await conn.execute(
        `UPDATE resources SET statusId = ? WHERE statusId != ?`,
        [publishedStatusId, publishedStatusId]
      );
      console.log(`Published ${resourcesResult.affectedRows} resources`);
    } catch (e) {
      console.log(`Resources table may not have statusId column: ${e.message}`);
    }

    // Publish all draft jobs (if statusId column exists)
    try {
      const [jobsResult] = await conn.execute(
        `UPDATE jobs SET statusId = ? WHERE statusId != ?`,
        [publishedStatusId, publishedStatusId]
      );
      console.log(`Published ${jobsResult.affectedRows} jobs`);
    } catch (e) {
      console.log(`Jobs table may not have statusId column: ${e.message}`);
    }

    // Publish all draft research (if statusId column exists)
    try {
      const [researchResult] = await conn.execute(
        `UPDATE research SET statusId = ? WHERE statusId != ?`,
        [publishedStatusId, publishedStatusId]
      );
      console.log(`Published ${researchResult.affectedRows} research items`);
    } catch (e) {
      console.log(`Research table may not have statusId column: ${e.message}`);
    }

    console.log("\\nAll content published successfully!");
    
    // Show summary
    const [summary] = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM people WHERE statusId = ?) as people,
        (SELECT COUNT(*) FROM investors WHERE statusId = ?) as investors,
        (SELECT COUNT(*) FROM companies WHERE statusId = ?) as companies,
        (SELECT COUNT(*) FROM accelerators WHERE statusId = ?) as accelerators,
        (SELECT COUNT(*) FROM events WHERE statusId = ?) as events,
        (SELECT COUNT(*) FROM resources WHERE statusId = ?) as resources,
        (SELECT COUNT(*) FROM jobs WHERE statusId = ?) as jobs,
        (SELECT COUNT(*) FROM research WHERE statusId = ?) as research
    `, [publishedStatusId, publishedStatusId, publishedStatusId, publishedStatusId, publishedStatusId, publishedStatusId, publishedStatusId, publishedStatusId]);
    
    console.log("\\nPublished content summary:");
    console.log(summary[0]);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await conn.end();
  }
}

bulkPublishAll();
