using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using Milo.API.Services;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // Temporary hardcoded user for development
    // TODO: Replace with database authentication
    private const string ValidEmail = "info@streamyo.com";
    private const string ValidPassword = "Stacey@1122";

    // In-memory user storage (temporary - replace with database)
    private static readonly ConcurrentDictionary<string, UserAccount> _users = new();
    
    private readonly EmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(EmailService emailService, ILogger<AuthController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        // Check hardcoded user first
        if (request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase) && 
            request.Password == ValidPassword)
        {
            // Generate a simple token (in production, use JWT)
            var token = Guid.NewGuid().ToString();
            
            return Ok(new
            {
                success = true,
                token = token,
                user = new
                {
                    email = request.Email,
                    name = "StreamYo User"
                },
                message = "Login successful"
            });
        }

        // Check registered users
        var emailKey = request.Email.ToLowerInvariant();
        if (_users.TryGetValue(emailKey, out var user) && user.Password == request.Password)
        {
            var token = Guid.NewGuid().ToString();
            
            return Ok(new
            {
                success = true,
                token = token,
                user = new
                {
                    email = user.Email,
                    name = user.Name
                },
                message = "Login successful"
            });
        }

        return Unauthorized(new { message = "Invalid email or password" });
    }

    [HttpPost("signup")]
    public IActionResult Signup([FromBody] SignupRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || 
            string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.Name))
        {
            return BadRequest(new { message = "Name, email, and password are required" });
        }

        // Validate email format
        if (!request.Email.Contains("@") || !request.Email.Contains("."))
        {
            return BadRequest(new { message = "Invalid email format" });
        }

        // Validate password length
        if (request.Password.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters long" });
        }

        // Check if user already exists
        var emailKey = request.Email.ToLowerInvariant();
        if (_users.ContainsKey(emailKey) || 
            request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "An account with this email already exists" });
        }

        // Create new user account
        var newUser = new UserAccount
        {
            Email = request.Email,
            Name = request.Name,
            Password = request.Password, // In production, hash this password!
            CreatedAt = DateTime.UtcNow
        };

        _users[emailKey] = newUser;

        // Generate token
        var token = Guid.NewGuid().ToString();

        // Send welcome email (fire and forget - don't wait for it)
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(request.Email, request.Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send welcome email to {request.Email}");
                // Don't fail signup if email fails
            }
        });

        return Ok(new
        {
            success = true,
            token = token,
            user = new
            {
                email = request.Email,
                name = request.Name
            },
            message = "Account created successfully"
        });
    }

    [HttpPost("verify")]
    public IActionResult VerifyToken([FromBody] TokenRequest request)
    {
        // Simple token verification (in production, use JWT validation)
        if (!string.IsNullOrEmpty(request.Token))
        {
            return Ok(new { valid = true });
        }

        return Unauthorized(new { valid = false });
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class TokenRequest
{
    public string Token { get; set; } = string.Empty;
}

public class SignupRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UserAccount
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

