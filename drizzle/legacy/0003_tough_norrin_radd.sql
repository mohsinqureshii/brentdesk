CREATE TABLE IF NOT EXISTS `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`tagline` text,
	`description` text,
	`logo` text,
	`website` text,
	`linkedIn` text,
	`twitter` text,
	`location` varchar(255),
	`regionId` int,
	`industry` varchar(100),
	`sectorId` int,
	`stage` enum('pre_seed','seed','series_a','series_b','series_c','series_d_plus','public','acquired'),
	`foundedYear` int,
	`employeeCount` varchar(50),
	`totalFunding` varchar(100),
	`isVerified` boolean DEFAULT false,
	`isFeatured` boolean DEFAULT false,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`claimedByUserId` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_regions` (
	`companyId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_sectors` (
	`companyId` int NOT NULL,
	`sectorId` int NOT NULL
);
