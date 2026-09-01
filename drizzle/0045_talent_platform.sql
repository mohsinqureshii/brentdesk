-- Talent Platform Phase 2–8 — full backend schema landing
-- ----------------------------------------------------------------------
-- One migration covering every table the talent product needs end-to-end.
-- Keeping this atomic (vs seven small migrations) so the SaaS surface
-- comes up consistent in a single deploy; tenant-aware queries can rely
-- on the full graph existing.
--
-- Tables added (28):
--   Phase 2: candidates, candidate_tenant_visibility, resume_parses
--   Phase 3: pipeline_stages, candidate_stage_history, interviews,
--            interview_feedback, offers, recruiter_notes
--   Phase 4: github_profiles, github_repos, github_signals,
--            github_fetch_jobs
--   Phase 5: assessment_templates, assessment_questions,
--            assessment_attempts, assessment_attempt_answers,
--            assessment_code_runs, ai_interview_sessions,
--            ai_interview_turns, plagiarism_reports
--   Phase 6: candidate_scores, candidate_embeddings_meta,
--            job_embeddings_meta
--   Phase 7: tenant_billing_subscriptions
--   Phase 8: pii_access_log, candidate_erasure_requests,
--            retention_policies

-- ============================================================
-- Phase 2 — Candidate core
-- ============================================================

