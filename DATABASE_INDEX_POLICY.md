# Database Index Policy

## CRITICAL RULE: Indexes MUST NOT Be Dropped

**Indexes are performance-critical and MUST be preserved. They must be defined in `MiloDbContext.cs` and will be automatically created/updated via EF Core migrations.**

## Index Management Rules

### 1. All Indexes Must Be Defined in Code
- All indexes MUST be defined in `backend/Milo.API/Data/MiloDbContext.cs`
- Indexes are managed through Entity Framework Core (EF Core) migrations
- NEVER manually drop indexes in the database
- NEVER remove index definitions from `MiloDbContext.cs` unless you're replacing them

### 2. When Adding New Columns That Need Indexes

If you add a new column that will be used in:
- WHERE clauses
- JOIN conditions (foreign keys)
- ORDER BY clauses
- GROUP BY clauses

**You MUST add an index** in `MiloDbContext.cs`:

```csharp
// Single column index
entity.HasIndex(e => e.NewColumn);

// Composite index for common query patterns
entity.HasIndex(e => new { e.ProjectId, e.NewColumn });
```

### 3. Foreign Key Columns MUST Have Indexes

All foreign key columns MUST have indexes for performance:
- `AssigneeId`, `CreatorId`, `ProjectId`, `ProductId`, `RequesterId`, `AgentId`, `GroupId`, etc.
- These are critical for JOIN performance

### 4. Migration Process

When creating migrations:
1. Add/update index definitions in `MiloDbContext.cs`
2. Create migration: `dotnet ef migrations add MigrationName`
3. Review the generated migration file
4. **VERIFY** that migrations only ADD indexes, never DROP them
5. If a migration drops indexes, it's a bug - fix it!

### 5. Required Indexes by Table

#### Tasks Table
- ✅ `TaskId` (unique)
- ✅ `Status`
- ✅ `AssigneeId` (FK)
- ✅ `CreatorId` (FK)
- ✅ `ProjectId` (FK)
- ✅ `ProductId` (FK)
- ✅ `ParentTaskId` (FK)
- ✅ `CreatedAt` (sorting)
- ✅ Composite: `(ProjectId, Status)`
- ✅ Composite: `(ProjectId, CreatedAt)`
- ✅ Composite: `(Status, ProjectId, CreatedAt)`
- ✅ Composite: `(AssigneeId, Status)`
- ✅ Composite: `(ProjectId, AssigneeId, Status)`

#### Incidents Table
- ✅ `IncidentNumber` (unique)
- ✅ `Status`
- ✅ `Priority`
- ✅ `CreatedAt`
- ✅ `ProjectId` (FK)
- ✅ `RequesterId` (FK)
- ✅ `AgentId` (FK)
- ✅ `GroupId` (FK)
- ✅ Composite: `(ProjectId, Status)`
- ✅ Composite: `(ProjectId, CreatedAt)`
- ✅ Composite: `(Status, Priority)`
- ✅ Composite: `(RequesterId, CreatedAt)`
- ✅ Composite: `(AgentId, Status)`
- ✅ Composite: `(ProjectId, Status, CreatedAt)`

#### Projects Table
- ✅ `Name`
- ✅ `Key` (unique)
- ✅ `OwnerId` (FK - automatic)

#### ProjectMembers Table
- ✅ `ProjectId` (FK)
- ✅ `UserId` (FK)
- ✅ Composite: `(ProjectId, UserId)` (unique)

#### Other Tables
- All foreign keys MUST have indexes
- All columns used in WHERE/ORDER BY should have indexes
- Composite indexes for common query patterns

## Verification

To verify indexes exist in the database:

```sql
-- List all indexes for a table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tasks' 
ORDER BY indexname;

-- Check for missing FK indexes
SELECT 
    tc.table_name, 
    kcu.column_name,
    CASE WHEN i.indexname IS NULL THEN 'MISSING INDEX' ELSE 'OK' END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes i 
    ON i.tablename = tc.table_name 
    AND i.indexname LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
```

## Deployment Checklist

Before deploying:
1. ✅ Verify all index definitions in `MiloDbContext.cs`
2. ✅ Review migration files - ensure no DROP INDEX statements
3. ✅ Test migrations locally if possible
4. ✅ After deployment, verify indexes exist in database
5. ✅ Monitor query performance

## Emergency: If Indexes Are Missing

If indexes are missing after deployment:

1. **DO NOT manually create them** (they'll be dropped on next migration)
2. Add index definitions to `MiloDbContext.cs`
3. Create a new migration
4. Deploy the migration

## Contact

If you see indexes being dropped or missing, immediately:
1. Check `MiloDbContext.cs` for index definitions
2. Review recent migrations
3. Create a new migration to add missing indexes
4. Deploy the fix
