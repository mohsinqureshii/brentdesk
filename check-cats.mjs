import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await conn.query('SHOW COLUMNS FROM categories');
console.log('Columns:', cols.map(c => c.Field));
const [cats] = await conn.query('SELECT * FROM categories');
console.log('Categories:', cats);
await conn.end();
