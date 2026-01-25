using System.Text;
using Milo.API.Models;
using Milo.API.Data;
using Microsoft.EntityFrameworkCore;
using MailKit.Net.Smtp;
using MimeKit;

namespace Milo.API.Services;

public interface IEmailService
{
    Task<bool> SendDailyIncidentReportAsync(string recipientEmail, string recipientName, DailyReportData reportData);
    Task<bool> SendEmailAsync(string to, string subject, string htmlBody);
    Task<bool> SendEmailWithPlainTextAsync(string to, string subject, string htmlBody, string plainTextBody);
    Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword);
    Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null);
    Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey);
    Task<bool> SendCustomEmailAsync(string to, string subject, string htmlBody, string? textBody = null);
    Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken);
    Task<bool> SendIncidentAssignmentEmailAsync(string email, string assigneeName, string incidentNumber, string subject, string priority, string status, string? incidentLink = null, string? description = null, string? requesterName = null, string? requesterEmail = null, DateTime? createdAt = null, string? category = null, string? source = null);
    Task<bool> SendNewUserNotificationEmailAsync(string userEmail, string userName, DateTime signupDate);
    Task<bool> SendDailyUsersReportEmailAsync(string recipientEmail, List<UserReportData> users);
    Task<int> SendDailyIncidentReportsToAllRecipientsAsync(int? projectId = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _logger = logger;
        _serviceProvider = serviceProvider;
        
        _logger.LogInformation("EmailService initialized with MailKit SMTP");
    }

    public async Task<bool> SendDailyIncidentReportAsync(string recipientEmail, string recipientName, DailyReportData reportData)
    {
        try
        {
            var subject = $"Daily Incident Report - {reportData.Date:MMMM dd, yyyy}";
            var plainTextBody = GenerateReportPlainText(recipientName, reportData);
            return await SendEmailWithPlainTextAsync(recipientEmail, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily report to {Email}", recipientEmail);
            return false;
        }
    }

    private string GenerateReportPlainText(string recipientName, DailyReportData reportData)
    {
        var sb = new StringBuilder();
        
        sb.AppendLine("═══════════════════════════════════════════════════════════════");
        sb.AppendLine($"           DAILY INCIDENT REPORT - {reportData.Date:MMMM dd, yyyy}");
        sb.AppendLine("═══════════════════════════════════════════════════════════════");
        sb.AppendLine();
        sb.AppendLine($"Hello {recipientName},");
        sb.AppendLine();
        sb.AppendLine("Here's your daily summary of incidents:");
        sb.AppendLine();
        sb.AppendLine("───────────────────────────────────────────────────────────────");
        sb.AppendLine("                         SUMMARY");
        sb.AppendLine("───────────────────────────────────────────────────────────────");
        sb.AppendLine($"  Total Incidents:    {reportData.TotalCount}");
        sb.AppendLine($"  Resolved:           {reportData.ResolvedCount}");
        sb.AppendLine($"  High Priority:      {reportData.HighPriorityCount}");
        sb.AppendLine($"  New:                {reportData.NewCount}");
        sb.AppendLine();

        if (reportData.Incidents.Any())
        {
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("                    ALL INCIDENTS");
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine();

            foreach (var incident in reportData.Incidents)
            {
                var resolutionTimeText = incident.ResolutionTime.HasValue 
                    ? FormatDuration(incident.ResolutionTime.Value)
                    : "-";
                var createdDate = incident.CreatedAt.HasValue 
                    ? incident.CreatedAt.Value.ToString("MMM dd, HH:mm")
                    : "-";
                var closedDate = incident.ResolvedAt.HasValue 
                    ? incident.ResolvedAt.Value.ToString("MMM dd, HH:mm")
                    : "-";
                
                sb.AppendLine($"  [{incident.IncidentNumber}] {incident.Subject}");
                sb.AppendLine($"    Status: {incident.Status}  |  Priority: {incident.Priority}");
                sb.AppendLine($"    Requester: {incident.RequesterName}  |  Assignee: {incident.AssigneeName}");
                sb.AppendLine($"    Created: {createdDate}  |  Closed: {closedDate}  |  Resolution: {resolutionTimeText}");
                sb.AppendLine();
            }
        }
        else
        {
            sb.AppendLine("  No incidents in the system.");
            sb.AppendLine();
        }

        sb.AppendLine("───────────────────────────────────────────────────────────────");
        sb.AppendLine();
        sb.AppendLine("View all incidents: https://www.codingeverest.com/milo-incidents.html");
        sb.AppendLine();
        sb.AppendLine("───────────────────────────────────────────────────────────────");
        sb.AppendLine("This is an automated report from Milo Incident Management");
        sb.AppendLine("https://www.codingeverest.com");
        sb.AppendLine("───────────────────────────────────────────────────────────────");

        return sb.ToString();
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string htmlBody)
    {
        var plainTextBody = System.Text.RegularExpressions.Regex.Replace(htmlBody, "<[^>]*>", "")
            .Replace("&nbsp;", " ")
            .Replace("&amp;", "&")
            .Replace("&lt;", "<")
            .Replace("&gt;", ">")
            .Replace("&quot;", "\"")
            .Trim();

        return await SendEmailWithPlainTextAsync(to, subject, htmlBody, plainTextBody);
    }

    public async Task<bool> SendEmailWithPlainTextAsync(string to, string subject, string htmlBody, string plainTextBody)
    {
        try
        {
            var fromEmail = _configuration["Email:FromEmail"] ?? "";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Incident Management";

            if (string.IsNullOrEmpty(fromEmail))
            {
                _logger.LogWarning("Email FromEmail not configured. Skipping email send.");
                return false;
            }

            return await SendEmailViaMailKitAsync(to, subject, htmlBody, plainTextBody, fromEmail, fromName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {To}", to);
            return false;
        }
    }

    private async Task<bool> SendEmailViaMailKitAsync(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:SmtpUser"] ?? _configuration["Email:Username"] ?? "";
            var smtpPassword = _configuration["Email:SmtpPassword"] ?? _configuration["Email:Password"] ?? "";

            if (string.IsNullOrEmpty(smtpUsername) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("SMTP credentials not set. Skipping email send.");
                return false;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;

            var builder = new BodyBuilder();
            builder.HtmlBody = htmlBody;
            builder.TextBody = plainTextBody;
            message.Body = builder.ToMessageBody();

            // Use timeout to prevent hanging
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            using var client = new SmtpClient();
            
            // Set timeout for operations
            client.Timeout = 30000; // 30 seconds
            
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls, cts.Token);
            await client.AuthenticateAsync(smtpUsername, smtpPassword, cts.Token);
            await client.SendAsync(message, cts.Token);
            await client.DisconnectAsync(true, cts.Token);

            _logger.LogInformation("Email sent successfully via MailKit to {To}", to);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Email send to {To} timed out after 30 seconds", to);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via MailKit to {To}. Host: {Host}, Port: {Port}", 
                to, _configuration["Email:SmtpHost"], _configuration["Email:SmtpPort"]);
            return false;
        }
    }

    private string FormatDuration(TimeSpan duration)
    {
        if (duration.TotalDays >= 1)
        {
            var days = (int)duration.TotalDays;
            var hours = duration.Hours;
            return $"{days}d {hours}h";
        }
        else if (duration.TotalHours >= 1)
        {
            var hours = (int)duration.TotalHours;
            var minutes = duration.Minutes;
            return $"{hours}h {minutes}m";
        }
        else
        {
            var minutes = (int)duration.TotalMinutes;
            return $"{minutes}m";
        }
    }

    public async Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword)
    {
        try
        {
            if (string.IsNullOrEmpty(email)) return false;
            if (string.IsNullOrEmpty(temporaryPassword)) return false;
            if (string.IsNullOrEmpty(name)) name = email;
            
            var subject = "Your Temporary Password - Milo";
            
            var plainTextBody = $@"YOUR TEMPORARY PASSWORD - MILO
═══════════════════════════════════════════════════════════════

Hello {name},

Your temporary password has been generated. Please use the following password to log in:

    TEMPORARY PASSWORD: {temporaryPassword}

IMPORTANT: For security reasons, please change this password after your first login.

Login URL: https://www.codingeverest.com/milo-login.html

───────────────────────────────────────────────────────────────
This is an automated message from Milo
If you didn't request this, please ignore this email.
───────────────────────────────────────────────────────────────";

            return await SendEmailWithPlainTextAsync(email, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending temporary password email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null)
    {
        try
        {
            var subject = $"New Task Assigned: {taskId} - {taskTitle}";
            var link = taskLink ?? $"https://www.codingeverest.com/milo-board.html?task={taskId}";
            
            var plainTextBody = $@"Hello {assigneeName},

A new task has been assigned to you:

Task: {taskId} - {taskTitle}
Project: {projectName}

View task details: {link}

This is an automated notification from Milo";

            return await SendEmailWithPlainTextAsync(email, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending task assignment email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey)
    {
        try
        {
            var subject = $"Team Assignment: {teamName} - {projectName}";
            var link = $"https://www.codingeverest.com/milo-board.html?project={projectKey}";
            
            var plainTextBody = $@"TEAM ASSIGNMENT
═══════════════════════════════════════════════════════════════

Hello {memberName},

You have been assigned to a team for a new project:

    TEAM: {teamName}
    PROJECT: {projectName} ({projectKey})

View Project: {link}

───────────────────────────────────────────────────────────────
This is an automated notification from Milo
───────────────────────────────────────────────────────────────";

            return await SendEmailWithPlainTextAsync(email, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending team project assignment email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendCustomEmailAsync(string to, string subject, string htmlBody, string? textBody = null)
    {
        var plainTextBody = textBody ?? System.Text.RegularExpressions.Regex.Replace(htmlBody, "<[^>]*>", "")
            .Replace("&nbsp;", " ")
            .Replace("&amp;", "&")
            .Replace("&lt;", "<")
            .Replace("&gt;", ">")
            .Replace("&quot;", "\"")
            .Replace("&apos;", "'")
            .Trim();
        
        return await SendEmailWithPlainTextAsync(to, subject, htmlBody, plainTextBody);
    }

    public async Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken)
    {
        try
        {
            if (string.IsNullOrEmpty(email)) return false;
            if (string.IsNullOrEmpty(invitationToken)) return false;
            if (string.IsNullOrEmpty(projectName)) projectName = "a project";
            if (string.IsNullOrEmpty(projectKey)) projectKey = projectName;
            if (string.IsNullOrEmpty(name)) name = email;
            
            var subject = $"Project Invitation: {projectName}";
            var invitationLink = $"https://www.codingeverest.com/milo-accept-invitation.html?token={invitationToken}";
            
            var plainTextBody = $@"PROJECT INVITATION
═══════════════════════════════════════════════════════════════

Hello {name},

You have been invited to join the project: {projectName} (Project Key: {projectKey}).

To accept the invitation, please click this link:
{invitationLink}

───────────────────────────────────────────────────────────────
This is an automated invitation from Milo.
If you didn't expect this invitation, you can safely ignore this email.
───────────────────────────────────────────────────────────────";

            return await SendEmailWithPlainTextAsync(email, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending project invitation email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendIncidentAssignmentEmailAsync(string email, string assigneeName, string incidentNumber, string subject, string priority, string status, string? incidentLink = null, string? description = null, string? requesterName = null, string? requesterEmail = null, DateTime? createdAt = null, string? category = null, string? source = null)
    {
        try
        {
            var emailSubject = $"New Incident Assigned: {incidentNumber} - {subject}";
            var link = incidentLink ?? "https://www.codingeverest.com/milo-incidents.html";
            
            var sb = new StringBuilder();
            sb.AppendLine("INCIDENT ASSIGNED TO YOU");
            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine();
            sb.AppendLine($"Hello {assigneeName},");
            sb.AppendLine();
            sb.AppendLine("A new incident has been assigned to you and requires your attention:");
            sb.AppendLine();
            sb.AppendLine($"    INCIDENT: {incidentNumber}");
            sb.AppendLine($"    SUBJECT: {subject}");
            sb.AppendLine($"    PRIORITY: {priority}");
            sb.AppendLine($"    STATUS: {status}");
            
            if (!string.IsNullOrWhiteSpace(requesterName))
            {
                var requesterText = requesterName;
                if (!string.IsNullOrWhiteSpace(requesterEmail))
                    requesterText += $" ({requesterEmail})";
                sb.AppendLine($"    REQUESTER: {requesterText}");
            }
            
            if (createdAt.HasValue)
                sb.AppendLine($"    CREATED: {createdAt.Value:MMM dd, yyyy HH:mm} UTC");
            
            if (!string.IsNullOrWhiteSpace(category))
                sb.AppendLine($"    CATEGORY: {category}");
            
            if (!string.IsNullOrWhiteSpace(source))
                sb.AppendLine($"    SOURCE: {source}");
            
            if (!string.IsNullOrWhiteSpace(description))
            {
                sb.AppendLine();
                sb.AppendLine("DESCRIPTION:");
                sb.AppendLine(description);
            }
            
            sb.AppendLine();
            sb.AppendLine($"View incident details: {link}");
            sb.AppendLine();
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("This is an automated notification from Milo Incident Management");
            sb.AppendLine("Please review and respond to this incident as soon as possible.");
            sb.AppendLine("───────────────────────────────────────────────────────────────");

            var plainTextBody = sb.ToString();
            return await SendEmailWithPlainTextAsync(email, emailSubject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending incident assignment email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendNewUserNotificationEmailAsync(string userEmail, string userName, DateTime signupDate)
    {
        try
        {
            var adminEmail = "ico@astutetech.co.za";
            var subject = $"New User Signed Up: {userName}";
            var frontendUrl = _configuration["Frontend:Url"] ?? "https://www.codingeverest.com";
            var link = $"{frontendUrl}/milo-board.html";
            
            var plainTextBody = $@"NEW USER SIGNED UP
═══════════════════════════════════════════════════════════════

A new user has signed up and successfully logged in to Milo:

    NAME: {userName}
    EMAIL: {userEmail}
    SIGNED UP: {signupDate:yyyy-MM-dd HH:mm:ss} UTC

View in Milo: {link}

───────────────────────────────────────────────────────────────
This is an automated notification from Milo
───────────────────────────────────────────────────────────────";

            return await SendEmailWithPlainTextAsync(adminEmail, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending new user notification email");
            return false;
        }
    }

    public async Task<bool> SendDailyUsersReportEmailAsync(string recipientEmail, List<UserReportData> users)
    {
        try
        {
            var subject = $"Daily Milo Users Report - {DateTime.UtcNow.AddHours(2):yyyy-MM-dd}";
            
            var activeUsers = users.Where(u => u.IsActive).ToList();
            var inactiveUsers = users.Where(u => !u.IsActive).ToList();
            var totalUsers = users.Count;
            var newUsersToday = users.Where(u => u.CreatedAt.Date == DateTime.UtcNow.Date).ToList();
            
            var sb = new StringBuilder();
            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine($"           DAILY MILO USERS REPORT - {DateTime.UtcNow.AddHours(2):dddd, MMMM dd, yyyy}");
            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine();
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("                         SUMMARY");
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine($"  Total Users:        {totalUsers}");
            sb.AppendLine($"  Active Users:       {activeUsers.Count}");
            sb.AppendLine($"  Inactive Users:     {inactiveUsers.Count}");
            sb.AppendLine($"  New Users Today:    {newUsersToday.Count}");
            sb.AppendLine();
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("                       ALL USERS");
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine();
            
            foreach (var user in users.OrderByDescending(u => u.CreatedAt))
            {
                var statusText = user.IsActive ? "Active" : "Inactive";
                sb.AppendLine($"  {user.Name}");
                sb.AppendLine($"    Email: {user.Email}");
                sb.AppendLine($"    Status: {statusText}  |  Signup: {user.CreatedAt:yyyy-MM-dd HH:mm}");
                sb.AppendLine();
            }
            
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("This is an automated daily report from Milo");
            sb.AppendLine("───────────────────────────────────────────────────────────────");

            var plainTextBody = sb.ToString();
            return await SendEmailWithPlainTextAsync(recipientEmail, subject, plainTextBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily users report email");
            return false;
        }
    }

    public async Task<int> SendDailyIncidentReportsToAllRecipientsAsync(int? projectId = null)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();

        try
        {
            _logger.LogInformation("Fetching active report recipients for daily incident report...");

            // 1. Fetch Recipients
            var recipientsQuery = dbContext.ReportRecipients
                .Where(r => r.IsActive && r.ReportType == "DailyIncidents");

            if (projectId.HasValue)
            {
                recipientsQuery = recipientsQuery.Where(r => r.ProjectId == projectId.Value);
            }

            var recipients = await recipientsQuery
                .GroupBy(r => r.Email.ToLower())
                .Select(g => g.First())
                .ToListAsync();

            if (!recipients.Any())
            {
                _logger.LogInformation("No active recipients found for daily incident report");
                return 0;
            }

            _logger.LogInformation($"Found {recipients.Count} unique active recipients. Generating daily incident report...");

            // 2. Fetch Incidents
            var incidentsQuery = dbContext.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .AsQueryable();

            if (projectId.HasValue)
            {
                incidentsQuery = incidentsQuery.Where(i => i.ProjectId == projectId.Value);
            }

            var incidents = await incidentsQuery
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            // 3. Prepare Report Data
            var reportData = new DailyReportData
            {
                Date = DateTime.UtcNow.Date,
                TotalCount = incidents.Count,
                NewCount = incidents.Count(i => i.Status == "New"),
                OpenCount = incidents.Count(i => i.Status == "Open"),
                ResolvedCount = incidents.Count(i => i.Status == "Resolved"),
                HighPriorityCount = incidents.Count(i => i.Priority == "High" || i.Priority == "Urgent"),
                Incidents = incidents.Select(i => new IncidentSummary
                {
                    IncidentNumber = i.IncidentNumber,
                    Subject = i.Subject,
                    Status = i.Status,
                    Priority = i.Priority,
                    RequesterName = i.Requester?.Name ?? "Unknown",
                    AssigneeName = i.Assignee?.Name ?? "Unassigned",
                    CreatedAt = i.CreatedAt,
                    ResolvedAt = i.ResolvedAt,
                    ResolutionTime = i.ResolvedAt.HasValue && i.CreatedAt != default
                        ? i.ResolvedAt.Value - i.CreatedAt
                        : null
                }).ToList()
            };

            // 4. SMTP Configuration
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"] ?? _configuration["Email:Username"] ?? "";
            var smtpPass = _configuration["Email:SmtpPassword"] ?? _configuration["Email:Password"] ?? "";
            var fromEmail = _configuration["Email:FromEmail"] ?? "";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Incident Management";

            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass) || string.IsNullOrEmpty(fromEmail))
            {
                _logger.LogWarning("SMTP credentials not configured. Cannot send bulk emails.");
                return 0;
            }

            int successCount = 0;
            var sentEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var failedRecipients = new List<string>();

            // 5. SINGLE CONNECTION LIFECYCLE - Reuse connection for all emails
            using (var client = new SmtpClient())
            {
                try
                {
                    // Set timeout to prevent hanging
                    client.Timeout = 30000; // 30 seconds

                    // Connect ONCE
                    _logger.LogInformation($"Connecting to SMTP server {smtpHost}:{smtpPort}...");
                    await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                    await client.AuthenticateAsync(smtpUser, smtpPass);
                    _logger.LogInformation("SMTP connection established successfully");

                    // Send to all recipients using the same connection
                    foreach (var recipient in recipients)
                    {
                        if (sentEmails.Contains(recipient.Email))
                        {
                            _logger.LogWarning($"Skipping duplicate email to {recipient.Email}");
                            continue;
                        }

                        try
                        {
                            // Generate content
                            var plainTextBody = GenerateReportPlainText(recipient.Name, reportData);
                            var subject = $"Daily Incident Report - {reportData.Date:MMMM dd, yyyy}";

                            // Create message
                            var message = new MimeMessage();
                            message.From.Add(new MailboxAddress(fromName, fromEmail));
                            message.To.Add(new MailboxAddress(recipient.Name, recipient.Email));
                            message.Subject = subject;

                            var builder = new BodyBuilder { TextBody = plainTextBody };
                            message.Body = builder.ToMessageBody();

                            // Send using the EXISTING connection
                            await client.SendAsync(message);

                            sentEmails.Add(recipient.Email);
                            recipient.LastSentAt = DateTime.UtcNow;
                            successCount++;
                            _logger.LogInformation($"Daily incident report sent to {recipient.Email} ({successCount}/{recipients.Count})");
                        }
                        catch (Exception ex)
                        {
                            failedRecipients.Add(recipient.Email);
                            _logger.LogError(ex, $"Failed to send bulk report to {recipient.Email}");

                            // Verify connection is still alive, if not, reconnect
                            if (!client.IsConnected)
                            {
                                _logger.LogWarning("SMTP connection lost. Attempting to reconnect...");
                                try
                                {
                                    await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                                    await client.AuthenticateAsync(smtpUser, smtpPass);
                                    _logger.LogInformation("SMTP connection re-established");
                                }
                                catch (Exception reconnectEx)
                                {
                                    _logger.LogError(reconnectEx, "Failed to reconnect to SMTP server. Aborting bulk send.");
                                    break;
                                }
                            }
                        }
                    }

                    // Disconnect ONCE
                    if (client.IsConnected)
                    {
                        await client.DisconnectAsync(true);
                        _logger.LogInformation("SMTP connection closed");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error establishing SMTP connection for bulk send");
                    return 0;
                }
            }

            // 6. Batch Save
            if (successCount > 0)
            {
                await dbContext.SaveChangesAsync();
            }

            _logger.LogInformation($"Daily incident report sent to {successCount} unique recipients (out of {recipients.Count} total)");
            if (failedRecipients.Any())
            {
                _logger.LogWarning($"Failed recipients: {string.Join(", ", failedRecipients)}");
            }

            return successCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Critical error in SendDailyIncidentReportsToAllRecipientsAsync");
            return 0;
        }
    }
}

public class UserReportData
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
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
    public TimeSpan? ResolutionTime { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
