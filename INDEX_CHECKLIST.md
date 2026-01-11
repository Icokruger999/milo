# Database Index Checklist

## CRITICAL RULE: Indexes Defined in Code Are Permanent

**All indexes MUST be defined in `backend/Milo.API/Data/MiloDbContext.cs`**
**EF Core migrations will create/update indexes - they will NOT drop them if defined in code**

## Index Status by Table

### ✅ Tasks Table - ALL INDEXES DEFINED
- TaskId (unique)
- Status
- AssigneeId (FK) ✅
- CreatorId (FK) ✅
- ProductId (FK) ✅
- ProjectId (FK) ✅
- ParentTaskId (FK) ✅
- CreatedAt ✅
- Composite: (ProjectId, Status) ✅
- Composite: (ProjectId, CreatedAt) ✅
- Composite: (Status, ProjectId, CreatedAt) ✅
- Composite: (AssigneeId, Status) ✅
- Composite: (ProjectId, AssigneeId, Status) ✅

### ✅ Incidents Table - ALL INDEXES DEFINED
- IncidentNumber (unique)
- Status
- Priority
- CreatedAt
- ProjectId (FK) ✅
- RequesterId (FK) ✅
- AgentId (FK) ✅
- GroupId (FK) ✅
- Composite: (ProjectId, Status) ✅
- Composite: (ProjectId, CreatedAt) ✅
- Composite: (Status, Priority) ✅
- Composite: (RequesterId, CreatedAt) ✅
- Composite: (AgentId, Status) ✅
- Composite: (ProjectId, Status, CreatedAt) ✅

### ✅ Projects Table - ALL INDEXES DEFINED
- Name
- Key (unique)
- OwnerId (FK) ✅ **ADDED**

### ✅ ProjectInvitation Table - ALL INDEXES DEFINED
- Email
- Token (unique)
- ProjectId (FK) ✅
- InvitedById (FK) ✅ **ADDED**

### ✅ ProjectMember Table - ALL INDEXES DEFINED
- ProjectId (FK) ✅
- UserId (FK) ✅
- Composite: (ProjectId, UserId) unique ✅

### ✅ Team Table - ALL INDEXES DEFINED
- Name
- ProjectId (FK) ✅
- CreatedById (FK) ✅ **ADDED**

### ✅ TeamMember Table - ALL INDEXES DEFINED
- TeamId (FK) ✅
- UserId (FK) ✅
- Composite: (TeamId, UserId) unique ✅

### ✅ Other Tables - All Foreign Keys Indexed
- TaskComment: TaskId ✅, AuthorId ✅
- TaskLink: SourceTaskId ✅, TargetTaskId ✅
- Label: ProjectId ✅
- Flake: ProjectId ✅, AuthorId ✅
- ReportRecipient: ProjectId ✅
- IncidentAssignee: Email ✅, IsActive ✅
- IncidentRequester: Email ✅, IsActive ✅
- IncidentGroup: Name ✅, IsActive ✅

## Verification

After every deployment, verify indexes exist:

```sql
-- Check all indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## When Adding New Columns

**RULE: If a column is:**
1. A foreign key → MUST have an index
2. Used in WHERE clauses → MUST have an index
3. Used in ORDER BY → SHOULD have an index
4. Part of common query patterns → Consider composite index

**ALWAYS add the index definition to MiloDbContext.cs BEFORE creating a migration**
