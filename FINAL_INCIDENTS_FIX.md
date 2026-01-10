# ✅ FINAL INCIDENTS FIX - Complete Solution

## The Real Problem
The database columns are in snake_case (`incident_number`, `requester_id`) but Entity Framework expects PascalCase (`IncidentNumber`, `RequesterId`).

## The Complete Fix

We need to configure Entity Framework to map to snake_case column names. Add this to `MiloDbContext.cs`:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Configure Incident entity with snake_case column names
    modelBuilder.Entity<Incident>(entity =>
    {
        entity.ToTable("Incidents");
        
        // Map properties to snake_case columns
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.IncidentNumber).HasColumnName("incident_number");
        entity.Property(e => e.Subject).HasColumnName("subject");
        entity.Property(e => e.Description).HasColumnName("description");
        entity.Property(e => e.RequesterId).HasColumnName("requester_id");
        entity.Property(e => e.AgentId).HasColumnName("agent_id");
        entity.Property(e => e.GroupId).HasColumnName("group_id");
        entity.Property(e => e.ProjectId).HasColumnName("project_id");
        entity.Property(e => e.Department).HasColumnName("department");
        entity.Property(e => e.Status).HasColumnName("status");
        entity.Property(e => e.Priority).HasColumnName("priority");
        entity.Property(e => e.Urgency).HasColumnName("urgency");
        entity.Property(e => e.Impact).HasColumnName("impact");
        entity.Property(e => e.Source).HasColumnName("source");
        entity.Property(e => e.Category).HasColumnName("category");
        entity.Property(e => e.SubCategory).HasColumnName("sub_category");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at");
        entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
        entity.Property(e => e.PlannedStartDate).HasColumnName("planned_start_date");
        entity.Property(e => e.PlannedEndDate).HasColumnName("planned_end_date");
        entity.Property(e => e.PlannedEffort).HasColumnName("planned_effort");
        entity.Property(e => e.FirstResponseDue).HasColumnName("first_response_due");
        entity.Property(e => e.ResolutionDue).HasColumnName("resolution_due");
        entity.Property(e => e.FirstResponseAt).HasColumnName("first_response_at");
        entity.Property(e => e.Tags).HasColumnName("tags");
        entity.Property(e => e.AssociatedAssets).HasColumnName("associated_assets");
        entity.Property(e => e.Attachments).HasColumnName("attachments");
        entity.Property(e => e.Resolution).HasColumnName("resolution");
        
        // Keep existing indexes and relationships
        entity.HasIndex(e => e.IncidentNumber).IsUnique();
        entity.HasIndex(e => e.Status);
        entity.HasIndex(e => e.Priority);
        entity.HasIndex(e => e.CreatedAt);
        entity.HasIndex(e => e.ProjectId);
        
        // Note: Foreign keys removed to avoid dependency issues
    });
}
```

## Easier Alternative: Rename Database Columns

Instead of changing code, rename all columns to PascalCase:

```sql
ALTER TABLE "Incidents" RENAME COLUMN incident_number TO "IncidentNumber";
ALTER TABLE "Incidents" RENAME COLUMN requester_id TO "RequesterId";
ALTER TABLE "Incidents" RENAME COLUMN agent_id TO "AgentId";
ALTER TABLE "Incidents" RENAME COLUMN group_id TO "GroupId";
ALTER TABLE "Incidents" RENAME COLUMN project_id TO "ProjectId";
ALTER TABLE "Incidents" RENAME COLUMN sub_category TO "SubCategory";
ALTER TABLE "Incidents" RENAME COLUMN created_at TO "CreatedAt";
ALTER TABLE "Incidents" RENAME COLUMN updated_at TO "UpdatedAt";
ALTER TABLE "Incidents" RENAME COLUMN resolved_at TO "ResolvedAt";
ALTER TABLE "Incidents" RENAME COLUMN closed_at TO "ClosedAt";
ALTER TABLE "Incidents" RENAME COLUMN planned_start_date TO "PlannedStartDate";
ALTER TABLE "Incidents" RENAME COLUMN planned_end_date TO "PlannedEndDate";
ALTER TABLE "Incidents" RENAME COLUMN planned_effort TO "PlannedEffort";
ALTER TABLE "Incidents" RENAME COLUMN first_response_due TO "FirstResponseDue";
ALTER TABLE "Incidents" RENAME COLUMN resolution_due TO "ResolutionDue";
ALTER TABLE "Incidents" RENAME COLUMN first_response_at TO "FirstResponseAt";
ALTER TABLE "Incidents" RENAME COLUMN associated_assets TO "AssociatedAssets";
```

## Recommended: Use the Database Rename (Faster)

This avoids code changes and backend redeployment. Just run the SQL commands above.

---

**Status**: Identified root cause - column name mismatch
**Solution**: Either update code OR rename database columns
**Recommendation**: Rename database columns (faster, no deployment needed)
