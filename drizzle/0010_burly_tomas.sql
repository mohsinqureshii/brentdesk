CREATE TABLE IF NOT EXISTS `article_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`country` varchar(2) NOT NULL,
	`region` varchar(10),
	`city` varchar(255),
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_locations_id` PRIMARY KEY(`id`)
);
