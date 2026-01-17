# Backend-Frontend Integration Update - January 17, 2026

## Overview
Successfully integrated SubProjects and Departments backend API with the frontend timeline functionality. The system now loads and manages sub-projects from the database instead of localStorage, with localStorage as a fallback.

## Backend Changes ✅

### New Models Created
1. **Department.cs** - Represents project departments
   - Properties: Id, Name, Description, ProjectId, Color, CreatedAt, UpdatedAt
   - Navigation: SubProjects collection

2. **SubProject.cs** - Represents sub-projects within departments
   - Properties: Id, Name, Description, ProjectId, DepartmentId, Color, StartDate, EndDate
   - Timeline properties: TimelineStartDate, TimelineEndDate, TimelineX, TimelineY, TimelineWidth, TimelineHeight, OnTimeline, Duration, CustomText
   - Navigation: Department, Project, Tasks collection

### New Controllers Created
1. **DepartmentsController** - CRUD operations for departments
   - GET /api/departments?projectId=1 - Get all departments for a project
   - GET /api/departments/{id} - Get specific department
   - POST /api/departments - Create new department
   - PUT /api/departments/{id} - Update department
   - DELETE /api/departments/{id} - Delete department

2. **SubProjectsController** - CRUD operations for sub-projects
   - GET /api/subprojects?projectId=1 - Get all sub-projects for a project
   - GET /api/subprojects/{id} - Get specific sub-project
   - POST /api/subprojects - Create new sub-project
   - PUT /api/subprojects/{id} - Update sub-project
   - DELETE /api/subprojects/{id} - Delete sub-project
   - GET /api/subprojects/by-department?projectId=1&departmentId=1 - Get sub-projects by department

### Database Migration
**AddSubProjectsAndDepartments.cs** - Creates:
- Departments table with foreign key to Projects
- SubProjects table with foreign keys to Projects and Departments
- SubProjectId column in Tasks table
- Proper indexes for performance

### Model Updates
- **Task.cs** - Added SubProjectId property and SubProject navigation property
- **Project.cs** - Added SubProjects and Departments navigation properties
- **MiloDbContext.cs** - Added DbSets for SubProjects and Departments with proper configuration

## Frontend Changes ✅

### Updated Functions

1. **loadTimelineData()** - Now async, loads from API
   - Fetches sub-projects from `/api/subprojects?projectId={id}`
   - Falls back to localStorage if API fails
   - Loads tasks from `/tasks?projectId={id}`

2. **renderProjectTree()** - Now async, loads departments from API
   - Fetches departments from `/api/departments?projectId={id}`
   - Falls back to localStorage if API fails
   - Creates default departments if none exist
   - Renders departments and their sub-projects

3. **addSubProject()** - Now async, creates via API
   - Posts to `/api/subprojects` with project and department info
   - Falls back to localStorage if API fails
   - Reloads timeline after creation

4. **confirmDeleteSubProject()** - Now async, deletes via API
   - Deletes from `/api/subprojects/{id}`
   - Falls back to localStorage if API fails
   - Reloads timeline after deletion

### CSS Fix Applied
- Added `grid-auto-rows: minmax(120px, auto)` to `.assignee-row` CSS
- Fixes task cards shrinking after loading

## Data Flow

### Creating a Sub-Project
1. User clicks "+ Add Sub-Project" in timeline
2. Frontend calls `addSubProject()`
3. API POST to `/api/subprojects` with name, projectId, departmentId, color, dates
4. Backend creates SubProject record in database
5. Frontend reloads timeline data from API
6. New sub-project appears in timeline

### Loading Timeline
1. User navigates to Timeline view
2. Frontend calls `loadTimelineData()`
3. API GET `/api/subprojects?projectId={id}` returns all sub-projects
4. API GET `/api/departments?projectId={id}` returns all departments
5. Frontend renders project tree with departments and sub-projects
6. Sub-projects can be dragged onto timeline

### Deleting a Sub-Project
1. User clicks delete button on sub-project
2. Frontend shows confirmation dialog
3. User confirms deletion
4. API DELETE `/api/subprojects/{id}`
5. Backend deletes SubProject record
6. Frontend reloads timeline

## Fallback Strategy

All frontend functions implement a fallback to localStorage:
- If API call fails, the system falls back to localStorage
- This ensures the app continues to work even if the backend is temporarily unavailable
- Data is synced to the database when the API becomes available again

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/departments?projectId=1 | List departments |
| GET | /api/departments/{id} | Get department details |
| POST | /api/departments | Create department |
| PUT | /api/departments/{id} | Update department |
| DELETE | /api/departments/{id} | Delete department |
| GET | /api/subprojects?projectId=1 | List sub-projects |
| GET | /api/subprojects/{id} | Get sub-project details |
| POST | /api/subprojects | Create sub-project |
| PUT | /api/subprojects/{id} | Update sub-project |
| DELETE | /api/subprojects/{id} | Delete sub-project |
| GET | /api/subprojects/by-department?projectId=1&departmentId=1 | List by department |

## Next Steps

1. **Deploy Backend** - Run migrations to create tables
   ```bash
   dotnet ef database update
   ```

2. **Test API** - Verify endpoints are working
   - Create a department
   - Create a sub-project
   - Load timeline and verify data appears

3. **Monitor Logs** - Check browser console for any API errors

## Notes

- Sub-projects are now stored in the database per project
- Each project has its own set of departments and sub-projects
- Timeline positioning data (X, Y, width, height) is persisted in the database
- The system gracefully handles API failures by falling back to localStorage
