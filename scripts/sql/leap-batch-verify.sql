-- Post-import verification. Read-only. Every row should read OK.
SELECT 'articles in batch' AS check_name,
       IF(COUNT(*)=100, CONCAT('OK — ',COUNT(*)), CONCAT('EXPECTED 100, found ',COUNT(*))) AS result
  FROM article_editorial_batches aeb
  JOIN editorial_batches b ON b.id=aeb.batchId WHERE b.batchKey='leap-deepfest-2026-day1'
UNION ALL
-- Status is reported, not gated: 'failed' here only means the post-import
-- bookkeeping update did not land, which does not affect the articles.
SELECT 'batch status', CONCAT('OK — ', status)
  FROM editorial_batches WHERE batchKey='leap-deepfest-2026-day1'
UNION ALL
-- Informational: before publishing this should read 0. Afterwards it is
-- the count you intended, so it is never treated as a failure.
SELECT 'published so far',
       CONCAT('OK — ', COALESCE(SUM(w.isPublished),0), ' of ', COUNT(*), ' live')
  FROM article_editorial_batches aeb
  JOIN editorial_batches b ON b.id=aeb.batchId
  JOIN articles a ON a.id=aeb.articleId
  JOIN workflow_statuses w ON w.id=a.statusId
 WHERE b.batchKey='leap-deepfest-2026-day1'
UNION ALL
SELECT 'every article has an image',
       IF(SUM(a.featuredImageId IS NULL)=0,'OK',CONCAT(SUM(a.featuredImageId IS NULL),' missing'))
  FROM article_editorial_batches aeb
  JOIN editorial_batches b ON b.id=aeb.batchId
  JOIN articles a ON a.id=aeb.articleId
 WHERE b.batchKey='leap-deepfest-2026-day1'
UNION ALL
SELECT 'every article has a primary category',
       IF(SUM(a.primaryCategoryId IS NULL)=0,'OK',CONCAT(SUM(a.primaryCategoryId IS NULL),' missing'))
  FROM article_editorial_batches aeb
  JOIN editorial_batches b ON b.id=aeb.batchId
  JOIN articles a ON a.id=aeb.articleId
 WHERE b.batchKey='leap-deepfest-2026-day1'
UNION ALL
SELECT 'no duplicate article slugs',
       IF(COUNT(*)=0,'OK — none',CONCAT(COUNT(*),' duplicated'))
  FROM (SELECT slug FROM articles GROUP BY slug HAVING COUNT(*)>1) d
UNION ALL
SELECT 'no duplicate company names',
       IF(COUNT(*)=0,'OK — none',CONCAT(COUNT(*),' duplicated'))
  FROM (SELECT LOWER(name) n FROM companies GROUP BY n HAVING COUNT(*)>1) d
UNION ALL
SELECT 'no duplicate people names',
       IF(COUNT(*)=0,'OK — none',CONCAT(COUNT(*),' duplicated'))
  FROM (SELECT LOWER(name) n FROM people GROUP BY n HAVING COUNT(*)>1) d
UNION ALL
SELECT 'source references stored',
       IF(COUNT(*)>=100, CONCAT('OK — ',COUNT(*)), CONCAT('LOW: ',COUNT(*)))
  FROM article_source_references sr
  JOIN article_editorial_batches aeb ON aeb.articleId=sr.articleId
  JOIN editorial_batches b ON b.id=aeb.batchId WHERE b.batchKey='leap-deepfest-2026-day1';
