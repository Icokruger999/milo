using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(MiloDbContext context, ILogger<ProjectsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects([FromQuery] int? userId)
    {
        var query = _context.Projects
            .AsNoTracking() // Performance: Read-only query
            .Where(p => p.Status != "archived")
            .AsQueryable();

        // If userId provided, filter to projects user is member of, owns, or has access through team
        if (userId.HasValue)
        {
            query = query.Where(p => p.OwnerId == userId.Value || 
                                     p.Members.Any(m => m.UserId == userId.Value) ||
                                     _context.Teams.Any(t => 
                                         t.ProjectId == p.Id && 
                                         !t.IsDeleted &&
                                         t.Members.Any(tm => tm.UserId == userId.Value && tm.IsActive)
                                     ));
        }

        var projects = await query.OrderBy(p => p.Name).ToListAsync();

        return Ok(projects.Select(p =>
        {
            // Determine user's role in the project
            string? userRole = null;
            if (userId.HasValue)
            {
                if (p.OwnerId == userId.Value)
                {
                    userRole = "owner";
                }
                else
                {
                    var member = p.Members.FirstOrDefault(m => m.UserId == userId.Value);
                    if (member != null)
                    {
                        userRole = member.Role;
                    }
                    else
                    {
                        // Check if user has access through a team
                        var hasTeamAccess = _context.Teams
                            .Any(t => t.ProjectId == p.Id && 
                                     !t.IsDeleted &&
                                     t.Members.Any(tm => tm.UserId == userId.Value && tm.IsActive));
                        
                        if (hasTeamAccess)
                        {
                            userRole = "team member";
                        }
                    }
                }
            }

            return new
            {
                id = p.Id,
                name = p.Name,
                description = p.Description,
                key = p.Key,
                status = p.Status,
                owner = new { id = p.Owner.Id, name = p.Owner.Name, email = p.Owner.Email },
                ownerId = p.OwnerId,
                role = userRole,
                memberCount = p.Members.Count + 1, // +1 for owner
                createdAt = p.CreatedAt
            };
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProject(int id)
    {
        var project = await _context.Projects
            .Include(p => p.Owner)
            .Include(p => p.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
        {
            return NotFound(new { message = "Project not found" });
        }

        return Ok(new
        {
            id = project.Id,
            name = project.Name,
            description = project.Description,
            key = project.Key,
            status = project.Status,
            owner = new { id = project.Owner.Id, name = project.Owner.Name, email = project.Owner.Email },
            ownerId = project.OwnerId,
            members = project.Members.Select(m => new
            {
                id = m.User.Id,
                name = m.User.Name,
                email = m.User.Email,
                role = m.Role
            }).ToList(),
            createdAt = project.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Name) || !request.OwnerId.HasValue)
        {
            return BadRequest(new { message = "Name and OwnerId are required" });
        }

        // Check if owner exists
        var owner = await _context.Users.FindAsync(request.OwnerId.Value);
        if (owner == null)
        {
            return BadRequest(new { message = "Owner not found" });
        }

        // Generate project key if not provided
        var projectKey = request.Key;
        if (string.IsNullOrEmpty(projectKey))
        {
            var words = request.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            projectKey = string.Join("", words.Select(w => w.Length > 0 ? w[0].ToString().ToUpper() : "")).Substring(0, Math.Min(5, words.Length));
            if (projectKey.Length < 2) projectKey = request.Name.Substring(0, Math.Min(5, request.Name.Length)).ToUpper();
        }

        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            Key = projectKey,
            Status = request.Status ?? "active",
            OwnerId = request.OwnerId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        // Add owner as project member
        var ownerMember = new ProjectMember
        {
            ProjectId = project.Id,
            UserId = owner.Id,
            Role = "owner",
            JoinedAt = DateTime.UtcNow
        };
        _context.ProjectMembers.Add(ownerMember);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, new
        {
            id = project.Id,
            name = project.Name,
            description = project.Description,
            key = project.Key,
            status = project.Status,
            createdAt = project.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound(new { message = "Project not found" });
        }

        if (!string.IsNullOrEmpty(request.Name))
        {
            project.Name = request.Name;
        }
        if (request.Description != null)
        {
            project.Description = request.Description;
        }
        if (!string.IsNullOrEmpty(request.Key))
        {
            project.Key = request.Key;
        }
        if (!string.IsNullOrEmpty(request.Status))
        {
            project.Status = request.Status;
        }

        project.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = project.Id,
            name = project.Name,
            message = "Project updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound(new { message = "Project not found" });
        }

        // Soft delete - archive instead
        project.Status = "archived";
        project.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Project archived successfully" });
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetProjectMembers(int id)
    {
        var members = await _context.ProjectMembers
            .Include(m => m.User)
            .Where(m => m.ProjectId == id)
            .Select(m => new
            {
                id = m.User.Id,
                name = m.User.Name,
                email = m.User.Email,
                role = m.Role,
                joinedAt = m.JoinedAt
            })
            .ToListAsync();

        return Ok(members);
    }
}

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Key { get; set; }
    public string? Status { get; set; }
    public int? OwnerId { get; set; }
}

public class UpdateProjectRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Key { get; set; }
    public string? Status { get; set; }
}

