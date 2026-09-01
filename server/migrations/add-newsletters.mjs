import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const queries = [
  `CREATE TABLE IF NOT EXISTS newsletters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'weekly',
    isActive TINYINT DEFAULT 1,
    subscriberCount INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_newsletters_slug (slug),
    INDEX idx_newsletters_is_active (isActive)
  )`,
  
  `CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    newsletterId INT NOT NULL,
    status ENUM('subscribed', 'unsubscribed', 'bounced') DEFAULT 'subscribed',
    subscribedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribedAt TIMESTAMP NULL,
    source VARCHAR(128),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_newsletter_subscriptions_email (email),
    INDEX idx_newsletter_subscriptions_newsletter_id (newsletterId),
    INDEX idx_newsletter_subscriptions_status (status),
    FOREIGN KEY (newsletterId) REFERENCES newsletters(id) ON DELETE CASCADE
  )`,
  
  `INSERT IGNORE INTO newsletters (slug, name, description, category, frequency, isActive) VALUES
    ('daily', 'Daily News Digest', 'Get the latest tech news from MENA delivered to your inbox every morning', 'news', 'daily', 1),
    ('weekly', 'Weekly Roundup', 'Your weekly digest of the most important tech stories and updates', 'news', 'weekly', 1),
    ('funding', 'Funding & VC News', 'Track funding announcements, VC news, and investment opportunities', 'funding', 'weekly', 1),
    ('jobs', 'Tech Jobs', 'Discover the latest tech job opportunities across MENA', 'jobs', 'weekly', 1)`,
];

try {
  for (const query of queries) {
    console.log(`Executing: ${query.substring(0, 80)}...`);
    await connection.execute(query);
    console.log('✓ Success');
  }
  console.log('\n✓ All migrations completed successfully');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
