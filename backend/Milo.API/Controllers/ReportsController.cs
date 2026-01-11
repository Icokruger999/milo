using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;
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
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Email and Name are required" });
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

            return Ok(recipient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding recipient: {Error}", ex.Message);
            return StatusCode(500, new { message = "Error adding recipient", error = ex.Message });
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
            // Get recipients
            var recipientsQuery = _context.ReportRecipients.Where(r => r.IsActive);
            
            if (projectId.HasValue)
            {
                recipientsQuery = recipientsQuery.Where(r => r.ProjectId == projectId.Value);
            }

            var recipients = await recipientsQuery.ToListAsync();

            if (!recipients.Any())
            {
                return Ok(new { message = "No active recipients found", sent = 0 });
            }

            // Get report data
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
                .ToListAsync();

            // Prepare report data
            var incidentsList2 = incidents.ToList(); // Ensure it's a list
            var reportData = new DailyReportData
            {
                Date = today,
                TotalCount = incidentsList2.Count,
                NewCount = incidentsList2.Count(i => i.Status == "New"),
                OpenCount = incidentsList2.Count(i => i.Status == "Open"),
                ResolvedCount = incidentsList2.Count(i => i.Status == "Resolved"),
                HighPriorityCount = incidentsList2.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
                Incidents = incidents.Select(i => new IncidentSummary
                {
                    IncidentNumber = i.IncidentNumber,
                    Subject = i.Subject,
                    Status = i.Status,
                    Priority = i.Priority,
                    RequesterName = i.Requester?.Name ?? "Unknown",
                    AgentName = i.Assignee?.Name ?? "Unassigned",
                    ResolutionTime = i.ResolvedAt.HasValue && i.CreatedAt != default 
                        ? i.ResolvedAt.Value - i.CreatedAt 
                        : null
                }).ToList()
            };

            // Send emails
            int successCount = 0;
            var failedRecipients = new List<string>();

            foreach (var recipient in recipients)
            {
                var sent = await _emailService.SendDailyIncidentReportAsync(
                    recipient.Email, 
                    recipient.Name, 
                    reportData
                );

                if (sent)
                {
                    recipient.LastSentAt = DateTime.UtcNow;
                    successCount++;
                }
                else
                {
                    failedRecipients.Add(recipient.Email);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Daily report sent to {successCount} of {recipients.Count} recipients",
                sent = successCount,
                failed = failedRecipients.Count,
                failedRecipients = failedRecipients.Any() ? failedRecipients : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily report");
            return StatusCode(500, new { message = "Error sending report", error = ex.Message });
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
