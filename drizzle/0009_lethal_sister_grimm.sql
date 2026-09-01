CREATE TABLE IF NOT EXISTS `article_accelerators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`acceleratorId` int NOT NULL,
	`mention_type` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_accelerators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`companyId` int NOT NULL,
	`mention_type` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`eventId` int NOT NULL,
	`mention_type` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`investorId` int NOT NULL,
	`mention_type` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_investors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`personId` int NOT NULL,
	`mention_type` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`geoRegionId` int,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`iso2` varchar(2) NOT NULL,
	`iso3` varchar(3) NOT NULL,
	`dialCode` varchar(10),
	`currency` varchar(3),
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_iso2_unique` UNIQUE(`iso2`),
	CONSTRAINT `countries_iso3_unique` UNIQUE(`iso3`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `funding_round_investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundingRoundId` int NOT NULL,
	`investorId` int NOT NULL,
	`role` enum('lead','participant') NOT NULL DEFAULT 'participant',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `funding_round_investors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `funding_rounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`companyId` int NOT NULL,
	`roundType` enum('pre_seed','seed','series_a','series_b','series_c','series_d_plus','bridge','strategic','venture_debt','grant','undisclosed') NOT NULL,
	`amountRaised` decimal(15,2),
	`currency` varchar(3) DEFAULT 'USD',
	`isUndisclosed` boolean DEFAULT false,
	`leadInvestorId` int,
	`valuationPre` decimal(15,2),
	`valuationPost` decimal(15,2),
	`valuationCurrency` varchar(3) DEFAULT 'USD',
	`isValuationUndisclosed` boolean DEFAULT true,
	`fundingDate` timestamp NOT NULL,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`sourceUrls` json,
	`proofDocumentId` int,
	`notes` text,
	`status` enum('confirmed','pending','disputed') NOT NULL DEFAULT 'pending',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `funding_rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geo_regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(10),
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geo_regions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accelerators` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `addressLine` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `coverageCountryId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `coverageGeoRegionId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `coverageCityId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `hasFundingEvent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `companies` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `addressLine` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `companies` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `events` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `addressLine` text;--> statement-breakpoint
ALTER TABLE `events` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `events` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `investors` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `investors` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `investors` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `investors` ADD `addressLine` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `people` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `people` ADD `countryId` int;--> statement-breakpoint
ALTER TABLE `people` ADD `geoRegionId` int;--> statement-breakpoint
ALTER TABLE `people` ADD `cityId` int;