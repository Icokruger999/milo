# Check backend endpoints on EC2

$instanceId = "i-06bc5b2218c041802"

Write-Host "Checking backend endpoints on EC2..." -ForegroundColor Yellow

$commandId = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters '{"commands":["sudo systemctl status milo-api --no-pager | head -15","echo ---","curl -s http://localhost:5001/api/health","echo ---","curl -s http://localhost:5001/api/flakes","echo ---","curl -s http://localhost:5001/api/Flakes","echo ---","sudo journalctl -u milo-api --no-pager | tail -20"]}' `
    --comment "Check backend endpoints" `
    --query "Command.CommandId" `
    --output text

Write-Host "Command ID: $commandId"
Write-Host "Waiting..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "StandardOutputContent" `
    --output text

Write-Host $output

