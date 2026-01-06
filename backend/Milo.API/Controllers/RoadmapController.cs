using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadmapController : ControllerBase
{
    private readonly MiloDbContext _context;

    public RoadmapController(MiloDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoadmapItems([FromQuery] int? productId, [FromQuery] string? status)
    {
        var query = _context.RoadmapItems
            .Include(r => r.Product)
            .AsQueryable();

        if (productId.HasValue)
        {
            query = query.Where(r => r.ProductId == productId);
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(r => r.Status == status);
        }

        var items = await query.OrderBy(r => r.TargetDate ?? r.StartDate ?? DateTime.MaxValue).ToListAsync();

        return Ok(items.Select(r => new
        {
            id = r.Id,
            title = r.Title,
            description = r.Description,
            productId = r.ProductId,
            product = r.Product != null ? new { id = r.Product.Id, name = r.Product.Name } : null,
            status = r.Status,
            category = r.Category,
            startDate = r.StartDate,
            targetDate = r.TargetDate,
            priority = r.Priority,
            createdAt = r.CreatedAt
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoadmapItem([FromBody] CreateRoadmapItemRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Title) || !request.ProductId.HasValue)
        {
            return BadRequest(new { message = "Title and ProductId are required" });
        }

        var item = new RoadmapItem
        {
            Title = request.Title,
            Description = request.Description,
            ProductId = request.ProductId.Value,
            Status = request.Status ?? "planned",
            Category = request.Category,
            StartDate = request.StartDate,
            TargetDate = request.TargetDate,
            Priority = request.Priority ?? 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.RoadmapItems.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRoadmapItems), new { id = item.Id }, new
        {
            id = item.Id,
            title = item.Title,
            productId = item.ProductId,
            status = item.Status,
            createdAt = item.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRoadmapItem(int id, [FromBody] UpdateRoadmapItemRequest request)
    {
        var item = await _context.RoadmapItems.FindAsync(id);
        if (item == null)
        {
            return NotFound(new { message = "Roadmap item not found" });
        }

        if (!string.IsNullOrEmpty(request.Title))
        {
            item.Title = request.Title;
        }
        if (request.Description != null)
        {
            item.Description = request.Description;
        }
        if (!string.IsNullOrEmpty(request.Status))
        {
            item.Status = request.Status;
        }
        if (request.Category != null)
        {
            item.Category = request.Category;
        }
        if (request.StartDate.HasValue)
        {
            item.StartDate = request.StartDate;
        }
        if (request.TargetDate.HasValue)
        {
            item.TargetDate = request.TargetDate;
        }
        if (request.Priority.HasValue)
        {
            item.Priority = request.Priority.Value;
        }

        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = item.Id,
            title = item.Title,
            message = "Roadmap item updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRoadmapItem(int id)
    {
        var item = await _context.RoadmapItems.FindAsync(id);
        if (item == null)
        {
            return NotFound(new { message = "Roadmap item not found" });
        }

        _context.RoadmapItems.Remove(item);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Roadmap item deleted successfully" });
    }
}

public class CreateRoadmapItemRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ProductId { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? TargetDate { get; set; }
    public int? Priority { get; set; }
}

public class UpdateRoadmapItemRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? TargetDate { get; set; }
    public int? Priority { get; set; }
}

