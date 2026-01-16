# Email HTML Rendering Fix

## Problem
Emails were being sent with HTML code visible as plain text instead of being rendered as HTML. This was happening because the email was being sent with `Content-Type: text/plain` instead of `Content-Type: text/html`.

## Root Cause
The issue was in the `EmailService.cs` file in the `SendEmailViaSmtpAsync` method. The code was setting the email body before setting the `IsBodyHtml` property, which caused the SMTP server to use the wrong Content-Type header.

## Solution Applied
Fixed three critical issues in the email sending code:

1. **Order of Operations**: Set `message.IsBodyHtml = true` BEFORE setting `message.Body`
2. **HTML Detection Logic**: Improved detection to ensure HTML emails are always sent with the correct Content-Type
3. **Missing Plain Text Body**: Added plain text body generation for `SendIncidentAssignmentEmailAsync` method
4. **Added Logging**: Track whether emails are being sent as HTML or plain text for debugging

## Files Changed
- `backend/Milo.API/Services/EmailService.cs`
  - Fixed `SendEmailViaSmtpAsync` method (line ~230-280)
  - Fixed `SendIncidentAssignmentEmailAsync` method (line ~810-850)

## Technical Details

### Fix 1: Correct Order of Operations
The fix ensures that `IsBodyHtml` is set BEFORE the body content is assigned. This tells the .NET `SmtpClient` to set the proper MIME headers when sending the email.

**Before (Incorrect):**
```csharp
message.Body = htmlBody;
message.IsBodyHtml = true;  // Too late - headers already set
```

**After (Correct):**
```csharp
message.IsBodyHtml = true;  // Set first - this sets Content-Type: text/html
message.Body = htmlBody;    // Then set body
```

### Fix 2: Improved HTML Detection
```csharp
// If htmlBody contains HTML tags, always send as HTML
// Only send as plain text if htmlBody equals plainTextBody AND contains no HTML tags
var isPlainTextOnly = (htmlBody == plainTextBody || htmlBody.Trim() == plainTextBody.Trim()) && !containsHtmlTags;
```

### Fix 3: Added Plain Text Body for Incident Emails
The `SendIncidentAssignmentEmailAsync` method was referencing `plainTextBody` but never creating it. Added proper plain text body generation:

```csharp
var plainTextBody = $@"Hello {assigneeName},

A new incident has been assigned to you and requires your attention:

{incidentNumber} - {subject}

Priority: {priority}
Status: {status}
...

View incident details: {link}";
```

## Testing
After deploying this fix:
1. Send a test email (e.g., temporary password email, incident assignment)
2. Check the email in your inbox
3. Verify that HTML is rendered properly (not showing raw HTML code)
4. Check email source (View Original/Show Source) to confirm `Content-Type: text/html; charset=UTF-8`
5. Check application logs for "Email configured as HTML (Content-Type: text/html)" message

## Deployment
To deploy this fix:
```powershell
# Build and publish
cd backend/Milo.API
dotnet publish -c Release -o publish

# Deploy to EC2 (use your existing deployment script)
.\deploy-backend.ps1
```

## Verification
After deployment, check the logs when an email is sent:
```
Sending email to user@example.com: IsPlainTextOnly=False, ContainsHtmlTags=True
Email configured as HTML (Content-Type: text/html)
Email sent successfully via SMTP to user@example.com
```
