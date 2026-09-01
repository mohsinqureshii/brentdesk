-- Events Hub v2 — schema additions
-- ----------------------------------------------------------------------
-- Adds the supporting infrastructure for the Events Hub redesign:
--   - Ticketing (tiers, orders, items, promo codes, external clicks)
--   - Live coverage (live posts, recordings)
--   - Engagement (attendees / RSVP)
--   - Roles (event correspondents per-event + role enum additions)
--   - Public submissions with AI moderation
--   - New columns on events table for live mode + ticket provider

-- ============================================================
-- events table additions
-- ============================================================
ALTER TABLE `events`
  ADD COLUMN `ticketProvider` enum('internal','eventbrite','luma','external','none') DEFAULT 'none',
  ADD COLUMN `externalTicketUrl` text,
  ADD COLUMN `liveModeStartOverride` timestamp NULL,
  ADD COLUMN `liveModeEndOverride` timestamp NULL,
  ADD COLUMN `liveModeForce` enum('pre','live','post') NULL,
  ADD COLUMN `recapArticleId` int NULL,
  ADD COLUMN `ticketsSoldCount` int DEFAULT 0,
  ADD COLUMN `ticketsRevenueCents` int DEFAULT 0;
--> statement-breakpoint

-- ============================================================
-- users.role enum — add event_correspondent + event_tenant
-- ============================================================
ALTER TABLE `users`
  MODIFY COLUMN `role` enum('user','admin','editor','senior_editor','author','moderator','event_correspondent','event_tenant') NOT NULL DEFAULT 'user';
--> statement-breakpoint

-- ============================================================
-- event_tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_tickets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text,
  `priceCents` int NOT NULL,
  `currency` varchar(3) DEFAULT 'USD' NOT NULL,
  `capacity` int,
  `soldCount` int DEFAULT 0 NOT NULL,
  `salesStartAt` timestamp NULL,
  `salesEndAt` timestamp NULL,
  `isActive` tinyint DEFAULT 1 NOT NULL,
  `sortOrder` int DEFAULT 0 NOT NULL,
  `maxPerOrder` int DEFAULT 10,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_tickets_event` ON `event_tickets` (`eventId`);
--> statement-breakpoint
CREATE INDEX `idx_event_tickets_active` ON `event_tickets` (`eventId`, `isActive`);
--> statement-breakpoint

-- ============================================================
-- event_promo_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_promo_codes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `code` varchar(64) NOT NULL,
  `discountType` enum('percentage','fixed_cents') NOT NULL,
  `discountValue` int NOT NULL,
  `maxUses` int,
  `usedCount` int DEFAULT 0 NOT NULL,
  `validFrom` timestamp NULL,
  `validUntil` timestamp NULL,
  `isActive` tinyint DEFAULT 1 NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_promo_codes_id` PRIMARY KEY(`id`),
  CONSTRAINT `event_promo_codes_event_code_unique` UNIQUE(`eventId`, `code`)
);
--> statement-breakpoint

-- ============================================================
-- event_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_orders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `userId` int,
  `customerEmail` varchar(320) NOT NULL,
  `customerName` varchar(255),
  `customerPhone` varchar(32),
  `customerCompany` varchar(255),
  `subtotalCents` int NOT NULL,
  `discountCents` int DEFAULT 0 NOT NULL,
  `feesCents` int DEFAULT 0 NOT NULL,
  `totalCents` int NOT NULL,
  `currency` varchar(3) DEFAULT 'USD' NOT NULL,
  `promoCodeId` int,
  `status` enum('pending','paid','refunded','cancelled','failed') DEFAULT 'pending' NOT NULL,
  `paymentProvider` enum('stripe','eventbrite','manual') DEFAULT 'stripe' NOT NULL,
  `paymentRef` varchar(255),
  `stripeSessionId` varchar(255),
  `paidAt` timestamp NULL,
  `refundedAt` timestamp NULL,
  `notes` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_orders_event` ON `event_orders` (`eventId`);
--> statement-breakpoint
CREATE INDEX `idx_event_orders_user` ON `event_orders` (`userId`);
--> statement-breakpoint
CREATE INDEX `idx_event_orders_email` ON `event_orders` (`customerEmail`);
--> statement-breakpoint
CREATE INDEX `idx_event_orders_status` ON `event_orders` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_event_orders_stripe_session` ON `event_orders` (`stripeSessionId`);
--> statement-breakpoint

