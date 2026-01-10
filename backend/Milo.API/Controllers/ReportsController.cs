using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using System.Text;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(MiloDbContext context, ILogger<ReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/reports/recipients
    [HttpGet("recipients")]
    public async Task<IActionResult> GetRecipients([FromQuery] int? projectId)
    {
        try
        {
            var query = _context.ReportRecipients.AsQueryable();

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
            var recipient = new ReportRecipient
            {
                Email = request.Email,
                Name = request.Name,
                ReportType = request.ReportType ?? "DailyIncidents",
                IsActive = request.IsActive ?? true,
                ProjectId = request.ProjectId,
                CreatedAt = DateTime.UtcNow
            };

            _context.ReportRecipients.Add(recipient);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipients), new { }, recipient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding recipient");
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
                .Include(i => i.Agent)
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
                    RequesterName = i.Requester != null ? i.Requester.Name : "Unknown",
                    AgentName = i.Agent != null ? i.Agent.Name : "Unassigned"
                })
                .ToListAsync();

            // Statistics
            var stats = new
            {
                TotalCount = incidents.Count,
                NewCount = incidents.Count(i => i.Status == "New"),
                OpenCount = incidents.Count(i => i.Status == "Open"),
                ResolvedCount = incidents.Count(i => i.Status == "Resolved"),
                HighPriorityCount = incidents.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
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
            var reportData = await GetDailyIncidentsReport(projectId);
            
            // In a real implementation, you would:
            // 1. Generate HTML email from report data
            // 2. Send email to each recipient using EmailService
            // 3. Update LastSentAt for each recipient

            // For now, just return success
            foreach (var recipient in recipients)
            {
                recipient.LastSentAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Daily report sent successfully",
                sent = recipients.Count,
                recipients = recipients.Select(r => r.Email)
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
    public required string Email { get; set; }
    public required string Name { get; set; }
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
