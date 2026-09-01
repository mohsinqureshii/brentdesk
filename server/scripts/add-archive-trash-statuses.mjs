import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function addStatuses() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Check existing statuses
    const [existingStatuses] = await connection.execute(
      'SELECT slug FROM workflow_statuses WHERE workflowType = ?',
      ['editorial']
    );
    const existingSlugs = existingStatuses.map(s => s.slug);
    console.log('Existing statuses:', existingSlugs);
    
    // Get max order
    const [maxOrderResult] = await connection.execute(
      'SELECT MAX(sortOrder) as maxOrder FROM workflow_statuses WHERE workflowType = ?',
      ['editorial']
    );
    let nextOrder = (maxOrderResult[0].maxOrder || 0) + 1;
    
    // Add archived status if not exists
    if (!existingSlugs.includes('archived')) {
      await connection.execute(
        `INSERT INTO workflow_statuses (workflowType, slug, name, description, color, sortOrder, isInitial, isFinal, isPublished, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        ['editorial', 'archived', 'Archived', 'Content that has been archived and is no longer publicly visible', '#6B7280', nextOrder++, false, true, false]
      );
      console.log('Added "archived" status');
    } else {
      console.log('"archived" status already exists');
    }
    
    // Add trash status if not exists
    if (!existingSlugs.includes('trash')) {
      await connection.execute(
        `INSERT INTO workflow_statuses (workflowType, slug, name, description, color, sortOrder, isInitial, isFinal, isPublished, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        ['editorial', 'trash', 'Trash', 'Content moved to trash, can be restored or permanently deleted', '#EF4444', nextOrder++, false, true, false]
      );
      console.log('Added "trash" status');
    } else {
      console.log('"trash" status already exists');
    }
    
    // Verify all statuses
    const [allStatuses] = await connection.execute(
      'SELECT id, slug, name, color, sortOrder FROM workflow_statuses WHERE workflowType = ? ORDER BY sortOrder',
      ['editorial']
    );
    console.log('\\nAll editorial statuses:');
    allStatuses.forEach(s => {
      console.log(`  ${s.id}: ${s.slug} (${s.name}) - ${s.color}`);
    });
    
  } finally {
    await connection.end();
  }
}

addStatuses().catch(console.error);
