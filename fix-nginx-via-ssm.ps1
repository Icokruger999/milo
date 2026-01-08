# Fix nginx Backend Connection via AWS Systems Manager
# This script uploads and runs the fix script on EC2 without needing SSH

$ErrorActionPreference = "Stop"

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Fixing nginx Backend Connection"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Get EC2 instance ID from AWS
Write-Host "Finding EC2 instance..." -ForegroundColor Yellow
$instanceId = aws ec2 describe-instances `
    --filters "Name=tag:Name,Values=*everest*,*milo*,*backend*" "Name=instance-state-name,Values=running" `
    --query "Reservations[0].Instances[0].InstanceId" `
    --output text 2>$null

if (!$instanceId -or $instanceId -eq "None" -or $instanceId -eq "") {
    Write-Host "⚠️  Could not auto-detect instance. Please enter Instance ID:" -ForegroundColor Yellow
    $instanceId = Read-Host "EC2 Instance ID (e.g., i-0123456789abcdef0)"
}

Write-Host "Using EC2 Instance: $instanceId" -ForegroundColor Green
Write-Host ""

# Read the fix script
Write-Host "Reading fix script..." -ForegroundColor Yellow
$scriptContent = Get-Content "fix-nginx-backend-connection.sh" -Raw

# Create SSM command document
Write-Host "Executing fix via Systems Manager..." -ForegroundColor Yellow
Write-Host ""

# Execute the script via SSM
$commandId = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=`"$scriptContent`"" `
    --comment "Fix nginx backend connection" `
    --query "Command.CommandId" `
    --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to send command to EC2" -ForegroundColor Red
    exit 1
}

Write-Host "Command ID: $commandId" -ForegroundColor Green
Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
Write-Host ""

# Wait for command to complete
Start-Sleep -Seconds 5

# Get command output
$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "StandardOutputContent" `
    --output text

Write-Host $output

# Check command status
$status = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --query "Status" `
    --output text

Write-Host ""
if ($status -eq "Success") {
    Write-Host "✅ Fix completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Command status: $status" -ForegroundColor Yellow
    
    # Get error output if any
    $errorOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $instanceId `
        --query "StandardErrorContent" `
        --output text
    
    if ($errorOutput) {
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Testing API Endpoint"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Wait a bit for nginx to fully restart
Start-Sleep -Seconds 3

# Test the API endpoint
Write-Host "Testing: https://api.codingeverest.com/api/health" -ForegroundColor Yellow
try {
    $response = curl.exe -s https://api.codingeverest.com/api/health
    Write-Host "✅ API Response: $response" -ForegroundColor Green
} catch {
    Write-Host "❌ API still not responding. Check logs on EC2." -ForegroundColor Red
}

Write-Host ""
Write-Host "Done! Try creating a flake in your browser now." -ForegroundColor Cyan

