using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

[Table("TeamMembers")]
public class TeamMember
{
    [Key]
    public int Id { get; set; }
    
    public int TeamId { get; set; }
    
    [ForeignKey("TeamId")]
    public Team Team { get; set; } = null!;
    
    public int UserId { get; set; }
    
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
    
    [MaxLength(100)]
    public string? Title { get; set; }
    
    [MaxLength(50)]
    public string Role { get; set; } = "member"; // member, lead, admin
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
}

