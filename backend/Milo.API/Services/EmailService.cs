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
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #0052CC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .task-box {{ background: #fff; border-left: 4px solid #0052CC; padding: 15px; margin: 20px 0; }}
        .task-id {{ font-size: 18px; font-weight: bold; color: #0052CC; }}
        .button {{ display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>New Task Assigned</h1>
        </div>
        <div class=""content"">
            <p>Hi {toName},</p>
            <p>A new task has been assigned to you in Milo.</p>
            
            <div class=""task-box"">
                <div class=""task-id"">{taskId}</div>
                <h3 style=""margin: 10px 0;"">{taskTitle}</h3>
                <p style=""color: #666; margin: 0;""><strong>Product:</strong> {productName}</p>
            </div>
            
            <p style=""text-align: center;"">
                <a href=""{(string.IsNullOrEmpty(taskLink) ? "https://www.codingeverest.com/milo-board.html" : taskLink)}"" class=""button"">View Task</a>
            </p>
            
            <p>Best regards,<br>The Milo Team</p>
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
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation($"Task assignment email sent successfully to {toEmail}");
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
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #0052CC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .project-box {{ background: #fff; border-left: 4px solid #0052CC; padding: 15px; margin: 20px 0; }}
        .button {{ display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Project Invitation</h1>
        </div>
        <div class=""content"">
            <p>Hi {toName},</p>
            <p>You've been invited to join a project on Milo!</p>
            
            <div class=""project-box"">
                <h3 style=""margin: 0 0 10px 0; color: #0052CC;"">{projectName}</h3>
                <p style=""margin: 0; color: #666;"">Project Key: <strong>{projectKey}</strong></p>
            </div>
            
            <p>To accept this invitation:</p>
            <ol>
                <li>Sign up for a Milo account (if you don't have one)</li>
                <li>Log in and select this project from the project dropdown</li>
            </ol>
            
            <p style=""text-align: center;"">
                <a href=""{signupUrl}"" class=""button"">Accept Invitation</a>
            </p>
            
            <p>If you have any questions, feel free to reach out to the project owner.</p>
            <p>Best regards,<br>The Milo Team</p>
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

