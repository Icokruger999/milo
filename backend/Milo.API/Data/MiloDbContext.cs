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
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Key);
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
    }
}

