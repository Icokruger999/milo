# Check API status via SSM

$instanceId = "i-06bc5b2218c041802"

Write-Host "Checking milo-api service status..." -ForegroundColor Cyan

$cmdId = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=sudo systemctl status milo-api --no-pager" `
    --query "Command.CommandId" `
    --output text

Write-Host "Command ID: $cmdId" -ForegroundColor Yellow
Write-Host "Waiting for command to complete..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

Write-Host "`nService Status:" -ForegroundColor Cyan
aws ssm get-command-invocation --command-id $cmdId --instance-id $instanceId --query "StandardOutputContent" --output text

Write-Host "`nChecking logs..." -ForegroundColor Cyan
$logCmdId = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=sudo journalctl -u milo-api -n 50 --no-pager" `
    --query "Command.CommandId" `
    --output text

Start-Sleep -Seconds 5

Write-Host "`nLogs:" -ForegroundColor Cyan
aws ssm get-command-invocation --command-id $logCmdId --instance-id $instanceId --query "StandardOutputContent" --output text
