CREATE TABLE IF NOT EXISTS `article_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`keywordId` int NOT NULL,
	`keywordType` enum('focus','additional') DEFAULT 'additional',
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `article_keywords_id` PRIMARY KEY(`id`)
);
