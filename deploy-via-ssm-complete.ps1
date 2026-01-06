# Complete deployment via SSM - Production Only
# This script deploys backend, updates RDS credentials, and ensures service is running

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802",
    
    [Parameter(Mandatory=$false)]
    [string]$RdsHost = "codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com",
    
    [Parameter(Mandatory=$false)]
    [string]$RdsUsername = "postgres",
    
    [Parameter(Mandatory=$false)]
    [string]$RdsPassword = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RdsDatabase = "MiloDB"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Milo Backend Deployment via SSM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# If password not provided, prompt for it
if ([string]::IsNullOrEmpty($RdsPassword)) {
    Write-Host "RDS Password not provided. Please enter it:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString "RDS Database Password"
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $RdsPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Build connection string
$connectionString = "Host=$RdsHost;Database=$RdsDatabase;Username=$RdsUsername;Password=$RdsPassword;Port=5432"

Write-Host "Deploying to EC2 instance: $InstanceId" -ForegroundColor Yellow
Write-Host "RDS Host: $RdsHost" -ForegroundColor Yellow
Write-Host ""

# Create deployment script
$deployScript = @"
#!/bin/bash
set -e

export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet

echo "========================================"
echo "Deploying Milo Backend"
echo "========================================"

# Fix git ownership if needed
if [ -d /home/ec2-user/milo-repo ]; then
    sudo chown -R ec2-user:ec2-user /home/ec2-user/milo-repo
    git config --global --add safe.directory /home/ec2-user/milo-repo
fi

# Navigate to repo
cd /home/ec2-user
if [ -d milo-repo ]; then
    echo "Updating repository..."
    cd milo-repo
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/Icokruger999/milo.git milo-repo
    cd milo-repo
fi

# Build backend
echo "Building backend..."
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Update appsettings.json with RDS credentials
echo "Updating RDS connection string..."
cat > /var/www/milo-api/appsettings.json << 'APPSETTINGS_EOF'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "$($connectionString -replace '\$','\$')"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://www.codingeverest.com",
      "https://codingeverest.com",
      "http://www.codingeverest.com",
      "http://codingeverest.com"
    ]
  },
  "EC2": {
    "InstanceId": "i-06bc5b2218c041802",
    "PublicIp": "34.246.3.141",
    "PrivateIp": "172.31.30.186",
    "Region": "us-east-1"
  },
  "Email": {
    "SmtpHost": "mail.privateemail.com",
    "SmtpPort": "587",
    "SmtpUser": "info@streamyo.net",
    "SmtpPassword": "Stacey@1122",
    "FromEmail": "info@streamyo.net",
    "FromName": "Milo - Coding Everest"
  }
}
APPSETTINGS_EOF

# Set permissions
echo "Setting permissions..."
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Stop service if running
echo "Stopping service..."
sudo systemctl stop milo-api || true
sudo pkill -f "dotnet.*Milo.API" || true
sleep 2

# Ensure service file exists and is correct
echo "Creating/updating service file..."
sudo tee /etc/systemd/system/milo-api.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=ec2-user
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Restart service
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api

# Wait and test
echo "Waiting for service to start..."
sleep 10

echo "Checking service status..."
sudo systemctl status milo-api --no-pager -l || true

echo "Testing API..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Deployment successful! API is responding."
    curl -s http://localhost:5001/api/health
else
    echo "⚠️  API may not be responding. Checking logs..."
    sudo journalctl -u milo-api -n 20 --no-pager
fi

echo "========================================"
echo "Deployment Complete"
echo "========================================"
"@

# Execute via SSM
Write-Host "Sending deployment command via SSM..." -ForegroundColor Yellow
$commands = @($deployScript)
$json = $commands | ConvertTo-Json -Compress

$result = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$json" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId

Write-Host "`n✅ Deployment command sent!" -ForegroundColor Green
Write-Host "Command ID: $commandId" -ForegroundColor Cyan
Write-Host "`nThis will take 3-5 minutes. Waiting for completion..." -ForegroundColor Yellow

# Wait for completion
$maxWait = 300
$waited = 0
$status = "InProgress"

while ($waited -lt $maxWait -and $status -eq "InProgress") {
    Start-Sleep -Seconds 10
    $waited += 10
    $invocation = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --output json | ConvertFrom-Json
    $status = $invocation.Status
    
    if ($status -eq "Success" -or $status -eq "Failed") {
        break
    }
    
    Write-Host "." -NoNewline -ForegroundColor Cyan
}

Write-Host "`n`n=== Deployment Status ===" -ForegroundColor Yellow
Write-Host "Status: $status" -ForegroundColor $(if($status -eq 'Success'){'Green'}else{'Red'})

$invocation = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --output json | ConvertFrom-Json

if ($invocation.StandardOutputContent) {
    Write-Host "`nOutput:" -ForegroundColor Cyan
    Write-Host $invocation.StandardOutputContent -ForegroundColor White
}

if ($invocation.StandardErrorContent -and $status -ne 'Success') {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $invocation.StandardErrorContent -ForegroundColor Red
}

Write-Host "`n=== Test API ===" -ForegroundColor Yellow
Write-Host "Testing: http://34.246.3.141:5001/api/health" -ForegroundColor Cyan
try {
    $healthCheck = Invoke-WebRequest -Uri "http://34.246.3.141:5001/api/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ API is accessible!" -ForegroundColor Green
    Write-Host $healthCheck.Content -ForegroundColor White
} catch {
    Write-Host "⚠️  API not accessible yet. Check service logs on EC2." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Process Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

