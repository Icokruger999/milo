using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly MiloDbContext _context;

    public DepartmentsController(MiloDbContext context)
    {
        _context = context;
    }

    // GET: api/departments?projectId=1
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Department>>> GetDepartments([FromQuery] int projectId)
    {
        var departments = await _context.Departments
            .Where(d => d.ProjectId == projectId)
            .Include(d => d.SubProjects)
            .OrderBy(d => d.Name)
            .ToListAsync();

        return Ok(departments);
    }

    // GET: api/departments/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Department>> GetDepartment(int id)
    {
        var department = await _context.Departments
            .Include(d => d.SubProjects)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            return NotFound();
        }

        return Ok(department);
    }

    // POST: api/departments
    [HttpPost]
    public async Task<ActionResult<Department>> CreateDepartment([FromBody] CreateDepartmentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Department name is required");
        }

        var department = new Department
        {
            Name = request.Name,
            Description = request.Description,
            ProjectId = request.ProjectId,
            Color = request.Color ?? "#6554C0",
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDepartment), new { id = department.Id }, department);
    }

    // PUT: api/departments/1
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDepartment(int id, [FromBody] UpdateDepartmentRequest request)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            department.Name = request.Name;
        }

        if (request.Description != null)
        {
            department.Description = request.Description;
        }

        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            department.Color = request.Color;
        }

        department.UpdatedAt = DateTime.UtcNow;

        _context.Departments.Update(department);
        await _context.SaveChangesAsync();

        return Ok(department);
    }

    // DELETE: api/departments/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
        {
            return NotFound();
        }

        // Move sub-projects to null department before deleting
        var subProjects = await _context.SubProjects
            .Where(sp => sp.DepartmentId == id)
            .ToListAsync();

        foreach (var subProject in subProjects)
        {
            subProject.DepartmentId = null;
        }

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateDepartmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public string? Color { get; set; }
}

public class UpdateDepartmentRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
}
