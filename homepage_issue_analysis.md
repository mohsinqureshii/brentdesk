# Homepage Category Sections Issue Analysis - Jan 24, 2026

## Current Status
The category sections (Funding & VC, Startups, Technology) are NOT appearing on the homepage.

## Sections Visible on Homepage:
1. Hero section ✅
2. Trending Now ✅
3. Latest Headlines ✅
4. Latest News ✅
5. Featured Companies ✅
6. Upcoming Events ✅
7. Quick Links ✅
8. TechScoop Premium banner ✅
9. Footer ✅

## Missing Sections:
- Funding & VC category section
- Startups category section
- Technology category section

## Root Cause
The browser console shows an API error:
```
Failed query: select `homepage_sections`.`id`, `homepage_sections`.`name`, ... from `homepage_sections` left join `categories` on `homepage_sections`.`category_id` = `categories`.`id` where `homepage_sections`.`is_active` = ?
```

This indicates the database query is failing because the drizzle schema uses camelCase column names (e.g., `sectionType`, `categoryId`) but the database was created with snake_case columns (e.g., `section_type`, `category_id`).

## Solution
The drizzle schema already maps the camelCase properties to snake_case column names (e.g., `sectionType: mysqlEnum("section_type", ...)`). The issue is that the database table might have been created with different column names.

Need to verify:
1. The actual column names in the database
2. Whether the drizzle schema matches the database structure
