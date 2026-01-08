# Email Not Received - Troubleshooting Guide

## What I Changed:
✅ **Removed popup alerts** - Now uses smooth toast notifications instead

## Email Issue - Possible Causes:

### 1. **Check Email Configuration on EC2**

The email service needs SMTP credentials configured in `appsettings.json`. Let me check:

```bash
# Run on EC2 via Session Manager or SSH
cd /var/www/milo-api
cat appsettings.json | grep -A 10 "Email"
```

Expected configuration:
```json
"Email": {
  "SmtpServer": "smtp.gmail.com",
  "SmtpPort": 587,
  "SmtpUsername": "your-email@gmail.com",
  "SmtpPassword": "your-app-password",
  "FromEmail": "info@streamyo.net",
  "FromName": "Milo - Coding Everest",
  "EnableSsl": true
}
```

### 2. **Check Application Logs**

```bash
# On EC2
sudo journalctl -u milo-api --no-pager | grep -i email | tail -20
```

Look for:
- "Sent flake link notification to..."
- "Failed to send email..."
- SMTP errors

### 3. **Test Email Endpoint**

```powershell
# From Windows
curl.exe -X POST https://api.codingeverest.com/api/email-test/test `
  -H "Content-Type: application/json" `
  -d '{\"toEmail\":\"ico@astutetech.co.za\"}'
```

### 4. **Common Issues:**

#### **Gmail/Google Workspace:**
- Need to use "App Password" not regular password
- Enable "Less secure app access" or use OAuth
- Check if account is blocked

#### **Spam Folder:**
- Check spam/junk folder
- Emails from `info@streamyo.net` might be filtered

#### **SMTP Credentials:**
- Password might be incorrect
- Port blocked (587 or 465)
- SSL/TLS configuration

### 5. **Quick Fix Script**

Create this to test on EC2:

```bash
# test-email.sh
cd /var/www/milo-api

# Check if EmailService is working
curl -X POST http://localhost:5001/api/email-test/test \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"ico@astutetech.co.za"}'
```

## What Should Happen:

When you share a flake via email:
1. ✅ API receives request
2. ✅ Loads flake data
3. ✅ Constructs HTML email
4. ❌ **Sends via SMTP** ← This is likely where it fails
5. ✅ Returns success to frontend

## Next Steps:

### Option A: Check EC2 Configuration
```powershell
# Create SSM command to check config
aws ssm send-command `
  --instance-ids i-06bc5b2218c041802 `
  --document-name "AWS-RunShellScript" `
  --parameters 'commands=["cd /var/www/milo-api","cat appsettings.json | grep -A 15 Email","echo ---","sudo journalctl -u milo-api | grep -i email | tail -10"]' `
  --query "Command.CommandId" `
  --output text
```

### Option B: Update Email Config

If email config is missing or wrong, you need to:

1. **Get SMTP credentials** (Gmail app password, SendGrid, etc.)
2. **Update appsettings.json on EC2**:
```bash
sudo nano /var/www/milo-api/appsettings.json
# Add Email section
sudo systemctl restart milo-api
```

### Option C: Use SendGrid (Recommended)

SendGrid is more reliable than Gmail for transactional emails:

1. Sign up: https://sendgrid.com (Free tier: 100 emails/day)
2. Get API key
3. Update config:
```json
"Email": {
  "SmtpServer": "smtp.sendgrid.net",
  "SmtpPort": 587,
  "SmtpUsername": "apikey",
  "SmtpPassword": "YOUR_SENDGRID_API_KEY",
  "FromEmail": "noreply@codingeverest.com",
  "FromName": "Milo - Coding Everest",
  "EnableSsl": true
}
```

## Test Email Was Sent

Check the backend logs to see if email was attempted:

```bash
sudo journalctl -u milo-api -n 100 --no-pager | grep -i "email\|flake"
```

Look for:
- ✅ "Sent flake link notification to ico@astutetech.co.za"
- ❌ "Failed to send email..."
- ❌ "SMTP error..."

## Current Status

- ✅ Frontend sends request correctly
- ✅ Backend receives request
- ✅ Toast notification shows success
- ❓ **Email actually sent?** - Need to check logs
- ❓ **Email received?** - Check spam folder

Would you like me to create a script to check the email configuration on your EC2 instance?

