ALTER TABLE `keywords` DROP INDEX `keywords_slug_unique`;--> statement-breakpoint
ALTER TABLE `keywords` MODIFY COLUMN `slug` varchar(255);--> statement-breakpoint
ALTER TABLE `keywords` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `keywords` ADD `sortOrder` int DEFAULT 0;