# Configure Email for Signup Welcome Emails

Email functionality has been added! New users will receive a welcome email when they sign up.

## Email Configuration

### Step 1: Update appsettings.json

Edit `backend/Milo.API/appsettings.json` and add your SMTP credentials:

```json
{
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "FromEmail": "noreply@codingeverest.com",
    "FromName": "Milo - Coding Everest"
  }
}
```

### Step 2: Gmail Setup (Example)

If using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SmtpPassword`

### Step 3: Other Email Providers

**Outlook/Hotmail:**
```json
{
  "SmtpHost": "smtp-mail.outlook.com",
  "SmtpPort": "587"
}
```

**SendGrid:**
```json
{
  "SmtpHost": "smtp.sendgrid.net",
  "SmtpPort": "587",
  "SmtpUser": "apikey",
  "SmtpPassword": "your-sendgrid-api-key"
}
```

**Amazon SES:**
```json
{
  "SmtpHost": "email-smtp.us-east-1.amazonaws.com",
  "SmtpPort": "587"
}
```

### Step 4: Deploy Updated Configuration

After updating `appsettings.json`:

```bash
# On EC2 via Session Manager
cd ~/milo
git pull origin main
cd backend/Milo.API
dotnet publish -c Release -o /var/www/milo-api
sudo systemctl restart milo-api
```

Or copy the updated `appsettings.json` directly:

```bash
# Copy updated appsettings.json to EC2
sudo cp ~/milo/backend/Milo.API/appsettings.json /var/www/milo-api/
sudo systemctl restart milo-api
```

## Testing Email

After configuration, test by signing up a new user. The welcome email should be sent automatically.

## Email Not Configured?

If email credentials are not set, signup will still work - it just won't send the welcome email. The service logs a warning but doesn't fail.

## Security Note

**Never commit email passwords to Git!** 

For production, use:
- Environment variables
- AWS Secrets Manager
- Azure Key Vault
- Or other secure configuration management

Example using environment variables:
```bash
# On EC2, set environment variables
export Email__SmtpUser="your-email@gmail.com"
export Email__SmtpPassword="your-password"
```

Then update the service file:
```ini
[Service]
Environment=Email__SmtpUser=your-email@gmail.com
Environment=Email__SmtpPassword=your-password
```

