# Apply MailKit fix to EmailService
$ErrorActionPreference = "Stop"

Write-Host "Applying MailKit fix to EmailService.cs..."

# 1. Update using statements
$file = "backend/Milo.API/Services/EmailService.cs"
$content = Get-Content $file -Raw

# Remove AWS SES imports, add MailKit
$content = $content -replace 'using Amazon\.SimpleEmail;', 'using MailKit.Net.Smtp;'
$content = $content -replace 'using Amazon\.SimpleEmail\.Model;', 'using MimeKit;'

# Remove SES fields
$content = $content -replace 'private readonly bool _useSes;', '// Removed SES'
$content = $content -replace 'private readonly IAmazonSimpleEmailService\? _sesClient;', '// Removed SES client'

# Remove SES initialization
$content = $content -replace '(?s)// Check if SES is enabled.*?_logger\.LogInformation\("EmailService initialized with SMTP"\);.*?\}', '_logger.LogInformation("EmailService initialized with MailKit SMTP");'

# Remove SES method call
$content = $content -replace '(?s)if \(_useSes && _sesClient != null\).*?return await SendEmailViaSesAsync.*?\}.*?else.*?\{', ''
$content = $content -replace 'return await SendEmailViaSmtpAsync', 'return await SendEmailViaSmtpAsync'

# Remove entire SendEmailViaSesAsync method
$content = $content -replace '(?s)private async Task<bool> SendEmailViaSesAsync\(.*?\n    \}', ''

# Replace SendEmailViaSmtpAsync with MailKit version
$oldMethod = '(?s)private async Task<bool> SendEmailViaSmtpAsync\(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName\).*?catch \(Exception ex\).*?return false;.*?\n    \}'

$newMethod = @'
private async Task<bool> SendEmailViaSmtpAsync(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:SmtpUser"] ?? "";
            var smtpPassword = _configuration["Email:SmtpPassword"] ?? "";

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

            using var client = new MailKit.Net.Smtp.SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUsername, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully via MailKit to {To}", to);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via MailKit to {To}. Host: {Host}, Port: {Port}", 
                to, _configuration["Email:SmtpHost"], _configuration["Email:SmtpPort"]);
            return false;
        }
    }
'@

$content = $content -replace $oldMethod, $newMethod

Set-Content $file -Value $content

Write-Host "Fix applied successfully!"
Write-Host "Now run: dotnet publish backend/Milo.API/Milo.API.csproj -c Release -o backend/Milo.API/publish-mailkit"
