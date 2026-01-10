using Microsoft.AspNetCore.Mvc;
using Milo.API.Services;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailTestController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<EmailTestController> _logger;

    public EmailTestController(IEmailService emailService, ILogger<EmailTestController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request?.Email))
            {
                return BadRequest(new { message = "Email address is required" });
            }

            _logger.LogInformation($"[EMAIL TEST] Testing email send to {request.Email}");

            var result = await _emailService.SendTaskAssignmentEmailAsync(
                request.Email,
                request.Name ?? "Test User",
                "Test Task",
                "TEST-1",
                "Test Project",
                "https://www.codingeverest.com/milo-board.html"
            );

            if (result)
            {
                return Ok(new { success = true, message = $"Test email sent successfully to {request.Email}" });
            }
            else
            {
                return StatusCode(500, new { success = false, message = "Email service returned false - check email configuration" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[EMAIL TEST] Failed to send test email: {ex.Message}");
            return StatusCode(500, new { success = false, message = ex.Message, error = ex.ToString() });
        }
    }
}

public class TestEmailRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
}

