import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seedTransitions() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check if transitions already exist
  const [existingTransitions] = await connection.execute('SELECT COUNT(*) as count FROM workflow_transitions');
  if (existingTransitions[0].count > 0) {
    console.log('Transitions already exist, skipping seed');
    await connection.end();
    return;
  }
  
  // Get all workflow statuses
  const [statuses] = await connection.execute('SELECT id, slug FROM workflow_statuses');
  const statusMap = new Map(statuses.map(s => [s.slug, s.id]));
  
  console.log('Status map:', Object.fromEntries(statusMap));
  
  // Define transitions
  const transitions = [
    { from: 'draft', to: 'submitted', name: 'Submit for Review', allowedRoles: ['author', 'editor', 'admin', 'senior_editor'], notifyRoles: ['editor'] },
    { from: 'submitted', to: 'editor_review', name: 'Start Editor Review', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'submitted', to: 'draft', name: 'Request Changes', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'submitted', to: 'rejected', name: 'Reject', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'editor_review', to: 'senior_editor_review', name: 'Escalate to Senior Editor', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'editor_review', to: 'approved', name: 'Approve', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'editor_review', to: 'draft', name: 'Request Changes', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'editor_review', to: 'rejected', name: 'Reject', allowedRoles: ['editor', 'senior_editor', 'admin'], requiresComment: true },
    { from: 'senior_editor_review', to: 'approved', name: 'Approve', allowedRoles: ['senior_editor', 'admin'] },
    { from: 'senior_editor_review', to: 'draft', name: 'Request Changes', allowedRoles: ['senior_editor', 'admin'], requiresComment: true },
    { from: 'senior_editor_review', to: 'rejected', name: 'Reject', allowedRoles: ['senior_editor', 'admin'], requiresComment: true },
    { from: 'approved', to: 'scheduled', name: 'Schedule Publication', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'approved', to: 'published', name: 'Publish Now', allowedRoles: ['editor', 'senior_editor', 'admin'] },
    { from: 'scheduled', to: 'published', name: 'Publish', allowedRoles: ['editor', 'senior_editor', 'admin', 'system'] },
    { from: 'rejected', to: 'draft', name: 'Revise and Restart', allowedRoles: ['author', 'editor', 'admin'] },
  ];
  
  // Insert transitions
  for (const t of transitions) {
    const fromId = statusMap.get(t.from);
    const toId = statusMap.get(t.to);
    
    if (!fromId || !toId) {
      console.log(`Skipping transition ${t.from} -> ${t.to}: missing status`);
      continue;
    }
    
    await connection.execute(
      `INSERT INTO workflow_transitions (workflowType, fromStatusId, toStatusId, name, allowedRoles, requiresComment, notifyRoles) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['editorial', fromId, toId, t.name, JSON.stringify(t.allowedRoles), t.requiresComment ? 1 : 0, JSON.stringify(t.notifyRoles || [])]
    );
    console.log(`Added transition: ${t.from} -> ${t.to} (${t.name})`);
  }
  
  console.log('Transitions seeded successfully');
  await connection.end();
}

seedTransitions().catch(console.error);
