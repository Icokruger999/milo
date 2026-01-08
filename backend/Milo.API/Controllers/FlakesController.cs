using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using MimeKit;

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
            var emailService = HttpContext.RequestServices.GetRequiredService<Milo.API.Services.EmailService>();
            var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            
            var flakeUrl = $"{request.BaseUrl ?? "https://www.codingeverest.com"}/milo-flake-view.html?id={flake.Id}";
            var projectName = flake.Project?.Name ?? "Unknown Project";
            var authorName = flake.Author?.Name ?? "Unknown Author";
            var fromEmail = configuration["Email:FromEmail"] ?? "info@streamyo.net";
            var fromName = configuration["Email:FromName"] ?? "Milo - Coding Everest";
            var dateNow = DateTime.UtcNow.ToLocalTime();
            var dateStr = dateNow.ToString("MMM dd, yyyy");
            var timeStr = dateNow.ToString("hh:mm tt");
            var flakeContent = flake.Content ?? "(No content)";

            var emailBody = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #172B4D; }" +
                ".email-container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }" +
                ".email-header { background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #FFFFFF; padding: 30px; text-align: center; }" +
                ".email-body { padding: 30px; }" +
                ".flake-title { font-size: 24px; font-weight: 600; color: #172B4D; margin-bottom: 16px; }" +
                ".flake-content { font-size: 15px; color: #42526E; line-height: 1.7; margin-bottom: 24px; white-space: pre-wrap; }" +
                ".flake-meta { font-size: 13px; color: #6B778C; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #DFE1E6; }" +
                ".cta-button { display: inline-block; background: #0052CC; color: #FFFFFF !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 16px; }" +
                ".email-footer { padding: 20px; background: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center; font-size: 12px; color: #6B778C; }" +
                "</style></head><body><div class=\"email-container\"><div class=\"email-header\"><h1>Shared Flake: " + flake.Title + "</h1></div>" +
                "<div class=\"email-body\"><p>Hello,</p><p><strong>" + authorName + "</strong> has shared a flake from <strong>" + projectName + "</strong> with you.</p>" +
                "<div class=\"flake-meta\"><strong>Project:</strong> " + projectName + "<br><strong>Shared by:</strong> " + authorName + "<br><strong>Date:</strong> " + dateStr + " at " + timeStr + "</div>" +
                "<div class=\"flake-title\">" + flake.Title + "</div><div class=\"flake-content\">" + flakeContent + "</div>" +
                "<div style=\"text-align: center; margin-top: 24px;\"><a href=\"" + flakeUrl + "\" class=\"cta-button\">View Full Flake</a></div></div>" +
                "<div class=\"email-footer\"><p>This flake was shared from Milo - Coding Everest</p><p><a href=\"" + flakeUrl + "\" style=\"color: #0052CC;\">" + flakeUrl + "</a></p></div>" +
                "</div></body></html>";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress("", request.ToEmail));
            message.Subject = $"Shared Flake: {flake.Title}";

            var textBody = "Shared Flake: " + flake.Title + "\n\n" +
                "Hello,\n\n" +
                authorName + " has shared a flake from " + projectName + " with you.\n\n" +
                "Project: " + projectName + "\n" +
                "Shared by: " + authorName + "\n" +
                "Date: " + dateStr + " at " + timeStr + "\n\n" +
                flake.Title + "\n\n" +
                flakeContent + "\n\n" +
                "View full flake: " + flakeUrl + "\n\n" +
                "---\n" +
                "This flake was shared from Milo - Coding Everest";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = emailBody,
                TextBody = textBody
            };

            message.Body = bodyBuilder.ToMessageBody();

            var sent = await emailService.SendCustomEmailAsync(message, request.ToEmail);
            
            if (sent)
            {
                return Ok(new { message = "Flake shared via email successfully" });
            }
            else
            {
                return StatusCode(500, new { message = "Failed to send email" });
            }
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
                var flakeLink = $"[Flake: {flake.Title}]({baseUrl}/milo-flake-view.html?id={flake.Id})";
                
                var contentPreview = string.IsNullOrEmpty(flake.Content) 
                    ? "" 
                    : (flake.Content.Length > 500 ? flake.Content.Substring(0, 500) : flake.Content);
                
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
                        var emailService = HttpContext.RequestServices.GetRequiredService<Milo.API.Services.EmailService>();
                        var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
                        
                        var taskUrl = $"{baseUrl}/milo-board.html";
                        var projectName = task.Project?.Name ?? "Unknown Project";
                        var sharedByName = flake.Author?.Name ?? "Someone";
                        var fromEmail = configuration["Email:FromEmail"] ?? "info@streamyo.net";
                        var fromName = configuration["Email:FromName"] ?? "Milo - Coding Everest";

                        var emailBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #172B4D; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #FFFFFF; padding: 30px; text-align: center; }}
        .content {{ padding: 30px; }}
        .task-info {{ background: #F4F5F7; padding: 16px; border-radius: 4px; margin: 16px 0; }}
        .btn {{ display: inline-block; background: #0052CC; color: #FFFFFF !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 16px; }}
        .footer {{ padding: 20px; background: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center; font-size: 12px; color: #6B778C; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📄 Flake Linked to Your Task</h1>
        </div>
        <div class='content'>
            <p>Hello {task.Assignee.Name},</p>
            <p><strong>{sharedByName}</strong> linked a flake to your task in <strong>{projectName}</strong>.</p>
            <div class='task-info'>
                <strong>Task:</strong> {task.TaskId}: {task.Title}<br>
                <strong>Flake:</strong> {flake.Title}
            </div>
            <p><strong>Flake Preview:</strong></p>
            <p style='color: #42526E;'>{contentPreview}</p>
            <div style='text-align: center; margin-top: 24px;'>
                <a href='{taskUrl}' class='btn'>View Task on Board</a>
            </div>
        </div>
        <div class='footer'>
            <p>This notification was sent from Milo - Coding Everest</p>
        </div>
    </div>
</body>
</html>";

                        var message = new MimeMessage();
                        message.From.Add(new MailboxAddress(fromName, fromEmail));
                        message.To.Add(new MailboxAddress(task.Assignee.Name, task.Assignee.Email));
                        message.Subject = $"Flake linked to your task: {task.TaskId}";

                        var bodyBuilder = new BodyBuilder
                        {
                            HtmlBody = emailBody,
                            TextBody = $"Flake Linked to Your Task\n\nHello {task.Assignee.Name},\n\n{sharedByName} linked a flake to your task.\n\nTask: {task.TaskId}: {task.Title}\nFlake: {flake.Title}\n\nView task: {taskUrl}"
                        };

                        message.Body = bodyBuilder.ToMessageBody();
                        await emailService.SendCustomEmailAsync(message, task.Assignee.Email);
                        
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

