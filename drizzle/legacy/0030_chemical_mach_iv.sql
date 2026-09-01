CREATE TABLE IF NOT EXISTS `entity_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('person','company','accelerator','event','investor') NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255) NOT NULL,
	`userId` int,
	`invitedEmail` varchar(320) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`invitedByName` varchar(255),
	`role` enum('admin','editor','viewer') NOT NULL DEFAULT 'editor',
	`status` enum('pending','accepted','declined','revoked') NOT NULL DEFAULT 'pending',
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entity_team_members_id` PRIMARY KEY(`id`)
);
