import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkStatuses() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const [statuses] = await connection.execute('SELECT id, name, slug FROM workflow_statuses ORDER BY sortOrder');
  console.log('Current statuses:');
  statuses.forEach(s => console.log(`  ${s.id}: ${s.slug} (${s.name})`));
  
  const [transitions] = await connection.execute('SELECT id, name, fromStatusId, toStatusId FROM workflow_transitions');
  console.log('\nCurrent transitions:');
  transitions.forEach(t => console.log(`  ${t.id}: ${t.name} (${t.fromStatusId} -> ${t.toStatusId})`));
  
  await connection.end();
}

checkStatuses().catch(console.error);
