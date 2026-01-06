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
}

