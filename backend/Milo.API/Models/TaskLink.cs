using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class TaskLink
{
    [Key]
    public int Id { get; set; }
    
    [ForeignKey("SourceTask")]
    public int SourceTaskId { get; set; }
    public Task SourceTask { get; set; } = null!;
    
    [ForeignKey("TargetTask")]
    public int TargetTaskId { get; set; }
    public Task TargetTask { get; set; } = null!;
    
    [MaxLength(50)]
    public string LinkType { get; set; } = "relates"; // relates, blocks, duplicates, etc.
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

