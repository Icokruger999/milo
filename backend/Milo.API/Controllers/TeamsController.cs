using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;
using Milo.API.Services;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly MiloDbContext _context;
    private readonly ILogger<TeamsController> _logger;
    private readonly IEmailService _emailService;

    public TeamsController(MiloDbContext context, ILogger<TeamsController> logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    // GET: api/teams
    [HttpGet]
    public async Task<IActionResult> GetTeams([FromQuery] int? projectId)
    {
        try
        {
            var query = _context.Teams
                .AsNoTracking() // Performance: Read-only query
                .Include(t => t.Project)
                .Include(t => t.CreatedBy)
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .Where(t => !t.IsDeleted);

            if (projectId.HasValue)
            {
                query = query.Where(t => t.ProjectId == projectId.Value);
            }

            var teams = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(teams.Select(t => new
            {
                id = t.Id,
                name = t.Name,
                description = t.Description,
                avatar = t.Avatar,
                projectId = t.ProjectId,
                project = t.Project != null ? new
                {
                    id = t.Project.Id,
                    name = t.Project.Name,
                    key = t.Project.Key
                } : null,
                createdBy = new
                {
                    id = t.CreatedBy.Id,
                    name = t.CreatedBy.Name,
                    email = t.CreatedBy.Email
                },
                memberCount = t.Members.Count(m => m.IsActive),
                members = t.Members.Where(m => m.IsActive).Select(m => new
                {
                    id = m.Id,
                    userId = m.UserId,
                    name = m.User.Name,
                    email = m.User.Email,
                    title = m.Title,
                    role = m.Role,
                    joinedAt = m.JoinedAt
                }).ToList(),
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving teams");
            return StatusCode(500, new { message = "Internal server error when retrieving teams." });
        }
    }

    // GET: api/teams/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeam(int id)
    {
        try
        {
            var team = await _context.Teams
                .Include(t => t.Project)
                .Include(t => t.CreatedBy)
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (team == null)
            {
                return NotFound(new { message = "Team not found" });
            }

            return Ok(new
            {
                id = team.Id,
                name = team.Name,
                description = team.Description,
                avatar = team.Avatar,
                projectId = team.ProjectId,
                project = team.Project != null ? new
                {
                    id = team.Project.Id,
                    name = team.Project.Name,
                    key = team.Project.Key
                } : null,
                createdBy = new
                {
                    id = team.CreatedBy.Id,
                    name = team.CreatedBy.Name,
                    email = team.CreatedBy.Email
                },
                members = team.Members.Where(m => m.IsActive).Select(m => new
                {
                    id = m.Id,
                    userId = m.UserId,
                    name = m.User.Name,
                    email = m.User.Email,
                    title = m.Title,
                    role = m.Role,
                    joinedAt = m.JoinedAt
                }).ToList(),
                createdAt = team.CreatedAt,
                updatedAt = team.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving team {TeamId}", id);
            return StatusCode(500, new { message = "Internal server error when retrieving team." });
        }
    }

    // POST: api/teams
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Team name is required" });
            }

            var team = new Team
            {
                Name = request.Name,
                Description = request.Description,
                Avatar = request.Avatar,
                ProjectId = request.ProjectId,
                CreatedById = request.CreatedById,
                CreatedAt = DateTime.UtcNow
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync();

            // Add team members
            if (request.Members != null && request.Members.Any())
            {
                foreach (var member in request.Members)
                {
                    var teamMember = new TeamMember
                    {
                        TeamId = team.Id,
                        UserId = member.UserId,
                        Title = member.Title,
                        Role = member.Role ?? "member",
                        JoinedAt = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.TeamMembers.Add(teamMember);
                }
                await _context.SaveChangesAsync();
            }

            // Reload team with members
            team = await _context.Teams
                .Include(t => t.Project)
                .Include(t => t.CreatedBy)
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(t => t.Id == team.Id);

            // Send email notifications if team is assigned to a project
            if (team.Project != null && team.Members.Any())
            {
                _logger.LogInformation($"Sending project assignment emails for team {team.Name} to {team.Members.Count} members");
                
                var emailTasks = team.Members
                    .Where(m => m.IsActive && m.User != null)
                    .Select(m => _emailService.SendTeamProjectAssignmentEmailAsync(
                        m.User.Email,
                        m.User.Name ?? m.User.Email,
                        team.Name,
                        team.Project.Name,
                        team.Project.Key ?? team.Project.Name
                    ))
                    .ToList();

                // Send emails in background (don't wait for them)
                _ = System.Threading.Tasks.Task.Run(async () =>
                {
                    try
                    {
                        await System.Threading.Tasks.Task.WhenAll(emailTasks);
                        _logger.LogInformation($"✓ All project assignment emails sent for team {team.Name}");
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, $"✗ Failed to send some project assignment emails for team {team.Name}");
                    }
                });
            }

            return CreatedAtAction(nameof(GetTeam), new { id = team.Id }, new
            {
                id = team.Id,
                name = team.Name,
                description = team.Description,
                avatar = team.Avatar,
                projectId = team.ProjectId,
                members = team.Members.Select(m => new
                {
                    id = m.Id,
                    userId = m.UserId,
                    name = m.User.Name,
                    email = m.User.Email,
                    title = m.Title,
                    role = m.Role
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating team");
            return StatusCode(500, new { message = "Internal server error when creating team." });
        }
    }

    // PUT: api/teams/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeam(int id, [FromBody] UpdateTeamRequest request)
    {
        try
        {
            var team = await _context.Teams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (team == null)
            {
                return NotFound(new { message = "Team not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                team.Name = request.Name;
            }

            if (request.Description != null)
            {
                team.Description = request.Description;
            }

            if (request.Avatar != null)
            {
                team.Avatar = request.Avatar;
            }

            bool projectAssignmentChanged = false;
            int? newProjectId = null;

            if (request.ProjectId.HasValue)
            {
                newProjectId = request.ProjectId.Value == 0 ? null : request.ProjectId.Value;
                if (team.ProjectId != newProjectId)
                {
                    projectAssignmentChanged = true;
                    team.ProjectId = newProjectId;
                }
            }

            team.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Send email notifications if project assignment changed and there's a new project
            if (projectAssignmentChanged && newProjectId.HasValue)
            {
                // Reload team with project and members for email
                var teamWithDetails = await _context.Teams
                    .Include(t => t.Project)
                    .Include(t => t.Members)
                        .ThenInclude(m => m.User)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (teamWithDetails?.Project != null && teamWithDetails.Members.Any())
                {
                    _logger.LogInformation($"Sending project assignment emails for team {teamWithDetails.Name} to {teamWithDetails.Members.Count} members");
                    
                    var emailTasks = teamWithDetails.Members
                        .Where(m => m.IsActive && m.User != null)
                        .Select(m => _emailService.SendTeamProjectAssignmentEmailAsync(
                            m.User.Email,
                            m.User.Name ?? m.User.Email,
                            teamWithDetails.Name,
                            teamWithDetails.Project.Name,
                            teamWithDetails.Project.Key ?? teamWithDetails.Project.Name
                        ))
                        .ToList();

                    // Send emails in background
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        try
                        {
                            await System.Threading.Tasks.Task.WhenAll(emailTasks);
                            _logger.LogInformation($"✓ All project assignment emails sent for team {teamWithDetails.Name}");
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError(emailEx, $"✗ Failed to send some project assignment emails for team {teamWithDetails.Name}");
                        }
                    });
                }
            }

            return Ok(new { message = "Team updated successfully", id = team.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating team {TeamId}", id);
            return StatusCode(500, new { message = "Internal server error when updating team." });
        }
    }

    // DELETE: api/teams/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTeam(int id)
    {
        try
        {
            var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (team == null)
            {
                return NotFound(new { message = "Team not found" });
            }

            team.IsDeleted = true;
            team.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Team deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting team {TeamId}", id);
            return StatusCode(500, new { message = "Internal server error when deleting team." });
        }
    }

    // POST: api/teams/{id}/members
    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddTeamMember(int id, [FromBody] AddTeamMemberRequest request)
    {
        try
        {
            var team = await _context.Teams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (team == null)
            {
                return NotFound(new { message = "Team not found" });
            }

            // Check if user already exists in team
            var existingMember = team.Members.FirstOrDefault(m => m.UserId == request.UserId);
            if (existingMember != null)
            {
                if (existingMember.IsActive)
                {
                    return BadRequest(new { message = "User is already a member of this team" });
                }
                else
                {
                    // Reactivate the member
                    existingMember.IsActive = true;
                    existingMember.Title = request.Title;
                    existingMember.Role = request.Role ?? "member";
                }
            }
            else
            {
                var teamMember = new TeamMember
                {
                    TeamId = id,
                    UserId = request.UserId,
                    Title = request.Title,
                    Role = request.Role ?? "member",
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _context.TeamMembers.Add(teamMember);
            }

            await _context.SaveChangesAsync();

            // Send email notification if team has a project assigned
            var teamWithDetails = await _context.Teams
                .Include(t => t.Project)
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (teamWithDetails?.Project != null)
            {
                var addedMember = teamWithDetails.Members.FirstOrDefault(m => m.UserId == request.UserId && m.IsActive);
                if (addedMember?.User != null)
                {
                    _logger.LogInformation($"Sending project assignment email to {addedMember.User.Email} for team {teamWithDetails.Name}");
                    
                    // Send email in background
                    _ = System.Threading.Tasks.Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendTeamProjectAssignmentEmailAsync(
                                addedMember.User.Email,
                                addedMember.User.Name ?? addedMember.User.Email,
                                teamWithDetails.Name,
                                teamWithDetails.Project.Name,
                                teamWithDetails.Project.Key ?? teamWithDetails.Project.Name
                            );
                            _logger.LogInformation($"✓ Project assignment email sent to {addedMember.User.Email}");
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError(emailEx, $"✗ Failed to send project assignment email to {addedMember.User.Email}");
                        }
                    });
                }
            }

            return Ok(new { message = "Team member added successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding member to team {TeamId}", id);
            return StatusCode(500, new { message = "Internal server error when adding team member." });
        }
    }

    // PUT: api/teams/{teamId}/members/{memberId}
    [HttpPut("{teamId}/members/{memberId}")]
    public async Task<IActionResult> UpdateTeamMember(int teamId, int memberId, [FromBody] UpdateTeamMemberRequest request)
    {
        try
        {
            var member = await _context.TeamMembers
                .FirstOrDefaultAsync(m => m.Id == memberId && m.TeamId == teamId);

            if (member == null)
            {
                return NotFound(new { message = "Team member not found" });
            }

            if (request.Title != null)
            {
                member.Title = request.Title;
            }

            if (request.Role != null)
            {
                member.Role = request.Role;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Team member updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating team member {MemberId}", memberId);
            return StatusCode(500, new { message = "Internal server error when updating team member." });
        }
    }

    // DELETE: api/teams/{teamId}/members/{memberId}
    [HttpDelete("{teamId}/members/{memberId}")]
    public async Task<IActionResult> RemoveTeamMember(int teamId, int memberId)
    {
        try
        {
            var member = await _context.TeamMembers
                .FirstOrDefaultAsync(m => m.Id == memberId && m.TeamId == teamId);

            if (member == null)
            {
                return NotFound(new { message = "Team member not found" });
            }

            member.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Team member removed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing team member {MemberId}", memberId);
            return StatusCode(500, new { message = "Internal server error when removing team member." });
        }
    }
}

// Request DTOs
public class CreateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Avatar { get; set; }
    public int? ProjectId { get; set; }
    public int CreatedById { get; set; }
    public List<TeamMemberRequest>? Members { get; set; }
}

public class UpdateTeamRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Avatar { get; set; }
    public int? ProjectId { get; set; }
}

public class TeamMemberRequest
{
    public int UserId { get; set; }
    public string? Title { get; set; }
    public string? Role { get; set; }
}

public class AddTeamMemberRequest
{
    public int UserId { get; set; }
    public string? Title { get; set; }
    public string? Role { get; set; }
}

public class UpdateTeamMemberRequest
{
    public string? Title { get; set; }
    public string? Role { get; set; }
}

