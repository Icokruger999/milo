using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class RoadmapItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(2000)]
    public string? Description { get; set; }
    
    [ForeignKey("Product")]
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    
    [MaxLength(50)]
    public string Status { get; set; } = "planned"; // planned, in-progress, completed, cancelled
    
    [MaxLength(50)]
    public string? Category { get; set; } // feature, improvement, bug-fix, etc.
    
    public DateTime? StartDate { get; set; }
    
    public DateTime? TargetDate { get; set; }
    
    public int Priority { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
}

