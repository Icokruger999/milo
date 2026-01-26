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
public class InvitationsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(MiloDbContext context, IEmailService emailService, ILogger<InvitationsController> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || !request.ProjectId.HasValue || !request.InvitedById.HasValue)
        {
            return BadRequest(new { message = "Email, ProjectId, and InvitedById are required" });
        }

        // Validate email format
        if (!request.Email.Contains("@") || !request.Email.Contains("."))
        {
            return BadRequest(new { message = "Invalid email format" });
        }

        // Check if project exists
        var project = await _context.Projects
            .Include(p => p.Owner)
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId.Value);
        
        if (project == null)
        {
            return NotFound(new { message = "Project not found" });
        }

        // Check if user is already a member
        var existingMember = await _context.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == request.ProjectId.Value && 
                                      m.User.Email.ToLower() == request.Email.ToLower());
        
        if (existingMember != null)
        {
            return Conflict(new { message = "User is already a member of this project" });
        }

        // Check if invitation already exists and is pending
        var existingInvitation = await _context.ProjectInvitations
            .FirstOrDefaultAsync(i => i.ProjectId == request.ProjectId.Value && 
                                      i.Email.ToLower() == request.Email.ToLower() && 
                                      i.Status == "pending");
        
        if (existingInvitation != null)
        {
            return Conflict(new { message = "Invitation already sent to this email" });
        }

        // Generate unique token
        var token = GenerateInvitationToken();

        var invitation = new ProjectInvitation
        {
            ProjectId = request.ProjectId.Value,
            Email = request.Email,
            Name = request.Name,
            Status = "pending",
            Token = token,
            InvitedById = request.InvitedById.Value,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7) // Invitation expires in 7 days
        };

        _context.ProjectInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        // Send invitation email (fire and forget)
        _ = System.Threading.Tasks.Task.Run(async () =>
        {
            try
            {
                await _emailService.SendProjectInvitationEmailAsync(
                    request.Email,
                    request.Name ?? request.Email,
                    project.Name,
                    project.Key ?? project.Name,
                    token
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send invitation email to {request.Email}");
            }
        });

        return Ok(new
        {
            success = true,
            message = "Invitation sent successfully",
            invitationId = invitation.Id
        });
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingInvitations([FromQuery] string email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        var invitations = await _context.ProjectInvitations
            .Include(i => i.Project)
            .ThenInclude(p => p.Owner)
            .Include(i => i.InvitedBy)
            .Where(i => i.Email.ToLower() == email.ToLower() && 
                       i.Status == "pending" && 
                       (i.ExpiresAt == null || i.ExpiresAt > DateTime.UtcNow))
            .Select(i => new
            {
                id = i.Id,
                project = new
                {
                    id = i.Project.Id,
                    name = i.Project.Name,
                    key = i.Project.Key,
                    description = i.Project.Description
                },
                invitedBy = new
                {
                    id = i.InvitedBy.Id,
                    name = i.InvitedBy.Name,
                    email = i.InvitedBy.Email
                },
                createdAt = i.CreatedAt,
                expiresAt = i.ExpiresAt
            })
            .ToListAsync();

        return Ok(invitations);
    }

    [HttpGet("by-token")]
    public async Task<IActionResult> GetInvitationByToken([FromQuery] string token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return BadRequest(new { message = "Token is required" });
        }

        var invitation = await _context.ProjectInvitations
            .Include(i => i.Project)
            .ThenInclude(p => p.Owner)
            .Include(i => i.InvitedBy)
            .Where(i => i.Token == token && i.Status == "pending")
            .Select(i => new
            {
                id = i.Id,
                project = new
                {
                    id = i.Project.Id,
                    name = i.Project.Name,
                    key = i.Project.Key,
                    description = i.Project.Description
                },
                invitedBy = new
                {
                    id = i.InvitedBy.Id,
                    name = i.InvitedBy.Name,
                    email = i.InvitedBy.Email
                },
                email = i.Email,
                createdAt = i.CreatedAt,
                expiresAt = i.ExpiresAt
            })
            .FirstOrDefaultAsync();

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found or already used" });
        }

        if (invitation.expiresAt.HasValue && invitation.expiresAt.Value < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invitation has expired" });
        }

        return Ok(invitation);
    }

    [HttpPost("accept")]
    public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Token) || !request.UserId.HasValue)
        {
            return BadRequest(new { message = "Token and UserId are required" });
        }

        var invitation = await _context.ProjectInvitations
            .Include(i => i.Project)
            .FirstOrDefaultAsync(i => i.Token == request.Token && i.Status == "pending");

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found or already used" });
        }

        if (invitation.ExpiresAt.HasValue && invitation.ExpiresAt.Value < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invitation has expired" });
        }

        // Check if user exists
        var user = await _context.Users.FindAsync(request.UserId.Value);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        // Check if user email matches invitation email
        if (!user.Email.Equals(invitation.Email, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "User email does not match invitation email" });
        }

        // Update user's name if invitation has a name and it's different
        if (!string.IsNullOrEmpty(invitation.Name) && user.Name != invitation.Name)
        {
            _logger.LogInformation($"Updating user {user.Id} name from '{user.Name}' to '{invitation.Name}'");
            user.Name = invitation.Name;
        }

        // Check if user is already a member (prevent duplicates)
        var existingMember = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == invitation.ProjectId && pm.UserId == user.Id);
        
        if (existingMember == null)
        {
            // Add user as project member
            var member = new ProjectMember
            {
                ProjectId = invitation.ProjectId,
                UserId = user.Id,
                Role = "member",
                JoinedAt = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(member);
            _logger.LogInformation($"Added user {user.Id} ({user.Email}) as member to project {invitation.ProjectId}");
        }
        else
        {
            _logger.LogInformation($"User {user.Id} ({user.Email}) is already a member of project {invitation.ProjectId}");
        }

        // Mark invitation as accepted
        invitation.Status = "accepted";
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        _logger.LogInformation($"Invitation accepted: User {user.Id} joined project {invitation.ProjectId} ({invitation.Project.Name})");

        return Ok(new
        {
            success = true,
            message = "Invitation accepted successfully",
            project = new
            {
                id = invitation.Project.Id,
                name = invitation.Project.Name,
                key = invitation.Project.Key
            }
        });
    }

    [HttpPost("decline")]
    public async Task<IActionResult> DeclineInvitation([FromBody] DeclineInvitationRequest request)
    {
        if (request == null || !request.InvitationId.HasValue)
        {
            return BadRequest(new { message = "InvitationId is required" });
        }

        var invitation = await _context.ProjectInvitations.FindAsync(request.InvitationId.Value);
        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        invitation.Status = "declined";
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Invitation declined" });
    }

    [HttpPost("{id}/resend")]
    public async Task<IActionResult> ResendInvitation(int id)
    {
        var invitation = await _context.ProjectInvitations
            .Include(i => i.Project)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        if (invitation.Status != "pending")
        {
            return BadRequest(new { message = "Can only resend pending invitations" });
        }

        // Extend expiration
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        // Resend email
        try
        {
            var emailSent = await _emailService.SendProjectInvitationEmailAsync(
                invitation.Email,
                invitation.Name ?? invitation.Email,
                invitation.Project.Name,
                invitation.Project.Key ?? invitation.Project.Name,
                invitation.Token
            );

            if (emailSent)
            {
                _logger.LogInformation($"Resent invitation email to {invitation.Email}");
                return Ok(new { success = true, message = "Invitation resent successfully" });
            }
            else
            {
                _logger.LogWarning($"Failed to resend invitation email to {invitation.Email}");
                return Ok(new { success = true, message = "Invitation updated but email may not have been sent" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error resending invitation to {invitation.Email}");
            return Ok(new { success = true, message = "Invitation updated but email failed to send" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetInvitations([FromQuery] int? projectId, [FromQuery] string? email)
    {
        var query = _context.ProjectInvitations
            .Include(i => i.Project)
            .Include(i => i.InvitedBy)
            .AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(i => i.ProjectId == projectId.Value);
        }

        if (!string.IsNullOrEmpty(email))
        {
            query = query.Where(i => i.Email.ToLower() == email.ToLower());
        }

        var invitations = await query
            .Select(i => new
            {
                id = i.Id,
                email = i.Email,
                name = i.Name,
                status = i.Status,
                token = i.Token,
                projectId = i.ProjectId,
                project = new { id = i.Project.Id, name = i.Project.Name },
                invitedBy = i.InvitedBy != null ? new { id = i.InvitedBy.Id, name = i.InvitedBy.Name } : null,
                createdAt = i.CreatedAt,
                expiresAt = i.ExpiresAt
            })
            .ToListAsync();

        return Ok(invitations);
    }

    private string GenerateInvitationToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "").Substring(0, 32);
    }
}

public class InviteUserRequest
{
    public int? ProjectId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public int? InvitedById { get; set; }
}

public class AcceptInvitationRequest
{
    public string Token { get; set; } = string.Empty;
    public int? UserId { get; set; }
}

public class DeclineInvitationRequest
{
    public int? InvitationId { get; set; }
}

