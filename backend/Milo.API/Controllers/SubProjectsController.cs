using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubProjectsController : ControllerBase
{
    private readonly MiloDbContext _context;

    public SubProjectsController(MiloDbContext context)
    {
        _context = context;
    }

    // GET: api/subprojects?projectId=1
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SubProject>>> GetSubProjects([FromQuery] int projectId)
    {
        var subProjects = await _context.SubProjects
            .Where(sp => sp.ProjectId == projectId)
            .Include(sp => sp.Department)
            .OrderBy(sp => sp.Department != null ? sp.Department.Name : "")
            .ThenBy(sp => sp.Name)
            .ToListAsync();

        return Ok(subProjects);
    }

    // GET: api/subprojects/1
    [HttpGet("{id}")]
    public async Task<ActionResult<SubProject>> GetSubProject(int id)
    {
        var subProject = await _context.SubProjects
            .Include(sp => sp.Department)
            .Include(sp => sp.Tasks)
            .FirstOrDefaultAsync(sp => sp.Id == id);

        if (subProject == null)
        {
            return NotFound();
        }

        return Ok(subProject);
    }

    // POST: api/subprojects
    [HttpPost]
    public async Task<ActionResult<SubProject>> CreateSubProject([FromBody] CreateSubProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Sub-project name is required");
        }

        var subProject = new SubProject
        {
            Name = request.Name,
            Description = request.Description,
            ProjectId = request.ProjectId,
            DepartmentId = request.DepartmentId,
            Color = request.Color ?? "#0052CC",
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedAt = DateTime.UtcNow
        };

        _context.SubProjects.Add(subProject);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSubProject), new { id = subProject.Id }, subProject);
    }

    // PUT: api/subprojects/1
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSubProject(int id, [FromBody] UpdateSubProjectRequest request)
    {
        var subProject = await _context.SubProjects.FindAsync(id);

        if (subProject == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            subProject.Name = request.Name;
        }

        if (request.Description != null)
        {
            subProject.Description = request.Description;
        }

        if (request.DepartmentId.HasValue)
        {
            subProject.DepartmentId = request.DepartmentId;
        }

        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            subProject.Color = request.Color;
        }

        if (request.StartDate.HasValue)
        {
            subProject.StartDate = request.StartDate;
        }

        if (request.EndDate.HasValue)
        {
            subProject.EndDate = request.EndDate;
        }

        // Timeline positioning
        if (request.TimelineStartDate.HasValue)
        {
            subProject.TimelineStartDate = request.TimelineStartDate;
        }

        if (request.TimelineEndDate.HasValue)
        {
            subProject.TimelineEndDate = request.TimelineEndDate;
        }

        if (request.TimelineX.HasValue)
        {
            subProject.TimelineX = request.TimelineX;
        }

        if (request.TimelineY.HasValue)
        {
            subProject.TimelineY = request.TimelineY;
        }

        if (request.TimelineWidth.HasValue)
        {
            subProject.TimelineWidth = request.TimelineWidth;
        }

        if (request.TimelineHeight.HasValue)
        {
            subProject.TimelineHeight = request.TimelineHeight;
        }

        if (request.OnTimeline.HasValue)
        {
            subProject.OnTimeline = request.OnTimeline.Value;
        }

        if (request.Duration.HasValue)
        {
            subProject.Duration = request.Duration;
        }

        if (request.CustomText != null)
        {
            subProject.CustomText = request.CustomText;
        }

        subProject.UpdatedAt = DateTime.UtcNow;

        _context.SubProjects.Update(subProject);
        await _context.SaveChangesAsync();

        return Ok(subProject);
    }

    // DELETE: api/subprojects/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSubProject(int id)
    {
        var subProject = await _context.SubProjects.FindAsync(id);

        if (subProject == null)
        {
            return NotFound();
        }

        _context.SubProjects.Remove(subProject);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/subprojects/by-department?projectId=1&departmentId=1
    [HttpGet("by-department")]
    public async Task<ActionResult<IEnumerable<SubProject>>> GetSubProjectsByDepartment(
        [FromQuery] int projectId,
        [FromQuery] int? departmentId)
    {
        var query = _context.SubProjects
            .Where(sp => sp.ProjectId == projectId);

        if (departmentId.HasValue)
        {
            query = query.Where(sp => sp.DepartmentId == departmentId);
        }

        var subProjects = await query
            .Include(sp => sp.Department)
            .OrderBy(sp => sp.Name)
            .ToListAsync();

        return Ok(subProjects);
    }
}

public class CreateSubProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public int? DepartmentId { get; set; }
    public string? Color { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateSubProjectRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? DepartmentId { get; set; }
    public string? Color { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? TimelineStartDate { get; set; }
    public DateTime? TimelineEndDate { get; set; }
    public int? TimelineX { get; set; }
    public int? TimelineY { get; set; }
    public int? TimelineWidth { get; set; }
    public int? TimelineHeight { get; set; }
    public bool? OnTimeline { get; set; }
    public int? Duration { get; set; }
    public string? CustomText { get; set; }
}
