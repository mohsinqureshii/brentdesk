ALTER TABLE `articles` ADD COLUMN `event_date` date;
--> statement-breakpoint
ALTER TABLE `articles` ADD COLUMN `source_url` text;
--> statement-breakpoint
ALTER TABLE `articles` ADD COLUMN `source_name` varchar(255);
--> statement-breakpoint
CREATE INDEX `idx_articles_event_date` ON `articles` (`event_date`);
