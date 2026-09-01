-- LEAP/DeepFest batch preflight. Read-only. Every row must say OK.
SELECT 'desk author' AS check_name,
       IF(COUNT(*)>0,'OK','MISSING — create a user with publicName = TechScoop Desk') AS result
  FROM users WHERE LOWER(COALESCE(publicName,name,username))='techscoop desk'
UNION ALL
SELECT 'country SA', IF(COUNT(*)>0,'OK','MISSING — insert Saudi Arabia (iso2=SA)') FROM countries WHERE iso2='SA'
UNION ALL
SELECT 'city Riyadh', IF(COUNT(*)>0,'OK','MISSING — insert city Riyadh') FROM cities WHERE LOWER(name)='riyadh'
UNION ALL
SELECT 'region Gulf Region', IF(COUNT(*)>0,'OK','OK — absent, optional; region will be left unset') FROM geo_regions WHERE LOWER(name)='gulf region'
UNION ALL
SELECT 'company workflow initial', IF(COUNT(*)>0,'OK','MISSING — no isInitial status for workflowType=company')
  FROM workflow_statuses WHERE workflowType='company' AND isInitial=1
UNION ALL
SELECT 'person workflow initial', IF(COUNT(*)>0,'OK','MISSING — no isInitial status for workflowType=person')
  FROM workflow_statuses WHERE workflowType='person' AND isInitial=1
UNION ALL
SELECT 'editorial draft status', IF(COUNT(*)>0,'OK','MISSING') FROM workflow_statuses WHERE workflowType='editorial' AND slug='draft'
UNION ALL
SELECT 'editorial published status', IF(COUNT(*)>0,'OK','MISSING') FROM workflow_statuses WHERE workflowType='editorial' AND slug='published'
UNION ALL
SELECT 'migration 0051 applied', IF(COUNT(*)=3,'OK','NOT APPLIED — deploy the branch first')
  FROM information_schema.tables WHERE table_schema=DATABASE()
   AND table_name IN ('editorial_batches','article_editorial_batches','article_source_references')
UNION ALL
SELECT 'slug collisions with batch', IF(COUNT(*)=0,'OK — none',CONCAT(COUNT(*),' existing articles share a batch slug'))
  FROM articles WHERE slug IN ('aws-to-launch-saudi-cloud-region-in-december-2026-with-humain-ai-zone',
                               'humain-and-datavolt-break-ground-on-100mw-ai-data-center-at-neom');
