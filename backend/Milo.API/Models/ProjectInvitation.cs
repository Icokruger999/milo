using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

public class ProjectInvitation
{
    [Key]
    public int Id { get; set; }
    
    [ForeignKey("Project")]
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string? Name { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, accepted, declined
    
    [MaxLength(100)]
    public string Token { get; set; } = string.Empty; // Unique token for invitation
    
    [ForeignKey("InvitedBy")]
    public int InvitedById { get; set; }
    public User InvitedBy { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? AcceptedAt { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
}

