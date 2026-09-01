-- Editorial batch provenance and media rights metadata.
-- Additive only: no existing article, media, event, or taxonomy data is changed.

ALTER TABLE `media`
  ADD COLUMN `credit` varchar(512),
  ADD COLUMN `sourceUrl` text,
  ADD COLUMN `license` varchar(128),
  ADD COLUMN `rightsStatus` enum('owned','licensed','editorial_use','generated','pending_review') NOT NULL DEFAULT 'pending_review',
  ADD COLUMN `rightsNotes` text;

CREATE TABLE `editorial_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batchKey` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('draft','ready_for_review','approved','importing','imported','failed') NOT NULL DEFAULT 'draft',
  `requestedArticleCount` int NOT NULL DEFAULT 0,
  `importedArticleCount` int NOT NULL DEFAULT 0,
  `metadata` json,
  `createdById` int,
  `approvedById` int,
  `approvedAt` timestamp NULL,
  `importedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `editorial_batches_batchKey_unique` (`batchKey`),
  KEY `idx_editorial_batches_status` (`status`)
);

CREATE TABLE `article_editorial_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batchId` int NOT NULL,
  `articleId` int NOT NULL,
  `sequence` int NOT NULL,
  `sourceCandidateId` varchar(32),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `article_editorial_batches_article_unique` (`articleId`),
  UNIQUE KEY `article_editorial_batches_sequence_unique` (`batchId`, `sequence`),
  KEY `idx_article_editorial_batches_batch` (`batchId`)
);

CREATE TABLE `article_source_references` (
  `id` int NOT NULL AUTO_INCREMENT,
  `articleId` int NOT NULL,
  `sourceType` enum('primary','supporting') NOT NULL DEFAULT 'supporting',
  `title` varchar(512),
  `url` text NOT NULL,
  `publisher` varchar(255),
  `publishedAt` timestamp NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_article_source_references_article` (`articleId`),
  KEY `idx_article_source_references_type` (`articleId`, `sourceType`)
);
