# Fix EmailService to use MailKit
$file = "backend/Milo.API/Services/EmailService.cs"

# Read file
$content = Get-Content $file -Raw

# 1. Replace using statements (lines 7-8)
$content = $content -replace 'using Amazon\.SimpleEmail;', 'using MailKit.Net.Smtp;'
$content = $content -replace 'using Amazon\.SimpleEmail\.Model;', 'using MimeKit;'

# 2. Remove SES fields (lines 33-34)
$content = $content -replace 'private readonly bool _useSes;', ''
$content = $content -replace 'private readonly IAmazonSimpleEmailService\? _sesClient;', ''

# 3. Simplify constructor (remove SES initialization)
$oldConstructor = @'
        _configuration = configuration;
        _logger = logger;
        _serviceProvider = serviceProvider;
        
        // Check if SES is enabled
        _useSes = bool.TryParse\(_configuration\["Email:UseSes"\], out var useSes\) && useSes;
        
        if \(_useSes\)
        \{
            var region = _configuration\["Email:SesRegion"\] \?\? "eu-west-1";
            _sesClient = new AmazonSimpleEmailServiceClient\(Amazon\.RegionEndpoint\.GetBySystemName\(region\)\);
            _logger\.LogInformation\("EmailService initialized with AWS SES in region \{Region\}", region\);
        \}
        else
        \{
            _logger\.LogInformation\("EmailService initialized with SMTP"\);
        \}
'@

$newConstructor = @'
        _configuration = configuration;
        _logger = logger;
        _serviceProvider = serviceProvider;
        
        _logger.LogInformation("EmailService initialized with MailKit SMTP");
'@

$content = $content -replace $oldConstructor, $newConstructor

# 4. Remove SES check in SendEmailWithPlainTextAsync
$oldSendMethod = @'
            // Use SES or SMTP based on configuration
            if \(_useSes && _sesClient != null\)
            \{
                return await SendEmailViaSesAsync\(to, subject, htmlBody, plainTextBody, fromEmail, fromName\);
            \}
            else
            \{
                return await SendEmailViaSmtpAsync\(to, subject, htmlBody, plainTextBody, fromEmail, fromName\);
            \}
'@

$newSendMethod = @'
            return await SendEmailViaMailKitAsync(to, subject, htmlBody, plainTextBody, fromEmail, fromName);
'@

$content = $content -replace $oldSendMethod, $newSendMethod

# 5. Remove entire SendEmailViaSesAsync method
$content = $content -replace '(?s)private async Task<bool> SendEmailViaSesAsync\(.*?\n    \}\n\n', ''

# 6. Replace SendEmailViaSmtpAsync with MailKit version
$oldSmtpMethod = @'
(?s)private async Task<bool> SendEmailViaSmtpAsync\(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName\)
    \{
        try
        \{.*?catch \(Exception ex\)
        \{
            _logger\.LogError\(ex, "Error sending email via SMTP to \{To\}", to\);
            return false;
        \}
    \}
'@

$newMailKitMethod = @'
private async Task<bool> SendEmailViaMailKitAsync(string to, string subject, string htmlBody, string plainTextBody, string fromEmail, string fromName)
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

            using var client = new SmtpClient();
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

$content = $content -replace $oldSmtpMethod, $newMailKitMethod

# Save
Set-Content $file -Value $content

Write-Host "✓ EmailService.cs updated with MailKit"
Write-Host "Now remove AWS SDK from csproj..."

# Remove AWS SDK
$csproj = "backend/Milo.API/Milo.API.csproj"
$csprojContent = Get-Content $csproj -Raw
$csprojContent = $csprojContent -replace '\s*<PackageReference Include="AWSSDK\.SimpleEmail"[^>]*/>',''
Set-Content $csproj -Value $csprojContent

Write-Host "✓ AWS SDK removed from csproj"
Write-Host ""
Write-Host "Ready to build! Run:"
Write-Host "dotnet publish backend/Milo.API/Milo.API.csproj -c Release -o backend/Milo.API/publish-mailkit"
