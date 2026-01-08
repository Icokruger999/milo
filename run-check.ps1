$cmdId = aws ssm send-command --cli-input-json file://check-simple.json --query "Command.CommandId" --output text
Write-Host "Sent command: $cmdId" -ForegroundColor Green
Write-Host "Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$output = aws ssm get-command-invocation --command-id $cmdId --instance-id i-06bc5b2218c041802 --query "StandardOutputContent" --output text
Write-Host ""
Write-Host "Output:" -ForegroundColor Cyan
Write-Host $output

