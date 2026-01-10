using System.ComponentModel.DataAnnotations;

namespace Milo.API.Models;

public class ReportRecipient
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [EmailAddress]
    [StringLength(200)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(50)]
    public string ReportType { get; set; } = "DailyIncidents"; // DailyIncidents, WeeklyIncidents, etc.
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastSentAt { get; set; }
    
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
}
