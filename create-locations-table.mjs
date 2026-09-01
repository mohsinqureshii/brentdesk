import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Create article_locations table if not exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS article_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      articleId INT NOT NULL,
      country VARCHAR(2) NOT NULL,
      region VARCHAR(10),
      city VARCHAR(255),
      createdById INT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX idx_article_locations_article (articleId),
      INDEX idx_article_locations_country (country)
    )
  `);
  console.log('article_locations table created successfully');
} catch (error) {
  console.error('Error:', error.message);
}

await connection.end();
