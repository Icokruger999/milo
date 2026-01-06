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
    private readonly EmailService _emailService;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(MiloDbContext context, EmailService emailService, ILogger<InvitationsController> logger)
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

        // Add user as project member
        var member = new ProjectMember
        {
            ProjectId = invitation.ProjectId,
            UserId = user.Id,
            Role = "member",
            JoinedAt = DateTime.UtcNow
        };

        _context.ProjectMembers.Add(member);

        // Mark invitation as accepted
        invitation.Status = "accepted";
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

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

