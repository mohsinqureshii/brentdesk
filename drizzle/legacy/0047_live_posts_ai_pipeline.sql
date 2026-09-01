-- Live coverage AI pipeline: distinguish reporter posts from
-- AI-suggested drafts, gate the latter behind editor approval, and keep
-- the source link for attribution. Reporter posts stay auto-approved so
-- existing behavior is unchanged.
ALTER TABLE `event_live_posts`
  ADD COLUMN `source` enum('reporter','ai') NOT NULL DEFAULT 'reporter';
--> statement-breakpoint
ALTER TABLE `event_live_posts`
  ADD COLUMN `approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved';
--> statement-breakpoint
ALTER TABLE `event_live_posts`
  ADD COLUMN `sourceUrl` text;
--> statement-breakpoint
CREATE INDEX `idx_event_live_posts_approval` ON `event_live_posts` (`eventId`, `approvalStatus`);
