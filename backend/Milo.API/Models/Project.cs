using System.ComponentModel.DataAnnotations;

namespace Milo.API.Models;

public class Project
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string? Key { get; set; } // Project key like "MILO", "BG", etc.
    
    [MaxLength(50)]
    public string Status { get; set; } = "active"; // active, archived
    
    [ForeignKey("Owner")]
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
    public ICollection<ProjectInvitation> Invitations { get; set; } = new List<ProjectInvitation>();
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
}

