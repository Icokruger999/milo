# Simple script to fix nginx via AWS Systems Manager
# Uses JSON command document for better reliability

$ErrorActionPreference = "Stop"

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Fixing nginx Backend Connection"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Check AWS CLI
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Use known instance ID
$instanceId = "i-06bc5b2218c041802"

Write-Host "Using EC2 Instance: $instanceId" -ForegroundColor Green
Write-Host "Sending command via Systems Manager..." -ForegroundColor Yellow
Write-Host ""

# Execute the command using JSON file
$commandId = aws ssm send-command `
    --cli-input-json file://fix-nginx-ssm-command.json `
    --query "Command.CommandId" `
    --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to send command to EC2" -ForegroundColor Red
    Write-Host "Make sure you have AWS CLI configured with proper credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host "Command ID: $commandId" -ForegroundColor Green
Write-Host "Waiting for command to complete (this may take 10-15 seconds)..." -ForegroundColor Yellow

# Wait for command to complete
Start-Sleep -Seconds 10

# Get command status
$status = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "Status" `
    --output text 2>$null

# Wait more if still in progress
$attempts = 0
while ($status -eq "InProgress" -and $attempts -lt 10) {
    Write-Host "Still running..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    $attempts++
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $instanceId `
        --query "Status" `
        --output text 2>$null
}

Write-Host ""
Write-Host "Command Status: $status" -ForegroundColor $(if ($status -eq "Success") { "Green" } else { "Yellow" })
Write-Host ""

# Get command output
Write-Host "Command Output:" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "StandardOutputContent" `
    --output text 2>$null

if ($output) {
    Write-Host $output
}

# Get error output if any
$errorOutput = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "StandardErrorContent" `
    --output text 2>$null

if ($errorOutput -and $errorOutput -ne "None" -and $errorOutput.Trim() -ne "") {
    Write-Host ""
    Write-Host "Error Output:" -ForegroundColor Red
    Write-Host $errorOutput -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Testing API Endpoint"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Wait for services to stabilize
Start-Sleep -Seconds 3

# Test the API endpoint
Write-Host "Testing: https://api.codingeverest.com/api/health" -ForegroundColor Yellow
Write-Host ""

$testResult = curl.exe -s https://api.codingeverest.com/api/health

if ($testResult -match "ok") {
    Write-Host "SUCCESS! API is now responding:" -ForegroundColor Green
    Write-Host $testResult -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now create flakes in your browser!" -ForegroundColor Cyan
} else {
    Write-Host "API Response: $testResult" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If still seeing 502 error, try waiting 30 seconds and test again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

