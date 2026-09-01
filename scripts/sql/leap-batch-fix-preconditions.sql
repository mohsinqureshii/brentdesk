-- Preconditions for the LEAP/DeepFest import. Safe to run more than once:
-- every statement no-ops if the row already exists. Nothing is deleted or
-- overwritten.

-- 1. The byline the importer attributes all 100 articles to.
--    Creates a dedicated desk account rather than renaming a real person.
INSERT INTO users (openId, name, publicName, email, role, loginMethod)
SELECT 'system_techscoop_desk', 'TechScoop Desk', 'TechScoop Desk',
       'desk@techscoop.io', 'editor', 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT * FROM users) u
  WHERE LOWER(COALESCE(u.publicName, u.name, u.username)) = 'techscoop desk'
);

-- 2. Workflow statuses for company and person. The importer needs an
--    "initial" status for each before it can create a new company or person.
--    Nothing in the codebase seeds these, which is why they are absent.
INSERT INTO workflow_statuses (name, slug, color, sortOrder, workflowType, isInitial, isFinal, isPublished)
SELECT 'Draft', 'draft', '#6B7280', 1, 'company', 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM (SELECT * FROM workflow_statuses) w
                  WHERE w.workflowType='company' AND w.slug='draft');

INSERT INTO workflow_statuses (name, slug, color, sortOrder, workflowType, isInitial, isFinal, isPublished)
SELECT 'Published', 'published', '#22C55E', 2, 'company', 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM (SELECT * FROM workflow_statuses) w
                  WHERE w.workflowType='company' AND w.slug='published');

INSERT INTO workflow_statuses (name, slug, color, sortOrder, workflowType, isInitial, isFinal, isPublished)
SELECT 'Draft', 'draft', '#6B7280', 1, 'person', 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM (SELECT * FROM workflow_statuses) w
                  WHERE w.workflowType='person' AND w.slug='draft');

INSERT INTO workflow_statuses (name, slug, color, sortOrder, workflowType, isInitial, isFinal, isPublished)
SELECT 'Published', 'published', '#22C55E', 2, 'person', 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM (SELECT * FROM workflow_statuses) w
                  WHERE w.workflowType='person' AND w.slug='published');

-- 3. Optional: the region the batch's coverage names. Without it the
--    articles still import, just with no region set.
INSERT INTO geo_regions (countryId, name, code, isActive, sortOrder)
SELECT c.id, 'Gulf Region', 'GULF', 1, 1
FROM countries c
WHERE c.iso2 = 'SA'
  AND NOT EXISTS (SELECT 1 FROM (SELECT * FROM geo_regions) g
                  WHERE g.countryId = c.id AND LOWER(g.name) = 'gulf region');

-- Report what now exists, so the step shows its work and the runner has
-- rows to verify. Every line must read OK.
SELECT 'desk author' AS check_name,
       IF(COUNT(*)>0,'OK — created or already present','FAILED to create') AS result
  FROM users WHERE LOWER(COALESCE(publicName,name,username))='techscoop desk'
UNION ALL
SELECT 'company workflow initial', IF(COUNT(*)>0,'OK','FAILED')
  FROM workflow_statuses WHERE workflowType='company' AND isInitial=1
UNION ALL
SELECT 'person workflow initial', IF(COUNT(*)>0,'OK','FAILED')
  FROM workflow_statuses WHERE workflowType='person' AND isInitial=1
UNION ALL
SELECT 'region Gulf Region', IF(COUNT(*)>0,'OK','OK — absent, optional')
  FROM geo_regions WHERE LOWER(name)='gulf region';
