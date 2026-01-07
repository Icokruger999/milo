using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class Flake
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(10000)]
    public string? Content { get; set; }
    
    [ForeignKey("Project")]
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    
    [ForeignKey("Author")]
    public int? AuthorId { get; set; }
    public User? Author { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; } = false;
}

