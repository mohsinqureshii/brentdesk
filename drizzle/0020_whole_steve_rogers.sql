ALTER TABLE `profile_claims` ADD `requesterType` enum('internal','external') DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_claims` ADD `source` varchar(64) DEFAULT 'public_form';--> statement-breakpoint
ALTER TABLE `suggested_updates` ADD `requesterType` enum('internal','external') DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE `suggested_updates` ADD `source` varchar(64) DEFAULT 'public_form';