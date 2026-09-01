# Event Page Layout Fix (Jan 31, 2026)

## Issue
The sidebar was being pushed off-screen because the horizontal scrollable containers (featured speakers, tracks) were expanding beyond their container width.

## Root Cause
The flex containers with `overflow-x-auto` were causing their parent elements to expand, which broke the CSS grid layout.

## Solution
Added `min-w-0 overflow-hidden` to the main content wrapper div:
```tsx
<div className="min-w-0 overflow-hidden">
```

This constrains the main content area to respect the grid column width and prevents the scrollable containers from expanding the grid.

## Result
- Sidebar is now visible on the right side
- Event Details card shows dates, venue, organizer
- Advertisement placeholder visible
- TechScoop Coverage section shows related articles in sidebar
- Featured speakers and tracks still scroll horizontally within their container
