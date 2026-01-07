using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LabelsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<LabelsController> _logger;

    public LabelsController(MiloDbContext context, ILogger<LabelsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetLabels([FromQuery] int? projectId)
    {
        var query = _context.Labels
            .Where(l => !l.IsDeleted)
            .AsQueryable();

        // If projectId provided, filter to project labels or global labels (projectId = null)
        if (projectId.HasValue)
        {
            query = query.Where(l => l.ProjectId == null || l.ProjectId == projectId.Value);
        }
        else
        {
            // If no projectId, return only global labels
            query = query.Where(l => l.ProjectId == null);
        }

        var labels = await query.OrderBy(l => l.Name).ToListAsync();

        return Ok(labels.Select(l => new
        {
            id = l.Id,
            name = l.Name,
            color = l.Color ?? "#6B778C",
            description = l.Description,
            projectId = l.ProjectId
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetLabel(int id)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null || label.IsDeleted)
        {
            return NotFound(new { message = "Label not found" });
        }

        return Ok(new
        {
            id = label.Id,
            name = label.Name,
            color = label.Color ?? "#6B778C",
            description = label.Description,
            projectId = label.ProjectId
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateLabel([FromBody] CreateLabelRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Name))
        {
            return BadRequest(new { message = "Name is required" });
        }

        // Check if label with same name already exists in project
        var existingLabel = await _context.Labels
            .FirstOrDefaultAsync(l => l.Name.ToLower() == request.Name.ToLower() && 
                                     l.ProjectId == request.ProjectId && 
                                     !l.IsDeleted);
        
        if (existingLabel != null)
        {
            return Conflict(new { message = "Label with this name already exists" });
        }

        var label = new Label
        {
            Name = request.Name,
            Color = request.Color ?? "#6B778C",
            Description = request.Description,
            ProjectId = request.ProjectId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Labels.Add(label);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLabel), new { id = label.Id }, new
        {
            id = label.Id,
            name = label.Name,
            color = label.Color,
            description = label.Description,
            projectId = label.ProjectId
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLabel(int id, [FromBody] UpdateLabelRequest request)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null || label.IsDeleted)
        {
            return NotFound(new { message = "Label not found" });
        }

        if (!string.IsNullOrEmpty(request.Name))
        {
            // Check if another label with same name exists
            var existingLabel = await _context.Labels
                .FirstOrDefaultAsync(l => l.Name.ToLower() == request.Name.ToLower() && 
                                         l.ProjectId == label.ProjectId && 
                                         l.Id != id && 
                                         !l.IsDeleted);
            
            if (existingLabel != null)
            {
                return Conflict(new { message = "Label with this name already exists" });
            }
            
            label.Name = request.Name;
        }

        if (request.Color != null)
        {
            label.Color = request.Color;
        }

        if (request.Description != null)
        {
            label.Description = request.Description;
        }

        label.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = label.Id,
            name = label.Name,
            color = label.Color,
            description = label.Description,
            projectId = label.ProjectId
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLabel(int id)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null || label.IsDeleted)
        {
            return NotFound(new { message = "Label not found" });
        }

        // Soft delete
        label.IsDeleted = true;
        label.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Label deleted successfully" });
    }
}

public class CreateLabelRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
}

public class UpdateLabelRequest
{
    public string? Name { get; set; }
    public string? Color { get; set; }
    public string? Description { get; set; }
}

