# Deploy Milo Backend to EC2
# This script builds and deploys the backend API to EC2

param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$PublicIp = "34.246.3.141",
    [string]$Username = "ec2-user",
    [string]$KeyPath = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Milo Backend Deployment to EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
Write-Host "Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: .NET SDK is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install .NET SDK 8.0 from: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ .NET SDK found: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: .NET SDK is not installed" -ForegroundColor Red
    exit 1
}

# Check AWS CLI
Write-Host "`nChecking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI is not installed" -ForegroundColor Red
    exit 1
}

# Get SSH key path if not provided
if ([string]::IsNullOrEmpty($KeyPath)) {
    $commonKeyPaths = @(
        "$env:USERPROFILE\.ssh\codingeverestkey.pem",
        "$env:USERPROFILE\Downloads\codingeverestkey.pem",
        "$env:USERPROFILE\.ssh\id_rsa",
        "$env:USERPROFILE\.ssh\*.pem"
    )
    
    Write-Host "`nLooking for SSH key..." -ForegroundColor Yellow
    foreach ($path in $commonKeyPaths) {
        $files = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
        if ($files) {
            $KeyPath = $files[0].FullName
            Write-Host "✓ Found SSH key: $KeyPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($KeyPath)) {
        Write-Host "SSH key not found. Please provide the path:" -ForegroundColor Yellow
        $KeyPath = Read-Host "Enter path to SSH key (.pem file)"
        if (-not (Test-Path $KeyPath)) {
            Write-Host "ERROR: SSH key file not found: $KeyPath" -ForegroundColor Red
            exit 1
        }
    }
}

# Verify instance is running
Write-Host "`nChecking EC2 instance status..." -ForegroundColor Yellow
$instanceStatus = aws ec2 describe-instance-status --instance-ids $InstanceId --query "InstanceStatuses[0].InstanceState.Name" --output text 2>&1
if ($instanceStatus -ne "running") {
    Write-Host "Instance is not running. Current status: $instanceStatus" -ForegroundColor Yellow
    Write-Host "Starting instance..." -ForegroundColor Yellow
    aws ec2 start-instances --instance-ids $InstanceId
    Write-Host "Waiting for instance to start..." -ForegroundColor Yellow
    aws ec2 wait instance-running --instance-ids $InstanceId
    Start-Sleep -Seconds 10
}

Write-Host "✓ Instance is running" -ForegroundColor Green

# Build the backend
Write-Host "`nBuilding backend application..." -ForegroundColor Yellow
Push-Location backend\Milo.API
try {
    dotnet restore
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to restore packages" -ForegroundColor Red
        exit 1
    }
    
    dotnet publish -c Release -o .\publish
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to build application" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Build successful" -ForegroundColor Green
} finally {
    Pop-Location
}

# Create deployment directory on EC2
Write-Host "`nSetting up deployment directory on EC2..." -ForegroundColor Yellow
$setupCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo mkdir -p /var/www/milo-api && sudo chown -R $Username:$Username /var/www/milo-api`""
Invoke-Expression $setupCmd

# Copy files to EC2
Write-Host "Copying files to EC2..." -ForegroundColor Yellow
$scpCmd = "scp -i `"$KeyPath`" -o StrictHostKeyChecking=no -r .\backend\Milo.API\publish\* $Username@${PublicIp}:/var/www/milo-api/"
Invoke-Expression $scpCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy files to EC2" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Files copied successfully" -ForegroundColor Green

# Create systemd service file
Write-Host "`nSetting up systemd service..." -ForegroundColor Yellow
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
User=$Username
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000

[Install]
WantedBy=multi-user.target
"@

# Write service file to temp file and copy to EC2
$tempServiceFile = [System.IO.Path]::GetTempFileName()
$serviceContent | Out-File -FilePath $tempServiceFile -Encoding UTF8

$scpServiceCmd = "scp -i `"$KeyPath`" -o StrictHostKeyChecking=no $tempServiceFile $Username@${PublicIp}:/tmp/milo-api.service"
Invoke-Expression $scpServiceCmd

# Move service file and reload systemd
$serviceSetupCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo mv /tmp/milo-api.service /etc/systemd/system/milo-api.service && sudo systemctl daemon-reload && sudo systemctl enable milo-api && sudo systemctl restart milo-api`""
Invoke-Expression $serviceSetupCmd

# Clean up temp file
Remove-Item $tempServiceFile -ErrorAction SilentlyContinue

Write-Host "✓ Service configured and started" -ForegroundColor Green

# Check service status
Write-Host "`nChecking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$statusCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo systemctl status milo-api --no-pager`""
Invoke-Expression $statusCmd

# Test API endpoint
Write-Host "`nTesting API endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://$PublicIp:5000/api/health" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API is responding!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ API might not be ready yet. Check service status above." -ForegroundColor Yellow
    Write-Host "You can test manually: curl http://$PublicIp:5000/api/health" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: http://$PublicIp:5000" -ForegroundColor White
Write-Host "Health Check: http://$PublicIp:5000/api/health" -ForegroundColor White
Write-Host "Login Endpoint: http://$PublicIp:5000/api/auth/login" -ForegroundColor White
Write-Host ""
Write-Host "To check logs: ssh -i `"$KeyPath`" $Username@$PublicIp `"sudo journalctl -u milo-api -f`"" -ForegroundColor Cyan

