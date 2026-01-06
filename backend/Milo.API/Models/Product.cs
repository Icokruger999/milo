using System.ComponentModel.DataAnnotations;

namespace Milo.API.Models;

public class Product
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string? Status { get; set; } = "active"; // active, archived
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
    public ICollection<RoadmapItem> RoadmapItems { get; set; } = new List<RoadmapItem>();
    public ICollection<TimelineEvent> TimelineEvents { get; set; } = new List<TimelineEvent>();
}

