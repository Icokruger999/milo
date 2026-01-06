# Fix milo-api service via AWS Systems Manager
# This script sends commands to EC2 via SSM

$instanceId = "i-06bc5b2218c041802"

Write-Host "Connecting to EC2 via SSM to fix milo-api service..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current status
Write-Host "Step 1: Checking service status..." -ForegroundColor Yellow
$command1 = 'sudo systemctl status milo-api --no-pager -l'

$params1 = "{`"commands`": [`"$command1`"]}"

$response1 = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters $params1 `
    --output json | ConvertFrom-Json

$commandId1 = $response1.Command.CommandId
Write-Host "Command ID: $commandId1" -ForegroundColor Gray
Write-Host "Waiting for command to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 5

$output1 = aws ssm get-command-invocation --command-id $commandId1 --instance-id $instanceId --output json | ConvertFrom-Json
Write-Host $output1.StandardOutputContent
if ($output1.StandardErrorContent) {
    Write-Host $output1.StandardErrorContent -ForegroundColor Red
}
Write-Host ""

# Step 2: Check logs
Write-Host "Step 2: Checking service logs..." -ForegroundColor Yellow
$command2 = 'sudo journalctl -u milo-api -n 30 --no-pager'

$params2 = "{`"commands`": [`"$command2`"]}"

$response2 = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters $params2 `
    --output json | ConvertFrom-Json

$commandId2 = $response2.Command.CommandId
Start-Sleep -Seconds 5

$output2 = aws ssm get-command-invocation --command-id $commandId2 --instance-id $instanceId --output json | ConvertFrom-Json
Write-Host $output2.StandardOutputContent
if ($output2.StandardErrorContent) {
    Write-Host $output2.StandardErrorContent -ForegroundColor Red
}
Write-Host ""

# Step 3: Fix the service
Write-Host "Step 3: Fixing service timeout and restarting..." -ForegroundColor Yellow
$commands = @(
    "sudo sed -i '/\[Service\]/a TimeoutStartSec=60' /etc/systemd/system/milo-api.service",
    "sudo systemctl daemon-reload",
    "sudo systemctl stop milo-api || true",
    "sudo pkill -f dotnet.*Milo.API || true",
    "sleep 2",
    "sudo systemctl start milo-api",
    "sleep 3",
    "sudo systemctl status milo-api --no-pager"
)

$commandsEscaped = $commands | ForEach-Object { $_ -replace '"', '\"' }
$commandsJson = ($commandsEscaped | ForEach-Object { "`"$_`"" }) -join ","
$params3 = "{`"commands`": [$commandsJson]}"

$response3 = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters $params3 `
    --output json | ConvertFrom-Json

$commandId3 = $response3.Command.CommandId
Write-Host "Command ID: $commandId3" -ForegroundColor Gray
Write-Host "Waiting for commands to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 10

$output3 = aws ssm get-command-invocation --command-id $commandId3 --instance-id $instanceId --output json | ConvertFrom-Json
Write-Host $output3.StandardOutputContent
if ($output3.StandardErrorContent) {
    Write-Host $output3.StandardErrorContent -ForegroundColor Red
}

# Step 4: Test API
Write-Host ""
Write-Host "Step 4: Testing API..." -ForegroundColor Yellow
$command4 = 'curl -s http://localhost:5001/api/health'

$params4 = "{`"commands`": [`"$command4`"]}"

$response4 = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters $params4 `
    --output json | ConvertFrom-Json

$commandId4 = $response4.Command.CommandId
Start-Sleep -Seconds 3

$output4 = aws ssm get-command-invocation --command-id $commandId4 --instance-id $instanceId --output json | ConvertFrom-Json
Write-Host $output4.StandardOutputContent
if ($output4.StandardErrorContent) {
    Write-Host $output4.StandardErrorContent -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

