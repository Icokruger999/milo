using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Milo.API.Models;
using Milo.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Milo.API.Services;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string to, string subject, string htmlBody);
    Task<bool> SendEmailWithPlainTextAsync(string to, string subject, string htmlBody, string plainTextBody);
    Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword);
    Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken);
    Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null);
    Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey);
    Task<bool> SendIncidentAssignmentEmailAsync(string email, string assigneeName, string incidentNumber, string subject, string priority, string status, string? incidentLink = null, string? description = null, string? requesterName = null, string? requesterEmail = null, DateTime? createdAt = null, string? category = null, string? source = null);
    Task<bool> SendNewUserNotificationEmailAsync(string userEmail, string userName, DateTime signupDate);
    Task<bool> SendDailyUsersReportEmailAsync(string recipientEmail, List<UserReportData> users);
    Task<int> SendDailyIncidentReportsToAllRecipientsAsync(int? projectId = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;
    private readonly bool _emailEnabled;
    private readonly IServiceProvider _serviceProvider;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IHttpClientFactory httpClientFactory, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _serviceProvider = serviceProvider;
        
        _emailEnabled = bool.TryParse(_configuration["Email:Enabled"], out var enabled) && enabled;
        
        if (_emailEnabled)
            _logger.LogInformation("EmailService initialized with Resend (ENABLED)");
        else
            _logger.LogWarning("EmailService is DISABLED - no emails will be sent");
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string htmlBody)
    {
        if (!_emailEnabled)
        {
            _logger.LogInformation("Email sending skipped (disabled): {Subject} to {To}", subject, to);
            return false;
        }

        try
        {
            var apiKey = _configuration["Email:ResendApiKey"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo";

            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("Resend API key not configured");
                return false;
            }

            var payload = new { from = $"{fromName} <{fromEmail}>", to = new[] { to }, subject = subject, html = htmlBody };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _httpClient.SendAsync(request);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent successfully via Resend to {To}", to);
                return true;
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Resend API error: {StatusCode} - {Error}", response.StatusCode, error);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via Resend to {To}", to);
            return false;
        }
    }

    public async Task<bool> SendEmailWithPlainTextAsync(string to, string subject, string htmlBody, string plainTextBody)
    {
        if (!_emailEnabled) return false;
        try
        {
            var apiKey = _configuration["Email:ResendApiKey"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo";
            if (string.IsNullOrEmpty(apiKey)) return false;

            var payload = new { from = $"{fromName} <{fromEmail}>", to = new[] { to }, subject = subject, html = htmlBody, text = plainTextBody };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch { return false; }
    }
    public async Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword)
    {
        var subject = "Your Temporary Password - Milo";
        var htmlBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: Arial, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; margin: 0; padding: 20px;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px;"">
        <tr>
            <td style=""background-color: #0052CC; color: #FFFFFF; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;"">
                <h1 style=""margin: 0; font-size: 24px;"">Your Temporary Password</h1>
            </td>
        </tr>
        <tr>
            <td style=""padding: 32px 24px;"">
                <p style=""margin: 0 0 16px 0;"">Hello {name},</p>
                <p style=""margin: 0 0 16px 0;"">Your temporary password has been generated:</p>
                <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin: 24px 0;"">
                    <tr>
                        <td style=""background-color: #F4F5F7; border: 2px dashed #0052CC; border-radius: 6px; padding: 20px; text-align: center;"">
                            <span style=""font-size: 28px; font-weight: 700; color: #0052CC; letter-spacing: 3px; font-family: monospace;"">{temporaryPassword}</span>
                        </td>
                    </tr>
                </table>
                <p style=""margin: 0 0 24px 0; color: #DE350B;""><strong>IMPORTANT:</strong> Please change this password after your first login.</p>
                <table cellpadding=""0"" cellspacing=""0"" style=""margin: 0 auto;"">
                    <tr>
                        <td style=""background-color: #0052CC; border-radius: 6px;"">
                            <a href=""https://www.codingeverest.com/milo-login.html"" style=""display: inline-block; padding: 12px 24px; color: #FFFFFF; text-decoration: none; font-weight: 600;"">Log In Now</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style=""background-color: #F4F5F7; padding: 16px 24px; text-align: center; border-radius: 0 0 8px 8px;"">
                <p style=""margin: 0; font-size: 12px; color: #6B778C;"">This is an automated message from Milo</p>
            </td>
        </tr>
    </table>
</body>
</html>";
        return await SendEmailAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken)
    {
        var subject = $"Project Invitation: {projectName}";
        var inviteLink = $"https://www.codingeverest.com/milo-accept-invitation.html?token={invitationToken}";
        var htmlBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: Arial, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; margin: 0; padding: 20px;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px;"">
        <tr>
            <td style=""background-color: #0052CC; color: #FFFFFF; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;"">
                <h1 style=""margin: 0; font-size: 24px;"">Project Invitation</h1>
            </td>
        </tr>
        <tr>
            <td style=""padding: 32px 24px;"">
                <p style=""margin: 0 0 16px 0;"">Hello {name},</p>
                <p style=""margin: 0 0 24px 0;"">You've been invited to join the project: <strong>{projectName}</strong></p>
                <table cellpadding=""0"" cellspacing=""0"" style=""margin: 0 auto;"">
                    <tr>
                        <td style=""background-color: #36B37E; border-radius: 6px;"">
                            <a href=""{inviteLink}"" style=""display: inline-block; padding: 12px 24px; color: #FFFFFF; text-decoration: none; font-weight: 600;"">Accept Invitation</a>
                        </td>
                    </tr>
                </table>
                <p style=""margin: 24px 0 0 0; font-size: 12px; color: #6B778C;"">Or copy this link: <a href=""{inviteLink}"" style=""color: #0052CC;"">{inviteLink}</a></p>
            </td>
        </tr>
        <tr>
            <td style=""background-color: #F4F5F7; padding: 16px 24px; text-align: center; border-radius: 0 0 8px 8px;"">
                <p style=""margin: 0; font-size: 12px; color: #6B778C;"">This is an automated message from Milo</p>
            </td>
        </tr>
    </table>
</body>
</html>";
        return await SendEmailAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null)
    {
        var subject = $"New Task Assigned: {taskId}";
        var link = taskLink ?? "https://www.codingeverest.com/milo-board.html";
        var htmlBody = $"<html><body style='font-family:Arial;'><h1>New Task Assigned</h1><p>Hello {assigneeName},</p><p>Task: <strong>{taskTitle}</strong></p><p>ID: {taskId} | Project: {projectName}</p><a href='{link}'>View Task</a></body></html>";
        return await SendEmailAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey)
    {
        var subject = $"Team Assignment: {teamName}";
        var htmlBody = $"<html><body style='font-family:Arial;'><h1>Team Assignment</h1><p>Hello {memberName},</p><p>You've been assigned to team: <strong>{teamName}</strong></p><p>Project: {projectName} ({projectKey})</p><a href='https://www.codingeverest.com/milo-teams.html'>View Team</a></body></html>";
        return await SendEmailAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendIncidentAssignmentEmailAsync(string email, string assigneeName, string incidentNumber, string subject, string priority, string status, string? incidentLink = null, string? description = null, string? requesterName = null, string? requesterEmail = null, DateTime? createdAt = null, string? category = null, string? source = null)
    {
        var emailSubject = $"Incident Assigned: {incidentNumber}";
        var link = incidentLink ?? "https://www.codingeverest.com/milo-incidents.html";
        var htmlBody = $"<html><body style='font-family:Arial;'><h1>Incident Assigned</h1><p>Hello {assigneeName},</p><p>Subject: <strong>{subject}</strong></p><p>Incident: {incidentNumber} | Priority: {priority} | Status: {status}</p>{(string.IsNullOrEmpty(description) ? "" : $"<p>{description}</p>")}<a href='{link}'>View Incident</a></body></html>";
        return await SendEmailAsync(email, emailSubject, htmlBody);
    }

    public async Task<bool> SendNewUserNotificationEmailAsync(string userEmail, string userName, DateTime signupDate)
    {
        var subject = "Welcome to Milo!";
        var htmlBody = $"<html><body style='font-family:Arial;'><h1>Welcome to Milo!</h1><p>Hello {userName},</p><p>Your account has been created. Start managing your projects now!</p><a href='https://www.codingeverest.com/milo-login.html'>Get Started</a></body></html>";
        return await SendEmailAsync(userEmail, subject, htmlBody);
    }

    public async Task<bool> SendDailyUsersReportEmailAsync(string recipientEmail, List<UserReportData> users)
    {
        var subject = $"Daily Users Report - {DateTime.UtcNow:MMM dd, yyyy}";
        var userRows = string.Join("", users.Select(u => $"<tr><td>{u.Name}</td><td>{u.Email}</td><td>{u.SignupDate:MMM dd, yyyy}</td></tr>"));
        var htmlBody = $"<html><body style='font-family:Arial;'><h1>Daily Users Report</h1><p>Total: {users.Count}</p><table border='1'><tr><th>Name</th><th>Email</th><th>Signup</th></tr>{userRows}</table></body></html>";
        return await SendEmailAsync(recipientEmail, subject, htmlBody);
    }

    public async Task<int> SendDailyIncidentReportsToAllRecipientsAsync(int? projectId = null)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
        var recipientsQuery = dbContext.ReportRecipients.Where(r => r.IsActive && r.ReportType == "DailyIncidents");
        if (projectId.HasValue) recipientsQuery = recipientsQuery.Where(r => r.ProjectId == projectId.Value);
        var recipients = await recipientsQuery.ToListAsync();
        if (!recipients.Any()) return 0;

        var today = DateTime.UtcNow.Date;
        var incidentsQuery = dbContext.Incidents.Include(i => i.Requester).Include(i => i.Assignee).Where(i => i.CreatedAt >= today && i.CreatedAt < today.AddDays(1));
        if (projectId.HasValue) incidentsQuery = incidentsQuery.Where(i => i.ProjectId == projectId.Value);
        var incidents = await incidentsQuery.OrderByDescending(i => i.CreatedAt).ToListAsync();

        var reportData = new DailyReportData
        {
            Date = today, TotalCount = incidents.Count,
            NewCount = incidents.Count(i => i.Status == "New"),
            OpenCount = incidents.Count(i => i.Status == "Open"),
            ResolvedCount = incidents.Count(i => i.Status == "Resolved"),
            HighPriorityCount = incidents.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
            Incidents = incidents.Select(i => new IncidentSummary { IncidentNumber = i.IncidentNumber, Subject = i.Subject, Status = i.Status, Priority = i.Priority, RequesterName = i.Requester?.Name ?? "Unknown", AssigneeName = i.Assignee?.Name ?? "Unassigned", CreatedAt = i.CreatedAt, ResolvedAt = i.ResolvedAt }).ToList()
        };

        int successCount = 0;
        foreach (var r in recipients)
        {
            var subject = $"Daily Incident Report - {reportData.Date:MMM dd, yyyy}";
            var rows = string.Join("", reportData.Incidents.Select(i => $"<tr><td>{i.IncidentNumber}</td><td>{i.Subject}</td><td>{i.Status}</td><td>{i.Priority}</td></tr>"));
            var html = $"<html><body><h1>Daily Incident Report</h1><p>Total: {reportData.TotalCount} | New: {reportData.NewCount} | Resolved: {reportData.ResolvedCount}</p><table border='1'><tr><th>ID</th><th>Subject</th><th>Status</th><th>Priority</th></tr>{rows}</table></body></html>";
            if (await SendEmailAsync(r.Email, subject, html)) successCount++;
        }
        return successCount;
    }
}

public class UserReportData
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime SignupDate => CreatedAt;
}

public class DailyReportData
{
    public DateTime Date { get; set; }
    public int TotalCount { get; set; }
    public int NewCount { get; set; }
    public int OpenCount { get; set; }
    public int ResolvedCount { get; set; }
    public int HighPriorityCount { get; set; }
    public List<IncidentSummary> Incidents { get; set; } = new();
}

public class IncidentSummary
{
    public string IncidentNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string AssigneeName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public TimeSpan? ResolutionTime { get; set; }
}
