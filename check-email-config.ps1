# Check Email Configuration on EC2

$instanceId = "i-06bc5b2218c041802"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Email Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$commandJson = @"
{
  "InstanceIds": ["$instanceId"],
  "DocumentName": "AWS-RunShellScript",
  "Comment": "Check email configuration",
  "Parameters": {
    "commands": [
      "echo '=== Email Configuration ==='",
      "cd /var/www/milo-api",
      "cat appsettings.json | grep -A 15 'Email' || echo 'No Email config found'",
      "echo ''",
      "echo '=== Recent Email Logs ==='",
      "sudo journalctl -u milo-api --no-pager | grep -i 'email\\|smtp' | tail -20 || echo 'No email logs found'",
      "echo ''",
      "echo '=== Flake Share Logs ==='",
      "sudo journalctl -u milo-api --no-pager | grep -i 'flake.*share\\|share.*email' | tail -10 || echo 'No flake share logs'"
    ]
  }
}
"@

$commandJson | Out-File -FilePath "temp-email-check.json" -Encoding UTF8

Write-Host "Sending command to EC2..." -ForegroundColor Yellow
$commandId = aws ssm send-command --cli-input-json file://temp-email-check.json --query "Command.CommandId" --output text

Remove-Item "temp-email-check.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to send command" -ForegroundColor Red
    exit 1
}

Write-Host "Command ID: $commandId" -ForegroundColor Green
Write-Host "Waiting for results..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$output = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --output json 2>$null | ConvertFrom-Json

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($output.StandardOutputContent) {
    Write-Host $output.StandardOutputContent
} else {
    Write-Host "No output received" -ForegroundColor Yellow
}

if ($output.StandardErrorContent -and $output.StandardErrorContent.Trim() -ne "") {
    Write-Host ""
    Write-Host "Errors:" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Analysis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($output.StandardOutputContent -match "SmtpServer") {
    Write-Host "✓ Email configuration found" -ForegroundColor Green
    
    if ($output.StandardOutputContent -match "smtp\.gmail\.com") {
        Write-Host "⚠ Using Gmail - make sure you have an App Password" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Email configuration NOT found" -ForegroundColor Red
    Write-Host "  You need to add Email settings to appsettings.json" -ForegroundColor Yellow
}

if ($output.StandardOutputContent -match "Sent.*email|email.*sent") {
    Write-Host "✓ Email sending detected in logs" -ForegroundColor Green
} else {
    Write-Host "⚠ No email sending found in logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check your spam folder for ico@astutetech.co.za" -ForegroundColor White
Write-Host "2. If no config found, add Email settings to appsettings.json" -ForegroundColor White
Write-Host "3. Consider using SendGrid for reliable email delivery" -ForegroundColor White

