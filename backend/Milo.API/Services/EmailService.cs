using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Net;
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
        if (_emailEnabled) _logger.LogInformation("EmailService initialized with Resend (ENABLED)");
        else _logger.LogWarning("EmailService is DISABLED");
    }

    private string BuildEmailHtml(string headerTitle, string headerColor, string bodyContent, string? buttonText = null, string? buttonUrl = null, string? buttonColor = null)
    {
        var buttonHtml = "";
        if (!string.IsNullOrEmpty(buttonText) && !string.IsNullOrEmpty(buttonUrl))
        {
            var btnColor = buttonColor ?? "#0052CC";
            buttonHtml = $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 32px 0;""><tr><td align=""center""><a href=""{buttonUrl}"" style=""display: inline-block; background-color: {btnColor}; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px;"">{WebUtility.HtmlEncode(buttonText)}</a></td></tr></table>";
        }
        return $@"<!DOCTYPE html><html><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""></head><body style=""margin: 0; padding: 0; background-color: #F4F5F7; font-family: Arial, sans-serif;""><table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7;""><tr><td align=""center"" style=""padding: 40px 20px;""><table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #FFFFFF; max-width: 600px; width: 100%; border-radius: 8px; overflow: hidden;""><tr><td style=""background-color: {headerColor}; padding: 40px 30px; text-align: center;""><h1 style=""margin: 0; font-size: 24px; font-weight: 600; color: #FFFFFF;"">{WebUtility.HtmlEncode(headerTitle)}</h1></td></tr><tr><td style=""padding: 40px 30px;"">{bodyContent}{buttonHtml}</td></tr><tr><td style=""padding: 20px 30px; background-color: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center;""><p style=""margin: 0; font-size: 12px; color: #6B778C;"">This email was sent from <strong style=""color: #42526E;"">Milo</strong> - Your Project Management Workspace</p></td></tr></table></td></tr></table></body></html>";
    }

    private string InfoBox(string content) => $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7; border-radius: 4px; margin: 20px 0;""><tr><td style=""padding: 20px;"">{content}</td></tr></table>";
    private string InfoRow(string label, string value) => $@"<p style=""margin: 0 0 12px 0; font-size: 14px; color: #6B778C;""><strong style=""color: #42526E;"">{WebUtility.HtmlEncode(label)}:</strong> {WebUtility.HtmlEncode(value)}</p>";
    private string Paragraph(string text) => $@"<p style=""margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #172B4D;"">{text}</p>";
    private string LinkBox(string url) => $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color: #F4F5F7; border-radius: 4px; margin-top: 20px;""><tr><td style=""padding: 20px; text-align: center;""><p style=""margin: 0 0 12px 0; font-size: 13px; color: #6B778C;"">Or copy this link:</p><p style=""margin: 0; font-size: 13px; word-break: break-all;""><a href=""{url}"" style=""color: #0052CC;"">{WebUtility.HtmlEncode(url)}</a></p></td></tr></table>";

    public async Task<bool> SendEmailAsync(string to, string subject, string htmlBody)
    {
        if (!_emailEnabled) { _logger.LogInformation("Email disabled: {Subject} to {To}", subject, to); return false; }
        try
        {
            var apiKey = _configuration["Email:ResendApiKey"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo";
            if (string.IsNullOrEmpty(apiKey)) { _logger.LogError("Resend API key not configured"); return false; }
            var payload = new { from = $"{fromName} <{fromEmail}>", to = new[] { to }, subject, html = htmlBody };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails") { Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json") };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode) { _logger.LogInformation("Email sent via Resend to {To}", to); return true; }
            _logger.LogError("Resend error: {Status} - {Error}", response.StatusCode, await response.Content.ReadAsStringAsync());
            return false;
        }
        catch (Exception ex) { _logger.LogError(ex, "Error sending email to {To}", to); return false; }
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
            var payload = new { from = $"{fromName} <{fromEmail}>", to = new[] { to }, subject, html = htmlBody, text = plainTextBody };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails") { Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json") };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            return (await _httpClient.SendAsync(request)).IsSuccessStatusCode;
        }
        catch { return false; }
    }

    public async Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword)
    {
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(name)}</strong>,") +
            Paragraph("Your temporary password has been generated:") +
            $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 20px 0;""><tr><td style=""background-color: #F4F5F7; border: 2px dashed #0052CC; border-radius: 6px; padding: 24px; text-align: center;""><span style=""font-size: 32px; font-weight: 700; color: #0052CC; letter-spacing: 4px; font-family: monospace;"">{WebUtility.HtmlEncode(temporaryPassword)}</span></td></tr></table>" +
            $@"<p style=""margin: 20px 0; font-size: 14px; color: #DE350B;""><strong>IMPORTANT:</strong> Please change this password after your first login.</p>";
        var html = BuildEmailHtml("Your Temporary Password", "#0052CC", body, "LOG IN NOW", "https://www.codingeverest.com/milo-login.html", "#0052CC");
        return await SendEmailAsync(email, "Your Temporary Password - Milo", html);
    }

    public async Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken)
    {
        var inviteLink = $"https://www.codingeverest.com/milo-accept-invitation.html?token={invitationToken}";
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(name)}</strong>,") +
            Paragraph($"You've been invited to join the project <strong>{WebUtility.HtmlEncode(projectName)}</strong>.") +
            InfoBox(InfoRow("Project", projectName) + InfoRow("Project Key", projectKey)) + LinkBox(inviteLink);
        var html = BuildEmailHtml("Project Invitation", "#0052CC", body, "ACCEPT INVITATION", inviteLink, "#36B37E");
        return await SendEmailAsync(email, $"Project Invitation: {projectName}", html);
    }

    public async Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null)
    {
        var link = taskLink ?? "https://www.codingeverest.com/milo-board.html";
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(assigneeName)}</strong>,") +
            Paragraph("A new task has been assigned to you:") +
            InfoBox(InfoRow("Task", taskTitle) + InfoRow("Task ID", taskId) + InfoRow("Project", projectName));
        var html = BuildEmailHtml("New Task Assigned", "#0052CC", body, "VIEW TASK", link, "#0052CC");
        return await SendEmailAsync(email, $"New Task Assigned: {taskId}", html);
    }

    public async Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey)
    {
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(memberName)}</strong>,") +
            Paragraph("You have been assigned to a team:") +
            InfoBox(InfoRow("Team", teamName) + InfoRow("Project", $"{projectName} ({projectKey})"));
        var html = BuildEmailHtml("Team Assignment", "#36B37E", body, "VIEW TEAM", "https://www.codingeverest.com/milo-teams.html", "#36B37E");
        return await SendEmailAsync(email, $"Team Assignment: {teamName}", html);
    }

    public async Task<bool> SendIncidentAssignmentEmailAsync(string email, string assigneeName, string incidentNumber, string subject, string priority, string status, string? incidentLink = null, string? description = null, string? requesterName = null, string? requesterEmail = null, DateTime? createdAt = null, string? category = null, string? source = null)
    {
        var link = incidentLink ?? "https://www.codingeverest.com/milo-incidents.html";
        var infoContent = InfoRow("Incident", incidentNumber) + InfoRow("Subject", subject) +
            $@"<p style=""margin: 0 0 12px 0; font-size: 14px; color: #6B778C;""><strong style=""color: #42526E;"">Priority:</strong> <span style=""color: #DE350B; font-weight: 600;"">{WebUtility.HtmlEncode(priority)}</span></p>" +
            InfoRow("Status", status);
        if (!string.IsNullOrEmpty(requesterName)) infoContent += InfoRow("Requester", requesterName);
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(assigneeName)}</strong>,") +
            Paragraph("A new incident has been assigned to you:") + InfoBox(infoContent) +
            (string.IsNullOrEmpty(description) ? "" : $@"<div style=""margin: 20px 0; padding: 16px; background: #FFF; border-left: 4px solid #DE350B; border-radius: 4px;""><p style=""margin: 0; font-size: 14px; color: #172B4D;"">{WebUtility.HtmlEncode(description)}</p></div>");
        var html = BuildEmailHtml("Incident Assigned", "#DE350B", body, "VIEW INCIDENT", link, "#DE350B");
        return await SendEmailAsync(email, $"Incident Assigned: {incidentNumber}", html);
    }

    public async Task<bool> SendNewUserNotificationEmailAsync(string userEmail, string userName, DateTime signupDate)
    {
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(userName)}</strong>,") +
            Paragraph("Welcome to <strong>Milo</strong> - Your Project Management Workspace!") +
            Paragraph("Your account has been created successfully. You can now start managing your projects, tasks, and team collaboration.");
        var html = BuildEmailHtml("Welcome to Milo!", "#6554C0", body, "GET STARTED", "https://www.codingeverest.com/milo-login.html", "#6554C0");
        return await SendEmailAsync(userEmail, "Welcome to Milo!", html);
    }

    public async Task<bool> SendDailyUsersReportEmailAsync(string recipientEmail, List<UserReportData> users)
    {
        var rows = string.Join("", users.Select(u => $"<tr><td style=\"padding: 12px; border-bottom: 1px solid #DFE1E6;\">{WebUtility.HtmlEncode(u.Name)}</td><td style=\"padding: 12px; border-bottom: 1px solid #DFE1E6;\">{WebUtility.HtmlEncode(u.Email)}</td><td style=\"padding: 12px; border-bottom: 1px solid #DFE1E6;\">{u.SignupDate:MMM dd, yyyy}</td></tr>"));
        var body = Paragraph($"Total Users: <strong>{users.Count}</strong>") +
            $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 20px 0;""><tr style=""background: #F4F5F7;""><th style=""padding: 12px; text-align: left; font-size: 12px; color: #6B778C;"">Name</th><th style=""padding: 12px; text-align: left; font-size: 12px; color: #6B778C;"">Email</th><th style=""padding: 12px; text-align: left; font-size: 12px; color: #6B778C;"">Signup Date</th></tr>{rows}</table>";
        var html = BuildEmailHtml($"Daily Users Report - {DateTime.UtcNow:MMM dd, yyyy}", "#0052CC", body);
        return await SendEmailAsync(recipientEmail, $"Daily Users Report - {DateTime.UtcNow:MMM dd, yyyy}", html);
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

        var reportData = new DailyReportData { Date = today, TotalCount = incidents.Count, NewCount = incidents.Count(i => i.Status == "New"), OpenCount = incidents.Count(i => i.Status == "Open"), ResolvedCount = incidents.Count(i => i.Status == "Resolved"), HighPriorityCount = incidents.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
            Incidents = incidents.Select(i => new IncidentSummary { IncidentNumber = i.IncidentNumber, Subject = i.Subject, Status = i.Status, Priority = i.Priority, RequesterName = i.Requester?.Name ?? "Unknown", AssigneeName = i.Assignee?.Name ?? "Unassigned", CreatedAt = i.CreatedAt, ResolvedAt = i.ResolvedAt }).ToList() };

        int successCount = 0;
        foreach (var r in recipients) { if (await SendDailyIncidentReportEmailAsync(r.Email, r.Name ?? r.Email, reportData)) successCount++; }
        return successCount;
    }

    private async Task<bool> SendDailyIncidentReportEmailAsync(string recipientEmail, string recipientName, DailyReportData reportData)
    {
        var statsHtml = $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 20px 0;""><tr><td style=""width: 25%; padding: 16px; background: #F4F5F7; border-radius: 4px; text-align: center;""><div style=""font-size: 28px; font-weight: 700; color: #172B4D;"">{reportData.TotalCount}</div><div style=""font-size: 12px; color: #6B778C;"">Total</div></td><td style=""width: 4px;""></td><td style=""width: 25%; padding: 16px; background: #DEEBFF; border-radius: 4px; text-align: center;""><div style=""font-size: 28px; font-weight: 700; color: #0052CC;"">{reportData.NewCount}</div><div style=""font-size: 12px; color: #6B778C;"">New</div></td><td style=""width: 4px;""></td><td style=""width: 25%; padding: 16px; background: #E3FCEF; border-radius: 4px; text-align: center;""><div style=""font-size: 28px; font-weight: 700; color: #36B37E;"">{reportData.ResolvedCount}</div><div style=""font-size: 12px; color: #6B778C;"">Resolved</div></td><td style=""width: 4px;""></td><td style=""width: 25%; padding: 16px; background: #FFEBE6; border-radius: 4px; text-align: center;""><div style=""font-size: 28px; font-weight: 700; color: #DE350B;"">{reportData.HighPriorityCount}</div><div style=""font-size: 12px; color: #6B778C;"">High Priority</div></td></tr></table>";
        var rows = string.Join("", reportData.Incidents.Select(i => $@"<tr><td style=""padding: 10px; border-bottom: 1px solid #DFE1E6; font-size: 13px;"">{WebUtility.HtmlEncode(i.IncidentNumber)}</td><td style=""padding: 10px; border-bottom: 1px solid #DFE1E6; font-size: 13px;"">{WebUtility.HtmlEncode(i.Subject)}</td><td style=""padding: 10px; border-bottom: 1px solid #DFE1E6; font-size: 13px;"">{WebUtility.HtmlEncode(i.Status)}</td><td style=""padding: 10px; border-bottom: 1px solid #DFE1E6; font-size: 13px;"">{WebUtility.HtmlEncode(i.Priority)}</td><td style=""padding: 10px; border-bottom: 1px solid #DFE1E6; font-size: 13px;"">{WebUtility.HtmlEncode(i.AssigneeName)}</td></tr>"));
        var tableHtml = reportData.Incidents.Any() ? $@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin: 20px 0;""><tr style=""background: #F4F5F7;""><th style=""padding: 10px; text-align: left; font-size: 11px; color: #6B778C;"">ID</th><th style=""padding: 10px; text-align: left; font-size: 11px; color: #6B778C;"">Subject</th><th style=""padding: 10px; text-align: left; font-size: 11px; color: #6B778C;"">Status</th><th style=""padding: 10px; text-align: left; font-size: 11px; color: #6B778C;"">Priority</th><th style=""padding: 10px; text-align: left; font-size: 11px; color: #6B778C;"">Assignee</th></tr>{rows}</table>" : "<p style=\"margin: 20px 0; font-size: 14px; color: #6B778C; text-align: center;\">No incidents reported today.</p>";
        var body = Paragraph($"Hello <strong>{WebUtility.HtmlEncode(recipientName)}</strong>,") + Paragraph("Here's your daily summary of incidents:") + statsHtml + tableHtml;
        var html = BuildEmailHtml($"Daily Incident Report - {reportData.Date:MMM dd, yyyy}", "#DE350B", body, "VIEW ALL INCIDENTS", "https://www.codingeverest.com/milo-incidents.html", "#DE350B");
        return await SendEmailAsync(recipientEmail, $"Daily Incident Report - {reportData.Date:MMMM dd, yyyy}", html);
    }
}

public class UserReportData { public string Name { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public bool IsActive { get; set; } public DateTime CreatedAt { get; set; } public DateTime SignupDate => CreatedAt; }
public class DailyReportData { public DateTime Date { get; set; } public int TotalCount { get; set; } public int NewCount { get; set; } public int OpenCount { get; set; } public int ResolvedCount { get; set; } public int HighPriorityCount { get; set; } public List<IncidentSummary> Incidents { get; set; } = new(); }
public class IncidentSummary { public string IncidentNumber { get; set; } = string.Empty; public string Subject { get; set; } = string.Empty; public string Status { get; set; } = string.Empty; public string Priority { get; set; } = string.Empty; public string RequesterName { get; set; } = string.Empty; public string AssigneeName { get; set; } = string.Empty; public DateTime CreatedAt { get; set; } public DateTime? ResolvedAt { get; set; } public TimeSpan? ResolutionTime { get; set; } }
