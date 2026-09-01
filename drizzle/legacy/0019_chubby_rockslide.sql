CREATE TABLE IF NOT EXISTS `seo_404_monitor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestedUrl` varchar(2048) NOT NULL,
	`hitCount` int NOT NULL DEFAULT 1,
	`lastHitAt` timestamp NOT NULL DEFAULT (now()),
	`firstHitAt` timestamp NOT NULL DEFAULT (now()),
	`referrer` text,
	`userAgent` text,
	`suggestedRedirectUrl` text,
	`suggestedConfidence` int DEFAULT 0,
	`isResolved` boolean DEFAULT false,
	`resolvedRedirectId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_404_monitor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_health_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`pageUrl` text NOT NULL,
	`issueType` varchar(64) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`issueDetails` text,
	`suggestedFix` text,
	`isResolved` boolean DEFAULT false,
	`resolvedAt` timestamp,
	`resolvedById` int,
	`lastCheckedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_health_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_hreflang_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`language` varchar(10) NOT NULL,
	`linkedEntityId` int,
	`linkedUrl` text,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_hreflang_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_indexing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`pageType` varchar(64) NOT NULL,
	`indexingRule` varchar(64) NOT NULL DEFAULT 'index, follow',
	`canonicalRule` varchar(64) NOT NULL DEFAULT 'self',
	`customCanonicalPattern` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_indexing_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` json,
	`settingGroup` varchar(64) DEFAULT 'general',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `seo_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `article_accelerators` ADD `mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') DEFAULT 'mentioned' NOT NULL;--> statement-breakpoint
ALTER TABLE `article_companies` ADD `mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') DEFAULT 'mentioned' NOT NULL;--> statement-breakpoint
ALTER TABLE `article_events` ADD `mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') DEFAULT 'mentioned' NOT NULL;--> statement-breakpoint
ALTER TABLE `article_investors` ADD `mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') DEFAULT 'mentioned' NOT NULL;--> statement-breakpoint
ALTER TABLE `article_people` ADD `mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') DEFAULT 'mentioned' NOT NULL;--> statement-breakpoint
ALTER TABLE `article_accelerators` DROP COLUMN `mention_type`;--> statement-breakpoint
ALTER TABLE `article_companies` DROP COLUMN `mention_type`;--> statement-breakpoint
ALTER TABLE `article_events` DROP COLUMN `mention_type`;--> statement-breakpoint
ALTER TABLE `article_investors` DROP COLUMN `mention_type`;--> statement-breakpoint
ALTER TABLE `article_people` DROP COLUMN `mention_type`;