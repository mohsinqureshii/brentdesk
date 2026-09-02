CREATE TABLE `locales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(12) NOT NULL,
	`name` varchar(64) NOT NULL,
	`native_name` varchar(64) NOT NULL,
	`direction` enum('ltr','rtl') NOT NULL DEFAULT 'ltr',
	`flag_emoji` varchar(8),
	`is_default` tinyint NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`translation_mode` enum('auto','manual_ai','manual_write') NOT NULL DEFAULT 'manual_ai',
	`provider` varchar(32),
	`model` varchar(64),
	`glossary` json,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locales_id` PRIMARY KEY(`id`),
	CONSTRAINT `locales_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `idx_locales_active_sort` ON `locales` (`is_active`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `content_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`locale` varchar(12) NOT NULL,
	`field` varchar(64) NOT NULL,
	`value` mediumtext NOT NULL,
	`source` enum('ai','human','imported') NOT NULL DEFAULT 'ai',
	`status` enum('draft','published','stale') NOT NULL DEFAULT 'draft',
	`model` varchar(64),
	`source_hash` char(64),
	`translated_at` timestamp,
	`reviewed_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_translations_entity_locale_field_unique` UNIQUE(`entity_type`,`entity_id`,`locale`,`field`)
);
--> statement-breakpoint
CREATE INDEX `idx_content_translations_lookup` ON `content_translations` (`entity_type`,`entity_id`,`locale`);
--> statement-breakpoint
CREATE INDEX `idx_content_translations_locale_status` ON `content_translations` (`locale`,`status`);
--> statement-breakpoint
CREATE TABLE `translation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`locale` varchar(12) NOT NULL,
	`status` enum('queued','running','done','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`error` text,
	`requested_by_id` int,
	`started_at` timestamp,
	`finished_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translation_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `translation_jobs_entity_locale_unique` UNIQUE(`entity_type`,`entity_id`,`locale`)
);
--> statement-breakpoint
CREATE INDEX `idx_translation_jobs_status` ON `translation_jobs` (`status`,`created_at`);
