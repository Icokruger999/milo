using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/incidents")]
public class IncidentEntitiesController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<IncidentEntitiesController> _logger;

    public IncidentEntitiesController(MiloDbContext context, ILogger<IncidentEntitiesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== ASSIGNEES ====================
    
    [HttpGet("assignees")]
    public async Task<IActionResult> GetAssignees()
    {
        try
        {
            var assignees = await _context.IncidentAssignees
                .Where(a => a.IsActive)
                .OrderBy(a => a.Name)
                .ToListAsync();
            
            return Ok(assignees);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting assignees");
            return StatusCode(500, new { message = "Error getting assignees", error = ex.Message });
        }
    }

    [HttpPost("assignees")]
    public async Task<IActionResult> CreateAssignee([FromBody] CreateAssigneeRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Name and email are required" });
            }

            var assignee = new IncidentAssignee
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim().ToLower(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.IncidentAssignees.Add(assignee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAssignees), new { id = assignee.Id }, assignee);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating assignee");
            return StatusCode(500, new { message = "Error creating assignee", error = ex.Message });
        }
    }

    [HttpDelete("assignees/{id}")]
    public async Task<IActionResult> DeleteAssignee(int id)
    {
        try
        {
            var assignee = await _context.IncidentAssignees.FindAsync(id);
            if (assignee == null)
            {
                return NotFound(new { message = $"Assignee with ID {id} not found" });
            }

            // Soft delete
            assignee.IsActive = false;
            assignee.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting assignee");
            return StatusCode(500, new { message = "Error deleting assignee", error = ex.Message });
        }
    }

    // ==================== REQUESTERS ====================
    
    [HttpGet("requesters")]
    public async Task<IActionResult> GetRequesters()
    {
        try
        {
            var requesters = await _context.IncidentRequesters
                .Where(r => r.IsActive)
                .OrderBy(r => r.Name)
                .ToListAsync();
            
            return Ok(requesters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting requesters");
            return StatusCode(500, new { message = "Error getting requesters", error = ex.Message });
        }
    }

    [HttpPost("requesters")]
    public async Task<IActionResult> CreateRequester([FromBody] CreateRequesterRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Name and email are required" });
            }

            var requester = new IncidentRequester
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim().ToLower(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.IncidentRequesters.Add(requester);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRequesters), new { id = requester.Id }, requester);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating requester");
            return StatusCode(500, new { message = "Error creating requester", error = ex.Message });
        }
    }

    [HttpDelete("requesters/{id}")]
    public async Task<IActionResult> DeleteRequester(int id)
    {
        try
        {
            var requester = await _context.IncidentRequesters.FindAsync(id);
            if (requester == null)
            {
                return NotFound(new { message = $"Requester with ID {id} not found" });
            }

            // Soft delete
            requester.IsActive = false;
            requester.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting requester");
            return StatusCode(500, new { message = "Error deleting requester", error = ex.Message });
        }
    }

    // ==================== GROUPS ====================
    
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        try
        {
            var groups = await _context.IncidentGroups
                .Where(g => g.IsActive)
                .OrderBy(g => g.Name)
                .ToListAsync();
            
            return Ok(groups);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting groups");
            return StatusCode(500, new { message = "Error getting groups", error = ex.Message });
        }
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Name is required" });
            }

            var group = new IncidentGroup
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.IncidentGroups.Add(group);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGroups), new { id = group.Id }, group);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating group");
            return StatusCode(500, new { message = "Error creating group", error = ex.Message });
        }
    }

    [HttpDelete("groups/{id}")]
    public async Task<IActionResult> DeleteGroup(int id)
    {
        try
        {
            var group = await _context.IncidentGroups.FindAsync(id);
            if (group == null)
            {
                return NotFound(new { message = $"Group with ID {id} not found" });
            }

            // Soft delete
            group.IsActive = false;
            group.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting group");
            return StatusCode(500, new { message = "Error deleting group", error = ex.Message });
        }
    }
}

// Request DTOs
public class CreateAssigneeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class CreateRequesterRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class CreateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
