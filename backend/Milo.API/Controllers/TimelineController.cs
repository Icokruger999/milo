using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TimelineController : ControllerBase
{
    private readonly MiloDbContext _context;

    public TimelineController(MiloDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTimelineEvents([FromQuery] int? productId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _context.TimelineEvents
            .Include(t => t.Product)
            .AsQueryable();

        if (productId.HasValue)
        {
            query = query.Where(t => t.ProductId == productId);
        }

        if (startDate.HasValue)
        {
            query = query.Where(t => t.EventDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(t => t.EventDate <= endDate.Value);
        }

        var events = await query.OrderBy(t => t.EventDate).ToListAsync();

        return Ok(events.Select(e => new
        {
            id = e.Id,
            title = e.Title,
            description = e.Description,
            productId = e.ProductId,
            product = e.Product != null ? new { id = e.Product.Id, name = e.Product.Name } : null,
            eventDate = e.EventDate,
            eventType = e.EventType,
            status = e.Status,
            createdAt = e.CreatedAt
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTimelineEvent([FromBody] CreateTimelineEventRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Title) || !request.ProductId.HasValue)
        {
            return BadRequest(new { message = "Title, ProductId, and EventDate are required" });
        }

        var evt = new TimelineEvent
        {
            Title = request.Title,
            Description = request.Description,
            ProductId = request.ProductId.Value,
            EventDate = request.EventDate,
            EventType = request.EventType ?? "milestone",
            Status = request.Status ?? "upcoming",
            CreatedAt = DateTime.UtcNow
        };

        _context.TimelineEvents.Add(evt);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTimelineEvents), new { id = evt.Id }, new
        {
            id = evt.Id,
            title = evt.Title,
            productId = evt.ProductId,
            eventDate = evt.EventDate,
            createdAt = evt.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTimelineEvent(int id, [FromBody] UpdateTimelineEventRequest request)
    {
        var evt = await _context.TimelineEvents.FindAsync(id);
        if (evt == null)
        {
            return NotFound(new { message = "Timeline event not found" });
        }

        if (!string.IsNullOrEmpty(request.Title))
        {
            evt.Title = request.Title;
        }
        if (request.Description != null)
        {
            evt.Description = request.Description;
        }
        if (request.EventDate.HasValue)
        {
            evt.EventDate = request.EventDate.Value;
        }
        if (!string.IsNullOrEmpty(request.EventType))
        {
            evt.EventType = request.EventType;
        }
        if (!string.IsNullOrEmpty(request.Status))
        {
            evt.Status = request.Status;
        }

        evt.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = evt.Id,
            title = evt.Title,
            message = "Timeline event updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimelineEvent(int id)
    {
        var evt = await _context.TimelineEvents.FindAsync(id);
        if (evt == null)
        {
            return NotFound(new { message = "Timeline event not found" });
        }

        _context.TimelineEvents.Remove(evt);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Timeline event deleted successfully" });
    }
}

public class CreateTimelineEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ProductId { get; set; }
    public DateTime EventDate { get; set; }
    public string? EventType { get; set; }
    public string? Status { get; set; }
}

public class UpdateTimelineEventRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? EventDate { get; set; }
    public string? EventType { get; set; }
    public string? Status { get; set; }
}

