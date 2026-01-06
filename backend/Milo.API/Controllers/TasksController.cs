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
    public async Task<IActionResult> GetTasks([FromQuery] string? status, [FromQuery] int? productId)
    {
        var query = _context.Tasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.Assignee)
            .Include(t => t.Creator)
            .Include(t => t.Product)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(t => t.Status == status);
        }

        if (productId.HasValue)
        {
            query = query.Where(t => t.ProductId == productId);
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
            priority = t.Priority,
            dueDate = t.DueDate,
            createdAt = t.CreatedAt
        }));
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
        if (request == null || string.IsNullOrEmpty(request.Title))
        {
            return BadRequest(new { message = "Title is required" });
        }

        // Generate task ID if not provided
        var taskId = request.TaskId;
        if (string.IsNullOrEmpty(taskId))
        {
            var lastTask = await _context.Tasks
                .Where(t => t.TaskId != null && t.TaskId.StartsWith("NUC-"))
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
            taskId = $"NUC-{nextNumber}";
        }

        var task = new Task
        {
            Title = request.Title,
            Description = request.Description,
            Status = request.Status ?? "todo",
            Label = request.Label,
            TaskId = taskId,
            AssigneeId = request.AssigneeId,
            CreatorId = request.CreatorId,
            ProductId = request.ProductId,
            Priority = request.Priority ?? 0,
            DueDate = request.DueDate,
            CreatedAt = DateTime.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        // Load assignee for email notification
        if (task.AssigneeId.HasValue)
        {
            await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
            await _context.Entry(task).Reference(t => t.Creator).LoadAsync();
            await _context.Entry(task).Reference(t => t.Product).LoadAsync();

            if (task.Assignee != null)
            {
                // Send email notification (fire and forget)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _emailService.SendTaskAssignmentEmailAsync(
                            task.Assignee.Email,
                            task.Assignee.Name,
                            task.Title,
                            task.TaskId ?? task.Id.ToString(),
                            task.Product?.Name ?? "General"
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to send task assignment email to {task.Assignee.Email}");
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
                await _context.Entry(task).Reference(t => t.Product).LoadAsync();
                
                if (task.Assignee != null)
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendTaskAssignmentEmailAsync(
                                task.Assignee.Email,
                                task.Assignee.Name,
                                task.Title,
                                task.TaskId ?? task.Id.ToString(),
                                task.Product?.Name ?? "General"
                            );
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to send task assignment email to {task.Assignee.Email}");
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
            task.DueDate = request.DueDate;
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

