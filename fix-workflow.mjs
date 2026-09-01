import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function fixWorkflow() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Fix the slug format (use underscore instead of hyphen)
  await connection.execute(`UPDATE workflow_statuses SET slug = 'editor_review' WHERE slug = 'editor-review'`);
  await connection.execute(`UPDATE workflow_statuses SET slug = 'senior_editor_review' WHERE slug = 'senior-editor-review'`);
  
  // Delete duplicate statuses with high IDs
  await connection.execute(`DELETE FROM workflow_statuses WHERE id > 1000`);
  
  // Get updated statuses
  const [statuses] = await connection.execute('SELECT id, name, slug FROM workflow_statuses ORDER BY sortOrder');
  const statusMap = new Map(statuses.map(s => [s.slug, s.id]));
  
  console.log('Status map:', Object.fromEntries(statusMap));
  
  // Clear existing transitions and add all
  await connection.execute('DELETE FROM workflow_transitions');
  
  // Define all transitions
  const transitions = [
    { from: 'draft', to: 'submitted', name: 'Submit for Review', allowedRoles: ['author', 'editor', 'admin', 'senior_editor'] },
    { from: 'submitted', to: 'editor_review', name: 'Start Editor Review', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'submitted', to: 'draft', name: 'Request Changes', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'submitted', to: 'rejected', name: 'Reject', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'submitted', to: 'approved', name: 'Quick Approve', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'editor_review', to: 'senior_editor_review', name: 'Escalate to Senior Editor', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'editor_review', to: 'approved', name: 'Approve', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'editor_review', to: 'draft', name: 'Request Changes', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'editor_review', to: 'rejected', name: 'Reject', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'senior_editor_review', to: 'approved', name: 'Approve', allowedRoles: ['senior_editor', 'admin'] },
    { from: 'senior_editor_review', to: 'draft', name: 'Request Changes', allowedRoles: ['senior_editor', 'admin'], requiresComment: true },
    { from: 'senior_editor_review', to: 'rejected', name: 'Reject', allowedRoles: ['senior_editor', 'admin'], requiresComment: true },
    { from: 'approved', to: 'published', name: 'Publish Now', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'rejected', to: 'draft', name: 'Revise and Restart', allowedRoles: ['author', 'editor', 'admin'] },
  ];
  
  // Insert transitions
  for (const t of transitions) {
    const fromId = statusMap.get(t.from);
    const toId = statusMap.get(t.to);
    
    if (!fromId || !toId) {
      console.log(`Skipping transition ${t.from} -> ${t.to}: missing status (from=${fromId}, to=${toId})`);
      continue;
    }
    
    await connection.execute(
      `INSERT INTO workflow_transitions (workflowType, fromStatusId, toStatusId, name, allowedRoles, requiresComment, notifyRoles) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['editorial', fromId, toId, t.name, JSON.stringify(t.allowedRoles), t.requiresComment ? 1 : 0, JSON.stringify([])]
    );
    console.log(`Added transition: ${t.from} -> ${t.to} (${t.name})`);
  }
  
  // Verify
  const [finalTransitions] = await connection.execute('SELECT id, name, fromStatusId, toStatusId FROM workflow_transitions');
  console.log('\nFinal transitions:');
  finalTransitions.forEach(t => console.log(`  ${t.id}: ${t.name} (${t.fromStatusId} -> ${t.toStatusId})`));
  
  await connection.end();
}

fixWorkflow().catch(console.error);
