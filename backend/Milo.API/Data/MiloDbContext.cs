using Microsoft.EntityFrameworkCore;
using Milo.API.Models;
using Task = Milo.API.Models.Task; // Alias to avoid conflict with System.Threading.Tasks.Task
using TaskComment = Milo.API.Models.TaskComment;

namespace Milo.API.Data;

public class MiloDbContext : DbContext
{
    public MiloDbContext(DbContextOptions<MiloDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Task> Tasks { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<RoadmapItem> RoadmapItems { get; set; }
    public DbSet<TimelineEvent> TimelineEvents { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectInvitation> ProjectInvitations { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<TaskLink> TaskLinks { get; set; }
    public DbSet<Flake> Flakes { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<Incident> Incidents { get; set; }
    public DbSet<ReportRecipient> ReportRecipients { get; set; }
    public DbSet<IncidentAssignee> IncidentAssignees { get; set; }
    public DbSet<IncidentRequester> IncidentRequesters { get; set; }
    public DbSet<IncidentGroup> IncidentGroups { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.Name).IsRequired();
        });

        // Task configuration
        modelBuilder.Entity<Task>(entity =>
        {
            entity.HasIndex(e => e.TaskId);
            entity.HasIndex(e => e.Status);
            
            // Foreign key indexes for performance (critical for board queries)
            entity.HasIndex(e => e.AssigneeId);
            entity.HasIndex(e => e.CreatorId);
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.ParentTaskId);
            entity.HasIndex(e => e.CreatedAt); // For sorting
            
            // Composite indexes for common query patterns
            entity.HasIndex(e => new { e.ProjectId, e.Status }); // Most common: filter by project + status
            entity.HasIndex(e => new { e.ProjectId, e.CreatedAt }); // Sorted lists by project
            entity.HasIndex(e => new { e.Status, e.ProjectId, e.CreatedAt }); // Board view queries
            entity.HasIndex(e => new { e.AssigneeId, e.Status }); // Assignee workload
            entity.HasIndex(e => new { e.ProjectId, e.AssigneeId, e.Status }); // Project + assignee filtering
            
            entity.HasOne(e => e.Assignee)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(e => e.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Creator)
                .WithMany(u => u.CreatedTasks)
                .HasForeignKey(e => e.CreatorId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Product)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(e => e.Name);
        });

        // RoadmapItem configuration
        modelBuilder.Entity<RoadmapItem>(entity =>
        {
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Product)
                .WithMany(p => p.RoadmapItems)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TimelineEvent configuration
        modelBuilder.Entity<TimelineEvent>(entity =>
        {
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.EventDate);
            entity.HasOne(e => e.Product)
                .WithMany(p => p.TimelineEvents)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Project configuration
        modelBuilder.Entity<Project>(entity =>
        {
            // Single column indexes
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Key);
            entity.HasIndex(e => e.OwnerId); // Foreign key index for performance
            entity.HasIndex(e => e.Status); // For filtering by status
            entity.HasIndex(e => e.CreatedAt); // For sorting
            
            // Composite indexes for common query patterns
            entity.HasIndex(e => new { e.Status, e.CreatedAt }); // Common filter: active projects sorted by date
            entity.HasIndex(e => new { e.OwnerId, e.Status }); // Projects by owner and status
            entity.HasIndex(e => new { e.Status, e.Name }); // Active projects sorted by name
            
            entity.HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ProjectInvitation configuration
        modelBuilder.Entity<ProjectInvitation>(entity =>
        {
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.InvitedById); // Foreign key index for performance
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Invitations)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.InvitedBy)
                .WithMany()
                .HasForeignKey(e => e.InvitedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ProjectMember configuration
        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.ProjectId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Task Project relationship
        modelBuilder.Entity<Task>(entity =>
        {
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            
            // Parent/Child task relationships
            entity.HasOne(e => e.ParentTask)
                .WithMany(t => t.ChildTasks)
                .HasForeignKey(e => e.ParentTaskId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        
        // TaskLink configuration
        modelBuilder.Entity<TaskLink>(entity =>
        {
            entity.HasIndex(e => e.SourceTaskId);
            entity.HasIndex(e => e.TargetTaskId);
            entity.HasIndex(e => new { e.SourceTaskId, e.TargetTaskId });
            entity.HasOne(e => e.SourceTask)
                .WithMany(t => t.LinkedTasks)
                .HasForeignKey(e => e.SourceTaskId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.TargetTask)
                .WithMany(t => t.LinkedFromTasks)
                .HasForeignKey(e => e.TargetTaskId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Label configuration
        modelBuilder.Entity<Label>(entity =>
        {
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.ProjectId);
            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TaskComment configuration
        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.HasIndex(e => e.TaskId);
            entity.HasIndex(e => e.AuthorId);
            entity.HasOne(e => e.Task)
                .WithMany()
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author)
                .WithMany()
                .HasForeignKey(e => e.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Flake configuration
        modelBuilder.Entity<Flake>(entity =>
        {
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.AuthorId);
            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author)
                .WithMany()
                .HasForeignKey(e => e.AuthorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Team configuration
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.CreatedById); // Foreign key index for performance
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Teams)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // TeamMember configuration
        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasIndex(e => e.TeamId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.TeamId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Team)
                .WithMany(t => t.Members)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Incident configuration
        modelBuilder.Entity<Incident>(entity =>
        {
            entity.ToTable("Incidents"); // Map to PascalCase table name
            entity.HasIndex(e => e.IncidentNumber).IsUnique();
            
            // Single column indexes for common filters
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Priority);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.RequesterId); // Foreign key index for performance
            entity.HasIndex(e => e.AgentId); // Foreign key index for performance
            entity.HasIndex(e => e.GroupId); // Foreign key index for performance
            
            // Composite indexes for common query patterns
            entity.HasIndex(e => new { e.ProjectId, e.Status }); // Most common filter: project + status
            entity.HasIndex(e => new { e.ProjectId, e.CreatedAt }); // Sorted lists by project
            entity.HasIndex(e => new { e.Status, e.Priority }); // Priority filtering by status
            entity.HasIndex(e => new { e.RequesterId, e.CreatedAt }); // Requester history queries
            entity.HasIndex(e => new { e.AgentId, e.Status }); // Agent workload queries
            entity.HasIndex(e => new { e.ProjectId, e.Status, e.CreatedAt }); // Complex filtering with sorting
            
            entity.HasOne(e => e.Requester)
                .WithMany()
                .HasForeignKey(e => e.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Assignee)
                .WithMany()
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Group)
                .WithMany()
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ReportRecipient configuration
        modelBuilder.Entity<ReportRecipient>(entity =>
        {
            entity.ToTable("ReportRecipients"); // Map to PascalCase table name
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.IsActive);
            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // IncidentAssignee configuration - map to snake_case columns
        modelBuilder.Entity<IncidentAssignee>(entity =>
        {
            entity.ToTable("incident_assignees");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.IsActive);
        });

        // IncidentRequester configuration - map to snake_case columns
        modelBuilder.Entity<IncidentRequester>(entity =>
        {
            entity.ToTable("incident_requesters");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.IsActive);
        });

        // IncidentGroup configuration - map to snake_case columns
        modelBuilder.Entity<IncidentGroup>(entity =>
        {
            entity.ToTable("incident_groups");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
        });

        // Force all table and column names to snake_case for PostgreSQL compatibility
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Force snake_case table names
            var tableName = entity.GetTableName();
            if (tableName != null)
            {
                entity.SetTableName(ToSnakeCase(tableName));
            }
            
            // Force snake_case column names
            foreach (var property in entity.GetProperties())
            {
                var propertyName = property.Name;
                property.SetColumnName(ToSnakeCase(propertyName));
            }
        }
    }

    /// <summary>
    /// Converts PascalCase or camelCase to snake_case.
    /// Example: CreatedAt -> created_at, UserID -> user_id, MyProperty -> my_property
    /// </summary>
    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var result = new System.Text.StringBuilder();
        result.Append(char.ToLowerInvariant(input[0]));

        for (int i = 1; i < input.Length; i++)
        {
            if (char.IsUpper(input[i]))
            {
                result.Append('_');
                result.Append(char.ToLowerInvariant(input[i]));
            }
            else
            {
                result.Append(input[i]);
            }
        }

        return result.ToString();
    }
}

