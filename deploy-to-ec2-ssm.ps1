# PowerShell script to deploy Milo backend to EC2 using AWS Systems Manager (no SSH required)

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802",
    
    [Parameter(Mandatory=$false)]
    [string]$PublicIp = "34.246.3.141"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Milo Backend to EC2 (No SSH)" -ForegroundColor Cyan
Write-Host "Using AWS Systems Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not found. Please install it first." -ForegroundColor Red
    exit
}

# Check if .NET SDK is installed
Write-Host "`nChecking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version 2>&1
    Write-Host ".NET SDK found: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host ".NET SDK not found. Please install .NET SDK 8.0 or later." -ForegroundColor Red
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

# Create a zip file for deployment
Write-Host "`nCreating deployment package..." -ForegroundColor Yellow
$zipFile = "./milo-api-deploy.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

# Create zip using .NET or Compress-Archive
Compress-Archive -Path "./backend/Milo.API/publish/*" -DestinationPath $zipFile -Force
Write-Host "Package created: $zipFile" -ForegroundColor Green

# Upload to S3 (temporary bucket)
Write-Host "`nUploading to S3..." -ForegroundColor Yellow
$bucketName = "milo-deploy-temp-$(Get-Random)"
$s3Key = "milo-api-deploy.zip"

# Create temporary S3 bucket
Write-Host "Creating temporary S3 bucket: $bucketName" -ForegroundColor Cyan
aws s3 mb "s3://$bucketName" --region us-east-1 2>&1 | Out-Null

# Upload zip file
Write-Host "Uploading deployment package..." -ForegroundColor Cyan
aws s3 cp $zipFile "s3://$bucketName/$s3Key" --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit
}

Write-Host "Upload successful!" -ForegroundColor Green

# Check if SSM agent is available on instance
Write-Host "`nChecking SSM agent on instance..." -ForegroundColor Yellow
$ssmStatus = aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=$InstanceId --query "InstanceInformationList[0].PingStatus" --output text 2>&1

if ($ssmStatus -eq "Online") {
    Write-Host "SSM agent is online. Proceeding with deployment..." -ForegroundColor Green
} else {
    Write-Host "SSM agent is not available. The instance needs:" -ForegroundColor Red
    Write-Host "1. SSM Agent installed (usually pre-installed on Amazon Linux)" -ForegroundColor Yellow
    Write-Host "2. IAM role with SSM permissions attached" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would you like to try anyway? (y/n)" -ForegroundColor Cyan
    $continue = Read-Host
    if ($continue -ne "y") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        aws s3 rb "s3://$bucketName" --force 2>&1 | Out-Null
        exit
    }
}

# Create deployment script
$deployScript = @"
#!/bin/bash
set -e

echo "Starting deployment..."

# Install .NET if not present
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET 8.0 Runtime..."
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-runtime-8.0
fi

# Create directories
echo "Creating directories..."
sudo mkdir -p /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www

# Download and extract
echo "Downloading deployment package..."
cd /tmp
aws s3 cp s3://$bucketName/$s3Key ./milo-api-deploy.zip

echo "Extracting..."
unzip -o milo-api-deploy.zip -d /var/www/milo-api/
rm milo-api-deploy.zip

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/milo-api.service > /dev/null <<EOF
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
WorkingDirectory=/var/www/milo-api
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
EOF

# Enable and start service
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl restart milo-api

# Cleanup S3
aws s3 rm s3://$bucketName/$s3Key
aws s3 rb s3://$bucketName

echo "Deployment complete!"
sudo systemctl status milo-api --no-pager
"@

# Save script to temp file (Unix line endings)
$scriptFile = [System.IO.Path]::GetTempFileName()
$deployScriptUnix = $deployScript -replace "`r`n", "`n" -replace "`r", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($scriptFile, $deployScriptUnix, $utf8NoBom)

# Upload script to S3
$scriptKey = "deploy-script.sh"
aws s3 cp $scriptFile "s3://$bucketName/$scriptKey"

# Execute via SSM
Write-Host "`nExecuting deployment via SSM..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

$ssmCommand = @"
cd /tmp && \
aws s3 cp s3://$bucketName/$scriptKey ./deploy.sh && \
chmod +x ./deploy.sh && \
sudo bash ./deploy.sh
"@

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$ssmCommand" `
    --output-s3-bucket-name $bucketName `
    --output-s3-key-prefix "ssm-output" `
    --query "Command.CommandId" `
    --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host "Command sent. Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
    
    # Wait for command to complete
    $maxWait = 300 # 5 minutes
    $waited = 0
    do {
        Start-Sleep -Seconds 5
        $waited += 5
        $status = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "Status" --output text 2>&1
        
        if ($status -eq "Success") {
            Write-Host "`nDeployment successful!" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed" -or $status -eq "Cancelled") {
            Write-Host "`nDeployment failed!" -ForegroundColor Red
            break
        }
        
        Write-Host "." -NoNewline -ForegroundColor Cyan
    } while ($waited -lt $maxWait)
    
    # Get command output
    Write-Host "`n`nCommand output:" -ForegroundColor Yellow
    aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardOutputContent" --output text
    Write-Host ""
    
    $errorOutput = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardErrorContent" --output text
    if ($errorOutput) {
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Red
    }
} else {
    Write-Host "Failed to send SSM command. The instance may not have SSM agent configured." -ForegroundColor Red
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Attach an IAM role with SSM permissions to the instance" -ForegroundColor White
    Write-Host "2. Ensure SSM agent is running" -ForegroundColor White
}

# Cleanup
Remove-Item $scriptFile -ErrorAction SilentlyContinue
Remove-Item $zipFile -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Process Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check service status:" -ForegroundColor Cyan
Write-Host "  aws ssm send-command --instance-ids $InstanceId --document-name `"AWS-RunShellScript`" --parameters `"commands=sudo systemctl status milo-api`"" -ForegroundColor White
Write-Host ""

