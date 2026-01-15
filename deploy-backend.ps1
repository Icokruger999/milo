# Backend Deployment Script
# This script deploys the backend to EC2 using SSM

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$publishPath = "backend\Milo.API\publish"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING BACKEND TO EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop the service and kill any processes on port 8080
Write-Host "Step 1: Stopping milo-backend service and ensuring port 8080 is free..." -ForegroundColor Yellow
$stopAndCleanCmd = @(
    "sudo systemctl stop milo-backend || true", # Stop service, ignore if already stopped
    "sudo fuser -k 8080/tcp || true",          # Kill processes on port 8080, ignore if none
    "sleep 5"                                  # Give time for processes to terminate
)
$stopAndCleanCmdJson = ($stopAndCleanCmd | ConvertTo-Json -Compress)
$stopAndCleanCmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$stopAndCleanCmdJson" --region $region --query "Command.CommandId" --output text
Write-Host "  Command ID: $stopAndCleanCmdId" -ForegroundColor Gray
Start-Sleep -Seconds 10 # Give SSM time to execute stop and kill commands

# Step 2: Wait for previous command and check status
Write-Host "Step 2: Waiting for service to stop and port to clear..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$stopStatus = aws ssm get-command-invocation --command-id $stopAndCleanCmdId --instance-id $instanceId --region $region --query "Status" --output text
Write-Host "  Status: $stopStatus" -ForegroundColor Gray

# Step 3: Copy files using a deployment script on EC2
Write-Host "Step 3: Preparing deployment..." -ForegroundColor Yellow
Write-Host "  Note: Files will be pulled from GitHub" -ForegroundColor Gray

# Step 4: Pull from GitHub, build, and restart
Write-Host "Step 4: Deploying from GitHub..." -ForegroundColor Yellow
$deployCmd = @(
    "cd /home/ec2-user/milo",
    "git config --global --add safe.directory /home/ec2-user/milo",
    "git pull origin main 2>&1 || git pull origin master 2>&1",
    "cd backend/Milo.API",
    "export HOME=/home/ec2-user",
    "export DOTNET_CLI_HOME=/home/ec2-user/.dotnet",
    "dotnet restore",
    "dotnet publish -c Release -o /home/ec2-user/milo-backend-publish",
    "sudo systemctl daemon-reload", # Reload systemd units
    "sudo systemctl enable milo-backend", # Ensure service is enabled
    "sudo systemctl restart milo-backend",
    "sleep 3",
    "sudo systemctl status milo-backend --no-pager | head -15"
)
$deployCmdJson = ($deployCmd | ConvertTo-Json -Compress)
$deployCmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$deployCmdJson" --region $region --timeout-seconds 600 --query "Command.CommandId" --output text
Write-Host "  Deployment Command ID: $deployCmdId" -ForegroundColor Gray
Write-Host ""
Write-Host "Deployment started. This may take a few minutes..." -ForegroundColor Yellow
Write-Host "You can check status with:" -ForegroundColor Gray
Write-Host "  aws ssm get-command-invocation --command-id $deployCmdId --instance-id $instanceId --region $region" -ForegroundColor Gray
