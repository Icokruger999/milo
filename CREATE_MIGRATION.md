# Create Database Migration for TaskType, StartDate, ParentTaskId

## Steps to Create Migration

### 1. Navigate to Backend Directory
```bash
cd backend/Milo.API
```

### 2. Create Migration
```bash
dotnet ef migrations add AddTaskTypeAndRelationships
```

This will create a migration file that adds:
- `TaskType` column (Epic, Task, Bug, Story)
- `StartDate` column (for roadmap timeline)
- `ParentTaskId` column (for epic/task relationships)
- `TaskLinks` table (for linked tasks)

### 3. Review Migration
The migration file will be created in `Migrations/` folder. Review it to ensure it's correct.

### 4. Apply Migration to Database

#### Option A: Automatic (on startup)
The backend automatically applies migrations on startup (configured in `Program.cs`).

#### Option B: Manual
```bash
dotnet ef database update
```

### 5. Verify Migration
Check that the columns exist in the database:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Tasks' 
AND column_name IN ('TaskType', 'StartDate', 'ParentTaskId');
```

## Migration Details

### New Columns in Tasks Table:
- **TaskType**: VARCHAR(20), Default: 'Task'
  - Values: 'Epic', 'Task', 'Bug', 'Story'
- **StartDate**: TIMESTAMP, Nullable
  - Used for roadmap timeline positioning
- **ParentTaskId**: INTEGER, Nullable, Foreign Key
  - Links to parent task (for epics)

### New Table: TaskLinks
- **Id**: Primary Key
- **SourceTaskId**: Foreign Key to Tasks
- **TargetTaskId**: Foreign Key to Tasks
- **LinkType**: VARCHAR(50) (relates, blocks, duplicates, etc.)
- **CreatedAt**: TIMESTAMP

## After Migration

1. **Restart Backend Service** on EC2:
   ```bash
   sudo systemctl restart milo-api.service
   ```

2. **Verify Backend is Running**:
   ```bash
   curl http://localhost:5001/api/health
   ```

3. **Test API**:
   ```bash
   curl http://api.codingeverest.com/api/health
   ```

## Troubleshooting

If migration fails:
1. Check database connection string in `appsettings.json`
2. Verify RDS instance is accessible
3. Check PostgreSQL user permissions
4. Review migration logs in backend console

