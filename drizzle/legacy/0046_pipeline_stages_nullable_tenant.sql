-- Talent Platform — make pipeline_stages.tenant_id nullable
-- ----------------------------------------------------------------------
-- The legacy public job board (techscoop.io's own jobs, tenantId IS NULL)
-- needs default pipeline stages too. Until this migration, the column
-- was NOT NULL so seedDefaultStages early-returned on null scope and
-- super-admins on apex saw an empty kanban.
--
-- After this migration: scope=null seeds a single global pipeline that
-- ALL legacy jobs share. Tenant-scoped pipelines are unaffected.

ALTER TABLE `pipeline_stages` MODIFY COLUMN `tenant_id` int NULL;
