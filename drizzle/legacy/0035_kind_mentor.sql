CREATE TABLE IF NOT EXISTS `accelerator_alumni_companies` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`cohort_id` int,
	`company_name` varchar(255) NOT NULL,
	`sector` varchar(100),
	`description` text,
	`country` varchar(100),
	`city` varchar(100),
	`logo` text,
	`website` text,
	`funding_raised` varchar(100),
	`funding_stage` varchar(50),
	`employee_count` int,
	`founded_year` int,
	`founder_name` varchar(255),
	`is_active` tinyint DEFAULT 1,
	`linkedin_url` text,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_benefits` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`category` varchar(100),
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`value` varchar(100),
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_cohorts` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`cohort_number` int NOT NULL,
	`name` varchar(255),
	`year` int NOT NULL,
	`start_date` varchar(50),
	`end_date` varchar(50),
	`demo_day_date` varchar(50),
	`cohort_size` int,
	`applications_received` int,
	`acceptance_rate` varchar(20),
	`status` enum('completed','active','upcoming') DEFAULT 'completed',
	`theme` varchar(255),
	`highlights` text,
	`total_funding_raised` varchar(100),
	`jobs_created` int,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_deck_submissions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`user_id` int,
	`program_id` int,
	`company_name` varchar(255) NOT NULL,
	`contact_name` varchar(255) NOT NULL,
	`contact_email` varchar(320) NOT NULL,
	`file_url` text NOT NULL,
	`message` text,
	`status` enum('pending','reviewed','accepted','rejected') DEFAULT 'pending',
	`submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_faqs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(100),
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_milestones` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`date` varchar(50),
	`type` enum('launch','cohort','partnership','achievement','funding','expansion') DEFAULT 'achievement',
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_partners` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100),
	`description` text,
	`logo` text,
	`website` text,
	`since_year` int,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_programs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`duration` varchar(100),
	`format` enum('hybrid','in-person','virtual') DEFAULT 'hybrid',
	`equity_taken` varchar(50),
	`funding_provided` varchar(100),
	`next_deadline` varchar(100),
	`next_start_date` varchar(100),
	`status` enum('open','closed','upcoming') DEFAULT 'upcoming',
	`eligibility` text,
	`application_url` text,
	`phases` json,
	`week_by_week` json,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_reminders` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`program_id` int,
	`user_id` int,
	`email` varchar(320) NOT NULL,
	`reminder_type` enum('application_open','deadline','program_start') DEFAULT 'application_open',
	`is_notified` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_stats` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`metric_value` varchar(100) NOT NULL,
	`metric_label` varchar(100),
	`icon` varchar(50),
	`category` varchar(50),
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_team_members` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255),
	`bio` text,
	`photo` text,
	`linkedin` text,
	`twitter` text,
	`email` varchar(320),
	`role_type` enum('leadership','mentor','advisor','operations','partner') DEFAULT 'operations',
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerator_testimonials` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`accelerator_id` int NOT NULL,
	`quote` text NOT NULL,
	`author_name` varchar(255) NOT NULL,
	`author_title` varchar(255),
	`company_name` varchar(255),
	`photo` text,
	`cohort_number` int,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accelerators` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`shortDescription` text,
	`logo` text,
	`website` text,
	`location` varchar(255),
	`regionId` int,
	`sectorId` int,
	`programLength` varchar(100),
	`equity` varchar(100),
	`funding` varchar(100),
	`applicationDeadline` timestamp,
	`programStartDate` timestamp,
	`programEndDate` timestamp,
	`benefits` text,
	`requirements` text,
	`applicationUrl` text,
	`status` enum('active','upcoming','completed','paused') DEFAULT 'active',
	`isFeatured` tinyint DEFAULT 0,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`addressLine` text,
	`claimedByUserId` int,
	`statusId` int DEFAULT 1,
	`facebook` text,
	`instagram` text,
	`linkedIn` text,
	`twitter` text,
	`email` varchar(320),
	`alumni_companies` json,
	`batch_count` int,
	`success_stories` json,
	`mission` text,
	`program_details` json,
	`application_process` text,
	`cohort_size` varchar(50),
	`investment_range` varchar(100),
	`equity_taken` varchar(50),
	`success_rate` varchar(50),
	`total_funded` int,
	`total_raised_by_alumni` varchar(100),
	`avg_followon` varchar(100),
	`team_members` json,
	`partners` json,
	`notable_alumni` json,
	`social_links` json,
	`contact_email` varchar(255),
	`contact_phone` varchar(50),
	`youtube` varchar(512),
	`cover_image` varchar(512),
	`gallery` json,
	`next_cohort_date` varchar(100),
	`program_length_detail` varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_blocklist` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`type` enum('domain','keyword','category') NOT NULL,
	`value` varchar(255) NOT NULL,
	`reason` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`partnerId` int,
	`name` varchar(255) NOT NULL,
	`campaignType` enum('direct','sponsorship','programmatic','house') NOT NULL DEFAULT 'direct',
	`objective` enum('awareness','traffic','leads','conversions') DEFAULT 'awareness',
	`budget` decimal(15,2),
	`budgetType` enum('total','daily') DEFAULT 'total',
	`pricingModel` enum('cpm','cpc','cpa','flat') NOT NULL DEFAULT 'cpm',
	`pricePerUnit` decimal(10,4),
	`targetSlots` json,
	`targetCategories` json,
	`targetGeos` json,
	`targetDevices` json,
	`startDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`endDate` timestamp,
	`frequencyCap` int,
	`frequencyCapPeriod` enum('hour','day','week','month'),
	`status` enum('draft','pending_approval','approved','active','paused','completed','rejected') NOT NULL DEFAULT 'draft',
	`approvedById` int,
	`approvedAt` timestamp,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`conversions` int DEFAULT 0,
	`spend` decimal(15,2) DEFAULT '0.00',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_clicks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`impressionId` int NOT NULL,
	`campaignId` int NOT NULL,
	`creativeId` int NOT NULL,
	`clickUrl` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_creatives` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`format` enum('banner','native','video','text') NOT NULL DEFAULT 'banner',
	`dimensions` varchar(32),
	`fileUrl` text,
	`nativeHeadline` varchar(128),
	`nativeDescription` text,
	`nativeImage` text,
	`nativeCta` varchar(32),
	`clickUrl` text NOT NULL,
	`clickTrackingUrl` text,
	`impressionTrackingUrl` text,
	`status` enum('draft','pending_approval','approved','rejected') NOT NULL DEFAULT 'draft',
	`approvedById` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_frequency_log` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`campaignId` int NOT NULL,
	`creativeId` int,
	`sessionId` varchar(128) NOT NULL,
	`userId` int,
	`impressionCount` int DEFAULT 1,
	`firstSeen` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`lastSeen` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_impressions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`campaignId` int NOT NULL,
	`creativeId` int NOT NULL,
	`slotId` int NOT NULL,
	`sessionId` varchar(64),
	`userId` int,
	`pageUrl` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`countryCode` varchar(2),
	`deviceType` varchar(32),
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_slots` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(128) NOT NULL,
	`slotKey` varchar(64) NOT NULL,
	`pageType` varchar(64) NOT NULL,
	`position` varchar(64) NOT NULL,
	`dimensions` varchar(32),
	`floorPrice` decimal(10,2) DEFAULT '0.00',
	`isPremium` tinyint DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`adsenseSlotId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `adsense_settings` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`publisherId` varchar(50),
	`autoAdsEnabled` tinyint DEFAULT 0,
	`adsenseEnabled` tinyint DEFAULT 0,
	`adsTxtContent` text,
	`globalKillSwitch` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `affiliate_clicks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`resourceId` int,
	`partnerId` int,
	`sessionId` varchar(64),
	`userId` int,
	`pageUrl` text,
	`destinationUrl` text NOT NULL,
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(128),
	`utmContent` varchar(128),
	`ipAddress` varchar(45),
	`userAgent` text,
	`referer` text,
	`countryCode` varchar(2),
	`deviceType` varchar(32),
	`clickedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `affiliate_conversions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`clickId` int,
	`resourceId` int,
	`partnerId` int,
	`conversionType` enum('signup','purchase','subscription','lead','download') NOT NULL,
	`orderId` varchar(128),
	`amount` decimal(15,2),
	`currency` varchar(3) DEFAULT 'USD',
	`commissionAmount` decimal(15,2),
	`commissionCurrency` varchar(3) DEFAULT 'USD',
	`status` enum('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
	`approvedById` int,
	`approvedAt` timestamp,
	`notes` text,
	`convertedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_ab_test_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_name` varchar(255) NOT NULL,
	`session_id` int,
	`article_id` int,
	`variant_label` varchar(64) NOT NULL,
	`title` varchar(512),
	`content` text,
	`meta_description` varchar(512),
	`status` enum('draft','active','winner','loser','archived') NOT NULL DEFAULT 'draft',
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`engagement_score` decimal(10,4) DEFAULT 0,
	`avg_time_on_page` decimal(10,4) DEFAULT 0,
	`bounce_rate` decimal(10,4) DEFAULT 0,
	`conversion_rate` decimal(10,4) DEFAULT 0,
	`start_date` timestamp,
	`end_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_ab_test_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_crawl_log` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`source_id` int NOT NULL,
	`status` varchar(32) NOT NULL,
	`articles_found` int DEFAULT 0,
	`articles_new` int DEFAULT 0,
	`articles_duplicate` int DEFAULT 0,
	`articles_relevant` int DEFAULT 0,
	`articles_generated` int DEFAULT 0,
	`duration_ms` int,
	`error_message` text,
	`crawl_data` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_discovered_articles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`source_id` int NOT NULL,
	`crawl_log_id` int,
	`external_url` text NOT NULL,
	`external_title` varchar(512),
	`external_excerpt` text,
	`external_content` text,
	`external_published_at` timestamp,
	`external_author` varchar(255),
	`external_image_url` text,
	`relevance_score` int,
	`relevance_reason` text,
	`is_duplicate` tinyint DEFAULT 0,
	`duplicate_of_id` int,
	`fingerprint` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'discovered',
	`generation_session_id` int,
	`article_id` int,
	`processed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`channel_type` enum('rss','atom','linkedin','whatsapp','twitter','email','scrape','api') DEFAULT 'rss',
	`editorial_tier` tinyint,
	`category` varchar(128),
	`mena_entities` json,
	`funding_signal` json,
	`llm_reasoning` text,
	`suggested_angle` varchar(512),
	`stage1_score` int,
	`stage2_score` int,
	`stage3_adjustment` int DEFAULT 0,
	`content_language` varchar(8) DEFAULT 'en',
	`translated_title` varchar(512),
	`translated_excerpt` text,
	`editorial_feedback` enum('accepted','accepted_edited','rejected'),
	`feedback_at` timestamp,
	`auto_generated` tinyint DEFAULT 0,
	`llm_provider_used` varchar(32),
	`llm_confidence` int
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_editorial_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discovered_article_id` int NOT NULL,
	`article_id` int,
	`action` enum('generated','published','published_edited','rejected','dismissed','flagged') NOT NULL,
	`editor_id` int,
	`edit_distance` int,
	`feedback_features` json,
	`source_id` int,
	`taxonomy_category` varchar(128),
	`relevance_score` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_editorial_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_ar` varchar(255),
	`name_ur` varchar(255),
	`type` enum('company','person','investor','fund','city','country','government_body','event','university','accelerator') NOT NULL,
	`tier` tinyint NOT NULL DEFAULT 2,
	`country` varchar(64),
	`sector` varchar(128),
	`aliases` json DEFAULT ('[]'),
	`mention_count` int DEFAULT 0,
	`last_seen_at` timestamp,
	`metadata` json,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_entities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`language` varchar(8) NOT NULL DEFAULT 'en',
	`weight` int NOT NULL DEFAULT 1,
	`category` varchar(128),
	`keyword_type` enum('mena_entity','funding_signal','sector','geography','person','event','suppress') NOT NULL DEFAULT 'mena_entity',
	`is_active` tinyint DEFAULT 1,
	`match_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_keywords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_llm_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`display_name` varchar(128) NOT NULL,
	`is_enabled` tinyint DEFAULT 1,
	`priority` int DEFAULT 1,
	`model_id` varchar(128),
	`monthly_budget_usd` int DEFAULT 50,
	`current_month_spend_cents` int DEFAULT 0,
	`total_tokens_used` int DEFAULT 0,
	`consecutive_failures` int DEFAULT 0,
	`last_failure_at` timestamp,
	`api_key_masked` varchar(64),
	`rate_limit` int DEFAULT 60,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_llm_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_sources` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`feed_url` text,
	`feed_type` varchar(32) DEFAULT 'rss',
	`scraping_config` json,
	`is_active` tinyint DEFAULT 1,
	`crawl_interval_minutes` int DEFAULT 120,
	`last_crawled_at` timestamp,
	`last_success_at` timestamp,
	`consecutive_failures` int DEFAULT 0,
	`total_articles_found` int DEFAULT 0,
	`total_articles_published` int DEFAULT 0,
	`relevance_threshold` int DEFAULT 70,
	`auto_publish` tinyint DEFAULT 0,
	`default_category_id` int,
	`default_policy_id` int,
	`default_template_id` int,
	`priority` int DEFAULT 5,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`channel_type` enum('rss','atom','linkedin','whatsapp','twitter','email','scrape','api') DEFAULT 'rss',
	`editorial_brief` text,
	`must_watch_keywords` json DEFAULT ('[]'),
	`ignore_keywords` json DEFAULT ('[]'),
	`max_age_hours` int,
	`acceptance_rate` int DEFAULT 0,
	`authority_score` int DEFAULT 50,
	`auto_generate_enabled` tinyint DEFAULT 0,
	`language` varchar(8) DEFAULT 'en',
	`llm_provider_override` varchar(32),
	`tags` json DEFAULT ('[]'),
	`target_acceptance_rate` int DEFAULT 40,
	`target_daily_relevant` int DEFAULT 3
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_agent_taxonomy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tier` tinyint NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`signal_keywords_en` json DEFAULT ('[]'),
	`signal_keywords_ar` json DEFAULT ('[]'),
	`auto_generate_eligible` tinyint DEFAULT 0,
	`auto_generate_threshold` int DEFAULT 85,
	`sort_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_taxonomy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`key_hash` varchar(255) NOT NULL,
	`key_prefix` varchar(16) NOT NULL,
	`permissions` json,
	`rate_limit` int DEFAULT 100,
	`rate_limit_window` int DEFAULT 3600,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`last_used_at` timestamp,
	`expires_at` timestamp,
	`total_requests` int DEFAULT 0,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_batch_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`total_items` int DEFAULT 0,
	`completed_items` int DEFAULT 0,
	`failed_items` int DEFAULT 0,
	`provider` varchar(64),
	`model` varchar(128),
	`policy_id` int,
	`template_id` int,
	`items` json,
	`created_by_id` int,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_batch_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_competitor_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`summary` text,
	`published_at` timestamp,
	`topics` json,
	`entities` json,
	`has_our_coverage` tinyint DEFAULT 0,
	`our_article_id` int,
	`coverage_gap` tinyint DEFAULT 0,
	`relevance_score` decimal(10,4) DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_competitor_articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_competitor_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`feed_url` text,
	`source_type` enum('rss','web','api') NOT NULL DEFAULT 'rss',
	`is_active` tinyint NOT NULL DEFAULT 1,
	`crawl_interval_minutes` int DEFAULT 120,
	`last_crawled_at` timestamp,
	`total_articles` int DEFAULT 0,
	`coverage_score` decimal(10,4) DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_competitor_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_content_calendar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`article_id` int,
	`title` varchar(512) NOT NULL,
	`content_type` varchar(64) NOT NULL DEFAULT 'article',
	`scheduled_date` timestamp NOT NULL,
	`scheduled_time` varchar(10),
	`status` enum('planned','generating','generated','review','approved','published','failed','cancelled') NOT NULL DEFAULT 'planned',
	`assigned_to` int,
	`notes` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`tags` json,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_content_calendar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_content_templates` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`content_type` varchar(64) NOT NULL,
	`article_type` varchar(64),
	`template_prompt` text NOT NULL,
	`output_schema` json,
	`required_inputs` json,
	`example_output` text,
	`policy_id` int,
	`is_active` tinyint DEFAULT 1,
	`usage_count` int DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_content_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`article_id` int,
	`version_number` int NOT NULL DEFAULT 1,
	`title` varchar(512),
	`content` text,
	`source` enum('ai_generated','ai_rewritten','ai_enhanced','human_edited','published') NOT NULL DEFAULT 'ai_generated',
	`model_used` varchar(128),
	`diff` text,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_content_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_editorial_policies` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`content_type` varchar(64) NOT NULL,
	`rules` json NOT NULL,
	`is_default` tinyint DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_entity_aliases` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`alias` varchar(512) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_entity_extractions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`session_id` int NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`extracted_name` varchar(512) NOT NULL,
	`extracted_data` json,
	`confidence` varchar(16) DEFAULT 'medium',
	`match_status` varchar(32) DEFAULT 'pending',
	`matched_entity_id` int,
	`mention_type` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_generation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`session_type` varchar(64) NOT NULL,
	`content_type` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`input_title` text,
	`input_url` text,
	`input_text` text,
	`input_data` json,
	`template_id` int,
	`policy_id` int,
	`llm_provider` varchar(32),
	`llm_model` varchar(64),
	`generated_content` text,
	`generated_title` varchar(512),
	`generated_excerpt` text,
	`generated_seo_title` varchar(512),
	`generated_seo_description` text,
	`generated_image_url` text,
	`generated_image_alt` text,
	`generated_data` json,
	`article_id` int,
	`entity_id` int,
	`entity_type` varchar(64),
	`agent_source_id` int,
	`generation_time_ms` int,
	`token_count` int,
	`estimated_cost` varchar(32),
	`approval_status` varchar(32) DEFAULT 'pending',
	`approved_by` int,
	`approval_notes` text,
	`approved_at` timestamp,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_llm_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`session_id` int,
	`provider` varchar(32) NOT NULL,
	`model` varchar(64) NOT NULL,
	`operation` varchar(64) NOT NULL,
	`input_tokens` int DEFAULT 0,
	`output_tokens` int DEFAULT 0,
	`total_tokens` int DEFAULT 0,
	`latency_ms` int,
	`estimated_cost_usd` varchar(32),
	`success` tinyint DEFAULT 1,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_plagiarism_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`article_id` int,
	`originality_score` decimal(10,4),
	`total_sentences` int,
	`flagged_sentences` int,
	`matches` json,
	`status` enum('pending','checking','clean','flagged','error') NOT NULL DEFAULT 'pending',
	`checked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_plagiarism_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_revenue_attribution` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_id` int NOT NULL,
	`session_id` int,
	`date` timestamp NOT NULL,
	`page_views` int DEFAULT 0,
	`unique_visitors` int DEFAULT 0,
	`ad_impressions` int DEFAULT 0,
	`ad_clicks` int DEFAULT 0,
	`ad_revenue` decimal(12,2) DEFAULT 0,
	`affiliate_clicks` int DEFAULT 0,
	`affiliate_revenue` decimal(12,2) DEFAULT 0,
	`total_revenue` decimal(12,2) DEFAULT 0,
	`cost_to_generate` decimal(12,2) DEFAULT 0,
	`roi` decimal(10,4) DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_revenue_attribution_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`article_id` int,
	`platform` enum('twitter','linkedin','facebook','instagram','threads') NOT NULL,
	`content` text NOT NULL,
	`hashtags` json,
	`media_url` text,
	`scheduled_at` timestamp,
	`published_at` timestamp,
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`engagement` json,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_social_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_tone_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`article_id` int,
	`overall_tone` varchar(64),
	`readability_score` decimal(10,4),
	`flesch_kincaid` decimal(10,4),
	`sentiment_score` decimal(10,4),
	`sentiment_label` varchar(32),
	`word_count` int,
	`avg_sentence_length` decimal(10,4),
	`passive_voice_percent` decimal(10,4),
	`tone_breakdown` json,
	`suggestions` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_tone_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(255),
	`events` json NOT NULL,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`headers` json,
	`last_triggered_at` timestamp,
	`failure_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhook_id` int NOT NULL,
	`event` varchar(128) NOT NULL,
	`payload` json,
	`response_status` int,
	`response_body` text,
	`success` tinyint NOT NULL DEFAULT 0,
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_accelerators` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`acceleratorId` int NOT NULL,
	`mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_categories` (
	`articleId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_companies` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`companyId` int NOT NULL,
	`mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_earnings` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`writerId` int NOT NULL,
	`periodMonth` varchar(7) NOT NULL,
	`pageviews` int DEFAULT 0,
	`directAdRevenue` decimal(15,2) DEFAULT '0.00',
	`adsenseRevenueEstimated` decimal(15,2) DEFAULT '0.00',
	`affiliateRevenue` decimal(15,2) DEFAULT '0.00',
	`totalRevenue` decimal(15,2) DEFAULT '0.00',
	`writerShare` decimal(15,2) DEFAULT '0.00',
	`status` enum('pending','calculated','paid') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_events` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`eventId` int NOT NULL,
	`mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_investors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`investorId` int NOT NULL,
	`mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_keywords` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`keywordId` int NOT NULL,
	`keywordType` enum('focus','additional') DEFAULT 'additional',
	`sortOrder` int DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_locations` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`country` varchar(2) NOT NULL,
	`region` varchar(10),
	`city` varchar(255),
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_people` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`personId` int NOT NULL,
	`mentionType` enum('primary','mentioned','interview','investor_in_round','partner','speaker','sponsor') NOT NULL DEFAULT 'mentioned',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_regions` (
	`articleId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_related_entities` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`sortOrder` int DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_sectors` (
	`articleId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_tags` (
	`articleId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_topics` (
	`articleId` int NOT NULL,
	`topicId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `articles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`excerpt` text,
	`content` text,
	`featuredImageId` int,
	`authorId` int NOT NULL,
	`statusId` int NOT NULL,
	`isFeatured` tinyint DEFAULT 0,
	`isTrending` tinyint DEFAULT 0,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`scheduledAt` timestamp,
	`wpOriginalId` int,
	`wpOriginalUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isFlash` tinyint DEFAULT 0,
	`flashExpiresAt` timestamp,
	`flashDurationHours` int,
	`featuredExpiresAt` timestamp,
	`featuredDurationHours` int,
	`primaryCategoryId` int,
	`focusKeywordId` int,
	`coverageCountryId` int,
	`coverageGeoRegionId` int,
	`coverageCityId` int,
	`hasFundingEvent` tinyint DEFAULT 0,
	`robotsIndexing` enum('index','noindex') DEFAULT 'index',
	`ogImageId` int,
	`ogTitle` varchar(512),
	`ogDescription` text,
	`articleType` enum('news','opinion','press_release','report','interview') NOT NULL DEFAULT 'news',
	`googleNewsKeywords` text,
	`seoTitle` varchar(512),
	`seoDescription` text,
	`seoKeywords` text,
	`canonicalUrl` text,
	`isEditorPick` tinyint DEFAULT 0,
	`auto_generated` tinyint DEFAULT 0,
	`discovered_article_id` int
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int,
	`userEmail` varchar(320),
	`action` varchar(64) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` int,
	`changes` json,
	`metadata` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`contentType` varchar(32) NOT NULL,
	`contentId` int NOT NULL,
	`contentTitle` varchar(500),
	`contentSlug` varchar(500),
	`contentCategory` varchar(128),
	`contentImageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `browsing_history` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`contentType` varchar(32) NOT NULL,
	`contentId` int NOT NULL,
	`contentTitle` varchar(500),
	`contentSlug` varchar(500),
	`contentCategory` varchar(128),
	`contentImageUrl` text,
	`viewCount` int NOT NULL DEFAULT 1,
	`lastViewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `calculators` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`shortDescription` varchar(512),
	`type` enum('valuation','runway','dilution','cap_table','burn_rate','break_even','roi','ltv_cac','mrr','custom') NOT NULL,
	`featuredImage` text,
	`config` json,
	`formula` text,
	`inputFields` json,
	`outputFields` json,
	`helpText` text,
	`exampleData` json,
	`isActive` tinyint DEFAULT 1,
	`isFeatured` tinyint DEFAULT 0,
	`usageCount` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parentId` int,
	`module` enum('news','jobs','events','resources','research') NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cities` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`countryId` int NOT NULL,
	`geoRegionId` int,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `claim_review_history` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`claimId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewerName` varchar(255),
	`action` enum('submitted','under_review','needs_clarification','approved','rejected') NOT NULL,
	`comment` text,
	`fromStatus` varchar(64),
	`toStatus` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `claimed_profiles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`entityType` enum('person','company','accelerator','event','investor') NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255) NOT NULL,
	`entitySlug` varchar(255),
	`entityLogo` text,
	`status` enum('pending','under_review','needs_clarification','approved','rejected') NOT NULL DEFAULT 'pending',
	`role` enum('owner','admin','editor') NOT NULL DEFAULT 'owner',
	`verificationNote` text,
	`requestNote` text,
	`reviewedById` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`proofText` text,
	`companyEmail` varchar(320)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`tagline` text,
	`description` text,
	`logo` text,
	`website` text,
	`linkedIn` text,
	`twitter` text,
	`location` varchar(255),
	`regionId` int,
	`industry` varchar(100),
	`sectorId` int,
	`stage` enum('pre_seed','seed','series_a','series_b','series_c','series_d_plus','public','acquired'),
	`foundedYear` int,
	`employeeCount` varchar(50),
	`totalFunding` varchar(100),
	`isVerified` tinyint DEFAULT 0,
	`isFeatured` tinyint DEFAULT 0,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`claimedByUserId` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`addressLine` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`createdByUserId` int,
	`short_description` text,
	`facebook` text,
	`instagram` text,
	`email` varchar(320),
	`phone` varchar(32),
	`tech_stack` json,
	`key_people` json,
	`mission` text,
	`vision` text,
	`problem_solved` text,
	`market_served` text,
	`cover_image` text,
	`brand_color` varchar(20),
	`active_users_range` varchar(100),
	`arr_range` varchar(100),
	`countries_served` int,
	`clients_count` int,
	`notable_customers` json,
	`partnerships` json,
	`media_kit` text,
	`logo_pack` text,
	`boilerplate` text,
	`pr_contact_email` varchar(320),
	`app_store_link` text,
	`play_store_link` text,
	`youtube` text,
	`timeline` json,
	`certifications` json,
	`pitch_deck` text,
	`whitepapers` json,
	`case_studies` json,
	`hiring_actively` tinyint DEFAULT 0,
	`verification_level` varchar(50) DEFAULT 'basic',
	`profile_completeness` int DEFAULT 20,
	`last_updated_by` varchar(50) DEFAULT 'system',
	`data_source` varchar(50) DEFAULT 'editorial'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_awards` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`year` int,
	`organization` varchar(255),
	`description` text,
	`image` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_products` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`description` text,
	`screenshots` json,
	`demo_video` text,
	`pricing_model` varchar(100),
	`integrations` json,
	`clients` json,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_regions` (
	`companyId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_sectors` (
	`companyId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_updates` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`company_id` int NOT NULL,
	`type` enum('text','image','milestone','event','product_launch') DEFAULT 'text',
	`title` varchar(255),
	`content` text,
	`image` text,
	`link` text,
	`likes_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `countries` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`iso2` varchar(2) NOT NULL,
	`iso3` varchar(3) NOT NULL,
	`dialCode` varchar(10),
	`currency` varchar(3),
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `crawl_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_type` enum('scheduled','manual') NOT NULL DEFAULT 'scheduled',
	`status` enum('running','completed','failed','partial') NOT NULL DEFAULT 'running',
	`total_urls` int DEFAULT 0,
	`crawled_urls` int DEFAULT 0,
	`new_issues_found` int DEFAULT 0,
	`issues_resolved` int DEFAULT 0,
	`error_message` text,
	`started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	`triggered_by_id` int,
	CONSTRAINT `crawl_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deal_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`dealId` int NOT NULL,
	`userId` int,
	`email` varchar(320),
	`redeemedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`ipAddress` varchar(45)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`preheader` varchar(255),
	`fromName` varchar(128) DEFAULT 'TechScoop',
	`fromEmail` varchar(320) DEFAULT 'newsletter@techscoop.io',
	`replyTo` varchar(320),
	`listId` int,
	`templateId` int,
	`htmlContent` text,
	`textContent` text,
	`status` enum('draft','scheduled','sending','sent','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`recipientCount` int DEFAULT 0,
	`sentCount` int DEFAULT 0,
	`deliveredCount` int DEFAULT 0,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`bounceCount` int DEFAULT 0,
	`unsubscribeCount` int DEFAULT 0,
	`complaintCount` int DEFAULT 0,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_digest_preferences` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`frequency` enum('daily','weekly','none') NOT NULL DEFAULT 'none',
	`categories` json,
	`includeJobs` tinyint DEFAULT 1,
	`includeEvents` tinyint DEFAULT 1,
	`includeNews` tinyint DEFAULT 1,
	`includeRecommendations` tinyint DEFAULT 1,
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_notifications` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientUserId` int,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(64) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`status` enum('pending','sent','failed') DEFAULT 'pending',
	`sentAt` timestamp,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entity_team_members` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entity_versions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`version` int NOT NULL,
	`data` json NOT NULL,
	`changedFields` json,
	`changedByUserId` int,
	`changeReason` text,
	`suggestedUpdateId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_categories` (
	`eventId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_gallery` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`caption` varchar(255),
	`altText` varchar(255),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_highlights` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(64),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_regions` (
	`eventId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_schedule` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`speaker` varchar(255),
	`location` varchar(255),
	`sortOrder` int DEFAULT 0,
	`dayNumber` int DEFAULT 1,
	`speakerId` int,
	`speakerName` varchar(255),
	`trackId` int,
	`sessionType` enum('keynote','panel','workshop','networking','break','other') DEFAULT 'other'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_sectors` (
	`eventId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_side_events` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`dayNumber` int DEFAULT 1,
	`date` timestamp,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`venue` varchar(255),
	`capacity` int,
	`registrationUrl` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_speakers` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255),
	`company` varchar(255),
	`bio` text,
	`photo` text,
	`linkedinUrl` text,
	`twitterUrl` text,
	`websiteUrl` text,
	`personId` int,
	`isFeatured` tinyint DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_sponsors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`logo` text,
	`websiteUrl` text,
	`tier` enum('platinum','gold','silver','bronze','partner') DEFAULT 'partner',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_tracks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`eventId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#22c55e',
	`icon` varchar(64),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`tagline` varchar(255),
	`description` text,
	`shortDescription` text,
	`type` enum('conference','webinar','meetup','workshop','hackathon','summit','other') NOT NULL,
	`format` enum('in_person','virtual','hybrid') DEFAULT 'in_person',
	`featuredImage` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`timezone` varchar(64) DEFAULT 'UTC',
	`venue` varchar(255),
	`address` text,
	`city` varchar(128),
	`country` varchar(128),
	`virtualUrl` text,
	`registrationUrl` text,
	`ticketPrice` decimal(10,2),
	`ticketCurrency` varchar(3) DEFAULT 'USD',
	`isFree` tinyint DEFAULT 0,
	`organizerName` varchar(255),
	`organizerEmail` varchar(320),
	`organizerWebsite` text,
	`isFeatured` tinyint DEFAULT 0,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`addressLine` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`whatToExpect` text,
	`expectedAttendees` int,
	`expectedInvestors` int,
	`expectedStartups` int,
	`expectedCountries` int,
	`venueName` varchar(255),
	`venueAddress` text,
	`venueMapUrl` text,
	`venueImage` text,
	`ticketUrl` text,
	`websiteUrl` text,
	`organizerLogo` text,
	`claimedByUserId` int,
	`createdByUserId` int
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `founder_deals` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`partnerId` int NOT NULL,
	`resourceId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`discountType` enum('percentage','fixed','credits','free_tier','custom') NOT NULL,
	`discountValue` varchar(128),
	`promoCode` varchar(64),
	`redemptionUrl` text,
	`redemptionInstructions` text,
	`eligibility` text,
	`maxRedemptions` int,
	`maxRedemptionsPerUser` int DEFAULT 1,
	`currentRedemptions` int DEFAULT 0,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('draft','active','paused','expired') NOT NULL DEFAULT 'draft',
	`isExclusive` tinyint DEFAULT 0,
	`isFeatured` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `funding_round_investors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`fundingRoundId` int NOT NULL,
	`investorId` int NOT NULL,
	`role` enum('lead','participant') NOT NULL DEFAULT 'participant',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`investmentAmount` decimal(15,2),
	`investmentCurrency` varchar(10) DEFAULT 'USD'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `funding_rounds` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`articleId` int,
	`companyId` int NOT NULL,
	`roundType` enum('pre_seed','seed','series_a','series_b','series_c','series_d_plus','bridge','strategic','venture_debt','grant','undisclosed') NOT NULL,
	`amountRaised` decimal(15,2),
	`currency` varchar(3) DEFAULT 'USD',
	`isUndisclosed` tinyint DEFAULT 0,
	`leadInvestorId` int,
	`valuationPre` decimal(15,2),
	`valuationPost` decimal(15,2),
	`valuationCurrency` varchar(3) DEFAULT 'USD',
	`isValuationUndisclosed` tinyint DEFAULT 1,
	`fundingDate` timestamp NOT NULL,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`sourceUrls` json,
	`proofDocumentId` int,
	`notes` text,
	`status` enum('confirmed','pending','disputed') NOT NULL DEFAULT 'pending',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gated_downloads` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`resourceId` int NOT NULL,
	`leadId` int NOT NULL,
	`downloadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`ipAddress` varchar(45),
	`userAgent` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geo_regions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`countryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(10),
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gsc_indexing_coverage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` text NOT NULL,
	`page_type` varchar(64) NOT NULL DEFAULT 'article',
	`coverage_status` enum('indexed','not_indexed','excluded','error','unknown') NOT NULL DEFAULT 'unknown',
	`gsc_reason` varchar(255),
	`http_status` int,
	`canonical_url` text,
	`canonical_mismatch` tinyint DEFAULT 0,
	`robots_meta` varchar(128),
	`has_schema` tinyint DEFAULT 0,
	`redirect_chain_length` int DEFAULT 0,
	`final_url` text,
	`has_hreflang` tinyint DEFAULT 0,
	`submitted_for_indexing` tinyint DEFAULT 0,
	`submitted_at` timestamp,
	`indexing_request_status` varchar(64),
	`last_crawled_at` timestamp,
	`last_gsc_sync_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gsc_indexing_coverage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `homepage_blocks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255),
	`subtitle` text,
	`config` json,
	`sortOrder` int DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `homepage_sections` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`sectionType` enum('hero','trending','headlines','category','in_brief','podcasts','videos','stocks','sidebar_jobs','sidebar_events','sidebar_links','sidebar_podcast') NOT NULL,
	`categoryId` int,
	`accentColor` varchar(7) DEFAULT '#000000',
	`icon` varchar(64),
	`articleCount` int DEFAULT 4,
	`layout` enum('featured_grid','two_column','list','horizontal_scroll','compact') DEFAULT 'featured_grid',
	`showImage` tinyint DEFAULT 1,
	`showExcerpt` tinyint DEFAULT 1,
	`showDate` tinyint DEFAULT 1,
	`showAuthor` tinyint DEFAULT 0,
	`showViewMore` tinyint DEFAULT 1,
	`viewMoreUrl` text,
	`sortOrder` int DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`position` enum('main','sidebar') DEFAULT 'main',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `indexing_logs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`article_id` int,
	`article_title` varchar(512),
	`article_slug` varchar(512),
	`url` text NOT NULL,
	`method` enum('sitemap_ping','indexnow','google_indexing_api') NOT NULL,
	`success` tinyint NOT NULL,
	`status_code` int,
	`message` text,
	`trigger` enum('publish','transition','bulk_publish','scheduled','manual') DEFAULT 'publish',
	`triggered_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `indexing_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` text NOT NULL,
	`coverage_id` int,
	`submission_type` varchar(32) NOT NULL DEFAULT 'URL_UPDATED',
	`api_response` text,
	`success` tinyint DEFAULT 0,
	`status_code` int,
	`error_message` text,
	`indexed_after_submission` tinyint,
	`checked_at` timestamp,
	`submitted_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `indexing_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investor_regions` (
	`investorId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investor_sectors` (
	`investorId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `investors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`type` enum('vc','angel','corporate_vc','family_office','accelerator','other') NOT NULL,
	`description` text,
	`shortDescription` text,
	`logo` text,
	`website` text,
	`linkedIn` text,
	`twitter` text,
	`email` varchar(320),
	`headquarters` varchar(255),
	`foundedYear` int,
	`teamSize` varchar(64),
	`aum` varchar(128),
	`checkSizeMin` decimal(15,2),
	`checkSizeMax` decimal(15,2),
	`checkSizeCurrency` varchar(3) DEFAULT 'USD',
	`investmentStages` json,
	`portfolioCount` int,
	`isVerified` tinyint DEFAULT 0,
	`claimedByUserId` int,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`addressLine` text,
	`location` varchar(255),
	`createdByUserId` int,
	`facebook` text,
	`instagram` text,
	`portfolio_companies` json,
	`investment_thesis` text,
	`notable_exits` json,
	`focus_regions` json,
	`mission` text,
	`investment_philosophy` text,
	`team_members` json,
	`office_locations` json,
	`social_links` json,
	`awards` json,
	`key_metrics` json,
	`application_process` text,
	`contact_email` varchar(255),
	`contact_phone` varchar(50),
	`youtube` varchar(512)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_applications` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`jobId` int NOT NULL,
	`userId` int,
	`applicantName` varchar(255) NOT NULL,
	`applicantEmail` varchar(320) NOT NULL,
	`applicantPhone` varchar(32),
	`cvUrl` text,
	`coverLetter` text,
	`linkedinUrl` text,
	`portfolioUrl` text,
	`currentCompany` varchar(255),
	`currentTitle` varchar(255),
	`yearsOfExperience` int,
	`expectedSalary` decimal(12,2),
	`expectedSalaryCurrency` varchar(3) DEFAULT 'USD',
	`noticePeriod` varchar(64),
	`applicationMethod` enum('internal','external') NOT NULL DEFAULT 'internal',
	`status` enum('new','reviewed','shortlisted','interview','offered','hired','rejected','withdrawn') NOT NULL DEFAULT 'new',
	`statusNote` text,
	`rating` int,
	`isViewed` tinyint DEFAULT 0,
	`viewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_categories` (
	`jobId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_clicks` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`jobId` int NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`userAvatar` text,
	`userTitle` varchar(255),
	`userCompany` varchar(255),
	`clickType` enum('view','apply_click','save','share','external_apply') NOT NULL DEFAULT 'view',
	`referrer` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_regions` (
	`jobId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_sectors` (
	`jobId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jobs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`requirements` text,
	`benefits` text,
	`companyName` varchar(255) NOT NULL,
	`companyLogo` text,
	`companyWebsite` text,
	`location` varchar(255),
	`isRemote` tinyint DEFAULT 0,
	`remoteType` enum('fully_remote','hybrid','on_site') DEFAULT 'on_site',
	`roleType` enum('full_time','part_time','contract','internship','freelance') DEFAULT 'full_time',
	`seniority` enum('entry','mid','senior','lead','executive'),
	`salaryMin` decimal(12,2),
	`salaryMax` decimal(12,2),
	`salaryCurrency` varchar(3) DEFAULT 'USD',
	`salaryPeriod` enum('hourly','monthly','yearly') DEFAULT 'yearly',
	`applyUrl` text,
	`applyEmail` varchar(320),
	`statusId` int NOT NULL,
	`expiresAt` timestamp,
	`publishedAt` timestamp,
	`viewCount` int DEFAULT 0,
	`applicationCount` int DEFAULT 0,
	`postedById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`companyId` int,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`skills` json,
	`department` varchar(100),
	`deadline` timestamp,
	`visa_sponsorship` tinyint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `keywords` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
	`description` text,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`sortOrder` int DEFAULT 0,
	`keywordType` enum('primary','secondary') NOT NULL DEFAULT 'secondary',
	`category` varchar(128),
	`usageCount` int DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leads` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`subscriberId` int,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`companyName` varchar(255),
	`jobTitle` varchar(128),
	`phone` varchar(32),
	`source` varchar(64) NOT NULL,
	`sourceResourceId` int,
	`sourceUrl` text,
	`score` int DEFAULT 0,
	`scoreFactors` json,
	`status` enum('new','contacted','qualified','converted','disqualified') NOT NULL DEFAULT 'new',
	`assignedToPartnerId` int,
	`assignedAt` timestamp,
	`consentMarketing` tinyint DEFAULT 0,
	`consentPartnerShare` tinyint DEFAULT 0,
	`consentTimestamp` timestamp,
	`ipAddress` varchar(45),
	`countryCode` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`filename` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`size` bigint NOT NULL,
	`url` text NOT NULL,
	`s3Key` varchar(512),
	`alt` varchar(255),
	`caption` text,
	`width` int,
	`height` int,
	`uploadedById` int,
	`folder` varchar(255) DEFAULT '/',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `partner_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`partnerId` int NOT NULL,
	`keyName` varchar(128) NOT NULL,
	`apiKey` varchar(64) NOT NULL,
	`apiSecret` varchar(128) NOT NULL,
	`permissions` json,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`isActive` tinyint DEFAULT 1,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `partner_payouts` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`partnerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`paymentMethod` enum('bank_transfer','paypal','stripe','check') NOT NULL,
	`paymentReference` varchar(255),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`processedAt` timestamp,
	`processedById` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `partner_users` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`partnerId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','manager','viewer') NOT NULL DEFAULT 'viewer',
	`invitedById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `partners` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`companyName` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo` text,
	`website` text,
	`description` text,
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(32),
	`tier` enum('free','growth','pro','enterprise') NOT NULL DEFAULT 'free',
	`partnershipType` enum('resource_provider','affiliate','sponsor','media','strategic') NOT NULL DEFAULT 'resource_provider',
	`commissionRate` decimal(5,2) DEFAULT '15.00',
	`billingEmail` varchar(320),
	`billingAddress` text,
	`paymentMethod` enum('bank_transfer','paypal','stripe') DEFAULT 'bank_transfer',
	`paymentDetails` json,
	`status` enum('pending','active','suspended','terminated') NOT NULL DEFAULT 'pending',
	`approvedById` int,
	`approvedAt` timestamp,
	`monthlyClickLimit` int DEFAULT 1000,
	`monthlyLeadLimit` int DEFAULT 100,
	`notes` text,
	`contractUrl` text,
	`contractExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payout_line_items` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`payoutId` int NOT NULL,
	`conversionId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(255),
	`company` varchar(255),
	`bio` text,
	`shortBio` text,
	`avatar` text,
	`email` varchar(320),
	`linkedIn` text,
	`twitter` text,
	`website` text,
	`isVerified` tinyint DEFAULT 0,
	`claimedByUserId` int,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`companyId` int,
	`countryId` int,
	`geoRegionId` int,
	`cityId` int,
	`location` varchar(255),
	`createdByUserId` int,
	`functional_strengths` json,
	`open_to` json,
	`experience` json,
	`education` json,
	`languages` json,
	`phone` varchar(32),
	`gender` varchar(20),
	`nationality` varchar(100),
	`achievements` json,
	`angel_investments` json,
	`board_roles` json,
	`advisor_roles` json,
	`companies_founded` json,
	`key_achievements` json,
	`interests` json,
	`availability` varchar(100),
	`booking_rate` varchar(50),
	`facebook` varchar(512),
	`instagram` varchar(512),
	`youtube` varchar(512),
	`github` varchar(512)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people_regions` (
	`personId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `people_sectors` (
	`personId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `permissions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`resource` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	`scope` enum('all','own','team') NOT NULL DEFAULT 'own',
	`description` text,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `popups` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(128) NOT NULL,
	`title` varchar(255),
	`content` text,
	`imageId` int,
	`ctaText` varchar(128),
	`ctaUrl` text,
	`type` enum('popup','banner','toast','slide_in') DEFAULT 'popup',
	`position` enum('center','top','bottom','top_left','top_right','bottom_left','bottom_right') DEFAULT 'center',
	`triggerType` enum('immediate','delay','scroll','exit_intent') DEFAULT 'immediate',
	`triggerValue` int,
	`frequencyCap` enum('always','once','once_per_day','once_per_week','once_per_session') DEFAULT 'once_per_day',
	`pageTargeting` json,
	`isActive` tinyint DEFAULT 1,
	`startDate` timestamp,
	`endDate` timestamp,
	`viewCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profile_claims` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`claimantUserId` int,
	`claimantName` varchar(255) NOT NULL,
	`claimantEmail` varchar(320) NOT NULL,
	`claimantRole` varchar(255),
	`proofLinks` json,
	`proofDocumentId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderatorId` int,
	`moderatorNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`requesterType` enum('internal','external') NOT NULL DEFAULT 'external',
	`source` varchar(64) DEFAULT 'public_form'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `redirects` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`fromPath` varchar(768) NOT NULL,
	`toPath` varchar(768) NOT NULL,
	`statusCode` int NOT NULL DEFAULT 301,
	`isActive` tinyint DEFAULT 1,
	`hitCount` int DEFAULT 0,
	`lastHitAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `regions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`code` varchar(10),
	`parentId` int,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `regulations` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`content` text,
	`summary` text,
	`type` enum('law','regulation','guideline','framework','license','visa','tax','labor','other') NOT NULL,
	`country` varchar(64) NOT NULL,
	`region` varchar(64),
	`authority` varchar(255),
	`authorityUrl` text,
	`effectiveDate` date,
	`lastUpdated` date,
	`documentUrl` text,
	`relatedRegulations` json,
	`tags` json,
	`applicableTo` json,
	`keyPoints` json,
	`faqs` json,
	`statusId` int NOT NULL DEFAULT 1,
	`viewCount` int DEFAULT 0,
	`isFeatured` tinyint DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`abstract` text,
	`content` text,
	`type` enum('report','deep_dive','dataset','whitepaper','analysis','other') NOT NULL,
	`featuredImage` text,
	`pdfUrl` text,
	`authorId` int,
	`isPremium` tinyint DEFAULT 0,
	`price` decimal(10,2),
	`priceCurrency` varchar(3) DEFAULT 'USD',
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`downloadCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_attachments` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`researchId` int NOT NULL,
	`mediaId` int NOT NULL,
	`title` varchar(255),
	`sortOrder` int DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_categories` (
	`researchId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_regions` (
	`researchId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_sectors` (
	`researchId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `research_tags` (
	`researchId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_categories` (
	`resourceId` int NOT NULL,
	`categoryId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_regions` (
	`resourceId` int NOT NULL,
	`regionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_reviews` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`resourceId` int NOT NULL,
	`userId` int,
	`rating` decimal(3,2) NOT NULL,
	`title` varchar(255),
	`content` text,
	`pros` json,
	`cons` json,
	`isVerified` tinyint DEFAULT 0,
	`isApproved` tinyint DEFAULT 0,
	`helpfulCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_sectors` (
	`resourceId` int NOT NULL,
	`sectorId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_tags` (
	`resourceId` int NOT NULL,
	`tagId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resources` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text,
	`shortDescription` text,
	`type` enum('template','toolkit','perk','regulation','tool','playbook','program','grant','other') NOT NULL,
	`content` text,
	`featuredImage` text,
	`downloadUrl` text,
	`externalUrl` text,
	`provider` varchar(255),
	`providerLogo` text,
	`providerWebsite` text,
	`value` varchar(128),
	`eligibility` text,
	`expiresAt` timestamp,
	`isFeatured` tinyint DEFAULT 0,
	`statusId` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`downloadCount` int DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int,
	`affiliateUrl` text,
	`affiliateCommission` decimal(5,2),
	`isGated` tinyint DEFAULT 0,
	`gatedFields` json,
	`leadCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`conversionCount` int DEFAULT 0,
	`pricingModel` varchar(64),
	`targetStage` varchar(64),
	`targetAudience` json,
	`features` json,
	`pros` json,
	`cons` json,
	`rating` decimal(3,2),
	`reviewCount` int DEFAULT 0,
	`sortOrder` int DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `roles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(64) NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`description` text,
	`roleType` enum('system','external') NOT NULL DEFAULT 'system',
	`parentRoleId` int,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(500) NOT NULL,
	`entity_type` varchar(50),
	`results_count` int DEFAULT 0,
	`user_id` int,
	`session_id` varchar(128),
	`ip_hash` varchar(64),
	`user_agent` varchar(512),
	`clicked_result_id` int,
	`clicked_result_type` varchar(50),
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sectors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(255),
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_404_monitor` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`requestedUrl` varchar(2048) NOT NULL,
	`hitCount` int NOT NULL DEFAULT 1,
	`lastHitAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`firstHitAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`referrer` text,
	`userAgent` text,
	`suggestedRedirectUrl` text,
	`suggestedConfidence` int DEFAULT 0,
	`isResolved` tinyint DEFAULT 0,
	`resolvedRedirectId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_audit_history` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`auditId` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`totalIssues` int NOT NULL,
	`criticalCount` int NOT NULL,
	`warningCount` int NOT NULL,
	`infoCount` int NOT NULL,
	`issuesSnapshot` json,
	`triggeredBy` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
	`runById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_audit_ignored_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issue_id` varchar(255) NOT NULL,
	`issue_type` varchar(64) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`entity_title` varchar(500),
	`reason` text,
	`ignored_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `seo_audit_ignored_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_audit_schedule` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`isEnabled` tinyint DEFAULT 0,
	`frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`dayOfWeek` int DEFAULT 1,
	`timeOfDay` varchar(5) DEFAULT '09:00',
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`notifyOnCritical` tinyint DEFAULT 1,
	`notifyEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_health_issues` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`pageUrl` text NOT NULL,
	`issueType` varchar(64) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`issueDetails` text,
	`suggestedFix` text,
	`isResolved` tinyint DEFAULT 0,
	`resolvedAt` timestamp,
	`resolvedById` int,
	`lastCheckedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_hreflang_mappings` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`language` varchar(10) NOT NULL,
	`linkedEntityId` int,
	`linkedUrl` text,
	`isDefault` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_indexing_rules` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`module` varchar(64) NOT NULL,
	`pageType` varchar(64) NOT NULL,
	`indexingRule` varchar(64) NOT NULL DEFAULT 'index, follow',
	`canonicalRule` varchar(64) NOT NULL DEFAULT 'self',
	`customCanonicalPattern` text,
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_meta` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`metaKeywords` varchar(512),
	`ogTitle` varchar(255),
	`ogDescription` text,
	`ogImage` text,
	`canonicalUrl` text,
	`robotsDirective` varchar(64) DEFAULT 'index,follow',
	`structuredDataOverride` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seo_settings` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` json,
	`settingGroup` varchar(64) DEFAULT 'general',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`key` varchar(128) NOT NULL,
	`value` json,
	`type` varchar(32) DEFAULT 'string',
	`group` varchar(64) DEFAULT 'general',
	`label` varchar(255),
	`description` text,
	`isPublic` tinyint DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `starter_packs` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`tagline` varchar(255),
	`description` text,
	`featuredImage` text,
	`targetStage` enum('idea','pre_seed','seed','series_a','growth') DEFAULT 'seed',
	`targetRegion` varchar(64),
	`includedPerks` json,
	`includedTemplates` json,
	`includedTools` json,
	`includedPlaybooks` json,
	`totalValueDisplay` varchar(64),
	`isFeatured` tinyint DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subscriber_lists` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`subscriberId` int NOT NULL,
	`listId` int NOT NULL,
	`subscribedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`unsubscribedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`email` varchar(320) NOT NULL,
	`userId` int,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`subscriberType` enum('founder','investor','employee','job_seeker','journalist','general') DEFAULT 'general',
	`companyName` varchar(255),
	`jobTitle` varchar(128),
	`isVerified` tinyint DEFAULT 0,
	`verificationToken` varchar(64),
	`verifiedAt` timestamp,
	`source` varchar(64),
	`sourceUrl` text,
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(128),
	`preferredLanguage` varchar(10) DEFAULT 'en',
	`countryCode` varchar(2),
	`timezone` varchar(64),
	`status` enum('active','unsubscribed','bounced','complained') NOT NULL DEFAULT 'active',
	`unsubscribedAt` timestamp,
	`unsubscribeReason` text,
	`lastEmailSentAt` timestamp,
	`lastEmailOpenedAt` timestamp,
	`lastEmailClickedAt` timestamp,
	`emailsSent` int DEFAULT 0,
	`emailsOpened` int DEFAULT 0,
	`emailsClicked` int DEFAULT 0,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subscription_lists` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`frequency` enum('daily','weekly','biweekly','monthly','on_demand') DEFAULT 'weekly',
	`isPublic` tinyint DEFAULT 1,
	`isDefault` tinyint DEFAULT 0,
	`subscriberCount` int DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `suggested_updates` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`submitterUserId` int,
	`submitterName` varchar(255),
	`submitterEmail` varchar(320),
	`proposedChanges` json NOT NULL,
	`reason` text,
	`evidenceLinks` json,
	`evidenceDocumentId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderatorId` int,
	`moderatorNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`requesterType` enum('internal','external') NOT NULL DEFAULT 'external',
	`source` varchar(64) DEFAULT 'public_form'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`tagType` enum('product_tech','regulation','deal_business','sector','region','hub_program','investor','company','event','general') DEFAULT 'general',
	`isActive` tinyint DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `technical_seo_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coverage_id` int,
	`url` text NOT NULL,
	`page_type` varchar(64) NOT NULL DEFAULT 'article',
	`entity_type` varchar(64),
	`entity_id` int,
	`issue_category` enum('canonical','schema_markup','redirect_chain','hreflang','soft_404','meta_robots','duplicate_content','not_indexed','crawl_blocked','missing_sitemap','other') NOT NULL,
	`issue_type` varchar(128) NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`description` text,
	`auto_fixable` tinyint DEFAULT 0,
	`suggested_fix` text,
	`fix_payload` text,
	`fix_status` enum('pending','auto_fixed','manually_fixed','ignored','needs_review') NOT NULL DEFAULT 'pending',
	`fixed_at` timestamp,
	`fixed_by_id` int,
	`is_resolved` tinyint DEFAULT 0,
	`resolved_at` timestamp,
	`flagged_for_review` tinyint DEFAULT 0,
	`review_notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technical_seo_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `technical_seo_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_type` enum('weekly','daily','manual') NOT NULL DEFAULT 'weekly',
	`report_date` varchar(20) NOT NULL,
	`total_pages` int DEFAULT 0,
	`indexed_pages` int DEFAULT 0,
	`not_indexed_pages` int DEFAULT 0,
	`newly_indexed_pages` int DEFAULT 0,
	`new_issues_found` int DEFAULT 0,
	`issues_auto_fixed` int DEFAULT 0,
	`issues_flagged_for_review` int DEFAULT 0,
	`submissions_count` int DEFAULT 0,
	`submissions_succeeded` int DEFAULT 0,
	`issue_breakdown` text,
	`newly_indexed_urls` text,
	`persistent_issue_urls` text,
	`manual_review_urls` text,
	`report_narrative` text,
	`generated_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `technical_seo_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `topics` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`assignedById` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vendors` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`shortDescription` varchar(512),
	`logo` text,
	`website` text,
	`category` enum('legal','accounting','banking','hr','marketing','development','design','consulting','other') NOT NULL,
	`subcategory` varchar(128),
	`partnerId` int,
	`isVerified` tinyint DEFAULT 0,
	`isPartner` tinyint DEFAULT 0,
	`isFeatured` tinyint DEFAULT 0,
	`rating` decimal(3,2),
	`reviewCount` int DEFAULT 0,
	`priceRange` enum('$','$$','$$$','$$$$'),
	`services` json,
	`specializations` json,
	`targetStages` json,
	`regions` json,
	`contactEmail` varchar(320),
	`contactPhone` varchar(32),
	`address` text,
	`statusId` int NOT NULL DEFAULT 1,
	`viewCount` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`fromStatusId` int,
	`toStatusId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_statuses` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6B7280',
	`sortOrder` int DEFAULT 0,
	`workflowType` varchar(64) NOT NULL,
	`isInitial` tinyint DEFAULT 0,
	`isFinal` tinyint DEFAULT 0,
	`isPublished` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_transitions` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`workflowType` varchar(64) NOT NULL,
	`fromStatusId` int NOT NULL,
	`toStatusId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`allowedRoles` json NOT NULL,
	`requiresComment` tinyint DEFAULT 0,
	`notifyRoles` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wp_migration_log` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`wpPostId` int NOT NULL,
	`wpPostType` varchar(64) NOT NULL,
	`wpUrl` text NOT NULL,
	`newEntityType` varchar(64) NOT NULL,
	`newEntityId` int NOT NULL,
	`newUrl` text NOT NULL,
	`status` enum('success','redirect_created','failed') DEFAULT 'success',
	`notes` text,
	`migratedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `writer_applications` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`bio` text,
	`expertiseAreas` json,
	`writingSamples` json,
	`linkedinUrl` text,
	`twitterHandle` varchar(64),
	`portfolioUrl` text,
	`whyJoin` text,
	`proposedTopics` text,
	`status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedById` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `writer_payouts` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`writerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`paymentMethod` enum('bank_transfer','paypal','wise') NOT NULL,
	`paymentReference` varchar(255),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`periodMonth` varchar(7) NOT NULL,
	`processedAt` timestamp,
	`processedById` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `writer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`userId` int NOT NULL,
	`tier` enum('new','regular','senior','expert') NOT NULL DEFAULT 'new',
	`revenueShareRate` decimal(5,2) DEFAULT '40.00',
	`expertiseAreas` json,
	`bio` text,
	`totalArticles` int DEFAULT 0,
	`totalPageviews` int DEFAULT 0,
	`totalEarnings` decimal(15,2) DEFAULT '0.00',
	`paymentMethod` enum('bank_transfer','paypal','wise') DEFAULT 'bank_transfer',
	`paymentDetails` json,
	`taxFormType` varchar(16),
	`taxFormUrl` text,
	`taxFormVerified` tinyint DEFAULT 0,
	`status` enum('active','paused','terminated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','editor','senior_editor','author','moderator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `publicName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `authorBio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `twitterHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `company` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `website` text;--> statement-breakpoint
ALTER TABLE `users` ADD `interests` json;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLocations` json;--> statement-breakpoint
ALTER TABLE `users` ADD `salaryMin` int;--> statement-breakpoint
ALTER TABLE `users` ADD `salaryMax` int;--> statement-breakpoint
ALTER TABLE `users` ADD `cvUrl` text;--> statement-breakpoint
CREATE INDEX `acc_alumni_accel_id` ON `accelerator_alumni_companies` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_alumni_cohort_id` ON `accelerator_alumni_companies` (`cohort_id`);--> statement-breakpoint
CREATE INDEX `acc_benefits_accel_id` ON `accelerator_benefits` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_cohorts_accel_id` ON `accelerator_cohorts` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_deck_accel_id` ON `accelerator_deck_submissions` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_faqs_accel_id` ON `accelerator_faqs` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_milestones_accel_id` ON `accelerator_milestones` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_partners_accel_id` ON `accelerator_partners` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_programs_accel_id` ON `accelerator_programs` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_reminders_accel_id` ON `accelerator_reminders` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_stats_accel_id` ON `accelerator_stats` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_team_accel_id` ON `accelerator_team_members` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `acc_testimonials_accel_id` ON `accelerator_testimonials` (`accelerator_id`);--> statement-breakpoint
CREATE INDEX `accelerators_slug_unique` ON `accelerators` (`slug`);--> statement-breakpoint
CREATE INDEX `ad_freq_campaign_session` ON `ad_frequency_log` (`campaignId`,`sessionId`);--> statement-breakpoint
CREATE INDEX `ad_slots_slotKey_unique` ON `ad_slots` (`slotKey`);--> statement-breakpoint
CREATE INDEX `idx_ai_ab_test` ON `ai_ab_test_variants` (`test_name`);--> statement-breakpoint
CREATE INDEX `idx_ai_ab_article` ON `ai_ab_test_variants` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_crawl_source` ON `ai_agent_crawl_log` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_crawl_created_at` ON `ai_agent_crawl_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_discovered_source` ON `ai_agent_discovered_articles` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_discovered_status` ON `ai_agent_discovered_articles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_discovered_relevance` ON `ai_agent_discovered_articles` (`relevance_score`);--> statement-breakpoint
CREATE INDEX `idx_ai_discovered_fingerprint` ON `ai_agent_discovered_articles` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_ai_discovered_created_at` ON `ai_agent_discovered_articles` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_feedback_discovered` ON `ai_agent_editorial_feedback` (`discovered_article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_feedback_action` ON `ai_agent_editorial_feedback` (`action`);--> statement-breakpoint
CREATE INDEX `idx_ai_feedback_source` ON `ai_agent_editorial_feedback` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_feedback_editor` ON `ai_agent_editorial_feedback` (`editor_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_feedback_created_at` ON `ai_agent_editorial_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_entities_type` ON `ai_agent_entities` (`type`);--> statement-breakpoint
CREATE INDEX `idx_ai_entities_tier` ON `ai_agent_entities` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_ai_entities_country` ON `ai_agent_entities` (`country`);--> statement-breakpoint
CREATE INDEX `idx_ai_entities_name` ON `ai_agent_entities` (`name`);--> statement-breakpoint
CREATE INDEX `idx_ai_entities_active` ON `ai_agent_entities` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_ai_keywords_type` ON `ai_agent_keywords` (`keyword_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_keywords_language` ON `ai_agent_keywords` (`language`);--> statement-breakpoint
CREATE INDEX `idx_ai_keywords_active` ON `ai_agent_keywords` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_ai_keywords_keyword` ON `ai_agent_keywords` (`keyword`);--> statement-breakpoint
CREATE INDEX `idx_ai_llm_providers_enabled` ON `ai_agent_llm_providers` (`is_enabled`);--> statement-breakpoint
CREATE INDEX `idx_ai_llm_providers_priority` ON `ai_agent_llm_providers` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_ai_sources_active` ON `ai_agent_sources` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_ai_sources_last_crawled` ON `ai_agent_sources` (`last_crawled_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_taxonomy_tier` ON `ai_agent_taxonomy` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_ai_taxonomy_active` ON `ai_agent_taxonomy` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_ai_comp_source` ON `ai_competitor_articles` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_comp_gap` ON `ai_competitor_articles` (`coverage_gap`);--> statement-breakpoint
CREATE INDEX `idx_ai_calendar_date` ON `ai_content_calendar` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `idx_ai_calendar_status` ON `ai_content_calendar` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_templates_content_type` ON `ai_content_templates` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_templates_slug` ON `ai_content_templates` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_ai_ver_session` ON `ai_content_versions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_ver_article` ON `ai_content_versions` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_policies_content_type` ON `ai_editorial_policies` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_policies_slug` ON `ai_editorial_policies` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_ai_aliases_entity` ON `ai_entity_aliases` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_aliases_alias` ON `ai_entity_aliases` (`alias`);--> statement-breakpoint
CREATE INDEX `idx_ai_extractions_session` ON `ai_entity_extractions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_extractions_entity_type` ON `ai_entity_extractions` (`entity_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_extractions_match_status` ON `ai_entity_extractions` (`match_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_status` ON `ai_generation_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_content_type` ON `ai_generation_sessions` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_approval` ON `ai_generation_sessions` (`approval_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_created_at` ON `ai_generation_sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_article_id` ON `ai_generation_sessions` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_agent_source` ON `ai_generation_sessions` (`agent_source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_provider` ON `ai_llm_usage_logs` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_session` ON `ai_llm_usage_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_created_at` ON `ai_llm_usage_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_operation` ON `ai_llm_usage_logs` (`operation`);--> statement-breakpoint
CREATE INDEX `idx_ai_plag_session` ON `ai_plagiarism_checks` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_rev_article` ON `ai_revenue_attribution` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_rev_date` ON `ai_revenue_attribution` (`date`);--> statement-breakpoint
CREATE INDEX `idx_ai_social_article` ON `ai_social_posts` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_social_platform` ON `ai_social_posts` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_ai_tone_session` ON `ai_tone_analysis` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_wh_log_webhook` ON `ai_webhook_logs` (`webhook_id`);--> statement-breakpoint
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
CREATE INDEX `idx_company_awards_company` ON `company_awards` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_products_company` ON `company_products` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_updates_company` ON `company_updates` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_company_updates_created` ON `company_updates` (`created_at`);--> statement-breakpoint
CREATE INDEX `iso2` ON `countries` (`iso2`);--> statement-breakpoint
CREATE INDEX `iso3` ON `countries` (`iso3`);--> statement-breakpoint
CREATE INDEX `crawl_session_status_idx` ON `crawl_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `crawl_session_started_idx` ON `crawl_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `unique_user_digest` ON `email_digest_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `gsc_url_idx` ON `gsc_indexing_coverage` (`url`);--> statement-breakpoint
CREATE INDEX `gsc_status_idx` ON `gsc_indexing_coverage` (`coverage_status`);--> statement-breakpoint
CREATE INDEX `gsc_page_type_idx` ON `gsc_indexing_coverage` (`page_type`);--> statement-breakpoint
CREATE INDEX `homepage_blocks_slug_unique` ON `homepage_blocks` (`slug`);--> statement-breakpoint
CREATE INDEX `homepage_sections_slug_unique` ON `homepage_sections` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_article_id` ON `indexing_logs` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_created_at` ON `indexing_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_method` ON `indexing_logs` (`method`);--> statement-breakpoint
CREATE INDEX `idx_sub_url` ON `indexing_submissions` (`url`);--> statement-breakpoint
CREATE INDEX `idx_sub_created` ON `indexing_submissions` (`created_at`);--> statement-breakpoint
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
CREATE INDEX `search_analytics_query_idx` ON `search_analytics` (`query`);--> statement-breakpoint
CREATE INDEX `search_analytics_entity_idx` ON `search_analytics` (`entity_type`);--> statement-breakpoint
CREATE INDEX `search_analytics_date_idx` ON `search_analytics` (`searched_at`);--> statement-breakpoint
CREATE INDEX `search_analytics_user_idx` ON `search_analytics` (`user_id`);--> statement-breakpoint
CREATE INDEX `sectors_slug_unique` ON `sectors` (`slug`);--> statement-breakpoint
CREATE INDEX `auditId` ON `seo_audit_history` (`auditId`);--> statement-breakpoint
CREATE INDEX `issue_id_idx` ON `seo_audit_ignored_issues` (`issue_id`);--> statement-breakpoint
CREATE INDEX `seo_settings_key_unique` ON `seo_settings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `starter_packs_slug_unique` ON `starter_packs` (`slug`);--> statement-breakpoint
CREATE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
CREATE INDEX `subscription_lists_slug_unique` ON `subscription_lists` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `tech_seo_url_idx` ON `technical_seo_issues` (`url`);--> statement-breakpoint
CREATE INDEX `tech_seo_category_idx` ON `technical_seo_issues` (`issue_category`);--> statement-breakpoint
CREATE INDEX `tech_seo_status_idx` ON `technical_seo_issues` (`fix_status`);--> statement-breakpoint
CREATE INDEX `tech_report_date_idx` ON `technical_seo_reports` (`report_date`);--> statement-breakpoint
CREATE INDEX `tech_report_type_idx` ON `technical_seo_reports` (`report_type`);--> statement-breakpoint
CREATE INDEX `topics_slug_unique` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_vendors_category` ON `vendors` (`category`);--> statement-breakpoint
CREATE INDEX `idx_vendors_partner` ON `vendors` (`partnerId`);--> statement-breakpoint
CREATE INDEX `idx_vendors_status` ON `vendors` (`statusId`);--> statement-breakpoint
CREATE INDEX `slug` ON `vendors` (`slug`);--> statement-breakpoint
CREATE INDEX `writer_profiles_userId_unique` ON `writer_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_username_unique` ON `users` (`username`);