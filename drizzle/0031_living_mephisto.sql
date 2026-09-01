ALTER TABLE `accelerators` DROP INDEX `accelerators_slug_unique`;--> statement-breakpoint
ALTER TABLE `ad_slots` DROP INDEX `ad_slots_slotKey_unique`;--> statement-breakpoint
ALTER TABLE `articles` DROP INDEX `articles_slug_unique`;--> statement-breakpoint
ALTER TABLE `calculators` DROP INDEX `calculators_slug_unique`;--> statement-breakpoint
ALTER TABLE `categories` DROP INDEX `categories_slug_unique`;--> statement-breakpoint
ALTER TABLE `companies` DROP INDEX `companies_slug_unique`;--> statement-breakpoint
ALTER TABLE `countries` DROP INDEX `countries_iso2_unique`;--> statement-breakpoint
ALTER TABLE `countries` DROP INDEX `countries_iso3_unique`;--> statement-breakpoint
ALTER TABLE `events` DROP INDEX `events_slug_unique`;--> statement-breakpoint
ALTER TABLE `homepage_blocks` DROP INDEX `homepage_blocks_slug_unique`;--> statement-breakpoint
ALTER TABLE `homepage_sections` DROP INDEX `homepage_sections_slug_unique`;--> statement-breakpoint
ALTER TABLE `investors` DROP INDEX `investors_slug_unique`;--> statement-breakpoint
ALTER TABLE `jobs` DROP INDEX `jobs_slug_unique`;--> statement-breakpoint
ALTER TABLE `keywords` DROP INDEX `keywords_slug_unique`;--> statement-breakpoint
ALTER TABLE `partner_api_keys` DROP INDEX `partner_api_keys_apiKey_unique`;--> statement-breakpoint
ALTER TABLE `partners` DROP INDEX `partners_slug_unique`;--> statement-breakpoint
ALTER TABLE `people` DROP INDEX `people_slug_unique`;--> statement-breakpoint
ALTER TABLE `redirects` DROP INDEX `redirects_fromPath_unique`;--> statement-breakpoint
ALTER TABLE `regions` DROP INDEX `regions_slug_unique`;--> statement-breakpoint
ALTER TABLE `regulations` DROP INDEX `regulations_slug_unique`;--> statement-breakpoint
ALTER TABLE `research` DROP INDEX `research_slug_unique`;--> statement-breakpoint
ALTER TABLE `resources` DROP INDEX `resources_slug_unique`;--> statement-breakpoint
ALTER TABLE `roles` DROP INDEX `roles_name_unique`;--> statement-breakpoint
ALTER TABLE `sectors` DROP INDEX `sectors_slug_unique`;--> statement-breakpoint
ALTER TABLE `seo_audit_history` DROP INDEX `seo_audit_history_auditId_unique`;--> statement-breakpoint
ALTER TABLE `seo_settings` DROP INDEX `seo_settings_settingKey_unique`;--> statement-breakpoint
ALTER TABLE `settings` DROP INDEX `settings_key_unique`;--> statement-breakpoint
ALTER TABLE `starter_packs` DROP INDEX `starter_packs_slug_unique`;--> statement-breakpoint
ALTER TABLE `subscribers` DROP INDEX `subscribers_email_unique`;--> statement-breakpoint
ALTER TABLE `subscription_lists` DROP INDEX `subscription_lists_slug_unique`;--> statement-breakpoint
ALTER TABLE `tags` DROP INDEX `tags_slug_unique`;--> statement-breakpoint
ALTER TABLE `topics` DROP INDEX `topics_slug_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `vendors` DROP INDEX `vendors_slug_unique`;--> statement-breakpoint
ALTER TABLE `writer_profiles` DROP INDEX `writer_profiles_userId_unique`;--> statement-breakpoint
ALTER TABLE `accelerators` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ad_campaigns` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ad_clicks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ad_creatives` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ad_impressions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ad_slots` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `affiliate_clicks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `affiliate_conversions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_accelerators` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_companies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_earnings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_investors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_keywords` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_locations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_people` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `article_related_entities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `articles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `audit_logs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `bookmarks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `browsing_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `calculators` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `categories` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `claim_review_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `claimed_profiles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `companies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `countries` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `deal_redemptions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `email_campaigns` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `email_notifications` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `entity_team_members` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `entity_versions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_gallery` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_highlights` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_schedule` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_side_events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_speakers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_sponsors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `event_tracks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `founder_deals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `funding_round_investors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `funding_rounds` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `gated_downloads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `geo_regions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `homepage_blocks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `homepage_sections` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `investors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `job_applications` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `job_clicks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `jobs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `keywords` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `leads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `media` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partner_api_keys` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partner_payouts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partner_users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partners` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `payout_line_items` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `people` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `permissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `popups` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `profile_claims` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `redirects` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `regions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `regulations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `research` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `research_attachments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `resource_reviews` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `resources` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `role_permissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `roles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sectors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_audit_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_audit_schedule` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_health_issues` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_hreflang_mappings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_indexing_rules` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_meta` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `seo_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `starter_packs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `subscriber_lists` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `subscribers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `subscription_lists` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `suggested_updates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tags` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `topics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_roles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `vendors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `workflow_audit_log` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `workflow_statuses` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `workflow_transitions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `wp_migration_log` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `writer_applications` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `writer_payouts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `writer_profiles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `accelerators` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `accelerators` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `accelerators` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_campaigns` MODIFY COLUMN `startDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_campaigns` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_clicks` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_creatives` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_impressions` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ad_slots` MODIFY COLUMN `isPremium` tinyint;--> statement-breakpoint
ALTER TABLE `ad_slots` MODIFY COLUMN `isPremium` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ad_slots` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `ad_slots` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `affiliate_clicks` MODIFY COLUMN `clickedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `affiliate_conversions` MODIFY COLUMN `convertedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `affiliate_conversions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_accelerators` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_companies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_earnings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_events` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_investors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_locations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `article_people` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isTrending` tinyint;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isTrending` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isEditorPick` tinyint;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isEditorPick` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isFlash` tinyint;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `isFlash` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `hasFundingEvent` tinyint;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `hasFundingEvent` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `bookmarks` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `browsing_history` MODIFY COLUMN `lastViewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `browsing_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `calculators` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `calculators` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `calculators` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `calculators` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `calculators` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `categories` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `categories` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `claim_review_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `claimed_profiles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `countries` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `countries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `deal_redemptions` MODIFY COLUMN `redeemedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `email_campaigns` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` MODIFY COLUMN `includeJobs` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` MODIFY COLUMN `includeEvents` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` MODIFY COLUMN `includeNews` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` MODIFY COLUMN `includeRecommendations` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `email_notifications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `entity_team_members` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `entity_versions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_gallery` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_highlights` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_side_events` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_speakers` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `event_speakers` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `event_speakers` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_sponsors` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `event_tracks` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isFree` tinyint;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isFree` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `founder_deals` MODIFY COLUMN `isExclusive` tinyint;--> statement-breakpoint
ALTER TABLE `founder_deals` MODIFY COLUMN `isExclusive` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `founder_deals` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `founder_deals` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `founder_deals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `funding_round_investors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `funding_rounds` MODIFY COLUMN `isUndisclosed` tinyint;--> statement-breakpoint
ALTER TABLE `funding_rounds` MODIFY COLUMN `isUndisclosed` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `funding_rounds` MODIFY COLUMN `isValuationUndisclosed` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `funding_rounds` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `gated_downloads` MODIFY COLUMN `downloadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `geo_regions` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `geo_regions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `homepage_blocks` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_blocks` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `sectionType` enum('hero','trending','headlines','category','in_brief','podcasts','videos','stocks','sidebar_jobs','sidebar_events','sidebar_links','sidebar_podcast') NOT NULL;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showImage` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showExcerpt` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showDate` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showAuthor` tinyint;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showAuthor` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `showViewMore` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `homepage_sections` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `investors` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `investors` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `investors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `job_applications` MODIFY COLUMN `isViewed` tinyint;--> statement-breakpoint
ALTER TABLE `job_applications` MODIFY COLUMN `isViewed` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `job_applications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `job_clicks` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `isRemote` tinyint;--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `isRemote` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `keywords` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `keywords` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `consentMarketing` tinyint;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `consentMarketing` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `consentPartnerShare` tinyint;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `consentPartnerShare` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `partner_api_keys` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `partner_api_keys` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `partner_payouts` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `partner_users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `partners` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `payout_line_items` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `people` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `people` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `people` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `permissions` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `permissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `popups` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `popups` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `profile_claims` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `redirects` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `redirects` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `regions` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `regions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `regulations` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `regulations` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `regulations` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `regulations` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `research` MODIFY COLUMN `isPremium` tinyint;--> statement-breakpoint
ALTER TABLE `research` MODIFY COLUMN `isPremium` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `research` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `isApproved` tinyint;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `isApproved` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `resource_reviews` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `resources` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `resources` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `role_permissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `sectors` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `sectors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` MODIFY COLUMN `lastHitAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` MODIFY COLUMN `firstHitAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` MODIFY COLUMN `isResolved` tinyint;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` MODIFY COLUMN `isResolved` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `seo_404_monitor` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_audit_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_audit_schedule` MODIFY COLUMN `isEnabled` tinyint;--> statement-breakpoint
ALTER TABLE `seo_audit_schedule` MODIFY COLUMN `isEnabled` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `seo_audit_schedule` MODIFY COLUMN `notifyOnCritical` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `seo_audit_schedule` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_health_issues` MODIFY COLUMN `isResolved` tinyint;--> statement-breakpoint
ALTER TABLE `seo_health_issues` MODIFY COLUMN `isResolved` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `seo_health_issues` MODIFY COLUMN `lastCheckedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_health_issues` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_hreflang_mappings` MODIFY COLUMN `isDefault` tinyint;--> statement-breakpoint
ALTER TABLE `seo_hreflang_mappings` MODIFY COLUMN `isDefault` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `seo_hreflang_mappings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_indexing_rules` MODIFY COLUMN `isEnabled` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `seo_indexing_rules` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_meta` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seo_settings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `settings` MODIFY COLUMN `isPublic` tinyint;--> statement-breakpoint
ALTER TABLE `settings` MODIFY COLUMN `isPublic` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `starter_packs` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `starter_packs` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `starter_packs` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `starter_packs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `subscriber_lists` MODIFY COLUMN `subscribedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `subscribers` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `subscribers` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `subscribers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `subscription_lists` MODIFY COLUMN `isPublic` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `subscription_lists` MODIFY COLUMN `isDefault` tinyint;--> statement-breakpoint
ALTER TABLE `subscription_lists` MODIFY COLUMN `isDefault` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `subscription_lists` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `subscription_lists` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `suggested_updates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `tags` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `tags` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `tags` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `topics` MODIFY COLUMN `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `topics` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `user_roles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isVerified` tinyint;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isPartner` tinyint;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isPartner` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isFeatured` tinyint;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `isFeatured` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `vendors` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `workflow_audit_log` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isInitial` tinyint;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isInitial` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isFinal` tinyint;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isFinal` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isPublished` tinyint;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `isPublished` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflow_statuses` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `workflow_transitions` MODIFY COLUMN `requiresComment` tinyint;--> statement-breakpoint
ALTER TABLE `workflow_transitions` MODIFY COLUMN `requiresComment` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflow_transitions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `wp_migration_log` MODIFY COLUMN `migratedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `writer_applications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `writer_payouts` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `writer_profiles` MODIFY COLUMN `taxFormVerified` tinyint;--> statement-breakpoint
ALTER TABLE `writer_profiles` MODIFY COLUMN `taxFormVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `writer_profiles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `facebook` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `linkedIn` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `twitter` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `alumni_companies` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `batch_count` int;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `success_stories` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `short_description` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `facebook` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `companies` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `companies` ADD `tech_stack` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `key_people` json;--> statement-breakpoint
ALTER TABLE `event_schedule` ADD `speaker` varchar(255);--> statement-breakpoint
ALTER TABLE `investors` ADD `facebook` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `portfolio_companies` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `investment_thesis` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `notable_exits` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `focus_regions` json;--> statement-breakpoint
ALTER TABLE `jobs` ADD `skills` json;--> statement-breakpoint
ALTER TABLE `jobs` ADD `department` varchar(100);--> statement-breakpoint
ALTER TABLE `jobs` ADD `deadline` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `visa_sponsorship` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `people` ADD `functional_strengths` json;--> statement-breakpoint
ALTER TABLE `people` ADD `open_to` json;--> statement-breakpoint
ALTER TABLE `people` ADD `experience` json;--> statement-breakpoint
ALTER TABLE `people` ADD `education` json;--> statement-breakpoint
ALTER TABLE `people` ADD `languages` json;--> statement-breakpoint
ALTER TABLE `people` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `people` ADD `gender` varchar(20);--> statement-breakpoint
ALTER TABLE `people` ADD `nationality` varchar(100);--> statement-breakpoint
ALTER TABLE `resources` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `resources` ADD `affiliateUrl` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `affiliateCommission` decimal(5,2);--> statement-breakpoint
ALTER TABLE `resources` ADD `isGated` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` ADD `gatedFields` json;--> statement-breakpoint
ALTER TABLE `resources` ADD `leadCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` ADD `clickCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` ADD `conversionCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` ADD `pricingModel` varchar(64);--> statement-breakpoint
ALTER TABLE `resources` ADD `targetStage` varchar(64);--> statement-breakpoint
ALTER TABLE `resources` ADD `targetAudience` json;--> statement-breakpoint
ALTER TABLE `resources` ADD `features` json;--> statement-breakpoint
ALTER TABLE `resources` ADD `pros` json;--> statement-breakpoint
ALTER TABLE `resources` ADD `cons` json;--> statement-breakpoint
ALTER TABLE `resources` ADD `rating` decimal(3,2);--> statement-breakpoint
ALTER TABLE `resources` ADD `reviewCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `resources` ADD `sortOrder` int DEFAULT 0;--> statement-breakpoint
CREATE INDEX `accelerators_slug_unique` ON `accelerators` (`slug`);--> statement-breakpoint
CREATE INDEX `ad_slots_slotKey_unique` ON `ad_slots` (`slotKey`);--> statement-breakpoint
CREATE INDEX `idx_article_locations_article` ON `article_locations` (`articleId`);--> statement-breakpoint
CREATE INDEX `idx_article_locations_country` ON `article_locations` (`country`);--> statement-breakpoint
CREATE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_user` ON `bookmarks` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_content` ON `bookmarks` (`contentType`,`contentId`);--> statement-breakpoint
CREATE INDEX `unique_bookmark` ON `bookmarks` (`userId`,`contentType`,`contentId`);--> statement-breakpoint
CREATE INDEX `idx_calculators_type` ON `calculators` (`type`);--> statement-breakpoint
CREATE INDEX `idx_calculators_active` ON `calculators` (`isActive`);--> statement-breakpoint
CREATE INDEX `slug` ON `calculators` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_claimed_userId` ON `claimed_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_claimed_entity` ON `claimed_profiles` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_claimed_status` ON `claimed_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `companies_slug_unique` ON `companies` (`slug`);--> statement-breakpoint
CREATE INDEX `iso2` ON `countries` (`iso2`);--> statement-breakpoint
CREATE INDEX `iso3` ON `countries` (`iso3`);--> statement-breakpoint
CREATE INDEX `unique_user_digest` ON `email_digest_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `homepage_blocks_slug_unique` ON `homepage_blocks` (`slug`);--> statement-breakpoint
CREATE INDEX `homepage_sections_slug_unique` ON `homepage_sections` (`slug`);--> statement-breakpoint
CREATE INDEX `investors_slug_unique` ON `investors` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_app_jobId` ON `job_applications` (`jobId`);--> statement-breakpoint
CREATE INDEX `idx_app_userId` ON `job_applications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_app_status` ON `job_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_click_jobId` ON `job_clicks` (`jobId`);--> statement-breakpoint
CREATE INDEX `idx_click_userId` ON `job_clicks` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_click_type` ON `job_clicks` (`clickType`);--> statement-breakpoint
CREATE INDEX `jobs_slug_unique` ON `jobs` (`slug`);--> statement-breakpoint
CREATE INDEX `partner_api_keys_apiKey_unique` ON `partner_api_keys` (`apiKey`);--> statement-breakpoint
CREATE INDEX `partners_slug_unique` ON `partners` (`slug`);--> statement-breakpoint
CREATE INDEX `people_slug_unique` ON `people` (`slug`);--> statement-breakpoint
CREATE INDEX `redirects_fromPath_unique` ON `redirects` (`fromPath`);--> statement-breakpoint
CREATE INDEX `regions_slug_unique` ON `regions` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_regulations_type` ON `regulations` (`type`);--> statement-breakpoint
CREATE INDEX `idx_regulations_country` ON `regulations` (`country`);--> statement-breakpoint
CREATE INDEX `idx_regulations_status` ON `regulations` (`statusId`);--> statement-breakpoint
CREATE INDEX `slug` ON `regulations` (`slug`);--> statement-breakpoint
CREATE INDEX `research_slug_unique` ON `research` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_resource_reviews_resource` ON `resource_reviews` (`resourceId`);--> statement-breakpoint
CREATE INDEX `idx_resource_reviews_user` ON `resource_reviews` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_resource_reviews_rating` ON `resource_reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `resources_slug_unique` ON `resources` (`slug`);--> statement-breakpoint
CREATE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE INDEX `sectors_slug_unique` ON `sectors` (`slug`);--> statement-breakpoint
CREATE INDEX `auditId` ON `seo_audit_history` (`auditId`);--> statement-breakpoint
CREATE INDEX `seo_settings_key_unique` ON `seo_settings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `starter_packs_slug_unique` ON `starter_packs` (`slug`);--> statement-breakpoint
CREATE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
CREATE INDEX `subscription_lists_slug_unique` ON `subscription_lists` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `topics_slug_unique` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_vendors_category` ON `vendors` (`category`);--> statement-breakpoint
CREATE INDEX `idx_vendors_partner` ON `vendors` (`partnerId`);--> statement-breakpoint
CREATE INDEX `idx_vendors_status` ON `vendors` (`statusId`);--> statement-breakpoint
CREATE INDEX `slug` ON `vendors` (`slug`);--> statement-breakpoint
CREATE INDEX `writer_profiles_userId_unique` ON `writer_profiles` (`userId`);--> statement-breakpoint
ALTER TABLE `topics` DROP COLUMN `updatedAt`;