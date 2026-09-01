import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.log('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

const [companies] = await conn.execute(
  'SELECT c.id, c.name, c.statusId, ws.name as statusName, ws.slug as statusSlug FROM companies c LEFT JOIN workflow_statuses ws ON c.statusId = ws.id ORDER BY c.id DESC LIMIT 20'
);
console.log('=== COMPANIES ===');
companies.forEach(c => console.log(`  ${c.id}: ${c.name} | status: ${c.statusId} (${c.statusName} / ${c.statusSlug})`));

const [jobs] = await conn.execute(
  'SELECT j.id, j.title, j.statusId, ws.name as statusName, ws.slug as statusSlug FROM jobs j LEFT JOIN workflow_statuses ws ON j.statusId = ws.id ORDER BY j.id DESC LIMIT 20'
);
console.log('\n=== JOBS ===');
jobs.forEach(j => console.log(`  ${j.id}: ${j.title} | status: ${j.statusId} (${j.statusName} / ${j.statusSlug})`));

const [statuses] = await conn.execute('SELECT id, name, slug, workflowType, isPublished FROM workflow_statuses ORDER BY id');
console.log('\n=== WORKFLOW STATUSES ===');
statuses.forEach(s => console.log(`  ${s.id}: ${s.name} (${s.slug}) type=${s.workflowType} published=${s.isPublished}`));

await conn.end();
