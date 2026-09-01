import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function addMissingStatuses() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check current statuses
  const [statuses] = await connection.execute('SELECT id, name, slug FROM workflow_statuses ORDER BY sortOrder');
  const existingSlugs = new Set(statuses.map(s => s.slug));
  
  console.log('Existing statuses:', Array.from(existingSlugs));
  
  // Define all required statuses
  const requiredStatuses = [
    { name: 'Draft', slug: 'draft', sortOrder: 1, color: '#6B7280', isInitial: true },
    { name: 'Submitted', slug: 'submitted', sortOrder: 2, color: '#3B82F6' },
    { name: 'Editor Review', slug: 'editor_review', sortOrder: 3, color: '#F59E0B' },
    { name: 'Senior Editor Review', slug: 'senior_editor_review', sortOrder: 4, color: '#8B5CF6' },
    { name: 'Approved', slug: 'approved', sortOrder: 5, color: '#10B981' },
    { name: 'Scheduled', slug: 'scheduled', sortOrder: 6, color: '#06B6D4' },
    { name: 'Published', slug: 'published', sortOrder: 7, color: '#22C55E', isFinal: true, isPublished: true },
    { name: 'Rejected', slug: 'rejected', sortOrder: 8, color: '#EF4444', isFinal: true },
  ];
  
  // Add missing statuses
  for (const status of requiredStatuses) {
    if (!existingSlugs.has(status.slug)) {
      await connection.execute(
        `INSERT INTO workflow_statuses (name, slug, sortOrder, color, workflowType, isInitial, isFinal, isPublished) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [status.name, status.slug, status.sortOrder, status.color, 'editorial', status.isInitial ? 1 : 0, status.isFinal ? 1 : 0, status.isPublished ? 1 : 0]
      );
      console.log(`Added status: ${status.slug}`);
    }
  }
  
  // Get updated statuses
  const [updatedStatuses] = await connection.execute('SELECT id, name, slug FROM workflow_statuses ORDER BY sortOrder');
  console.log('\nUpdated statuses:');
  updatedStatuses.forEach(s => console.log(`  ${s.id}: ${s.slug} (${s.name})`));
  
  await connection.end();
}

addMissingStatuses().catch(console.error);
