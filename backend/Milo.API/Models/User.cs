using System.ComponentModel.DataAnnotations;

namespace Milo.API.Models;

public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    public bool RequiresPasswordChange { get; set; } = false;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Task> AssignedTasks { get; set; } = new List<Task>();
    public ICollection<Task> CreatedTasks { get; set; } = new List<Task>();
}

