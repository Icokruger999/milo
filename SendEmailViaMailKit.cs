// Replace SendEmailViaSmtpAsync method (lines ~162-220) with this MailKit version
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

        // Use MailKit for proper HTML email support
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(new MailboxAddress("", to));
        message.Subject = subject;

        // Build multipart message with both HTML and plain text
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
