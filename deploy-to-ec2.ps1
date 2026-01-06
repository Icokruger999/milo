# PowerShell script to deploy Milo backend to EC2 instance

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$PublicIp = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Milo Backend to EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
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
    exit
}

Write-Host "Build successful!" -ForegroundColor Green
Set-Location ../..

# Get EC2 details if not provided
if ([string]::IsNullOrEmpty($InstanceId) -or [string]::IsNullOrEmpty($PublicIp)) {
    Write-Host "`nGetting EC2 instance details..." -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($InstanceId)) {
        $InstanceId = Read-Host "Enter EC2 Instance ID (or press Enter to search)"
    }
    
    if ([string]::IsNullOrEmpty($InstanceId)) {
        # Search for codingeverest instance
        Write-Host "Searching for 'codingeverest' instance..." -ForegroundColor Yellow
        $instanceInfo = aws ec2 describe-instances --filters "Name=tag:Name,Values=*codingeverest*" --query "Reservations[0].Instances[0].[InstanceId,PublicIpAddress,State.Name]" --output text 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $instanceInfo -notmatch "None") {
            $parts = $instanceInfo -split "`t"
            $InstanceId = $parts[0]
            $PublicIp = $parts[1]
            $state = $parts[2]
            
            Write-Host "Found instance:" -ForegroundColor Green
            Write-Host "  Instance ID: $InstanceId" -ForegroundColor Cyan
            Write-Host "  Public IP: $PublicIp" -ForegroundColor Cyan
            Write-Host "  State: $state" -ForegroundColor Cyan
            
            if ($state -ne "running") {
                Write-Host "`nWarning: Instance is not running. Starting instance..." -ForegroundColor Yellow
                aws ec2 start-instances --instance-ids $InstanceId
                Write-Host "Waiting for instance to start..." -ForegroundColor Yellow
                aws ec2 wait instance-running --instance-ids $InstanceId
                Write-Host "Instance is now running!" -ForegroundColor Green
            }
        } else {
            Write-Host "Could not find instance automatically." -ForegroundColor Red
            $InstanceId = Read-Host "Enter EC2 Instance ID"
            $PublicIp = Read-Host "Enter EC2 Public IP"
        }
    } else {
        # Get IP from instance ID
        if ([string]::IsNullOrEmpty($PublicIp)) {
            Write-Host "Getting IP address for instance $InstanceId..." -ForegroundColor Yellow
            $PublicIp = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text 2>&1
        }
    }
}

# Determine username based on AMI
if ([string]::IsNullOrEmpty($Username)) {
    Write-Host "`nDetecting EC2 username..." -ForegroundColor Yellow
    $amiInfo = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].ImageId" --output text 2>&1
    
    if ($amiInfo -like "*ubuntu*" -or $amiInfo -like "*debian*") {
        $Username = "ubuntu"
    } elseif ($amiInfo -like "*amazon*") {
        $Username = "ec2-user"
    } else {
        $Username = Read-Host "Enter SSH username (default: ec2-user)"
        if ([string]::IsNullOrEmpty($Username)) {
            $Username = "ec2-user"
        }
    }
    Write-Host "Using username: $Username" -ForegroundColor Cyan
}

# Check for SSH key
if ([string]::IsNullOrEmpty($KeyPath)) {
    $possibleKeys = @(
        "$env:USERPROFILE\.ssh\codingeverest.pem",
        "$env:USERPROFILE\.ssh\ec2-key.pem",
        "$env:USERPROFILE\.ssh\id_rsa",
        "$env:USERPROFILE\.ssh\id_ed25519"
    )
    
    foreach ($key in $possibleKeys) {
        if (Test-Path $key) {
            $KeyPath = $key
            Write-Host "Found SSH key: $KeyPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($KeyPath)) {
        $KeyPath = Read-Host "Enter path to SSH private key (.pem file)"
    }
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "SSH key not found: $KeyPath" -ForegroundColor Red
    Write-Host "Please provide a valid SSH key path." -ForegroundColor Yellow
    exit
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor White
Write-Host "Public IP: $PublicIp" -ForegroundColor White
Write-Host "Username: $Username" -ForegroundColor White
Write-Host "SSH Key: $KeyPath" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit
}

# Create deployment directory on EC2
Write-Host "`nCreating deployment directory on EC2..." -ForegroundColor Yellow
$sshCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo mkdir -p /var/www/milo-api && sudo chown -R $Username:$Username /var/www`""
Invoke-Expression $sshCmd

# Verify directory was created
Write-Host "Verifying directory structure..." -ForegroundColor Yellow
$verifyCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"ls -la /var/www 2>/dev/null || echo 'Directory created'`""
Invoke-Expression $verifyCmd

# Copy files to EC2
Write-Host "Copying files to EC2..." -ForegroundColor Yellow
$scpCmd = "scp -i `"$KeyPath`" -r ./backend/Milo.API/publish/* $Username@${PublicIp}:/var/www/milo-api/"
Invoke-Expression $scpCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to copy files!" -ForegroundColor Red
    exit
}

Write-Host "Files copied successfully!" -ForegroundColor Green

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

# Write service file locally and copy to EC2
$serviceFile = "./milo-api.service"
$serviceContent | Out-File -FilePath $serviceFile -Encoding UTF8

$scpServiceCmd = "scp -i `"$KeyPath`" $serviceFile $Username@${PublicIp}:/tmp/milo-api.service"
Invoke-Expression $scpServiceCmd

# Install and start service
Write-Host "Installing and starting service..." -ForegroundColor Yellow
$installCmd = "ssh -i `"$KeyPath`" $Username@$PublicIp `"sudo mv /tmp/milo-api.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable milo-api && sudo systemctl restart milo-api`""
Invoke-Expression $installCmd

# Check service status
Write-Host "`nChecking service status..." -ForegroundColor Yellow
$statusCmd = "ssh -i `"$KeyPath`" $Username@$PublicIp `"sudo systemctl status milo-api --no-pager`""
Invoke-Expression $statusCmd

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API should be available at: http://$PublicIp:5000" -ForegroundColor Cyan
Write-Host "Health check: http://$PublicIp:5000/api/health" -ForegroundColor Cyan
Write-Host ""

# Cleanup
Remove-Item $serviceFile -ErrorAction SilentlyContinue

