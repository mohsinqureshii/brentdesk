# Homepage Sections Analysis

## API Response from getSections

The API returns sections from the database. Key sections with position="main":

1. **Hero** (id:1) - sectionType: hero
2. **Trending Now** (id:2) - sectionType: trending
3. **Latest Headlines** (id:3) - sectionType: headlines
4. **Artificial Intelligence** (id:4) - sectionType: category, categoryId: 60027, categorySlug: ai-news
5. **Startups** (id:5) - sectionType: category, categoryId: 2, categorySlug: null
6. **Security** (id:6) - sectionType: category, categoryId: 3
7. **Venture** (id:7) - sectionType: category, categoryId: 4
8. **Apps** (id:8) - sectionType: category, categoryId: 5
9. **Transportation** (id:9) - sectionType: category, categoryId: 6
10. **In Brief** (id:10) - sectionType: in_brief
11. **Recent Stocks** (id:16) - sectionType: stocks
12. **Funding & VC** (id:30001) - sectionType: category, categoryId: 60007, categorySlug: funding-vc
13. **Startups** (id:30002) - sectionType: category, categoryId: 60001, categorySlug: startups
14. **Technology** (id:30003) - sectionType: category, categoryId: 60033, categorySlug: technology

## Issue Found

The homepage is correctly fetching sections from the database via `trpc.admin.homepage.getSections.useQuery()`.

However, looking at the screenshots, the issue is that some sections have `categoryId` values that don't exist in the categories table (like 2, 3, 4, 5, 6), which is why they show "Category: Not set" in the admin panel.

The sections with proper categoryId (like 60027, 60007, 60001, 60033) have proper category names.

## Solution

The issue is that some sections are linked to non-existent category IDs. Need to either:
1. Update the sections to link to valid category IDs
2. Or ensure the categories exist in the database
