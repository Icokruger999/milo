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

            // Simplified email template for better compatibility
            var titleHtml = System.Net.WebUtility.HtmlEncode(flake.Title);
            var authorHtml = System.Net.WebUtility.HtmlEncode(authorName);
            var projectHtml = System.Net.WebUtility.HtmlEncode(projectName);
            var urlHtml = System.Net.WebUtility.HtmlEncode(flakeUrl);
            
            // Professional, Outlook-compatible email template using tables
            var emailBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <!--[if mso]>
    <style type=""text/css"">
        body, table, td {{font-family: Arial, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style=""margin: 0; padding: 0; background-color: #F4F5F7; font-family: Arial, sans-serif;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7;"">
        <tr>
            <td align=""center"" style=""padding: 40px 20px;"">
                <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #FFFFFF; max-width: 600px; width: 100%; border-radius: 8px; overflow: hidden;"">
                    <!-- Header -->
                    <tr>
                        <td style=""background-color: #0052CC; padding: 40px 30px; text-align: center;"">
                            <h1 style=""margin: 0; font-size: 24px; font-weight: 600; color: #FFFFFF; line-height: 1.3;"">{titleHtml}</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style=""padding: 40px 30px;"">
                            <p style=""margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #172B4D;"">Hello,</p>
                            <p style=""margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #172B4D;""><strong style=""color: #172B4D;"">{authorHtml}</strong> has shared a flake from <strong style=""color: #172B4D;"">{projectHtml}</strong> with you.</p>
                            
                            <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7; border-radius: 4px; margin-bottom: 30px;"">
                                <tr>
                                    <td style=""padding: 20px;"">
                                        <p style=""margin: 0 0 12px 0; font-size: 14px; color: #6B778C; line-height: 1.5;""><strong style=""color: #42526E;"">Project:</strong> {projectHtml}</p>
                                        <p style=""margin: 0 0 12px 0; font-size: 14px; color: #6B778C; line-height: 1.5;""><strong style=""color: #42526E;"">Shared by:</strong> {authorHtml}</p>
                                        <p style=""margin: 0; font-size: 14px; color: #6B778C; line-height: 1.5;""><strong style=""color: #42526E;"">Date:</strong> {dateStr} at {timeStr}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 32px 0;"">
                                <tr>
                                    <td align=""center"">
                                        <a href=""{flakeUrl}"" style=""display: inline-block; background-color: #0052CC; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px; line-height: 1.5;"">VIEW FLAKE</a>
                                    </td>
                                </tr>
                            </table>

                            <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7; border-radius: 4px; margin-top: 30px;"">
                                <tr>
                                    <td style=""padding: 20px; text-align: center;"">
                                        <p style=""margin: 0 0 12px 0; font-size: 13px; color: #6B778C;"">Or copy this link:</p>
                                        <p style=""margin: 0; font-size: 13px; word-break: break-all;""><a href=""{flakeUrl}"" style=""color: #0052CC; text-decoration: underline;"">{urlHtml}</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style=""padding: 20px 30px; background-color: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center;"">
                            <p style=""margin: 0; font-size: 12px; color: #6B778C; line-height: 1.5;"">This email was sent from <strong style=""color: #42526E;"">Milo</strong> - Your Project Management Workspace</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

            var subject = $"Shared Flake: {flake.Title}";
            
            var textBody = @"Shared Flake: " + flake.Title + @"

Hello,

" + authorName + @" has shared a flake from " + projectName + @" with you.

Project: " + projectName + @"
Shared by: " + authorName + @"
Date: " + dateStr + @" at " + timeStr + @"

Flake: " + flake.Title + @"

=====================================
CLICK HERE TO VIEW THE FLAKE:
" + flakeUrl + @"
=====================================

Or copy and paste the link above into your browser.

---
This flake was shared from Milo";

            var sent = await emailService.SendCustomEmailAsync(request.ToEmail, subject, emailBody, textBody);
            
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
            <p>This notification was sent from Milo</p>
        </div>
    </div>
</body>
</html>";

                        var subject = $"Flake linked to your task: {task.TaskId}";
                        var textBody = $"Flake Linked to Your Task\n\nHello {task.Assignee.Name},\n\n{sharedByName} linked a flake to your task.\n\nTask: {task.TaskId}: {task.Title}\nFlake: {flake.Title}\n\nView task: {taskUrl}";
                        
                        await emailService.SendCustomEmailAsync(task.Assignee.Email, subject, emailBody, textBody);
                        
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

