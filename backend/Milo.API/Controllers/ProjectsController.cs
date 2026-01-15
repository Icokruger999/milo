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
            .Include(p => p.Owner) // Need Owner for response
            .Where(p => p.Status != "archived")
            .AsQueryable();

        // If userId provided, filter to projects user is member of, owns, or has access through team
        if (userId.HasValue)
        {
            // Get project IDs where user is a member
            var memberProjectIds = await _context.ProjectMembers
                .Where(pm => pm.UserId == userId.Value)
                .Select(pm => pm.ProjectId)
                .ToListAsync();
            
            // Filter to projects user owns OR is a member of
            query = query.Where(p => p.OwnerId == userId.Value || memberProjectIds.Contains(p.Id));
            
            _logger.LogInformation($"GetProjects: User {userId} has {memberProjectIds.Count} project memberships");
        }

        var projects = await query.OrderBy(p => p.Name).ToListAsync();

        // PERFORMANCE: Batch load all member data in one query instead of N+1 queries
        Dictionary<int, string?> userRoles = new();
        Dictionary<int, int> memberCounts = new();
        
        if (userId.HasValue)
        {
            // Batch load all project memberships for this user
            var projectIds = projects.Select(p => p.Id).ToList();
            var memberships = await _context.ProjectMembers
                .Where(pm => pm.UserId == userId.Value && projectIds.Contains(pm.ProjectId))
                .Select(pm => new { pm.ProjectId, pm.Role })
                .ToListAsync();
            
            // Build role dictionary
            foreach (var membership in memberships)
            {
                userRoles[membership.ProjectId] = membership.Role;
            }
            
            // Batch load member counts for all projects
            var counts = await _context.ProjectMembers
                .Where(pm => projectIds.Contains(pm.ProjectId))
                .GroupBy(pm => pm.ProjectId)
                .Select(g => new { ProjectId = g.Key, Count = g.Count() })
                .ToListAsync();
            
            foreach (var count in counts)
            {
                memberCounts[count.ProjectId] = count.Count + 1; // +1 for owner
            }
        }
        else
        {
            // Batch load member counts for all projects (even without userId filter)
            var projectIds = projects.Select(p => p.Id).ToList();
            var counts = await _context.ProjectMembers
                .Where(pm => projectIds.Contains(pm.ProjectId))
                .GroupBy(pm => pm.ProjectId)
                .Select(g => new { ProjectId = g.Key, Count = g.Count() })
                .ToListAsync();
            
            foreach (var count in counts)
            {
                memberCounts[count.ProjectId] = count.Count + 1; // +1 for owner
            }
        }

        return Ok(projects.Select(p =>
        {
            // Determine user's role in the project (from pre-loaded dictionary)
            string? userRole = null;
            if (userId.HasValue)
            {
                if (p.OwnerId == userId.Value)
                {
                    userRole = "owner";
                }
                else if (userRoles.TryGetValue(p.Id, out var role))
                {
                    userRole = role;
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
                memberCount = memberCounts.TryGetValue(p.Id, out var count) ? count : 1, // Default to 1 (owner only)
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

