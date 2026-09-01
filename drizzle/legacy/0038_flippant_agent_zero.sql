CREATE TABLE IF NOT EXISTS `form_submissions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`form_type` varchar(64) NOT NULL,
	`email` varchar(320),
	`name` varchar(255),
	`payload` json NOT NULL,
	`status` enum('new','in_review','replied','archived','spam') NOT NULL DEFAULT 'new',
	`notes` text,
	`ip_hash` varchar(64),
	`user_agent` varchar(512),
	`source` varchar(128),
	`notified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_form_submissions_form_type` ON `form_submissions` (`form_type`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_status` ON `form_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_created_at` ON `form_submissions` (`created_at`);