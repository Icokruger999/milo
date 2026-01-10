using System.ComponentModel.DataAnnotations;

namespace Milo.API.Models;

public class Incident
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(50)]
    public string IncidentNumber { get; set; } = string.Empty; // e.g., INC-001
    
    [Required]
    [StringLength(200)]
    public string Subject { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    // Requester Information
    public int RequesterId { get; set; }
    public IncidentRequester? Requester { get; set; }
    
    // Assignment (changed from Agent to Assignee)
    public int? AgentId { get; set; } // Keep name for backward compatibility, but references IncidentAssignee
    public IncidentAssignee? Assignee { get; set; }
    
    public int? GroupId { get; set; }
    public IncidentGroup? Group { get; set; }
    
    [StringLength(100)]
    public string? Department { get; set; }
    
    // Status and Priority
    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "New"; // New, Open, Pending, Resolved, Closed
    
    [Required]
    [StringLength(50)]
    public string Priority { get; set; } = "Low"; // Low, Medium, High, Urgent
    
    [StringLength(50)]
    public string? Urgency { get; set; } // Low, Medium, High
    
    [StringLength(50)]
    public string? Impact { get; set; } // Low, Medium, High
    
    // Source
    [StringLength(50)]
    public string? Source { get; set; } // Phone, Email, Portal, Chat
    
    // Category
    [StringLength(100)]
    public string? Category { get; set; }
    
    [StringLength(100)]
    public string? SubCategory { get; set; }
    
    // Dates and Time Tracking
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    
    [StringLength(50)]
    public string? PlannedEffort { get; set; } // e.g., "1h 30m"
    
    // SLA
    public DateTime? FirstResponseDue { get; set; }
    public DateTime? ResolutionDue { get; set; }
    public DateTime? FirstResponseAt { get; set; }
    
    // Additional Fields
    [StringLength(500)]
    public string? Tags { get; set; } // Comma-separated tags
    
    public string? AssociatedAssets { get; set; } // JSON array of asset IDs
    
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    
    // Attachments (stored as JSON array of file paths/URLs)
    public string? Attachments { get; set; }
    
    // Resolution
    public string? Resolution { get; set; }
}
