# Verify deployment files exist

$instanceId = "i-06bc5b2218c041802"

Write-Host "Checking if appsettings.json exists..." -ForegroundColor Cyan

$cmdId = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=ls -la /var/www/milo-api/appsettings.json && cat /var/www/milo-api/appsettings.json | head -20" `
    --query "Command.CommandId" `
    --output text

Start-Sleep -Seconds 5

aws ssm get-command-invocation --command-id $cmdId --instance-id $instanceId --query "StandardOutputContent" --output text
