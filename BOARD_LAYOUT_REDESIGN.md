# Board Layout Redesign - Assignee Rows

## Current Layout
```
TO DO          | IN PROGRESS    | IN REVIEW      | DONE
---------------|----------------|----------------|--------
▼ Ico (3)      | ▼ Ico (2)      | ▼ Ico (1)      | ▼ Ico (1)
  [task]       |   [task]       |   [task]       |   [task]
  [task]       |   [task]       |                |
  [task]       |                |                |
▼ John (2)     | ▼ John (1)     |                |
  [task]       |   [task]       |                |
  [task]       |                |                |
```

## Requested Layout
```
              | TO DO    | IN PROGRESS | IN REVIEW | DONE    |
--------------|----------|-------------|-----------|---------|
Ico Kruger    | [task]   | [task]      | [task]    | [task]  |
              | [task]   | [task]      |           |         |
              | [task]   |             |           |         |
--------------|----------|-------------|-----------|---------|
John Doe      | [task]   | [task]      |           |         |
              | [task]   |             |           |         |
--------------|----------|-------------|-----------|---------|
Unassigned    |          | [task]      |           |         |
```

## Implementation Plan

### 1. HTML Structure Change
- Remove current column-based layout
- Create table-like structure with:
  - Header row with status columns
  - One row per assignee
  - Each cell contains tasks for that assignee in that status

### 2. CSS Changes
- New grid layout for assignee rows
- Fixed left column for assignee names/avatars
- Scrollable status columns
- Collapsible rows (arrow to hide/show assignee's tasks)

### 3. JavaScript Changes
- Group tasks by assignee first, then by status
- Render assignee rows alphabetically
- Each row shows all statuses for that assignee
- Drag & drop between cells (assignee + status)

### 4. Features to Maintain
- Collapsible rows (arrow next to assignee name)
- Drag & drop tasks
- Task cards with same styling
- Search and filters
- Create task button

## Benefits
- See all of one person's work at a glance
- Easy to identify workload per person
- Better for project managers reviewing team progress
- Clearer view of who's working on what

## Estimated Time
- 2-3 hours for complete implementation
- Major refactoring of board rendering logic

## Status
- Not yet started
- Waiting for confirmation to proceed
