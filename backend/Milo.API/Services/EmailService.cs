using System.Net;
using System.Net.Mail;
using System.Text;
using Milo.API.Models;
using Milo.API.Data;
using Microsoft.EntityFrameworkCore;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Amazon;

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
    private readonly IAmazonSimpleEmailService? _sesClient;
    private readonly bool _useSes;
    private readonly IServiceProvider _serviceProvider;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _logger = logger;
        _serviceProvider = serviceProvider;
        
        // Check if SES is enabled
        _useSes = _configuration.GetValue<bool>("Email:UseSes", false);
        
        if (_useSes)
        {
            try
            {
                var region = _configuration["Email:SesRegion"] ?? "eu-west-1";
                var regionEndpoint = RegionEndpoint.GetBySystemName(region);
                _sesClient = new AmazonSimpleEmailServiceClient(regionEndpoint);
                _logger.LogInformation("EmailService initialized with AWS SES (Region: {Region})", region);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize SES client. Falling back to SMTP.");
                _useSes = false;
            }
        }
        else
        {
            _logger.LogInformation("EmailService initialized with SMTP");
        }
    }

    public async Task<bool> SendDailyIncidentReportAsync(string recipientEmail, string recipientName, DailyReportData reportData)
    {
        try
        {
            var subject = $"Daily Incident Report - {reportData.Date:MMMM dd, yyyy}";
            var htmlBody = GenerateReportHtml(recipientName, reportData);
            
            return await SendEmailAsync(recipientEmail, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily report to {Email}", recipientEmail);
            return false;
        }
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string htmlBody)
    {
        // Create plain text version from HTML (simple strip)
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

            if (_useSes && _sesClient != null)
            {
                // Use AWS SES
                return await SendEmailViaSesAsync(to, subject, htmlBody, plainTextBody, fromEmail, fromName);
            }
            else
            {
                // Use SMTP (fallback)
                return await SendEmailViaSmtpAsync(to, subject, htmlBody, plainTextBody, fromEmail, fromName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {To}", to);
            return false;
        }
    }

    private async Task<bool> SendEmailViaSesAsync(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName)
    {
        try
        {
            if (_sesClient == null)
            {
                _logger.LogError("SES client is null. Cannot send email.");
                return false;
            }

            // If htmlBody is the same as plainTextBody, send plain text only (no HTML)
            // Otherwise, use standard multipart format with both HTML and text
            var isPlainTextOnly = htmlBody == plainTextBody || htmlBody.Trim() == plainTextBody.Trim();

            var body = new Body();

            // Only add HTML part if htmlBody is different from plainTextBody
            // This allows sending plain text only emails when htmlBody equals plainTextBody
            if (!isPlainTextOnly)
            {
                // Set HTML first - email clients prefer HTML when both are available
                body.Html = new Content
                {
                    Charset = "UTF-8",
                    Data = htmlBody
                };
            }
            
            // Always include plain text as fallback
            body.Text = new Content
            {
                Charset = "UTF-8",
                Data = plainTextBody
            };

            var request = new SendEmailRequest
            {
                Source = $"{fromName} <{fromEmail}>",
                Destination = new Destination
                {
                    ToAddresses = new List<string> { to }
                },
                Message = new Message
                {
                    Subject = new Content(subject),
                    Body = body
                }
            };

            var response = await _sesClient.SendEmailAsync(request);
            _logger.LogInformation("Email sent successfully via SES to {To}. MessageId: {MessageId}", to, response.MessageId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via SES to {To}. Error: {Error}", to, ex.Message);
            // Fallback to SMTP if SES fails
            _logger.LogInformation("Falling back to SMTP for email to {To}", to);
            return await SendEmailViaSmtpAsync(to, subject, htmlBody, plainTextBody, fromEmail, fromName);
        }
    }

    private async Task<bool> SendEmailViaSmtpAsync(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName)
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

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUsername, smtpPassword)
            };

            // Check if htmlBody actually contains HTML by looking for HTML tags
            var containsHtmlTags = htmlBody.Contains("<html", StringComparison.OrdinalIgnoreCase) || 
                                   htmlBody.Contains("<!DOCTYPE", StringComparison.OrdinalIgnoreCase) ||
                                   htmlBody.Contains("<body", StringComparison.OrdinalIgnoreCase) ||
                                   htmlBody.Contains("<p>", StringComparison.OrdinalIgnoreCase) ||
                                   htmlBody.Contains("<div", StringComparison.OrdinalIgnoreCase) ||
                                   htmlBody.Contains("<table", StringComparison.OrdinalIgnoreCase);
            
            // If htmlBody contains HTML tags, always send as HTML
            // Only send as plain text if htmlBody equals plainTextBody AND contains no HTML tags
            var isPlainTextOnly = (htmlBody == plainTextBody || htmlBody.Trim() == plainTextBody.Trim()) && !containsHtmlTags;
            
            _logger.LogInformation("Sending email to {To}: IsPlainTextOnly={IsPlainTextOnly}, ContainsHtmlTags={ContainsHtmlTags}", 
                to, isPlainTextOnly, containsHtmlTags);
            
            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                BodyEncoding = System.Text.Encoding.UTF8,
                SubjectEncoding = System.Text.Encoding.UTF8,
                HeadersEncoding = System.Text.Encoding.UTF8
            };

            message.To.Add(new MailAddress(to));

            // CRITICAL FIX: Always set IsBodyHtml BEFORE setting Body
            // This ensures the Content-Type header is set correctly
            if (!isPlainTextOnly)
            {
                // HTML email - MUST set IsBodyHtml = true
                message.IsBodyHtml = true;
                message.Body = htmlBody;
                _logger.LogInformation("Email configured as HTML (Content-Type: text/html)");
            }
            else
            {
                // Plain text only
                message.IsBodyHtml = false;
                message.Body = plainTextBody;
                _logger.LogInformation("Email configured as plain text only (Content-Type: text/plain)");
            }

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent successfully via SMTP to {To}", to);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via SMTP to {To}", to);
            return false;
        }
    }

    private string GenerateReportHtml(string recipientName, DailyReportData reportData)
    {
        var html = new StringBuilder();
        
        html.Append(@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
        .header { background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%); color: #FFFFFF; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #F4F5F7; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-value { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: #6B778C; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-total { color: #0052CC; }
        .stat-resolved { color: #36B37E; }
        .stat-high { color: #FF991F; }
        .stat-new { color: #6554C0; }
        .incidents-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .incidents-table th { background: #F4F5F7; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B778C; text-transform: uppercase; border-bottom: 2px solid #DFE1E6; }
        .incidents-table td { padding: 12px; border-bottom: 1px solid #DFE1E6; font-size: 14px; }
        .incident-number { font-weight: 600; color: #0052CC; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .status-new { background: #EAE6FF; color: #6554C0; }
        .status-open { background: #DEEBFF; color: #0052CC; }
        .status-resolved { background: #E3FCEF; color: #006644; }
        .priority-high, .priority-urgent { color: #DE350B; font-weight: 600; }
        .priority-medium { color: #FF991F; }
        .priority-low { color: #6B778C; }
        .footer { background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }
        .footer a { color: #0052CC; text-decoration: none; }
        .cta-button { display: inline-block; background: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
        @media only screen and (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr; }
            .incidents-table { font-size: 12px; }
            .incidents-table th, .incidents-table td { padding: 8px; }
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Daily Incident Report</h1>
            <p>" + reportData.Date.ToString("MMMM dd, yyyy") + @"</p>
        </div>
        <div class='content'>
            <div class='greeting'>
                Hello " + recipientName + @",
            </div>
            <p>Here's your daily summary of incidents:</p>
            
            <div class='stats-grid'>
                <div class='stat-card'>
                    <div class='stat-value stat-total'>" + reportData.TotalCount + @"</div>
                    <div class='stat-label'>Total Incidents</div>
                </div>
                <div class='stat-card'>
                    <div class='stat-value stat-resolved'>" + reportData.ResolvedCount + @"</div>
                    <div class='stat-label'>Resolved</div>
                </div>
                <div class='stat-card'>
                    <div class='stat-value stat-high'>" + reportData.HighPriorityCount + @"</div>
                    <div class='stat-label'>High Priority</div>
                </div>
                <div class='stat-card'>
                    <div class='stat-value stat-new'>" + reportData.NewCount + @"</div>
                    <div class='stat-label'>New</div>
                </div>
            </div>");

        if (reportData.Incidents.Any())
        {
            html.Append(@"
            <h3 style='margin-top: 32px; margin-bottom: 16px;'>Today's Incidents</h3>
            <table class='incidents-table'>
                <thead>
                    <tr>
                        <th>Incident</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Resolution Time</th>
                    </tr>
                </thead>
                <tbody>");

            foreach (var incident in reportData.Incidents.Take(20))
            {
                var statusClass = incident.Status.ToLower().Replace(" ", "-");
                var priorityClass = incident.Priority.ToLower();
                var resolutionTimeText = incident.ResolutionTime.HasValue 
                    ? FormatDuration(incident.ResolutionTime.Value)
                    : "-";
                
                html.Append($@"
                    <tr>
                        <td class='incident-number'>{incident.IncidentNumber}</td>
                        <td>{incident.Subject}</td>
                        <td><span class='status-badge status-{statusClass}'>{incident.Status}</span></td>
                        <td class='priority-{priorityClass}'>{incident.Priority}</td>
                        <td>{resolutionTimeText}</td>
                    </tr>");
            }

            html.Append(@"
                </tbody>
            </table>");

            if (reportData.Incidents.Count > 20)
            {
                html.Append($"<p style='color: #6B778C; font-size: 13px;'>... and {reportData.Incidents.Count - 20} more incidents</p>");
            }
        }
        else
        {
            html.Append("<p style='text-align: center; color: #6B778C; padding: 32px 0;'>No incidents reported today.</p>");
        }

        html.Append(@"
            <div style='text-align: center; margin-top: 32px;'>
                <a href='https://www.codingeverest.com/milo-incidents.html' class='cta-button'>View All Incidents</a>
            </div>
        </div>
        <div class='footer'>
            <p>This is an automated report from Milo Incident Management</p>
            <p><a href='https://www.codingeverest.com'>www.codingeverest.com</a></p>
            <p style='margin-top: 16px; font-size: 11px;'>To stop receiving these reports, please contact your administrator.</p>
        </div>
    </div>
</body>
</html>");

        return html.ToString();
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
            // Validate inputs
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogError("SendTemporaryPasswordEmailAsync: Email is null or empty");
                return false;
            }
            if (string.IsNullOrEmpty(temporaryPassword))
            {
                _logger.LogError("SendTemporaryPasswordEmailAsync: TemporaryPassword is null or empty");
                return false;
            }
            if (string.IsNullOrEmpty(name))
            {
                _logger.LogWarning("SendTemporaryPasswordEmailAsync: Name is null or empty, using email");
                name = email;
            }
            
            _logger.LogInformation($"Sending temporary password email to {email} for user {name}");
            
            var subject = "Your Temporary Password - Milo";
            
            // HTML encode the name to prevent XSS
            var escapedName = System.Net.WebUtility.HtmlEncode(name);
            var escapedPassword = System.Net.WebUtility.HtmlEncode(temporaryPassword);
            
            // Create plain text version first (for Outlook and email clients that don't support HTML)
            var plainTextBody = $@"Your Temporary Password - Milo

Hello {name},

Your temporary password has been generated. Please use the following password to log in:

TEMPORARY PASSWORD: {temporaryPassword}

IMPORTANT: For security reasons, please change this password after your first login.

Login URL: https://www.codingeverest.com/milo-login.html

This is an automated message from Milo
If you didn't request this, please ignore this email.";
            
            // HTML version with inline styles for Outlook compatibility
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <!--[if mso]>
    <style type='text/css'>
        body, table, td {{ font-family: Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style='margin: 0; padding: 0; background-color: #F4F5F7; font-family: Arial, Helvetica, sans-serif;'>
    <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color: #F4F5F7; padding: 20px;'>
        <tr>
            <td align='center'>
                <table role='presentation' width='600' cellpadding='0' cellspacing='0' border='0' style='background-color: #FFFFFF; border-radius: 8px; max-width: 600px; width: 100%;'>
                    <!-- Header -->
                    <tr>
                        <td style='background-color: #0052CC; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;'>
                            <h1 style='margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 600;'>Your Temporary Password</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style='padding: 32px 24px;'>
                            <p style='margin: 0 0 16px 0; font-size: 16px; color: #172B4D; line-height: 1.6;'>Hello {escapedName},</p>
                            <p style='margin: 0 0 24px 0; font-size: 16px; color: #172B4D; line-height: 1.6;'>Your temporary password has been generated. Please use the following password to log in:</p>
                            
                            <!-- Password Box -->
                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color: #F4F5F7; border: 2px dashed #0052CC; border-radius: 6px; margin: 24px 0;'>
                                <tr>
                                    <td style='padding: 20px; text-align: center;'>
                                        <div style='font-size: 28px; font-weight: 700; color: #0052CC; letter-spacing: 3px; font-family: 'Courier New', Courier, monospace; word-break: break-all;'>{escapedPassword}</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style='margin: 24px 0 16px 0; font-size: 16px; color: #172B4D; line-height: 1.6;'><strong style='color: #DE350B;'>IMPORTANT:</strong> For security reasons, please change this password after your first login.</p>
                            
                            <!-- Login Button -->
                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin: 32px 0;'>
                                <tr>
                                    <td align='center'>
                                        <a href='https://www.codingeverest.com/milo-login.html' style='display: inline-block; background-color: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;'>Log In Now</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Login URL as text -->
                            <p style='margin: 24px 0 0 0; font-size: 12px; color: #6B778C; line-height: 1.6;'>
                                Login URL: <a href='https://www.codingeverest.com/milo-login.html' style='color: #0052CC; text-decoration: underline; word-break: break-all;'>https://www.codingeverest.com/milo-login.html</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #F4F5F7; padding: 24px; text-align: center; border-radius: 0 0 8px 8px;'>
                            <p style='margin: 0 0 8px 0; font-size: 12px; color: #6B778C;'>This is an automated message from Milo</p>
                            <p style='margin: 0; font-size: 12px; color: #6B778C;'>If you didn't request this, please ignore this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

            // Send email with both HTML and plain text versions
            return await SendEmailWithPlainTextAsync(email, subject, htmlBody, plainTextBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending temporary password email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null)
    {
        try {
            var subject = $"New Task Assigned: {taskId} - {taskTitle}";
            var link = taskLink ?? $"https://www.codingeverest.com/milo-board.html?task={taskId}";
            
            // Send as plain text with link - simpler and more reliable
            var plainTextBody = $@"Hello {assigneeName},

A new task has been assigned to you:

Task: {taskId} - {taskTitle}
Project: {projectName}

View task details: {link}

This is an automated notification from Milo";

            // For plain text emails, set both htmlBody and plainTextBody to the same content
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
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%); color: #FFFFFF; padding: 32px 24px; text-align: center; }}
        .content {{ padding: 32px 24px; }}
        .info-box {{ background: #F4F5F7; border-radius: 6px; padding: 20px; margin: 24px 0; }}
        .info-row {{ margin: 12px 0; }}
        .label {{ font-size: 12px; color: #6B778C; text-transform: uppercase; font-weight: 600; }}
        .value {{ font-size: 16px; color: #172B4D; font-weight: 600; margin-top: 4px; }}
        .cta-button {{ display: inline-block; background: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; }}
        .footer {{ background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Team Assignment</h1>
        </div>
        <div class='content'>
            <p>Hello {memberName},</p>
            <p>You have been assigned to a team for a new project:</p>
            <div class='info-box'>
                <div class='info-row'>
                    <div class='label'>Team</div>
                    <div class='value'>{teamName}</div>
                </div>
                <div class='info-row'>
                    <div class='label'>Project</div>
                    <div class='value'>{projectName} ({projectKey})</div>
                </div>
            </div>
            <p style='text-align: center;'>
                <a href='https://www.codingeverest.com/milo-board.html?project={projectKey}' class='cta-button'>View Project</a>
            </p>
        </div>
        <div class='footer'>
            <p>This is an automated notification from Milo</p>
        </div>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending team project assignment email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendCustomEmailAsync(string to, string subject, string htmlBody, string? textBody = null)
    {
        // Use SendEmailWithPlainTextAsync to ensure both HTML and plain text are sent correctly
        // If textBody is not provided, generate it from HTML
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
            // Validate inputs
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogError("SendProjectInvitationEmailAsync: Email is null or empty");
                return false;
            }
            if (string.IsNullOrEmpty(invitationToken))
            {
                _logger.LogError("SendProjectInvitationEmailAsync: InvitationToken is null or empty");
                return false;
            }
            if (string.IsNullOrEmpty(projectName))
            {
                _logger.LogWarning("SendProjectInvitationEmailAsync: ProjectName is null or empty, using default");
                projectName = "a project";
            }
            if (string.IsNullOrEmpty(projectKey))
            {
                _logger.LogWarning("SendProjectInvitationEmailAsync: ProjectKey is null or empty, using project name");
                projectKey = projectName;
            }
            if (string.IsNullOrEmpty(name))
            {
                _logger.LogWarning("SendProjectInvitationEmailAsync: Name is null or empty, using email");
                name = email;
            }
            
            var subject = $"Project Invitation: {projectName}";
            var invitationLink = $"https://www.codingeverest.com/milo-accept-invitation.html?token={invitationToken}";
            
            // HTML encode all dynamic content to prevent XSS
            var escapedName = System.Net.WebUtility.HtmlEncode(name);
            var escapedProjectName = System.Net.WebUtility.HtmlEncode(projectName);
            var escapedProjectKey = System.Net.WebUtility.HtmlEncode(projectKey);
            var escapedToken = System.Net.WebUtility.HtmlEncode(invitationToken);
            
            _logger.LogInformation($"Sending project invitation email to {email} for project {projectName} with token {invitationToken.Substring(0, Math.Min(8, invitationToken.Length))}...");
            
            // Simple plain text email with just the link
            var plainTextBody = $@"Hello {escapedName},

You have been invited to join the project: {escapedProjectName} (Project Key: {escapedProjectKey}).

To accept the invitation, please click this link:
{invitationLink}

This is an automated invitation from Milo. If you didn't expect this invitation, you can safely ignore this email.";

            // Simple HTML email with just the link (no complex styling)
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <p>Hello {escapedName},</p>
    <p>You have been invited to join the project: <strong>{escapedProjectName}</strong> (Project Key: {escapedProjectKey}).</p>
    <p>To accept the invitation, please click this link:</p>
    <p><a href='{invitationLink}' style='color: #0052CC; text-decoration: underline;'>{invitationLink}</a></p>
    <p style='font-size: 12px; color: #666;'>This is an automated invitation from Milo. If you didn't expect this invitation, you can safely ignore this email.</p>
</body>
</html>";

            return await SendEmailWithPlainTextAsync(email, subject, htmlBody, plainTextBody);
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
            var priorityColor = priority.ToLower() switch
            {
                "high" or "urgent" => "#DE350B",
                "medium" => "#FF991F",
                _ => "#6B778C"
            };
            var statusColor = status.ToLower() switch
            {
                "new" => "#6554C0",
                "open" => "#0052CC",
                "resolved" => "#36B37E",
                "closed" => "#36B37E",
                _ => "#6B778C"
            };
            
            // Build details section dynamically
            var detailsHtml = new StringBuilder();
            detailsHtml.AppendLine($@"
                        <div class='detail-item'>
                            <div class='detail-label'>Priority</div>
                            <div class='detail-value'><span class='priority-badge'>{priority}</span></div>
                        </div>
                        <div class='detail-item'>
                            <div class='detail-label'>Status</div>
                            <div class='detail-value'><span class='status-badge'>{status}</span></div>
                        </div>");
            
            if (!string.IsNullOrWhiteSpace(requesterName))
            {
                var requesterText = requesterName;
                if (!string.IsNullOrWhiteSpace(requesterEmail))
                    requesterText += $" ({requesterEmail})";
                detailsHtml.AppendLine($@"
                        <div class='detail-item'>
                            <div class='detail-label'>Requester</div>
                            <div class='detail-value'>{requesterText}</div>
                        </div>");
            }
            
            if (createdAt.HasValue)
            {
                detailsHtml.AppendLine($@"
                        <div class='detail-item'>
                            <div class='detail-label'>Created</div>
                            <div class='detail-value'>{createdAt.Value:MMM dd, yyyy HH:mm} UTC</div>
                        </div>");
            }
            
            if (!string.IsNullOrWhiteSpace(category))
            {
                detailsHtml.AppendLine($@"
                        <div class='detail-item'>
                            <div class='detail-label'>Category</div>
                            <div class='detail-value'>{category}</div>
                        </div>");
            }
            
            if (!string.IsNullOrWhiteSpace(source))
            {
                detailsHtml.AppendLine($@"
                        <div class='detail-item'>
                            <div class='detail-label'>Source</div>
                            <div class='detail-value'>{source}</div>
                        </div>");
            }
            
            var descriptionHtml = "";
            var descriptionText = "";
            if (!string.IsNullOrWhiteSpace(description))
            {
                var escapedDescription = description.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
                descriptionHtml = $@"
                    <div style='margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(223, 225, 230, 0.6);'>
                        <div class='detail-label'>Description</div>
                        <div style='font-size: 14px; color: #42526E; line-height: 1.6; margin-top: 8px; white-space: pre-wrap;'>{escapedDescription}</div>
                    </div>";
                descriptionText = $"\n\nDescription:\n{description}";
            }
            
            // Build plain text version
            var plainTextDetails = new StringBuilder();
            plainTextDetails.AppendLine($"Priority: {priority}");
            plainTextDetails.AppendLine($"Status: {status}");
            if (!string.IsNullOrWhiteSpace(requesterName))
            {
                var requesterText = requesterName;
                if (!string.IsNullOrWhiteSpace(requesterEmail))
                    requesterText += $" ({requesterEmail})";
                plainTextDetails.AppendLine($"Requester: {requesterText}");
            }
            if (createdAt.HasValue)
            {
                plainTextDetails.AppendLine($"Created: {createdAt.Value:MMM dd, yyyy HH:mm} UTC");
            }
            if (!string.IsNullOrWhiteSpace(category))
            {
                plainTextDetails.AppendLine($"Category: {category}");
            }
            if (!string.IsNullOrWhiteSpace(source))
            {
                plainTextDetails.AppendLine($"Source: {source}");
            }
            
            var plainTextBody = $@"Hello {assigneeName},

A new incident has been assigned to you and requires your attention:

{incidentNumber} - {subject}

{plainTextDetails.ToString().Trim()}{descriptionText}

View incident details: {link}

This is an automated notification from Milo Incident Management
Please review and respond to this incident as soon as possible.";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #172B4D; background: linear-gradient(135deg, #F4F5F7 0%, #EBECF0 100%); margin: 0; padding: 20px; -webkit-font-smoothing: antialiased; }}
        .email-wrapper {{ max-width: 600px; margin: 0 auto; }}
        .container {{ background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(9, 30, 66, 0.15), 0 0 1px rgba(9, 30, 66, 0.1); }}
        .header {{ background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%); color: #FFFFFF; padding: 40px 32px; text-align: center; position: relative; }}
        .header::after {{ content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%); }}
        .header h1 {{ font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }}
        .content {{ padding: 40px 32px; }}
        .greeting {{ font-size: 16px; color: #172B4D; margin-bottom: 16px; }}
        .intro-text {{ font-size: 15px; color: #42526E; margin-bottom: 24px; line-height: 1.6; }}
        .incident-box {{ background: linear-gradient(to bottom, #F8F9FA 0%, #F4F5F7 100%); border-left: 5px solid #0052CC; padding: 24px; margin: 24px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(9, 30, 66, 0.08); }}
        .incident-number {{ font-size: 16px; font-weight: 700; color: #0052CC; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; }}
        .incident-subject {{ font-size: 22px; font-weight: 700; color: #172B4D; margin-bottom: 20px; line-height: 1.4; }}
        .incident-details {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(223, 225, 230, 0.6); }}
        .detail-item {{ }}
        .detail-label {{ font-size: 11px; color: #6B778C; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }}
        .detail-value {{ font-size: 15px; font-weight: 600; color: #172B4D; }}
        .priority-badge, .status-badge {{ display: inline-block; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .priority-badge {{ background: {priorityColor}20; color: {priorityColor}; border: 1px solid {priorityColor}40; }}
        .status-badge {{ background: {statusColor}20; color: {statusColor}; border: 1px solid {statusColor}40; }}
        .cta-container {{ text-align: center; margin: 32px 0; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3); transition: all 0.2s ease; border: none; }}
        .cta-button:hover {{ box-shadow: 0 6px 16px rgba(0, 82, 204, 0.4); transform: translateY(-1px); }}
        .footer {{ background: #F4F5F7; padding: 32px; text-align: center; border-top: 1px solid #DFE1E6; }}
        .footer p {{ font-size: 13px; color: #6B778C; margin: 8px 0; line-height: 1.5; }}
        .footer p:first-child {{ font-weight: 600; color: #42526E; }}
        @media only screen and (max-width: 600px) {{
            .content {{ padding: 32px 24px; }}
            .incident-details {{ grid-template-columns: 1fr; gap: 16px; }}
            .header {{ padding: 32px 24px; }}
            .header h1 {{ font-size: 24px; }}
        }}
    </style>
</head>
<body>
    <div class='email-wrapper'>
        <div class='container'>
            <div class='header'>
                <h1>Incident Assigned to You</h1>
            </div>
            <div class='content'>
                <p class='greeting'>Hello {assigneeName},</p>
                <p class='intro-text'>A new incident has been assigned to you and requires your attention:</p>
                <div class='incident-box'>
                    <div class='incident-number'>{incidentNumber}</div>
                    <div class='incident-subject'>{subject}</div>
                    <div class='incident-details'>
{detailsHtml.ToString().Trim()}
                    </div>
{descriptionHtml}
                </div>
                <div class='cta-container'>
                    <a href='{link}' class='cta-button'>View Incident Details</a>
                </div>
            </div>
            <div class='footer'>
                <p>This is an automated notification from Milo Incident Management</p>
                <p>Please review and respond to this incident as soon as possible.</p>
            </div>
        </div>
    </div>
</body>
</html>";

            return await SendEmailWithPlainTextAsync(email, emailSubject, htmlBody, plainTextBody);
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
            
            // Get frontend URL from configuration
            var frontendUrl = _configuration["Frontend:Url"] ?? "https://www.codingeverest.com";
            var link = $"{frontendUrl}/milo-board.html";
            
            // Simple HTML body with just a link (like project invitations)
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
</head>
<body>
    <p>A new user has signed up and successfully logged in to Milo:</p>
    <p><strong>{System.Net.WebUtility.HtmlEncode(userName)}</strong> ({System.Net.WebUtility.HtmlEncode(userEmail)})</p>
    <p>Signed up: {signupDate:yyyy-MM-dd HH:mm:ss} UTC</p>
    <p><a href='{link}'>View in Milo</a></p>
</body>
</html>";

            // Plain text version
            var plainTextBody = $@"A new user has signed up and successfully logged in to Milo:

{userName} ({userEmail})
Signed up: {signupDate:yyyy-MM-dd HH:mm:ss} UTC

View in Milo: {link}";

            return await SendEmailWithPlainTextAsync(adminEmail, subject, htmlBody, plainTextBody);
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
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; margin: 0; padding: 20px; }}
        .container {{ max-width: 800px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%); color: #FFFFFF; padding: 32px 24px; text-align: center; }}
        .content {{ padding: 32px 24px; }}
        .stats {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }}
        .stat-box {{ background: #F4F5F7; padding: 20px; border-radius: 6px; text-align: center; }}
        .stat-number {{ font-size: 32px; font-weight: 700; color: #0052CC; }}
        .stat-label {{ font-size: 14px; color: #6B778C; margin-top: 4px; }}
        .user-table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
        .user-table th {{ background: #F4F5F7; padding: 12px; text-align: left; font-weight: 600; color: #172B4D; border-bottom: 2px solid #DFE1E6; }}
        .user-table td {{ padding: 12px; border-bottom: 1px solid #DFE1E6; }}
        .user-table tr:hover {{ background: #F4F5F7; }}
        .footer {{ background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Daily Milo Users Report</h1>
            <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>{DateTime.UtcNow.AddHours(2):dddd, MMMM dd, yyyy}</p>
        </div>
        <div class='content'>
            <div class='stats'>
                <div class='stat-box'>
                    <div class='stat-number'>{totalUsers}</div>
                    <div class='stat-label'>Total Users</div>
                </div>
                <div class='stat-box'>
                    <div class='stat-number'>{activeUsers.Count}</div>
                    <div class='stat-label'>Active Users</div>
                </div>
                <div class='stat-box'>
                    <div class='stat-number'>{inactiveUsers.Count}</div>
                    <div class='stat-label'>Inactive Users</div>
                </div>
                <div class='stat-box'>
                    <div class='stat-number'>{newUsersToday.Count}</div>
                    <div class='stat-label'>New Users Today</div>
                </div>
            </div>
            
            <h2 style='margin-top: 32px; font-size: 18px; color: #172B4D;'>All Users</h2>
            <table class='user-table'>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Signup Date</th>
                    </tr>
                </thead>
                <tbody>
                    {string.Join("", users.OrderByDescending(u => u.CreatedAt).Select(u => $@"
                    <tr>
                        <td>{System.Net.WebUtility.HtmlEncode(u.Name)}</td>
                        <td>{System.Net.WebUtility.HtmlEncode(u.Email)}</td>
                        <td>{(u.IsActive ? "<span style='color: #36B37E; font-weight: 600;'>Active</span>" : "<span style='color: #DE350B;'>Inactive</span>")}</td>
                        <td>{u.CreatedAt:yyyy-MM-dd HH:mm}</td>
                    </tr>"))}
                </tbody>
            </table>
        </div>
        <div class='footer'>
            <p>This is an automated daily report from Milo</p>
        </div>
    </div>
</body>
</html>";

            return await SendEmailAsync(recipientEmail, subject, htmlBody);
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

            // Get active recipients
            var recipientsQuery = dbContext.ReportRecipients
                .Where(r => r.IsActive && r.ReportType == "DailyIncidents");

            if (projectId.HasValue)
            {
                recipientsQuery = recipientsQuery.Where(r => r.ProjectId == projectId.Value);
            }

            var recipients = await recipientsQuery.ToListAsync();

            if (!recipients.Any())
            {
                _logger.LogInformation("No active recipients found for daily incident report");
                return 0;
            }

            _logger.LogInformation($"Found {recipients.Count} active recipients. Generating daily incident report...");

            // Get report data
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var incidentsQuery = dbContext.Incidents
                .Include(i => i.Requester)
                .Include(i => i.Assignee)
                .Where(i => i.CreatedAt >= today && i.CreatedAt < tomorrow);

            if (projectId.HasValue)
            {
                incidentsQuery = incidentsQuery.Where(i => i.ProjectId == projectId.Value);
            }

            var incidents = await incidentsQuery
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            // Prepare report data
            var reportData = new DailyReportData
            {
                Date = today,
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
                    ResolutionTime = i.ResolvedAt.HasValue && i.CreatedAt != default
                        ? i.ResolvedAt.Value - i.CreatedAt
                        : null
                }).ToList()
            };

            // Send emails to all recipients
            int successCount = 0;
            var failedRecipients = new List<string>();

            foreach (var recipient in recipients)
            {
                try
                {
                    var sent = await SendDailyIncidentReportAsync(
                        recipient.Email,
                        recipient.Name,
                        reportData
                    );

                    if (sent)
                    {
                        recipient.LastSentAt = DateTime.UtcNow;
                        successCount++;
                        _logger.LogInformation($"✓ Daily incident report sent to {recipient.Email}");
                    }
                    else
                    {
                        failedRecipients.Add(recipient.Email);
                        _logger.LogWarning($"✗ Failed to send daily incident report to {recipient.Email}");
                    }
                }
                catch (Exception ex)
                {
                    failedRecipients.Add(recipient.Email);
                    _logger.LogError(ex, $"Error sending daily incident report to {recipient.Email}");
                }
            }

            // Update LastSentAt for successful sends
            if (successCount > 0)
            {
                await dbContext.SaveChangesAsync();
            }

            _logger.LogInformation($"Daily incident report sent to {successCount} of {recipients.Count} recipients");
            if (failedRecipients.Any())
            {
                _logger.LogWarning($"Failed recipients: {string.Join(", ", failedRecipients)}");
            }

            return successCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending daily incident reports to all recipients");
            return 0;
        }
    }
}

// Data class for user reports
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
}
