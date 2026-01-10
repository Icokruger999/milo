using System.Net;
using System.Net.Mail;
using System.Text;
using Milo.API.Models;

namespace Milo.API.Services;

public interface IEmailService
{
    Task<bool> SendDailyIncidentReportAsync(string recipientEmail, string recipientName, DailyReportData reportData);
    Task<bool> SendEmailAsync(string to, string subject, string htmlBody);
    Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword);
    Task<bool> SendTaskAssignmentEmailAsync(string email, string assigneeName, string taskTitle, string taskId, string projectName, string? taskLink = null);
    Task<bool> SendTeamProjectAssignmentEmailAsync(string email, string memberName, string teamName, string projectName, string projectKey);
    Task<bool> SendCustomEmailAsync(string to, string subject, string htmlBody, string? textBody = null);
    Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
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
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:Username"] ?? "";
            var smtpPassword = _configuration["Email:Password"] ?? "";
            var fromEmail = _configuration["Email:FromEmail"] ?? smtpUsername;
            var fromName = _configuration["Email:FromName"] ?? "Milo - Incident Management";

            if (string.IsNullOrEmpty(smtpUsername) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("Email configuration not set. Skipping email send.");
                return false;
            }

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUsername, smtpPassword)
            };

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            message.To.Add(new MailAddress(to));

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent successfully to {To}", to);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {To}", to);
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
                    </tr>
                </thead>
                <tbody>");

            foreach (var incident in reportData.Incidents.Take(20))
            {
                var statusClass = incident.Status.ToLower().Replace(" ", "-");
                var priorityClass = incident.Priority.ToLower();
                
                html.Append($@"
                    <tr>
                        <td class='incident-number'>{incident.IncidentNumber}</td>
                        <td>{incident.Subject}</td>
                        <td><span class='status-badge status-{statusClass}'>{incident.Status}</span></td>
                        <td class='priority-{priorityClass}'>{incident.Priority}</td>
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

    public async Task<bool> SendTemporaryPasswordEmailAsync(string email, string name, string temporaryPassword)
    {
        try
        {
            var subject = "Your Temporary Password - Milo";
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
        .password-box {{ background: #F4F5F7; border: 2px dashed #0052CC; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0; }}
        .password {{ font-size: 24px; font-weight: 700; color: #0052CC; letter-spacing: 2px; font-family: 'Courier New', monospace; }}
        .footer {{ background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Your Temporary Password</h1>
        </div>
        <div class='content'>
            <p>Hello {name},</p>
            <p>Your temporary password has been generated. Please use the following password to log in:</p>
            <div class='password-box'>
                <div class='password'>{temporaryPassword}</div>
            </div>
            <p>For security reasons, please change this password after your first login.</p>
            <p style='margin-top: 32px;'>
                <a href='https://www.codingeverest.com/milo-login.html' style='display: inline-block; background: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;'>Log In Now</a>
            </p>
        </div>
        <div class='footer'>
            <p>This is an automated message from Milo</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody);
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
        .task-box {{ background: #F4F5F7; border-left: 4px solid #0052CC; padding: 20px; margin: 24px 0; border-radius: 4px; }}
        .task-id {{ font-size: 16px; font-weight: 600; color: #0052CC; margin-bottom: 8px; }}
        .task-title {{ font-size: 18px; font-weight: 700; color: #172B4D; }}
        .project {{ font-size: 14px; color: #6B778C; margin-top: 8px; }}
        .cta-button {{ display: inline-block; background: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; }}
        .footer {{ background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>New Task Assigned</h1>
        </div>
        <div class='content'>
            <p>Hello {assigneeName},</p>
            <p>A new task has been assigned to you:</p>
            <div class='task-box'>
                <div class='task-id'>{taskId}</div>
                <div class='task-title'>{taskTitle}</div>
                <div class='project'>Project: {projectName}</div>
            </div>
            <p style='text-align: center;'>
                <a href='{link}' class='cta-button'>View Task</a>
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
        // Simple wrapper for SendEmailAsync - textBody is ignored since SendEmailAsync only uses HTML
        return await SendEmailAsync(to, subject, htmlBody);
    }

    public async Task<bool> SendProjectInvitationEmailAsync(string email, string name, string projectName, string projectKey, string invitationToken)
    {
        try
        {
            var subject = $"Project Invitation: {projectName}";
            var invitationLink = $"https://www.codingeverest.com/milo-board.html?invite={invitationToken}";
            
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
        .project-box {{ background: #F4F5F7; border-left: 4px solid #0052CC; padding: 20px; margin: 24px 0; border-radius: 4px; }}
        .project-name {{ font-size: 20px; font-weight: 700; color: #172B4D; }}
        .project-key {{ font-size: 14px; color: #6B778C; margin-top: 4px; }}
        .cta-button {{ display: inline-block; background: #0052CC; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; }}
        .footer {{ background: #F4F5F7; padding: 24px; text-align: center; font-size: 12px; color: #6B778C; }}
        .token {{ font-size: 11px; color: #6B778C; margin-top: 16px; word-break: break-all; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Project Invitation</h1>
        </div>
        <div class='content'>
            <p>Hello {name},</p>
            <p>You have been invited to join a project:</p>
            <div class='project-box'>
                <div class='project-name'>{projectName}</div>
                <div class='project-key'>Project Key: {projectKey}</div>
            </div>
            <p>Click the button below to accept the invitation and join the project:</p>
            <p style='text-align: center;'>
                <a href='{invitationLink}' class='cta-button'>Accept Invitation</a>
            </p>
            <div class='token'>
                <p>Or use this invitation token: <code>{invitationToken}</code></p>
            </div>
        </div>
        <div class='footer'>
            <p>This is an automated invitation from Milo</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending project invitation email to {Email}", email);
            return false;
        }
    }
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
    public string AgentName { get; set; } = string.Empty;
}
