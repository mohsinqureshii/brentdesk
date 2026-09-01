-- Events Hub v2 — RSVP reminder pipeline
-- ----------------------------------------------------------------------
-- Adds `lastReminderSentAt` to event_attendees so the hourly cron
-- in eventReminders.service.ts can avoid re-sending a 7d/1d/4h reminder
-- to the same attendee within the same window.
--
-- Also widens the status enum with 'not_going' — surfaced from the
-- RSVP buttons in the public event hero so users can explicitly opt
-- out (and we stop counting them in the "X going" pill).

ALTER TABLE `event_attendees`
  ADD COLUMN `lastReminderSentAt` timestamp NULL;
--> statement-breakpoint

ALTER TABLE `event_attendees`
  MODIFY COLUMN `status` enum('interested','going','attended','not_going') NOT NULL DEFAULT 'interested';
