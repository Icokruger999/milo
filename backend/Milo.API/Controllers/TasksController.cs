using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
    private readonly IEmailService _emailService;
    private readonly ILogger<TasksController> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public TasksController(MiloDbContext context, IEmailService emailService, ILogger<TasksController> logger, IServiceScopeFactory serviceScopeFactory)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] string? status, [FromQuery] int? productId, [FromQuery] int? projectId, [FromQuery] int? assigneeId, [FromQuery] int? parentTaskId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        try
        {
            var query = _context.Tasks
                .AsNoTracking() // Performance: Read-only query
                .Where(t => !t.IsDeleted)
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

            if (assigneeId.HasValue)
            {
                query = query.Where(t => t.AssigneeId == assigneeId);
            }

            if (parentTaskId.HasValue)
            {
                query = query.Where(t => t.ParentTaskId == parentTaskId);
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync();

            // Apply pagination and ordering
            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Status,
                    t.Label,
                    t.TaskId,
                    t.TaskType,
                    AssigneeId = t.AssigneeId,
                    Assignee = t.Assignee != null ? new { t.Assignee.Id, t.Assignee.Name, t.Assignee.Email } : null,
                    CreatorId = t.CreatorId,
                    Creator = t.Creator != null ? new { t.Creator.Id, t.Creator.Name } : null,
                    t.ProductId,
                    Product = t.Product != null ? new { t.Product.Id, t.Product.Name } : null,
                    t.ProjectId,
                    Project = t.Project != null ? new { t.Project.Id, t.Project.Name, t.Project.Key } : null,
                    t.Priority,
                    t.DueDate,
                    t.StartDate,
                    t.ParentTaskId,
                    t.Checklist,
                    t.CreatedAt
                })
                .ToListAsync();

            // Parse checklist JSON in memory (only for paginated results)
            var result = tasks.Select(t => {
                object? checklist = null;
                if (!string.IsNullOrEmpty(t.Checklist))
                {
                    try
                    {
                        checklist = System.Text.Json.JsonSerializer.Deserialize<object>(t.Checklist);
                    }
                    catch
                    {
                        // If parsing fails, leave as null
                    }
                }
                
                return new
                {
                    id = t.Id,
                    title = t.Title,
                    description = t.Description,
                    status = t.Status,
                    label = t.Label,
                    taskId = t.TaskId,
                    taskType = t.TaskType,
                    assignee = t.Assignee,
                    assigneeId = t.AssigneeId,
                    creator = t.Creator,
                    productId = t.ProductId,
                    product = t.Product,
                    projectId = t.ProjectId,
                    project = t.Project,
                    subProjectId = t.SubProjectId,
                    subProject = t.SubProject,
                    priority = t.Priority,
                    dueDate = t.DueDate,
                    startDate = t.StartDate,
                    parentTaskId = t.ParentTaskId,
                    checklist = checklist,
                    createdAt = t.CreatedAt
                };
            }).ToList();

            return Ok(result);
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
            .AsNoTracking() // Performance: Read-only query
            .Include(t => t.Assignee)
            .Include(t => t.Creator)
            .Include(t => t.Product)
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        // Parse checklist JSON if present
        object? checklist = null;
        if (!string.IsNullOrEmpty(task.Checklist))
        {
            try
            {
                checklist = System.Text.Json.JsonSerializer.Deserialize<object>(task.Checklist);
            }
            catch
            {
                // If parsing fails, leave as null
            }
        }
        
        return Ok(new
        {
            id = task.Id,
            title = task.Title,
            description = task.Description,
            status = task.Status,
            label = task.Label,
            taskId = task.TaskId,
            taskType = task.TaskType,
            assignee = task.Assignee != null ? new { id = task.Assignee.Id, name = task.Assignee.Name, email = task.Assignee.Email } : null,
            assigneeId = task.AssigneeId,
            creator = task.Creator != null ? new { id = task.Creator.Id, name = task.Creator.Name } : null,
            productId = task.ProductId,
            product = task.Product != null ? new { id = task.Product.Id, name = task.Product.Name } : null,
            projectId = task.ProjectId,
            project = task.Project != null ? new { id = task.Project.Id, name = task.Project.Name, key = task.Project.Key } : null,
            priority = task.Priority,
            dueDate = task.DueDate,
            startDate = task.StartDate,
            parentTaskId = task.ParentTaskId,
            checklist = checklist,
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
            
            // Log received dates for debugging
            _logger.LogInformation($"[CREATE TASK] Received StartDate: {request.StartDate}, DueDate: {request.DueDate}");
            _logger.LogInformation($"[CREATE TASK] StartDate.HasValue: {request.StartDate.HasValue}, DueDate.HasValue: {request.DueDate.HasValue}");

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

            // Ensure StartDate is UTC if provided
            DateTime? startDateUtc = null;
            if (request.StartDate.HasValue)
            {
                var startDate = request.StartDate.Value;
                
                if (startDate.Kind == DateTimeKind.Unspecified)
                {
                    startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
                }
                else if (startDate.Kind == DateTimeKind.Local)
                {
                    startDateUtc = startDate.ToUniversalTime();
                }
                else
                {
                    startDateUtc = startDate;
                }
                
                if (startDateUtc.HasValue && startDateUtc.Value.Kind != DateTimeKind.Utc)
                {
                    startDateUtc = DateTime.SpecifyKind(startDateUtc.Value, DateTimeKind.Utc);
                }
            }

            // Serialize checklist to JSON string
            string? checklistJson = null;
            if (request.Checklist != null)
            {
                checklistJson = System.Text.Json.JsonSerializer.Serialize(request.Checklist);
            }

            var task = new Models.Task
            {
                Title = request.Title,
                Description = request.Description,
                Status = request.Status ?? "todo",
                Label = request.Label,
                TaskId = taskId,
                TaskType = request.TaskType ?? "Task",
                AssigneeId = request.AssigneeId,
                CreatorId = request.CreatorId,
                ProductId = request.ProductId,
                ProjectId = request.ProjectId,
                SubProjectId = request.SubProjectId,
                Priority = request.Priority ?? 0,
                DueDate = dueDateUtc,
                StartDate = startDateUtc,
                ParentTaskId = request.ParentTaskId,
                Checklist = checklistJson,
                CreatedAt = DateTime.UtcNow
            };
            
            // Log what we're saving to database
            _logger.LogInformation($"[CREATE TASK] Saving to DB - StartDate: {task.StartDate}, DueDate: {task.DueDate}");

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Smart Email Sending Solution
            // Load assignee and project data for email notification
            if (task.AssigneeId.HasValue)
            {
                await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
                await _context.Entry(task).Reference(t => t.Project).LoadAsync();
                
                if (task.Assignee != null && !string.IsNullOrEmpty(task.Assignee.Email))
                {
                    var assigneeEmail = task.Assignee.Email;
                    var assigneeName = task.Assignee.Name;
                    var projectName = task.Project?.Name ?? "General";
                    var taskTitle = task.Title;
                    var taskIdForEmail = task.TaskId ?? task.Id.ToString();
                    var taskLink = $"https://www.codingeverest.com/milo-board.html?projectId={task.ProjectId}&taskId={task.Id}";
                    
                    _logger.LogInformation($"[EMAIL] Task {taskIdForEmail} created with assignee {assigneeName} ({assigneeEmail}) - preparing to send email");
                    
                    // Smart solution: Send email in background with proper error handling
                    // Use IServiceScopeFactory to ensure email service has proper scope
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        // Small delay to ensure database transaction is committed
                        await System.Threading.Tasks.Task.Delay(300);
                        
                        try
                        {
                            using (var scope = _serviceScopeFactory.CreateScope())
                            {
                                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                                var logger = scope.ServiceProvider.GetRequiredService<ILogger<TasksController>>();
                                
                                logger.LogInformation($"[EMAIL] Attempting to send task assignment email to {assigneeEmail} for task {taskIdForEmail}");
                                
                                // Send email with timeout protection
                                var emailTask = emailService.SendTaskAssignmentEmailAsync(
                                    assigneeEmail,
                                    assigneeName,
                                    taskTitle,
                                    taskIdForEmail,
                                    projectName,
                                    taskLink
                                );
                                
                                // Wait for email with timeout (30 seconds)
                                var timeoutTask = System.Threading.Tasks.Task.Delay(TimeSpan.FromSeconds(30));
                                var completedTask = await System.Threading.Tasks.Task.WhenAny(emailTask, timeoutTask);
                                
                                if (completedTask == emailTask)
                                {
                                    var emailSent = await emailTask;
                                    if (emailSent)
                                    {
                                        logger.LogInformation($"[EMAIL] ✓ SUCCESS: Task assignment email sent to {assigneeEmail} for task {taskIdForEmail}");
                                    }
                                    else
                                    {
                                        logger.LogWarning($"[EMAIL] ✗ FAILED: Email service returned false for {assigneeEmail} (task {taskIdForEmail}) - check email configuration in appsettings.json");
                                    }
                                }
                                else
                                {
                                    logger.LogError($"[EMAIL] ✗ TIMEOUT: Email sending timed out after 30 seconds for {assigneeEmail} (task {taskIdForEmail})");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            // Comprehensive error logging
                            try
                            {
                                using (var logScope = _serviceScopeFactory.CreateScope())
                                {
                                    var logger = logScope.ServiceProvider.GetRequiredService<ILogger<TasksController>>();
                                    logger.LogError(ex, $"[EMAIL] ✗ EXCEPTION: Failed to send email to {assigneeEmail} for task {taskIdForEmail}");
                                    logger.LogError($"[EMAIL] Error Type: {ex.GetType().Name}");
                                    logger.LogError($"[EMAIL] Error Message: {ex.Message}");
                                    if (ex.InnerException != null)
                                    {
                                        logger.LogError($"[EMAIL] Inner Exception: {ex.InnerException.Message}");
                                    }
                                    logger.LogError($"[EMAIL] Stack Trace: {ex.StackTrace}");
                                }
                            }
                            catch (Exception logEx)
                            {
                                // Last resort: write to console
                                Console.WriteLine($"[EMAIL ERROR] Failed to send to {assigneeEmail}: {ex.Message}");
                                Console.WriteLine($"[LOGGING ERROR] {logEx.Message}");
                            }
                        }
                    }).ContinueWith(t =>
                    {
                        if (t.IsFaulted && t.Exception != null)
                        {
                            _logger.LogError(t.Exception, $"[EMAIL] Background task faulted for task {taskIdForEmail}");
                        }
                    }, System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
                }
                else
                {
                    _logger.LogWarning($"[EMAIL] Task {task.Id} has AssigneeId {task.AssigneeId} but assignee is null or has no email address");
                }
            }
            else
            {
                _logger.LogInformation($"[EMAIL] Task {task.Id} created without assignee - no email will be sent (this is expected)");
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
        try
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
        // Handle Label: update if provided (including empty string to clear)
        if (request.Label != null)
        {
            // If empty string, set to null to clear the label
            task.Label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label;
        }
        // Handle AssigneeId: always update (including null to clear)
        // Frontend always sends assigneeId (null if unassigned), so we always update
        var oldAssigneeId = task.AssigneeId;
        task.AssigneeId = request.AssigneeId; // This will be null if unassigned, or the ID if assigned
        
        // Send email if assignee changed and new assignee is not null
        if (oldAssigneeId != task.AssigneeId && task.AssigneeId.HasValue)
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
                    
                    _logger.LogInformation($"Preparing to send task assignment email to {assigneeEmail} for task {taskIdForEmail} (update)");
                    
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        await System.Threading.Tasks.Task.Delay(500);
                        
                        try
                        {
                            using (var scope = _serviceScopeFactory.CreateScope())
                            {
                                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                                var logger = scope.ServiceProvider.GetRequiredService<ILogger<TasksController>>();
                                
                                logger.LogInformation($"Sending task assignment email to {assigneeEmail} for task {taskIdForEmail}");
                                
                                var emailSent = await emailService.SendTaskAssignmentEmailAsync(
                                    assigneeEmail,
                                    assigneeName,
                                    taskTitle,
                                    taskIdForEmail,
                                    projectName,
                                    taskLink
                                );
                                
                                if (emailSent)
                                {
                                    logger.LogInformation($"✓ Task assignment email sent successfully to {assigneeEmail} for task {taskIdForEmail}");
                                }
                                else
                                {
                                    logger.LogWarning($"✗ Task assignment email was not sent to {assigneeEmail} for task {taskIdForEmail} - email service returned false");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            try
                            {
                                using (var logScope = _serviceScopeFactory.CreateScope())
                                {
                                    var logger = logScope.ServiceProvider.GetRequiredService<ILogger<TasksController>>();
                                    logger.LogError(ex, $"✗ FAILED to send task assignment email to {assigneeEmail} for task {taskIdForEmail}. Error: {ex.Message}");
                                }
                            }
                            catch
                            {
                                Console.WriteLine($"ERROR: Failed to send email to {assigneeEmail}: {ex.Message}");
                            }
                        }
                    }).ContinueWith(t =>
                    {
                        if (t.IsFaulted)
                        {
                            _logger.LogError(t.Exception, $"Email task failed with exception for task {taskIdForEmail}");
                        }
                    }, System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
                }
            }
        
        if (request.ProductId.HasValue)
        {
            task.ProductId = request.ProductId;
        }
        if (request.SubProjectId.HasValue)
        {
            task.SubProjectId = request.SubProjectId;
        }
        if (request.Priority.HasValue)
        {
            task.Priority = request.Priority.Value;
        }
        // Handle DueDate: always update (including null to clear)
        // Frontend always sends dueDate (null if empty, or ISO string if set)
        // System.Text.Json automatically parses ISO strings to DateTime
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
            _logger.LogInformation($"[UPDATE TASK {id}] DueDate set to: {task.DueDate} (UTC)");
        }
        else
        {
            // Frontend sent null explicitly to clear the due date
            task.DueDate = null;
            _logger.LogInformation($"[UPDATE TASK {id}] DueDate cleared (set to null)");
        }
        
        // Handle StartDate: always update (including null to clear)
        // Frontend always sends startDate (null if empty, or ISO string if set)
        // System.Text.Json automatically parses ISO strings to DateTime
        if (request.StartDate.HasValue)
        {
            var startDate = request.StartDate.Value;
            if (startDate.Kind == DateTimeKind.Unspecified)
            {
                task.StartDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            }
            else if (startDate.Kind == DateTimeKind.Local)
            {
                task.StartDate = startDate.ToUniversalTime();
            }
            else
            {
                task.StartDate = startDate;
            }
            _logger.LogInformation($"[UPDATE TASK {id}] StartDate set to: {task.StartDate} (UTC)");
        }
        else
        {
            // Frontend sent null explicitly to clear the start date
            task.StartDate = null;
            _logger.LogInformation($"[UPDATE TASK {id}] StartDate cleared (set to null)");
        }
        if (request.ParentTaskId.HasValue)
        {
            task.ParentTaskId = request.ParentTaskId;
        }
        if (!string.IsNullOrEmpty(request.TaskType))
        {
            task.TaskType = request.TaskType;
        }
        if (request.Checklist != null)
        {
            // Serialize checklist to JSON string
            task.Checklist = System.Text.Json.JsonSerializer.Serialize(request.Checklist);
        }

            task.UpdatedAt = DateTime.UtcNow;
            
            // Log what we're about to save
            _logger.LogInformation($"[UPDATE TASK {id}] Saving to DB - StartDate: {task.StartDate?.ToString() ?? "null"}, DueDate: {task.DueDate?.ToString() ?? "null"}, AssigneeId: {task.AssigneeId?.ToString() ?? "null"}, Label: {task.Label ?? "null"}");
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"[UPDATE TASK {id}] Successfully saved to DB");

            // Reload task with related data for response
            await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
            await _context.Entry(task).Reference(t => t.Creator).LoadAsync();
            await _context.Entry(task).Reference(t => t.Product).LoadAsync();
            await _context.Entry(task).Reference(t => t.Project).LoadAsync();

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
                projectId = task.ProjectId,
                project = task.Project != null ? new { id = task.Project.Id, name = task.Project.Name, key = task.Project.Key } : null,
                priority = task.Priority,
                dueDate = task.DueDate,
                startDate = task.StartDate,
                createdAt = task.CreatedAt,
                updatedAt = task.UpdatedAt,
                message = "Task updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task {TaskId}: {Message}", id, ex.Message);
            return StatusCode(500, new { message = "An error occurred while updating the task", detail = ex.Message });
        }
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
        // Log what we're saving to database
        _logger.LogInformation($"[UPDATE TASK {id}] Saving to DB - StartDate: {task.StartDate}, DueDate: {task.DueDate}");
        
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
    public string? TaskType { get; set; } // Epic, Task, Bug, Story
    public int? AssigneeId { get; set; }
    public int? CreatorId { get; set; }
    public int? ProductId { get; set; }
    public int? ProjectId { get; set; }
    public int? SubProjectId { get; set; }
    public int? Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? StartDate { get; set; }
    public int? ParentTaskId { get; set; }
    public object? Checklist { get; set; } // Array of {text: string, completed: bool}
}

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Label { get; set; }
    public string? TaskType { get; set; } // Epic, Task, Bug, Story
    public int? AssigneeId { get; set; }
    public int? ProductId { get; set; }
    public int? SubProjectId { get; set; }
    public int? Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? StartDate { get; set; }
    public int? ParentTaskId { get; set; }
    public object? Checklist { get; set; } // Array of {text: string, completed: bool}
}

