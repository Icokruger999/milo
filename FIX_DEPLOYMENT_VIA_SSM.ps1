# Fix deployment and RDS connection via SSM - Production
# This script deploys everything step by step

param(
    [Parameter(Mandatory=$false)]
    [string]$RdsPassword = ""
)

$InstanceId = "i-06bc5b2218c041802"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Production Fix via SSM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy code
Write-Host "Step 1: Deploying latest code..." -ForegroundColor Yellow
$step1 = @"
cd /home/ec2-user
sudo chown -R ec2-user:ec2-user milo-repo 2>/dev/null || true
git config --global --add safe.directory /home/ec2-user/milo-repo 2>/dev/null || true
if [ -d milo-repo ]; then
  cd milo-repo && git pull origin main
else
  git clone https://github.com/Icokruger999/milo.git milo-repo && cd milo-repo
fi
"@

$cmd1 = ConvertTo-Json -InputObject @($step1) -Compress
$result1 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$cmd1" --output json | ConvertFrom-Json
Write-Host "  Command ID: $($result1.Command.CommandId)" -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Step 2: Build backend
Write-Host "`nStep 2: Building backend..." -ForegroundColor Yellow
$step2 = @"
cd /home/ec2-user/milo-repo/backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
"@

$cmd2 = ConvertTo-Json -InputObject @($step2) -Compress
$result2 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$cmd2" --output json | ConvertFrom-Json
Write-Host "  Command ID: $($result2.Command.CommandId)" -ForegroundColor Cyan
Start-Sleep -Seconds 90

# Step 3: Update RDS connection string
Write-Host "`nStep 3: Updating RDS connection string..." -ForegroundColor Yellow
if ($RdsPassword) {
    $step3 = @"
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup
sudo sed -i 's/Password=.*;/Password=$RdsPassword;/' appsettings.json
sudo sed -i 's/Username=.*;/Username=postgres;/' appsettings.json
echo 'Connection string updated'
"@
} else {
    Write-Host "  ⚠️  RDS password not provided. Connection string will use placeholder." -ForegroundColor Yellow
    Write-Host "  Run UPDATE_RDS_PASSWORD_VIA_SSM.ps1 after deployment to set password." -ForegroundColor Yellow
    $step3 = @"
cd /var/www/milo-api
echo 'RDS password not updated - use UPDATE_RDS_PASSWORD_VIA_SSM.ps1'
"@
}

$cmd3 = ConvertTo-Json -InputObject @($step3) -Compress
$result3 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$cmd3" --output json | ConvertFrom-Json
Write-Host "  Command ID: $($result3.Command.CommandId)" -ForegroundColor Cyan
Start-Sleep -Seconds 20

# Step 4: Create/update service file
Write-Host "`nStep 4: Configuring service..." -ForegroundColor Yellow
$step4 = @"
sudo tee /etc/systemd/system/milo-api.service > /dev/null << 'EOF'
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
EOF
sudo systemctl daemon-reload
"@

$cmd4 = ConvertTo-Json -InputObject @($step4) -Compress
$result4 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$cmd4" --output json | ConvertFrom-Json
Write-Host "  Command ID: $($result4.Command.CommandId)" -ForegroundColor Cyan
Start-Sleep -Seconds 20

# Step 5: Restart service
Write-Host "`nStep 5: Restarting service..." -ForegroundColor Yellow
$step5 = @"
sudo systemctl stop milo-api 2>/dev/null || true
sudo pkill -f 'dotnet.*Milo.API' 2>/dev/null || true
sleep 2
sudo systemctl enable milo-api
sudo systemctl start milo-api
sleep 10
sudo systemctl status milo-api --no-pager -l | head -20
"@

$cmd5 = ConvertTo-Json -InputObject @($step5) -Compress
$result5 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$cmd5" --output json | ConvertFrom-Json
Write-Host "  Command ID: $($result5.Command.CommandId)" -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check final status
Write-Host "`n=== Final Status Check ===" -ForegroundColor Yellow
$status5 = aws ssm get-command-invocation --command-id $result5.Command.CommandId --instance-id $InstanceId --output json 2>&1
if ($status5 -match '"Status":\s*"([^"]+)"') {
    $finalStatus = $matches[1]
    Write-Host "Service Status: $finalStatus" -ForegroundColor $(if($finalStatus -eq 'Success'){'Green'}else{'Red'})
}

Write-Host "`n=== Testing API ===" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://34.246.3.141:5001/api/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ API is accessible!" -ForegroundColor Green
    Write-Host $healthCheck.Content -ForegroundColor White
} catch {
    Write-Host "⚠️  API not accessible yet. This may be normal if:" -ForegroundColor Yellow
    Write-Host "   - Service is still starting (wait 1-2 minutes)" -ForegroundColor White
    Write-Host "   - RDS password needs to be updated" -ForegroundColor White
    Write-Host "   - Port 5001 not open in security group" -ForegroundColor White
    Write-Host "`nCheck logs: sudo journalctl -u milo-api -n 50" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if (-not $RdsPassword) {
    Write-Host "`n⚠️  IMPORTANT: Update RDS password:" -ForegroundColor Yellow
    Write-Host "   .\UPDATE_RDS_PASSWORD_VIA_SSM.ps1 -RdsPassword 'YOUR_PASSWORD'" -ForegroundColor White
}

