using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly EmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    // Temporary hardcoded user for development
    private const string ValidEmail = "info@streamyo.net";
    private const string ValidPassword = "Stacey@1122";

    public AuthController(MiloDbContext context, EmailService emailService, ILogger<AuthController> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        // Check hardcoded user first
        if (request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase) && 
            request.Password == ValidPassword)
        {
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

        // Check database users
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.IsActive);

        if (user != null)
        {
            // Simple password comparison (in production, use hashed passwords)
            if (user.PasswordHash == request.Password || 
                (user.RequiresPasswordChange && user.PasswordHash == request.Password))
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
                            id = user.Id,
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
                        id = user.Id,
                        email = user.Email,
                        name = user.Name
                    },
                    message = "Login successful"
                });
            }
        }

        return Unauthorized(new { message = "Invalid email or password" });
    }

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
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
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (existingUser != null || request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "An account with this email already exists" });
        }

        // Generate temporary password
        var tempPassword = GenerateTemporaryPassword();

        // Create new user account
        var newUser = new User
        {
            Email = request.Email,
            Name = request.Name,
            PasswordHash = tempPassword, // In production, hash this!
            RequiresPasswordChange = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Send email with temporary password (fire and forget)
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendTemporaryPasswordEmailAsync(request.Email, request.Name, tempPassword);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send temporary password email to {request.Email}");
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
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    [HttpPost("verify")]
    public IActionResult VerifyToken([FromBody] TokenRequest request)
    {
        if (!string.IsNullOrEmpty(request.Token))
        {
            return Ok(new { valid = true });
        }

        return Unauthorized(new { valid = false });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || 
            string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword))
        {
            return BadRequest(new { message = "Email, current password, and new password are required" });
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long" });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.IsActive);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        // Verify current password
        if (user.PasswordHash != request.CurrentPassword)
        {
            return Unauthorized(new { message = "Current password is incorrect" });
        }

        // Update password and clear password change requirement
        user.PasswordHash = request.NewPassword; // In production, hash this!
        user.RequiresPasswordChange = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = Guid.NewGuid().ToString();

        return Ok(new
        {
            success = true,
            token = token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name
            },
            message = "Password changed successfully"
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Where(u => u.IsActive)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                name = u.Name
            })
            .ToListAsync();

        return Ok(users);
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
}

public class ChangePasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
