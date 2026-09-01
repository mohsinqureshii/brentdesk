CREATE TABLE IF NOT EXISTS `company_awards` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`year` int,
	`organization` varchar(255),
	`description` text,
	`image` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_products` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`description` text,
	`screenshots` json,
	`demo_video` text,
	`pricing_model` varchar(100),
	`integrations` json,
	`clients` json,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_updates` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`type` enum('text','image','milestone','event','product_launch') DEFAULT 'text',
	`title` varchar(255),
	`content` text,
	`image` text,
	`link` text,
	`likes_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `mission` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `vision` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `problem_solved` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `market_served` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `cover_image` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `brand_color` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `active_users_range` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `arr_range` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `countries_served` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `clients_count` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `notable_customers` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `partnerships` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `media_kit` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `logo_pack` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `boilerplate` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `pr_contact_email` varchar(320);--> statement-breakpoint
ALTER TABLE `companies` ADD `app_store_link` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `play_store_link` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `youtube` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `timeline` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `certifications` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `pitch_deck` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `whitepapers` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `case_studies` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `hiring_actively` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `companies` ADD `verification_level` varchar(50) DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE `companies` ADD `profile_completeness` int DEFAULT 20;--> statement-breakpoint
ALTER TABLE `companies` ADD `last_updated_by` varchar(50) DEFAULT 'system';--> statement-breakpoint
ALTER TABLE `companies` ADD `data_source` varchar(50) DEFAULT 'editorial';--> statement-breakpoint
CREATE INDEX `idx_company_awards_company` ON `company_awards` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_products_company` ON `company_products` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_updates_company` ON `company_updates` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_updates_created` ON `company_updates` (`created_at`);