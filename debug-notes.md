# Events Debug Notes

## Issue: Events not appearing in Editorial Queue

### Root Cause
The Editorial Queue (`/admin/workflow`) **only shows articles**, not events. The `getQueue` procedure in `server/admin/workflow.router.ts` specifically queries only the `articles` table (line 251).

### Current Behavior
1. When an event is created, it gets the initial "draft" status from the editorial workflow
2. Events with "draft" status don't appear on the public frontend (correct)
3. Events are NOT shown in the Editorial Queue because it only queries articles
4. There's no separate queue for events - they're managed directly in the Events list page

### Solution Options

**Option 1: Extend Editorial Queue to include events (Recommended)**
- Modify `getQueue` to also query events table
- Add a "type" filter to distinguish between articles and events
- Update the WorkflowQueue UI to show both content types

**Option 2: Add a separate Events Queue page**
- Create a dedicated events approval queue
- Similar to the Editorial Queue but for events only

**Option 3: Add workflow status filter to Events List**
- Add status tabs to the Events admin list page
- Allow filtering by workflow status (draft, submitted, published, etc.)

### Implementation Plan
Going with Option 1 - extend the Editorial Queue to include events alongside articles.
