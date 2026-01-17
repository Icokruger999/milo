using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class SubProject
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [ForeignKey("Project")]
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    [ForeignKey("Department")]
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    [MaxLength(7)]
    public string Color { get; set; } = "#0052CC"; // Hex color code
    
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
    
    // Timeline positioning (for Gantt chart)
    public DateTime? TimelineStartDate { get; set; }
    
    public DateTime? TimelineEndDate { get; set; }
    
    public int? TimelineX { get; set; } // Pixel position
    
    public int? TimelineY { get; set; } // Pixel position
    
    public int? TimelineWidth { get; set; } // Pixel width
    
    public int? TimelineHeight { get; set; } // Pixel height
    
    public bool OnTimeline { get; set; } = false;
    
    public int? Duration { get; set; } // Days
    
    [MaxLength(500)]
    public string? CustomText { get; set; } // Custom text on timeline bar
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation property for tasks
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
}
