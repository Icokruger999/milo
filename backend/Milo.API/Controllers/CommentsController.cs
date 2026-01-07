using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(MiloDbContext context, ILogger<CommentsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetTaskComments(int taskId)
    {
        try
        {
            var comments = await _context.TaskComments
                .Where(c => c.TaskId == taskId && !c.IsDeleted)
                .Include(c => c.Author)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new
                {
                    id = c.Id,
                    text = c.Text,
                    author = new
                    {
                        id = c.Author.Id,
                        name = c.Author.Name,
                        email = c.Author.Email
                    },
                    authorId = c.AuthorId,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                })
                .ToListAsync();

            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting comments for task {TaskId}", taskId);
            return StatusCode(500, new { message = "An error occurred while retrieving comments", detail = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateComment([FromBody] CreateCommentRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Text) || !request.TaskId.HasValue || !request.AuthorId.HasValue)
            {
                return BadRequest(new { message = "Text, TaskId, and AuthorId are required" });
            }

            // Verify task exists
            var task = await _context.Tasks.FindAsync(request.TaskId.Value);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
            }

            // Verify author exists
            var author = await _context.Users.FindAsync(request.AuthorId.Value);
            if (author == null)
            {
                return NotFound(new { message = "Author not found" });
            }

            var comment = new TaskComment
            {
                TaskId = request.TaskId.Value,
                Text = request.Text.Trim(),
                AuthorId = request.AuthorId.Value,
                CreatedAt = DateTime.UtcNow
            };

            _context.TaskComments.Add(comment);
            await _context.SaveChangesAsync();

            // Load author for response
            await _context.Entry(comment).Reference(c => c.Author).LoadAsync();

            return CreatedAtAction(nameof(GetTaskComments), new { taskId = comment.TaskId }, new
            {
                id = comment.Id,
                text = comment.Text,
                author = new
                {
                    id = comment.Author.Id,
                    name = comment.Author.Name,
                    email = comment.Author.Email
                },
                authorId = comment.AuthorId,
                createdAt = comment.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating comment");
            return StatusCode(500, new { message = "An error occurred while creating the comment", detail = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(int id)
    {
        try
        {
            var comment = await _context.TaskComments.FindAsync(id);
            if (comment == null || comment.IsDeleted)
            {
                return NotFound(new { message = "Comment not found" });
            }

            comment.IsDeleted = true;
            comment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Comment deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment {CommentId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the comment", detail = ex.Message });
        }
    }
}

public class CreateCommentRequest
{
    public int? TaskId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int? AuthorId { get; set; }
}

