using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<IncidentsController> _logger;
    private readonly IEmailService _emailService;

    public IncidentsController(MiloDbContext context, ILogger<IncidentsController> logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    // GET: api/incidents
    [HttpGet]
    public async Task<IActionResult> GetIncidents([FromQuery] int? projectId, [FromQuery] string? status)
    {
        try
        {
            var query = _context.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .Include(i => i.Group)
                .Include(i => i.Project)
                .AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(i => i.ProjectId == projectId.Value);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(i => i.Status.ToLower() == status.ToLower());
            }

            var incidents = await query
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    i.Id,
                    i.IncidentNumber,
                    i.Subject,
                    i.Description,
                    i.Status,
                    i.Priority,
                    i.Urgency,
                    i.Impact,
                    i.Source,
                    i.Category,
                    i.SubCategory,
                    i.Department,
                    i.CreatedAt,
                    i.UpdatedAt,
                    i.ResolvedAt,
                    i.ClosedAt,
                    i.FirstResponseDue,
                    i.ResolutionDue,
                    i.PlannedStartDate,
                    i.PlannedEndDate,
                    i.PlannedEffort,
                    i.Tags,
                    i.AssociatedAssets,
                    i.Attachments,
                    i.Resolution,
                    i.ProjectId,
                    Requester = i.Requester == null ? null : new
                    {
                        i.Requester.Id,
                        i.Requester.Name,
                        i.Requester.Email
                    },
                    Agent = i.Assignee == null ? null : new
                    {
                        i.Assignee.Id,
                        i.Assignee.Name,
                        i.Assignee.Email
                    },
                    Group = i.Group == null ? null : new
                    {
                        i.Group.Id,
                        i.Group.Name
                    }
                })
                .ToListAsync();

            return Ok(incidents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching incidents");
            return StatusCode(500, new { message = "Error fetching incidents", error = ex.Message });
        }
    }

    // GET: api/incidents/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetIncident(int id)
    {
        try
        {
            var incident = await _context.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .Include(i => i.Group)
                .Include(i => i.Project)
                .Where(i => i.Id == id)
                .Select(i => new
                {
                    i.Id,
                    i.IncidentNumber,
                    i.Subject,
                    i.Description,
                    i.Status,
                    i.Priority,
                    i.Urgency,
                    i.Impact,
                    i.Source,
                    i.Category,
                    i.SubCategory,
                    i.Department,
                    i.CreatedAt,
                    i.UpdatedAt,
                    i.ResolvedAt,
                    i.ClosedAt,
                    i.FirstResponseDue,
                    i.ResolutionDue,
                    i.FirstResponseAt,
                    i.PlannedStartDate,
                    i.PlannedEndDate,
                    i.PlannedEffort,
                    i.Tags,
                    i.AssociatedAssets,
                    i.Attachments,
                    i.Resolution,
                    i.ProjectId,
                    Requester = i.Requester == null ? null : new
                    {
                        i.Requester.Id,
                        i.Requester.Name,
                        i.Requester.Email
                    },
                    Agent = i.Assignee == null ? null : new
                    {
                        i.Assignee.Id,
                        i.Assignee.Name,
                        i.Assignee.Email
                    },
                    Group = i.Group == null ? null : new
                    {
                        i.Group.Id,
                        i.Group.Name
                    },
                    Project = i.Project == null ? null : new
                    {
                        i.Project.Id,
                        i.Project.Name
                    }
                })
                .FirstOrDefaultAsync();

            if (incident == null)
            {
                return NotFound(new { message = $"Incident with ID {id} not found" });
            }

            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching incident {IncidentId}", id);
            return StatusCode(500, new { message = "Error fetching incident", error = ex.Message });
        }
    }

    // POST: api/incidents
    [HttpPost]
    public async Task<IActionResult> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        try
        {
            // Generate incident number
            var lastIncident = await _context.Incidents
                .OrderByDescending(i => i.Id)
                .FirstOrDefaultAsync();
            
            int nextNumber = 1;
            if (lastIncident != null && !string.IsNullOrEmpty(lastIncident.IncidentNumber))
            {
                var parts = lastIncident.IncidentNumber.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out int lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            
            string incidentNumber = $"INC-{nextNumber:D3}";

            var incident = new Incident
            {
                IncidentNumber = incidentNumber,
                Subject = request.Subject,
                Description = request.Description,
                RequesterId = request.RequesterId,
                AgentId = request.AgentId,
                GroupId = request.GroupId,
                Department = request.Department,
                Status = request.Status ?? "New",
                Priority = request.Priority ?? "Low",
                Urgency = request.Urgency,
                Impact = request.Impact,
                Source = request.Source,
                Category = request.Category,
                SubCategory = request.SubCategory,
                PlannedStartDate = request.PlannedStartDate,
                PlannedEndDate = request.PlannedEndDate,
                PlannedEffort = request.PlannedEffort,
                Tags = request.Tags,
                AssociatedAssets = request.AssociatedAssets,
                ProjectId = request.ProjectId,
                Attachments = request.Attachments,
                CreatedAt = DateTime.UtcNow
            };

            // Calculate SLA due dates if needed
            if (incident.Status == "Open" || incident.Status == "New")
            {
                incident.FirstResponseDue = DateTime.UtcNow.AddHours(4); // 4 hours for first response
                incident.ResolutionDue = DateTime.UtcNow.AddDays(2); // 2 days for resolution
            }

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync();

            // Fetch the complete incident with relationships
            var createdIncident = await _context.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .Include(i => i.Group)
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == incident.Id);

            // Send email notification to assignee if assigned
            if (createdIncident?.Assignee != null && !string.IsNullOrEmpty(createdIncident.Assignee.Email))
            {
                try
                {
                    var incidentLink = $"https://www.codingeverest.com/milo-incidents.html";
                    await _emailService.SendIncidentAssignmentEmailAsync(
                        createdIncident.Assignee.Email,
                        createdIncident.Assignee.Name,
                        createdIncident.IncidentNumber,
                        createdIncident.Subject,
                        createdIncident.Priority ?? "Low",
                        createdIncident.Status ?? "New",
                        incidentLink
                    );
                    _logger.LogInformation("Incident assignment email sent to {Email} for incident {IncidentNumber}", 
                        createdIncident.Assignee.Email, createdIncident.IncidentNumber);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send incident assignment email to {Email} for incident {IncidentNumber}", 
                        createdIncident.Assignee.Email, createdIncident.IncidentNumber);
                    // Don't fail the request if email fails - incident is still created
                }
            }

            return CreatedAtAction(nameof(GetIncident), new { id = incident.Id }, createdIncident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating incident");
            return StatusCode(500, new { message = "Error creating incident", error = ex.Message });
        }
    }

    // PUT: api/incidents/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateIncident(int id, [FromBody] UpdateIncidentRequest request)
    {
        try
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound(new { message = $"Incident with ID {id} not found" });
            }

            // Update fields if provided
            if (!string.IsNullOrEmpty(request.Subject))
                incident.Subject = request.Subject;
            
            if (request.Description != null)
                incident.Description = request.Description;
            
            if (request.AgentId.HasValue)
                incident.AgentId = request.AgentId;
            
            if (request.GroupId.HasValue)
                incident.GroupId = request.GroupId;
            
            if (!string.IsNullOrEmpty(request.Department))
                incident.Department = request.Department;
            
            if (!string.IsNullOrEmpty(request.Status))
            {
                incident.Status = request.Status;
                
                // Track status changes
                if (request.Status == "Resolved" && incident.ResolvedAt == null)
                    incident.ResolvedAt = DateTime.UtcNow;
                
                if (request.Status == "Closed" && incident.ClosedAt == null)
                    incident.ClosedAt = DateTime.UtcNow;
            }
            
            if (!string.IsNullOrEmpty(request.Priority))
                incident.Priority = request.Priority;
            
            if (!string.IsNullOrEmpty(request.Urgency))
                incident.Urgency = request.Urgency;
            
            if (!string.IsNullOrEmpty(request.Impact))
                incident.Impact = request.Impact;
            
            if (!string.IsNullOrEmpty(request.Category))
                incident.Category = request.Category;
            
            if (!string.IsNullOrEmpty(request.SubCategory))
                incident.SubCategory = request.SubCategory;
            
            if (request.PlannedStartDate.HasValue)
                incident.PlannedStartDate = request.PlannedStartDate;
            
            if (request.PlannedEndDate.HasValue)
                incident.PlannedEndDate = request.PlannedEndDate;
            
            if (!string.IsNullOrEmpty(request.PlannedEffort))
                incident.PlannedEffort = request.PlannedEffort;
            
            if (request.Tags != null)
                incident.Tags = request.Tags;
            
            if (request.Resolution != null)
                incident.Resolution = request.Resolution;

            incident.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating incident {IncidentId}", id);
            return StatusCode(500, new { message = "Error updating incident", error = ex.Message });
        }
    }

    // DELETE: api/incidents/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteIncident(int id)
    {
        try
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound(new { message = $"Incident with ID {id} not found" });
            }

            _context.Incidents.Remove(incident);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Incident deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting incident {IncidentId}", id);
            return StatusCode(500, new { message = "Error deleting incident", error = ex.Message });
        }
    }

    // POST: api/incidents/{id}/respond
    [HttpPost("{id}/respond")]
    public async Task<IActionResult> RecordFirstResponse(int id)
    {
        try
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
            {
                return NotFound(new { message = $"Incident with ID {id} not found" });
            }

            if (incident.FirstResponseAt == null)
            {
                incident.FirstResponseAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording first response for incident {IncidentId}", id);
            return StatusCode(500, new { message = "Error recording first response", error = ex.Message });
        }
    }
}

// Request DTOs
public class CreateIncidentRequest
{
    public required string Subject { get; set; }
    public string? Description { get; set; }
    public int RequesterId { get; set; }
    public int? AgentId { get; set; }
    public int? GroupId { get; set; }
    public string? Department { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Urgency { get; set; }
    public string? Impact { get; set; }
    public string? Source { get; set; }
    public string? Category { get; set; }
    public string? SubCategory { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public string? PlannedEffort { get; set; }
    public string? Tags { get; set; }
    public string? AssociatedAssets { get; set; }
    public int? ProjectId { get; set; }
    public string? Attachments { get; set; }
}

public class UpdateIncidentRequest
{
    public string? Subject { get; set; }
    public string? Description { get; set; }
    public int? AgentId { get; set; }
    public int? GroupId { get; set; }
    public string? Department { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Urgency { get; set; }
    public string? Impact { get; set; }
    public string? Category { get; set; }
    public string? SubCategory { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public string? PlannedEffort { get; set; }
    public string? Tags { get; set; }
    public string? Resolution { get; set; }
}
