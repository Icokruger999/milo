using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class TimelineEvent
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
    
    [Required]
    public DateTime EventDate { get; set; }
    
    [MaxLength(50)]
    public string EventType { get; set; } = "milestone"; // milestone, release, deadline, etc.
    
    [MaxLength(50)]
    public string? Status { get; set; } = "upcoming"; // upcoming, completed, cancelled
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
}

