-- TechScoop Database Initialization
-- This script runs on first container startup

-- Set character encoding
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create indexes for performance
-- These will be created after Drizzle migrations run

-- Grant permissions
GRANT ALL PRIVILEGES ON techscoop.* TO 'techscoop'@'%';
FLUSH PRIVILEGES;

-- Log initialization
SELECT 'TechScoop database initialized successfully' AS status;
