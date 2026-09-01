DROP TABLE `topics`;--> statement-breakpoint
ALTER TABLE `keywords` ADD `keywordType` enum('primary','secondary') DEFAULT 'secondary' NOT NULL;--> statement-breakpoint
ALTER TABLE `keywords` ADD `category` varchar(128);--> statement-breakpoint
ALTER TABLE `keywords` ADD `usageCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tags` ADD `tagType` enum('product_tech','regulation','deal_business','sector','region','hub_program','investor','company','event','general') DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `tags` ADD `isActive` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `tags` ADD `sortOrder` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tags` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `keywords` ADD CONSTRAINT `keywords_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `keywords` DROP COLUMN `parentId`;