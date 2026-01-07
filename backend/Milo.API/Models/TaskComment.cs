using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class TaskComment
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [ForeignKey("Task")]
    public int TaskId { get; set; }
    public Task Task { get; set; } = null!;
    
    [Required]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
    
    [ForeignKey("Author")]
    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; } = false;
}

