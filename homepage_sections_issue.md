# Homepage Category Sections Issue Analysis

## Problem
The homepage shows category sections that have "Category: Not set" in the admin panel:
- Artificial Intelligence → Category: AI (works correctly, categoryId: 60027)
- Startups → Category: Not set (categoryId: 2 - doesn't exist)
- Security → Category: Not set (categoryId: 3 - doesn't exist)
- Venture → Category: Not set (categoryId: 4 - doesn't exist)
- Apps → Category: Not set (categoryId: 5 - doesn't exist)
- Transportation → Category: Not set (categoryId: 6 - doesn't exist)
- Funding & VC → Category: Funding & VC (works correctly, categoryId: 60007)
- Startups → Category: Startups (works correctly, categoryId: 60001)
- Technology → Category: Technology (works correctly, categoryId: 60033)

## Root Cause
The sections with categoryId 2, 3, 4, 5, 6 are pointing to non-existent categories in the database.
These were likely placeholder IDs that were never updated to point to real categories.

## Solution
Need to update the homepage_sections table to link to the correct category IDs that exist in the database.
Or delete the sections with invalid categoryId and keep only the working ones.

## Working Category IDs (from API response)
- 60027 → AI
- 60001 → Startups
- 60007 → Funding & VC
- 60033 → Technology
