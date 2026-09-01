CREATE TABLE IF NOT EXISTS `newsletter_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`email` varchar(320) NOT NULL,
	`newsletterId` int NOT NULL,
	`status` enum('subscribed','unsubscribed','bounced') DEFAULT 'subscribed',
	`subscribed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`unsubscribed_at` timestamp,
	`source` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `newsletters` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`slug` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64),
	`frequency` enum('daily','weekly','biweekly','monthly') DEFAULT 'weekly',
	`isActive` tinyint DEFAULT 1,
	`subscriberCount` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_newsletter_subscriptions_email` ON `newsletter_subscriptions` (`email`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_subscriptions_newsletter_id` ON `newsletter_subscriptions` (`newsletterId`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_subscriptions_status` ON `newsletter_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_newsletters_slug` ON `newsletters` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_newsletters_is_active` ON `newsletters` (`isActive`);