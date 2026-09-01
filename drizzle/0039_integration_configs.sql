CREATE TABLE IF NOT EXISTS `integration_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `integration_id` varchar(64) NOT NULL,
  `enabled` tinyint DEFAULT 0 NOT NULL,
  `public_config` json,
  `secrets` text,
  `status` enum('unconfigured','configured','error') DEFAULT 'unconfigured' NOT NULL,
  `last_tested_at` timestamp NULL,
  `last_test_result` text,
  `created_by_id` int,
  `updated_by_id` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `integration_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `integration_configs_integration_id_unique` UNIQUE(`integration_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_integration_configs_integration_id` ON `integration_configs` (`integration_id`);
--> statement-breakpoint
CREATE INDEX `idx_integration_configs_enabled` ON `integration_configs` (`enabled`);