-- ============================================================
-- event_order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_order_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orderId` int NOT NULL,
  `ticketId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPriceCents` int NOT NULL,
  `lineTotalCents` int NOT NULL,
  `attendeeName` varchar(255),
  `attendeeEmail` varchar(320),
  `qrCode` varchar(64),
  `checkedInAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_order_items_order` ON `event_order_items` (`orderId`);
--> statement-breakpoint
CREATE INDEX `idx_event_order_items_qrcode` ON `event_order_items` (`qrCode`);
--> statement-breakpoint

-- ============================================================
-- event_external_clicks
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_external_clicks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `provider` enum('eventbrite','luma','external') NOT NULL,
  `userId` int,
  `referrer` text,
  `userAgent` text,
  `ipHash` varchar(64),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_external_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_external_clicks_event` ON `event_external_clicks` (`eventId`);
--> statement-breakpoint
CREATE INDEX `idx_event_external_clicks_event_created` ON `event_external_clicks` (`eventId`, `createdAt`);
--> statement-breakpoint

-- ============================================================
-- event_live_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_live_posts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `authorId` int NOT NULL,
  `headline` varchar(512),
  `body` text NOT NULL,
  `imageUrl` text,
  `embedUrl` text,
  `postType` enum('update','quote','funding','session','sponsor','photo','video','breaking') DEFAULT 'update' NOT NULL,
  `speakerName` varchar(255),
  `companyName` varchar(255),
  `fundingAmount` varchar(64),
  `publishedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `isPinned` tinyint DEFAULT 0 NOT NULL,
  `isDeleted` tinyint DEFAULT 0 NOT NULL,
  CONSTRAINT `event_live_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_live_posts_event` ON `event_live_posts` (`eventId`);
--> statement-breakpoint
CREATE INDEX `idx_event_live_posts_event_published` ON `event_live_posts` (`eventId`, `publishedAt`);
--> statement-breakpoint
CREATE INDEX `idx_event_live_posts_event_pinned` ON `event_live_posts` (`eventId`, `isPinned`);
--> statement-breakpoint

-- ============================================================
-- event_recordings
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_recordings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `scheduleId` int,
  `title` varchar(512) NOT NULL,
  `speakerName` varchar(255),
  `videoUrl` text NOT NULL,
  `thumbnailUrl` text,
  `durationSeconds` int,
  `sortOrder` int DEFAULT 0 NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_recordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_recordings_event` ON `event_recordings` (`eventId`);
--> statement-breakpoint

-- ============================================================
-- event_attendees (RSVP)
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_attendees` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `userId` int NOT NULL,
  `status` enum('interested','going','attended') DEFAULT 'interested' NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_attendees_id` PRIMARY KEY(`id`),
  CONSTRAINT `event_attendees_event_user_unique` UNIQUE(`eventId`, `userId`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_attendees_event` ON `event_attendees` (`eventId`);
--> statement-breakpoint

-- ============================================================
-- event_correspondents (per-event live-blog access grants)
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_correspondents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `userId` int NOT NULL,
  `addedById` int,
  `role` enum('lead','correspondent','photographer') DEFAULT 'correspondent' NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_correspondents_id` PRIMARY KEY(`id`),
  CONSTRAINT `event_correspondents_event_user_unique` UNIQUE(`eventId`, `userId`)
);
--> statement-breakpoint

-- ============================================================
-- event_submissions (public submissions awaiting moderation)
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_submissions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `submitterId` int NOT NULL,
  `title` varchar(512) NOT NULL,
  `tagline` varchar(255),
  `description` text,
  `type` varchar(64),
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `city` varchar(128),
  `country` varchar(128),
  `venue` varchar(255),
  `websiteUrl` text,
  `registrationUrl` text,
  `organizerName` varchar(255),
  `organizerEmail` varchar(320),
  `moderationStatus` enum('pending','ai_approved','ai_flagged','approved','rejected') DEFAULT 'pending' NOT NULL,
  `moderationScore` int,
  `moderationReasoning` text,
  `reviewedById` int,
  `reviewedAt` timestamp NULL,
  `approvedEventId` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `event_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_submissions_status` ON `event_submissions` (`moderationStatus`);
--> statement-breakpoint
CREATE INDEX `idx_event_submissions_submitter` ON `event_submissions` (`submitterId`);
