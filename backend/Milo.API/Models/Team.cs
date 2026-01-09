using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

[Table("Teams")]
public class Team
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string? Avatar { get; set; }
    
    public int? ProjectId { get; set; }
    
    [ForeignKey("ProjectId")]
    public Project? Project { get; set; }
    
    public int CreatedById { get; set; }
    
    [ForeignKey("CreatedById")]
    public User CreatedBy { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; } = false;
    
    // Navigation property
    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
}

