-- Event platform v3: FAQs, press coverage, richer organiser, entity-linked
-- sponsors, agenda imagery, and publicly submitted side events.
-- Purely additive — safe for the startup additive-tail reconciler.

CREATE TABLE IF NOT EXISTS `event_faqs` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `eventId` int NOT NULL,
  `question` varchar(512) NOT NULL,
  `answer` text NOT NULL,
  `sortOrder` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_event_faqs_event` (`eventId`, `sortOrder`)
);
--> statement-breakpoint
-- Press/media coverage of an event: either an external URL or an asset
-- uploaded to R2 (report PDFs, photo sets).
CREATE TABLE IF NOT EXISTS `event_coverage` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `eventId` int NOT NULL,
  `title` varchar(512) NOT NULL,
  `url` text NOT NULL,
  `coverageType` enum('article','video','photos','report','press_release','social','other') NOT NULL DEFAULT 'article',
  `sourceName` varchar(255),
  `imageUrl` text,
  `isUploaded` tinyint NOT NULL DEFAULT 0,
  `publishedAt` timestamp NULL,
  `sortOrder` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_event_coverage_event` (`eventId`, `sortOrder`)
);
--> statement-breakpoint
-- Sponsors can now point at a real company/investor record instead of
-- being free text, so logos and links stay correct site-wide.
ALTER TABLE `event_sponsors`
  ADD COLUMN `companyId` int NULL,
  ADD COLUMN `investorId` int NULL,
  ADD COLUMN `description` text,
  ADD COLUMN `isConfirmed` tinyint NOT NULL DEFAULT 1;
--> statement-breakpoint
-- Agenda sessions gain imagery and multi-speaker support (speakerIds is
-- a JSON array of event_speakers ids; the legacy single speakerId stays
-- for backwards compatibility).
ALTER TABLE `event_schedule`
  ADD COLUMN `imageUrl` text,
  ADD COLUMN `speakerIds` json,
  ADD COLUMN `isFeatured` tinyint NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Side events: richer detail plus a public submission/approval workflow.
ALTER TABLE `event_side_events`
  ADD COLUMN `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  ADD COLUMN `submittedByUserId` int NULL,
  ADD COLUMN `submitterName` varchar(255),
  ADD COLUMN `submitterEmail` varchar(255),
  ADD COLUMN `submitterOrganisation` varchar(255),
  ADD COLUMN `websiteUrl` text,
  ADD COLUMN `imageUrl` text,
  ADD COLUMN `sideEventType` enum('side_event','workshop','networking','party','dinner','tour','other') NOT NULL DEFAULT 'side_event',
  ADD COLUMN `isFree` tinyint NOT NULL DEFAULT 1,
  ADD COLUMN `moderationNotes` text,
  ADD COLUMN `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
--> statement-breakpoint
CREATE INDEX `idx_event_side_events_status` ON `event_side_events` (`eventId`, `status`);
--> statement-breakpoint
-- Organiser profile on the event itself.
ALTER TABLE `events`
  ADD COLUMN `organizerDescription` text,
  ADD COLUMN `organizerContactEmail` varchar(255),
  ADD COLUMN `organizerCompanyId` int NULL;
