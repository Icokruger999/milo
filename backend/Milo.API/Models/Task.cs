using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class Task
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(2000)]
    public string? Description { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "todo"; // todo, progress, review, done
    
    [MaxLength(50)]
    public string? Label { get; set; } // accounts, billing, etc.
    
    [MaxLength(20)]
    public string? TaskId { get; set; } // e.g., NUC-344
    
    [ForeignKey("Assignee")]
    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }
    
    [ForeignKey("Creator")]
    public int? CreatorId { get; set; }
    public User? Creator { get; set; }
    
    [ForeignKey("Product")]
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    
    [ForeignKey("Project")]
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    
    public int Priority { get; set; } = 0; // 0 = low, 1 = medium, 2 = high
    
    public DateTime? DueDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; } = false;
    
    // Navigation property for comments
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
}

