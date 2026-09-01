import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [users] = await conn.query("SELECT id, name, role FROM users WHERE role IN ('admin', 'author', 'editor', 'senior_editor') ORDER BY id LIMIT 20");
console.log("USERS:", JSON.stringify(users, null, 2));

const [statuses] = await conn.query("SELECT id, name, slug, isPublished FROM workflow_statuses WHERE workflowType = 'news' ORDER BY sortOrder");
console.log("STATUSES:", JSON.stringify(statuses, null, 2));

const [companies] = await conn.query("SELECT id, name, slug FROM companies LIMIT 10");
console.log("COMPANIES:", JSON.stringify(companies, null, 2));

await conn.end();
