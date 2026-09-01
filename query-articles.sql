SELECT id, slug, title, publishedAt FROM articles 
WHERE publishedAt IS NOT NULL 
AND (primaryCategoryId IS NULL OR primaryCategoryId = 0) 
ORDER BY publishedAt DESC;
