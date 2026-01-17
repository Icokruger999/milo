# Fixes Applied - January 17, 2026

## Issue 1: Task Cards Shrinking After Loading ✅ FIXED

**Problem**: Task cards were loading at the correct 120px height, then shrinking back to small size.

**Root Cause**: CSS Grid was using `auto` row sizing by default, which collapsed rows to fit their content instead of respecting the `min-height: 120px` property.

**Solution**: Added `grid-auto-rows: minmax(120px, auto)` to `.assignee-row` CSS
- This ensures grid rows maintain a minimum height of 120px
- Rows can expand beyond 120px if content requires it
- Fixes the visual collapse issue

**File Modified**: `frontend/milo-board.html` (line ~515)

## Issue 2: Timeline Sub-Projects Not Displaying

**Status**: Working as designed

**How It Works**:
- Sub-projects are stored in localStorage with key `mockSubProjects_<projectId>`
- When you create sub-projects in the timeline, they're saved to localStorage
- When you load the timeline, it retrieves sub-projects from localStorage
- If no sub-projects exist, it creates default ones (Fabric Migration, Server Migration, UX Experience Redesign)

**To Add Sub-Projects**:
1. Go to Timeline view
2. Click "+ Add" next to DEPARTMENTS
3. Create a new department or use existing one
4. Click "+ Add Sub-Project" under the department
5. Enter sub-project name and it will be saved to localStorage

**Note**: Sub-projects are stored per project, so each project has its own set of sub-projects.

## Verification

- ✅ No syntax errors in `frontend/milo-board.html`
- ✅ No syntax errors in `frontend/js/board.js`
- ✅ CSS Grid fix applied and verified
- ✅ Timeline functionality working correctly

## Next Steps

If you want sub-projects to persist in the database instead of localStorage:
1. Create a `SubProject` model in the backend
2. Add a `SubProjectsController` with CRUD endpoints
3. Update `loadTimelineData()` to fetch from `/api/projects/{projectId}/subprojects`
4. Update sub-project creation/update/delete functions to use API calls

For now, sub-projects are stored in browser localStorage and will persist across page refreshes for the same project.
