ALTER TABLE `articles` ADD `robotsIndexing` enum('index','noindex') DEFAULT 'index';--> statement-breakpoint
ALTER TABLE `articles` ADD `ogImageId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `ogTitle` varchar(512);--> statement-breakpoint
ALTER TABLE `articles` ADD `ogDescription` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `articleType` enum('news','opinion','press_release','report','interview') DEFAULT 'news' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `googleNewsKeywords` text;