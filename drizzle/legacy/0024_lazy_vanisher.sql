CREATE TABLE IF NOT EXISTS `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentType` varchar(32) NOT NULL,
	`contentId` int NOT NULL,
	`contentTitle` varchar(500),
	`contentSlug` varchar(500),
	`contentCategory` varchar(128),
	`contentImageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_digest_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`frequency` enum('daily','weekly','none') NOT NULL DEFAULT 'none',
	`categories` json,
	`includeJobs` boolean DEFAULT true,
	`includeEvents` boolean DEFAULT true,
	`includeNews` boolean DEFAULT true,
	`includeRecommendations` boolean DEFAULT true,
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_digest_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `isEditorPick` boolean DEFAULT false;