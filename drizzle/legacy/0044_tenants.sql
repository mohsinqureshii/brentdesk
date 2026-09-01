-- Talent Platform Phase 1a — multi-tenancy foundation
-- ----------------------------------------------------------------------
-- Adds three tables and two FK columns so the existing platform can host
-- multiple SaaS tenants without forking the schema:
--
--   tenants                 one row per customer (techscoop.io legacy
--                           public job board has no row — tenantId IS
--                           NULL on jobs / job_applications)
--   tenant_memberships      users ↔ tenants with a tenant-scoped role
--   tenant_audit_log        per-tenant audit trail (separate from the
--                           global audit_logs to prevent cross-tenant
--                           leakage in tenant-admin dashboards)
--
-- And:
--   jobs.tenant_id          nullable; index on (tenant_id, status_id,
--                           published_at) for tenant-scoped listings
--   job_applications.tenant_id  nullable; index on (tenant_id) for
--                           tenant-scoped recruiter queries

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `custom_domain` varchar(255) NULL,
  `plan` enum('free','starter','growth','enterprise') NOT NULL DEFAULT 'free',
  `status` enum('trial','active','suspended','cancelled') NOT NULL DEFAULT 'trial',
  `settings` json NULL,
  `data_residency` enum('us','eu','ksa') NOT NULL DEFAULT 'us',
  `branding_logo_url` text NULL,
  `branding_primary_color` varchar(16) NULL,
  `trial_ends_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_slug_unique` (`slug`),
  UNIQUE KEY `tenants_custom_domain_unique` (`custom_domain`),
  KEY `idx_tenants_status` (`status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `tenant_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('owner','recruiter','hiring_manager','interviewer','viewer') NOT NULL DEFAULT 'recruiter',
  `status` enum('invited','active','suspended','left') NOT NULL DEFAULT 'active',
  `invited_by_id` int NULL,
  `invited_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `joined_at` timestamp NULL,
  `last_active_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_memberships_unique` (`tenant_id`, `user_id`),
  KEY `idx_tm_user` (`user_id`),
  KEY `idx_tm_tenant_status` (`tenant_id`, `status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `tenant_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NULL,
  `action` varchar(64) NOT NULL,
  `resource_type` varchar(64) NULL,
  `resource_id` int NULL,
  `changes` json NULL,
  `ip_address` varchar(45) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tal_tenant_created` (`tenant_id`, `created_at`)
);
--> statement-breakpoint

ALTER TABLE `jobs` ADD COLUMN `tenant_id` int NULL AFTER `id`;
--> statement-breakpoint

ALTER TABLE `jobs` ADD KEY `idx_jobs_tenant_status_published` (`tenant_id`, `statusId`, `publishedAt`);
--> statement-breakpoint

ALTER TABLE `job_applications` ADD COLUMN `tenant_id` int NULL AFTER `id`;
--> statement-breakpoint

ALTER TABLE `job_applications` ADD KEY `idx_job_apps_tenant` (`tenant_id`);
