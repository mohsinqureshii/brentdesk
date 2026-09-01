CREATE TABLE IF NOT EXISTS `integration_configs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`integration_id` varchar(64) NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 0,
	`public_config` json,
	`secrets` text,
	`status` enum('unconfigured','configured','error') NOT NULL DEFAULT 'unconfigured',
	`last_tested_at` timestamp,
	`last_test_result` text,
	`created_by_id` int,
	`updated_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_integration_configs_integration_id` ON `integration_configs` (`integration_id`);--> statement-breakpoint
CREATE INDEX `idx_integration_configs_enabled` ON `integration_configs` (`enabled`);