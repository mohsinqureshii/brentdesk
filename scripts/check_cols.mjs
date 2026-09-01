import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(url);
const [rows] = await connection.execute(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'homepage_sections' ORDER BY ORDINAL_POSITION"
);
console.log('Column names in homepage_sections:');
rows.forEach(r => console.log(r.COLUMN_NAME));
await connection.end();
