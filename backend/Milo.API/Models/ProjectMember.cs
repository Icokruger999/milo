using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class ProjectMember
{
    [Key]
    public int Id { get; set; }
    
    [ForeignKey("Project")]
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    [ForeignKey("User")]
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    [MaxLength(50)]
    public string Role { get; set; } = "member"; // owner, admin, member
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

