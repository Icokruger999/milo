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
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    // Temporary hardcoded user for development
    private const string ValidEmail = "info@streamyo.net";
    private const string ValidPassword = "Stacey@1122";

    public AuthController(MiloDbContext context, IEmailService emailService, ILogger<AuthController> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
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
            // Use EF.Functions.Like for case-insensitive comparison (works better with PostgreSQL)
            var emailLower = request.Email.ToLower();
            var user = await _context.Users
                .AsNoTracking() // Performance: Read-only query
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsActive);

            if (user != null)
            {
                // Simple password comparison (in production, use hashed passwords)
                if (user.PasswordHash == request.Password || 
                    (user.RequiresPasswordChange && user.PasswordHash == request.Password))
                {
                    var token = Guid.NewGuid().ToString();
                    
                    // Check if this is first successful login after signup (RequiresPasswordChange = true)
                    var isFirstLogin = user.RequiresPasswordChange;
                    
                    // Get user's projects (owned or member of) - simplified query
                    var ownedProjects = await _context.Projects
                        .AsNoTracking()
                        .Where(p => p.OwnerId == user.Id && p.Status != "archived")
                        .Select(p => new
                        {
                            id = p.Id,
                            name = p.Name,
                            key = p.Key,
                            description = p.Description,
                            role = "owner"
                        })
                        .ToListAsync();
                    
                    var memberProjects = await _context.ProjectMembers
                        .AsNoTracking()
                        .Where(pm => pm.UserId == user.Id)
                        .Join(_context.Projects.Where(p => p.Status != "archived"),
                            pm => pm.ProjectId,
                            p => p.Id,
                            (pm, p) => new
                            {
                                id = p.Id,
                                name = p.Name,
                                key = p.Key,
                                description = p.Description,
                                role = pm.Role
                            })
                        .ToListAsync();
                    
                    // Combine and deduplicate (user might be both owner and member)
                    var userProjects = ownedProjects
                        .Concat(memberProjects.Where(mp => !ownedProjects.Any(op => op.id == mp.id)))
                        .ToList();
                    
                    // Send notification email to admin if this is first successful login after signup
                    if (isFirstLogin)
                    {
                        _ = System.Threading.Tasks.Task.Run(async () =>
                        {
                            try
                            {
                                _logger.LogInformation($"Sending new user notification email for {user.Email}");
                                await _emailService.SendNewUserNotificationEmailAsync(user.Email, user.Name, user.CreatedAt);
                                _logger.LogInformation($"✓ New user notification email sent successfully for {user.Email}");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"✗ FAILED to send new user notification email for {user.Email}. Error: {ex.Message}");
                            }
                        });
                    }
                    
                    return Ok(new
                    {
                        success = true,
                        token = token,
                        requiresPasswordChange = user.RequiresPasswordChange,
                        user = new
                        {
                            id = user.Id,
                            email = user.Email,
                            name = user.Name
                        },
                        projects = userProjects,
                        message = user.RequiresPasswordChange ? "Please change your password to continue" : "Login successful"
                    });
                }
            }

            return Unauthorized(new { message = "Invalid email or password" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login: {Error}", ex.Message);
            _logger.LogError(ex, "Stack trace: {StackTrace}", ex.StackTrace);
            // Include inner exception details if available (often contains the actual database error)
            if (ex.InnerException != null)
            {
                _logger.LogError(ex.InnerException, "Inner exception: {InnerError}", ex.InnerException.Message);
            }
            return StatusCode(500, new { message = "An error occurred during login. Please try again.", error = ex.Message });
        }
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
        _ = System.Threading.Tasks.Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation($"Attempting to send temporary password email to {request.Email}");
                var emailSent = await _emailService.SendTemporaryPasswordEmailAsync(request.Email, request.Name, tempPassword);
                if (emailSent)
                {
                    _logger.LogInformation($"✓ Temporary password email sent successfully to {request.Email}");
                }
                else
                {
                    _logger.LogWarning($"✗ Temporary password email was not sent to {request.Email} - email service returned false");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"✗ FAILED to send temporary password email to {request.Email}. Error: {ex.Message}");
                if (ex.InnerException != null)
                {
                    _logger.LogError(ex.InnerException, $"Inner exception: {ex.InnerException.Message}");
                }
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

    [HttpPost("check-user")]
    public async Task<IActionResult> CheckUser([FromBody] CheckUserRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        try
        {
            var emailLower = request.Email.ToLower();
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

            if (user == null)
            {
                return Ok(new
                {
                    exists = false,
                    message = "User does not exist. They can proceed with signup."
                });
            }

            return Ok(new
            {
                exists = true,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.Name,
                    isActive = user.IsActive,
                    requiresPasswordChange = user.RequiresPasswordChange,
                    createdAt = user.CreatedAt
                },
                message = user.IsActive 
                    ? "User exists and is active. They should try logging in or request password reset."
                    : "User exists but is inactive."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking user: {Email}", request.Email);
            return StatusCode(500, new { message = "Error checking user", error = ex.Message });
        }
    }

    [HttpDelete("user")]
    public async Task<IActionResult> DeleteUser([FromBody] DeleteUserRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        try
        {
            var emailLower = request.Email.ToLower();
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Delete user and related data
            // First, delete project memberships
            var projectMembers = await _context.ProjectMembers
                .Where(pm => pm.UserId == user.Id)
                .ToListAsync();
            _context.ProjectMembers.RemoveRange(projectMembers);

            // Delete project invitations
            var invitations = await _context.ProjectInvitations
                .Where(pi => pi.Email.ToLower() == emailLower)
                .ToListAsync();
            _context.ProjectInvitations.RemoveRange(invitations);

            // Delete user
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"User {request.Email} deleted successfully");

            return Ok(new
            {
                success = true,
                message = $"User {request.Email} has been deleted. They can now sign up again."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user: {Email}", request.Email);
            return StatusCode(500, new { message = "Error deleting user", error = ex.Message });
        }
    }

    [HttpPost("resend-temp-password")]
    public async Task<IActionResult> ResendTemporaryPassword([FromBody] ResendPasswordRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        try
        {
            var emailLower = request.Email.ToLower();
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!user.IsActive)
            {
                return BadRequest(new { message = "User account is inactive" });
            }

            // Generate new temporary password
            var tempPassword = GenerateTemporaryPassword();
            
            // Update user's password
            user.PasswordHash = tempPassword;
            user.RequiresPasswordChange = true;
            await _context.SaveChangesAsync();

            // Send email with temporary password (fire and forget)
            _ = System.Threading.Tasks.Task.Run(async () =>
            {
                try
                {
                    _logger.LogInformation($"Resending temporary password email to {request.Email}");
                    var emailSent = await _emailService.SendTemporaryPasswordEmailAsync(user.Email, user.Name, tempPassword);
                    if (emailSent)
                    {
                        _logger.LogInformation($"✓ Temporary password email resent successfully to {request.Email}");
                    }
                    else
                    {
                        _logger.LogWarning($"✗ Temporary password email was not sent to {request.Email} - email service returned false");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"✗ FAILED to resend temporary password email to {request.Email}. Error: {ex.Message}");
                }
            });

            return Ok(new
            {
                success = true,
                message = "Temporary password has been regenerated and sent to your email."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending temporary password: {Email}", request.Email);
            return StatusCode(500, new { message = "Error resending password", error = ex.Message });
        }
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

        // Get user's projects
        var userProjects = await _context.Projects
            .Where(p => p.OwnerId == user.Id || 
                       p.Members.Any(m => m.UserId == user.Id))
            .Where(p => p.Status != "archived")
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                key = p.Key,
                description = p.Description,
                role = p.OwnerId == user.Id ? "owner" : 
                       p.Members.FirstOrDefault(m => m.UserId == user.Id).Role
            })
            .ToListAsync();

        // Check for pending invitations
        var pendingInvitations = await _context.ProjectInvitations
            .Include(i => i.Project)
            .Where(i => i.Email.ToLower() == user.Email.ToLower() && 
                       i.Status == "pending" && 
                       (i.ExpiresAt == null || i.ExpiresAt > DateTime.UtcNow))
            .Select(i => new
            {
                id = i.Id,
                project = new
                {
                    id = i.Project.Id,
                    name = i.Project.Name,
                    key = i.Project.Key
                },
                token = i.Token
            })
            .ToListAsync();

        // Auto-accept pending invitations
        foreach (var invitation in pendingInvitations)
        {
            var member = new ProjectMember
            {
                ProjectId = invitation.project.id,
                UserId = user.Id,
                Role = "member",
                JoinedAt = DateTime.UtcNow
            };
            _context.ProjectMembers.Add(member);

            var inv = await _context.ProjectInvitations.FindAsync(invitation.id);
            if (inv != null)
            {
                inv.Status = "accepted";
                inv.AcceptedAt = DateTime.UtcNow;
            }
        }
        await _context.SaveChangesAsync();

        // Refresh projects list after accepting invitations
        userProjects = await _context.Projects
            .Where(p => p.OwnerId == user.Id || 
                       p.Members.Any(m => m.UserId == user.Id))
            .Where(p => p.Status != "archived")
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                key = p.Key,
                description = p.Description,
                role = p.OwnerId == user.Id ? "owner" : 
                       p.Members.FirstOrDefault(m => m.UserId == user.Id).Role
            })
            .ToListAsync();

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
            projects = userProjects,
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

public class CheckUserRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResendPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class DeleteUserRequest
{
    public string Email { get; set; } = string.Empty;
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
