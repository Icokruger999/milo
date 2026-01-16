using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;

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
                .AsNoTracking() // Performance: Read-only query
                .Where(f => !f.IsDeleted)
                .Include(f => f.Author) // Need Author for Name
                .AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(f => f.ProjectId == projectId);
            }

            // PERFORMANCE: Only select needed fields, don't include full Project entity
            var flakes = await query
                .OrderByDescending(f => f.UpdatedAt ?? f.CreatedAt)
                .Select(f => new
                {
                    f.Id,
                    f.Title,
                    f.Content,
                    f.ProjectId,
                    f.AuthorId,
                    AuthorName = f.Author != null ? f.Author.Name : "Unknown",
                    f.CreatedAt,
                    f.UpdatedAt
                })
                .ToListAsync();

            // Get project info in one query if needed
            var projectIds = flakes.Select(f => f.ProjectId).Distinct().Where(id => id.HasValue).Cast<int>().ToList();
            var projects = await _context.Projects
                .Where(p => projectIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToListAsync();
            
            var projectDict = projects.ToDictionary(p => p.Id, p => new { id = p.Id, name = p.Name });

            return Ok(flakes.Select(f => new
            {
                id = f.Id,
                title = f.Title,
                content = f.Content,
                projectId = f.ProjectId,
                project = f.ProjectId.HasValue && projectDict.TryGetValue(f.ProjectId.Value, out var proj) ? proj : null,
                authorId = f.AuthorId,
                authorName = f.AuthorName,
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

    [HttpPost("{id}/share/email")]
    public async Task<IActionResult> ShareFlakeByEmail(int id, [FromBody] ShareFlakeEmailRequest request)
    {
        try
        {
            var flake = await _context.Flakes
                .Include(f => f.Author)
                .Include(f => f.Project)
                .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

            if (flake == null)
            {
                return NotFound(new { message = "Flake not found" });
            }

            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.ToEmail))
            {
                return BadRequest(new { message = "Email addresses are required" });
            }

            // Use EmailService to send the flake
            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
            var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            
            var flakeUrl = $"{request.BaseUrl ?? "https://www.codingeverest.com"}/milo-flake-view.html?id={flake.Id}&readonly=true";
            var projectName = flake.Project?.Name ?? "Unknown Project";
            var authorName = flake.Author?.Name ?? "Unknown Author";
            var fromEmail = configuration["Email:FromEmail"] ?? "info@streamyo.net";
            var fromName = configuration["Email:FromName"] ?? "Milo";
            var dateNow = DateTime.UtcNow.ToLocalTime();
            var dateStr = dateNow.ToString("MMM dd, yyyy");
            var timeStr = dateNow.ToString("hh:mm tt");

            // Simple plain text email - no HTML to avoid rendering issues
            var subject = $"Shared Flake: {flake.Title}";
            
            var textBody = $@"Shared Flake: {flake.Title}

Hello,

{authorName} has shared a flake from {projectName} with you.

Project: {projectName}
Shared by: {authorName}
Date: {dateStr} at {timeStr}

Flake: {flake.Title}

=====================================
CLICK HERE TO VIEW THE FLAKE:
{flakeUrl}
=====================================

Or copy and paste the link above into your browser.

---
This flake was shared from Milo";

            // Use plain text only - no HTML body to avoid rendering issues
            // Don't block the operation if email fails - send in background
            _ = Task.Run(async () =>
            {
                try
                {
                    await emailService.SendEmailWithPlainTextAsync(request.ToEmail, subject, textBody, textBody);
                    _logger.LogInformation($"Flake share email sent to {request.ToEmail}");
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to send flake share email to {Email}", request.ToEmail);
                    // Email failure should not block the operation
                }
            });
            
            // Return success immediately - email is sent in background
            return Ok(new { message = "Flake shared successfully. Email sent in background." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sharing flake by email");
            return StatusCode(500, new { message = "Internal server error when sharing flake." });
        }
    }

    [HttpPost("{id}/share/board")]
    public async Task<IActionResult> ShareFlakeToBoard(int id, [FromBody] ShareFlakeToBoardRequest request)
    {
        try
        {
            var flake = await _context.Flakes
                .Include(f => f.Author)
                .Include(f => f.Project)
                .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

            if (flake == null)
            {
                return NotFound(new { message = "Flake not found" });
            }

            if (request.TaskId.HasValue)
            {
                // Link flake to existing task
                var task = await _context.Tasks
                    .Include(t => t.Assignee)
                    .Include(t => t.Project)
                    .FirstOrDefaultAsync(t => t.Id == request.TaskId.Value);
                    
                if (task == null)
                {
                    return NotFound(new { message = "Task not found" });
                }

                // Add flake link to task description or create a comment
                var baseUrl = request.BaseUrl ?? "https://www.codingeverest.com";
                var flakeLink = $"[Flake: {flake.Title}]({baseUrl}/milo-flake-view.html?id={flake.Id}&readonly=true)";
                
                var contentPreview = string.IsNullOrEmpty(flake.Content) 
                    ? "(No content yet - click the link above to view)" 
                    : (flake.Content.Length > 500 ? flake.Content.Substring(0, 500) + "..." : flake.Content);
                
                if (string.IsNullOrEmpty(task.Description))
                {
                    task.Description = $"**Shared Flake:**\n{flakeLink}\n\n{contentPreview}";
                }
                else
                {
                    task.Description += $"\n\n---\n**Shared Flake:**\n{flakeLink}\n\n{contentPreview}";
                }

                await _context.SaveChangesAsync();

                // Send email to assignee if task has an assignee
                if (task.Assignee != null && !string.IsNullOrEmpty(task.Assignee.Email))
                {
                    try
                    {
                        var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
                        var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
                        
                        var taskUrl = $"{baseUrl}/milo-board.html";
                        var projectName = task.Project?.Name ?? "Unknown Project";
                        var sharedByName = flake.Author?.Name ?? "Someone";
                        var fromEmail = configuration["Email:FromEmail"] ?? "info@streamyo.net";
                        var fromName = configuration["Email:FromName"] ?? "Milo";

                        // Simple plain text email - no HTML to avoid rendering issues
                        var subject = $"Flake linked to your task: {task.TaskId}";
                        var textBody = $"Flake Linked to Your Task\n\nHello {task.Assignee.Name},\n\n{sharedByName} linked a flake to your task in {projectName}.\n\nTask: {task.TaskId}: {task.Title}\nFlake: {flake.Title}\n\nView task: {taskUrl}\n\n---\nThis notification was sent from Milo";
                        
                        // Use plain text only - no HTML body to avoid rendering issues
                        await emailService.SendEmailWithPlainTextAsync(task.Assignee.Email, subject, textBody, textBody);
                        
                        _logger.LogInformation($"Sent flake link notification to {task.Assignee.Email}");
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogWarning(emailEx, "Failed to send flake link notification email");
                        // Continue even if email fails
                    }
                }

                return Ok(new 
                { 
                    message = "Flake linked to task successfully",
                    taskId = task.Id,
                    flakeId = flake.Id
                });
            }
            else
            {
                // Create a new task with flake content
                var baseUrl = request.BaseUrl ?? "https://www.codingeverest.com";
                var flakeLink = $"{baseUrl}/milo-flake-view.html?id={flake.Id}";
                var flakeContentForTask = flake.Content ?? "";
                var task = new Milo.API.Models.Task
                {
                    Title = $"Review: {flake.Title}",
                    Description = $"**Flake Shared from Documentation:**\n\n{flakeLink}\n\n{flakeContentForTask}",
                    ProjectId = flake.ProjectId,
                    CreatorId = flake.AuthorId,
                    Status = "todo",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();

                // Generate task ID
                task.TaskId = $"TASK-{task.Id}";
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Task created from flake successfully",
                    taskId = task.Id,
                    task = new
                    {
                        id = task.Id,
                        taskId = task.TaskId,
                        title = task.Title,
                        description = task.Description
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sharing flake to board");
            return StatusCode(500, new { message = "Internal server error when sharing flake to board." });
        }
    }
}

public class ShareFlakeEmailRequest
{
    public string ToEmail { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? BaseUrl { get; set; }
}

public class ShareFlakeToBoardRequest
{
    public int? TaskId { get; set; }
    public string? BaseUrl { get; set; }
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

