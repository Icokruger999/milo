# Quick Deploy with JSON commands
$INSTANCE_ID = "i-06bc5b2218c041802"
$REGION = "eu-west-1"

Write-Host "=== Quick Deploy ===" -ForegroundColor Cyan

# 1. Build backend
Write-Host "`n1. Building backend..." -ForegroundColor Yellow
$r1 = aws ssm send-command --document-name "AWS-RunShellScript" --instance-ids $INSTANCE_ID --cli-input-json file://ssm-deploy-complete-backend.json --region $REGION --output json | ConvertFrom-Json
Write-Host "Command: $($r1.Command.CommandId)"
Start-Sleep -Seconds 60
$o1 = aws ssm get-command-invocation --command-id $r1.Command.CommandId --instance-id $INSTANCE_ID --region $REGION --output json | ConvertFrom-Json
Write-Host $o1.StandardOutputContent

# 2. Start service
Write-Host "`n2. Starting service..." -ForegroundColor Yellow
$r2 = aws ssm send-command --document-name "AWS-RunShellScript" --instance-ids $INSTANCE_ID --cli-input-json file://ssm-start-backend.json --region $REGION --output json | ConvertFrom-Json
Write-Host "Command: $($r2.Command.CommandId)"
Start-Sleep -Seconds 15
$o2 = aws ssm get-command-invocation --command-id $r2.Command.CommandId --instance-id $INSTANCE_ID --region $REGION --output json | ConvertFrom-Json
Write-Host $o2.StandardOutputContent

# 3. Setup cron
Write-Host "`n3. Setting up cron..." -ForegroundColor Yellow
$r3 = aws ssm send-command --document-name "AWS-RunShellScript" --instance-ids $INSTANCE_ID --cli-input-json file://ssm-setup-cron.json --region $REGION --output json | ConvertFrom-Json
Write-Host "Command: $($r3.Command.CommandId)"
Start-Sleep -Seconds 10
$o3 = aws ssm get-command-invocation --command-id $r3.Command.CommandId --instance-id $INSTANCE_ID --region $REGION --output json | ConvertFrom-Json
Write-Host $o3.StandardOutputContent

Write-Host "`n=== DONE ===" -ForegroundColor Green
