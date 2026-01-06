using Microsoft.EntityFrameworkCore;
using Milo.API.Models;

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
    }
}

