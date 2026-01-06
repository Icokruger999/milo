# Deploy Milo backend to EC2 via SSH/SCP

param(
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "$env:USERPROFILE\Downloads\codingeverestkey.pem",
    
    [Parameter(Mandatory=$false)]
    [string]$PublicDns = "ec2-34-246-3-141.eu-west-1.compute.amazonaws.com",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Milo Backend via SSH/SCP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check .NET SDK
Write-Host "Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version 2>&1
    Write-Host ".NET SDK found: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host ".NET SDK not found. Please install .NET SDK 8.0 or later." -ForegroundColor Red
    Write-Host "Download from: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit
}

# Build the application
Write-Host "`nBuilding backend application..." -ForegroundColor Yellow
Set-Location backend/Milo.API

if (Test-Path "./publish") {
    Remove-Item -Recurse -Force "./publish"
}

dotnet publish -c Release -o ./publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Set-Location ../..
    exit
}

Write-Host "Build successful!" -ForegroundColor Green
Set-Location ../..

# Stop any existing process on port 5000
Write-Host "`nStopping any existing process on port 5000..." -ForegroundColor Yellow
ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicDns" "sudo pkill -f 'dotnet.*Milo.API' 2>/dev/null || true; sudo lsof -ti:5000 | xargs -r sudo kill 2>/dev/null || true"

# Copy files to EC2
Write-Host "`nCopying files to EC2..." -ForegroundColor Yellow
scp -i $KeyPath -r -o StrictHostKeyChecking=no "./backend/Milo.API/publish/*" "${Username}@${PublicDns}:/var/www/milo-api/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Copy failed!" -ForegroundColor Red
    exit
}

Write-Host "Files copied successfully!" -ForegroundColor Green

# Set permissions
Write-Host "`nSetting permissions..." -ForegroundColor Yellow
ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicDns" "sudo chown -R ec2-user:ec2-user /var/www/milo-api"

# Create systemd service
Write-Host "`nCreating systemd service..." -ForegroundColor Yellow
$serviceContent = @"
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
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000

[Install]
WantedBy=multi-user.target
"@

# Write service file locally and copy
$serviceFile = "./milo-api.service"
$serviceContent | Out-File -FilePath $serviceFile -Encoding UTF8

scp -i $KeyPath -o StrictHostKeyChecking=no $serviceFile "${Username}@${PublicDns}:/tmp/milo-api.service"

# Install and start service
Write-Host "Installing and starting service..." -ForegroundColor Yellow
ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicDns" @"
sudo mv /tmp/milo-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl restart milo-api
sudo systemctl status milo-api --no-pager
"@

# Cleanup
Remove-Item $serviceFile -ErrorAction SilentlyContinue

# Test API
Write-Host "`nTesting API..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$healthCheck = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicDns" "curl -s http://localhost:5000/api/health"
Write-Host $healthCheck -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API is available at:" -ForegroundColor Cyan
Write-Host "  http://34.246.3.141:5000/api/health" -ForegroundColor White
Write-Host "  http://ec2-34-246-3-141.eu-west-1.compute.amazonaws.com:5000/api/health" -ForegroundColor White
Write-Host ""

