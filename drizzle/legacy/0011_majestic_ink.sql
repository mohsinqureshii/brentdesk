ALTER TABLE `funding_round_investors` ADD `investmentAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `funding_round_investors` ADD `investmentCurrency` varchar(10) DEFAULT 'USD';