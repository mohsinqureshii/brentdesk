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
CREATE TABLE IF NOT EXISTS `ad_blocklist` (
	`id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
	`type` enum('domain','keyword','category') NOT NULL,
	`value` varchar(255) NOT NULL,
	`reason` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
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
ALTER TABLE `accelerators` ADD `mission` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `program_details` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `application_process` text;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `cohort_size` varchar(50);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `investment_range` varchar(100);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `equity_taken` varchar(50);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `success_rate` varchar(50);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `total_funded` int;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `total_raised_by_alumni` varchar(100);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `avg_followon` varchar(100);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `team_members` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `partners` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `notable_alumni` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `social_links` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `contact_email` varchar(255);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `contact_phone` varchar(50);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `youtube` varchar(512);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `cover_image` varchar(512);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `gallery` json;--> statement-breakpoint
ALTER TABLE `accelerators` ADD `next_cohort_date` varchar(100);--> statement-breakpoint
ALTER TABLE `accelerators` ADD `program_length_detail` varchar(50);--> statement-breakpoint
ALTER TABLE `articles` ADD `auto_generated` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `articles` ADD `discovered_article_id` int;--> statement-breakpoint
ALTER TABLE `investors` ADD `mission` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `investment_philosophy` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `team_members` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `office_locations` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `social_links` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `awards` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `key_metrics` json;--> statement-breakpoint
ALTER TABLE `investors` ADD `application_process` text;--> statement-breakpoint
ALTER TABLE `investors` ADD `contact_email` varchar(255);--> statement-breakpoint
ALTER TABLE `investors` ADD `contact_phone` varchar(50);--> statement-breakpoint
ALTER TABLE `investors` ADD `youtube` varchar(512);--> statement-breakpoint
ALTER TABLE `people` ADD `achievements` json;--> statement-breakpoint
ALTER TABLE `people` ADD `angel_investments` json;--> statement-breakpoint
ALTER TABLE `people` ADD `board_roles` json;--> statement-breakpoint
ALTER TABLE `people` ADD `advisor_roles` json;--> statement-breakpoint
ALTER TABLE `people` ADD `companies_founded` json;--> statement-breakpoint
ALTER TABLE `people` ADD `key_achievements` json;--> statement-breakpoint
ALTER TABLE `people` ADD `interests` json;--> statement-breakpoint
ALTER TABLE `people` ADD `availability` varchar(100);--> statement-breakpoint
ALTER TABLE `people` ADD `booking_rate` varchar(50);--> statement-breakpoint
ALTER TABLE `people` ADD `facebook` varchar(512);--> statement-breakpoint
ALTER TABLE `people` ADD `instagram` varchar(512);--> statement-breakpoint
ALTER TABLE `people` ADD `youtube` varchar(512);--> statement-breakpoint
ALTER TABLE `people` ADD `github` varchar(512);--> statement-breakpoint
ALTER TABLE `seo_meta` ADD `metaKeywords` varchar(512);--> statement-breakpoint
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
CREATE INDEX `ad_freq_campaign_session` ON `ad_frequency_log` (`campaignId`,`sessionId`);--> statement-breakpoint
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
CREATE INDEX `crawl_session_status_idx` ON `crawl_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `crawl_session_started_idx` ON `crawl_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `gsc_url_idx` ON `gsc_indexing_coverage` (`url`);--> statement-breakpoint
CREATE INDEX `gsc_status_idx` ON `gsc_indexing_coverage` (`coverage_status`);--> statement-breakpoint
CREATE INDEX `gsc_page_type_idx` ON `gsc_indexing_coverage` (`page_type`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_article_id` ON `indexing_logs` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_created_at` ON `indexing_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_indexing_logs_method` ON `indexing_logs` (`method`);--> statement-breakpoint
CREATE INDEX `idx_sub_url` ON `indexing_submissions` (`url`);--> statement-breakpoint
CREATE INDEX `idx_sub_created` ON `indexing_submissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `search_analytics_query_idx` ON `search_analytics` (`query`);--> statement-breakpoint
CREATE INDEX `search_analytics_entity_idx` ON `search_analytics` (`entity_type`);--> statement-breakpoint
CREATE INDEX `search_analytics_date_idx` ON `search_analytics` (`searched_at`);--> statement-breakpoint
CREATE INDEX `search_analytics_user_idx` ON `search_analytics` (`user_id`);--> statement-breakpoint
CREATE INDEX `issue_id_idx` ON `seo_audit_ignored_issues` (`issue_id`);--> statement-breakpoint
CREATE INDEX `tech_seo_url_idx` ON `technical_seo_issues` (`url`);--> statement-breakpoint
CREATE INDEX `tech_seo_category_idx` ON `technical_seo_issues` (`issue_category`);--> statement-breakpoint
CREATE INDEX `tech_seo_status_idx` ON `technical_seo_issues` (`fix_status`);--> statement-breakpoint
CREATE INDEX `tech_report_date_idx` ON `technical_seo_reports` (`report_date`);--> statement-breakpoint
CREATE INDEX `tech_report_type_idx` ON `technical_seo_reports` (`report_type`);