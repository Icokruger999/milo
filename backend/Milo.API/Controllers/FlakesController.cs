using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FlakesController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<FlakesController> _logger;

    public FlakesController(MiloDbContext context, ILogger<FlakesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetFlakes([FromQuery] int? projectId)
    {
        try
        {
            var query = _context.Flakes
                .Where(f => !f.IsDeleted)
                .Include(f => f.Author)
                .Include(f => f.Project)
                .AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(f => f.ProjectId == projectId);
            }

            var flakes = await query.OrderByDescending(f => f.UpdatedAt ?? f.CreatedAt).ToListAsync();

            return Ok(flakes.Select(f => new
            {
                id = f.Id,
                title = f.Title,
                content = f.Content,
                projectId = f.ProjectId,
                project = f.Project != null ? new { id = f.Project.Id, name = f.Project.Name } : null,
                authorId = f.AuthorId,
                authorName = f.Author != null ? f.Author.Name : "Unknown",
                createdAt = f.CreatedAt,
                updatedAt = f.UpdatedAt
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting flakes");
            return StatusCode(500, new { message = "Internal server error when retrieving flakes." });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetFlake(int id)
    {
        var flake = await _context.Flakes
            .Include(f => f.Author)
            .Include(f => f.Project)
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

        if (flake == null)
        {
            return NotFound(new { message = "Flake not found" });
        }

        return Ok(new
        {
            id = flake.Id,
            title = flake.Title,
            content = flake.Content,
            projectId = flake.ProjectId,
            project = flake.Project != null ? new { id = flake.Project.Id, name = flake.Project.Name } : null,
            authorId = flake.AuthorId,
            authorName = flake.Author != null ? flake.Author.Name : "Unknown",
            createdAt = flake.CreatedAt,
            updatedAt = flake.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateFlake([FromBody] CreateFlakeRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Title))
            {
                return BadRequest(new { message = "Title is required" });
            }

            var flake = new Flake
            {
                Title = request.Title,
                Content = request.Content,
                ProjectId = request.ProjectId,
                AuthorId = request.AuthorId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Flakes.Add(flake);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFlake), new { id = flake.Id }, new
            {
                id = flake.Id,
                title = flake.Title,
                createdAt = flake.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating flake");
            return StatusCode(500, new { message = "Internal server error when creating flake." });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFlake(int id, [FromBody] UpdateFlakeRequest request)
    {
        try
        {
            var flake = await _context.Flakes.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
            if (flake == null)
            {
                return NotFound(new { message = "Flake not found" });
            }

            if (!string.IsNullOrEmpty(request.Title))
            {
                flake.Title = request.Title;
            }
            if (request.Content != null)
            {
                flake.Content = request.Content;
            }

            flake.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = flake.Id,
                title = flake.Title,
                message = "Flake updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating flake");
            return StatusCode(500, new { message = "Internal server error when updating flake." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFlake(int id)
    {
        try
        {
            var flake = await _context.Flakes.FindAsync(id);
            if (flake == null)
            {
                return NotFound(new { message = "Flake not found" });
            }

            flake.IsDeleted = true;
            flake.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Flake deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting flake");
            return StatusCode(500, new { message = "Internal server error when deleting flake." });
        }
    }
}

public class CreateFlakeRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public int? ProjectId { get; set; }
    public int? AuthorId { get; set; }
}

public class UpdateFlakeRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
}

