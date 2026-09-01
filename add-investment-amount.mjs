import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Check if column exists
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'funding_round_investors' 
      AND COLUMN_NAME = 'investmentAmount'
    `);
    
    if (cols.length === 0) {
      await connection.query(`
        ALTER TABLE funding_round_investors 
        ADD COLUMN investmentAmount DECIMAL(15,2) NULL,
        ADD COLUMN investmentCurrency VARCHAR(10) DEFAULT 'USD'
      `);
      console.log('Added investmentAmount and investmentCurrency columns');
    } else {
      console.log('Columns already exist');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

main();
