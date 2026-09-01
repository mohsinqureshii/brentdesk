ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `publicName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `authorBio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `twitterHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);