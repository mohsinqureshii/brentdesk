CREATE TABLE IF NOT EXISTS `keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keywords_id` PRIMARY KEY(`id`),
	CONSTRAINT `keywords_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `focusKeywordId` int;