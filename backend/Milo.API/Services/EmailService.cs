using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Milo.API.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendWelcomeEmailAsync(string toEmail, string toName)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Coding Everest";

            // If email is not configured, log and return false
            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("Email service not configured. Skipping email send.");
                return false;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = "Welcome to Milo - Your Account is Ready!";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #0052CC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Welcome to Milo!</h1>
        </div>
        <div class=""content"">
            <p>Hi {toName},</p>
            <p>Thank you for signing up for Milo - your project management solution!</p>
            <p>Your account has been successfully created. You can now:</p>
            <ul>
                <li>Log in to your account</li>
                <li>Create and manage projects</li>
                <li>Collaborate with your team</li>
                <li>Track progress and deadlines</li>
            </ul>
            <p style=""text-align: center;"">
                <a href=""https://www.codingeverest.com/milo-login.html"" class=""button"">Get Started</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Milo Team</p>
        </div>
    </div>
</body>
</html>",
                TextBody = $@"
Welcome to Milo!

Hi {toName},

Thank you for signing up for Milo - your project management solution!

Your account has been successfully created. You can now log in and start managing your projects.

Get started: https://www.codingeverest.com/milo-login.html

If you have any questions, feel free to reach out to our support team.

Best regards,
The Milo Team
"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Welcome email sent successfully to {toEmail}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send welcome email to {toEmail}");
            return false;
        }
    }

    public async Task<bool> SendTemporaryPasswordEmailAsync(string toEmail, string toName, string tempPassword)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Coding Everest";

            // If email is not configured, log and return false
            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("Email service not configured. Skipping email send.");
                return false;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = "Your Milo Account - Temporary Password";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #0052CC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .password-box {{ background: #fff; border: 2px solid #0052CC; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0052CC; }}
        .button {{ display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
        .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Welcome to Milo!</h1>
        </div>
        <div class=""content"">
            <p>Hi {toName},</p>
            <p>Your Milo account has been created successfully!</p>
            <p>Please use the temporary password below to log in. You will be required to create a new password on your first login.</p>
            
            <div class=""password-box"">
                {tempPassword}
            </div>
            
            <div class=""warning"">
                <strong>Important:</strong> This is a temporary password. You must change it when you first log in.
            </div>
            
            <p style=""text-align: center;"">
                <a href=""https://www.codingeverest.com/milo-login.html"" class=""button"">Log in to Milo</a>
            </p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Milo Team</p>
        </div>
    </div>
</body>
</html>",
                TextBody = $@"
Welcome to Milo!

Hi {toName},

Your Milo account has been created successfully!

Your temporary password is: {tempPassword}

IMPORTANT: This is a temporary password. You must change it when you first log in.

Log in at: https://www.codingeverest.com/milo-login.html

If you have any questions, feel free to reach out to our support team.

Best regards,
The Milo Team
"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Temporary password email sent successfully to {toEmail}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send temporary password email to {toEmail}");
            return false;
        }
    }

    public async Task<bool> SendTaskAssignmentEmailAsync(string toEmail, string toName, string taskTitle, string taskId, string productName, string? taskLink = null)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Coding Everest";

            // If email is not configured, log and return false
            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("Email service not configured. Skipping email send.");
                return false;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = $"New Task Assigned: {taskId} - {taskTitle}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; }}
        .email-wrapper {{ background-color: #F4F5F7; padding: 40px 20px; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .email-header {{ background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #FFFFFF; padding: 40px 30px; text-align: center; }}
        .email-header h1 {{ font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px; }}
        .email-body {{ padding: 40px 30px; }}
        .greeting {{ font-size: 16px; color: #172B4D; margin-bottom: 20px; }}
        .message {{ font-size: 15px; color: #42526E; margin-bottom: 30px; line-height: 1.7; }}
        .task-card {{ background: #F4F5F7; border-left: 4px solid #0052CC; border-radius: 4px; padding: 20px; margin: 30px 0; }}
        .task-id {{ font-size: 14px; font-weight: 600; color: #0052CC; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-family: 'Monaco', 'Menlo', monospace; }}
        .task-title {{ font-size: 20px; font-weight: 600; color: #172B4D; margin: 8px 0 12px 0; line-height: 1.4; }}
        .task-meta {{ font-size: 14px; color: #6B778C; margin-top: 8px; }}
        .task-meta strong {{ color: #42526E; }}
        .cta-button {{ display: inline-block; background: #0052CC; color: #FFFFFF !important; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px; margin: 30px 0; text-align: center; transition: background-color 0.2s; }}
        .cta-button:hover {{ background: #0065FF; }}
        .button-container {{ text-align: center; margin: 30px 0; }}
        .email-footer {{ padding: 30px; background-color: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center; }}
        .email-footer p {{ font-size: 13px; color: #6B778C; margin: 5px 0; }}
        .email-footer .brand {{ color: #0052CC; font-weight: 600; }}
        .divider {{ height: 1px; background-color: #DFE1E6; margin: 30px 0; }}
    </style>
</head>
<body>
    <div class=""email-wrapper"">
        <div class=""email-container"">
            <div class=""email-header"">
                <h1>New Task Assigned</h1>
            </div>
            <div class=""email-body"">
                <div class=""greeting"">Hi {toName},</div>
                <div class=""message"">A new task has been assigned to you in Milo. Please review the details below and take action when ready.</div>
                
                <div class=""task-card"">
                    <div class=""task-id"">{taskId}</div>
                    <div class=""task-title"">{taskTitle}</div>
                    <div class=""task-meta"">
                        <strong>Product:</strong> {productName}
                    </div>
                </div>
                
                <div class=""button-container"">
                    <a href=""{(string.IsNullOrEmpty(taskLink) ? "https://www.codingeverest.com/milo-board.html" : taskLink)}"" class=""cta-button"">View Task in Milo</a>
                </div>
            </div>
            <div class=""email-footer"">
                <p><span class=""brand"">Milo</span> - Project Management by Coding Everest</p>
                <p style=""margin-top: 10px; font-size: 12px; color: #8993A4;"">This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>",
                TextBody = $@"
New Task Assigned

Hi {toName},

A new task has been assigned to you in Milo.

Task ID: {taskId}
Title: {taskTitle}
Product: {productName}

View the task: https://www.codingeverest.com/milo-board.html

Best regards,
The Milo Team
"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            _logger.LogInformation($"Connecting to SMTP server: {smtpHost}:{smtpPort}");
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            _logger.LogInformation($"Authenticating with SMTP server as: {smtpUser}");
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            _logger.LogInformation($"Sending email to: {toEmail}");
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Task assignment email sent successfully to {toEmail} for task {taskId}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send task assignment email to {toEmail}");
            return false;
        }
    }

    public async Task<bool> SendProjectInvitationEmailAsync(string toEmail, string toName, string projectName, string projectKey, string invitationToken)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@codingeverest.com";
            var fromName = _configuration["Email:FromName"] ?? "Milo - Coding Everest";

            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPassword))
            {
                _logger.LogWarning("Email service not configured. Skipping email send.");
                return false;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = $"You've been invited to join {projectName} on Milo";

            var signupUrl = $"https://www.codingeverest.com/milo-signup.html?invite={invitationToken}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #172B4D; background-color: #F4F5F7; }}
        .email-wrapper {{ background-color: #F4F5F7; padding: 40px 20px; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .email-header {{ background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #FFFFFF; padding: 40px 30px; text-align: center; }}
        .email-header h1 {{ font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px; }}
        .email-body {{ padding: 40px 30px; }}
        .greeting {{ font-size: 16px; color: #172B4D; margin-bottom: 20px; }}
        .message {{ font-size: 15px; color: #42526E; margin-bottom: 30px; line-height: 1.7; }}
        .project-card {{ background: #F4F5F7; border-left: 4px solid #0052CC; border-radius: 4px; padding: 20px; margin: 30px 0; }}
        .project-name {{ font-size: 22px; font-weight: 600; color: #172B4D; margin-bottom: 10px; }}
        .project-key {{ font-size: 13px; color: #6B778C; text-transform: uppercase; letter-spacing: 1px; font-family: 'Monaco', 'Menlo', monospace; }}
        .steps {{ background: #F4F5F7; border-radius: 4px; padding: 20px; margin: 30px 0; }}
        .steps ol {{ margin-left: 20px; color: #42526E; }}
        .steps li {{ margin-bottom: 10px; font-size: 14px; line-height: 1.6; }}
        .cta-button {{ display: inline-block; background: #0052CC; color: #FFFFFF !important; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px; margin: 30px 0; text-align: center; transition: background-color 0.2s; }}
        .cta-button:hover {{ background: #0065FF; }}
        .button-container {{ text-align: center; margin: 30px 0; }}
        .email-footer {{ padding: 30px; background-color: #F4F5F7; border-top: 1px solid #DFE1E6; text-align: center; }}
        .email-footer p {{ font-size: 13px; color: #6B778C; margin: 5px 0; }}
        .email-footer .brand {{ color: #0052CC; font-weight: 600; }}
    </style>
</head>
<body>
    <div class=""email-wrapper"">
        <div class=""email-container"">
            <div class=""email-header"">
                <h1>You're Invited!</h1>
            </div>
            <div class=""email-body"">
                <div class=""greeting"">Hi {toName},</div>
                <div class=""message"">You've been invited to collaborate on a project in Milo, a modern project management platform.</div>
                
                <div class=""project-card"">
                    <div class=""project-name"">{projectName}</div>
                    <div class=""project-key"">Project Key: {projectKey}</div>
                </div>
                
                <div class=""steps"">
                    <p style=""font-weight: 600; color: #172B4D; margin-bottom: 12px;"">To get started:</p>
                    <ol>
                        <li>Click the button below to create your Milo account (or sign in if you already have one)</li>
                        <li>Once signed in, you'll automatically be added to this project</li>
                        <li>Start collaborating with your team!</li>
                    </ol>
                </div>
                
                <div class=""button-container"">
                    <a href=""{signupUrl}"" class=""cta-button"">Accept Invitation & Get Started</a>
                </div>
                
                <div style=""font-size: 13px; color: #6B778C; margin-top: 30px; padding-top: 20px; border-top: 1px solid #DFE1E6;"">
                    <p>If you have any questions or didn't expect this invitation, please contact the project owner.</p>
                </div>
            </div>
            <div class=""email-footer"">
                <p><span class=""brand"">Milo</span> - Project Management by Coding Everest</p>
                <p style=""margin-top: 10px; font-size: 12px; color: #8993A4;"">This invitation will expire in 7 days.</p>
            </div>
        </div>
    </div>
</body>
</html>",
                TextBody = $@"
Project Invitation

Hi {toName},

You've been invited to join {projectName} on Milo!

Project Key: {projectKey}

To accept this invitation, sign up at: {signupUrl}

If you have any questions, feel free to reach out to the project owner.

Best regards,
The Milo Team
"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Project invitation email sent successfully to {toEmail}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send project invitation email to {toEmail}");
            return false;
        }
    }
}

