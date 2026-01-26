# ✅ Create New Project Flow - Complete Guide

## Overview

The "Create New Project" feature is **fully functional** and will automatically create:
1. ✅ New Project in database
2. ✅ New Board for that project
3. ✅ New Project Timeline for that project
4. ✅ New Roadmap for that project
5. ✅ New Backlog for that project

---

## How to Create a New Project

### Method 1: From Project Dropdown (Recommended)

1. **Click on project selector** (top of page)
2. **Click "+ Create New Project"** button at bottom of dropdown
3. **Fill in project details**:
   - Project Name (required)
   - Project Key (optional, e.g., "MILO", "BG")
   - Description (optional)
4. **Click "Create Project"**
5. **Automatically redirected** to Board for new project

### Method 2: From Project Selector Dropdown

1. **Click project dropdown** in navigation
2. **Select "+ Create New Project"** from dropdown
3. **Modal opens** with project creation form
4. **Fill in details** and submit
5. **Redirected to Board**

---

## What Happens When You Create a Project

### Backend (API):
```
POST /api/projects
{
  "name": "My New Project",
  "key": "MNP",
  "description": "Project description",
  "ownerId": 1
}
```

**Response**:
```json
{
  "id": 2,
  "name": "My New Project",
  "key": "MNP",
  "description": "Project description",
  "ownerId": 1,
  "status": "active",
  "createdAt": "2026-01-26T..."
}
```

### Frontend:
1. **Stores project** in localStorage
2. **Sets as current project**
3. **Reloads project list**
4. **Redirects to Board**

### Automatic Pages Available:

Once project is created, these pages automatically work:

#### 1. Board (`milo-board.html`)
- Shows empty board with 5 columns (To Do, In Progress, In Review, Blocked, Done)
- Ready to create tasks
- Filters available (Epic, Type, Priority, Label, Assignee)
- Group by Team available

#### 2. Backlog (`milo-backlog.html`)
- Shows empty backlog
- Ready to create tasks
- Filter by status (All, Backlog, To Do, In Progress, etc.)

#### 3. Project Timeline (`milo-project-timeline.html`)
- Shows empty timeline
- Ready to create tasks with dates
- Can create Sub-Projects
- Gantt chart view
- Drag to scroll

#### 4. Roadmap (`milo-roadmap.html`)
- Shows empty roadmap
- Ready to create roadmap items
- Gantt chart view
- Quarterly view

#### 5. Flakes (`milo-flakes.html`)
- Shows empty flakes list
- Ready to create knowledge base articles

#### 6. Incidents (`milo-incidents.html`)
- Shows empty incidents list
- Ready to track incidents

#### 7. Teams (`milo-teams.html`)
- Shows empty teams list
- Ready to create teams and add members

---

## Project Structure

### Database Tables:
- **projects** - Main project record
- **project_members** - Users who have access to project
- **tasks** - Tasks for the project
- **sub_projects** - Sub-projects within project
- **roadmap_items** - Roadmap items for project
- **teams** - Teams within project
- **team_members** - Members of teams

### Automatic Setup:
When you create a project:
1. ✅ Project record created
2. ✅ Owner automatically added as project member
3. ✅ Project ID stored in localStorage
4. ✅ All pages filter by project ID automatically

---

## Navigation Between Pages

Once project is created, you can navigate between:

- **Board** - Kanban board view
- **Backlog** - List view of all tasks
- **Project Timeline** - Timeline/Gantt view with Sub-Projects
- **Roadmap** - High-level roadmap view
- **Flakes** - Knowledge base
- **Incidents** - Incident tracking
- **Teams** - Team management

All pages automatically use the current project from localStorage.

---

## Creating Tasks in New Project

### On Board:
1. Click "+ Add Task" in any column
2. Fill in task details
3. Task automatically assigned to current project
4. If label matches SubProject name → auto-assigned to SubProject
5. If no label → assigned to "Unknown" SubProject

### On Project Timeline:
1. Click "+ Add Task" button
2. Fill in task details with dates
3. Task appears on timeline
4. Grouped by SubProject

### On Backlog:
1. Click "+ Add Task" button
2. Fill in task details
3. Task appears in backlog list

---

## Creating Sub-Projects

After creating a project, you can create Sub-Projects:

1. **Go to Project Timeline**
2. **Click "Create Sub-Project"** button
3. **Enter Sub-Project name**
4. **Sub-Project created**
5. **Tasks with matching labels** automatically assigned to SubProject

Example:
- Create SubProject "Frontend"
- Create task with label "frontend"
- Task automatically assigned to "Frontend" SubProject

---

## Project Key Usage

The Project Key (e.g., "MILO", "BG") is used for:
- **Task IDs**: `MILO-1`, `MILO-2`, `BG-1`, `BG-2`
- **Quick identification** in project selector
- **URL parameters** (optional)

If no key provided, tasks use generic IDs: `TASK-1`, `TASK-2`

---

## Testing the Flow

### Test Steps:

1. **Create Project**:
   - Click project dropdown
   - Click "+ Create New Project"
   - Name: "Test Project"
   - Key: "TEST"
   - Click "Create Project"

2. **Verify Board**:
   - Should redirect to Board
   - Should show "Test Project" in breadcrumb
   - Should show empty board with 5 columns

3. **Create Task**:
   - Click "+ Add Task" in "To Do" column
   - Title: "First Task"
   - Label: "test"
   - Click "Create"
   - Task should appear in "To Do" column

4. **Check Project Timeline**:
   - Click "Project Timeline" in navigation
   - Should show "Test Project Timeline"
   - Should show task in timeline
   - Should be grouped under "Unknown" SubProject

5. **Create Sub-Project**:
   - Click "Create Sub-Project"
   - Name: "Test"
   - Click "Create"
   - Should see "Test" SubProject group

6. **Update Task Label**:
   - Go back to Board
   - Edit task, change label to "test"
   - Save
   - Go to Project Timeline
   - Task should now be under "Test" SubProject

---

## Troubleshooting

### Issue: "Create New Project" button not visible
**Solution**: Clear browser cache (Ctrl+Shift+R)

### Issue: After creating project, redirected to empty page
**Solution**: 
1. Check browser console for errors
2. Verify user is logged in
3. Check localStorage has project data

### Issue: New project not showing in dropdown
**Solution**:
1. Refresh page
2. Check if project was created in database
3. Verify user has access to project

### Issue: Tasks not showing in new project
**Solution**:
1. Verify project ID in localStorage matches
2. Check tasks have correct projectId
3. Refresh page

---

## API Endpoints Used

### Create Project:
```
POST /api/projects
Body: { name, key, description, ownerId }
Response: { id, name, key, ... }
```

### Get Projects:
```
GET /api/projects?userId={userId}
Response: [{ id, name, key, ... }]
```

### Create Task:
```
POST /api/tasks
Body: { title, projectId, label, ... }
Response: { id, title, subProjectId, ... }
```

### Get Tasks:
```
GET /api/tasks?projectId={projectId}
Response: [{ id, title, subProjectId, subProject, ... }]
```

---

## Summary

✅ **Create New Project** feature is fully functional
✅ **Board** automatically available for new project
✅ **Project Timeline** automatically available
✅ **Roadmap** automatically available
✅ **All pages** filter by current project
✅ **Tasks** automatically assigned to project
✅ **SubProjects** auto-assigned based on labels
✅ **Navigation** works between all pages

**Just click "+ Create New Project" and start working!**
