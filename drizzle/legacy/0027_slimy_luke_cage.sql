CREATE TABLE IF NOT EXISTS `claim_review_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewerName` varchar(255),
	`action` enum('submitted','under_review','needs_clarification','approved','rejected') NOT NULL,
	`comment` text,
	`fromStatus` varchar(64),
	`toStatus` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `claim_review_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `claimed_profiles` MODIFY COLUMN `status` enum('pending','under_review','needs_clarification','approved','rejected') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `claimed_profiles` ADD `proofText` text;--> statement-breakpoint
ALTER TABLE `claimed_profiles` ADD `companyEmail` varchar(320);