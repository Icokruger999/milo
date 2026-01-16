# Timeline Page Redesign Plan

## Current Issues
1. Timeline page is basic and non-functional
2. No project management on timeline
3. No task creation from timeline
4. No sync between timeline and board
5. No project dependencies/links visualization

## New Timeline Features

### 1. Left Sidebar - Project Management
- **Project List**: Show all projects with color coding
- **Create Project Button**: Quick project creation
- **Project Workflows**: Assign workflows/phases to projects
- **Project Filtering**: Filter timeline by project
- **Project Status**: Visual indicators (active, on-hold, completed)

### 2. Timeline Canvas - Visual Project Timeline
- **Horizontal Timeline**: Month/quarter view with zoom controls
- **Project Swimlanes**: Each project gets its own row
- **Task Bars**: Visual representation of tasks with:
  - Start and end dates
  - Status color coding (backlog, in-progress, done)
  - Progress indicators
  - Dependencies/links between tasks
- **Drag & Drop**: Move tasks to adjust dates
- **Click to Create**: Click on timeline to create new task
- **Today Marker**: Visual indicator of current date

### 3. Task Creation & Management
- **Create from Timeline**: Click on timeline → create task modal
- **Auto-sync to Board**: Tasks created on timeline appear in board backlog
- **Status Sync**: Changing status on board updates timeline color
- **Bi-directional Sync**: Changes in either view reflect in both

### 4. Project Dependencies
- **Link Projects**: Visual arrows showing project dependencies
- **Milestone Markers**: Key project milestones
- **Critical Path**: Highlight critical path through projects

### 5. Workflows/Phases
- **Project Phases**: Break projects into phases (Planning, Development, Testing, Deployment)
- **Phase Progress**: Visual progress bars for each phase
- **Phase Tasks**: Tasks grouped by phase

## Technical Implementation

### Database Changes Needed
```sql
-- Add timeline-specific fields to tasks
ALTER TABLE tasks ADD COLUMN start_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN end_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN timeline_position INTEGER;

-- Add project phases/workflows
CREATE TABLE project_phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    name VARCHAR(100),
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50),
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add task dependencies
CREATE TABLE task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    depends_on_task_id INTEGER REFERENCES tasks(id),
    dependency_type VARCHAR(50), -- 'blocks', 'blocked-by', 'relates-to'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints Needed
```
GET    /api/timeline/projects/:projectId          - Get timeline data for project
POST   /api/timeline/tasks                        - Create task from timeline
PUT    /api/timeline/tasks/:id/dates              - Update task dates
POST   /api/timeline/dependencies                 - Create task dependency
DELETE /api/timeline/dependencies/:id             - Remove dependency
GET    /api/projects/:id/phases                   - Get project phases
POST   /api/projects/:id/phases                   - Create project phase
PUT    /api/projects/phases/:id                   - Update phase
```

### Frontend Components
1. **TimelineCanvas.js** - Main timeline rendering
2. **ProjectSidebar.js** - Project list and management
3. **TaskBar.js** - Individual task visualization
4. **DependencyLine.js** - Visual dependency arrows
5. **TimelineModal.js** - Task creation/editing modal

## UI/UX Design

### Layout
```
+------------------+----------------------------------------+
| Project Sidebar  |        Timeline Canvas                |
|                  |                                        |
| [+ New Project]  |  Jan  |  Feb  |  Mar  |  Apr  |  May  |
|                  |  ====================================  |
| □ Project A      |  [====Task 1====]                     |
| □ Project B      |       [==Task 2==]  [===Task 3===]    |
| □ Project C      |  [==========Task 4==========]         |
|                  |                                        |
| Workflows:       |  Today ↓                              |
| - Planning       |                                        |
| - Development    |                                        |
| - Testing        |                                        |
+------------------+----------------------------------------+
```

### Color Coding
- **Backlog**: Gray (#6B778C)
- **In Progress**: Blue (#0052CC)
- **In Review**: Purple (#6554C0)
- **Done**: Green (#36B37E)
- **Blocked**: Red (#DE350B)

### Interactions
1. **Click empty space** → Create new task
2. **Click task bar** → Edit task details
3. **Drag task bar** → Adjust dates
4. **Drag task edges** → Resize duration
5. **Right-click task** → Context menu (delete, duplicate, add dependency)
6. **Hover task** → Show tooltip with details

## Implementation Phases

### Phase 1: Basic Timeline (Week 1)
- [ ] Create timeline canvas with month view
- [ ] Display existing tasks as bars
- [ ] Add project sidebar with project list
- [ ] Implement basic task creation modal

### Phase 2: Task Management (Week 2)
- [ ] Drag & drop to adjust dates
- [ ] Status color coding
- [ ] Sync with board (bi-directional)
- [ ] Task editing from timeline

### Phase 3: Dependencies (Week 3)
- [ ] Add dependency creation
- [ ] Visual dependency lines
- [ ] Dependency validation (no circular deps)
- [ ] Critical path highlighting

### Phase 4: Workflows & Polish (Week 4)
- [ ] Project phases/workflows
- [ ] Phase progress tracking
- [ ] Zoom controls (day/week/month/quarter view)
- [ ] Export timeline as image/PDF
- [ ] Performance optimization

## Success Criteria
- ✅ Users can create projects from timeline
- ✅ Users can create tasks directly on timeline
- ✅ Tasks sync between timeline and board
- ✅ Status changes reflect in both views
- ✅ Visual project dependencies work
- ✅ Timeline is intuitive and fast
- ✅ Mobile-responsive design
