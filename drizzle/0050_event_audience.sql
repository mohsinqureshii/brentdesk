-- "Who should attend" audience chips for the event page. Previously the
-- design called for these but no column existed, so the section was
-- omitted rather than invented. Additive only.
ALTER TABLE `events`
  ADD COLUMN `targetAudience` json;
