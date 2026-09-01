ALTER TABLE `articles` ADD `isFlash` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `articles` ADD `flashExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `articles` ADD `flashDurationHours` int;