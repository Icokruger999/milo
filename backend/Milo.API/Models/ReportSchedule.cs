using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Milo.API.Models;

[Table("report_schedules")]
public class ReportSchedule
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("project_id")]
    public int? ProjectId { get; set; }

    [Column("frequency")]
    [Required]
    [MaxLength(20)]
    public string Frequency { get; set; } = "manual"; // manual, daily, weekly, monthly

    [Column("time")]
    [Required]
    [MaxLength(5)]
    public string Time { get; set; } = "09:00"; // HH:mm format

    [Column("weekday")]
    public int? Weekday { get; set; } // 0-6 (Sunday-Saturday) for weekly

    [Column("month_day")]
    public int? MonthDay { get; set; } // 1-31 for monthly

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("last_run_at")]
    public DateTime? LastRunAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("ProjectId")]
    public Project? Project { get; set; }
}
