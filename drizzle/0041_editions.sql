-- Editions: Reuters-style country-anchored views of the site
-- (Saudi Arabia / UAE / Qatar / Bahrain / Kuwait / Oman / Egypt /
--  Pakistan / Turkey / International). Drives header switcher +
--  country-aware list ordering. Adminconfigurable via /admin/editions.

CREATE TABLE IF NOT EXISTS `editions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `country_id` int NULL,
  `name` varchar(64) NOT NULL,
  `slug` varchar(32) NOT NULL,
  `flag_emoji` varchar(8) NULL,
  `is_international` tinyint DEFAULT 0 NOT NULL,
  `is_active` tinyint DEFAULT 1 NOT NULL,
  `supported_locales` json DEFAULT ('["en"]'),
  `sort_order` int DEFAULT 0 NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `editions_id` PRIMARY KEY(`id`),
  CONSTRAINT `editions_slug_unique` UNIQUE(`slug`),
  CONSTRAINT `editions_country_id_unique` UNIQUE(`country_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_editions_active_sort` ON `editions` (`is_active`, `sort_order`);
--> statement-breakpoint

-- Seed the 10 launch editions. Country IDs are resolved by iso2
-- against the existing `countries` table so this migration is safe
-- regardless of the actual id values per environment.
INSERT INTO `editions` (`country_id`, `name`, `slug`, `flag_emoji`, `is_international`, `is_active`, `supported_locales`, `sort_order`)
SELECT id, 'Saudi Arabia', 'sa', '🇸🇦', 0, 1, JSON_ARRAY('en','ar'), 10 FROM `countries` WHERE iso2 = 'SA'
UNION ALL
SELECT id, 'UAE', 'ae', '🇦🇪', 0, 1, JSON_ARRAY('en','ar'), 20 FROM `countries` WHERE iso2 = 'AE'
UNION ALL
SELECT id, 'Qatar', 'qa', '🇶🇦', 0, 1, JSON_ARRAY('en','ar'), 30 FROM `countries` WHERE iso2 = 'QA'
UNION ALL
SELECT id, 'Bahrain', 'bh', '🇧🇭', 0, 1, JSON_ARRAY('en','ar'), 40 FROM `countries` WHERE iso2 = 'BH'
UNION ALL
SELECT id, 'Kuwait', 'kw', '🇰🇼', 0, 1, JSON_ARRAY('en','ar'), 50 FROM `countries` WHERE iso2 = 'KW'
UNION ALL
SELECT id, 'Oman', 'om', '🇴🇲', 0, 1, JSON_ARRAY('en','ar'), 60 FROM `countries` WHERE iso2 = 'OM'
UNION ALL
SELECT id, 'Egypt', 'eg', '🇪🇬', 0, 1, JSON_ARRAY('en','ar'), 70 FROM `countries` WHERE iso2 = 'EG'
UNION ALL
SELECT id, 'Pakistan', 'pk', '🇵🇰', 0, 1, JSON_ARRAY('en'), 80 FROM `countries` WHERE iso2 = 'PK'
UNION ALL
SELECT id, 'Turkey', 'tr', '🇹🇷', 0, 1, JSON_ARRAY('en','tr'), 90 FROM `countries` WHERE iso2 = 'TR';
--> statement-breakpoint

-- International is the only edition with country_id NULL. It's the
-- catch-all for visitors whose country isn't a configured edition,
-- and the version Googlebot + other crawlers always see.
INSERT INTO `editions` (`country_id`, `name`, `slug`, `flag_emoji`, `is_international`, `is_active`, `supported_locales`, `sort_order`)
VALUES (NULL, 'International', 'intl', '🌍', 1, 1, JSON_ARRAY('en'), 100);
