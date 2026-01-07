using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;
using System.Security.Cryptography;
using System.Text;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly EmailService _emailService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(MiloDbContext context, EmailService emailService, ILogger<TasksController> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] string? status, [FromQuery] int? productId, [FromQuery] int? projectId)
    {
        try
        {
            var query = _context.Tasks
                .Where(t => !t.IsDeleted)
                .Include(t => t.Assignee)
                .Include(t => t.Creator)
                .Include(t => t.Product)
                .Include(t => t.Project)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(t => t.Status == status);
            }

            if (productId.HasValue)
            {
                query = query.Where(t => t.ProductId == productId);
            }

            if (projectId.HasValue)
            {
                query = query.Where(t => t.ProjectId == projectId);
            }

            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

            return Ok(tasks.Select(t => new
            {
                id = t.Id,
                title = t.Title,
                description = t.Description,
                status = t.Status,
                label = t.Label,
                taskId = t.TaskId,
                assignee = t.Assignee != null ? new { id = t.Assignee.Id, name = t.Assignee.Name, email = t.Assignee.Email } : null,
                assigneeId = t.AssigneeId,
                creator = t.Creator != null ? new { id = t.Creator.Id, name = t.Creator.Name } : null,
                productId = t.ProductId,
                product = t.Product != null ? new { id = t.Product.Id, name = t.Product.Name } : null,
                projectId = t.ProjectId,
                project = t.Project != null ? new { id = t.Project.Id, name = t.Project.Name, key = t.Project.Key } : null,
                priority = t.Priority,
                dueDate = t.DueDate,
                createdAt = t.CreatedAt
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tasks: {Message}", ex.Message);
            return StatusCode(500, new { message = "An error occurred while retrieving tasks", detail = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTask(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Assignee)
            .Include(t => t.Creator)
            .Include(t => t.Product)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        return Ok(new
        {
            id = task.Id,
            title = task.Title,
            description = task.Description,
            status = task.Status,
            label = task.Label,
            taskId = task.TaskId,
            assignee = task.Assignee != null ? new { id = task.Assignee.Id, name = task.Assignee.Name, email = task.Assignee.Email } : null,
            assigneeId = task.AssigneeId,
            creator = task.Creator != null ? new { id = task.Creator.Id, name = task.Creator.Name } : null,
            productId = task.ProductId,
            product = task.Product != null ? new { id = task.Product.Id, name = task.Product.Name } : null,
            priority = task.Priority,
            dueDate = task.DueDate,
            createdAt = task.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Title))
            {
                return BadRequest(new { message = "Title is required" });
            }

            // Get project key for task ID prefix
            string taskPrefix = "TASK";
            if (request.ProjectId.HasValue)
            {
                var project = await _context.Projects.FindAsync(request.ProjectId.Value);
                if (project != null && !string.IsNullOrEmpty(project.Key))
                {
                    taskPrefix = project.Key;
                }
            }

            // Generate task ID if not provided
            var taskId = request.TaskId;
            if (string.IsNullOrEmpty(taskId))
            {
                var lastTask = await _context.Tasks
                    .Where(t => t.ProjectId == request.ProjectId && t.TaskId != null && t.TaskId.StartsWith($"{taskPrefix}-"))
                    .OrderByDescending(t => t.Id)
                    .FirstOrDefaultAsync();
                
                var nextNumber = 1;
                if (lastTask != null && lastTask.TaskId != null)
                {
                    var parts = lastTask.TaskId.Split('-');
                    if (parts.Length > 1 && int.TryParse(parts[1], out var lastNum))
                    {
                        nextNumber = lastNum + 1;
                    }
                }
                taskId = $"{taskPrefix}-{nextNumber}";
            }

            // Ensure DueDate is UTC if provided
            DateTime? dueDateUtc = null;
            if (request.DueDate.HasValue)
            {
                var dueDate = request.DueDate.Value;
                
                // Always ensure UTC for PostgreSQL
                if (dueDate.Kind == DateTimeKind.Unspecified)
                {
                    // Treat as UTC if unspecified (common when deserializing from JSON)
                    dueDateUtc = DateTime.SpecifyKind(dueDate, DateTimeKind.Utc);
                }
                else if (dueDate.Kind == DateTimeKind.Local)
                {
                    // Convert local to UTC
                    dueDateUtc = dueDate.ToUniversalTime();
                }
                else
                {
                    // Already UTC - ensure it stays UTC
                    dueDateUtc = dueDate;
                }
                
                // Double-check: if somehow still not UTC, force it
                if (dueDateUtc.HasValue && dueDateUtc.Value.Kind != DateTimeKind.Utc)
                {
                    dueDateUtc = DateTime.SpecifyKind(dueDateUtc.Value, DateTimeKind.Utc);
                }
            }

            var task = new Models.Task
            {
                Title = request.Title,
                Description = request.Description,
                Status = request.Status ?? "todo",
                Label = request.Label,
                TaskId = taskId,
                AssigneeId = request.AssigneeId,
                CreatorId = request.CreatorId,
                ProductId = request.ProductId,
                ProjectId = request.ProjectId,
                Priority = request.Priority ?? 0,
                DueDate = dueDateUtc,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Load all data needed for email notification BEFORE Task.Run
            // (DbContext is scoped and will be disposed after request completes)
            string? assigneeEmail = null;
            string? assigneeName = null;
            string? projectName = null;
            
            if (task.AssigneeId.HasValue)
            {
                await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
                await _context.Entry(task).Reference(t => t.Project).LoadAsync();
                
                if (task.Assignee != null)
                {
                    assigneeEmail = task.Assignee.Email;
                    assigneeName = task.Assignee.Name;
                    projectName = task.Project?.Name ?? "General";
                    
                    // Send email notification (fire and forget)
                    // Pass all data as parameters to avoid needing DbContext
                    var taskTitle = task.Title;
                    var taskIdForEmail = task.TaskId ?? task.Id.ToString();
                    var taskLink = $"https://www.codingeverest.com/milo-board.html?projectId={task.ProjectId}&taskId={task.Id}";
                    
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        try
                        {
                            // Note: The email service expects taskId as the 4th parameter, but we'll pass the link
                            // Actually, looking at the signature, it expects: toEmail, toName, taskTitle, taskId, productName
                            // But the email template uses taskId in the subject and body, and we want to include the link
                            // Let me check the email service signature again - it's: SendTaskAssignmentEmailAsync(string toEmail, string toName, string taskTitle, string taskId, string productName)
                            // So taskId is the 4th parameter, and productName is the 5th
                            await _emailService.SendTaskAssignmentEmailAsync(
                                assigneeEmail!,
                                assigneeName!,
                                taskTitle,
                                taskIdForEmail, // Pass task ID (e.g., "MILO-1")
                                projectName!,   // Pass project name as productName parameter
                                taskLink        // Pass the full task link
                            );
                            _logger.LogInformation($"Task assignment email sent successfully to {assigneeEmail} for task {taskIdForEmail}");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to send task assignment email to {assigneeEmail} for task {taskIdForEmail}: {ex.Message}");
                        }
                    });
                }
            }

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, new
            {
                id = task.Id,
                title = task.Title,
                description = task.Description,
                status = task.Status,
                label = task.Label,
                taskId = task.TaskId,
                assigneeId = task.AssigneeId,
                productId = task.ProductId,
                priority = task.Priority,
                dueDate = task.DueDate,
                createdAt = task.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task: {Message}", ex.Message);
            return StatusCode(500, new { message = "An error occurred while creating the task", detail = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        if (!string.IsNullOrEmpty(request.Title))
        {
            task.Title = request.Title;
        }
        if (request.Description != null)
        {
            task.Description = request.Description;
        }
        if (!string.IsNullOrEmpty(request.Status))
        {
            task.Status = request.Status;
        }
        if (request.Label != null)
        {
            task.Label = request.Label;
        }
        if (request.AssigneeId.HasValue)
        {
            var oldAssigneeId = task.AssigneeId;
            task.AssigneeId = request.AssigneeId;
            
            // Send email if assignee changed
            if (oldAssigneeId != request.AssigneeId && request.AssigneeId.HasValue)
            {
                await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
                await _context.Entry(task).Reference(t => t.Project).LoadAsync();
                
                if (task.Assignee != null)
                {
                    // Load all data before Task.Run (DbContext is scoped)
                    var assigneeEmail = task.Assignee.Email;
                    var assigneeName = task.Assignee.Name;
                    var taskTitle = task.Title;
                    var taskIdForEmail = task.TaskId ?? task.Id.ToString();
                    var projectName = task.Project?.Name ?? "General";
                    var taskLink = $"https://www.codingeverest.com/milo-board.html?projectId={task.ProjectId}&taskId={task.Id}";
                    
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendTaskAssignmentEmailAsync(
                                assigneeEmail,
                                assigneeName,
                                taskTitle,
                                taskIdForEmail,
                                projectName,
                                taskLink
                            );
                            _logger.LogInformation($"Task assignment email sent successfully to {assigneeEmail} for task {taskIdForEmail}");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to send task assignment email to {assigneeEmail} for task {taskIdForEmail}: {ex.Message}");
                        }
                    });
                }
            }
        }
        if (request.ProductId.HasValue)
        {
            task.ProductId = request.ProductId;
        }
        if (request.Priority.HasValue)
        {
            task.Priority = request.Priority.Value;
        }
        if (request.DueDate.HasValue)
        {
            // Ensure DueDate is UTC for PostgreSQL
            var dueDate = request.DueDate.Value;
            if (dueDate.Kind == DateTimeKind.Unspecified)
            {
                // Treat as UTC if unspecified
                task.DueDate = DateTime.SpecifyKind(dueDate, DateTimeKind.Utc);
            }
            else if (dueDate.Kind == DateTimeKind.Local)
            {
                // Convert local to UTC
                task.DueDate = dueDate.ToUniversalTime();
            }
            else
            {
                // Already UTC
                task.DueDate = dueDate;
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = task.Id,
            title = task.Title,
            status = task.Status,
            message = "Task updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        task.IsDeleted = true;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Task deleted successfully" });
    }
}

public class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Label { get; set; }
    public string? TaskId { get; set; }
    public int? AssigneeId { get; set; }
    public int? CreatorId { get; set; }
    public int? ProductId { get; set; }
    public int? ProjectId { get; set; }
    public int? Priority { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Label { get; set; }
    public int? AssigneeId { get; set; }
    public int? ProductId { get; set; }
    public int? Priority { get; set; }
    public DateTime? DueDate { get; set; }
}

