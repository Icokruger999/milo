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
            // Check if user needs to change password
            if (user.RequiresPasswordChange)
            {
                var token = Guid.NewGuid().ToString();
                
                return Ok(new
                {
                    success = true,
                    token = token,
                    requiresPasswordChange = true,
                    user = new
                    {
                        email = user.Email,
                        name = user.Name
                    },
                    message = "Please change your password to continue"
                });
            }

            var loginToken = Guid.NewGuid().ToString();
            
            return Ok(new
            {
                success = true,
                token = loginToken,
                requiresPasswordChange = false,
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
        if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Name))
        {
            return BadRequest(new { message = "Name and email are required" });
        }

        // Validate email format
        if (!request.Email.Contains("@") || !request.Email.Contains("."))
        {
            return BadRequest(new { message = "Invalid email format" });
        }

        // Check if user already exists
        var emailKey = request.Email.ToLowerInvariant();
        if (_users.ContainsKey(emailKey) || 
            request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "An account with this email already exists" });
        }

        // Generate temporary password (8 characters, alphanumeric)
        var tempPassword = GenerateTemporaryPassword();

        // Create new user account with temporary password
        var newUser = new UserAccount
        {
            Email = request.Email,
            Name = request.Name,
            Password = tempPassword, // Temporary password - user must change on first login
            RequiresPasswordChange = true, // Force password change on first login
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _users[emailKey] = newUser;

        // Send email with temporary password (fire and forget - don't wait for it)
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendTemporaryPasswordEmailAsync(request.Email, request.Name, tempPassword);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send temporary password email to {request.Email}");
                // Don't fail signup if email fails
            }
        });

        return Ok(new
        {
            success = true,
            message = "Account created successfully. Please check your email for your temporary password.",
            requiresPasswordChange = true
        });
    }

    private string GenerateTemporaryPassword()
    {
        // Generate an 8-character temporary password
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
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

    [HttpPost("change-password")]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || 
            string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword))
        {
            return BadRequest(new { message = "Email, current password, and new password are required" });
        }

        // Validate new password length
        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long" });
        }

        var emailKey = request.Email.ToLowerInvariant();
        if (!_users.TryGetValue(emailKey, out var user))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        // Verify current password
        if (user.Password != request.CurrentPassword)
        {
            return Unauthorized(new { message = "Current password is incorrect" });
        }

        // Update password and clear password change requirement
        user.Password = request.NewPassword;
        user.RequiresPasswordChange = false;

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
            message = "Password changed successfully"
        });
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
    // Password no longer required - system generates temporary password
}

public class ChangePasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UserAccount
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RequiresPasswordChange { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