CREATE TABLE IF NOT EXISTS `candidates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NULL,                                                                              -- NULL = global candidate pool (legacy)
  `user_id` int NOT NULL,
  `headline` varchar(255) NULL,
  `current_title` varchar(255) NULL,
  `current_company` varchar(255) NULL,
  `years_experience` int NULL,
  `location` varchar(255) NULL,
  `country_id` int NULL,
  `city_id` int NULL,
  `open_to_remote` tinyint NOT NULL DEFAULT 0,
  `open_to_relocation` tinyint NOT NULL DEFAULT 0,
  `salary_expectation_min` decimal(12,2) NULL,
  `salary_expectation_max` decimal(12,2) NULL,
  `salary_expectation_currency` varchar(3) NULL DEFAULT 'USD',
  `visa_status` varchar(64) NULL,
  `notice_period` varchar(64) NULL,
  `github_handle` varchar(128) NULL,
  `linkedin_url` text NULL,
  `portfolio_url` text NULL,
  `resume_media_id` int NULL,                                                                        -- FK media.id
  `parsed_resume_json` json NULL,                                                                    -- LLM-extracted structured profile
  `parsed_resume_at` timestamp NULL,
  `summary` text NULL,                                                                               -- AI-generated short bio
  `consent_data_processing_at` timestamp NULL,
  `consent_marketing_at` timestamp NULL,
  `consent_third_party_at` timestamp NULL,
  `is_archived` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_active_at` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidates_tenant_user_unique` (`tenant_id`, `user_id`),
  KEY `idx_candidates_user` (`user_id`),
  KEY `idx_candidates_tenant_active` (`tenant_id`, `is_archived`, `last_active_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `candidate_tenant_visibility` (
  `id` int NOT NULL AUTO_INCREMENT,
  `candidate_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `source` enum('signup','referral','imported','application','admin') NOT NULL DEFAULT 'signup',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cv_candidate_tenant_unique` (`candidate_id`, `tenant_id`),
  KEY `idx_cv_tenant` (`tenant_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `resume_parses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `candidate_id` int NOT NULL,
  `media_id` int NOT NULL,
  `provider` varchar(32) NULL,                                                                       -- which LLM ran the parse
  `model` varchar(64) NULL,
  `raw_text` text NULL,                                                                              -- text we extracted before LLM normalization
  `parsed_json` json NULL,
  `quality_score` int NULL,                                                                          -- 0–100 — heuristic completeness score
  `error` text NULL,
  `latency_ms` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resume_parses_candidate` (`candidate_id`)
);
--> statement-breakpoint

-- ============================================================
-- Phase 3 — ATS pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS `pipeline_stages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `job_id` int NULL,                                                                                 -- NULL = tenant-wide default pipeline; non-null = per-job override
  `name` varchar(128) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `position` int NOT NULL,
  `color` varchar(16) NULL,
  `category` enum('sourcing','screening','interviewing','offer','hired','rejected') NOT NULL DEFAULT 'screening',
  `is_terminal` tinyint NOT NULL DEFAULT 0,
  `is_default` tinyint NOT NULL DEFAULT 0,
  `auto_email_template_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pipeline_tenant_job` (`tenant_id`, `job_id`, `position`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `candidate_stage_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `application_id` int NOT NULL,                                                                     -- FK job_applications.id
  `from_stage_id` int NULL,
  `to_stage_id` int NOT NULL,
  `moved_by_id` int NOT NULL,
  `reason` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_csh_application` (`application_id`),
  KEY `idx_csh_tenant_created` (`tenant_id`, `created_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `interviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `application_id` int NOT NULL,
  `stage_id` int NULL,
  `type` enum('phone_screen','technical','system_design','behavioral','culture','final','ai_interview') NOT NULL DEFAULT 'phone_screen',
  `scheduled_at` timestamp NULL,
  `duration_minutes` int NULL,
  `location` varchar(255) NULL,
  `meeting_url` text NULL,
  `assigned_interviewer_ids` json NULL,                                                              -- array of user ids
  `status` enum('scheduled','rescheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `created_by_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_interviews_application` (`application_id`),
  KEY `idx_interviews_tenant_scheduled` (`tenant_id`, `scheduled_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `interview_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `interview_id` int NOT NULL,
  `interviewer_id` int NOT NULL,
  `overall_rating` int NULL,                                                                         -- 1–5
  `technical_rating` int NULL,
  `communication_rating` int NULL,
  `culture_rating` int NULL,
  `recommendation` enum('strong_hire','hire','no_hire','strong_no_hire','unsure') NULL,
  `strengths` text NULL,
  `concerns` text NULL,
  `notes` text NULL,
  `submitted_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `if_interview_interviewer_unique` (`interview_id`, `interviewer_id`),
  KEY `idx_if_tenant` (`tenant_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `application_id` int NOT NULL,
  `extended_by_id` int NOT NULL,
  `base_salary` decimal(12,2) NULL,
  `bonus` decimal(12,2) NULL,
  `equity` text NULL,
  `currency` varchar(3) NULL DEFAULT 'USD',
  `start_date` date NULL,
  `expires_at` timestamp NULL,
  `status` enum('drafted','sent','accepted','declined','withdrawn','expired') NOT NULL DEFAULT 'drafted',
  `letter_body` text NULL,
  `decline_reason` text NULL,
  `responded_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offers_application` (`application_id`),
  KEY `idx_offers_tenant_status` (`tenant_id`, `status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `recruiter_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `application_id` int NULL,
  `candidate_id` int NULL,                                                                           -- one of (application_id, candidate_id) is set
  `author_id` int NOT NULL,
  `body` text NOT NULL,
  `visibility` enum('private','team','tenant') NOT NULL DEFAULT 'team',
  `mentions` json NULL,                                                                              -- array of user ids @mentioned
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rn_application` (`application_id`),
  KEY `idx_rn_candidate` (`candidate_id`),
  KEY `idx_rn_tenant_created` (`tenant_id`, `created_at`)
);
--> statement-breakpoint

-- Link applications into the pipeline by adding stage_id directly.
-- Avoids a separate "applications_in_pipeline" table — applications
-- always have a single current stage.
ALTER TABLE `job_applications` ADD COLUMN `current_stage_id` int NULL;
--> statement-breakpoint

ALTER TABLE `job_applications` ADD KEY `idx_job_apps_stage` (`current_stage_id`);
--> statement-breakpoint

-- ============================================================
-- Phase 4 — GitHub Intelligence
-- ============================================================

CREATE TABLE IF NOT EXISTS `github_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `candidate_id` int NOT NULL,
  `github_user_id` bigint NOT NULL,                                                                  -- stable across handle changes
  `handle` varchar(128) NOT NULL,
  `name` varchar(255) NULL,
  `bio` text NULL,
  `avatar_url` text NULL,
  `company` varchar(255) NULL,
  `location` varchar(255) NULL,
  `followers` int NULL,
  `following` int NULL,
  `public_repos` int NULL,
  `created_on_github_at` timestamp NULL,
  `oauth_access_token_encrypted` text NULL,                                                          -- encrypted at rest (envelope encryption planned)
  `oauth_refresh_token_encrypted` text NULL,
  `oauth_scopes` json NULL,
  `installation_id` bigint NULL,                                                                     -- GitHub App installation id
  `last_synced_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `github_profiles_candidate_unique` (`candidate_id`),
  UNIQUE KEY `github_profiles_user_unique` (`github_user_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `github_repos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `github_repo_id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `full_name` varchar(512) NOT NULL,
  `description` text NULL,
  `is_fork` tinyint NOT NULL DEFAULT 0,
  `primary_language` varchar(64) NULL,
  `languages` json NULL,                                                                             -- {js: 12000, ts: 8000}
  `stars` int NULL,
  `forks` int NULL,
  `open_issues` int NULL,
  `last_push_at` timestamp NULL,
  `topics` json NULL,
  `homepage` text NULL,
  `commit_count_30d` int NULL,
  `commit_count_total` int NULL,
  `is_archived` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `github_repos_profile_repo_unique` (`profile_id`, `github_repo_id`),
  KEY `idx_github_repos_lang` (`primary_language`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `github_signals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `signal_type` enum('language_distribution','contribution_cadence','project_velocity','collaboration','tech_stack','open_source_impact','ai_summary') NOT NULL,
  `payload` json NOT NULL,
  `score` int NULL,                                                                                  -- 0–100 if applicable
  `computed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gh_signals_profile_type` (`profile_id`, `signal_type`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `github_fetch_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `job_type` enum('initial_sync','incremental','signals_compute','manual_refresh') NOT NULL,
  `status` enum('queued','running','completed','failed','retrying') NOT NULL DEFAULT 'queued',
  `attempts` int NOT NULL DEFAULT 0,
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `error` text NULL,
  `payload` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gfj_profile` (`profile_id`),
  KEY `idx_gfj_status` (`status`, `created_at`)
);
--> statement-breakpoint

-- ============================================================
-- Phase 5 — Assessment engine
-- ============================================================

CREATE TABLE IF NOT EXISTS `assessment_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text NULL,
  `category` enum('coding','system_design','technical_screen','behavioral','ai_interview','custom') NOT NULL DEFAULT 'coding',
  `duration_minutes` int NOT NULL DEFAULT 60,
  `pass_threshold` int NULL,                                                                         -- 0–100
  `total_points` int NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `at_tenant_slug_unique` (`tenant_id`, `slug`),
  KEY `idx_at_tenant_active` (`tenant_id`, `is_active`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `assessment_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `type` enum('coding','multiple_choice','short_answer','long_answer','system_design','file_upload') NOT NULL,
  `prompt` text NOT NULL,
  `starter_code` text NULL,
  `language` varchar(32) NULL,                                                                       -- python | javascript | typescript | java | go | cpp | sql
  `test_cases` json NULL,                                                                            -- coding only — [{input, expectedOutput, hidden}]
  `choices` json NULL,                                                                               -- mcq only
  `correct_choice_keys` json NULL,                                                                   -- mcq only — ["A","C"]
  `rubric` text NULL,                                                                                -- LLM grading rubric
  `points` int NOT NULL DEFAULT 10,
  `time_limit_seconds` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aq_template` (`template_id`, `position`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `assessment_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `template_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `application_id` int NULL,                                                                         -- may be assigned outside a job context
  `invited_by_id` int NOT NULL,
  `invite_token` varchar(128) NOT NULL,
  `expires_at` timestamp NULL,
  `started_at` timestamp NULL,
  `submitted_at` timestamp NULL,
  `expired_at` timestamp NULL,
  `status` enum('invited','in_progress','submitted','expired','graded','disqualified') NOT NULL DEFAULT 'invited',
  `total_score` int NULL,                                                                            -- 0–100
  `passed` tinyint NULL,
  `proctor_violations` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aa_invite_token_unique` (`invite_token`),
  KEY `idx_aa_candidate` (`candidate_id`),
  KEY `idx_aa_tenant_status` (`tenant_id`, `status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `assessment_attempt_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attempt_id` int NOT NULL,
  `question_id` int NOT NULL,
  `answer_text` text NULL,
  `answer_code` text NULL,
  `selected_choice_keys` json NULL,
  `time_spent_seconds` int NULL,
  `score` int NULL,
  `auto_graded` tinyint NOT NULL DEFAULT 0,
  `llm_feedback` text NULL,
  `graded_by_id` int NULL,
  `graded_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aaa_attempt_question_unique` (`attempt_id`, `question_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `assessment_code_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `answer_id` int NOT NULL,
  `language` varchar(32) NOT NULL,
  `source_code` text NOT NULL,
  `stdin` text NULL,
  `expected_stdout` text NULL,
  `judge0_token` varchar(64) NULL,
  `status_id` int NULL,                                                                              -- Judge0 status id
  `status_description` varchar(64) NULL,
  `stdout` text NULL,
  `stderr` text NULL,
  `compile_output` text NULL,
  `runtime_ms` int NULL,
  `memory_kb` int NULL,
  `passed` tinyint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_acr_answer` (`answer_id`),
  KEY `idx_acr_token` (`judge0_token`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `ai_interview_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `attempt_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `template_id` int NOT NULL,
  `provider` varchar(32) NULL,
  `model` varchar(64) NULL,
  `system_prompt` text NULL,
  `current_turn` int NOT NULL DEFAULT 0,
  `total_turns` int NOT NULL DEFAULT 0,
  `status` enum('active','completed','abandoned','timed_out') NOT NULL DEFAULT 'active',
  `summary` text NULL,
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ais_attempt_unique` (`attempt_id`),
  KEY `idx_ais_candidate` (`candidate_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `ai_interview_turns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `turn_index` int NOT NULL,
  `role` enum('interviewer','candidate') NOT NULL,
  `content` text NOT NULL,
  `token_count` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ait_session_turn` (`session_id`, `turn_index`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `plagiarism_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attempt_id` int NOT NULL,
  `answer_id` int NOT NULL,
  `method` enum('token_shingle','embedding_similarity','exact_match') NOT NULL,
  `similarity_score` decimal(5,4) NULL,
  `matched_source` text NULL,
  `details` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pr_attempt` (`attempt_id`)
);
--> statement-breakpoint

-- ============================================================
-- Phase 6 — Scoring + Matching
-- ============================================================

CREATE TABLE IF NOT EXISTS `candidate_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `job_id` int NULL,                                                                                 -- NULL = candidate-level score; non-null = job-specific composite
  `composite_score` decimal(6,2) NULL,                                                               -- 0–100
  `resume_score` decimal(6,2) NULL,
  `github_score` decimal(6,2) NULL,
  `assessment_score` decimal(6,2) NULL,
  `match_score` decimal(6,2) NULL,
  `weights` json NULL,                                                                               -- {resume:0.3, github:0.2, assessment:0.3, match:0.2}
  `explanation` text NULL,                                                                           -- LLM-generated explanation
  `computed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cs_candidate_job` (`candidate_id`, `job_id`),
  KEY `idx_cs_tenant_score` (`tenant_id`, `composite_score`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `candidate_embeddings_meta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `provider` varchar(32) NOT NULL,
  `model` varchar(64) NOT NULL,
  `dim` int NOT NULL,
  `qdrant_point_id` varchar(64) NOT NULL,                                                            -- the actual vector lives in Qdrant
  `payload_hash` varchar(64) NULL,                                                                   -- cache key over the embedded text
  `indexed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cem_candidate_unique` (`candidate_id`),
  KEY `idx_cem_tenant` (`tenant_id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `job_embeddings_meta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NULL,
  `job_id` int NOT NULL,
  `provider` varchar(32) NOT NULL,
  `model` varchar(64) NOT NULL,
  `dim` int NOT NULL,
  `qdrant_point_id` varchar(64) NOT NULL,
  `payload_hash` varchar(64) NULL,
  `indexed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jem_job_unique` (`job_id`),
  KEY `idx_jem_tenant` (`tenant_id`)
);
--> statement-breakpoint

-- ============================================================
-- Phase 7 — Tenant billing
-- ============================================================

CREATE TABLE IF NOT EXISTS `tenant_billing_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `stripe_customer_id` varchar(128) NULL,
  `stripe_subscription_id` varchar(128) NULL,
  `plan` enum('free','starter','growth','enterprise') NOT NULL DEFAULT 'free',
  `status` enum('trialing','active','past_due','cancelled','unpaid','incomplete') NOT NULL DEFAULT 'trialing',
  `seats_purchased` int NOT NULL DEFAULT 1,
  `seats_used` int NOT NULL DEFAULT 0,
  `current_period_start` timestamp NULL,
  `current_period_end` timestamp NULL,
  `cancel_at_period_end` tinyint NOT NULL DEFAULT 0,
  `last_payload` json NULL,                                                                          -- latest webhook payload for debug
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tbs_tenant_unique` (`tenant_id`),
  UNIQUE KEY `tbs_stripe_subscription_unique` (`stripe_subscription_id`)
);
--> statement-breakpoint

-- ============================================================
-- Phase 8 — Compliance
-- ============================================================

CREATE TABLE IF NOT EXISTS `pii_access_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NULL,
  `actor_user_id` int NOT NULL,
  `actor_role` varchar(64) NULL,
  `subject_type` enum('candidate','application','resume','assessment_attempt','github_profile') NOT NULL,
  `subject_id` int NOT NULL,
  `action` enum('read','export','update','delete','consent') NOT NULL,
  `ip_address` varchar(45) NULL,
  `user_agent` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pal_subject` (`subject_type`, `subject_id`),
  KEY `idx_pal_actor_created` (`actor_user_id`, `created_at`),
  KEY `idx_pal_tenant_created` (`tenant_id`, `created_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `candidate_erasure_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NULL,
  `candidate_id` int NOT NULL,
  `requested_by_id` int NOT NULL,
  `requester_email` varchar(320) NULL,
  `legal_basis` varchar(128) NULL,                                                                   -- gdpr_article_17 | ccpa | pdpl | tenant_request
  `status` enum('pending','approved','executed','rejected','expired') NOT NULL DEFAULT 'pending',
  `grace_period_ends_at` timestamp NULL,                                                             -- 30d default; hard-delete after
  `executed_at` timestamp NULL,
  `rejection_reason` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cer_candidate` (`candidate_id`),
  KEY `idx_cer_tenant_status` (`tenant_id`, `status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `retention_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `subject_type` enum('candidate','application','assessment_attempt','interview') NOT NULL,
  `retention_days` int NOT NULL,
  `applies_when` enum('after_last_activity','after_status_terminal','after_creation') NOT NULL DEFAULT 'after_last_activity',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rp_tenant_subject_unique` (`tenant_id`, `subject_type`),
  KEY `idx_rp_tenant_active` (`tenant_id`, `is_active`)
);
