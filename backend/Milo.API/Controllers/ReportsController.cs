using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;
using System.Data;
using System.Text;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<ReportsController> _logger;
    private readonly IEmailService _emailService;

    public ReportsController(MiloDbContext context, ILogger<ReportsController> logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    // GET: api/reports/recipients
    [HttpGet("recipients")]
    public async Task<IActionResult> GetRecipients([FromQuery] int? projectId)
    {
        try
        {
            var query = _context.ReportRecipients
                .AsNoTracking() // Performance: Read-only query
                .AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(r => r.ProjectId == projectId.Value);
            }

            var recipients = await query
                .OrderBy(r => r.Name)
                .ToListAsync();

            return Ok(recipients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching report recipients");
            return StatusCode(500, new { message = "Error fetching recipients", error = ex.Message });
        }
    }

    // POST: api/reports/recipients
    [HttpPost("recipients")]
    public async Task<IActionResult> AddRecipient([FromBody] AddRecipientRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request body is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Email and Name are required" });
            }

            // Check if recipient already exists with same email and project
            // Use raw SQL with direct connection to avoid EF Core column mapping issues
            var emailToCheck = request.Email.Trim().ToLower();
            var projectIdToCheck = request.ProjectId;
            
            // Use direct SQL execution to avoid any EF Core entity mapping
            // This completely bypasses entity mapping by using ADO.NET directly
            bool recipientExists;
            var connection = _context.Database.GetDbConnection();
            
            var wasOpen = connection.State == ConnectionState.Open;
            if (!wasOpen)
            {
                await connection.OpenAsync();
            }
            
            try
            {
                using var command = connection.CreateCommand();
                if (projectIdToCheck.HasValue)
                {
                    command.CommandText = "SELECT COUNT(*) FROM report_recipients WHERE LOWER(email) = LOWER(@email) AND project_id = @project_id";
                    var emailParam = command.CreateParameter();
                    emailParam.ParameterName = "@email";
                    emailParam.Value = emailToCheck;
                    command.Parameters.Add(emailParam);
                    
                    var projectParam = command.CreateParameter();
                    projectParam.ParameterName = "@project_id";
                    projectParam.Value = projectIdToCheck.Value;
                    command.Parameters.Add(projectParam);
                }
                else
                {
                    command.CommandText = "SELECT COUNT(*) FROM report_recipients WHERE LOWER(email) = LOWER(@email) AND project_id IS NULL";
                    var emailParam = command.CreateParameter();
                    emailParam.ParameterName = "@email";
                    emailParam.Value = emailToCheck;
                    command.Parameters.Add(emailParam);
                }
                
                var result = await command.ExecuteScalarAsync();
                var count = result != null ? Convert.ToInt32(result) : 0;
                recipientExists = count > 0;
            }
            finally
            {
                // Don't close connection if EF Core opened it - let EF Core manage it
                // Only close if we opened it ourselves
                if (!wasOpen && connection.State == ConnectionState.Open)
                {
                    await connection.CloseAsync();
                }
            }
            
            if (recipientExists)
            {
                return BadRequest(new { message = "A recipient with this email already exists for this project" });
            }

            var recipient = new ReportRecipient
            {
                Email = request.Email.Trim(),
                Name = request.Name.Trim(),
                ReportType = request.ReportType ?? "DailyIncidents",
                IsActive = request.IsActive ?? true,
                ProjectId = request.ProjectId,
                CreatedAt = DateTime.UtcNow
            };

            _context.ReportRecipients.Add(recipient);
            await _context.SaveChangesAsync();

            // Return the created recipient with proper serialization
            return Ok(new
            {
                id = recipient.Id,
                email = recipient.Email,
                name = recipient.Name,
                reportType = recipient.ReportType,
                isActive = recipient.IsActive,
                projectId = recipient.ProjectId,
                createdAt = recipient.CreatedAt
            });
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error adding recipient: {Error}", dbEx.Message);
            return StatusCode(500, new { message = "Database error adding recipient", error = dbEx.InnerException?.Message ?? dbEx.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding recipient: {Error}", ex.Message);
            _logger.LogError(ex, "Stack trace: {StackTrace}", ex.StackTrace);
            return StatusCode(500, new { message = "Error adding recipient", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    // DELETE: api/reports/recipients/{id}
    [HttpDelete("recipients/{id}")]
    public async Task<IActionResult> DeleteRecipient(int id)
    {
        try
        {
            var recipient = await _context.ReportRecipients.FindAsync(id);
            if (recipient == null)
            {
                return NotFound(new { message = $"Recipient with ID {id} not found" });
            }

            _context.ReportRecipients.Remove(recipient);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Recipient deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipient {RecipientId}", id);
            return StatusCode(500, new { message = "Error deleting recipient", error = ex.Message });
        }
    }

    // PUT: api/reports/recipients/{id}
    [HttpPut("recipients/{id}")]
    public async Task<IActionResult> UpdateRecipient(int id, [FromBody] UpdateRecipientRequest request)
    {
        try
        {
            var recipient = await _context.ReportRecipients.FindAsync(id);
            if (recipient == null)
            {
                return NotFound(new { message = $"Recipient with ID {id} not found" });
            }

            if (!string.IsNullOrEmpty(request.Email))
                recipient.Email = request.Email;

            if (!string.IsNullOrEmpty(request.Name))
                recipient.Name = request.Name;

            if (request.IsActive.HasValue)
                recipient.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            return Ok(recipient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipient {RecipientId}", id);
            return StatusCode(500, new { message = "Error updating recipient", error = ex.Message });
        }
    }

    // GET: api/reports/incidents/daily
    [HttpGet("incidents/daily")]
    public async Task<IActionResult> GetDailyIncidentsReport([FromQuery] int? projectId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var query = _context.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .Where(i => i.CreatedAt >= today && i.CreatedAt < tomorrow);

            if (projectId.HasValue)
            {
                query = query.Where(i => i.ProjectId == projectId.Value);
            }

            var incidents = await query
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    i.Id,
                    i.IncidentNumber,
                    i.Subject,
                    i.Status,
                    i.Priority,
                    i.CreatedAt,
                    i.ResolvedAt,
                    RequesterName = i.Requester != null ? i.Requester.Name : "Unknown",
                    AssigneeName = i.Assignee != null ? i.Assignee.Name : "Unassigned"
                })
                .ToListAsync();

            // Statistics
            var incidentsList = incidents.ToList(); // Ensure it's a list
            var stats = new
            {
                TotalCount = incidentsList.Count,
                NewCount = incidentsList.Count(i => i.Status == "New"),
                OpenCount = incidentsList.Count(i => i.Status == "Open"),
                ResolvedCount = incidentsList.Count(i => i.Status == "Resolved"),
                HighPriorityCount = incidentsList.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
                Date = today.ToString("yyyy-MM-dd")
            };

            return Ok(new { statistics = stats, incidents });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating daily incidents report");
            return StatusCode(500, new { message = "Error generating report", error = ex.Message });
        }
    }

    // POST: api/reports/incidents/send-daily
    [HttpPost("incidents/send-daily")]
    public async Task<IActionResult> SendDailyReport([FromQuery] int? projectId)
    {
        try
        {
            // Use the email service method that sends to all recipients
            int sent = await _emailService.SendDailyIncidentReportsToAllRecipientsAsync(projectId);

            return Ok(new
            {
                message = $"Daily report sent to {sent} recipient(s)",
                sent = sent
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily report");
            return StatusCode(500, new { message = "Error sending report", error = ex.Message });
        }
    }

    // GET: api/reports/schedule
    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule([FromQuery] int? projectId)
    {
        try
        {
            var query = _context.ReportSchedules.AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(s => s.ProjectId == projectId.Value);
            }
            else
            {
                query = query.Where(s => s.ProjectId == null);
            }

            var schedule = await query.FirstOrDefaultAsync();

            if (schedule == null)
            {
                // Return default settings
                return Ok(new
                {
                    frequency = "manual",
                    time = "09:00",
                    weekday = 1,
                    monthDay = 1,
                    isActive = false
                });
            }

            return Ok(new
            {
                id = schedule.Id,
                frequency = schedule.Frequency,
                time = schedule.Time,
                weekday = schedule.Weekday,
                monthDay = schedule.MonthDay,
                isActive = schedule.IsActive,
                lastRunAt = schedule.LastRunAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching schedule");
            return StatusCode(500, new { message = "Error fetching schedule", error = ex.Message });
        }
    }

    // POST: api/reports/schedule
    [HttpPost("schedule")]
    public async Task<IActionResult> SaveSchedule([FromBody] SaveScheduleRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request body is required" });
            }

            var query = _context.ReportSchedules.AsQueryable();

            if (request.ProjectId.HasValue)
            {
                query = query.Where(s => s.ProjectId == request.ProjectId.Value);
            }
            else
            {
                query = query.Where(s => s.ProjectId == null);
            }

            var schedule = await query.FirstOrDefaultAsync();

            if (schedule == null)
            {
                // Create new schedule
                schedule = new ReportSchedule
                {
                    ProjectId = request.ProjectId,
                    Frequency = request.Frequency ?? "manual",
                    Time = request.Time ?? "09:00",
                    Weekday = request.Weekday,
                    MonthDay = request.MonthDay,
                    IsActive = request.Frequency != "manual",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.ReportSchedules.Add(schedule);
            }
            else
            {
                // Update existing schedule
                schedule.Frequency = request.Frequency ?? schedule.Frequency;
                schedule.Time = request.Time ?? schedule.Time;
                schedule.Weekday = request.Weekday;
                schedule.MonthDay = request.MonthDay;
                schedule.IsActive = request.Frequency != "manual";
                schedule.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Schedule settings saved successfully",
                schedule = new
                {
                    id = schedule.Id,
                    frequency = schedule.Frequency,
                    time = schedule.Time,
                    weekday = schedule.Weekday,
                    monthDay = schedule.MonthDay,
                    isActive = schedule.IsActive
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving schedule");
            return StatusCode(500, new { message = "Error saving schedule", error = ex.Message });
        }
    }
}

// Request DTOs
public class AddRecipientRequest
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ReportType { get; set; }
    public bool? IsActive { get; set; }
    public int? ProjectId { get; set; }
}

public class UpdateRecipientRequest
{
    public string? Email { get; set; }
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
}

public class SaveScheduleRequest
{
    public string? Frequency { get; set; }
    public string? Time { get; set; }
    public int? Weekday { get; set; }
    public int? MonthDay { get; set; }
    public int? ProjectId { get; set; }
}
