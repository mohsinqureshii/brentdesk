CREATE TABLE IF NOT EXISTS `article_categories` (
	`articleId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_regions` (
	`articleId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_related_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `article_related_entities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_sectors` (
	`articleId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_tags` (
	`articleId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_topics` (
	`articleId` int NOT NULL,
	`topicId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`excerpt` text,
	`content` text,
	`featuredImageId` int,
	`authorId` int NOT NULL,
	`statusId` int NOT NULL,
	`isFeatured` boolean DEFAULT false,
	`isTrending` boolean DEFAULT false,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`scheduledAt` timestamp,
	`wpOriginalId` int,
	`wpOriginalUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parentId` int,
	`module` enum('news','jobs','events','resources','research') NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientUserId` int,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(64) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`status` enum('pending','sent','failed') DEFAULT 'pending',
	`sentAt` timestamp,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entity_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`version` int NOT NULL,
	`data` json NOT NULL,
	`changedFields` json,
	`changedByUserId` int,
	`changeReason` text,
	`suggestedUpdateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entity_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_categories` (
	`eventId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_regions` (
	`eventId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`speaker` varchar(255),
	`location` varchar(255),
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `event_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_sectors` (
	`eventId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`shortDescription` text,
	`type` enum('conference','webinar','meetup','workshop','hackathon','summit','other') NOT NULL,
	`format` enum('in_person','virtual','hybrid') DEFAULT 'in_person',
	`featuredImage` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`timezone` varchar(64) DEFAULT 'UTC',
	`venue` varchar(255),
	`address` text,
	`city` varchar(128),
	`country` varchar(128),
	`virtualUrl` text,
	`registrationUrl` text,
	`ticketPrice` decimal(10,2),
	`ticketCurrency` varchar(3) DEFAULT 'USD',
	`isFree` boolean DEFAULT false,
	`organizerName` varchar(255),
	`organizerEmail` varchar(320),
	`organizerWebsite` text,
	`isFeatured` boolean DEFAULT false,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `homepage_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255),
	`subtitle` text,
	`config` json,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_blocks_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investor_regions` (
	`investorId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investor_sectors` (
	`investorId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`type` enum('vc','angel','corporate_vc','family_office','accelerator','other') NOT NULL,
	`description` text,
	`shortDescription` text,
	`logo` text,
	`website` text,
	`linkedIn` text,
	`twitter` text,
	`email` varchar(320),
	`headquarters` varchar(255),
	`foundedYear` int,
	`teamSize` varchar(64),
	`aum` varchar(128),
	`checkSizeMin` decimal(15,2),
	`checkSizeMax` decimal(15,2),
	`checkSizeCurrency` varchar(3) DEFAULT 'USD',
	`investmentStages` json,
	`portfolioCount` int,
	`isVerified` boolean DEFAULT false,
	`claimedByUserId` int,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investors_id` PRIMARY KEY(`id`),
	CONSTRAINT `investors_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_categories` (
	`jobId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_regions` (
	`jobId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_sectors` (
	`jobId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`requirements` text,
	`benefits` text,
	`companyName` varchar(255) NOT NULL,
	`companyLogo` text,
	`companyWebsite` text,
	`location` varchar(255),
	`isRemote` boolean DEFAULT false,
	`remoteType` enum('fully_remote','hybrid','on_site') DEFAULT 'on_site',
	`roleType` enum('full_time','part_time','contract','internship','freelance') DEFAULT 'full_time',
	`seniority` enum('entry','mid','senior','lead','executive'),
	`salaryMin` decimal(12,2),
	`salaryMax` decimal(12,2),
	`salaryCurrency` varchar(3) DEFAULT 'USD',
	`salaryPeriod` enum('hourly','monthly','yearly') DEFAULT 'yearly',
	`applyUrl` text,
	`applyEmail` varchar(320),
	`statusId` int NOT NULL,
	`expiresAt` timestamp,
	`publishedAt` timestamp,
	`viewCount` int DEFAULT 0,
	`applicationCount` int DEFAULT 0,
	`postedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`size` bigint NOT NULL,
	`url` text NOT NULL,
	`s3Key` varchar(512),
	`alt` varchar(255),
	`caption` text,
	`width` int,
	`height` int,
	`uploadedById` int,
	`folder` varchar(255) DEFAULT '/',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(255),
	`company` varchar(255),
	`bio` text,
	`shortBio` text,
	`avatar` text,
	`email` varchar(320),
	`linkedIn` text,
	`twitter` text,
	`website` text,
	`isVerified` boolean DEFAULT false,
	`claimedByUserId` int,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `people_id` PRIMARY KEY(`id`),
	CONSTRAINT `people_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people_regions` (
	`personId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people_sectors` (
	`personId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `popups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`title` varchar(255),
	`content` text,
	`imageId` int,
	`ctaText` varchar(128),
	`ctaUrl` text,
	`type` enum('popup','banner','toast','slide_in') DEFAULT 'popup',
	`position` enum('center','top','bottom','top_left','top_right','bottom_left','bottom_right') DEFAULT 'center',
	`triggerType` enum('immediate','delay','scroll','exit_intent') DEFAULT 'immediate',
	`triggerValue` int,
	`frequencyCap` enum('always','once','once_per_day','once_per_week','once_per_session') DEFAULT 'once_per_day',
	`pageTargeting` json,
	`isActive` boolean DEFAULT true,
	`startDate` timestamp,
	`endDate` timestamp,
	`viewCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `popups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profile_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`claimantUserId` int,
	`claimantName` varchar(255) NOT NULL,
	`claimantEmail` varchar(320) NOT NULL,
	`claimantRole` varchar(255),
	`proofLinks` json,
	`proofDocumentId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderatorId` int,
	`moderatorNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profile_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `redirects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromPath` varchar(768) NOT NULL,
	`toPath` varchar(768) NOT NULL,
	`statusCode` int NOT NULL DEFAULT 301,
	`isActive` boolean DEFAULT true,
	`hitCount` int DEFAULT 0,
	`lastHitAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `redirects_id` PRIMARY KEY(`id`),
	CONSTRAINT `redirects_fromPath_unique` UNIQUE(`fromPath`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`code` varchar(10),
	`parentId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`abstract` text,
	`content` text,
	`type` enum('report','deep_dive','dataset','whitepaper','analysis','other') NOT NULL,
	`featuredImage` text,
	`pdfUrl` text,
	`authorId` int,
	`isPremium` boolean DEFAULT false,
	`price` decimal(10,2),
	`priceCurrency` varchar(3) DEFAULT 'USD',
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`downloadCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchId` int NOT NULL,
	`mediaId` int NOT NULL,
	`title` varchar(255),
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `research_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_categories` (
	`researchId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_regions` (
	`researchId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_sectors` (
	`researchId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_tags` (
	`researchId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_categories` (
	`resourceId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_regions` (
	`resourceId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_sectors` (
	`resourceId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_tags` (
	`resourceId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`shortDescription` text,
	`type` enum('template','toolkit','perk','regulation','tool','playbook','program','grant','other') NOT NULL,
	`content` text,
	`featuredImage` text,
	`downloadUrl` text,
	`externalUrl` text,
	`provider` varchar(255),
	`providerLogo` text,
	`providerWebsite` text,
	`value` varchar(128),
	`eligibility` text,
	`expiresAt` timestamp,
	`isFeatured` boolean DEFAULT false,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`downloadCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(255),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sectors_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`ogTitle` varchar(255),
	`ogDescription` text,
	`ogImage` text,
	`canonicalUrl` text,
	`robotsDirective` varchar(64) DEFAULT 'index,follow',
	`structuredDataOverride` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_meta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` json,
	`type` varchar(32) DEFAULT 'string',
	`group` varchar(64) DEFAULT 'general',
	`label` varchar(255),
	`description` text,
	`isPublic` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `suggested_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`submitterUserId` int,
	`submitterName` varchar(255),
	`submitterEmail` varchar(320),
	`proposedChanges` json NOT NULL,
	`reason` text,
	`evidenceLinks` json,
	`evidenceDocumentId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderatorId` int,
	`moderatorNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suggested_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `topics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`fromStatusId` int,
	`toStatusId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6B7280',
	`sortOrder` int DEFAULT 0,
	`workflowType` varchar(64) NOT NULL,
	`isInitial` boolean DEFAULT false,
	`isFinal` boolean DEFAULT false,
	`isPublished` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_transitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowType` varchar(64) NOT NULL,
	`fromStatusId` int NOT NULL,
	`toStatusId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`allowedRoles` json NOT NULL,
	`requiresComment` boolean DEFAULT false,
	`notifyRoles` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wp_migration_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wpPostId` int NOT NULL,
	`wpPostType` varchar(64) NOT NULL,
	`wpUrl` text NOT NULL,
	`newEntityType` varchar(64) NOT NULL,
	`newEntityId` int NOT NULL,
	`newUrl` text NOT NULL,
	`status` enum('success','redirect_created','failed') DEFAULT 'success',
	`notes` text,
	`migratedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wp_migration_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','editor','senior_editor','author','moderator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;